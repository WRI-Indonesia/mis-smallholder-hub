import { formatNumber, formatPct } from "@/lib/format";

/**
 * Formatter Rantai Pasok yang dipakai Dashboard & Peta (review 2026-10-10:
 * helper bersama di `src/lib`, bukan di berkas komponen rute). Angka id-ID
 * dari `@/lib/format`.
 */

/** Tonase bulat bersatuan "t" (mis. "12.631 t"). */
export const fmtTon = (n: number) => `${formatNumber(Math.round(n))} t`;

/** Persen 1 desimal dari bagian terhadap total; "—" bila total 0. */
export const pctOf = (part: number, total: number) => (total > 0 ? `${formatPct(Math.round((part / total) * 1000) / 10)}%` : "—");

/** Jarak km 1 desimal; "—" bila tak terhitung. */
export const fmtKm = (km: number | null) => (km == null ? "—" : `${formatPct(Math.round(km * 10) / 10)} km`);
