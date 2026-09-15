import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FeatureCollection, MultiPolygon, Point, Polygon, Position } from "geojson";

/**
 * PDF per baris legenda Peta Lahan (#331, permintaan owner 2026-09-14): satu
 * dokumen A4 portrait berisi judul + konteks filter, PETA layer (poligon /
 * titik dari FeatureCollection yang sama dengan unduhan spasial, tanpa
 * basemap), lalu tabel atribut multi-halaman. Builder MURNI (jsPDF saja)
 * agar teruji lewat `pdfText`; unduhan/nama berkas di pemanggil.
 */

const EMERALD: [number, number, number] = [16, 185, 129];
const SLATE_800: [number, number, number] = [30, 41, 59];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_400: [number, number, number] = [148, 163, 184];
const SLATE_200: [number, number, number] = [226, 232, 240];

// A4 LANDSCAPE (owner 2026-09-14): peta lebih lebar, label tidak bertumpuk.
const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 12;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_BOTTOM = 188;

export type LayerReportGeometry = Point | Polygon | MultiPolygon;

export interface LayerReportStyle {
  /** Warna isi (poligon) / titik — per fitur lewat `colorOf`, atau satu warna. */
  colorOf?: (props: Record<string, unknown>) => [number, number, number];
  color?: [number, number, number];
  /** Nomor di tengah fitur (poligon) atau di samping titik — mis. nomor urut baris tabel. */
  numbered?: boolean;
  /** Label nama (mis. petani) di dalam poligon fitur utama bila muat — di bawah nomor. */
  labelOf?: (props: Record<string, unknown>) => string | null;
}

/** Poligon latar (lahan Lembaga/filter) di belakang fitur utama — abu tipis; `colorOf` untuk menyorot (mis. lahan NKT). */
export interface LayerReportContext {
  fc: FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>;
  colorOf?: (props: Record<string, unknown>) => [number, number, number] | null;
  /** Label di tengah poligon (mis. nama petani) — dicetak hanya bila muat di dalam poligon (owner 2026-09-14). */
  labelOf?: (props: Record<string, unknown>) => string | null;
}

export interface LayerReportInput {
  title: string;
  /** Baris konteks: filter, jumlah, tanggal cetak. */
  subtitle: string;
  fc: FeatureCollection<LayerReportGeometry, Record<string, unknown>>;
  style?: LayerReportStyle;
  /** Konteks lahan di belakang fitur utama (permintaan owner 2026-09-14: patok tanpa lahan tak terbaca). Bingkai tetap dari fitur utama. */
  context?: LayerReportContext;
  /** Legenda warna kecil di bawah peta (opsional). */
  legend?: { color: [number, number, number]; label: string }[];
  columns: { header: string; key: string; align?: "left" | "right" | "center"; width?: number }[];
  rows: Record<string, unknown>[];
  /** Catatan kaki halaman (bawaan: catatan legalitas). */
  footnote?: string;
  /** Kop atas (mis. "SMALLHOLDER HUB · LAPORAN NKT"); bawaan "… · PETA LAHAN". */
  kicker?: string;
  /** Kotak KPI di bawah subjudul (#332) — maks 6, satu baris. */
  kpis?: { label: string; value: string; note?: string }[];
  /** Tabel tambahan setelah tabel utama (mis. ringkasan kategori NKT). */
  extraTables?: { title: string; columns: LayerReportInput["columns"]; rows: Record<string, unknown>[] }[];
}

type Box = { x: number; y: number; w: number; h: number };
type Projector = (lon: number, lat: number) => [number, number];

function drawFooter(doc: jsPDF, page: number, total: number, note: string) {
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 193, PAGE_W - MARGIN, 193);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...SLATE_400);
  doc.text(note, MARGIN, 198, { maxWidth: CONTENT_W - 40 });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...EMERALD);
  doc.text("Smallholder HUB", PAGE_W - MARGIN, 204, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  doc.text(`Hal. ${page}/${total}`, PAGE_W - MARGIN, 198, { align: "right" });
}

function positionsOf(g: LayerReportGeometry): Position[] {
  if (g.type === "Point") return [g.coordinates];
  if (g.type === "Polygon") return g.coordinates.flat();
  return g.coordinates.flat(2);
}

function exteriorRings(g: LayerReportGeometry): Position[][] {
  if (g.type === "Polygon") return g.coordinates.length ? [g.coordinates[0]] : [];
  if (g.type === "MultiPolygon") return g.coordinates.map((p) => p[0]).filter((r) => r && r.length >= 3);
  return [];
}

/**
 * Centroid luasan (shoelace) — bukan rata-rata simpul, supaya sisi yang
 * didigitasi rapat (banyak simpul) tidak menarik titik jangkar nomor ke tepi.
 * Cadangan rata-rata simpul bila luas ≈ 0 (ring degeneratif).
 */
function ringCentroid(ring: Position[]): [number, number] {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    a += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  if (Math.abs(a) < 1e-12) {
    const [sx, sy] = ring.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
    return [sx / ring.length, sy / ring.length];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

function strokeRing(doc: jsPDF, ring: Position[], project: Projector, style: "S" | "FD" | "F") {
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  if (pts.length < 2) return;
  const segs = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], style, true);
}

function drawDecorations(doc: jsPDF, box: Box, mmPerMeter: number) {
  const candidates = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
  const maxMm = box.w / 3;
  let meters = candidates[0];
  for (const c of candidates) if (c * mmPerMeter <= maxMm) meters = c;
  const barMm = meters * mmPerMeter;
  const bx = box.x + 4;
  const by = box.y + box.h - 5;
  doc.setDrawColor(...SLATE_800);
  doc.setLineWidth(0.5);
  doc.line(bx, by, bx + barMm, by);
  doc.line(bx, by - 1.2, bx, by + 1.2);
  doc.line(bx + barMm, by - 1.2, bx + barMm, by + 1.2);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_800);
  doc.text(meters >= 1000 ? `${meters / 1000} km` : `${meters} m`, bx + barMm / 2, by - 1.8, { align: "center" });
  const nx = box.x + box.w - 5;
  const ny = box.y + 4;
  doc.setFillColor(...SLATE_800);
  doc.triangle(nx, ny, nx - 1.6, ny + 4.5, nx + 1.6, ny + 4.5, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("U", nx, ny + 8, { align: "center" });
}

const CONTEXT_PURPLE: [number, number, number] = [126, 34, 206];

/**
 * Graticule (permintaan owner 2026-09-14: "koordinat di pinggir sebagaimana
 * layaknya peta"): garis kisi tipis putus-putus + label lintang (kiri) & bujur
 * (atas) pada interval "bulat" — dipilih agar 3–7 garis muat pada bentang.
 */
export function graticuleStep(spanDeg: number): number {
  const candidates = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];
  for (const c of candidates) if (spanDeg / c <= 7) return c;
  return 1;
}

export function drawGraticule(
  doc: jsPDF,
  box: Box,
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  project: Projector,
) {
  const step = graticuleStep(Math.max(bounds.maxLon - bounds.minLon, bounds.maxLat - bounds.minLat));
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  const fmt = (v: number) => v.toFixed(decimals);
  doc.setLineDashPattern([0.8, 0.8], 0);
  doc.setDrawColor(...SLATE_400);
  doc.setLineWidth(0.12);
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  const startLon = Math.ceil(bounds.minLon / step) * step;
  for (let lon = startLon; lon <= bounds.maxLon + 1e-12; lon += step) {
    const [x] = project(lon, bounds.minLat);
    if (x < box.x + 1 || x > box.x + box.w - 1) continue;
    doc.line(x, box.y, x, box.y + box.h);
    doc.text(fmt(lon), x, box.y + 2.2, { align: "center" });
  }
  const startLat = Math.ceil(bounds.minLat / step) * step;
  for (let lat = startLat; lat <= bounds.maxLat + 1e-12; lat += step) {
    const [, y] = project(bounds.minLon, lat);
    if (y < box.y + 1 || y > box.y + box.h - 1) continue;
    doc.line(box.x, y, box.x + box.w, y);
    doc.text(fmt(lat), box.x + 1, y - 0.6);
  }
  doc.setLineDashPattern([], 0);
}
/** Opacity konteks lahan non-NKT — "lebih tipis lagi" (owner 2026-09-14). */
const CONTEXT_OPACITY = 0.12;

/** Nomor kecil berlatar putih supaya tetap terbaca di atas titik/poligon yang rapat. */
function drawNumber(doc: jsPDF, x: number, y: number, n: number) {
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  const label = String(n);
  const w = doc.getTextWidth(label);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...SLATE_400);
  doc.setLineWidth(0.15);
  doc.roundedRect(x - w / 2 - 0.5, y - 1.25, w + 1, 2.5, 0.4, 0.4, "FD");
  doc.setTextColor(...SLATE_800);
  doc.text(label, x, y, { align: "center", baseline: "middle" });
}

type LabelBox = { x: number; y: number; w: number; h: number };
const overlaps = (a: LabelBox, b: LabelBox) => Math.abs(a.x - b.x) * 2 < a.w + b.w + 0.6 && Math.abs(a.y - b.y) * 2 < a.h + b.h + 0.6;

/**
 * Penempatan label anti-tumpuk (greedy): coba di jangkar, lalu 8 arah dengan
 * radius bertahap; posisi pertama yang bebas tabrakan & di dalam kotak dipakai,
 * dan bila bergeser digambar garis penunjuk tipis ke jangkarnya.
 */
function placeAndDrawNumbers(doc: jsPDF, items: { x: number; y: number; n: number }[], box: Box) {
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  const placed: LabelBox[] = [];
  const dirs = [[1, 0], [1, -1], [-1, 0], [1, 1], [0, -1], [-1, -1], [0, 1], [-1, 1]];
  const inside = (b: LabelBox) => b.x - b.w / 2 >= box.x + 1 && b.x + b.w / 2 <= box.x + box.w - 1 && b.y - b.h / 2 >= box.y + 1 && b.y + b.h / 2 <= box.y + box.h - 9;
  const draws: { at: LabelBox; anchor: { x: number; y: number }; n: number; moved: boolean }[] = [];
  for (const it of items) {
    const w = doc.getTextWidth(String(it.n)) + 1;
    const h = 2.5;
    let chosen: LabelBox | null = null;
    let moved = false;
    outer: for (const r of [0, 3, 4.5, 6, 8, 10, 13, 16]) {
      for (const [dx, dy] of r === 0 ? [[0, 0]] : dirs) {
        const cand = { x: it.x + dx * r, y: it.y + dy * r, w, h };
        if (!inside(cand)) continue;
        if (placed.some((p) => overlaps(p, cand))) continue;
        chosen = cand;
        moved = r > 0;
        break outer;
      }
    }
    if (!chosen) { chosen = { x: it.x, y: it.y, w, h }; }
    placed.push(chosen);
    draws.push({ at: chosen, anchor: { x: it.x, y: it.y }, n: it.n, moved });
  }
  // Garis penunjuk dulu (di bawah label), lalu labelnya.
  doc.setDrawColor(...SLATE_600);
  doc.setLineWidth(0.15);
  for (const d of draws) if (d.moved) doc.line(d.anchor.x, d.anchor.y, d.at.x, d.at.y);
  for (const d of draws) drawNumber(doc, d.at.x, d.at.y, d.n);
}

/**
 * Label di tengah poligon dengan orientasi ADAPTIF (owner 2026-09-14): horizontal
 * bila muat (≤ 90 % lebar bbox), kalau tidak vertikal (≤ 90 % tinggi), lalu
 * diagonal mengikuti sudut bbox; nama panjang dipendekkan ke "Depan I.I."
 * sebelum menyerah. Font 5, abu gelap, tanpa halo (konteks tipis).
 */
function drawPolygonLabel(doc: jsPDF, ring: Position[], project: Projector, label: string, dyMm = 0) {
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const w = x1 - x0, h = y1 - y0;
  if (Math.max(w, h) < 5) return;
  // Bila nama digeser ke bawah nomor (dyMm > 0), poligon harus cukup tinggi untuk keduanya.
  if (dyMm > 0 && h < 2 * dyMm + 5) return;
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  const parts = label.split(/\s+/);
  const short = parts.length > 1 ? `${parts[0]} ${parts.slice(1).map((p) => p[0] + ".").join("")}` : label;
  const diag = Math.hypot(w, h);
  // Bila ada nomor di pusat (dyMm > 0), teks vertikal/diagonal digeser sepanjang
  // arahnya sendiri sehingga berawal tepat setelah kotak nomor → hanya separuh
  // panjang poligon (dikurangi kotak nomor) yang tersedia.
  const numPad = dyMm > 0 ? 2.5 : 0;
  const along = (len: number) => (dyMm > 0 ? len / 2 : len) - numPad;
  const fits = (tw: number) => (tw <= w * 0.9 ? 0 : tw <= along(h * 0.9) ? 90 : tw <= along(diag * 0.85) ? (Math.atan2(h, w) * 180) / Math.PI : null);
  let text = label;
  let angle = fits(doc.getTextWidth(text));
  if (angle === null) { text = short; angle = fits(doc.getTextWidth(text)); }
  if (angle === null) return;
  const tw = doc.getTextWidth(text);
  const rad = (angle * Math.PI) / 180;
  const shift = angle === 0 ? 0 : numPad + tw / 2;
  // Pusat = centroid luasan (jangkar nomor yang sama) agar geseran relatif nomor tepat.
  const [c0x, c0y] = project(...ringCentroid(ring));
  const cx = c0x - shift * Math.cos(rad), cy = c0y + (angle === 0 ? dyMm : shift * Math.sin(rad));
  // jsPDF memutar berlawanan jarum jam; y kertas ke bawah → arah teks (cos, −sin),
  // arah "bawah" relatif teks (sin, cos). Jangkar = pusat − ½ lebar teks + ½ tinggi huruf.
  const ax = cx - (tw / 2) * Math.cos(rad) + 0.6 * Math.sin(rad);
  const ay = cy + (tw / 2) * Math.sin(rad) + 0.6 * Math.cos(rad);
  doc.setTextColor(...SLATE_600);
  if (angle === 0) doc.text(text, cx, cy, { align: "center", baseline: "middle" });
  else doc.text(text, ax, ay, { angle });
}

/** Pusat fitur (centroid ring luar pertama / koordinat titik) dalam derajat. */
function featureCenter(f: LayerReportInput["fc"]["features"][number]): [number, number] {
  if (f.geometry.type === "Point") return [f.geometry.coordinates[0], f.geometry.coordinates[1]];
  const rings = exteriorRings(f.geometry);
  return rings[0] ? ringCentroid(rings[0]) : [0, 0];
}

/**
 * Klaster fitur (single-linkage) dengan ambang jarak = 8 % bentang terbesar
 * (min ≈ 150 m): dua blok kebun yang terpisah jauh jadi klaster sendiri dan
 * masing-masing mendapat halaman peta rinci berskala pas.
 */
function clusterFeatures(fc: LayerReportInput["fc"]): number[][] {
  const centers = fc.features.map(featureCenter);
  if (centers.length === 0) return [];
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of centers) { minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); }
  const cosLat = Math.max(0.2, Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));
  const span = Math.max((maxLon - minLon) * cosLat, maxLat - minLat);
  const thr = Math.max(0.08 * span, 150 / 111_320);
  const parent = centers.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const dx = (centers[i][0] - centers[j][0]) * cosLat;
      const dy = centers[i][1] - centers[j][1];
      if (Math.hypot(dx, dy) <= thr) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, number[]>();
  centers.forEach((_, i) => { const r = find(i); groups.set(r, [...(groups.get(r) ?? []), i]); });
  // Urut klaster: barat-laut dulu (utara, lalu barat) — huruf A, B, … stabil.
  return [...groups.values()].sort((a, b) => {
    const ca = featureCenter(fc.features[a[0]]), cb = featureCenter(fc.features[b[0]]);
    return cb[1] - ca[1] || ca[0] - cb[0];
  });
}

interface MapDrawResult {
  /** mm per meter pada skala yang dipakai — untuk menilai apakah fitur cukup besar. */
  mmPerMeter: number;
  /** Kotak (mm) tiap klaster yang digambar di ikhtisar, untuk label A/B. */
  clusterBoxes: { label: string; box: Box }[];
}

/**
 * Gambar fitur ke kotak: bbox fitur (subset `indices`) + margin 12 %, skala lon
 * dikoreksi cos(lat). `numbered` menggambar nomor (indeks global + 1) dengan
 * anti-tumpuk. `clusters` (ikhtisar) menggambar kotak huruf per klaster.
 */
function drawLayerMap(
  doc: jsPDF,
  fc: LayerReportInput["fc"],
  box: Box,
  style: LayerReportStyle,
  context: LayerReportContext | undefined,
  opts: { indices: number[]; numbered: boolean; clusters?: number[][] },
): MapDrawResult {
  const subset = opts.indices.map((i) => fc.features[i]);
  const all = subset.flatMap((f) => positionsOf(f.geometry));
  if (all.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_400);
    doc.text("Tidak ada fitur untuk digambar", box.x + box.w / 2, box.y + box.h / 2, { align: "center" });
    return { mmPerMeter: 0, clusterBoxes: [] };
  }
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of all) {
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));
  const spanLon0 = maxLon - minLon || 1e-4;
  const spanLat0 = maxLat - minLat || 1e-4;
  // Margin 12 % (min ≈ 60 m) — cukup memperlihatkan lahan di sekitar fitur utama.
  const margin = Math.max(0.12 * Math.max(spanLon0 * cosLat, spanLat0), 60 / 111_320);
  minLon -= margin / cosLat; maxLon += margin / cosLat; minLat -= margin; maxLat += margin;
  const s = Math.min(box.w / ((maxLon - minLon) * cosLat), box.h / (maxLat - minLat));
  const drawW = (maxLon - minLon) * cosLat * s;
  const drawH = (maxLat - minLat) * s;
  const offX = box.x + (box.w - drawW) / 2;
  const offY = box.y + (box.h - drawH) / 2;
  const project: Projector = (lon, lat) => [offX + (lon - minLon) * cosLat * s, offY + (maxLat - lat) * s];
  const mmPerMeter = s / 111_320;

  const clipToBox = () => {
    doc.saveGraphicsState();
    doc.rect(box.x, box.y, box.w, box.h, null);
    doc.clip();
    doc.discardPath();
  };
  clipToBox();
  drawGraticule(doc, box, { minLon, maxLon, minLat, maxLat }, project);

  // Konteks (lahan di sekitar) dulu — lahan biasa ungu sangat tipis (CONTEXT_OPACITY),
  // lahan yang disorot (NKT) berwarna penuh.
  if (context) {
    const plain = context.fc.features.filter((f) => !context.colorOf?.(f.properties ?? {}));
    const highlighted = context.fc.features.filter((f) => context.colorOf?.(f.properties ?? {}));
    if (plain.length > 0) {
      doc.saveGraphicsState();
      doc.setGState(new (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState({ opacity: CONTEXT_OPACITY }) as never);
      doc.setDrawColor(...CONTEXT_PURPLE);
      doc.setFillColor(...CONTEXT_PURPLE);
      doc.setLineWidth(0.2);
      for (const f of plain) for (const ring of exteriorRings(f.geometry)) strokeRing(doc, ring, project, "FD");
      doc.restoreGraphicsState();
      if (context.labelOf) {
        for (const f of plain) {
          const label = context.labelOf(f.properties ?? {});
          const ring = exteriorRings(f.geometry)[0];
          if (label && ring) drawPolygonLabel(doc, ring, project, label);
        }
      }
      // Kembali ke state #1 yang masih memegang clip kotak — jangan save lagi
      // (save ekstra membuat clip tak pernah dilepas: legenda & footer ikut terpotong).
    }
    for (const f of highlighted) {
      const tint = context.colorOf!(f.properties ?? {})!;
      doc.setDrawColor(...tint);
      doc.setFillColor(Math.round(255 - (255 - tint[0]) * 0.3), Math.round(255 - (255 - tint[1]) * 0.3), Math.round(255 - (255 - tint[2]) * 0.3));
      doc.setLineWidth(0.25);
      for (const ring of exteriorRings(f.geometry)) strokeRing(doc, ring, project, "FD");
      const label = context.labelOf?.(f.properties ?? {});
      const ring0 = exteriorRings(f.geometry)[0];
      if (label && ring0) drawPolygonLabel(doc, ring0, project, label);
    }
  }

  const numbers: { x: number; y: number; n: number }[] = [];
  const many = subset.length > 400;
  opts.indices.forEach((gi) => {
    const f = fc.features[gi];
    const color = style.colorOf?.(f.properties ?? {}) ?? style.color ?? EMERALD;
    if (f.geometry.type === "Point") {
      const [px, py] = project(f.geometry.coordinates[0], f.geometry.coordinates[1]);
      doc.setFillColor(...color);
      doc.setDrawColor(...SLATE_800);
      doc.setLineWidth(0.2);
      doc.circle(px, py, many ? 0.6 : 0.9, "FD");
      if (opts.numbered) numbers.push({ x: px, y: py, n: gi + 1 });
      return;
    }
    const rings = exteriorRings(f.geometry);
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setFillColor(Math.round(255 - (255 - color[0]) * 0.35), Math.round(255 - (255 - color[1]) * 0.35), Math.round(255 - (255 - color[2]) * 0.35));
    doc.setLineWidth(many ? 0.15 : 0.35);
    for (const ring of rings) strokeRing(doc, ring, project, "FD");
    if (opts.numbered && rings[0]) {
      const [cx, cy] = ringCentroid(rings[0]);
      const [px, py] = project(cx, cy);
      numbers.push({ x: px, y: py, n: gi + 1 });
    }
    const label = style.labelOf?.(f.properties ?? {});
    // Label nama di bawah nomor (geser 3 mm) supaya tidak saling tindih.
    if (label && rings[0]) drawPolygonLabel(doc, rings[0], project, label, opts.numbered ? 3 : 0);
  });
  if (numbers.length > 0) placeAndDrawNumbers(doc, numbers, box);

  // Kotak klaster A/B di ikhtisar.
  const clusterBoxes: MapDrawResult["clusterBoxes"] = [];
  if (opts.clusters) {
    opts.clusters.forEach((idx, k) => {
      const pts = idx.flatMap((i) => positionsOf(fc.features[i].geometry)).map(([lon, lat]) => project(lon, lat));
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const b = { x: x0 - 2, y: y0 - 2, w: x1 - x0 + 4, h: y1 - y0 + 4 };
      const label = String.fromCharCode(65 + k);
      doc.setDrawColor(...SLATE_800);
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([1.5, 1], 0);
      doc.rect(b.x, b.y, b.w, b.h, "S");
      doc.setLineDashPattern([], 0);
      doc.setFillColor(...SLATE_800);
      doc.roundedRect(b.x, b.y - 5.5, 7, 5, 0.6, 0.6, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(label, b.x + 3.5, b.y - 3, { align: "center", baseline: "middle" });
      clusterBoxes.push({ label, box: b });
    });
  }

  drawDecorations(doc, box, mmPerMeter);
  doc.restoreGraphicsState();
  return { mmPerMeter, clusterBoxes };
}

function drawLegend(doc: jsPDF, legend: LayerReportInput["legend"], x0: number, y: number) {
  if (!legend || legend.length === 0) return y;
  let x = x0;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  for (const item of legend) {
    doc.setFillColor(...item.color);
    doc.setDrawColor(...SLATE_800);
    doc.setLineWidth(0.2);
    doc.rect(x, y - 2.4, 3, 3, "FD");
    doc.text(item.label, x + 4.5, y);
    x += 4.5 + doc.getTextWidth(item.label) + 6;
  }
  return y + 5;
}

function drawHeader(doc: jsPDF, title: string, subtitle: string, kicker = "SMALLHOLDER HUB · PETA LAHAN") {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...EMERALD);
  doc.text(kicker, MARGIN, 14);
  doc.setFontSize(15);
  doc.setTextColor(...SLATE_800);
  doc.text(title, MARGIN, 22);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  doc.text(subtitle, MARGIN, 27.5);
}

/** Fitur dianggap "terlalu kecil" bila tapak khasnya (≈ 100 m) < 6 mm di kertas → butuh peta rinci. */
const MIN_FEATURE_MM = 6;
// Batas jumlah fitur yang masih dinomori — peta rinci per klaster + label anti-tumpuk
// membuat 200 masih terbaca; di atas itu pembaca memakai tabel & koordinat.
const NUMBER_LIMIT = 200;

/**
 * Halaman LANDSCAPE (owner 2026-09-14: peta lebih lebar, label tak bertumpuk):
 * halaman 1 = ikhtisar; bila fitur terlalu kecil untuk dinomori di ikhtisar,
 * tiap klaster mendapat halaman peta rinci bernomor; tabel menyusul.
 */
export function buildLayerReportDoc(input: LayerReportInput): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const note = input.footnote ?? "Catatan: Peta skematis tanpa basemap — posisi relatif fitur sesuai koordinat tersimpan; bukan bukti kepemilikan legal atas tanah.";
  const style = input.style ?? {};
  const n = input.fc.features.length;
  const numberable = !!style.numbered && n > 0 && n <= NUMBER_LIMIT;
  const allIdx = input.fc.features.map((_, i) => i);

  drawHeader(doc, input.title, input.subtitle, input.kicker);
  // KPI (#332): kotak-kotak kecil satu baris; peta bergeser ke bawah secukupnya.
  let mapTop = 32;
  if (input.kpis && input.kpis.length > 0) {
    const kpis = input.kpis.slice(0, 6);
    const gap = 3;
    const w = (CONTENT_W - gap * (kpis.length - 1)) / kpis.length;
    kpis.forEach((k, i) => {
      const x = MARGIN + i * (w + gap);
      doc.setDrawColor(...SLATE_200);
      doc.setFillColor(248, 250, 252);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, 31, w, 17, 1.2, 1.2, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE_400);
      doc.text(k.label.toUpperCase(), x + 3, 35.5);
      doc.setFontSize(12);
      doc.setTextColor(...SLATE_800);
      doc.text(k.value, x + 3, 42);
      if (k.note) {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...SLATE_600);
        doc.text(k.note, x + 3, 46.2, { maxWidth: w - 6 });
      }
    });
    mapTop = 52;
  }
  const mapBox: Box = { x: MARGIN, y: mapTop, w: CONTENT_W, h: 122 - (mapTop - 32) };
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.rect(mapBox.x, mapBox.y, mapBox.w, mapBox.h, "S");

  // Putuskan dulu apakah ikhtisar cukup besar untuk dinomori (uji skala tanpa menggambar nomor).
  const clusters = numberable ? clusterFeatures(input.fc) : [];
  const probe = numberable ? probeScale(input.fc, mapBox) : Infinity;
  const needDetail = numberable && probe * 100 < MIN_FEATURE_MM;
  const result = drawLayerMap(doc, input.fc, mapBox, style, input.context, {
    indices: allIdx,
    numbered: numberable && !needDetail,
    clusters: needDetail ? clusters : undefined,
  });
  void result;
  let y = drawLegend(doc, input.legend, MARGIN, mapBox.y + mapBox.h + 5);
  if (!!style.numbered && n > NUMBER_LIMIT) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...SLATE_600);
    doc.text(`Nomor tidak dicetak (> ${NUMBER_LIMIT} fitur) — rujuk tabel & koordinat.`, MARGIN, y);
    y += 5;
  }
  if (needDetail) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...SLATE_600);
    doc.text(`Fitur terlalu kecil untuk dinomori di ikhtisar — lihat peta rinci ${clusters.length > 1 ? `klaster A–${String.fromCharCode(64 + clusters.length)}` : "di halaman berikutnya"}.`, MARGIN, y);
    y += 5;
    clusters.forEach((idx, k) => {
      doc.addPage();
      const label = String.fromCharCode(65 + k);
      drawHeader(doc, `${input.title} — peta rinci ${clusters.length > 1 ? label : ""}`.trim(), `${idx.length} fitur · nomor = urutan tabel`, input.kicker);
      const detailBox: Box = { x: MARGIN, y: 32, w: CONTENT_W, h: 150 };
      doc.setDrawColor(...SLATE_200);
      doc.setLineWidth(0.4);
      doc.rect(detailBox.x, detailBox.y, detailBox.w, detailBox.h, "S");
      drawLayerMap(doc, input.fc, detailBox, style, input.context, { indices: idx, numbered: true });
      drawLegend(doc, input.legend, MARGIN, detailBox.y + detailBox.h + 5);
    });
    doc.addPage();
    y = 16;
  }

  // Tabel
  autoTable(doc, {
    head: [input.columns.map((c) => c.header)],
    body: input.rows.map((r) => input.columns.map((c) => {
      const v = r[c.key];
      return v === null || v === undefined || v === "" ? "—" : String(v);
    })),
    startY: y + 2,
    theme: "striped",
    margin: { left: MARGIN, right: MARGIN, bottom: PAGE_H - CONTENT_BOTTOM, top: 14 },
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak" },
    headStyles: { fillColor: EMERALD, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { textColor: SLATE_600 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(input.columns.map((c, i) => [i, { halign: c.align ?? "left", ...(c.width ? { cellWidth: c.width } : {}) }])),
    pageBreak: "auto",
  });

  // Tabel tambahan (#332): judul kecil + autoTable lanjutan.
  for (const t of input.extraTables ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let yy = ((doc as any).lastAutoTable?.finalY ?? y) + 8;
    // Pindah halaman hanya bila judul + kepala + ≤ 3 baris pertama tak muat (autoTable memotong sisanya).
    if (yy + 12 + Math.min(t.rows.length, 3) * 5 > CONTENT_BOTTOM) { doc.addPage(); yy = 16; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_800);
    doc.text(t.title, MARGIN, yy);
    autoTable(doc, {
      head: [t.columns.map((c) => c.header)],
      body: t.rows.map((r) => t.columns.map((c) => { const v = r[c.key]; return v === null || v === undefined || v === "" ? "—" : String(v); })),
      startY: yy + 3,
      theme: "striped",
      margin: { left: MARGIN, right: MARGIN, bottom: PAGE_H - CONTENT_BOTTOM, top: 14 },
      styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak" },
      headStyles: { fillColor: EMERALD, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
      bodyStyles: { textColor: SLATE_600 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: Object.fromEntries(t.columns.map((c, i) => [i, { halign: c.align ?? "left", ...(c.width ? { cellWidth: c.width } : {}) }])),
      pageBreak: "auto",
    });
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, note);
  }
  doc.setPage(total);
  return doc;
}

/** Skala (mm per meter) yang akan dipakai ikhtisar — dihitung tanpa menggambar. */
function probeScale(fc: LayerReportInput["fc"], box: Box): number {
  const all = fc.features.flatMap((f) => positionsOf(f.geometry));
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of all) { minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); }
  const cosLat = Math.max(0.2, Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));
  const spanLon0 = maxLon - minLon || 1e-4;
  const spanLat0 = maxLat - minLat || 1e-4;
  const margin = Math.max(0.12 * Math.max(spanLon0 * cosLat, spanLat0), 60 / 111_320);
  const s = Math.min(box.w / ((spanLon0 + (2 * margin) / cosLat) * cosLat), box.h / (spanLat0 + 2 * margin));
  return s / 111_320;
}
