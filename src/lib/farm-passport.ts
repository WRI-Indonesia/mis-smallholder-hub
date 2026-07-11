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
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

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
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(...EMERALD);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 1.5, MARGIN + 26, y + 1.5);
}

/** Render a label:value list; returns the y after the last row. */
function attrList(doc: jsPDF, items: { label: string; value: string }[], x: number, y: number, labelW: number) {
  let cy = y;
  doc.setFontSize(9);
  for (const it of items) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_400);
    doc.text(it.label, x, cy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_800);
    doc.text(doc.splitTextToSize(it.value, CONTENT_W / 2 - labelW - 4), x + labelW, cy);
    cy += 5.5;
  }
  return cy;
}

/** Generate and download the Farm Passport PDF for one parcel. */
export function generateFarmPassportPdf(data: ParcelPassport) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { farmer, group, parcel, training, production } = data;

  // Accent bar + header
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, PAGE_W, 4, "F");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text("Profil Lahan", MARGIN, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  doc.text("Smallholder HUB — Profil Lahan", MARGIN, 21);

  doc.setFontSize(9);
  doc.setTextColor(...SLATE_400);
  doc.text(`ID Lahan: ${parcel.parcelId}`, PAGE_W - MARGIN, 16, { align: "right" });

  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 25, PAGE_W - MARGIN, 25);

  // Identity: photo placeholder + fields
  const photo = { x: MARGIN, y: 30, w: 24, h: 24 };
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(...SLATE_200);
  doc.roundedRect(photo.x, photo.y, photo.w, photo.h, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_400);
  doc.text("FOTO", photo.x + photo.w / 2, photo.y + photo.h / 2, { align: "center", baseline: "middle" });

  const idX = photo.x + photo.w + 6;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text(farmer.name, idX, 36);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  doc.text(`ID Petani: ${orDash(farmer.code)}`, idX, 42);
  doc.text(`Kelompok Tani: ${orDash(group.name)}`, idX, 47);
  doc.text(`${orDash(group.districtName)}, ${orDash(group.provinceName)}`, idX, 52);

  // Layout Lahan
  let y = 64;
  sectionHeading(doc, "Layout Lahan", y);
  y += 4;
  const mapBox = { x: MARGIN, y, w: CONTENT_W, h: 62 };
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.rect(mapBox.x, mapBox.y, mapBox.w, mapBox.h, "S");
  drawPolygon(doc, parcel.geometry, mapBox, farmer.name);
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_600);
  doc.text(
    `Luas: ${fmtArea(parcel.area)}   •   Titik tengah: ${parcel.centroid[1].toFixed(6)}, ${parcel.centroid[0].toFixed(6)}   •   Tahun tanam: ${orDash(parcel.plantingYear)}`,
    mapBox.x + 2,
    mapBox.y + mapBox.h - 3
  );
  y += mapBox.h + 8;

  // Data Petani + Informasi Lahan (two columns)
  const COL2_X = PAGE_W / 2 + 4;
  sectionHeading(doc, "Data Petani", y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text("Informasi Lahan", COL2_X, y);
  doc.setDrawColor(...EMERALD);
  doc.setLineWidth(0.6);
  doc.line(COL2_X, y + 1.5, COL2_X + 26, y + 1.5);
  y += 6;
  const leftEnd = attrList(
    doc,
    [
      { label: "Nama", value: orDash(farmer.name) },
      { label: "ID Petani", value: orDash(farmer.code) },
      { label: "Jenis Kelamin", value: farmer.gender === "M" ? "Laki-laki" : farmer.gender === "F" ? "Perempuan" : "—" },
      { label: "Tempat, Tgl Lahir", value: `${orDash(farmer.birthPlace)}, ${fmtDate(farmer.birthDate)}` },
      { label: "Tahun Bergabung", value: orDash(farmer.joinedYear) },
    ],
    MARGIN,
    y,
    32
  );
  const rightEnd = attrList(
    doc,
    [
      { label: "Luas Lahan", value: fmtArea(parcel.area) },
      { label: "Alamat", value: orDash(farmer.address) },
      { label: "Status Lahan", value: orDash(parcel.landStatus) },
      { label: "Komoditas", value: orDash(parcel.cropType) },
      { label: "Tahun Tanam", value: orDash(parcel.plantingYear) },
    ],
    COL2_X,
    y,
    28
  );
  y = Math.max(leftEnd, rightEnd) + 6;

  // Pelatihan
  sectionHeading(doc, "Pelatihan", y);
  y += 3;
  autoTable(doc, {
    head: [["Paket Pelatihan", "Status", "Tanggal"]],
    body: training.map((t) => [t.label, t.completed ? "Selesai" : "Belum", t.date ? fmtDate(t.date) : "—"]),
    startY: y,
    theme: "striped",
    headStyles: { fillColor: EMERALD, textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 9, textColor: SLATE_600 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: MARGIN, right: MARGIN },
    styles: { font: "helvetica", cellPadding: 2.2 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // Produksi
  sectionHeading(doc, "Produksi", y);
  y += 5;
  if (production.recordCount === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_400);
    doc.text("Belum ada data produksi.", MARGIN, y + 2);
    y += 8;
  } else {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_600);
    doc.text(
      `Produksi panen (kg)  •  Total tercatat: ${fmtNum(production.totalKg)} kg dari ${production.recordCount} catatan`,
      MARGIN,
      y
    );
    y += 3;
    const cell = (n: number) => (n > 0 ? fmtNum(n) : "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthCols: Record<number, any> = {};
    for (let i = 1; i <= 12; i++) monthCols[i] = { halign: "right" };
    autoTable(doc, {
      head: [["Tahun", ...MONTHS_ID, "Total"]],
      body: production.byYear.map((yr) => [
        String(yr.year),
        ...yr.monthly.map(cell),
        fmtNum(yr.total),
      ]),
      startY: y,
      theme: "grid",
      headStyles: { fillColor: EMERALD, textColor: [255, 255, 255], fontSize: 6.5, fontStyle: "bold", halign: "right" },
      bodyStyles: { fontSize: 6.5, textColor: SLATE_600, halign: "right" },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" }, ...monthCols, 13: { halign: "right", fontStyle: "bold" } },
      margin: { left: MARGIN, right: MARGIN },
      styles: { font: "helvetica", cellPadding: 1.4, overflow: "linebreak" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Catatan + footer
  doc.setDrawColor(...SLATE_200);
  doc.line(MARGIN, 275, PAGE_W - MARGIN, 275);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...SLATE_400);
  doc.text(
    "Catatan: Dokumen ini hanya menampilkan informasi pertanian yang dipetakan dan bukan bukti kepemilikan legal atas tanah.",
    MARGIN,
    280,
    { maxWidth: CONTENT_W }
  );
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...EMERALD);
  doc.text("Smallholder HUB", PAGE_W - MARGIN, 288, { align: "right" });

  const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`Profil_Lahan_${safe(group.name)}_${safe(farmer.name)}_${safe(parcel.parcelId)}.pdf`);
}
