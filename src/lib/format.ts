/**
 * Formatter angka id-ID bersama (dedup audit #233 — semula terduplikasi di
 * ±30 file). Instance Intl.NumberFormat dibuat sekali per modul; membuatnya
 * berulang di dalam komponen/render adalah biaya yang tidak perlu.
 *
 * Varian dengan semantik berbeda (mis. pembulatan ke bawah pada matriks
 * cakupan pelatihan, desimal-2 area "ha") sengaja tetap lokal di pemakainya.
 */
const NUM_ID = new Intl.NumberFormat("id-ID");
const PCT1_ID = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** Angka gaya id-ID, tanpa desimal paksa (mis. 1.234.567). */
export const formatNumber = (n: number) => NUM_ID.format(n);

/** Angka persen maks 1 desimal, tanpa simbol "%" (mis. "87,5"). */
export const formatPct = (n: number) => PCT1_ID.format(n);
