// Penyetahunan produktivitas (keputusan owner 2026-10-08): Ton/Ha/tahun pada tahun
// yang datanya belum 12 bulan diproyeksikan = produksi × 12 ÷ bulan ber-data, dengan
// bulan dihitung PER LEMBAGA (cakupan impor tiap Lembaga berbeda). Satu aturan untuk
// BMP Dashboard (snapshot), Peta BMP, dan matriks produksi detail Lembaga/Petani.
// Hanya produktivitas yang disetahunkan — angka produksi tetap yang tercatat. Pure.

const VALID_PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

const round2 = (n: number) => parseFloat(n.toFixed(2));

/** Bulan per tahun (kunci "YYYY") yang punya data produksi sebuah Lembaga. */
export type DataMonthsByYear = Record<string, number>;

/**
 * Sebuah bulan dihitung ber-data bila tercatat produksi ATAU ada lahan melapor —
 * aturan yang sama dengan seri bulanan snapshot BMP, yang menyimpan ton terbulat
 * 2 desimal (bulan < 5 kg terbaca 0 tetapi lahannya tetap melapor).
 */
export function isDataMonth(tonRounded: number, parcelsReporting: number): boolean {
  return tonRounded > 0 || parcelsReporting > 0;
}

/** 12 ÷ bulan ber-data; 1 bila tahun itu tanpa data bulanan (tak disetahunkan). */
export function annualizeFactor(months: number | undefined): number {
  return months != null && months > 0 ? 12 / months : 1;
}

/** Faktor untuk satu tahun dari peta bulan ber-data; peta kosong/absen → 1. */
export function annualizeFactorFor(monthsByYear: DataMonthsByYear | undefined, year: number | string): number {
  return annualizeFactor(monthsByYear?.[String(year)]);
}

/**
 * Bulan ber-data per tahun dari agregat bulanan satu Lembaga: `kg` = Σ produksi
 * bulan itu (semua record, termasuk tanpa lahan), `linked` = jumlah record ber-lahan.
 * Periode tak valid diabaikan; periode ganda dijumlah dulu.
 */
export function dataMonthsPerYear(rows: { period: string; kg: number; linked: number }[]): DataMonthsByYear {
  const byPeriod = new Map<string, { kg: number; linked: number }>();
  for (const r of rows) {
    if (!VALID_PERIOD.test(r.period)) continue;
    const acc = byPeriod.get(r.period) ?? { kg: 0, linked: 0 };
    acc.kg += r.kg;
    acc.linked += r.linked;
    byPeriod.set(r.period, acc);
  }
  const out: DataMonthsByYear = {};
  for (const [period, m] of byPeriod) {
    if (!isDataMonth(round2(m.kg / 1000), m.linked)) continue;
    const year = period.slice(0, 4);
    out[year] = (out[year] ?? 0) + 1;
  }
  return out;
}

/** `dataMonthsPerYear` dari record mentah (parcelId + period + yieldKg). */
export function dataMonthsFromRecords(
  records: { parcelId: string | null; period: string; yieldKg: number }[]
): DataMonthsByYear {
  return dataMonthsPerYear(records.map((r) => ({ period: r.period, kg: r.yieldKg, linked: r.parcelId ? 1 : 0 })));
}

/**
 * Rata-rata tahunan Ton/Ha/tahun satu lahan (mode "Lahan › Tahun" layar & PDF Profil
 * Petani) = rata-rata `productivityTonHa` baris tahunnya — sudah disetahunkan per
 * tahun, jadi tahun berjalan yang baru sebagian tidak menyeret rata-rata turun.
 * 0 bila luas tak diketahui atau tanpa tahun ber-data.
 */
export function parcelAverageTonHa(area: number | null, years: { productivityTonHa: number }[]): number {
  if (area == null || area <= 0 || years.length === 0) return 0;
  return years.reduce((s, y) => s + y.productivityTonHa, 0) / years.length;
}
