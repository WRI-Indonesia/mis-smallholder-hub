// Helper murni bulk upload titik pohon (#238) — dipisah dari Server Action
// agar teruji tanpa DB. Shapefile point per lahan; satu ZIP boleh berisi
// lebih dari satu lahan (dikelompokkan per atribut parcel_id).

export interface TreeFeatureInput {
  index: number;
  properties: Record<string, unknown>;
  geometry: { type?: string; coordinates?: unknown } | null;
}

export interface TreeRowInput {
  treeId: number | null;
  sequenceNo: number | null;
  longitude: number;
  latitude: number;
  category: string | null;
  vigor: number | null;
  source: string | null;
  modelVersion: string | null;
}

export interface TreeGroupInput {
  parcelId: string;
  rows: TreeRowInput[];
}

export interface SkippedTreeFeature {
  index: number;
  reason: string;
}

/** Sumber titik yang dikenal (README ekspor); nilai lain tetap disimpan apa adanya. */
export const TREE_SOURCES = ["auto", "moved", "added", "verified"] as const;

// DBF menandai NULL numerik dengan '*' berulang; string kosong/whitespace → null.
function cleanString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "" || /^\*+$/.test(s)) return null;
  return s;
}

function cleanNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = cleanString(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cleanInt(v: unknown): number | null {
  const n = cleanNumber(v);
  return n === null ? null : Math.trunc(n);
}

// Ambil properti tanpa peduli kapitalisasi (DBF kadang uppercase).
function prop(props: Record<string, unknown>, ...names: string[]): unknown {
  const lower = new Map(Object.entries(props).map(([k, v]) => [k.toLowerCase(), v]));
  for (const name of names) {
    const v = lower.get(name.toLowerCase());
    if (v !== undefined) return v;
  }
  return undefined;
}

function pointCoords(geometry: TreeFeatureInput["geometry"]): [number, number] | null {
  if (!geometry || geometry.type !== "Point" || !Array.isArray(geometry.coordinates)) return null;
  const [lng, lat] = geometry.coordinates as unknown[];
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

/**
 * Kelompokkan fitur shapefile per `parcel_id` menjadi payload siap simpan.
 * Koordinat diambil dari geometri Point; fallback ke atribut lon/lat bila
 * geometri hilang. Fitur tanpa parcel_id atau tanpa koordinat valid dicatat
 * di `skipped` (indeks 0-based fitur di file).
 */
export function groupTreeFeatures(features: TreeFeatureInput[]): {
  groups: TreeGroupInput[];
  skipped: SkippedTreeFeature[];
} {
  const byParcel = new Map<string, TreeRowInput[]>();
  const skipped: SkippedTreeFeature[] = [];

  for (const feat of features) {
    const props = feat.properties ?? {};
    const parcelId = cleanString(prop(props, "parcel_id", "parcelid", "land_id"));
    if (!parcelId) {
      skipped.push({ index: feat.index, reason: "Atribut parcel_id kosong" });
      continue;
    }

    let coords = pointCoords(feat.geometry);
    if (!coords) {
      const lon = cleanNumber(prop(props, "lon", "longitude", "x"));
      const lat = cleanNumber(prop(props, "lat", "latitude", "y"));
      if (lon !== null && lat !== null) coords = [lon, lat];
    }
    if (!coords || Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) {
      skipped.push({ index: feat.index, reason: "Koordinat titik tidak valid (bukan WGS84?)" });
      continue;
    }

    const row: TreeRowInput = {
      treeId: cleanInt(prop(props, "tree_id", "treeid")),
      sequenceNo: cleanInt(prop(props, "no", "seq", "sequence")),
      longitude: coords[0],
      latitude: coords[1],
      category: cleanString(prop(props, "category", "kategori")),
      vigor: cleanNumber(prop(props, "vigor")),
      source: cleanString(prop(props, "source", "sumber")),
      modelVersion: cleanString(prop(props, "model_ver", "model_version")),
    };

    const rows = byParcel.get(parcelId);
    if (rows) rows.push(row);
    else byParcel.set(parcelId, [row]);
  }

  return {
    groups: [...byParcel.entries()].map(([parcelId, rows]) => ({ parcelId, rows })),
    skipped,
  };
}

/** Kerapatan tanam (pohon/ha); null bila luas tidak tersedia/nol. */
export function treeDensity(count: number, area: number | null | undefined): number | null {
  if (area == null || area <= 0) return null;
  return count / area;
}

/** Komposisi jumlah pohon per nilai `source` (untuk kartu statistik). */
export function summarizeTreeSources(
  sources: (string | null)[],
): { source: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of sources) {
    const key = s ?? "(tanpa sumber)";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}
