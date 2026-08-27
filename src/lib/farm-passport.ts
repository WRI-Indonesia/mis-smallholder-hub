import { documentTypeShort, LAND_PROGRAM_LABELS, LAND_PROGRAM_STATUS_LABELS } from "@/lib/land-parcel-satellite-format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Position } from "geojson";
import type { ParcelPassport } from "@/types/map";

const EMERALD: [number, number, number] = [16, 185, 129];
const SLATE_800: [number, number, number] = [30, 41, 59];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_400: [number, number, number] = [148, 163, 184];
const SLATE_200: [number, number, number] = [226, 232, 240];
const AREA_FILL: [number, number, number] = [209, 240, 224];

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Batas bawah konten sebelum footer; lewat ini → halaman baru (#298: PDF boleh >1 halaman). */
const CONTENT_BOTTOM = 268;


const fmtArea = (n: number | null) =>
  n == null ? "—" : `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ha`;

const fmtNum = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const orDash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

/** Footer tiap halaman: catatan hukum + brand + nomor halaman. */
function drawFooter(doc: jsPDF, page: number, total: number) {
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 275, PAGE_W - MARGIN, 275);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...SLATE_400);
  doc.text(
    "Catatan: Dokumen ini menampilkan informasi pertanian yang dipetakan beserta catatan legalitas yang tercatat di sistem; bukan bukti kepemilikan legal atas tanah.",
    MARGIN,
    280,
    { maxWidth: CONTENT_W - 40 },
  );
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...EMERALD);
  doc.text("Smallholder HUB", PAGE_W - MARGIN, 288, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  doc.text(`Hal. ${page}/${total}`, PAGE_W - MARGIN, 280, { align: "right" });
}

/** Pastikan masih ada ruang `need` mm sebelum footer; kalau tidak, halaman baru. Mengembalikan y baru. */
function ensureSpace(doc: jsPDF, y: number, need: number): number {
  if (y + need <= CONTENT_BOTTOM) return y;
  doc.addPage();
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, PAGE_W, 2, "F");
  return 16;
}

/** Exterior ring of a Polygon / MultiPolygon, with the duplicate closing point removed. */
function exteriorRing(geometry: ParcelPassport["parcel"]["geometry"]): Position[] {
  const ring = geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates[0]?.[0];
  if (!ring || ring.length < 3) return [];
  const last = ring[ring.length - 1];
  const first = ring[0];
  return last[0] === first[0] && last[1] === first[1] ? ring.slice(0, -1) : ring;
}

/** Draw the parcel polygon fitted (aspect-preserving) inside the given mm box. */
function drawPolygon(doc: jsPDF, geometry: ParcelPassport["parcel"]["geometry"], box: { x: number; y: number; w: number; h: number }, label: string) {
  const ring = exteriorRing(geometry);
  if (ring.length < 3) {
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_400);
    doc.text("Geometri lahan tidak tersedia", box.x + box.w / 2, box.y + box.h / 2, { align: "center" });
    return;
  }

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const spanLon = maxLon - minLon || 1e-6;
  const spanLat = maxLat - minLat || 1e-6;
  const pad = 6;
  const availW = box.w - pad * 2;
  const availH = box.h - pad * 2;
  const s = Math.min(availW / spanLon, availH / spanLat);
  const drawW = spanLon * s;
  const drawH = spanLat * s;
  const offX = box.x + pad + (availW - drawW) / 2;
  const offY = box.y + pad + (availH - drawH) / 2;

  // Project lon/lat → mm (flip Y so north is up).
  const pts = ring.map(([lon, lat]) => [offX + (lon - minLon) * s, offY + (maxLat - lat) * s] as [number, number]);
  const segs = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);

  doc.setDrawColor(...EMERALD);
  doc.setFillColor(...AREA_FILL);
  doc.setLineWidth(0.6);
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], "FD", true);

  // Label at the polygon's drawn centroid.
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_600);
  doc.text(label, cx, cy, { align: "center", baseline: "middle" });
}

function sectionHeading(doc: jsPDF, text: string, y: number) {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(...EMERALD);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 1.5, MARGIN + 26, y + 1.5);
}

/**
 * Build dokumen Profil Lahan (tanpa save) — dipisah dari
 * `generateFarmPassportPdf` agar bisa diverifikasi unit test (TD-019).
 */
export function buildFarmPassportDoc(data: ParcelPassport): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const { farmer, group, parcel, legal, training, production } = data;

  // ── Komposisi (#298, rombak total atas masukan owner "terlalu rapat"):
  //   hal. 1 — header ber-ID besar, 4 kartu ringkasan (cermin halaman web),
  //            peta (kiri) + Informasi Lahan & Pemilik (kanan), Legalitas & Dokumen
  //   hal. 2 — Pelatihan, Produksi (dengan Ton/Ha)
  //   Footer + nomor halaman di semua halaman; tabel boleh pecah halaman.
  const tableCommon = {
    margin: { left: MARGIN, right: MARGIN, bottom: PAGE_H - CONTENT_BOTTOM }, // jangan menabrak footer
    styles: { font: "helvetica", cellPadding: 2.6 },
    pageBreak: "auto" as const,
    headStyles: { fillColor: EMERALD, textColor: [255, 255, 255] as [number, number, number], fontSize: 9, fontStyle: "bold" as const },
    bodyStyles: { fontSize: 9, textColor: SLATE_600 },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  };
  const now = new Date();
  const plantAge = parcel.plantingYear != null ? now.getFullYear() - parcel.plantingYear : null;

  // ── Header
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, PAGE_W, 4, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  doc.text("SMALLHOLDER HUB  ·  PROFIL LAHAN", MARGIN, 14);
  doc.text(`Dicetak ${fmtDate(now.toISOString())}`, PAGE_W - MARGIN, 14, { align: "right" });
  doc.setFontSize(20);
  doc.setFont("courier", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text(parcel.parcelId, MARGIN, 24);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  doc.text(`Milik ${farmer.name}  ·  ${orDash(group.name)}  ·  ${orDash(group.districtName)}, ${orDash(group.provinceName)}`, MARGIN, 30);
  // Badge PSR / komoditas di kanan
  // Badge hanya untuk yang bermakna: PSR (bila ya) dan komoditas — "Non-PSR" tidak ditampilkan (owner).
  const badges = [parcel.isPsr ? "PSR (replanting)" : null, parcel.cropType ?? null].filter((b): b is string => Boolean(b));
  let bx = PAGE_W - MARGIN;
  doc.setFontSize(7.5);
  for (const b of badges.reverse()) {
    const w = doc.getTextWidth(b) + 5;
    bx -= w;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(...SLATE_200);
    doc.roundedRect(bx, 20, w, 6, 1.5, 1.5, "FD");
    doc.setTextColor(...SLATE_600);
    doc.text(b, bx + w / 2, 24.1, { align: "center" });
    bx -= 2;
  }
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 35, PAGE_W - MARGIN, 35);

  // ── 4 kartu ringkasan
  const docTypes = [...new Set(legal.documents.map((d) => documentTypeShort(d.type)))];
  const legalValue = legal.documents.length === 0 && legal.stdbs.length === 0 ? "—" : [docTypes.join(" · ") || null, legal.stdbs.length ? "STDB" : null].filter(Boolean).join(" + ");
  const legalSub = legal.documents.length === 0 && legal.stdbs.length === 0 ? "Belum ada surat / STDB" : `${legal.documents.length} surat · ${legal.stdbs.length} STDB`;
  const cards: { title: string; value: string; sub: string }[] = [
    { title: "LUAS", value: fmtArea(parcel.area), sub: [parcel.blok ? `Blok ${parcel.blok}` : null, parcel.treeCount > 0 ? `${fmtNum(parcel.treeCount)} pohon` : null].filter(Boolean).join(" · ") || "Blok belum diisi" },
    { title: "LEGALITAS", value: legalValue, sub: legalSub },
    { title: "TANAMAN", value: plantAge != null ? `${plantAge} tahun` : "—", sub: parcel.plantingYear != null ? `Tanam ${parcel.plantingYear}${parcel.isPsr ? " · PSR" : ""}` : "Tahun tanam belum diisi" },
    { title: "PRODUKSI", value: production.totalKg > 0 ? `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(production.totalKg / 1000)} ton` : "—", sub: production.recordCount > 0 ? `${production.recordCount} catatan` : parcel.isPsr ? "Belum ada (wajar untuk PSR)" : "Belum ada data" },
  ];
  const cardGap = 4;
  const cardW = (CONTENT_W - cardGap * 3) / 4;
  const cardY = 40;
  const cardH = 22;
  cards.forEach((c, i) => {
    const x = MARGIN + i * (cardW + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...SLATE_200);
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_400);
    doc.text(c.title, x + 4, cardY + 6);
    doc.setFontSize(12.5);
    doc.setTextColor(...SLATE_800);
    doc.text(doc.splitTextToSize(c.value, cardW - 8)[0] ?? "—", x + 4, cardY + 13);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_600);
    doc.text(doc.splitTextToSize(c.sub, cardW - 8)[0] ?? "", x + 4, cardY + 18.5);
  });

  // ── Peta (kiri) + Informasi Lahan & Pemilik (kanan)
  let y = cardY + cardH + 10;
  const mapW = CONTENT_W * 0.56;
  const mapBox = { x: MARGIN, y, w: mapW, h: 92 };
  sectionHeading(doc, "Layout Lahan", y);
  const COL2_X = MARGIN + mapW + 8;
  const COL2_W = PAGE_W - MARGIN - COL2_X;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text("Informasi Lahan", COL2_X, y);
  doc.setDrawColor(...EMERALD);
  doc.setLineWidth(0.6);
  doc.line(COL2_X, y + 1.5, COL2_X + 26, y + 1.5);
  y += 5;
  mapBox.y = y;
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.rect(mapBox.x, mapBox.y, mapBox.w, mapBox.h, "S");
  drawPolygon(doc, parcel.geometry, mapBox, parcel.parcelId.split(".").find((x) => /^[A-Z]$/i.test(x)) ?? parcel.parcelId);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  doc.text(`Titik tengah: ${parcel.centroid[1].toFixed(6)}, ${parcel.centroid[0].toFixed(6)}`, mapBox.x + 2, mapBox.y + mapBox.h - 3);

  const colW = COL2_W;
  const attr = (items: { label: string; value: string }[], x: number, yy: number, labelW: number, maxW: number) => {
    let cy = yy;
    for (const it of items) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_400);
      doc.text(it.label, x, cy);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE_800);
      const lines = doc.splitTextToSize(it.value, maxW - labelW) as string[];
      doc.text(lines, x + labelW, cy);
      cy += 6 * Math.max(1, lines.length);
    }
    return cy;
  };
  let ry = y + 5;
  ry = attr(
    [
      { label: "Luas", value: fmtArea(parcel.area) },
      { label: "Blok", value: orDash(parcel.blok) },
      { label: "Kelompok Tani", value: orDash(parcel.subGroupLv2) },
      { label: "Status Lahan", value: orDash(parcel.landStatus) },
      { label: "Komoditas", value: `${orDash(parcel.cropType)}${parcel.species ? ` (${parcel.species})` : ""}` },
      { label: "Tahun Tanam", value: `${orDash(parcel.plantingYear)}${plantAge != null ? ` (${plantAge} th)` : ""}${parcel.isPsr ? " · PSR" : ""}` },
      { label: "Pohon Sawit", value: parcel.treeCount > 0 ? `${fmtNum(parcel.treeCount)}${parcel.area ? ` (${fmtNum(Math.round(parcel.treeCount / parcel.area))}/ha)` : ""}` : "—" },
    ],
    COL2_X,
    ry,
    28,
    colW,
  );
  ry += 4;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text("Pemilik", COL2_X, ry);
  doc.setDrawColor(...EMERALD);
  doc.line(COL2_X, ry + 1.5, COL2_X + 26, ry + 1.5);
  ry += 5.5;
  ry = attr(
    [
      { label: "Nama", value: farmer.name },
      { label: "ID Petani", value: orDash(farmer.code) },
      { label: "Jenis Kelamin", value: farmer.gender === "M" ? "Laki-laki" : farmer.gender === "F" ? "Perempuan" : "—" },
      { label: "Lahir", value: `${orDash(farmer.birthPlace)}, ${fmtDate(farmer.birthDate)}` },
      { label: "Alamat", value: orDash(farmer.address) },
      { label: "Lembaga", value: `${orDash(group.name)}${group.code ? ` (${group.code})` : ""}` },
      { label: "Bergabung", value: orDash(farmer.joinedYear) },
    ],
    COL2_X,
    ry,
    28,
    colW,
  );
  y = Math.max(mapBox.y + mapBox.h, ry) + 6;
  if (parcel.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...SLATE_600);
    const lines = doc.splitTextToSize(`Catatan: ${parcel.notes}`, CONTENT_W) as string[];
    doc.text(lines, MARGIN, y + 2);
    y += 4.5 * lines.length + 4;
  }

  // ── Legalitas & Dokumen
  y = ensureSpace(doc, y, 36);
  sectionHeading(doc, "Legalitas & Dokumen", y);
  y += 5;
  const docShort = documentTypeShort;
  const fmtDiff = (stated: number | null) =>
    stated == null || parcel.area == null ? "—" : `${stated - parcel.area > 0 ? "+" : ""}${fmtArea(stated - parcel.area)}`;
  if (legal.documents.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_400);
    doc.text("Belum ada surat kepemilikan tercatat.", MARGIN, y + 3);
    y += 9;
  } else {
    autoTable(doc, {
      head: [["Surat Kepemilikan", "Nomor", "Nama di Surat", "Luas Tertera", "Selisih vs Poligon", "Terbit", "Keterangan"]],
      body: legal.documents.map((d) => [
        d.type === "OTHER" && !d.typeRaw ? "Lainnya (jenis belum diisi)" : docShort(d.type),
        orDash(d.number),
        orDash(d.holderName),
        fmtArea(d.statedArea),
        fmtDiff(d.statedArea),
        orDash(d.issuedYear),
        orDash(d.custodyNote),
      ]),
      startY: y,
      theme: "striped",
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
      ...tableCommon,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;
  }
  if (legal.stdbs.length > 0) {
    y = ensureSpace(doc, y, 18);
    autoTable(doc, {
      head: [["STDB", "Terbit", "Nama Pemegang", "Juga mencakup"]],
      body: legal.stdbs.map((st) => [
        st.number,
        orDash(st.issuedYear),
        orDash(st.holderName),
        st.otherParcelIds.length ? st.otherParcelIds.join(", ") : "Hanya lahan ini",
      ]),
      startY: y,
      theme: "striped",
      columnStyles: { 1: { halign: "right" } },
      ...tableCommon,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;
  }
  const metaLines: string[] = [];
  if (legal.stdbs.length === 0) metaLines.push("STDB: belum tercatat.");
  if (legal.externalIds.length > 0) metaLines.push(`UL Parcel Code: ${legal.externalIds.map((e) => `${e.code} (${e.source})`).join(", ")}`);
  if (legal.programs.length > 0) {
    metaLines.push(
      `Program: ${legal.programs
        .map((pg) => `${LAND_PROGRAM_LABELS[pg.programType] ?? pg.programType} — ${LAND_PROGRAM_STATUS_LABELS[pg.status] ?? pg.status}${pg.startDate || pg.endDate ? ` (${fmtDate(pg.startDate)} – ${fmtDate(pg.endDate)})` : ""}`)
        .join("; ")}`,
    );
  }
  if (metaLines.length > 0) {
    y = ensureSpace(doc, y, 6 * metaLines.length);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_600);
    for (const line of metaLines) {
      const wrapped = doc.splitTextToSize(line, CONTENT_W) as string[];
      doc.text(wrapped, MARGIN, y + 2);
      y += 4.5 * wrapped.length + 1.5;
    }
  }

  // ── Halaman 2: Pelatihan + Produksi
  y = ensureSpace(doc, y, 999);
  sectionHeading(doc, "Pelatihan", y);
  y += 5;
  autoTable(doc, {
    head: [["Paket Pelatihan", "Status", "Tanggal Mengikuti"]],
    body: training.map((t) => [t.label, t.completed ? "Selesai" : "Belum", t.date ? fmtDate(t.date) : "—"]),
    startY: y,
    theme: "striped",
    ...tableCommon,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;

  y = ensureSpace(doc, y, production.recordCount === 0 ? 14 : 36);
  sectionHeading(doc, "Produksi", y);
  y += 5;
  if (production.recordCount === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_400);
    doc.text(`Belum ada data produksi.${parcel.isPsr ? " Lahan PSR (replanting) — belum berproduksi adalah wajar." : ""}`, MARGIN, y + 3);
    y += 9;
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_600);
    doc.text(`Produksi panen dalam kg  ·  Total tercatat ${fmtNum(production.totalKg)} kg dari ${production.recordCount} catatan`, MARGIN, y + 1);
    y += 5;
    const cell = (n: number) => (n > 0 ? fmtNum(n) : "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthCols: Record<number, any> = {};
    for (let i = 1; i <= 12; i++) monthCols[i] = { halign: "right" };
    const tonHa = (kg: number) => (parcel.area && parcel.area > 0 ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(kg / 1000 / parcel.area) : "—");
    autoTable(doc, {
      head: [["Tahun", ...MONTHS_ID, "Total (kg)", "Ton/Ha"]],
      body: production.byYear.map((yr) => [String(yr.year), ...yr.monthly.map(cell), fmtNum(yr.total), tonHa(yr.total)]),
      startY: y,
      theme: "grid",
      headStyles: { fillColor: EMERALD, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "right" },
      bodyStyles: { fontSize: 7.5, textColor: SLATE_600, halign: "right" },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" }, ...monthCols, 13: { halign: "right", fontStyle: "bold" }, 14: { halign: "right", fontStyle: "bold" } },
      margin: { left: MARGIN, right: MARGIN, bottom: PAGE_H - CONTENT_BOTTOM }, // jangan menabrak footer
      styles: { font: "helvetica", cellPadding: 1.8, overflow: "linebreak" },
      pageBreak: "auto",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_400);
    doc.text(`Ton/Ha = produksi tahun tsb ÷ luas lahan (${fmtArea(parcel.area)}).`, MARGIN, y + 2);
  }

  // Footer di SEMUA halaman
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }
  doc.setPage(total);
  return doc;
}

/** Generate and download the Farm Passport PDF for one parcel. */
export function generateFarmPassportPdf(data: ParcelPassport) {
  const { farmer, group, parcel } = data;
  const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "_");
  buildFarmPassportDoc(data).save(
    `Profil_Lahan_${safe(group.name)}_${safe(farmer.name)}_${safe(parcel.parcelId)}.pdf`,
  );
}
