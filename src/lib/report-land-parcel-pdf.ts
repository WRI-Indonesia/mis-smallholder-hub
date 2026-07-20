import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  buildLandParcelMapLayout,
  splitParcelsIntoGrid,
  fitLabelToBox,
  verticalLabelAnchors,
  pickScaleBar,
  resolveLabelCollisions,
  type LpGeoJson,
  type LpMapLayout,
  type LpMapBox,
  type LpGridSplit,
  type LpGridCell,
  type LpLabelRect,
} from "@/lib/report-land-parcel";

const EMERALD: [number, number, number] = [16, 185, 129];
const AREA_FILL: [number, number, number] = [209, 240, 224];
const SLATE_800: [number, number, number] = [30, 41, 59];
const SLATE_700: [number, number, number] = [51, 65, 85];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_400: [number, number, number] = [148, 163, 184];
const SLATE_200: [number, number, number] = [226, 232, 240];

const MARGIN = 14;

export interface LpPdfColumn {
  header: string;
  key: string;
}

export interface LpPdfInput {
  filename: string;
  metadata: { label: string; value: string }[];
  columns: LpPdfColumn[];
  data: Record<string, unknown>[];
  columnStyles?: Record<number, Record<string, string | number>>;
  /**
   * Lahan urut sesuai kolom No tabel (no = idx+1), geometry boleh null.
   * `labelLines` = isi label poligon sesuai ceklis Label Peta (No/Nama/ID
   * Petani/ID Lahan), satu entri per baris teks.
   */
  mapParcels: { no: number; geometry: LpGeoJson | null; labelLines: string[] }[];
  /** Grid index fleksibel: baris × kolom (1×1 = tanpa pecah). */
  grid?: { rows: number; cols: number };
}

function drawLayoutPolygons(doc: jsPDF, layout: LpMapLayout) {
  doc.setDrawColor(...EMERALD);
  doc.setFillColor(...AREA_FILL);
  doc.setLineWidth(0.4);
  for (const poly of layout.polygons) {
    for (const ring of poly.rings) {
      if (ring.length < 3) continue;
      const segs = ring.slice(1).map((p, i) => [p[0] - ring[i][0], p[1] - ring[i][1]]);
      doc.lines(segs, ring[0][0], ring[0][1], [1, 1], "FD", true);
    }
  }
}

/**
 * Label digambar setelah semua poligon agar tak tertimpa fill tetangga.
 * Adaptif (#179): blok label di-fit ke bbox poligon — horizontal dulu, putar
 * 90° bila lebih lega, skala font turun (lantai keterbacaan) bila tetap sempit.
 * Anti-tumpang (#180): posisi final via `resolveLabelCollisions` (geser
 * vertikal bertahap dalam box) sebelum digambar.
 */
function drawLayoutLabels(
  doc: jsPDF,
  layout: LpMapLayout,
  linesByNo: Map<number, string[]>,
  box: LpMapBox,
) {
  const FONT = 6.5;
  const LINE_H = 2.6;
  doc.setFont("helvetica", "bold");

  // Pass 1: hitung dimensi blok tiap label (sebagaimana digambar).
  const jobs = layout.polygons.map((poly) => {
    const lines = linesByNo.get(poly.no) ?? [String(poly.no)];
    if (lines.length === 1 && lines[0] === String(poly.no)) {
      const scale = Math.max(0.6, Math.min(1, Math.min(poly.bboxW, poly.bboxH) / (2 * 2.4 + 1)));
      const d = 2 * 2.4 * scale;
      return { poly, lines, circleScale: scale, fit: null, rect: { x: poly.labelX, y: poly.labelY, w: d, h: d } };
    }
    doc.setFontSize(FONT);
    const baseW = Math.max(...lines.map((l) => doc.getTextWidth(l))) + 2;
    const baseH = lines.length * LINE_H + 1.2;
    const fit = fitLabelToBox(baseW, baseH, poly.bboxW - 0.8, poly.bboxH - 0.8);
    const w = baseW * fit.scale;
    const h = baseH * fit.scale;
    const rect: LpLabelRect = fit.vertical
      ? { x: poly.labelX, y: poly.labelY, w: h, h: w }
      : { x: poly.labelX, y: poly.labelY, w, h };
    return { poly, lines, circleScale: null, fit, rect };
  });

  // Pass 2: resolusi tabrakan → posisi final.
  const positions = resolveLabelCollisions(
    jobs.map((j) => j.rect),
    { y1: box.y, y2: box.y + box.h },
  );

  jobs.forEach((job, idx) => {
    const { lines } = job;
    const cx = positions[idx].x;
    const cy = positions[idx].y;
    if (job.circleScale !== null) {
      const scale = job.circleScale;
      doc.setFontSize(FONT * scale);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...EMERALD);
      doc.setLineWidth(0.25);
      doc.circle(cx, cy, 2.4 * scale, "FD");
      doc.setTextColor(...SLATE_800);
      doc.text(lines[0], cx, cy, { align: "center", baseline: "middle" });
      return;
    }
    const fit = job.fit!;
    const lineH = LINE_H * fit.scale;
    const w = fit.vertical ? job.rect.h : job.rect.w;
    const h = fit.vertical ? job.rect.w : job.rect.h;
    doc.setFontSize(FONT * fit.scale);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...EMERALD);
    doc.setLineWidth(0.25);
    doc.setTextColor(...SLATE_800);
    if (!fit.vertical) {
      doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 0.8, 0.8, "FD");
      lines.forEach((line, i) => {
        doc.text(line, cx, cy - h / 2 + 0.6 * fit.scale + lineH * (i + 0.5), {
          align: "center",
          baseline: "middle",
        });
      });
    } else {
      // Vertikal: blok diputar 90° (dibaca bawah→atas). Posisi manual via
      // verticalLabelAnchors — `align`/`baseline` jsPDF salah hitung saat
      // ber-`angle` (offset pra-rotasi), teks melenceng keluar pill.
      doc.roundedRect(cx - h / 2, cy - w / 2, h, w, 0.8, 0.8, "FD");
      const anchors = verticalLabelAnchors(
        cx,
        cy,
        lineH,
        lines.length,
        0.6 * fit.scale,
        lines.map((l) => doc.getTextWidth(l)),
      );
      lines.forEach((line, i) => {
        doc.text(line, anchors[i].x, anchors[i].y, { angle: 90 });
      });
    }
  });
}

/** Skala batang (kiri-bawah) + panah utara "U" (kanan-atas) di dalam box peta (#180). */
function drawMapDecorations(doc: jsPDF, layout: LpMapLayout, box: LpMapBox) {
  if (!layout.frame) return;

  // Panah utara.
  const nx = box.x + box.w - 6;
  const ny = box.y + 4;
  doc.setFillColor(...SLATE_800);
  doc.setDrawColor(...SLATE_800);
  doc.setLineWidth(0.3);
  doc.lines([[1.8, 5], [-1.8, -1.4], [-1.8, 1.4]], nx, ny, [1, 1], "F", true);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("U", nx, ny + 7.5, { align: "center" });

  // Skala batang.
  const bar = pickScaleBar(layout.frame.scale);
  if (!bar) return;
  const bx = box.x + 4;
  const by = box.y + box.h - 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.2);
  doc.roundedRect(bx - 1.5, by - 5, bar.mm + 3 + doc.getTextWidth(bar.label) + 3, 7, 0.8, 0.8, "FD");
  doc.setDrawColor(...SLATE_800);
  doc.setLineWidth(0.7);
  doc.line(bx, by, bx + bar.mm, by);
  doc.setLineWidth(0.3);
  doc.line(bx, by - 1.5, bx, by);
  doc.line(bx + bar.mm, by - 1.5, bx + bar.mm, by);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_800);
  doc.text(bar.label, bx + bar.mm + 2, by, { baseline: "bottom" });
}

/** Mini-ikhtisar posisi sel aktif dalam grid (kanan-atas halaman sel, #180). */
function drawMiniIndex(doc: jsPDF, split: LpGridSplit, active: LpGridCell, pageWidth: number) {
  const cellSize = Math.min(20 / split.cols, 9 / split.rows);
  const w = cellSize * split.cols;
  const h = cellSize * split.rows;
  const x = pageWidth - MARGIN - w;
  const y = 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...SLATE_400);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, "FD");
  doc.setFillColor(...EMERALD);
  doc.rect(x + active.col * cellSize, y + active.row * cellSize, cellSize, cellSize, "F");
  for (let i = 1; i < split.cols; i++) doc.line(x + i * cellSize, y, x + i * cellSize, y + h);
  for (let j = 1; j < split.rows; j++) doc.line(x, y + j * cellSize, x + w, y + j * cellSize);
}

function drawEmptyMapNote(doc: jsPDF, box: { x: number; y: number; w: number; h: number }) {
  doc.setFontSize(10);
  doc.setTextColor(...SLATE_400);
  doc.text("Tidak ada geometri lahan yang dapat digambar", box.x + box.w / 2, box.y + box.h / 2, {
    align: "center",
  });
}

/**
 * PDF Laporan Lahan (#179) — landscape A4. Tanpa grid: halaman 1 = peta seluruh
 * lahan ber-label nomor (= kolom No tabel). Dengan grid index (pecah 4/9/16):
 * halaman 1 = peta ikhtisar ber-garis grid + label sel (A1, A2, …), lalu satu
 * halaman peta per sel berisi (di-zoom ke lahan anggotanya, label nomor tetap),
 * terakhir tabel. Lahan tanpa geometri tetap di tabel + dicatat di bawah peta.
 * Build dipisah dari save agar dokumen bisa diverifikasi empiris (pelajaran #174).
 */
export function buildLandParcelReportDoc({
  metadata,
  columns,
  data,
  columnStyles,
  mapParcels,
  grid = { rows: 1, cols: 1 },
}: Omit<LpPdfInput, "filename">): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Header (gaya exportToPDF) ──
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, pageWidth, 4, "F");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text("LAPORAN LAHAN", MARGIN, 20);

  let currentY = 26;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_500);
  doc.text("Smallholder HUB Management Information System", MARGIN, currentY);
  currentY += 8;

  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, currentY, pageWidth - MARGIN, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setTextColor(...SLATE_700);
  metadata.forEach((m, idx) => {
    const x = MARGIN + (idx % 2) * 90;
    const y = currentY + Math.floor(idx / 2) * 6;
    doc.setFont("helvetica", "bold");
    const labelText = `${m.label}:`;
    const labelWidth = doc.getTextWidth(labelText);
    doc.text(labelText, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(m.value, x + labelWidth + 2, y);
  });
  currentY += Math.ceil(metadata.length / 2) * 6 + 4;

  // ── Halaman 1: peta (penuh atau ikhtisar grid) ──
  const noteH = 6;
  const mapBox = {
    x: MARGIN,
    y: currentY,
    w: pageWidth - MARGIN * 2,
    h: pageHeight - currentY - MARGIN - noteH,
    pad: 6,
  };
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.rect(mapBox.x, mapBox.y, mapBox.w, mapBox.h);

  const linesByNo = new Map(mapParcels.map((p) => [p.no, p.labelLines]));
  const fullLayout = buildLandParcelMapLayout(mapParcels, mapBox);
  const split =
    grid.rows * grid.cols > 1 ? splitParcelsIntoGrid(mapParcels, grid.rows, grid.cols) : null;
  const useGrid = split !== null && split.cells.length > 0 && fullLayout.frame;

  if (fullLayout.polygons.length === 0) {
    drawEmptyMapNote(doc, mapBox);
  } else if (!useGrid) {
    drawLayoutPolygons(doc, fullLayout);
    drawLayoutLabels(doc, fullLayout, linesByNo, mapBox);
    drawMapDecorations(doc, fullLayout, mapBox);
  } else {
    // Ikhtisar: poligon tanpa nomor + garis grid + label sel berisi.
    drawLayoutPolygons(doc, fullLayout);
    const f = fullLayout.frame!;
    const gx = f.offX;
    const gy = f.offY;
    const gw = (f.maxLon - f.minLon || 1e-6) * f.scale;
    const gh = (f.maxLat - f.minLat || 1e-6) * f.scale;
    const { rows, cols } = split!;

    doc.setDrawColor(...SLATE_400);
    doc.setLineWidth(0.3);
    for (let i = 0; i <= cols; i++) {
      doc.line(gx + (gw / cols) * i, gy, gx + (gw / cols) * i, gy + gh);
    }
    for (let j = 0; j <= rows; j++) {
      doc.line(gx, gy + (gh / rows) * j, gx + gw, gy + (gh / rows) * j);
    }
    for (const cell of split!.cells) {
      const cx = gx + (gw / cols) * (cell.col + 0.5);
      const cy = gy + (gh / rows) * (cell.row + 0.5);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE_800);
      doc.text(cell.label, cx, cy, { align: "center", baseline: "middle" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_500);
      doc.text(`${cell.parcels.length} lahan`, cx, cy + 6, { align: "center" });
    }
    drawMapDecorations(doc, fullLayout, mapBox);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  const noteParts = useGrid
    ? [`Peta ikhtisar — tiap sel grid (${split!.cells.map((c) => c.label).join(", ")}) dirinci pada halaman berikutnya; label nomor = kolom No pada tabel.`]
    : ["Label nomor pada peta = kolom No pada tabel."];
  if (fullLayout.skippedNos.length > 0) {
    noteParts.push(`${fullLayout.skippedNos.length} lahan tanpa geometri tidak tergambar (No ${fullLayout.skippedNos.join(", ")}).`);
  }
  doc.text(noteParts.join(" "), MARGIN, pageHeight - MARGIN + 3, { maxWidth: pageWidth - MARGIN * 2 });

  // ── Halaman per sel grid (atlas) ──
  if (useGrid) {
    split!.cells.forEach((cell, idx) => {
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE_800);
      doc.text(`Peta ${cell.label} (${idx + 1}/${split!.cells.length}) — ${cell.parcels.length} lahan`, MARGIN, 12);

      const cellBox = { x: MARGIN, y: 16, w: pageWidth - MARGIN * 2, h: pageHeight - 16 - MARGIN, pad: 6 };
      doc.setDrawColor(...SLATE_200);
      doc.setLineWidth(0.4);
      doc.rect(cellBox.x, cellBox.y, cellBox.w, cellBox.h);

      const cellLayout = buildLandParcelMapLayout(cell.parcels, cellBox);
      drawLayoutPolygons(doc, cellLayout);
      drawLayoutLabels(doc, cellLayout, linesByNo, cellBox);
      drawMapDecorations(doc, cellLayout, cellBox);
      drawMiniIndex(doc, split!, cell, pageWidth);
    });
  }

  // ── Tabel ──
  doc.addPage();
  autoTable(doc, {
    head: [columns.map((c) => c.header)],
    body: data.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        return val !== undefined && val !== null ? String(val) : "—";
      }),
    ),
    startY: 14,
    theme: "striped",
    headStyles: { fillColor: EMERALD, textColor: [255, 255, 255], fontSize: 10, fontStyle: "bold" },
    bodyStyles: { fontSize: 9, textColor: SLATE_700 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
    margin: { top: 14, left: MARGIN, right: MARGIN },
    styles: { font: "helvetica", cellPadding: 3 },
  });

  // Nomor halaman di kanan bawah tiap halaman.
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_400);
    const pageText = `Halaman ${i} dari ${pageCount}`;
    doc.text(pageText, pageWidth - MARGIN - doc.getTextWidth(pageText), pageHeight - 6);
  }

  return doc;
}

export function exportLandParcelReportPDF(input: LpPdfInput) {
  buildLandParcelReportDoc(input).save(`${input.filename}.pdf`);
}
