/**
 * Formatter angka id-ID bersama (dedup audit #233 — semula terduplikasi di
 * ±30 file; `formatArea` dipusatkan menyusul di #241). Instance
 * Intl.NumberFormat dibuat sekali per modul; membuatnya berulang di dalam
 * komponen/render adalah biaya yang tidak perlu.
 *
 * Aturan (docs/standards/code-standards.md): formatter angka id-ID WAJIB
 * diimpor dari modul ini — jangan buat definisi lokal baru. Varian dengan
 * semantik berbeda (mis. pembulatan ke bawah pada matriks cakupan pelatihan)
 * tetap lokal di pemakainya.
 */
const NUM_ID = new Intl.NumberFormat("id-ID");
const PCT1_ID = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const DEC2_ID = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Angka gaya id-ID, tanpa desimal paksa (mis. 1.234.567). */
export const formatNumber = (n: number) => NUM_ID.format(n);

/** Angka persen maks 1 desimal, tanpa simbol "%" (mis. "87,5"). */
export const formatPct = (n: number) => PCT1_ID.format(n);

/** Luas lahan (dan angka desimal-2 lain) gaya id-ID, 2 desimal tetap, tanpa
 *  satuan (mis. "1.234,50") — pemakai menambah " ha"/" Ha" sendiri. */
export const formatArea = (n: number) => DEC2_ID.format(n);

/** Nama bulan Bahasa Indonesia lengkap, indeks 0 = Januari. */
export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/** Nama bulan Bahasa Indonesia singkat 3 huruf, indeks 0 = Jan. */
export const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;

/**
 * Cap waktu "data per" di header dashboard — `dd-Mon-yy HH:mm` waktu lokal
 * browser (mis. "20-Sep-26 11:50"). Semula tersalin di 5 klien dashboard
 * (review #347) — satu sumber di sini.
 */
export const formatGeneratedAt = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${MONTH_SHORT_ID[d.getMonth()]}-${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Batas atas sumbu Y grafik: nilai "bulat" 1/2/5 × 10^n pertama ≥ maks data
 * (mis. 730 → 1.000, 42 → 50). `floor` = nilai saat data ≤ 0. Semula tersalin
 * di 4 grafik (review #347).
 */
export function axisMax(dataMax: number, floor = 10): number {
  if (dataMax <= 0) return floor;
  const pow = Math.pow(10, Math.floor(Math.log10(dataMax)));
  for (const m of [1, 2, 5, 10]) if (dataMax <= m * pow) return m * pow;
  return 10 * pow;
}
