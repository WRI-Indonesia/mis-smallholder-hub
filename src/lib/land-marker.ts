/**
 * Patok batas lahan (#329) — helper MURNI (tanpa Prisma/Next): konstanta,
 * label, penomoran vertex, dan perencanaan "Buat patok dari poligon".
 * Kueri DB-nya di `land-marker-query.ts`.
 */
import { haversineMeters } from "@/lib/geo";

/** Vertex ≤ jarak ini dari patok yang sudah ada DITAUTKAN, bukan dibuat baru (keputusan owner 2026-09-14). */
export const MARKER_SNAP_M = 5;
/** Koordinat patok wajib ≤ jarak ini dari batas lahan — guard lat/long tertukar / salah tempel desimal. */
export const MARKER_MAX_DISTANCE_M = 100;
/** Pergeseran koordinat di bawah ini (m) dianggap "tidak digeser" — form mengirim ulang nilai 6 desimal (≤ ~8 cm). */
export const MARKER_MOVE_EPSILON_M = 0.2;
/** Toleransi penyederhanaan ring (m) — vertex kolinear/berhimpit hasil digitasi lengkung tak jadi patok. */
export const MARKER_SIMPLIFY_M = 1;
/** Foto patok: jpg/png/webp ≤ 5 MB. */
export const MARKER_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const MARKER_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const LAND_MARKER_CONDITIONS = ["PRESENT", "MISSING", "DAMAGED", "NOT_INSTALLED"] as const;
export type LandMarkerConditionCode = (typeof LAND_MARKER_CONDITIONS)[number];
export const LAND_MARKER_CONDITION_LABELS: Record<LandMarkerConditionCode, string> = {
  PRESENT: "Ada",
  MISSING: "Hilang",
  DAMAGED: "Rusak",
  NOT_INSTALLED: "Belum dipasang",
};

export const LAND_MARKER_TYPES = ["CONCRETE", "WOOD", "PIPE", "NATURAL", "OTHER"] as const;
export type LandMarkerTypeCode = (typeof LAND_MARKER_TYPES)[number];
export const LAND_MARKER_TYPE_LABELS: Record<LandMarkerTypeCode, string> = {
  CONCRETE: "Beton",
  WOOD: "Kayu",
  PIPE: "Pipa",
  NATURAL: "Tanda alam",
  OTHER: "Lainnya",
};

export const LAND_MARKER_SOURCES = ["POLYGON_VERTEX", "GPS", "MANUAL"] as const;
export type LandMarkerSourceCode = (typeof LAND_MARKER_SOURCES)[number];
export const LAND_MARKER_SOURCE_LABELS: Record<LandMarkerSourceCode, string> = {
  POLYGON_VERTEX: "Vertex poligon",
  GPS: "GPS lapangan",
  MANUAL: "Manual",
};

export const labelOf = <K extends string>(map: Record<K, string>, code: string | null | undefined): string =>
  code ? (map[code as K] ?? code) : "—";

export interface LonLat {
  lon: number;
  lat: number;
}

/** Jarak haversine (m) — implementasi bersama `lib/geo.ts` (sama dengan penggaris Peta Lahan). */
export function distanceMeters(a: LonLat, b: LonLat): number {
  return haversineMeters([a.lon, a.lat], [b.lon, b.lat]);
}

/**
 * Urutkan vertex SATU RING searah jarum jam mulai dari yang paling utara
 * (lintang terbesar; seri → bujur terkecil). Masukan = ring dalam URUTAN
 * BATAS seperti dikembalikan PostGIS (tanpa titik penutup); fungsi ini hanya
 * membalik arah bila ring berlawanan jarum jam (luas bertanda > 0) dan
 * memutar titik awal — TIDAK mengurutkan ulang menurut sudut dari titik
 * tengah: cara itu hanya benar untuk poligon cembung, sedangkan pada lahan
 * berbentuk L/U nomor patok melompat menyeberangi cekungan (temuan review
 * 2026-09-14). Deterministik — nomor sama di layar, PDF, dan ekspor.
 */
export function orderClockwiseFromNorth(ring: LonLat[]): LonLat[] {
  if (ring.length < 3) return [...ring];
  // Luas bertanda (shoelace) pada bidang lon/lat: > 0 = berlawanan jarum jam.
  let area2 = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    area2 += a.lon * b.lat - b.lon * a.lat;
  }
  const cw = area2 > 0 ? [...ring].reverse() : [...ring];
  let start = 0;
  for (let i = 1; i < cw.length; i++) {
    if (cw[i].lat > cw[start].lat || (cw[i].lat === cw[start].lat && cw[i].lon < cw[start].lon)) start = i;
  }
  return [...cw.slice(start), ...cw.slice(0, start)];
}

/** Patok yang sudah ada di sekitar vertex (hasil kueri). */
export interface NearbyMarker {
  id: string;
  lon: number;
  lat: number;
  /** ID Lahan yang sudah memakai patok ini (aktif). */
  parcelIds: string[];
  /** Sudah tertaut ke lahan yang sedang diproses. */
  linkedToThisParcel: boolean;
  /** false = semua tautannya pernah dilepas; disnap → dihidupkan lagi (idempoten). Bawaan true. */
  isActive?: boolean;
}

export interface MarkerCandidate {
  sequenceNo: number;
  lon: number;
  lat: number;
  /** Patok yang sudah ada ≤ MARKER_SNAP_M — akan DITAUTKAN, bukan dibuat. */
  existingMarkerId: string | null;
  /** ID Lahan lain yang memakai patok itu — konteks "patok bersama". */
  existingParcelIds: string[];
  /** Vertex sudah punya tautan aktif ke lahan ini → dilewati (idempoten). */
  alreadyLinked: boolean;
  /** Jarak vertex ke patok yang ada (m), null bila baru. */
  snapDistanceM: number | null;
}

/**
 * Rencanakan patok dari ring-ring vertex (sudah disederhanakan, urutan batas
 * PostGIS) dan patok yang ada di sekitarnya. Murni & idempoten: dijalankan ulang → vertex
 * yang sudah tertaut dilewati, tidak pernah menggeser/menghapus patok lama.
 * Satu patok yang ada hanya dipakai oleh satu vertex (yang terdekat) — pasangan
 * vertex×patok diurutkan menurut jarak SECARA GLOBAL lalu diambil serakah, bukan
 * per vertex menurut nomor: dengan urutan nomor, V1 (lebih utara) yang 4,5 m dari
 * patok M akan merebutnya walau V2 hanya 1 m, lalu V2 melahirkan patok kembar
 * 1 m dari M (temuan review 2026-09-15).
 */
export function planMarkersFromVertices(rings: LonLat[][], nearby: NearbyMarker[], snapM = MARKER_SNAP_M): MarkerCandidate[] {
  // Multipoligon: tiap bagian dinomori berurutan (bagian 1 dulu, lalu bagian 2), masing-masing searah jarum jam dari utara.
  const ordered = rings.flatMap((ring) => orderClockwiseFromNorth(ring));
  const pairs: { vi: number; m: NearbyMarker; d: number }[] = [];
  ordered.forEach((v, vi) => {
    for (const m of nearby) {
      const d = distanceMeters(v, m);
      if (d <= snapM) pairs.push({ vi, m, d });
    }
  });
  // Terdekat menang; seri (< 1 cm) → yang aktif lebih dulu daripada yang nonaktif.
  pairs.sort((a, b) => (Math.abs(a.d - b.d) <= 0.01 ? Number(b.m.isActive ?? true) - Number(a.m.isActive ?? true) : a.d - b.d));
  const byVertex = new Map<number, { m: NearbyMarker; d: number }>();
  const used = new Set<string>();
  for (const p of pairs) {
    if (byVertex.has(p.vi) || used.has(p.m.id)) continue;
    byVertex.set(p.vi, p);
    used.add(p.m.id);
  }
  return ordered.map((v, i) => {
    const best = byVertex.get(i) ?? null;
    return {
      sequenceNo: i + 1,
      lon: v.lon,
      lat: v.lat,
      existingMarkerId: best?.m.id ?? null,
      existingParcelIds: best?.m.parcelIds ?? [],
      alreadyLinked: best?.m.linkedToThisParcel ?? false,
      snapDistanceM: best ? Math.round(best.d * 10) / 10 : null,
    };
  });
}

/**
 * Deteksi lat/long tertukar: bila titik jauh dari lahan tetapi versi tertukarnya
 * dekat, itu hampir pasti kesalahan kolom di GPS/Excel. Mengembalikan pesan
 * error yang menyebut perbaikannya, atau null bila titik sah.
 *
 * Jarak tak-hingga = lahan tidak punya `geom` yang valid (GeoJSON cacat →
 * kolom generated NULL, lihat migrasi 20260914100000) padahal `geometry` JSON
 * terisi; guard tidak bisa dijalankan → dilewati, sama seperti lahan tanpa
 * poligon (review 2026-09-15: sebelumnya menolak dengan "Infinity m").
 */
export function checkMarkerNearParcel(
  point: LonLat,
  distanceToBoundaryM: (p: LonLat) => number,
  maxM = MARKER_MAX_DISTANCE_M,
): string | null {
  const d = distanceToBoundaryM(point);
  if (!Number.isFinite(d) || d <= maxM) return null;
  const swapped = { lon: point.lat, lat: point.lon };
  const ds = distanceToBoundaryM(swapped);
  if (ds <= maxM) return `Koordinat ${Math.round(d)} m dari batas lahan — lat/long tampaknya tertukar (bila ditukar: ${Math.round(ds)} m)`;
  return `Koordinat ${Math.round(d)} m dari batas lahan (maks ${maxM} m) — periksa desimal/kolom`;
}

// ─── Kode patok `<SINGKATAN>-PTK-000123` (keputusan owner 2026-09-14) ───

export const MARKER_CODE_INFIX = "PTK";
export const MARKER_CODE_DIGITS = 6;
/** Bentuk kode yang diterima unggahan: awalan huruf/angka, PTK, ≥ 1 digit. */
export const MARKER_CODE_RE = /^[A-Z0-9]{1,20}-PTK-\d{1,9}$/;

/** Awalan kode dari singkatan Lembaga (fallback kode Lembaga; 'MIS' bila keduanya kosong): huruf besar tanpa spasi/tanda baca. */
export function markerCodePrefix(abrv: string | null | undefined, groupCode: string | null | undefined): string {
  const raw = (abrv && abrv.trim()) || (groupCode && groupCode.trim()) || "MIS";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "") || "MIS";
}

export function formatMarkerCode(prefix: string, n: number): string {
  return `${prefix}-${MARKER_CODE_INFIX}-${String(n).padStart(MARKER_CODE_DIGITS, "0")}`;
}

/** Normalisasi kode dari sel/formulir: trim, huruf besar, spasi di sekitar tanda hubung dibuang; null bila kosong/tak valid. */
export function normalizeMarkerCode(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toUpperCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, "");
  if (!s) return null;
  return MARKER_CODE_RE.test(s) ? s : null;
}

/** Format koordinat 6 desimal (≈ 0,1 m) — cukup untuk berkas STDB/SKT. */
export const fmtCoord = (n: number) => n.toFixed(6);

/** Baris ekspor patok per tautan lahan (bentuk `LandMarkerExportRow` di action) — dikelompokkan per patok fisik. */
export interface MarkerLinkRow {
  markerId: string;
  /** Kode patok fisik `HJP-PTK-000123`. */
  code: string;
  parcelId: string;
  farmerCode: string;
  farmerName: string;
  groupName: string;
  subGroupLv2: string | null;
  blok: string | null;
  sequenceNo: number;
  latitude: number;
  longitude: number;
  condition: string;
  type: string | null;
  installedAt: string | null;
  installedBy: string | null;
  source: string;
  notes: string | null;
}

export interface UniqueMarkerRow {
  markerId: string;
  code: string;
  /** KT & Blok terkecil (alfabet) di antara lahan pemakai — basis urutan; kosong di akhir. */
  subGroupLv2: string | null;
  blok: string | null;
  /** "Nama Petani · ID Petani · ID Lahan #n" per baris (dipisah "\n" bila lebih dari satu) — semua lahan pemakai, urut ID Lahan. */
  lahan: string;
  farmerNames: string;
  groupName: string;
  parcelCount: number;
  latitude: number;
  longitude: number;
  condition: string;
  type: string | null;
  installedAt: string | null;
  installedBy: string | null;
  source: string;
  notes: string | null;
}

/**
 * Satu baris per patok FISIK (keputusan owner 2026-09-14 untuk unduhan Peta
 * Lahan): lahan pemakai digabung satu kolom "ID Petani · ID Lahan #no" dipisah
 * koma, diurutkan Kelompok Tani lalu Blok (kosong di akhir), lalu ID Lahan
 * pertama. Semua patok = patok lahan (#345) — tidak ada lagi saringan/tanda
 * "NKT turunan" dari status lahan pemakai.
 */
export function uniqueMarkerRows(rows: MarkerLinkRow[]): UniqueMarkerRow[] {
  const byId = new Map<string, MarkerLinkRow[]>();
  for (const r of rows) byId.set(r.markerId, [...(byId.get(r.markerId) ?? []), r]);
  const minStr = (vals: (string | null)[]) => {
    const v = vals.filter((x): x is string => !!x && x.trim() !== "").sort((a, b) => a.localeCompare(b, "id"));
    return v[0] ?? null;
  };
  const out: UniqueMarkerRow[] = [...byId.values()].map((g) => {
    const shown = [...g].sort((a, b) => a.parcelId.localeCompare(b.parcelId));
    const first = shown[0];
    return {
      markerId: first.markerId,
      code: first.code,
      subGroupLv2: minStr(shown.map((x) => x.subGroupLv2)),
      blok: minStr(shown.map((x) => x.blok)),
      // Beberapa lahan → satu per baris (owner 2026-09-14), bukan dipisah koma.
      lahan: shown.map((x) => `${x.farmerName} · ${x.farmerCode} · ${x.parcelId} #${x.sequenceNo}`).join("\n"),
      farmerNames: [...new Set(shown.map((x) => x.farmerName))].join(", "),
      groupName: [...new Set(shown.map((x) => x.groupName))].join(", "),
      parcelCount: g.length,
      latitude: first.latitude,
      longitude: first.longitude,
      condition: first.condition,
      type: first.type,
      installedAt: first.installedAt,
      installedBy: first.installedBy,
      source: first.source,
      notes: first.notes,
    };
  });
  const cmp = (a: string | null, b: string | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a.localeCompare(b, "id", { numeric: true }));
  return out.sort((a, b) => cmp(a.subGroupLv2, b.subGroupLv2) || cmp(a.blok, b.blok) || a.code.localeCompare(b.code, "id", { numeric: true }));
}

export interface ParcelMarkerGroup {
  parcelId: string;
  farmerCode: string;
  farmerName: string;
  subGroupLv2: string | null;
  blok: string | null;
  /** Patok lahan ini, urut nomor per lahan; `mapNo` = nomor patok di peta/daftar unik (1-based). */
  markers: { mapNo: number; code: string; sequenceNo: number; condition: string }[];
}

/**
 * Tabel PDF patok dikelompokkan PER LAHAN (owner 2026-09-14: baris per patok
 * mengulang nama/ID petani berkali-kali). `unique` = hasil `uniqueMarkerRows`
 * (urutan = nomor di peta).
 */
export function groupMarkersByParcel(rows: MarkerLinkRow[], unique: UniqueMarkerRow[]): ParcelMarkerGroup[] {
  const mapNo = new Map(unique.map((u, i) => [u.markerId, i + 1]));
  const byParcel = new Map<string, ParcelMarkerGroup>();
  for (const r of rows) {
    const no = mapNo.get(r.markerId);
    if (!no) continue;
    let g = byParcel.get(r.parcelId);
    if (!g) {
      g = { parcelId: r.parcelId, farmerCode: r.farmerCode, farmerName: r.farmerName, subGroupLv2: r.subGroupLv2, blok: r.blok, markers: [] };
      byParcel.set(r.parcelId, g);
    }
    g.markers.push({ mapNo: no, code: r.code, sequenceNo: r.sequenceNo, condition: r.condition });
  }
  const cmp = (a: string | null, b: string | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a.localeCompare(b, "id", { numeric: true }));
  const out = [...byParcel.values()];
  for (const g of out) g.markers.sort((a, b) => a.sequenceNo - b.sequenceNo);
  return out.sort((a, b) => cmp(a.subGroupLv2, b.subGroupLv2) || cmp(a.blok, b.blok) || a.parcelId.localeCompare(b.parcelId));
}

// ─── Unduhan Excel patok (satu baris per patok fisik) ───

/** Kolom Excel unduhan patok — SATU definisi untuk Peta Lahan, Report › Patok, dan Detail Lembaga (review 2026-09-15). */
export const MARKER_XLSX_COLUMNS = [
  { header: "Kode Patok", key: "code", width: 18 },
  { header: "Kelompok Tani", key: "subGroupLv2", width: 20 },
  { header: "Blok", key: "blok", width: 10 },
  { header: "Lahan (Nama Petani · ID Petani · ID Lahan #no)", key: "lahan", width: 60, wrap: true },
  { header: "Lembaga Petani", key: "groupName", width: 26 },
  { header: "Jumlah Lahan", key: "parcelCount", width: 10 },
  { header: "Lintang", key: "latitude", width: 14 },
  { header: "Bujur", key: "longitude", width: 14 },
  { header: "Kondisi", key: "condition", width: 16 },
  // "Bahan" (owner 2026-09-20, #345): nilainya beton/kayu/pipa/tanda alam — bukan "jenis" patok.
  { header: "Bahan", key: "type", width: 12 },
  { header: "Tanggal Pemasangan", key: "installedAt", width: 14 },
  { header: "Dipasang oleh", key: "installedBy", width: 20 },
  { header: "Sumber koordinat", key: "source", width: 16 },
  { header: "Keterangan", key: "notes", width: 30 },
];

/** Baris unik patok → nilai siap tampil (label Indonesia, koordinat 6 desimal). */
export function formatUniqueMarkerRow(r: UniqueMarkerRow) {
  return {
    ...r,
    subGroupLv2: r.subGroupLv2 ?? "",
    blok: r.blok ?? "",
    latitude: Number(fmtCoord(r.latitude)),
    longitude: Number(fmtCoord(r.longitude)),
    condition: labelOf(LAND_MARKER_CONDITION_LABELS, r.condition),
    type: labelOf(LAND_MARKER_TYPE_LABELS, r.type),
    installedAt: r.installedAt ?? "",
    installedBy: r.installedBy ?? "",
    source: labelOf(LAND_MARKER_SOURCE_LABELS, r.source),
    notes: r.notes ?? "",
  };
}
