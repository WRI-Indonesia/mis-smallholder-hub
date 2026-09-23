import { compareParcelGroupLabels, parcelGroupValue } from "@/lib/report-land-parcel";

/**
 * Warna poligon peta Sebaran Lahan per Kelompok Tani atau per Blok (#372).
 * Aturan grup sama dengan Excel per KT/Blok (#371): tak peka huruf besar-kecil,
 * "Tidak Ada"/"-" = tanpa grup, urutan natural; Blok lintas KT.
 */
export type ParcelColorBy = "kelompokTani" | "blok";

/**
 * Palet kategorikal — warna ditetapkan menurut urutan grup, berulang bila grup
 * lebih banyak (label nama Blok di peta membedakan Blok yang sewarna).
 */
export const PARCEL_GROUP_COLORS = [
  "#16a34a", "#2563eb", "#ea580c", "#9333ea", "#0d9488",
  "#dc2626", "#ca8a04", "#db2777", "#4f46e5", "#65a30d",
  "#0891b2", "#b45309", "#0369a1", "#a21caf", "#854d0e",
  "#166534", "#1e3a8a", "#f472b6", "#fb923c", "#22d3ee",
];
export const NO_GROUP_COLOR = "#94a3b8";
export const NO_GROUP_KEY = "__tanpa__";

export const PARCEL_COLOR_BY_LABELS: Record<ParcelColorBy, string> = {
  kelompokTani: "Kelompok Tani",
  blok: "Blok",
};

export interface ParcelColorGroup {
  key: string;
  label: string;
  color: string;
}

/** Kunci grup satu lahan untuk mode `by`; tanpa grup → `NO_GROUP_KEY`. */
export function parcelColorGroupKey(p: { kelompokTani: string | null; blok: string | null }, by: ParcelColorBy): string {
  return parcelGroupValue(by === "blok" ? p.blok : p.kelompokTani)?.toLocaleLowerCase("id-ID") ?? NO_GROUP_KEY;
}

/**
 * Grup + warna, urut natural dengan grup "Tanpa …" (abu) di akhir. Label =
 * ejaan pertama yang ditemui. Hanya grup yang punya lahan di `parcels`.
 */
export function buildParcelColorGroups(
  parcels: readonly { kelompokTani: string | null; blok: string | null }[],
  by: ParcelColorBy,
): ParcelColorGroup[] {
  const labels = new Map<string, string | null>();
  for (const p of parcels) {
    const value = parcelGroupValue(by === "blok" ? p.blok : p.kelompokTani);
    const key = value?.toLocaleLowerCase("id-ID") ?? NO_GROUP_KEY;
    if (!labels.has(key)) labels.set(key, value);
  }
  const noLabel = by === "blok" ? "Tanpa Blok" : "Tanpa Kelompok Tani";
  let i = 0;
  return [...labels.entries()]
    .sort(([, a], [, b]) => compareParcelGroupLabels(a, b))
    .map(([key, label]) =>
      label === null
        ? { key, label: noLabel, color: NO_GROUP_COLOR }
        : { key, label, color: PARCEL_GROUP_COLORS[i++ % PARCEL_GROUP_COLORS.length] },
    );
}

/**
 * Titik label nama grup (Blok): titik tengah lahan ANGGOTA yang terdekat ke
 * rerata titik tengah anggota. Bukan tengah bbox gabungan — Blok yang
 * lahannya terpencar (utara & selatan) akan berlabel di atas Blok lain, dan
 * saat warna berulang pembaca salah menisbahkan lahan (review wrap-up #372).
 */
export function groupLabelAnchor(centroids: readonly [number, number][]): [number, number] | null {
  if (centroids.length === 0) return null;
  const mx = centroids.reduce((s, c) => s + c[0], 0) / centroids.length;
  const my = centroids.reduce((s, c) => s + c[1], 0) / centroids.length;
  let best = centroids[0];
  let bestD = Infinity;
  for (const c of centroids) {
    const d = (c[0] - mx) ** 2 + (c[1] - my) ** 2;
    if (d < bestD) [best, bestD] = [c, d];
  }
  return best;
}
