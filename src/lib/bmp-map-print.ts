import jsPDF from "jspdf";
import autoTable, { type CellHookData, type Styles } from "jspdf-autotable";

export type BmpPrintLegendItem = {
  color: string;
  label: string;
  count: number;
  /** NONE is drawn outline-only on the map; mirror that in the legend swatch. */
  outlineOnly?: boolean;
};

/** One parcel row for the availability matrix (production = kg per YYYY-MM). */
export type BmpPrintMatrixRow = {
  name: string;
  farmerCode: string;
  parcelId: string;
  production: Record<string, number>;
};

const fmtKg = (kg: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(kg);

/** The availability matrix: enumerated month columns + parcel rows. */
export type BmpPrintMatrix = {
  periods: string[];
  rows: BmpPrintMatrixRow[];
};

export type BmpPrintOptions = {
  title: string;
  subtitle?: string;
  /** PNG data URL of the rendered map canvas. */
  imageDataUrl: string;
  imageWidthPx: number;
  imageHeightPx: number;
  legend: BmpPrintLegendItem[];
  /** Optional: appended as landscape page(s) after the map. */
  matrix?: BmpPrintMatrix;
  fileName?: string;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = Number.parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Build a landscape A4 PDF of the BMP thematic map: title/subtitle header, the
 * rendered map image (aspect-fit), and a data-availability legend row with the
 * per-category parcel counts.
 */
export function generateBmpMapPdf(opts: BmpPrintOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // 297
  const pageH = doc.internal.pageSize.getHeight(); // 210
  const margin = 10;

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(20);
  doc.text(opts.title, margin, margin + 3);

  let headerBottom = margin + 6;
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(110);
    doc.text(opts.subtitle, margin, margin + 9);
    headerBottom = margin + 11;
  }
  doc.setTextColor(0);

  // ── Legend row (bottom) ─────────────────────────────────────────────────────
  const legendH = 12;
  const legendY = pageH - margin - legendH;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const legendLabel = "Legenda Ketersediaan Data:";
  const baselineY = legendY + legendH / 2 + 1.5;
  doc.text(legendLabel, margin, baselineY);
  let lx = margin + doc.getTextWidth(legendLabel) + 6;

  const swatch = 4;
  doc.setFont("helvetica", "normal");
  for (const item of opts.legend) {
    const [r, g, b] = hexToRgb(item.color);
    doc.setDrawColor(r, g, b);
    if (item.outlineOnly) doc.setFillColor(255, 255, 255);
    else doc.setFillColor(r, g, b);
    doc.rect(lx, baselineY - swatch, swatch, swatch, "FD");
    lx += swatch + 2;

    const text = `${item.label} (${item.count})`;
    doc.setTextColor(0);
    doc.text(text, lx, baselineY);
    lx += doc.getTextWidth(text) + 8;
  }

  // ── Map image (aspect-fit between header and legend) ────────────────────────
  const gap = 4;
  const areaX = margin;
  const areaY = headerBottom + gap;
  const areaW = pageW - margin * 2;
  const areaH = legendY - gap - areaY;

  const ratio = opts.imageWidthPx / opts.imageHeightPx || 1;
  let drawW = areaW;
  let drawH = drawW / ratio;
  if (drawH > areaH) {
    drawH = areaH;
    drawW = drawH * ratio;
  }
  const drawX = areaX + (areaW - drawW) / 2;
  const drawY = areaY + (areaH - drawH) / 2;

  doc.addImage(opts.imageDataUrl, "PNG", drawX, drawY, drawW, drawH);
  doc.setDrawColor(200);
  doc.rect(drawX, drawY, drawW, drawH);

  // ── Availability matrix page(s) ─────────────────────────────────────────────
  renderMatrixPages(doc, opts, margin);

  doc.save(opts.fileName ?? "peta-bmp.pdf");
}

/** Append the per-parcel × month availability matrix as landscape page(s). */
function renderMatrixPages(doc: jsPDF, opts: BmpPrintOptions, margin: number) {
  const matrix = opts.matrix;
  if (!matrix || matrix.rows.length === 0) return;

  const pageW = doc.internal.pageSize.getWidth();
  doc.addPage("a4", "landscape");

  const drawPageTitle = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(`${opts.title} — Ketersediaan Data per Lahan`, margin, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(
      "Angka = total produksi (kg) pada bulan tsb · sel hijau = ada data · header kolom = bulan.",
      margin,
      18
    );
    doc.setTextColor(0);
  };

  if (matrix.periods.length === 0) {
    drawPageTitle();
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text("Belum ada data produksi yang tertaut ke lahan pada Lembaga Petani ini.", margin, 28);
    doc.setTextColor(0);
    return;
  }

  // Group months by year for the two-row header.
  const groups: { year: string; months: number[] }[] = [];
  for (const p of matrix.periods) {
    const year = p.slice(0, 4);
    const month = Number(p.slice(5, 7));
    let g = groups.find((x) => x.year === year);
    if (!g) {
      g = { year, months: [] };
      groups.push(g);
    }
    g.months.push(month);
  }

  const head = [
    [
      { content: "Nama", rowSpan: 2 },
      { content: "ID Petani", rowSpan: 2 },
      { content: "ID Lahan", rowSpan: 2 },
      ...groups.map((g) => ({ content: g.year, colSpan: g.months.length })),
    ],
    groups.flatMap((g) => g.months.map((m) => ({ content: String(m) }))),
  ];

  const body = matrix.rows.map((r) => [
    r.name,
    r.farmerCode,
    r.parcelId,
    ...matrix.periods.map((p) => (r.production[p] !== undefined ? fmtKg(r.production[p]) : "")),
  ]);

  const idW = [34, 24, 28];
  const monthW = (pageW - margin * 2 - (idW[0] + idW[1] + idW[2])) / matrix.periods.length;
  const columnStyles: Record<string, Partial<Styles>> = {
    0: { cellWidth: idW[0], halign: "left" },
    1: { cellWidth: idW[1], halign: "left" },
    2: { cellWidth: idW[2], halign: "left" },
  };
  for (let i = 0; i < matrix.periods.length; i++) {
    columnStyles[String(3 + i)] = { cellWidth: monthW, halign: "center", fontSize: 5 };
  }

  autoTable(doc, {
    head,
    body,
    columnStyles,
    startY: 22,
    margin: { top: 20, left: margin, right: margin, bottom: 12 },
    theme: "grid",
    styles: {
      fontSize: 6,
      cellPadding: 0.8,
      halign: "center",
      valign: "middle",
      lineColor: [210, 210, 210],
      lineWidth: 0.1,
      textColor: 30,
      overflow: "hidden",
    },
    headStyles: {
      fillColor: [238, 238, 238],
      textColor: 40,
      fontStyle: "bold",
      lineColor: [210, 210, 210],
      lineWidth: 0.1,
    },
    didParseCell: (d: CellHookData) => {
      // Month cell with a value → light-green fill + dark-green text (readable).
      if (d.section === "body" && d.column.index >= 3 && d.cell.text.join("").trim() !== "") {
        d.cell.styles.fillColor = [209, 240, 224];
        d.cell.styles.textColor = [22, 101, 52];
      }
    },
    didDrawPage: drawPageTitle,
  });
}
