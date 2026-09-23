/**
 * Kolom "Koordinat" unduhan Excel lahan (#370) — seluruh node (vertex)
 * poligon sebagai teks: `Lintang,Bujur` per node (bisa ditempel langsung ke
 * Google Maps), `; ` antar-node, ` | ` antar-ring (ring pertama tiap poligon =
 * ring luar; lubang & bagian MultiPolygon menyusul). Node penutup ring GeoJSON
 * (= node pertama) tidak diulang. Dipakai Peta Lahan (Area Lahan Petani) dan
 * Laporan Lahan — PDF tidak memakainya.
 */

/** Batas isi satu sel Excel. Lebih dari ini berkas dianggap rusak saat dibuka. */
export const EXCEL_CELL_MAX_CHARS = 32767;

const NODE_SEP = "; ";
const RING_SEP = " | ";

/** Geometri longgar: melayani `Polygon | MultiPolygon` (peta) maupun `LpGeoJson` (laporan). */
export interface NodeGeometry {
  type?: string;
  coordinates?: unknown;
}

export interface ParcelNodes {
  text: string;
  /** Jumlah node unik PENUH — tetap utuh walau `text` terpotong. */
  count: number;
  truncated: boolean;
}

const isPosition = (p: unknown): p is number[] =>
  Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);

/** Node satu ring sebagai "lat,lon" 6 desimal; node penutup duplikat dibuang. */
function ringNodes(ring: unknown): string[] {
  if (!Array.isArray(ring)) return [];
  const pts = ring.filter(isPosition);
  if (pts.length > 1) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) pts.pop();
  }
  return pts.map(([lon, lat]) => `${lat.toFixed(6)},${lon.toFixed(6)}`);
}

function polygonRings(geometry: NodeGeometry | null | undefined): unknown[] {
  const c = geometry?.coordinates;
  if (!Array.isArray(c)) return [];
  if (geometry?.type === "Polygon") return c;
  if (geometry?.type === "MultiPolygon") return c.flatMap((poly) => (Array.isArray(poly) ? poly : []));
  return [];
}

export function formatParcelNodes(geometry: NodeGeometry | null | undefined, maxChars = EXCEL_CELL_MAX_CHARS): ParcelNodes {
  const rings = polygonRings(geometry).map(ringNodes).filter((r) => r.length > 0);
  const count = rings.reduce((n, r) => n + r.length, 0);
  const text = rings.map((r) => r.join(NODE_SEP)).join(RING_SEP);
  if (text.length <= maxChars) return { text, count, truncated: false };

  // Potong pada node terakhir yang muat; sisakan ruang penanda (dihitung
  // dengan `count` penuh — batas atas, karena sisa node selalu ≤ count).
  const budget = maxChars - ` … (${count} node lagi)`.length;
  let out = "";
  let taken = 0;
  outer: for (const [ri, ring] of rings.entries()) {
    for (const [ni, node] of ring.entries()) {
      const piece = (taken === 0 ? "" : ni === 0 && ri > 0 ? RING_SEP : NODE_SEP) + node;
      if (out.length + piece.length > budget) break outer;
      out += piece;
      taken++;
    }
  }
  return { text: `${out}${out ? " " : ""}… (${count - taken} node lagi)`, count, truncated: true };
}
