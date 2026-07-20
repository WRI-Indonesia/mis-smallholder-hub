import type { Position } from "geojson";
import type {
  LandParcelReportResult,
  LandParcelReportRow,
} from "@/types/report";

/** Satu baris lahan mentah (sudah ter-scope) untuk Report Lahan. */
export interface LpRawParcel {
  /** LandParcel.id (DB). */
  id: string;
  /** LandParcel.parcelId (= ID Lahan). */
  parcelCode: string;
  /** Farmer.id — untuk hitung distinct petani. */
  farmerId: string;
  /** Farmer.farmerId (= ID Petani). */
  farmerCode: string;
  /** Farmer.name. */
  farmerName: string;
  farmerGroupId: string;
  /** FarmerGroup.name (= Lembaga Petani). */
  lembagaTani: string;
  /** Gapoktan/KUD (Sub Lv.1). */
  subGroupLv1: string | null;
  /** Kelompok Tani (Sub Lv.2). */
  subGroupLv2: string | null;
  /** Blok kebun. */
  blok: string | null;
  /** Komoditas. */
  cropType: string | null;
  /** Species komoditas. */
  species: string | null;
  /** PSR (replanting). */
  isPsr: boolean;
  /** Tahun tanam. */
  plantingYear: number | null;
  /** Luas lahan (Ha), null bila tak diketahui. */
  area: number | null;
}

/** Trim; string kosong/whitespace → null. */
function clean(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

/**
 * Report Lahan (real-time, #177): roster datar **1 baris = 1 lahan aktif**
 * dengan Lembaga/Petani/ID Petani/ID Lahan/KT. KT & Gapoktan = atribut
 * per-lahan (`LandParcel.subGroupLv*`, keputusan #146/#152 — petani tidak
 * punya field KT sendiri); nilai dinormalisasi trim (kosong → null) dan
 * distinct KT dihitung ternormalisasi case-insensitive per Lembaga (pola #154).
 * Urutan: Lembaga → KT (null di akhir) → Nama Petani → ID Lahan.
 * Sifat interim (TD-014): saat KT jadi tabel, sumber pindah ke relasi.
 */
export function buildLandParcelReport(
  parcels: LpRawParcel[],
): LandParcelReportResult {
  const distinctPetani = new Set<string>();
  const distinctLembaga = new Set<string>();
  const distinctKt = new Set<string>();
  let totalLuas = 0;

  const rows: LandParcelReportRow[] = parcels.map((p) => {
    const g1 = clean(p.subGroupLv1);
    const g2 = clean(p.subGroupLv2);

    distinctPetani.add(p.farmerId);
    distinctLembaga.add(p.farmerGroupId);
    if (g2) distinctKt.add(`${p.farmerGroupId}||${g2.toLowerCase()}`);
    totalLuas += p.area ?? 0;

    return {
      id: p.id,
      farmerGroupId: p.farmerGroupId,
      lembagaTani: p.lembagaTani,
      namaPetani: p.farmerName,
      idPetani: p.farmerCode,
      idLahan: p.parcelCode,
      kelompokTani: g2,
      gapoktan: g1,
      blok: clean(p.blok),
      komoditas: clean(p.cropType),
      species: clean(p.species),
      psr: p.isPsr,
      tahunTanam: p.plantingYear,
      luas: p.area,
    };
  });

  rows.sort(
    (a, b) =>
      a.lembagaTani.localeCompare(b.lembagaTani) ||
      (a.kelompokTani ?? "￿").localeCompare(b.kelompokTani ?? "￿") ||
      a.namaPetani.localeCompare(b.namaPetani) ||
      a.idLahan.localeCompare(b.idLahan),
  );

  return {
    summary: {
      totalLahan: rows.length,
      totalPetani: distinctPetani.size,
      totalKelompokTani: distinctKt.size,
      totalLembagaTani: distinctLembaga.size,
      totalLuas,
    },
    rows,
  };
}

// ─── Layout peta cetak (#179) — poligon ber-nomor dalam bounds bersama ───

/** GeoJSON minimal `LandParcel.geometry` (kolom Json). */
export interface LpGeoJson {
  type?: string;
  coordinates?: unknown;
}

function isPosition(p: unknown): p is Position {
  return (
    Array.isArray(p) &&
    p.length >= 2 &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1])
  );
}

function cleanRing(ring: unknown): Position[] | null {
  if (!Array.isArray(ring)) return null;
  const pts = ring.filter(isPosition) as Position[];
  if (pts.length < 3) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  // Buang titik penutup duplikat (pola farm-passport).
  return last[0] === first[0] && last[1] === first[1] ? pts.slice(0, -1) : pts;
}

/**
 * Exterior ring tiap poligon: Polygon → 1 ring, MultiPolygon → n ring
 * (interior ring/lubang diabaikan — cukup untuk peta cetak skala Lembaga).
 * Ring invalid (< 3 titik / koordinat non-angka) dibuang; hasil [] = tak tergambar.
 */
export function exteriorRings(geometry: LpGeoJson | null | undefined): Position[][] {
  if (!geometry || !Array.isArray(geometry.coordinates)) return [];
  const coords = geometry.coordinates as unknown[];
  const rawRings =
    geometry.type === "Polygon" ? [coords[0]] :
    geometry.type === "MultiPolygon" ? coords.map((poly) => (Array.isArray(poly) ? poly[0] : null)) :
    [];
  return rawRings
    .map(cleanRing)
    .filter((r): r is Position[] => r !== null);
}

/** Luas ring (shoelace, satuan derajat²) — untuk memilih ring label MultiPolygon. */
function ringArea(ring: Position[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
}

/** Kotak gambar (mm) untuk layout peta. */
export interface LpMapBox {
  x: number;
  y: number;
  w: number;
  h: number;
  pad: number;
}

export interface LpMapPolygon {
  /** Nomor baris tabel (kolom No). */
  no: number;
  /** Ring ter-proyeksi ke mm ([x, y] per titik, utara di atas). */
  rings: [number, number][][];
  /** Posisi label nomor (centroid ring terbesar). */
  labelX: number;
  labelY: number;
}

export interface LpMapLayout {
  polygons: LpMapPolygon[];
  /** Nomor baris yang lahannya tak punya geometri valid (tetap ada di tabel). */
  skippedNos: number[];
  /** Frame proyeksi (untuk menggambar garis grid index di atas layout). */
  frame?: {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
    offX: number;
    offY: number;
    /** mm per derajat. */
    scale: number;
  };
}

/**
 * Proyeksikan seluruh lahan ke satu bounds lon/lat bersama, aspect-preserving,
 * center di dalam box (utara di atas) — generalisasi `drawPolygon` farm-passport
 * untuk banyak poligon. Label nomor di centroid ring terbesar tiap lahan.
 */
export function buildLandParcelMapLayout(
  parcels: { no: number; geometry: LpGeoJson | null }[],
  box: LpMapBox,
): LpMapLayout {
  const withRings = parcels.map((p) => ({ no: p.no, rings: exteriorRings(p.geometry) }));
  const skippedNos = withRings.filter((p) => p.rings.length === 0).map((p) => p.no);
  const drawable = withRings.filter((p) => p.rings.length > 0);
  if (drawable.length === 0) return { polygons: [], skippedNos };

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const p of drawable) {
    for (const ring of p.rings) {
      for (const [lon, lat] of ring) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }
  const spanLon = maxLon - minLon || 1e-6;
  const spanLat = maxLat - minLat || 1e-6;
  const availW = box.w - box.pad * 2;
  const availH = box.h - box.pad * 2;
  const s = Math.min(availW / spanLon, availH / spanLat);
  const offX = box.x + box.pad + (availW - spanLon * s) / 2;
  const offY = box.y + box.pad + (availH - spanLat * s) / 2;
  const project = ([lon, lat]: Position): [number, number] => [
    offX + (lon - minLon) * s,
    offY + (maxLat - lat) * s,
  ];

  const polygons: LpMapPolygon[] = drawable.map((p) => {
    const rings = p.rings.map((ring) => ring.map(project));
    const largest = p.rings.reduce((best, r) => (ringArea(r) > ringArea(best) ? r : best), p.rings[0]);
    const pts = largest.map(project);
    const labelX = pts.reduce((a, q) => a + q[0], 0) / pts.length;
    const labelY = pts.reduce((a, q) => a + q[1], 0) / pts.length;
    return { no: p.no, rings, labelX, labelY };
  });

  return {
    polygons,
    skippedNos,
    frame: { minLon, minLat, maxLon, maxLat, offX, offY, scale: s },
  };
}

// ─── Grid index (#179): pecah peta jadi beberapa halaman (atlas) ───

export interface LpGridParcel {
  no: number;
  geometry: LpGeoJson | null;
}

export interface LpGridCell {
  /** Label sel grid, mis. "A1" (baris huruf dari utara, kolom angka dari barat). */
  label: string;
  /** Indeks baris dari atas (utara) & kolom dari kiri (barat), 0-based. */
  row: number;
  col: number;
  parcels: LpGridParcel[];
}

export interface LpGridSplit {
  /** Dimensi grid (dim × dim). */
  dim: number;
  /** Hanya sel yang berisi lahan, urut baris lalu kolom. */
  cells: LpGridCell[];
  skippedNos: number[];
}

/** Centroid lon/lat ring terbesar sebuah lahan (basis penempatan sel grid). */
function parcelCentroid(rings: Position[][]): Position {
  const largest = rings.reduce((best, r) => (ringArea(r) > ringArea(best) ? r : best), rings[0]);
  return [
    largest.reduce((a, p) => a + p[0], 0) / largest.length,
    largest.reduce((a, p) => a + p[1], 0) / largest.length,
  ];
}

/**
 * Bagi lahan ke grid dim×dim di atas bounds bersama — tiap lahan masuk tepat
 * satu sel berdasarkan **centroid**-nya (lahan tak pernah terpotong: halaman
 * per sel me-refit bounds ke lahan anggotanya). Sel kosong tidak ikut.
 * `pieces` dibulatkan ke dim persegi terdekat (1/4/9/16 → 1/2/3/4).
 */
export function splitParcelsIntoGrid(
  parcels: LpGridParcel[],
  pieces: number,
): LpGridSplit {
  const dim = Math.max(1, Math.round(Math.sqrt(pieces)));
  const withRings = parcels.map((p) => ({ ...p, rings: exteriorRings(p.geometry) }));
  const skippedNos = withRings.filter((p) => p.rings.length === 0).map((p) => p.no);
  const drawable = withRings.filter((p) => p.rings.length > 0);
  if (drawable.length === 0) return { dim, cells: [], skippedNos };

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const p of drawable) {
    for (const ring of p.rings) {
      for (const [lon, lat] of ring) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }
  const spanLon = maxLon - minLon || 1e-6;
  const spanLat = maxLat - minLat || 1e-6;

  const cellMap = new Map<string, LpGridCell>();
  for (const p of drawable) {
    const [cLon, cLat] = parcelCentroid(p.rings);
    const col = Math.min(dim - 1, Math.max(0, Math.floor(((cLon - minLon) / spanLon) * dim)));
    const row = Math.min(dim - 1, Math.max(0, Math.floor(((maxLat - cLat) / spanLat) * dim)));
    const key = `${row}-${col}`;
    let cell = cellMap.get(key);
    if (!cell) {
      cell = { label: `${String.fromCharCode(65 + row)}${col + 1}`, row, col, parcels: [] };
      cellMap.set(key, cell);
    }
    cell.parcels.push({ no: p.no, geometry: p.geometry });
  }

  const cells = Array.from(cellMap.values()).sort((a, b) => a.row - b.row || a.col - b.col);
  return { dim, cells, skippedNos };
}
