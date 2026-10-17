import { formatNumber, formatPct } from "@/lib/format";

/**
 * Formatter Rantai Pasok yang dipakai Dashboard & Peta (review 2026-10-10:
 * helper bersama di `src/lib`, bukan di berkas komponen rute). Angka id-ID
 * dari `@/lib/format`.
 */

/** Tonase bulat bersatuan "t" (mis. "12.631 t"). */
export const fmtTon = (n: number) => `${formatNumber(Math.round(n))} t`;

/**
 * Nilai menurut toggle **Angka** kartu Aliran TBS: tonase, atau persen dari total
 * filter aktif ("0%" bila total 0). Satu definisi untuk semua tab (review 2026-10-17:
 * sempat tersalin di empat komponen).
 */
export const fmtTonOrPct = (v: number, total: number, unit: "TON" | "PCT") =>
  unit === "PCT" ? `${total > 0 ? formatPct((v / total) * 100) : "0"}%` : fmtTon(v);

/** Persen 1 desimal dari bagian terhadap total; "—" bila total 0. */
export const pctOf = (part: number, total: number) => (total > 0 ? `${formatPct(Math.round((part / total) * 1000) / 10)}%` : "—");

/** Porsi 0–1 sebagai persen 1 desimal (aturan pembulatan = `pctOf`). */
export const fmtShare = (share: number) => pctOf(share, 1);

/** Jarak km 1 desimal; "—" bila tak terhitung. */
export const fmtKm = (km: number | null) => (km == null ? "—" : `${formatPct(Math.round(km * 10) / 10)} km`);
