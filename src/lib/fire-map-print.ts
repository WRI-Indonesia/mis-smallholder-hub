import jsPDF from "jspdf";
import { imageFormatOf } from "@/lib/map-capture";
import { formatNumber } from "@/lib/format";
import { formatDateList, formatHotspotDay, type AreaSummary, type DailyCount } from "@/lib/fire-alert";
import autoTable, { type UserOptions } from "jspdf-autotable";

/**
 * "Laporan Titik Api (Hotspot)" — PDF A4 portrait Dashboard Fire Alert (#266),
 * layout mockup owner 2026-08-19: header logo WRI + meta, kartu ringkasan,
 * peta sebaran, tabel detail titik dalam boundary, peta per lembaga ber-titik
 * api, catatan metodologi. Font **Acumin Pro** (TTF hasil konversi
 * `public/fonts/*.woff` CFF→TrueType) di-embed bila tersedia — fallback
 * helvetica. Boundary lembaga (ICS) sudah dibuat TERMASUK buffer 1,5 km.
 * Build dipisah dari save (pola TD-019) untuk unit test.
 *
 * Varian **Laporan Bulanan** (#365, `opts.monthly`): judul & label meta
 * berubah, dan setelah kartu ringkasan disisipkan Tren Harian, Rekap per
 * Kabupaten, Rekap per Lembaga; catatan metodologi menyebut sumber FIRMS
 * yang dipakai (arsip SP / NRT) dan tanggal yang kosong. Struktur lainnya
 * (peta, tabel detail lengkap, lampiran per lembaga) sama — prinsip #287:
 * laporan tidak dipangkas.
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
  /** Berapa dari `count` yang berada di wilayah tumpang-tindih lembaga lain. */
  shared: number;
  dataUrl: string;
  widthPx: number;
  heightPx: number;
};

/** Baris rekap lembaga laporan bulanan — hanya lembaga ber-titik api. */
export type FireGroupSummaryRow = {
  name: string;
  districtName: string;
  count: number;
  high: number;
  shared: number;
};

export type FireMonthlySection = {
  daily: DailyCount[];
  /** Full Riau: kabupaten program + "Kab. Lainnya"; per Distrik: satu baris. */
  byKabupaten: AreaSummary[];
  byGroup: FireGroupSummaryRow[];
  /** Kalimat sumber (`describeHotspotSources`) untuk catatan metodologi. */
  sourceNote: string;
  /** Tanggal (UTC) yang tak tersedia di FIRMS — dicetak eksplisit, bukan diam-diam 0. */
  missingDates: string[];
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
  /** Data URL capture peta (JPEG); null = kotak placeholder (mis. capture gagal). */
  imageDataUrl: string | null;
  imageWidthPx: number;
  imageHeightPx: number;
  rows: FireReportRow[];
  /** Peta per lembaga ber-titik api — halaman lampiran setelah tabel. */
  groupMaps?: FireGroupMap[];
  /** Seksi khusus laporan bulanan (#365); kosong = laporan rentang live. */
  monthly?: FireMonthlySection;
  fileName?: string;
};

const MARGIN = 12;

export function buildFireMapDoc(opts: FireReportOptions): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
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
  doc.text(
    opts.monthly ? "Laporan Bulanan Titik Api (Hotspot)" : "Laporan Titik Api (Hotspot)",
    MARGIN,
    y0 + 5.5
  );

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
  metaRow(opts.monthly ? "Periode" : "Rentang Waktu", opts.rangeLabel, metaY + 10);
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
    { value: formatNumber(s.total), label: "Total Titik Api", color: RED, fill: [250, 235, 235] },
    {
      value: `${formatNumber(s.high)} / ${formatNumber(s.nominal)} / ${formatNumber(s.low)}`,
      label: "Tinggi / Nominal (Medium) / Rendah",
      color: AMBER,
      fill: [253, 244, 226],
    },
    {
      value: formatNumber(s.inside),
      label: "Dalam Boundary Lembaga (termasuk buffer 1,5 km)",
      color: RED,
      fill: [250, 235, 235],
    },
    {
      value: formatNumber(s.groupsAffected),
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

  // ── Seksi laporan bulanan: tren harian, rekap kabupaten, rekap lembaga ────
  if (opts.monthly) {
    y = drawMonthlySections(doc, F, opts.monthly, y);
  }

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
      // Tanpa kolom "Status Tindak Lanjut" — laporan ini murni ALERT
      // (keputusan owner 2026-08-19), bukan pelacakan tindak lanjut.
      head: [
        ["No", "Waktu Deteksi", "Satelit", "Keyakinan", "FRP (MW)", "Lintang", "Bujur", "Lembaga"],
      ],
      body: opts.rows.map((r, i) => [
        formatNumber(i + 1),
        r.timeWib,
        r.satellite,
        r.confidence,
        r.frp,
        r.lat,
        r.lng,
        r.groupName,
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
        0: { cellWidth: 9, halign: "center" },
        1: { cellWidth: 30 },
        2: { cellWidth: 22 },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 16, halign: "center" },
        5: { cellWidth: 19, halign: "right" },
        6: { cellWidth: 20, halign: "right" },
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
          } else if (v.startsWith("Nominal")) {
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
      doc.text(
        `${gm.name} — ${formatNumber(gm.count)} titik api${gm.shared > 0 ? ` (${formatNumber(gm.shared)} di wilayah tumpang-tindih)` : ""}`,
        MARGIN,
        y
      );
      y += 2.5;
      y = drawMapImage(doc, gm.dataUrl, gm.widthPx, gm.heightPx, y, contentW, 100);
      y += 8;
    }
    y += 1;
  }

  // ── Catatan metodologi (paling akhir) ─────────────────────────────────────
  // Laporan bulanan menyebut sumber yang benar-benar dipakai (arsip SP tidak
  // punya "jeda ±3 jam") dan tanggal kosong — pembaca harus tahu angka 0 di
  // tanggal itu bukan "tidak ada api".
  const sourceSentence = opts.monthly
    ? `Sumber: ${opts.monthly.sourceNote}. Hari dihitung menurut tanggal UTC (satuan satelit).` +
      (opts.monthly.missingDates.length > 0
        ? ` Tanggal ${formatDateList(opts.monthly.missingDates)} tidak tersedia di FIRMS saat laporan dibuat dan TIDAK termasuk dalam angka.`
        : "")
    : "Sumber: NASA FIRMS (LANCE/EOSDIS), jeda pembaruan data ±3 jam.";
  const note =
    "Catatan metodologi: Data merupakan deteksi anomali panas VIIRS resolusi 375 m, bukan konfirmasi kebakaran di " +
    `lapangan. ${sourceSentence} Tabel hanya memuat titik hotspot ` +
    "yang berada dalam boundary lembaga petani dampingan (boundary sudah termasuk buffer 1,5 km). Titik pada " +
    "wilayah boundary yang tumpang-tindih diatribusikan ke tiap lembaga pemiliknya; angka ringkasan menghitung titik unik.";
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

const lastTableY = (doc: jsPDF, fallback: number) =>
  (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;

/** Tiga seksi laporan bulanan setelah kartu ringkasan; kembalikan y bawah. */
function drawMonthlySections(
  doc: jsPDF,
  F: string,
  m: FireMonthlySection,
  y: number
): number {
  const pageH = doc.internal.pageSize.getHeight();
  const heading = (title: string) => {
    // Judul + minimal 2 baris tabel harus muat, kalau tidak pindah halaman.
    if (y + 18 > pageH - MARGIN) {
      doc.addPage("a4", "portrait");
      y = MARGIN + 4;
    }
    doc.setFont(F, "bold");
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(title, MARGIN, y);
    y += 3.5;
  };
  const table = (o: UserOptions) => {
    autoTable(doc, {
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
      headStyles: {
        font: F,
        fillColor: RED,
        textColor: 255,
        fontStyle: "bold",
        lineColor: [215, 215, 215],
        lineWidth: 0.1,
      },
      alternateRowStyles: { fillColor: [246, 246, 246] },
      ...o,
    });
    y = lastTableY(doc, y) + 8;
  };
  const num = (n: number) => formatNumber(n);

  // Tren harian — bar porsi terhadap hari terbanyak; hari puncak ditebalkan
  // merah; tanggal kosong ditandai eksplisit, bukan 0 yang menyesatkan.
  heading("Tren Harian");
  const maxTotal = Math.max(0, ...m.daily.filter((d) => d.available).map((d) => d.total));
  table({
    head: [["Tanggal (UTC)", "Dalam Boundary", "Luar Boundary", "Total", "Porsi terhadap hari puncak"]],
    body: m.daily.map((d) => [
      formatHotspotDay(d.date),
      d.available ? num(d.inside) : "—",
      d.available ? num(d.outside) : "—",
      d.available ? num(d.total) : "—",
      d.available ? "" : "tidak tersedia di FIRMS",
    ]),
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 28, halign: "right" },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 22, halign: "right", fontStyle: "bold" },
      4: { halign: "left", textColor: 120, fontStyle: "italic" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      const row = m.daily[d.row.index];
      if (row?.available && maxTotal > 0 && row.total === maxTotal && d.column.index <= 3) {
        d.cell.styles.textColor = RED;
        d.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell: (d) => {
      if (d.section !== "body" || d.column.index !== 4) return;
      const row = m.daily[d.row.index];
      if (!row?.available || maxTotal === 0 || row.total === 0) return;
      const w = (d.cell.width - 3) * (row.total / maxTotal);
      doc.setFillColor(...(row.total === maxTotal ? RED : AMBER));
      doc.rect(d.cell.x + 1.5, d.cell.y + 1.2, w, d.cell.height - 2.4, "F");
    },
  });

  // Rekap per kabupaten + baris total.
  heading("Rekap per Kabupaten");
  const kabTotal = m.byKabupaten.reduce(
    (acc, r) => ({ total: acc.total + r.total, inside: acc.inside + r.inside, high: acc.high + r.high }),
    { total: 0, inside: 0, high: 0 }
  );
  table({
    head: [["Kabupaten", "Total Titik Api", "Dalam Boundary", "Keyakinan Tinggi"]],
    body: [
      ...m.byKabupaten.map((r) => [r.name, num(r.total), num(r.inside), num(r.high)]),
      ["Total", num(kabTotal.total), num(kabTotal.inside), num(kabTotal.high)],
    ],
    columnStyles: {
      1: { cellWidth: 34, halign: "right" },
      2: { cellWidth: 34, halign: "right" },
      3: { cellWidth: 34, halign: "right" },
    },
    didParseCell: (d) => {
      if (d.section === "body" && d.row.index === m.byKabupaten.length) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = [238, 238, 238];
      }
    },
  });

  // Rekap per lembaga — hanya yang ber-titik api (konsisten dengan panel & lampiran).
  heading("Rekap per Lembaga (ber-titik api)");
  if (m.byGroup.length === 0) {
    doc.setFont(F, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(80);
    doc.text("Tidak ada titik api dalam boundary lembaga pada periode ini.", MARGIN, y + 5);
    y += 14;
  } else {
    table({
      head: [["No", "Lembaga", "Kabupaten", "Titik Api", "Keyakinan Tinggi", "Di Wilayah Tumpang-tindih"]],
      body: m.byGroup.map((r, i) => [
        num(i + 1),
        r.name,
        r.districtName,
        num(r.count),
        num(r.high),
        r.shared > 0 ? num(r.shared) : "—",
      ]),
      columnStyles: {
        0: { cellWidth: 9, halign: "center" },
        2: { cellWidth: 30 },
        3: { cellWidth: 22, halign: "right", fontStyle: "bold" },
        4: { cellWidth: 28, halign: "right" },
        5: { cellWidth: 36, halign: "right" },
      },
    });
  }
  return y;
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
  // Capture peta kini JPEG (lihat encodeMapCapture); placeholder/test bisa PNG —
  // format diturunkan dari data URL-nya lewat helper bersama, satu aturan.
  doc.addImage(dataUrl, imageFormatOf(dataUrl), drawX, y, drawW, drawH);
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.rect(drawX, y, drawW, drawH);
  return y + drawH;
}

export function generateFireMapPdf(opts: FireReportOptions) {
  buildFireMapDoc(opts).save(opts.fileName ?? "laporan-titik-api.pdf");
}
