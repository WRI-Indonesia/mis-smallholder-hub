import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * "Laporan Titik Api (Hotspot)" — PDF A4 portrait Dashboard Fire Alert (#266),
 * layout mockup owner 2026-08-19: header logo WRI + meta, kartu ringkasan,
 * peta sebaran, tabel detail titik dalam boundary, peta per lembaga ber-titik
 * api, catatan metodologi. Font **Acumin Pro** (TTF hasil konversi
 * `public/fonts/*.woff` CFF→TrueType) di-embed bila tersedia — fallback
 * helvetica. Boundary lembaga (ICS) sudah dibuat TERMASUK buffer 1,5 km.
 * Build dipisah dari save (pola TD-019) untuk unit test.
 */

const RED: [number, number, number] = [192, 0, 0];
const AMBER: [number, number, number] = [217, 119, 6];
const GRAY: [number, number, number] = [90, 90, 90];

export type FireReportRow = {
  /** Waktu deteksi terformat WIB. */
  timeWib: string;
  satellite: string;
  confidence: string;
  /** FRP dalam MW, terformat (mis. "3.2") atau "—". */
  frp: string;
  lat: string;
  lng: string;
  /** Lembaga pemilik boundary tempat titik berada. */
  groupName: string;
};

export type FireGroupMap = {
  name: string;
  count: number;
  dataUrl: string;
  widthPx: number;
  heightPx: number;
};

export type FireReportOptions = {
  /** Sub-judul di bawah judul utama (mis. "Smallholder Hub Group"). */
  subtitle: string;
  /** Nilai baris meta "Kabupaten" — daftar distrik sesuai scope cetak. */
  kabupatenLabel: string;
  /** Mis. "5 hari terakhir (14–19 Agu 2026)". */
  rangeLabel: string;
  /** Mis. "19 Agu 2026, 14.55 WIB". */
  exportedAt: string;
  /** PNG hasil rasterisasi logo SVG (jsPDF tak membaca SVG); null = tanpa logo. */
  logo: { dataUrl: string; widthPx: number; heightPx: number } | null;
  /** TTF base64 Acumin Pro; null = fallback helvetica (mis. fetch gagal). */
  fonts: { regular: string; bold: string; italic: string } | null;
  stats: {
    total: number;
    high: number;
    nominal: number;
    low: number;
    /** Titik dalam boundary lembaga (boundary sudah termasuk buffer 1,5 km). */
    inside: number;
    groupsAffected: number;
  };
  /** PNG capture peta; null = kotak placeholder (mis. capture gagal). */
  imageDataUrl: string | null;
  imageWidthPx: number;
  imageHeightPx: number;
  rows: FireReportRow[];
  /** Peta per lembaga ber-titik api — halaman lampiran setelah tabel. */
  groupMaps?: FireGroupMap[];
  fileName?: string;
};

const fmtN = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const MARGIN = 12;

export function buildFireMapDoc(opts: FireReportOptions): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // 210
  const contentW = pageW - MARGIN * 2;

  // ── Font: Acumin Pro bila tersedia ────────────────────────────────────────
  let F = "helvetica";
  if (opts.fonts) {
    doc.addFileToVFS("acumin-regular.ttf", opts.fonts.regular);
    doc.addFont("acumin-regular.ttf", "acumin", "normal");
    doc.addFileToVFS("acumin-bold.ttf", opts.fonts.bold);
    doc.addFont("acumin-bold.ttf", "acumin", "bold");
    doc.addFileToVFS("acumin-italic.ttf", opts.fonts.italic);
    doc.addFont("acumin-italic.ttf", "acumin", "italic");
    F = "acumin";
  }

  // ── Header letterhead: judul & meta rata kiri, logo pojok kanan-atas ──────
  const y0 = MARGIN + 3;
  if (opts.logo) {
    const logoW = 44;
    const ratio = opts.logo.widthPx / opts.logo.heightPx || 1;
    doc.addImage(opts.logo.dataUrl, "PNG", pageW - MARGIN - logoW, y0, logoW, logoW / ratio);
  }

  doc.setFont(F, "bold");
  doc.setFontSize(16.5);
  doc.setTextColor(...RED);
  doc.text("Laporan Titik Api (Hotspot)", MARGIN, y0 + 5.5);

  doc.setFont(F, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY);
  doc.text(opts.subtitle, MARGIN, y0 + 12);

  doc.setFontSize(9);
  doc.setTextColor(30);
  const metaRow = (label: string, value: string, yy: number) => {
    doc.setFont(F, "bold");
    doc.text(`${label}: `, MARGIN, yy);
    const w = doc.getTextWidth(`${label}: `);
    doc.setFont(F, "normal");
    doc.text(value, MARGIN + w, yy, { maxWidth: contentW - w });
  };
  const metaY = y0 + 20;
  metaRow("Provinsi", "Riau", metaY);
  metaRow("Kabupaten", opts.kabupatenLabel, metaY + 5);
  metaRow("Rentang Waktu", opts.rangeLabel, metaY + 10);
  metaRow("Tanggal Export", opts.exportedAt, metaY + 15);

  let y = metaY + 15 + 6;
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.9);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 9;

  // ── Ringkasan: 4 kartu ────────────────────────────────────────────────────
  doc.setFont(F, "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Ringkasan", MARGIN, y);
  y += 3.5;

  const cardGap = 4;
  const cardW = (contentW - cardGap * 3) / 4;
  const cardH = 21;
  const s = opts.stats;
  const cards: {
    value: string;
    label: string;
    color: [number, number, number];
    fill: [number, number, number];
  }[] = [
    { value: fmtN(s.total), label: "Total Titik Api", color: RED, fill: [250, 235, 235] },
    {
      value: `${fmtN(s.high)} / ${fmtN(s.nominal)} / ${fmtN(s.low)}`,
      label: "Tinggi / Nominal / Rendah",
      color: AMBER,
      fill: [253, 244, 226],
    },
    {
      value: fmtN(s.inside),
      label: "Dalam Boundary Lembaga (termasuk buffer 1,5 km)",
      color: RED,
      fill: [250, 235, 235],
    },
    {
      value: fmtN(s.groupsAffected),
      label: "Lembaga Terdampak",
      color: GRAY,
      fill: [238, 238, 238],
    },
  ];
  cards.forEach((c, i) => {
    const x = MARGIN + i * (cardW + cardGap);
    doc.setFillColor(...c.fill);
    doc.rect(x, y, cardW, cardH, "F");
    // Aksen bar atas tebal — satu-satunya garis, tanpa border kotak.
    doc.setDrawColor(...c.color);
    doc.setLineWidth(1.1);
    doc.line(x, y + 0.55, x + cardW, y + 0.55);
    doc.setFont(F, "bold");
    doc.setFontSize(14.5);
    doc.setTextColor(...c.color);
    doc.text(c.value, x + cardW / 2, y + 9.5, { align: "center" });
    doc.setFont(F, "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(70);
    doc.text(c.label.toUpperCase(), x + cardW / 2, y + 14, {
      align: "center",
      maxWidth: cardW - 5,
      lineHeightFactor: 1.25,
    });
  });
  y += cardH + 9;

  // ── Peta Sebaran Titik Api ────────────────────────────────────────────────
  doc.setFont(F, "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Peta Sebaran Titik Api", MARGIN, y);
  y += 3.5;
  y = drawMapImage(doc, opts.imageDataUrl, opts.imageWidthPx, opts.imageHeightPx, y, contentW, 88);
  y += 9;

  // ── Detail titik dalam boundary ───────────────────────────────────────────
  doc.setFont(F, "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Detail Titik Api dalam Boundary Lembaga (termasuk buffer 1,5 km)", MARGIN, y);
  y += 3.5;

  if (opts.rows.length === 0) {
    doc.setFont(F, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(80);
    doc.text("Tidak ada titik api dalam boundary lembaga pada rentang waktu ini.", MARGIN, y + 5);
    y += 14;
  } else {
    autoTable(doc, {
      head: [
        [
          "No",
          "Waktu Deteksi",
          "Satelit",
          "Keyakinan",
          "FRP (MW)",
          "Lintang",
          "Bujur",
          "Lembaga",
          "Status Tindak Lanjut",
        ],
      ],
      body: opts.rows.map((r, i) => [
        String(i + 1),
        r.timeWib,
        r.satellite,
        r.confidence,
        r.frp,
        r.lat,
        r.lng,
        r.groupName,
        "Menunggu verifikasi lapangan",
      ]),
      startY: y,
      margin: { top: 16, left: MARGIN, right: MARGIN, bottom: 16 },
      theme: "grid",
      styles: {
        font: F,
        fontSize: 7.5,
        cellPadding: 1.6,
        valign: "middle",
        lineColor: [215, 215, 215],
        lineWidth: 0.1,
        textColor: 30,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 26 },
        2: { cellWidth: 19 },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 14, halign: "center" },
        5: { cellWidth: 17, halign: "right" },
        6: { cellWidth: 18, halign: "right" },
        8: { cellWidth: 30 },
      },
      headStyles: {
        font: F,
        fillColor: RED,
        textColor: 255,
        fontStyle: "bold",
        lineColor: [215, 215, 215],
        lineWidth: 0.1,
      },
      alternateRowStyles: { fillColor: [246, 246, 246] },
      didParseCell: (d) => {
        // Keyakinan Tinggi merah tebal, Nominal oranye — selaras palet peta.
        if (d.section === "body" && d.column.index === 3) {
          const v = d.cell.text.join("");
          if (v === "Tinggi") {
            d.cell.styles.textColor = RED;
            d.cell.styles.fontStyle = "bold";
          } else if (v === "Nominal") {
            d.cell.styles.textColor = AMBER;
          }
        }
      },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
  }

  // ── Peta per Lembaga (hanya yang ber-titik api) ───────────────────────────
  if (opts.groupMaps && opts.groupMaps.length > 0) {
    const pageH = doc.internal.pageSize.getHeight();
    doc.addPage("a4", "portrait");
    y = MARGIN + 4;
    doc.setFont(F, "bold");
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Peta per Lembaga (ber-titik api)", MARGIN, y);
    y += 6;
    for (const gm of opts.groupMaps) {
      const ratio = gm.widthPx / gm.heightPx || 1;
      const drawH = Math.min(100, contentW / ratio);
      // Judul (5 mm) + peta harus muat; kalau tidak, halaman baru.
      if (y + 5 + drawH > pageH - MARGIN) {
        doc.addPage("a4", "portrait");
        y = MARGIN + 4;
      }
      doc.setFont(F, "bold");
      doc.setFontSize(10);
      doc.setTextColor(...RED);
      doc.text(`${gm.name} — ${fmtN(gm.count)} titik api`, MARGIN, y);
      y += 2.5;
      y = drawMapImage(doc, gm.dataUrl, gm.widthPx, gm.heightPx, y, contentW, 100);
      y += 8;
    }
    y += 1;
  }

  // ── Catatan metodologi (paling akhir) ─────────────────────────────────────
  const note =
    "Catatan metodologi: Data merupakan deteksi anomali panas VIIRS resolusi 375 m, bukan konfirmasi kebakaran di " +
    "lapangan. Sumber: NASA FIRMS (LANCE/EOSDIS), jeda pembaruan data ±3 jam. Tabel hanya memuat titik hotspot " +
    "yang berada dalam boundary lembaga petani dampingan (boundary sudah termasuk buffer 1,5 km).";
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 20) {
    doc.addPage("a4", "portrait");
    y = MARGIN + 4;
  }
  doc.setFont(F, "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text(note, MARGIN, y, { maxWidth: contentW });

  return doc;
}

/** Gambar peta aspect-fit (atau placeholder bila null); kembalikan y bawah. */
function drawMapImage(
  doc: jsPDF,
  dataUrl: string | null,
  widthPx: number,
  heightPx: number,
  y: number,
  contentW: number,
  maxH: number
): number {
  if (!dataUrl) {
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, y, contentW, 40);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Peta tidak tersedia", MARGIN + contentW / 2, y + 21, { align: "center" });
    return y + 40;
  }
  const ratio = widthPx / heightPx || 1;
  let drawW = contentW;
  let drawH = drawW / ratio;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * ratio;
  }
  const drawX = MARGIN + (contentW - drawW) / 2;
  doc.addImage(dataUrl, "PNG", drawX, y, drawW, drawH);
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.rect(drawX, y, drawW, drawH);
  return y + drawH;
}

export function generateFireMapPdf(opts: FireReportOptions) {
  buildFireMapDoc(opts).save(opts.fileName ?? "laporan-titik-api.pdf");
}
