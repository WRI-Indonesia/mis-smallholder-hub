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

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_BOTTOM = 270;

export type LayerReportGeometry = Point | Polygon | MultiPolygon;

export interface LayerReportStyle {
  /** Warna isi (poligon) / titik — per fitur lewat `colorOf`, atau satu warna. */
  colorOf?: (props: Record<string, unknown>) => [number, number, number];
  color?: [number, number, number];
  /** Nomor di tengah fitur (poligon) atau di samping titik — mis. nomor urut baris tabel. */
  numbered?: boolean;
}

/** Poligon latar (lahan Lembaga/filter) di belakang fitur utama — abu tipis; `colorOf` untuk menyorot (mis. lahan NKT). */
export interface LayerReportContext {
  fc: FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>;
  colorOf?: (props: Record<string, unknown>) => [number, number, number] | null;
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
}

type Box = { x: number; y: number; w: number; h: number };
type Projector = (lon: number, lat: number) => [number, number];

function drawFooter(doc: jsPDF, page: number, total: number, note: string) {
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 275, PAGE_W - MARGIN, 275);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...SLATE_400);
  doc.text(note, MARGIN, 280, { maxWidth: CONTENT_W - 40 });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...EMERALD);
  doc.text("Smallholder HUB", PAGE_W - MARGIN, 288, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  doc.text(`Hal. ${page}/${total}`, PAGE_W - MARGIN, 280, { align: "right" });
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

function ringCentroid(ring: Position[]): [number, number] {
  const [sx, sy] = ring.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sx / ring.length, sy / ring.length];
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

/** Gambar seluruh fitur ke kotak: bbox fitur utama + margin 12 %, skala lon dikoreksi cos(lat). Nomor = urutan fitur + 1. */
function drawLayerMap(doc: jsPDF, fc: LayerReportInput["fc"], box: Box, style: LayerReportStyle, context?: LayerReportContext) {
  const all = fc.features.flatMap((f) => positionsOf(f.geometry));
  if (all.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_400);
    doc.text("Tidak ada fitur untuk digambar", box.x + box.w / 2, box.y + box.h / 2, { align: "center" });
    return;
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

  doc.saveGraphicsState();
  doc.rect(box.x, box.y, box.w, box.h, null);
  doc.clip();
  doc.discardPath();

  // Konteks (lahan di sekitar) dulu — lahan biasa ungu 25 % opacity (permintaan owner
  // 2026-09-14), lahan yang disorot (NKT) berwarna penuh.
  if (context) {
    const plain = context.fc.features.filter((f) => !context.colorOf?.(f.properties ?? {}));
    const highlighted = context.fc.features.filter((f) => context.colorOf?.(f.properties ?? {}));
    if (plain.length > 0) {
      doc.saveGraphicsState();
      doc.setGState(new (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState({ opacity: 0.25 }) as never);
      doc.setDrawColor(...CONTEXT_PURPLE);
      doc.setFillColor(...CONTEXT_PURPLE);
      doc.setLineWidth(0.2);
      for (const f of plain) for (const ring of exteriorRings(f.geometry)) strokeRing(doc, ring, project, "FD");
      doc.restoreGraphicsState();
      // restoreGraphicsState membuang clip — pasang lagi supaya fitur berikutnya tetap terpotong di kotak.
      doc.saveGraphicsState();
      doc.rect(box.x, box.y, box.w, box.h, null);
      doc.clip();
      doc.discardPath();
    }
    for (const f of highlighted) {
      const tint = context.colorOf!(f.properties ?? {})!;
      doc.setDrawColor(...tint);
      doc.setFillColor(Math.round(255 - (255 - tint[0]) * 0.3), Math.round(255 - (255 - tint[1]) * 0.3), Math.round(255 - (255 - tint[2]) * 0.3));
      doc.setLineWidth(0.25);
      for (const ring of exteriorRings(f.geometry)) strokeRing(doc, ring, project, "FD");
    }
  }

  const numbers: { x: number; y: number; n: number }[] = [];
  const many = fc.features.length > 400;
  // Nomor hanya bila masih terbaca: ≤ 60 titik / ≤ 150 poligon (di atas itu tabel dirujuk lewat koordinat).
  const pointLimit = 60, polygonLimit = 150;
  fc.features.forEach((f, i) => {
    const color = style.colorOf?.(f.properties ?? {}) ?? style.color ?? EMERALD;
    if (f.geometry.type === "Point") {
      const [px, py] = project(f.geometry.coordinates[0], f.geometry.coordinates[1]);
      doc.setFillColor(...color);
      doc.setDrawColor(...SLATE_800);
      doc.setLineWidth(0.2);
      doc.circle(px, py, many ? 0.6 : 0.9, "FD");
      if (style.numbered && fc.features.length <= pointLimit) numbers.push({ x: px + 2.6, y: py, n: i + 1 });
      return;
    }
    const rings = exteriorRings(f.geometry);
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setFillColor(Math.round(255 - (255 - color[0]) * 0.35), Math.round(255 - (255 - color[1]) * 0.35), Math.round(255 - (255 - color[2]) * 0.35));
    doc.setLineWidth(many ? 0.15 : 0.35);
    for (const ring of rings) strokeRing(doc, ring, project, "FD");
    if (style.numbered && fc.features.length <= polygonLimit && rings[0]) {
      const [cx, cy] = ringCentroid(rings[0]);
      const [px, py] = project(cx, cy);
      numbers.push({ x: px, y: py, n: i + 1 });
    }
  });
  for (const { x, y, n } of numbers) drawNumber(doc, x, y, n);
  drawDecorations(doc, box, mmPerMeter);
  doc.restoreGraphicsState();
}

export function buildLayerReportDoc(input: LayerReportInput): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const note = input.footnote ?? "Catatan: Peta skematis tanpa basemap — posisi relatif fitur sesuai koordinat tersimpan; bukan bukti kepemilikan legal atas tanah.";

  // Judul
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...EMERALD);
  doc.text("SMALLHOLDER HUB · PETA LAHAN", MARGIN, 18);
  doc.setFontSize(16);
  doc.setTextColor(...SLATE_800);
  doc.text(input.title, MARGIN, 27);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  doc.text(input.subtitle, MARGIN, 33);

  // Peta
  const mapBox: Box = { x: MARGIN, y: 39, w: CONTENT_W, h: 118 };
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.rect(mapBox.x, mapBox.y, mapBox.w, mapBox.h, "S");
  drawLayerMap(doc, input.fc, mapBox, input.style ?? {}, input.context);
  let y = mapBox.y + mapBox.h + 5;
  if (input.legend && input.legend.length > 0) {
    let x = MARGIN;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_600);
    for (const item of input.legend) {
      doc.setFillColor(...item.color);
      doc.setDrawColor(...SLATE_800);
      doc.setLineWidth(0.2);
      doc.rect(x, y - 2.4, 3, 3, "FD");
      doc.text(item.label, x + 4.5, y);
      x += 4.5 + doc.getTextWidth(item.label) + 6;
    }
    y += 5;
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
    margin: { left: MARGIN, right: MARGIN, bottom: PAGE_H - CONTENT_BOTTOM },
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak" },
    headStyles: { fillColor: EMERALD, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { textColor: SLATE_600 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(input.columns.map((c, i) => [i, { halign: c.align ?? "left", ...(c.width ? { cellWidth: c.width } : {}) }])),
    pageBreak: "auto",
  });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, note);
  }
  doc.setPage(total);
  return doc;
}
