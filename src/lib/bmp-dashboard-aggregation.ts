import { productionAvailabilityCategory } from "@/lib/map-data";
import type {
  BmpAvailabilityCounts,
  BmpChartPoint,
  BmpDataMode,
  BmpGroupEntry,
  BmpGroupTotals,
  BmpMonthlyStat,
  BmpSlicedStats,
  BmpSnapshotData,
  BmpYearStats,
} from "@/types/dashboard";

export interface BmpRawGroup {
  id: string;
  name: string;
  code: string | null;
  category: "EX_PLASMA" | "SWADAYA";
  districtId: string | null;
  districtName: string | null;
}

export interface BmpRawFarmer {
  id: string;
  farmerGroupId: string;
}

export interface BmpRawParcel {
  id: string;
  farmerId: string;
  area: number | null;
}

/** One production row summed per (farmer, parcel, period) — parcelId null = record tanpa lahan. */
export interface BmpRawProduction {
  farmerId: string;
  parcelId: string | null;
  period: string; // YYYY-MM
  kg: number;
}

function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}

function emptyTotals(): BmpGroupTotals {
  return {
    produksiTon: 0,
    luasMelaporHa: 0,
    lahanBerData: 0,
    totalLahan: 0,
    petaniMelapor: 0,
    totalPetani: 0,
  };
}

function emptyAvailability(): BmpAvailabilityCounts {
  return { baik: 0, cukup: 0, kurang: 0, tidakAda: 0 };
}

const VALID_PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Aggregate scoped DB rows into the stored BMP snapshot shape (per-Lembaga grain).
 * Pure function — RBAC/district filtering must already be applied to the inputs.
 *
 * Kaidah metrik:
 * - produksiTon & petaniMelapor menghitung SEMUA record (termasuk parcelId null);
 * - lahanMelapor/luasMelapor/lahanBerData/availability hanya dari record ber-lahan
 *   (konsisten dgn Peta BMP: produksi tanpa lahan diabaikan untuk kategori, #136).
 */
export function buildBmpSnapshotData(
  groups: BmpRawGroup[],
  farmers: BmpRawFarmer[],
  parcels: BmpRawParcel[],
  production: BmpRawProduction[]
): BmpSnapshotData {
  const groupByFarmer = new Map<string, string>();
  for (const f of farmers) groupByFarmer.set(f.id, f.farmerGroupId);

  const parcelById = new Map<string, BmpRawParcel>();
  for (const p of parcels) parcelById.set(p.id, p);

  interface YearAcc {
    ton: number;
    parcelIds: Set<string>;
    farmerIds: Set<string>;
  }
  interface SeriesAcc {
    monthly: Map<string, { ton: number; parcelIds: Set<string> }>;
    byYear: Map<string, YearAcc>;
  }
  interface Acc {
    all: SeriesAcc;
    full: SeriesAcc; // subset LAHAN dgn data lengkap di semua bulan referensi tahun ybs
    periodsByParcel: Map<string, Set<string>>; // parcel id → periods with data
    reportingFarmers: Set<string>;
    totalTon: number;
    totalLahan: number;
    totalPetani: number;
  }
  const emptySeries = (): SeriesAcc => ({ monthly: new Map(), byYear: new Map() });
  const emptyAcc = (): Acc => ({
    all: emptySeries(),
    full: emptySeries(),
    periodsByParcel: new Map(),
    reportingFarmers: new Set(),
    totalTon: 0,
    totalLahan: 0,
    totalPetani: 0,
  });
  const accByGroup = new Map<string, Acc>();
  const accFor = (groupId: string): Acc => {
    let acc = accByGroup.get(groupId);
    if (!acc) {
      acc = emptyAcc();
      accByGroup.set(groupId, acc);
    }
    return acc;
  };

  for (const f of farmers) accFor(f.farmerGroupId).totalPetani += 1;
  for (const p of parcels) {
    const groupId = groupByFarmer.get(p.farmerId);
    if (groupId) accFor(groupId).totalLahan += 1;
  }

  // Pass 1 — bulan-lapor tiap LAHAN per tahun. Lahan "full" tahun Y ⟺ punya
  // record di SEMUA 12 bulan Jan–Des tahun itu (keputusan owner — tahun berjalan
  // belum bisa full sampai Desember terisi). Record tanpa lahan tidak pernah full.
  const parcelMonths = new Map<string, Map<string, Set<string>>>();
  for (const r of production) {
    if (!groupByFarmer.has(r.farmerId) || !VALID_PERIOD.test(r.period)) continue;
    if (!r.parcelId || !parcelById.has(r.parcelId)) continue;
    const yearKey = r.period.slice(0, 4);
    const month = r.period.slice(5, 7);
    let perYear = parcelMonths.get(r.parcelId);
    if (!perYear) parcelMonths.set(r.parcelId, (perYear = new Map()));
    let months = perYear.get(yearKey);
    if (!months) perYear.set(yearKey, (months = new Set()));
    months.add(month);
  }
  const isFullParcel = (parcelId: string, yearKey: string): boolean =>
    (parcelMonths.get(parcelId)?.get(yearKey)?.size ?? 0) === 12;

  const addToSeries = (s: SeriesAcc, r: BmpRawProduction, yearKey: string, parcelOk: boolean) => {
    let bucket = s.monthly.get(r.period);
    if (!bucket) {
      bucket = { ton: 0, parcelIds: new Set() };
      s.monthly.set(r.period, bucket);
    }
    bucket.ton += r.kg / 1000;
    let yearBucket = s.byYear.get(yearKey);
    if (!yearBucket) {
      yearBucket = { ton: 0, parcelIds: new Set(), farmerIds: new Set() };
      s.byYear.set(yearKey, yearBucket);
    }
    yearBucket.ton += r.kg / 1000;
    yearBucket.farmerIds.add(r.farmerId);
    if (parcelOk && r.parcelId) {
      bucket.parcelIds.add(r.parcelId);
      yearBucket.parcelIds.add(r.parcelId);
    }
  };

  // Pass 2 — akumulasi "all" + subset "full" per group.
  for (const r of production) {
    const groupId = groupByFarmer.get(r.farmerId);
    if (!groupId || !VALID_PERIOD.test(r.period)) continue;
    const acc = accFor(groupId);
    const yearKey = r.period.slice(0, 4);
    // Atribusi per-lahan hanya bila record menunjuk lahan aktif yang dikenal.
    const parcelOk = r.parcelId != null && parcelById.has(r.parcelId);

    acc.totalTon += r.kg / 1000;
    acc.reportingFarmers.add(r.farmerId);
    addToSeries(acc.all, r, yearKey, parcelOk);
    if (parcelOk && r.parcelId && isFullParcel(r.parcelId, yearKey)) {
      addToSeries(acc.full, r, yearKey, true);
    }

    if (parcelOk && r.parcelId) {
      let periods = acc.periodsByParcel.get(r.parcelId);
      if (!periods) {
        periods = new Set();
        acc.periodsByParcel.set(r.parcelId, periods);
      }
      periods.add(r.period);
    }
  }

  const serializeSeries = (s: SeriesAcc) => {
    const monthly: Record<string, BmpMonthlyStat> = {};
    for (const [period, bucket] of [...s.monthly.entries()].sort()) {
      let luas = 0;
      for (const pid of bucket.parcelIds) luas += parcelById.get(pid)?.area ?? 0;
      monthly[period] = {
        produksiTon: round2(bucket.ton),
        lahanMelapor: bucket.parcelIds.size,
        luasMelaporHa: round2(luas),
      };
    }
    const byYear: Record<string, BmpYearStats> = {};
    for (const [yearKey, y] of [...s.byYear.entries()].sort()) {
      let luas = 0;
      for (const pid of y.parcelIds) luas += parcelById.get(pid)?.area ?? 0;
      byYear[yearKey] = {
        produksiTon: round2(y.ton),
        luasMelaporHa: round2(luas),
        lahanBerData: y.parcelIds.size,
        petaniMelapor: y.farmerIds.size,
      };
    }
    return { monthly, byYear };
  };

  const entries: BmpGroupEntry[] = groups.map((g) => {
    const acc = accByGroup.get(g.id) ?? emptyAcc();
    const { monthly, byYear } = serializeSeries(acc.all);
    const { monthly: monthlyFull, byYear: byYearFull } = serializeSeries(acc.full);

    const availability = emptyAvailability();
    let luasMelaporHa = 0;
    for (const [pid, periods] of acc.periodsByParcel) {
      luasMelaporHa += parcelById.get(pid)?.area ?? 0;
      const cat = productionAvailabilityCategory([...periods]);
      if (cat === "BAIK") availability.baik += 1;
      else if (cat === "CUKUP") availability.cukup += 1;
      else availability.kurang += 1; // periods non-empty → tidak mungkin NONE
    }
    availability.tidakAda = acc.totalLahan - acc.periodsByParcel.size;

    return {
      id: g.id,
      name: g.name,
      code: g.code,
      category: g.category,
      districtId: g.districtId,
      districtName: g.districtName,
      monthly,
      byYear,
      monthlyFull,
      byYearFull,
      availability,
      totals: {
        produksiTon: round2(acc.totalTon),
        luasMelaporHa: round2(luasMelaporHa),
        lahanBerData: acc.periodsByParcel.size,
        totalLahan: acc.totalLahan,
        petaniMelapor: acc.reportingFarmers.size,
        totalPetani: acc.totalPetani,
      },
    };
  });

  return { groups: entries };
}

export interface BmpSliceFilter {
  districtId?: string | null;
  groupId?: string | null;
  category?: "EX_PLASMA" | "SWADAYA" | null;
  /** Scope RBAC viewer (bukan filter UI): batasi ke distrik/lembaga tertentu. */
  districtIds?: string[] | null;
  groupIds?: string[] | null;
}

/** Group entries yang lolos filter UI + scope viewer. */
export function filterBmpGroups(data: BmpSnapshotData, filter: BmpSliceFilter): BmpGroupEntry[] {
  return data.groups.filter((g) => {
    if (filter.districtIds && (g.districtId == null || !filter.districtIds.includes(g.districtId))) return false;
    if (filter.groupIds && !filter.groupIds.includes(g.id)) return false;
    if (filter.districtId && g.districtId !== filter.districtId) return false;
    if (filter.groupId && g.id !== filter.groupId) return false;
    if (filter.category && g.category !== filter.category) return false;
    return true;
  });
}

/** Sumber seri per mode kelengkapan: "all" = semua record; "full" = subset lahan lengkap. */
function seriesOf(g: BmpGroupEntry, dataMode: BmpDataMode) {
  return dataMode === "full"
    ? { monthly: g.monthlyFull, byYear: g.byYearFull }
    : { monthly: g.monthly, byYear: g.byYear };
}

/** Stats sebuah group untuk tahun terpilih (`year = null` → agregat semua tahun). */
export function bmpStatsForYear(
  g: BmpGroupEntry,
  year: number | null,
  dataMode: BmpDataMode = "all"
): BmpGroupTotals {
  if (year == null && dataMode === "all") return g.totals;
  const { byYear } = seriesOf(g, dataMode);
  const zero: BmpYearStats = { produksiTon: 0, luasMelaporHa: 0, lahanBerData: 0, petaniMelapor: 0 };
  // year null (kumulatif) pada mode full: Σ nilai tahunan (distinct per-tahun).
  const years = year == null ? Object.keys(byYear) : [String(year)];
  const y = years.reduce(
    (sum, key) => {
      const v = byYear[key] ?? zero;
      sum.produksiTon += v.produksiTon;
      sum.luasMelaporHa += v.luasMelaporHa;
      sum.lahanBerData += v.lahanBerData;
      sum.petaniMelapor += v.petaniMelapor;
      return sum;
    },
    { ...zero }
  );
  return {
    ...y,
    // Master data (denominator) year-independent — pola kelompokTaniCount Main Dashboard.
    totalLahan: g.totals.totalLahan,
    totalPetani: g.totals.totalPetani,
  };
}

/**
 * Sum sekumpulan group entry menjadi satu ringkasan (cards + panel + bahan chart)
 * untuk tahun terpilih: angka tahun itu; `"average"` → **rataan per tahun** (Σ lintas
 * tahun ÷ jumlah tahun ber-data — default dashboard); `null` → kumulatif semua tahun
 * (dipakai tools list/detail). Menjumlah distinct-count per Lembaga aman: petani/lahan
 * milik tepat satu Lembaga. Availability & monthly selalu year-independent (kategori =
 * run bulan lintas tahun; chart memfilter sendiri).
 */
export function sumBmpGroups(
  groups: BmpGroupEntry[],
  year: number | "average" | null = null,
  dataMode: BmpDataMode = "all"
): BmpSlicedStats {
  const totals = emptyTotals();
  const availability = emptyAvailability();
  const monthly: Record<string, BmpMonthlyStat> = {};
  const numericYear = typeof year === "number" ? year : null;
  // Akumulasi per-tahun (Σ nilai tahunan lintas tahun terpilih): dipakai produktivitas
  // (Σ produksi ÷ Σ luas) dan mode "average" (÷ jumlah tahun ber-data). Distinct
  // per-tahun ≠ distinct all-time (lahan yang melapor 2 tahun dihitung 2× di sini).
  let produksiTahunan = 0;
  let luasTahunan = 0;
  let lahanTahunan = 0;
  let petaniTahunan = 0;
  const yearsWithData = new Set<string>();

  for (const g of groups) {
    const series = seriesOf(g, dataMode);
    const t = bmpStatsForYear(g, numericYear, dataMode);
    totals.produksiTon += t.produksiTon;
    totals.luasMelaporHa += t.luasMelaporHa;
    totals.lahanBerData += t.lahanBerData;
    totals.totalLahan += t.totalLahan;
    totals.petaniMelapor += t.petaniMelapor;
    totals.totalPetani += t.totalPetani;
    availability.baik += g.availability.baik;
    availability.cukup += g.availability.cukup;
    availability.kurang += g.availability.kurang;
    availability.tidakAda += g.availability.tidakAda;

    for (const [yearKey, y] of Object.entries(series.byYear)) {
      if (numericYear != null && Number(yearKey) !== numericYear) continue;
      yearsWithData.add(yearKey);
      produksiTahunan += y.produksiTon;
      luasTahunan += y.luasMelaporHa;
      lahanTahunan += y.lahanBerData;
      petaniTahunan += y.petaniMelapor;
    }

    for (const [period, m] of Object.entries(series.monthly)) {
      const bucket = (monthly[period] ??= { produksiTon: 0, lahanMelapor: 0, luasMelaporHa: 0 });
      bucket.produksiTon += m.produksiTon;
      bucket.lahanMelapor += m.lahanMelapor;
      bucket.luasMelaporHa += m.luasMelaporHa;
    }
  }

  if (year === "average" && yearsWithData.size > 0) {
    const n = yearsWithData.size;
    totals.produksiTon = produksiTahunan / n;
    totals.luasMelaporHa = luasTahunan / n;
    totals.lahanBerData = Math.round(lahanTahunan / n);
    totals.petaniMelapor = Math.round(petaniTahunan / n);
  }

  totals.produksiTon = round2(totals.produksiTon);
  totals.luasMelaporHa = round2(totals.luasMelaporHa);
  for (const m of Object.values(monthly)) {
    m.produksiTon = round2(m.produksiTon);
    m.luasMelaporHa = round2(m.luasMelaporHa);
  }

  const produktivitasTonHa = luasTahunan > 0 ? round2(produksiTahunan / luasTahunan) : 0;

  return { totals, availability, monthly, produktivitasTonHa };
}

/**
 * Produktivitas tahunan (Ton/Ha/tahun) sebuah group: Σ produksi per tahun ÷
 * Σ luas lahan melapor per tahun (rata-rata tahunan tertimbang luas).
 */
export function bmpProductivity(g: BmpGroupEntry, year: number | null = null): number {
  let produksi = 0;
  let luas = 0;
  for (const [yearKey, y] of Object.entries(g.byYear)) {
    if (year != null && Number(yearKey) !== year) continue;
    produksi += y.produksiTon;
    luas += y.luasMelaporHa;
  }
  if (luas <= 0) return 0;
  return round2(produksi / luas);
}

/** Tahun-tahun (desc) yang punya data pada monthly slice — opsi filter chart. */
export function bmpAvailableYears(monthly: Record<string, BmpMonthlyStat>): number[] {
  const years = new Set<number>();
  for (const period of Object.keys(monthly)) {
    const y = Number.parseInt(period.slice(0, 4), 10);
    if (Number.isFinite(y)) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * Seri chart 12 bulan untuk satu tahun, atau rata-rata lintas tahun (`year = null`).
 * Mode Average: per bulan kalender, rata-rata dari tahun-tahun yang PUNYA data
 * bulan itu (pola `monthlyAverageYield` MAP-02). coveragePct = lahanMelapor /
 * totalLahan slice (0–100, dibulatkan 1 desimal).
 */
export function bmpChartSeries(
  monthly: Record<string, BmpMonthlyStat>,
  year: number | null,
  totalLahan: number
): BmpChartPoint[] {
  const tonSums = new Array(12).fill(0);
  const lahanSums = new Array(12).fill(0);
  const counts = new Array(12).fill(0);

  for (const [period, m] of Object.entries(monthly)) {
    const y = Number.parseInt(period.slice(0, 4), 10);
    const monthIndex = Number.parseInt(period.slice(5, 7), 10) - 1;
    if (!Number.isFinite(y) || monthIndex < 0 || monthIndex > 11) continue;
    if (year != null && y !== year) continue;
    tonSums[monthIndex] += m.produksiTon;
    lahanSums[monthIndex] += m.lahanMelapor;
    counts[monthIndex] += 1;
  }

  return tonSums.map((sum, monthIndex) => {
    // Satu tahun → counts[i] ∈ {0,1}; Average → bagi jumlah tahun ber-data.
    const divisor = year != null ? 1 : Math.max(counts[monthIndex], 1);
    const produksiTon = round2(sum / divisor);
    const lahanMelapor = Math.round(lahanSums[monthIndex] / divisor);
    const coveragePct =
      totalLahan > 0 ? Math.round((lahanMelapor / totalLahan) * 1000) / 10 : 0;
    return { monthIndex, produksiTon, lahanMelapor, coveragePct };
  });
}

/** Baca JSON `data` snapshot BMP secara toleran (payload rusak → kosong). */
export function normalizeBmpSnapshotData(raw: unknown): BmpSnapshotData {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const groups = Array.isArray(obj.groups) ? (obj.groups as BmpGroupEntry[]) : [];
  return {
    groups: groups.map((g) => ({
      ...g,
      monthly: g.monthly ?? {},
      byYear: g.byYear ?? {},
      monthlyFull: g.monthlyFull ?? {},
      byYearFull: g.byYearFull ?? {},
      availability: g.availability ?? emptyAvailability(),
      totals: { ...emptyTotals(), ...(g.totals ?? {}) },
    })),
  };
}
