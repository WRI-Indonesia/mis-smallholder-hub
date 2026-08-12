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
