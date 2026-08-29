import type { Position } from "geojson";
import type {
  LandParcelLegalFilters,
  LandParcelReportResult,
  LandParcelReportRow,
  LandParcelReportSummary,
} from "@/types/report";
import {
  summarizeDocuments,
  summarizeHolderNames,
  sumStatedArea,
  summarizeStdb,
  summarizeExternalIds,
  summarizePrograms,
  isBigAreaDiff,
  documentTypeShort,
  landStdbStageLabel,
  AREA_DIFF_THRESHOLD_HA,
  type DocSummaryInput,
  type StdbSummaryInput,
  type ExternalIdSummaryInput,
  type ProgramSummaryInput,
} from "@/lib/land-parcel-satellite-format";

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
  /** Dokumen kepemilikan aktif (#296) — opsional agar pemanggil lama tetap valid. */
  documents?: DocSummaryInput[];
  /**
   * STDB aktif yang menutup lahan ini (#296). Sejak #306 membawa `stage`, bukan
   * nomor telanjang: baris pra-terbit tak punya nomor dan harus tetap terbaca.
   */
  stdbs?: StdbSummaryInput[];
  /** UL Parcel Code aktif (#305) — juga penanda "sudah didata". */
  externalIds?: ExternalIdSummaryInput[];
  /** Program lahan aktif (#305). */
  programs?: ProgramSummaryInput[];
}

/** Trim; string kosong/whitespace → null. */
function clean(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

/**
 * Report Lahan (real-time, #177): roster datar **1 baris = 1 lahan aktif**
 * dengan Lembaga/Petani/ID Petani/ID Lahan/KT. KT = atribut
 * per-lahan (`LandParcel.subGroupLv*`, keputusan #146/#152 — petani tidak
 * punya field KT sendiri); nilai dinormalisasi trim (kosong → null) dan
 * distinct KT dihitung ternormalisasi case-insensitive per Lembaga (pola #154).
 * Urutan: Lembaga → KT (null di akhir) → Nama Petani → ID Lahan.
 * Sifat interim (TD-014): saat KT jadi tabel, sumber pindah ke relasi.
 */
export function buildLandParcelReport(
  parcels: LpRawParcel[],
  filters: LandParcelLegalFilters = {},
): LandParcelReportResult {
  const distinctPetani = new Set<string>();
  const distinctLembaga = new Set<string>();
  const distinctKt = new Set<string>();
  let totalLuas = 0;
  let totalDidata = 0;
  let totalAdaSurat = 0;
  let totalAdaStdb = 0;
  let totalSelisihLuas = 0;

  const rows: LandParcelReportRow[] = parcels.flatMap((p) => {
    const docs = p.documents ?? [];
    const luasTertera = sumStatedArea(docs);
    const selisihLuasBesar = isBigAreaDiff(luasTertera, p.area);
    // Filter selisih luas dikerjakan DI SINI, bukan di klien: angkanya turunan
    // (Σ luas tertera vs poligon) sehingga tak bisa jadi `where` Prisma, tapi
    // tetap harus memengaruhi jumlah baris, baris Total, dan kartu ringkasan
    // dalam satu perhitungan (#305).
    if (filters.areaDiff === "gte" && !selisihLuasBesar) return [];

    const g2 = clean(p.subGroupLv2);
    const externalIds = p.externalIds ?? [];

    distinctPetani.add(p.farmerId);
    distinctLembaga.add(p.farmerGroupId);
    if (g2) distinctKt.add(`${p.farmerGroupId}||${g2.toLowerCase()}`);
    totalLuas += p.area ?? 0;
    if (externalIds.length > 0) totalDidata++;
    if (docs.length > 0) totalAdaSurat++;
    if ((p.stdbs ?? []).length > 0) totalAdaStdb++;
    if (selisihLuasBesar) totalSelisihLuas++;

    return {
      id: p.id,
      farmerGroupId: p.farmerGroupId,
      lembagaTani: p.lembagaTani,
      namaPetani: p.farmerName,
      idPetani: p.farmerCode,
      idLahan: p.parcelCode,
      kelompokTani: g2,
      blok: clean(p.blok),
      komoditas: clean(p.cropType),
      species: clean(p.species),
      psr: p.isPsr,
      tahunTanam: p.plantingYear,
      luas: p.area,
      surat: summarizeDocuments(docs),
      namaDiSurat: summarizeHolderNames(docs),
      luasTertera,
      stdb: summarizeStdb(p.stdbs ?? []),
      ulParcelCode: summarizeExternalIds(externalIds),
      program: summarizePrograms(p.programs ?? []),
      selisihLuasBesar,
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
      totalDidata,
      totalAdaSurat,
      totalAdaStdb,
      totalSelisihLuas,
    },
    rows,
  };
}

/**
 * Filter legalitas aktif → pasangan label/nilai untuk header PDF & Excel (#305).
 *
 * Tanpa ini, ekspor "tanpa surat" terbaca persis seperti roster lengkap — dan
 * itu jenis kekeliruan yang baru ketahuan setelah berkasnya beredar. Cakupan
 * pendataan SELALU ikut tercetak, bahkan saat "Semua lahan", karena ia penyebut
 * semua persentase di laporan.
 */
export function describeLegalFilters(filters: LandParcelLegalFilters): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [
    {
      label: "Cakupan Pendataan",
      value:
        filters.coverage === "all"
          ? "Semua lahan (termasuk yang belum melalui import Detail Lahan)"
          : "Hanya lahan yang sudah didata (punya UL Parcel Code)",
    },
  ];
  if (filters.documentStatus === "with") out.push({ label: "Status Surat", value: "Ada surat" });
  if (filters.documentStatus === "without") out.push({ label: "Status Surat", value: "Tanpa surat (tak ada surat tercatat sama sekali)" });
  if (filters.documentTypes?.length) {
    out.push({
      label: "Jenis Surat",
      value: `${filters.documentTypes.map(documentTypeShort).join(", ")} (punya minimal satu)`,
    });
  }
  if (filters.stdbStatus === "with") out.push({ label: "Status STDB", value: "Ada STDB" });
  else if (filters.stdbStatus === "without") out.push({ label: "Status STDB", value: "Tanpa STDB" });
  else if (filters.stdbStatus && filters.stdbStatus !== "all") {
    out.push({ label: "Status STDB", value: `Tahap ${landStdbStageLabel(filters.stdbStatus)}` });
  }
  if (filters.areaDiff === "gte") {
    out.push({ label: "Selisih Luas", value: `≥ ${formatHa(AREA_DIFF_THRESHOLD_HA)} Ha (luas surat vs poligon)` });
  }
  return out;
}

/**
 * Ringkasan legalitas → label/nilai/catatan (#305). SATU sumber untuk kartu di
 * layar, header PDF, dan catatan Excel — kalau tiga tempat menghitungnya
 * sendiri-sendiri, cetakan dan layar akan bercerita beda tanpa ada yang tahu.
 *
 * Persen SELALU membawa penyebutnya: penyebutnya bukan seluruh lahan lembaga,
 * melainkan lahan yang sudah melalui import Detail Lahan.
 */
export function describeLegalSummary(
  summary: LandParcelReportSummary,
): { label: string; value: string; note: string }[] {
  const base = summary.totalDidata;
  const pct = (n: number) => (base > 0 ? `${Math.round((n / base) * 100)}%` : "—");
  const denom = `dari ${formatCount(base)} lahan yang sudah didata`;
  return [
    {
      label: "Lahan (hasil filter)",
      value: formatCount(summary.totalLahan),
      note: `${formatCount(base)} di antaranya sudah didata`,
    },
    { label: "Ada Surat", value: formatCount(summary.totalAdaSurat), note: `${pct(summary.totalAdaSurat)} ${denom}` },
    {
      label: "Ada STDB",
      value: formatCount(summary.totalAdaStdb),
      // STDB melekat per PETANI (1 nomor s.d. 13 persil); menghitungnya per
      // persil melebih-lebihkan beban kerja, jadi satuannya ditulis eksplisit.
      note: `${pct(summary.totalAdaStdb)} ${denom} — dihitung per persil, bukan per petani`,
    },
    {
      label: `Selisih Luas ≥ ${formatHa(AREA_DIFF_THRESHOLD_HA)} Ha`,
      value: formatCount(summary.totalSelisihLuas),
      note: "luas di surat vs luas poligon",
    },
  ];
}

/** Pemisah ribuan gaya Indonesia — modul ini murni, jadi tak memakai helper DOM. */
function formatCount(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

/**
 * Luas gaya Indonesia (2 desimal, koma). Dipakai agar ambang yang sama tertulis
 * sama di layar dan di cetakan — sebelumnya filter di layar menulis "0,50 Ha"
 * sementara kartu & PDF menulis "0.5 Ha" untuk angka yang sama persis.
 */
function formatHa(n: number): string {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
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
  /** Bbox ter-proyeksi ring terbesar (mm) — ruang yang tersedia untuk label. */
  bboxW: number;
  bboxH: number;
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
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    return {
      no: p.no,
      rings,
      labelX,
      labelY,
      bboxW: Math.max(...xs) - Math.min(...xs),
      bboxH: Math.max(...ys) - Math.min(...ys),
    };
  });

  return {
    polygons,
    skippedNos,
    frame: { minLon, minLat, maxLon, maxLat, offX, offY, scale: s },
  };
}

// ─── Label adaptif (#179): muat di poligon, boleh vertikal ───

export interface LpLabelFit {
  /** Label diputar 90° (dibaca dari bawah ke atas). */
  vertical: boolean;
  /** Faktor skala font/blok label (≤ 1, dibatasi `minScale`). */
  scale: number;
}

/**
 * Pilih orientasi & skala blok label (labelW×labelH) agar muat di bbox poligon:
 * horizontal dulu; bila tak muat dan posisi vertikal lebih lega → putar 90°;
 * bila keduanya sempit, skala turun mengikuti orientasi terbaik dengan lantai
 * `minScale` (keterbacaan > muat sempurna). Keputusan murni angka — dipakai
 * renderer jsPDF & SVG preview agar identik.
 */
export function fitLabelToBox(
  labelW: number,
  labelH: number,
  boxW: number,
  boxH: number,
  minScale = 0.55,
): LpLabelFit {
  const scaleH = Math.min(boxW / labelW, boxH / labelH);
  const scaleV = Math.min(boxH / labelW, boxW / labelH);
  if (scaleH >= 1) return { vertical: false, scale: 1 };
  if (scaleV >= 1) return { vertical: true, scale: 1 };
  const vertical = scaleV > scaleH;
  const best = vertical ? scaleV : scaleH;
  return { vertical, scale: Math.max(minScale, best) };
}

/**
 * Anchor baseline tiap baris label **vertikal** (teks diputar 90° CCW, dibaca
 * bawah→atas) untuk jsPDF. jsPDF mengabaikan `align`/`baseline` secara benar
 * saat ber-`angle` (offset dihitung pra-rotasi) → posisi harus manual:
 * baris ditumpuk sepanjang sumbu-x blok (kolom per baris, baseline ±75% kolom
 * karena ascent glyph menghadap kiri), teks di-center vertikal di `cy`.
 */
export function verticalLabelAnchors(
  cx: number,
  cy: number,
  lineH: number,
  lineCount: number,
  pad: number,
  textWidths: number[],
): { x: number; y: number }[] {
  const blockH = lineCount * lineH + pad * 2;
  return textWidths.map((tw, i) => ({
    x: cx - blockH / 2 + pad + lineH * (i + 0.75),
    y: cy + tw / 2,
  }));
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
  /** Dimensi grid: baris (utara→selatan) × kolom (barat→timur). */
  rows: number;
  cols: number;
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
 * Bagi lahan ke grid baris×kolom (fleksibel, input user) di atas bounds
 * bersama — tiap lahan masuk tepat satu sel berdasarkan **centroid**-nya
 * (lahan tak pernah terpotong: halaman per sel me-refit bounds ke lahan
 * anggotanya). Sel kosong tidak ikut. Baris dibatasi 26 (label huruf A–Z).
 */
export function splitParcelsIntoGrid(
  parcels: LpGridParcel[],
  gridRows: number,
  gridCols: number,
): LpGridSplit {
  const rows = Math.min(26, Math.max(1, Math.round(gridRows)));
  const cols = Math.min(99, Math.max(1, Math.round(gridCols)));
  const withRings = parcels.map((p) => ({ ...p, rings: exteriorRings(p.geometry) }));
  const skippedNos = withRings.filter((p) => p.rings.length === 0).map((p) => p.no);
  const drawable = withRings.filter((p) => p.rings.length > 0);
  if (drawable.length === 0) return { rows, cols, cells: [], skippedNos };

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
    const col = Math.min(cols - 1, Math.max(0, Math.floor(((cLon - minLon) / spanLon) * cols)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(((maxLat - cLat) / spanLat) * rows)));
    const key = `${row}-${col}`;
    let cell = cellMap.get(key);
    if (!cell) {
      cell = { label: `${String.fromCharCode(65 + row)}${col + 1}`, row, col, parcels: [] };
      cellMap.set(key, cell);
    }
    cell.parcels.push({ no: p.no, geometry: p.geometry });
  }

  const cells = Array.from(cellMap.values()).sort((a, b) => a.row - b.row || a.col - b.col);
  return { rows, cols, cells, skippedNos };
}

// ─── Dekorasi peta cetak (#180): skala batang & anti-tumpang label ───

/** km per derajat lintang (WGS84, valid ~lintang rendah Riau). */
const KM_PER_DEG_LAT = 110.574;

export interface LpScaleBar {
  /** Jarak nyata batang. */
  km: number;
  /** Panjang batang di kertas/viewBox (mm). */
  mm: number;
  /** Label tampil, mis. "500 m" / "2 km". */
  label: string;
}

/**
 * Pilih jarak "nice" untuk skala batang dari skala proyeksi (mm per derajat):
 * kandidat 100 m – 20 km, ambil terbesar yang muat ≤ 40 mm (fallback kandidat
 * terkecil). Proyeksi equirectangular sederhana — akurat di lintang rendah.
 */
export function pickScaleBar(mmPerDegree: number): LpScaleBar | null {
  if (!Number.isFinite(mmPerDegree) || mmPerDegree <= 0) return null;
  const mmPerKm = mmPerDegree / KM_PER_DEG_LAT;
  const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20];
  let pick = candidates[0];
  for (const km of candidates) {
    if (km * mmPerKm <= 40) pick = km;
  }
  const mm = pick * mmPerKm;
  if (!Number.isFinite(mm) || mm <= 0) return null;
  const label = pick < 1 ? `${Math.round(pick * 1000)} m` : `${pick} km`;
  return { km: pick, mm, label };
}

export interface LpLabelRect {
  x: number;
  y: number;
  /** Dimensi blok label SEBAGAIMANA digambar (vertikal → sudah ditukar). */
  w: number;
  h: number;
}

function rectsOverlap(a: LpLabelRect, b: LpLabelRect, gap = 0.3): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w + gap &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h + gap
  );
}

/**
 * Anti-tumpang label (#180): greedy per label (urut input = kolom No) — coba
 * posisi asli lalu geser vertikal ±step bertahap sampai tak menabrak label
 * yang sudah ditempatkan; hasil di-clamp ke dalam box. Bila semua kandidat
 * bentrok, posisi asli dipertahankan (label tetap dekat poligonnya — lebih
 * baik tumpang sedikit daripada tersesat jauh). Pure — dipakai jsPDF & SVG.
 */
export function resolveLabelCollisions(
  labels: LpLabelRect[],
  box: { y1: number; y2: number },
): { x: number; y: number }[] {
  const placed: LpLabelRect[] = [];
  return labels.map((label) => {
    const step = label.h + 0.6;
    const offsets = [0, step, -step, 2 * step, -2 * step, 3 * step, -3 * step];
    let chosen = { x: label.x, y: label.y };
    for (const off of offsets) {
      const y = Math.min(box.y2 - label.h / 2, Math.max(box.y1 + label.h / 2, label.y + off));
      const candidate = { ...label, y };
      if (!placed.some((p) => rectsOverlap(candidate, p))) {
        chosen = { x: label.x, y };
        break;
      }
    }
    placed.push({ ...label, x: chosen.x, y: chosen.y });
    return chosen;
  });
}
