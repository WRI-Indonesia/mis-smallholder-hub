import { productionAvailabilityCategory } from "@/lib/map-data";
import { annualizeFactor, isDataMonth } from "@/lib/productivity-annualize";
import type {
  BmpAgeBucketStat,
  BmpAvailabilityCounts,
  BmpChartPoint,
  BmpFarmerGroupCategory,
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
  /** Tahun tanam — basis bucket umur tanaman (#191); null = bucket "unknown". */
  plantingYear: number | null;
}

/**
 * Bucket umur tanaman (#191) — umur pada TAHUN PRODUKSI (tahun produksi −
 * tahun tanam), bukan umur hari ini, agar analisa historis tetap benar.
 * Batas mengikuti kurva hasil sawit: TBM 0–2, TM muda 3–8 (menanjak), TM prima
 * 9–15 (puncak), TM tua 16–25 (menurun), renta >25 (kandidat peremajaan/PSR).
 * TBM < 3 / TM muda 3–8 = keputusan owner 2026-10-12 (#428; dulu < 4 / 4–8),
 * selaras dengan filter Exclude "tanaman < 3 thn" matriks produksi.
 */
const BMP_AGE_BUCKETS = [
  { key: "lt3", label: "< 3 thn (TBM)" },
  { key: "3-8", label: "3–8 thn (TM muda)" },
  { key: "9-15", label: "9–15 thn (TM prima)" },
  { key: "16-25", label: "16–25 thn (TM tua)" },
  { key: "gt25", label: "> 25 thn (renta)" },
  { key: "unknown", label: "Tanpa thn tanam" },
] as const;

export type BmpAgeBucketKey = (typeof BMP_AGE_BUCKETS)[number]["key"];

export function bmpAgeBucketKey(plantingYear: number | null, productionYear: number): BmpAgeBucketKey {
  if (plantingYear == null) return "unknown";
  const age = productionYear - plantingYear;
  if (age < 0) return "unknown";
  if (age < 3) return "lt3";
  if (age <= 8) return "3-8";
  if (age <= 15) return "9-15";
  if (age <= 25) return "16-25";
  return "gt25";
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
    totalLuasHa: 0,
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
    /** tahun → bucket umur → akumulasi (hanya record ber-lahan, #191). */
    byYearAge: Map<string, Map<string, { ton: number; parcelIds: Set<string> }>>;
  }
  interface Acc {
    all: SeriesAcc;
    periodsByParcel: Map<string, Set<string>>; // parcel id → periods with data
    reportingFarmers: Set<string>;
    totalTon: number;
    totalLahan: number;
    totalLuasHa: number;
    totalPetani: number;
  }
  const emptySeries = (): SeriesAcc => ({
    monthly: new Map(),
    byYear: new Map(),
    byYearAge: new Map(),
  });
  const emptyAcc = (): Acc => ({
    all: emptySeries(),
    periodsByParcel: new Map(),
    reportingFarmers: new Set(),
    totalTon: 0,
    totalLahan: 0,
    totalLuasHa: 0,
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
    if (groupId) {
      const acc = accFor(groupId);
      acc.totalLahan += 1;
      acc.totalLuasHa += p.area ?? 0;
    }
  }

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

      // Analisa umur tanaman (#191): hanya record ber-lahan — tanpa lahan tidak
      // ada tahun tanam ataupun luas, produktivitas per bucket jadi tak bermakna.
      const ageKey = bmpAgeBucketKey(
        parcelById.get(r.parcelId)?.plantingYear ?? null,
        Number(yearKey)
      );
      let perAge = s.byYearAge.get(yearKey);
      if (!perAge) s.byYearAge.set(yearKey, (perAge = new Map()));
      let ageBucket = perAge.get(ageKey);
      if (!ageBucket) perAge.set(ageKey, (ageBucket = { ton: 0, parcelIds: new Set() }));
      ageBucket.ton += r.kg / 1000;
      ageBucket.parcelIds.add(r.parcelId);
    }
  };

  // Akumulasi per group.
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
    const byYearAge: Record<string, Record<string, BmpAgeBucketStat>> = {};
    for (const [yearKey, perAge] of [...s.byYearAge.entries()].sort()) {
      const buckets: Record<string, BmpAgeBucketStat> = {};
      for (const [ageKey, b] of perAge) {
        let luas = 0;
        for (const pid of b.parcelIds) luas += parcelById.get(pid)?.area ?? 0;
        buckets[ageKey] = { produksiTon: round2(b.ton), luasMelaporHa: round2(luas) };
      }
      byYearAge[yearKey] = buckets;
    }
    return { monthly, byYear, byYearAge };
  };

  const entries: BmpGroupEntry[] = groups.map((g) => {
    const acc = accByGroup.get(g.id) ?? emptyAcc();
    const { monthly, byYear, byYearAge } = serializeSeries(acc.all);

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
      byYearAge,
      availability,
      totals: {
        produksiTon: round2(acc.totalTon),
        luasMelaporHa: round2(luasMelaporHa),
        lahanBerData: acc.periodsByParcel.size,
        totalLahan: acc.totalLahan,
        totalLuasHa: round2(acc.totalLuasHa),
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

/**
 * Faktor penyetahunan produktivitas (keputusan owner 2026-10-08, aturan di
 * `productivity-annualize.ts` — sama dengan Peta BMP & detail Lembaga/Petani): bulan
 * dihitung PER LEMBAGA dari seri bulanan snapshot; 1 bila tahun itu
 * tanpa data bulanan.
 */
export function bmpAnnualizeFactor(g: BmpGroupEntry, yearKey: string): number {
  return annualizeFactor(monthsPerYear(g).get(yearKey));
}

/**
 * Jumlah bulan ber-data per tahun sebuah group — dihitung sekali per objek snapshot
 * (dipanggil berulang tiap ganti filter; review bb562b7). Kunci bulanan `YYYY-MM` unik,
 * jadi maks 12 per tahun. Bulan dihitung ada bila tercatat produksi ATAU lahan melapor:
 * `produksiTon` sudah dibulatkan 2 desimal, sehingga bulan < 5 kg terbaca 0 padahal
 * tonasenya tetap ikut pembilang.
 */
const monthsCache = new WeakMap<BmpGroupEntry, Map<string, number>>();
function monthsPerYear(g: BmpGroupEntry): Map<string, number> {
  let counts = monthsCache.get(g);
  if (!counts) {
    counts = new Map();
    for (const [period, m] of Object.entries(g.monthly ?? {})) {
      if (!isDataMonth(m.produksiTon, m.lahanMelapor)) continue;
      const year = period.slice(0, 4);
      counts.set(year, (counts.get(year) ?? 0) + 1);
    }
    monthsCache.set(g, counts);
  }
  return counts;
}

/** Stats sebuah group untuk tahun terpilih (`year = null` → agregat semua tahun). */
export function bmpStatsForYear(g: BmpGroupEntry, year: number | null): BmpGroupTotals {
  if (year == null) return g.totals;
  const y = g.byYear[String(year)] ?? { produksiTon: 0, luasMelaporHa: 0, lahanBerData: 0, petaniMelapor: 0 };
  return {
    ...y,
    // Master data (denominator) year-independent — pola kelompokTaniCount Main Dashboard.
    totalLahan: g.totals.totalLahan,
    totalLuasHa: g.totals.totalLuasHa,
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
  year: number | "average" | null = null
): BmpSlicedStats {
  const totals = emptyTotals();
  const availability = emptyAvailability();
  const monthly: Record<string, BmpMonthlyStat> = {};
  const numericYear = typeof year === "number" ? year : null;
  // Akumulasi per-tahun (Σ nilai tahunan lintas tahun terpilih): dipakai produktivitas
  // (Σ produksi ÷ Σ luas) dan mode "average" (÷ jumlah tahun ber-data). Distinct
  // per-tahun ≠ distinct all-time (lahan yang melapor 2 tahun dihitung 2× di sini).
  let produksiTahunan = 0;
  /** Σ produksi disetahunkan per Lembaga per tahun — pembilang produktivitas. */
  let produksiSetahun = 0;
  let luasTahunan = 0;
  let lahanTahunan = 0;
  let petaniTahunan = 0;
  const yearsWithData = new Set<string>();

  for (const g of groups) {
    const t = bmpStatsForYear(g, numericYear);
    totals.produksiTon += t.produksiTon;
    totals.luasMelaporHa += t.luasMelaporHa;
    totals.lahanBerData += t.lahanBerData;
    totals.totalLahan += t.totalLahan;
    totals.totalLuasHa += t.totalLuasHa;
    totals.petaniMelapor += t.petaniMelapor;
    totals.totalPetani += t.totalPetani;
    availability.baik += g.availability.baik;
    availability.cukup += g.availability.cukup;
    availability.kurang += g.availability.kurang;
    availability.tidakAda += g.availability.tidakAda;

    for (const [yearKey, y] of Object.entries(g.byYear)) {
      if (numericYear != null && Number(yearKey) !== numericYear) continue;
      yearsWithData.add(yearKey);
      produksiTahunan += y.produksiTon;
      produksiSetahun += y.produksiTon * bmpAnnualizeFactor(g, yearKey);
      luasTahunan += y.luasMelaporHa;
      lahanTahunan += y.lahanBerData;
      petaniTahunan += y.petaniMelapor;
    }

    for (const [period, m] of Object.entries(g.monthly)) {
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
  totals.totalLuasHa = round2(totals.totalLuasHa);
  for (const m of Object.values(monthly)) {
    m.produksiTon = round2(m.produksiTon);
    m.luasMelaporHa = round2(m.luasMelaporHa);
  }

  const produktivitasTonHa = luasTahunan > 0 ? round2(produksiSetahun / luasTahunan) : 0;

  return { totals, availability, monthly, produktivitasTonHa };
}

/**
 * Produktivitas tahunan (Ton/Ha/tahun) sebuah group: Σ produksi per tahun (disetahunkan,
 * `bmpAnnualizeFactor`) ÷ Σ luas lahan melapor per tahun (rata-rata tahunan tertimbang luas).
 */
export function bmpProductivity(g: BmpGroupEntry, year: number | null = null): number {
  let produksi = 0;
  let luas = 0;
  for (const [yearKey, y] of Object.entries(g.byYear)) {
    if (year != null && Number(yearKey) !== year) continue;
    produksi += y.produksiTon * bmpAnnualizeFactor(g, yearKey);
    luas += y.luasMelaporHa;
  }
  if (luas <= 0) return 0;
  return round2(produksi / luas);
}

export interface BmpAgeSeriesEntry {
  key: BmpAgeBucketKey;
  label: string;
  produksiTon: number;
  luasMelaporHa: number;
  /** Σ produksi disetahunkan ÷ Σ luas (tertimbang lintas tahun terpilih); 0 bila tanpa luas. */
  produktivitasTonHa: number;
}

/**
 * Ringkasan per bucket umur tanaman lintas group (#191). `year` numerik →
 * tahun itu saja; `"average"`/`null` → Σ lintas tahun (produksi dibagi jumlah
 * tahun ber-data bucket ybs pada mode average; produktivitas selalu tertimbang
 * Σton disetahunkan ÷ Σluas, faktor per Lembaga). Bucket "unknown" disertakan hanya bila ber-data.
 */
export function bmpAgeSeries(
  groups: BmpGroupEntry[],
  year: number | "average" | null
): BmpAgeSeriesEntry[] {
  const acc = new Map<string, { ton: number; tonSetahun: number; luas: number; years: Set<string> }>();
  for (const g of groups) {
    for (const [yearKey, buckets] of Object.entries(g.byYearAge ?? {})) {
      if (typeof year === "number" && Number(yearKey) !== year) continue;
      const factor = bmpAnnualizeFactor(g, yearKey);
      for (const [ageKey, b] of Object.entries(buckets)) {
        let bucket = acc.get(ageKey);
        if (!bucket) acc.set(ageKey, (bucket = { ton: 0, tonSetahun: 0, luas: 0, years: new Set() }));
        bucket.ton += b.produksiTon;
        bucket.tonSetahun += b.produksiTon * factor;
        bucket.luas += b.luasMelaporHa;
        bucket.years.add(yearKey);
      }
    }
  }
  return BMP_AGE_BUCKETS.filter((b) => b.key !== "unknown" || acc.has(b.key)).map((b) => {
    const a = acc.get(b.key) ?? { ton: 0, tonSetahun: 0, luas: 0, years: new Set<string>() };
    const divisor = year === "average" && a.years.size > 0 ? a.years.size : 1;
    return {
      key: b.key,
      label: b.label,
      produksiTon: round2(a.ton / divisor),
      luasMelaporHa: round2(a.luas / divisor),
      produktivitasTonHa: a.luas > 0 ? round2(a.tonSetahun / a.luas) : 0,
    };
  });
}

export interface BmpGroupRankingEntry {
  id: string;
  name: string;
  code: string | null;
  category: BmpFarmerGroupCategory;
  produktivitasTonHa: number;
  luasMelaporHa: number;
}

/**
 * Ranking Lembaga berdasarkan produktivitas (Ton/Ha/tahun, disetahunkan) pada tahun terpilih
 * (#191) — hanya lembaga dengan luas terdata > 0, urut tertinggi dulu.
 */
export function bmpGroupRanking(
  groups: BmpGroupEntry[],
  year: number | "average" | null,
  limit = 10
): BmpGroupRankingEntry[] {
  const numericYear = typeof year === "number" ? year : null;
  return groups
    .map((g) => {
      let ton = 0;
      let luas = 0;
      for (const [yearKey, y] of Object.entries(g.byYear)) {
        if (numericYear != null && Number(yearKey) !== numericYear) continue;
        ton += y.produksiTon * bmpAnnualizeFactor(g, yearKey);
        luas += y.luasMelaporHa;
      }
      return {
        id: g.id,
        name: g.name,
        code: g.code,
        category: g.category,
        produktivitasTonHa: luas > 0 ? round2(ton / luas) : 0,
        luasMelaporHa: round2(luas),
      };
    })
    .filter((e) => e.luasMelaporHa > 0)
    .sort((a, b) => b.produktivitasTonHa - a.produktivitasTonHa)
    .slice(0, limit);
}

/** Tahun-tahun (desc) yang punya data `byYear` pada kumpulan group — opsi filter Tahun dashboard. */
export function bmpYearOptions(groups: BmpGroupEntry[]): number[] {
  const set = new Set<number>();
  for (const g of groups) {
    for (const key of Object.keys(g.byYear ?? {})) {
      const y = Number(key);
      if (!Number.isNaN(y)) set.add(y);
    }
  }
  return [...set].sort((a, b) => b - a);
}

/**
 * Default filter Tahun dashboard BMP (#191): tahun berjalan bila ber-data;
 * fallback tahun terbaru ber-data (pola "newest year with data" Peta BMP);
 * snapshot tanpa tahun sama sekali → "average".
 */
export function bmpDefaultYear(
  yearOptions: number[],
  currentYear: number
): number | "average" {
  if (yearOptions.includes(currentYear)) return currentYear;
  return yearOptions[0] ?? "average";
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

type LegacyBmpGroupEntry = BmpGroupEntry & { monthlyFull?: unknown; byYearFull?: unknown; byYearAgeFull?: unknown };

/** Kunci bucket umur sebelum #428 (TBM < 4, TM muda 4–8). */
const LEGACY_AGE_KEYS = new Set(["lt4", "4-8"]);

/** Baca JSON `data` snapshot BMP secara toleran (payload rusak → kosong). */
export function normalizeBmpSnapshotData(raw: unknown): BmpSnapshotData {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const groups = Array.isArray(obj.groups) ? (obj.groups as LegacyBmpGroupEntry[]) : [];
  // Snapshot sebelum #428 menyimpan umur 3 di TBM — angkanya tak bisa dipetakan ke
  // batas baru, jadi data umur seluruh snapshot dikosongkan (UI meminta generate
  // ulang). Tanpa kunci lama, bucket 9–15/16–25/>25 tetap benar dan dipertahankan.
  const legacyAge = groups.some((g) =>
    Object.values(g.byYearAge ?? {}).some((b) => Object.keys(b ?? {}).some((k) => LEGACY_AGE_KEYS.has(k)))
  );
  return {
    // Snapshot lama (sebelum #425) masih memuat subset "Data Full 1 Tahun" — dibuang
    // supaya tidak ikut terkirim ke client.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    groups: groups.map(({ monthlyFull, byYearFull, byYearAgeFull, ...g }) => ({
      ...g,
      monthly: g.monthly ?? {},
      byYear: g.byYear ?? {},
      byYearAge: legacyAge ? {} : (g.byYearAge ?? {}),
      availability: g.availability ?? emptyAvailability(),
      totals: { ...emptyTotals(), ...(g.totals ?? {}) },
    })),
  };
}
