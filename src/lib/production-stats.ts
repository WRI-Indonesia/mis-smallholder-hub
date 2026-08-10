// Agregasi produksi per tahun + bulanan + ketersediaan per lahan — dipakai
// detail Lembaga Petani (#171) dan detail Petani (#172). Pure (tanpa Prisma).

import { productionAvailabilityCategory } from "@/lib/map-data";

export interface ProductionStatsParcel {
  /** LandParcel.id (db) — kunci ketersediaan & luas pelapor. */
  id: string;
  area: number | null;
}

export interface ProductionStatsRecord {
  parcelId: string | null;
  /** Periode "YYYY-MM". */
  period: string;
  yieldKg: number;
}

// Field bulanan dipangkas ke yang benar-benar dirender matriks #239 (TD-033):
// recordCount/areaReporting bulanan tersedia via ParcelYearBreakdownRow (Petani)
// dan agregat tahunan — jangan kirim payload mati per bulan ke client.
export interface ProductionMonthRow {
  /** Periode "YYYY-MM". */
  period: string;
  totalKg: number;
  /** Distinct lahan (ber-`parcelId`) yang melapor pada bulan tsb. */
  parcelsReporting: number;
}

export interface ProductionYearRow {
  year: number;
  totalKg: number;
  recordCount: number;
  /**
   * Distinct pasangan lahan×bulan yang melapor pada tahun tsb — basis persen
   * kelengkapan pelaporan (mandatory: min. 1 panen/bulan per lahan), penyebutnya
   * total persil × 12 bulan.
   */
  reportedParcelMonths: number;
  /** Distinct lahan (ber-`parcelId`) yang melapor pada tahun tsb. */
  parcelsReporting: number;
  /** Σ luas lahan melapor (Ha) — penyebut produktivitas (#166). */
  areaReporting: number;
  /** Ton/Ha per tahun = Σ produksi ÷ Σ luas lahan melapor (#166); 0 bila belum ada pelapor ber-lahan. */
  productivityTonHa: number;
  /** Rincian per bulan (urut naik) — baris collapsible di bawah tahun. */
  months: ProductionMonthRow[];
}

export type AvailabilityDistribution = Record<"BAIK" | "CUKUP" | "KURANG" | "NONE", number>;

// ── Varian filter matriks produksi (#239) ──

export interface ProductionMatrixParcel extends ProductionStatsParcel {
  isPsr: boolean;
  plantingYear: number | null;
}

/** Satu varian matriks (All / Exclude) + penyebut persen ketersediaannya. */
export interface ProductionMatrixVariant {
  perYear: ProductionYearRow[];
  totalParcels: number;
  totalArea: number;
}

/** Lahan yang dibuang filter "Exclude": PSR atau tanaman berumur < 3 tahun. */
export function isExcludedParcel(
  p: { isPsr: boolean; plantingYear: number | null },
  currentYear: number
): boolean {
  return p.isPsr || (p.plantingYear != null && currentYear - p.plantingYear < 3);
}

export interface ParcelBreakdownMonth {
  totalKg: number;
  recordCount: number;
}

/** Rincian produksi satu lahan pada satu tahun — sub-baris expand matriks (#239). */
export interface ParcelYearBreakdownRow {
  /** LandParcel.id; "__none__" untuk record tanpa lahan. */
  parcelKey: string;
  /** Kode lahan human-facing; "Tanpa Lahan" untuk record tanpa lahan. */
  label: string;
  area: number | null;
  isPsr: boolean;
  plantingYear: number | null;
  /** Kena filter Exclude (PSR / tanaman <3 thn) — disembunyikan pada varian Exclude. */
  excluded: boolean;
  year: number;
  /** Bulan (1–12) → agregat; hanya bulan ber-data. */
  months: Record<number, ParcelBreakdownMonth>;
  totalKg: number;
  recordCount: number;
  /** Ton/Ha lahan tsb tahun tsb; 0 bila luas tak diketahui. */
  productivityTonHa: number;
}

/**
 * Rincian per lahan per tahun untuk expand baris tahun matriks (#239) —
 * dipakai detail Petani (jumlah lahan kecil). Record tanpa lahan digabung
 * jadi satu baris "Tanpa Lahan" agar penjumlahan sub-baris = total tahun.
 */
export function buildParcelYearBreakdown(
  parcels: (ProductionMatrixParcel & { label: string })[],
  records: ProductionStatsRecord[],
  currentYear: number
): ParcelYearBreakdownRow[] {
  const meta = new Map(parcels.map((p) => [p.id, p]));
  const rows = new Map<string, ParcelYearBreakdownRow>();
  for (const r of records) {
    const year = parseInt(r.period.slice(0, 4), 10);
    const month = parseInt(r.period.slice(5, 7), 10);
    if (Number.isNaN(year) || Number.isNaN(month)) continue;
    const key = r.parcelId ?? "__none__";
    const p = r.parcelId ? meta.get(r.parcelId) : undefined;
    const rowKey = `${key}|${year}`;
    const row = rows.get(rowKey) ?? {
      parcelKey: key,
      // parcelId di luar daftar aktif = lahan nonaktif/revisi lama — jangan
      // tampilkan CUID mentah sebagai kode lahan.
      label: p?.label ?? (r.parcelId ? "Lahan nonaktif" : "Tanpa Lahan"),
      area: p?.area ?? null,
      isPsr: p?.isPsr ?? false,
      plantingYear: p?.plantingYear ?? null,
      // Konsisten dgn buildExcludeVariant: parcelId di luar daftar lahan aktif
      // ikut terbuang pada varian Exclude; hanya record tanpa lahan yang tetap.
      excluded: p ? isExcludedParcel(p, currentYear) : r.parcelId != null,
      year,
      months: {} as Record<number, ParcelBreakdownMonth>,
      totalKg: 0,
      recordCount: 0,
      productivityTonHa: 0,
    };
    const m = row.months[month] ?? { totalKg: 0, recordCount: 0 };
    m.totalKg = round2(m.totalKg + r.yieldKg);
    m.recordCount += 1;
    row.months[month] = m;
    row.totalKg = round2(row.totalKg + r.yieldKg);
    row.recordCount += 1;
    rows.set(rowKey, row);
  }
  return [...rows.values()]
    .map((row) => ({
      ...row,
      productivityTonHa:
        row.area != null && row.area > 0 ? round2(row.totalKg / 1000 / row.area) : 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "id"));
}

/**
 * Varian "Exclude" matriks produksi: lahan PSR & tanaman <3 thn dibuang
 * beserta record-nya; record tanpa lahan tetap ikut (pola #166).
 */
export function buildExcludeVariant(
  parcels: ProductionMatrixParcel[],
  records: ProductionStatsRecord[],
  currentYear: number
): ProductionMatrixVariant {
  const kept = parcels.filter((p) => !isExcludedParcel(p, currentYear));
  const keptIds = new Set(kept.map((p) => p.id));
  const keptRecords = records.filter((r) => r.parcelId == null || keptIds.has(r.parcelId));
  const stats = buildProductionStats(kept, keptRecords);
  return {
    perYear: stats.perYear,
    totalParcels: kept.length,
    totalArea: round2(kept.reduce((s, p) => s + (p.area ?? 0), 0)),
  };
}

export interface ProductionStats {
  /** Per tahun, terbaru dulu. */
  perYear: ProductionYearRow[];
  /** Distribusi kategori ketersediaan per lahan (aturan MAP-02). */
  availability: AvailabilityDistribution;
  totalKg: number;
  /** Tahun ber-data, urut naik. */
  years: number[];
}

const round2 = (n: number) => parseFloat(n.toFixed(2));

/**
 * Susun statistik produksi dari lahan + record ter-scope (satu Lembaga atau
 * satu Petani). Record tanpa lahan masuk pembilang produksi (pola #166) tapi
 * tidak menambah luas pelapor maupun ketersediaan per lahan.
 */
export function buildProductionStats(
  parcels: ProductionStatsParcel[],
  records: ProductionStatsRecord[]
): ProductionStats {
  interface MonthAcc {
    totalKg: number;
    parcelIds: Set<string>;
  }
  interface YearAcc {
    totalKg: number;
    recordCount: number;
    parcelIds: Set<string>;
    parcelMonths: Set<string>;
    months: Map<string, MonthAcc>;
  }

  const parcelArea = new Map<string, number>();
  const periodsByParcel = new Map<string, string[]>();
  for (const p of parcels) {
    parcelArea.set(p.id, p.area ?? 0);
    if (!periodsByParcel.has(p.id)) periodsByParcel.set(p.id, []);
  }

  const years = new Map<number, YearAcc>();
  let totalKg = 0;
  for (const r of records) {
    const year = parseInt(r.period.slice(0, 4), 10);
    if (Number.isNaN(year)) continue;
    const acc =
      years.get(year) ??
      {
        totalKg: 0,
        recordCount: 0,
        parcelIds: new Set<string>(),
        parcelMonths: new Set<string>(),
        months: new Map<string, MonthAcc>(),
      };
    acc.totalKg += r.yieldKg;
    acc.recordCount += 1;
    const month = acc.months.get(r.period) ?? { totalKg: 0, parcelIds: new Set<string>() };
    month.totalKg += r.yieldKg;
    if (r.parcelId) {
      acc.parcelIds.add(r.parcelId);
      acc.parcelMonths.add(`${r.parcelId}|${r.period}`);
      month.parcelIds.add(r.parcelId);
      periodsByParcel.get(r.parcelId)?.push(r.period);
    }
    acc.months.set(r.period, month);
    years.set(year, acc);
    totalKg += r.yieldKg;
  }

  const sumParcelArea = (ids: Set<string>) =>
    [...ids].reduce((s, id) => s + (parcelArea.get(id) ?? 0), 0);

  const perYear: ProductionYearRow[] = [...years.entries()]
    .map(([year, acc]) => {
      const areaReporting = sumParcelArea(acc.parcelIds);
      const months: ProductionMonthRow[] = [...acc.months.entries()]
        .map(([period, m]) => ({
          period,
          totalKg: round2(m.totalKg),
          parcelsReporting: m.parcelIds.size,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
      return {
        year,
        totalKg: round2(acc.totalKg),
        recordCount: acc.recordCount,
        reportedParcelMonths: acc.parcelMonths.size,
        parcelsReporting: acc.parcelIds.size,
        areaReporting: round2(areaReporting),
        productivityTonHa: areaReporting > 0 ? round2(acc.totalKg / 1000 / areaReporting) : 0,
        months,
      };
    })
    .sort((a, b) => b.year - a.year);

  const availability: AvailabilityDistribution = { BAIK: 0, CUKUP: 0, KURANG: 0, NONE: 0 };
  for (const periods of periodsByParcel.values()) {
    availability[productionAvailabilityCategory(periods)] += 1;
  }

  return {
    perYear,
    availability,
    totalKg: round2(totalKg),
    years: [...years.keys()].sort((a, b) => a - b),
  };
}
