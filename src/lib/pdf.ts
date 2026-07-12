import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFExportField {
  header: string;
  key: string;
}

export function exportToPDF({
  filename,
  title,
  subtitle,
  metadata,
  columns,
  data,
  orientation = "portrait",
  headFontSize = 10,
  bodyFontSize = 9,
  cellPadding = 3,
  columnStyles,
}: {
  filename: string;
  title: string;
  subtitle?: string;
  metadata?: { label: string; value: string }[];
  columns: PDFExportField[];
  data: Record<string, unknown>[];
  orientation?: "portrait" | "landscape";
  headFontSize?: number;
  bodyFontSize?: number;
  cellPadding?: number;
  /** autoTable columnStyles keyed by column index (e.g. widths/alignment for wide matrices). */
  columnStyles?: Record<number, Record<string, string | number>>;
}) {
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header WRI Green Accent Line
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 0, pageWidth, 4, "F");

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(title, 14, 20);

  let currentY = 26;

  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(subtitle, 14, currentY);
    currentY += 8;
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 8;

  // Metadata Info (e.g. Distrik: X, KT: Y)
  if (metadata && metadata.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // Slate-700
    
    const itemsPerRow = 2;
    const colWidth = 90;
    
    metadata.forEach((m, idx) => {
      const row = Math.floor(idx / itemsPerRow);
      const col = idx % itemsPerRow;
      const x = 14 + (col * colWidth);
      const y = currentY + (row * 6);
      
      // Label (Bold)
      doc.setFont("helvetica", "bold");
      const labelText = `${m.label}:`;
      
      // Measure width while bold font is active
      const labelWidth = doc.getTextWidth(labelText);
      doc.text(labelText, x, y);
      
      // Value (Normal)
      doc.setFont("helvetica", "normal");
      const valueText = m.value;
      doc.text(valueText, x + labelWidth + 2, y);
    });
    
    const totalRows = Math.ceil(metadata.length / itemsPerRow);
    currentY += (totalRows * 6) + 4;
  }

  // Table columns
  const tableHeaders = columns.map((col) => col.header);
  const tableRows = data.map((row) => columns.map((col) => {
    const val = row[col.key];
    return val !== undefined && val !== null ? String(val) : "—";
  }));

  // AutoTable
  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: currentY,
    theme: "striped",
    headStyles: {
      fillColor: [16, 185, 129], // Emerald-500 WRI Green
      textColor: [255, 255, 255],
      fontSize: headFontSize,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: bodyFontSize,
      textColor: [51, 65, 85], // Slate-700
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    columnStyles,
    margin: { top: 20, left: 14, right: 14 },
    styles: {
      font: "helvetica",
      cellPadding,
    },
  });

  // Add Page Numbers (Halaman X dari Y) in bottom-right corner of each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // Slate-400
    
    const pageText = `Halaman ${i} dari ${pageCount}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - 14 - pageTextWidth, pageHeight - 9);
  }

  // Save the PDF file directly
  doc.save(`${filename}.pdf`);
}
