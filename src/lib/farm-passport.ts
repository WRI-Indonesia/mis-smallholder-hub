import { documentTypeShort, landStdbStageLabel, LAND_PROGRAM_LABELS, LAND_PROGRAM_STATUS_LABELS, parcelMapperShort } from "@/lib/land-parcel-satellite-format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Position } from "geojson";
import type { ParcelPassport } from "@/types/map";
import { NEIGHBOR_DISTANCE_M, neighborOwnerLabel } from "@/lib/parcel-neighbor";

const EMERALD: [number, number, number] = [16, 185, 129];
const SLATE_800: [number, number, number] = [30, 41, 59];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_400: [number, number, number] = [148, 163, 184];
const SLATE_200: [number, number, number] = [226, 232, 240];
const AREA_FILL: [number, number, number] = [209, 240, 224];

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const PAGE_W = 210;
/** Label arah sepadan (#326), urutan searah jarum jam — sama dengan Detail Lahan. */
const SIDE_LABELS = { north: "Utara", east: "Timur", south: "Selatan", west: "Barat" } as const;
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

/** Semua ring luar (tiap poligon MultiPolygon) tanpa titik penutup ganda. */
function exteriorRings(geometry: ParcelPassport["parcel"]["geometry"]): Position[][] {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polys
    .map((poly) => poly?.[0] ?? [])
    .filter((ring) => ring.length >= 3)
    .map((ring) => {
      const last = ring[ring.length - 1];
      const first = ring[0];
      return last[0] === first[0] && last[1] === first[1] ? ring.slice(0, -1) : ring;
    });
}

type Box = { x: number; y: number; w: number; h: number };
type Projector = (lon: number, lat: number) => [number, number];

/** Poligon (ring luar) sebagai path jsPDF; `style` null = hanya membangun path (untuk clip). */
function strokeRing(doc: jsPDF, ring: Position[], project: Projector, style: "S" | "FD") {
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  const segs = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], style, true);
}

/** Skala batang (kiri-bawah) + panah utara "U" (kanan-atas) — pola #180 Laporan Lahan. */
function drawMapDecorations(doc: jsPDF, box: Box, mmPerMeter: number) {
  // Panjang "bulat" terbesar yang muat ≤ 1/3 lebar kotak.
  const candidates = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
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
  doc.text(`${meters} m`, bx + barMm / 2, by - 1.8, { align: "center" });

  // Panah utara.
  const nx = box.x + box.w - 5;
  const ny = box.y + 4;
  doc.setFillColor(...SLATE_800);
  doc.triangle(nx, ny, nx - 1.6, ny + 4.5, nx + 1.6, ny + 4.5, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("U", nx, ny + 8, { align: "center" });
}

/**
 * Peta lahan (#327): lahan ini solid emerald di tengah, lahan tetangga ≤ 25 m
 * (sudah lewat aturan scope) putus-putus abu bernomor. Bingkai = bbox lahan
 * ini + margin — bukan bbox gabungan — supaya lahan yang dicetak tetap dominan;
 * tetangga yang lebih besar DIPOTONG di tepi (clip), nomornya ditempel ke tepi
 * dalam. Skala batang + panah utara agar "≤ 25 m" terbaca di kertas.
 */
function drawParcelMap(
  doc: jsPDF,
  geometry: ParcelPassport["parcel"]["geometry"],
  neighbors: ParcelPassport["neighbors"],
  box: Box,
  label: string,
) {
  const rings = exteriorRings(geometry);
  if (rings.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_400);
    doc.text("Geometri lahan tidak tersedia", box.x + box.w / 2, box.y + box.h / 2, { align: "center" });
    return;
  }

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of rings.flat()) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));
  // Margin: 40% span terbesar atau ≈50 m — supaya tetangga bersinggungan terlihat
  // meski lahannya kecil, tanpa membuat lahan utama jadi titik.
  const spanLon0 = maxLon - minLon || 1e-6;
  const spanLat0 = maxLat - minLat || 1e-6;
  const fiftyMDeg = 50 / 111_320;
  const marginDeg = Math.max(0.4 * Math.max(spanLon0 * cosLat, spanLat0), fiftyMDeg);
  minLon -= marginDeg / cosLat; maxLon += marginDeg / cosLat;
  minLat -= marginDeg; maxLat += marginDeg;
  const spanLon = maxLon - minLon;
  const spanLat = maxLat - minLat;
  // mm per derajat: sumbu lon dikoreksi cos(lat) supaya bentuk tidak gepeng.
  const s = Math.min(box.w / (spanLon * cosLat), box.h / spanLat);
  const drawW = spanLon * cosLat * s;
  const drawH = spanLat * s;
  const offX = box.x + (box.w - drawW) / 2;
  const offY = box.y + (box.h - drawH) / 2;
  const project: Projector = (lon, lat) => [offX + (lon - minLon) * cosLat * s, offY + (maxLat - lat) * s];
  const mmPerMeter = s / 111_320;

  // Clip semua gambar ke kotak peta — tetangga besar terpotong, bukan meluber.
  doc.saveGraphicsState();
  doc.rect(box.x, box.y, box.w, box.h, null);
  doc.clip();
  doc.discardPath();

  // Tetangga dulu (di bawah lahan utama).
  const numberAt: { x: number; y: number; n: number }[] = [];
  neighbors.forEach((nb, i) => {
    const nrings = exteriorRings(nb.geometry);
    if (nrings.length === 0) return;
    doc.setLineDashPattern([1.2, 0.8], 0);
    doc.setLineWidth(0.4);
    if (nb.sameFarmer) doc.setDrawColor(2, 132, 199);
    else doc.setDrawColor(...SLATE_600);
    for (const ring of nrings) strokeRing(doc, ring, project, "S");
    doc.setLineDashPattern([], 0);
    // Nomor di centroid ring terbesar; bila di luar kotak, tempel ke tepi dalam.
    const big = nrings.reduce((a, b) => (b.length > a.length ? b : a));
    const c = big.reduce(([ax, ay], [lon, lat]) => [ax + lon, ay + lat], [0, 0]).map((v) => v / big.length);
    const [px, py] = project(c[0], c[1]);
    // Tepi bawah disisakan 9 mm untuk skala batang; sisi lain 4 mm.
    numberAt.push({
      x: Math.min(Math.max(px, box.x + 4), box.x + box.w - 4),
      y: Math.min(Math.max(py, box.y + 4), box.y + box.h - 9),
      n: i + 1,
    });
  });

  // Lahan ini — solid, di atas tetangga.
  doc.setDrawColor(...EMERALD);
  doc.setFillColor(...AREA_FILL);
  doc.setLineWidth(0.6);
  for (const ring of rings) strokeRing(doc, ring, project, "FD");

  // Nomor tetangga: lingkaran putih bertepi abu.
  for (const { x, y, n } of numberAt) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...SLATE_600);
    doc.setLineWidth(0.3);
    doc.circle(x, y, 2.2, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_800);
    doc.text(String(n), x, y, { align: "center", baseline: "middle" });
  }

  // Label lahan ini di centroid ring pertama.
  const main = rings[0];
  const mc = main.reduce(([ax, ay], [lon, lat]) => [ax + lon, ay + lat], [0, 0]).map((v) => v / main.length);
  const [lx, ly] = project(mc[0], mc[1]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  doc.text(label, lx, ly, { align: "center", baseline: "middle" });

  drawMapDecorations(doc, box, mmPerMeter);
  doc.restoreGraphicsState();
}

/** Potong teks agar muat `maxW` mm (dengan "…"). */
function fitText(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

/**
 * Legenda tetangga di bawah peta: No · Pemilik · ID Lahan · Lembaga · Jarak.
 * SELALU dicetak — kosong pun berbunyi "Tidak ada lahan lain dalam 25 m"
 * supaya pembaca tahu itu hasil cek, bukan luput cetak. Mengembalikan y bawah.
 */
function drawNeighborLegend(doc: jsPDF, neighbors: ParcelPassport["neighbors"], omitted: number, x: number, y: number, w: number): number {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text(`Lahan Tetangga (dalam ${NEIGHBOR_DISTANCE_M} m)`, x, y);
  y += 3.6;
  if (neighbors.length === 0) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...SLATE_600);
    doc.text(`Tidak ada lahan lain yang terdaftar di MIS dalam ${NEIGHBOR_DISTANCE_M} m.`, x, y);
    return y + 3;
  }
  // Kolom: No 5 · Pemilik 30% · ID Lahan 44% (ID lengkap ±27 karakter) · Lembaga sisa · Jarak 11.
  const noW = 5, distW = 11;
  const rest = w - noW - distW;
  const ownerW = rest * 0.3, idW = rest * 0.44, groupW = rest - ownerW - idW;
  const cx = [x, x + noW, x + noW + ownerW, x + noW + ownerW + idW, x + w];
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  doc.text("No", cx[0], y);
  doc.text("Pemilik", cx[1], y);
  doc.text("ID Lahan", cx[2], y);
  doc.text("Lembaga", cx[3], y);
  doc.text("Jarak", cx[4], y, { align: "right" });
  y += 1;
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);
  y += 3;
  doc.setFontSize(7);
  neighbors.forEach((n, i) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_800);
    doc.text(String(i + 1), cx[0], y);
    // Kolom sempit: varian pendek untuk lahan sendiri (layar memakai label panjang).
    doc.text(fitText(doc, n.sameFarmer ? "Petani ini" : neighborOwnerLabel(n), ownerW - 1.5), cx[1], y);
    doc.text(fitText(doc, n.parcelId, idW - 1.5), cx[2], y);
    doc.text(fitText(doc, n.groupName, groupW - 1.5), cx[3], y);
    const dist = n.distanceM === 0 ? (n.overlaps ? "tindih !" : "singgung") : `${n.distanceM} m`;
    doc.text(dist, cx[4], y, { align: "right" });
    y += 3.4;
  });
  if (omitted > 0) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...SLATE_600);
    doc.text(`+${omitted} lahan lain dalam ${NEIGHBOR_DISTANCE_M} m tidak ditampilkan.`, x, y);
    y += 3;
  }
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...SLATE_400);
  doc.text("Hanya lahan yang terdaftar di MIS; pemilik di luar akses pencetak ditampilkan Lembaga-nya saja.", x, y, { maxWidth: w });
  return y + 3;
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
  const { farmer, group, parcel, legal, training, production, neighbors, neighborsOmitted } = data;

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
  drawParcelMap(doc, parcel.geometry, neighbors, mapBox, parcel.parcelId.split(".").find((x) => /^[A-Z]$/i.test(x)) ?? parcel.parcelId);
  // Titik tengah pindah ke bawah kotak — kiri-bawah kotak kini dipakai skala batang (#327).
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  doc.text(`Titik tengah: ${parcel.centroid[1].toFixed(6)}, ${parcel.centroid[0].toFixed(6)}`, mapBox.x, mapBox.y + mapBox.h + 3.2);
  const legendBottom = drawNeighborLegend(doc, neighbors, neighborsOmitted, mapBox.x, mapBox.y + mapBox.h + 7, mapBox.w);

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
  // ── Sepadan (#326) di kolom kanan, di bawah Pemilik — kolom kanan biasanya
  // lebih pendek daripada peta + legenda tetangga, jadi ini memakai ruang yang
  // memang kosong dan halaman 1 tetap memuat Legalitas (Pelatihan + Produksi
  // sengaja halaman 2). Blok SELALU dicetak ("—" bila kosong): pembaca perlu
  // tahu sepadan memang belum didata, bukan luput cetak.
  ry += 3;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text("Sepadan", COL2_X, ry);
  doc.setDrawColor(...EMERALD);
  doc.line(COL2_X, ry + 1.5, COL2_X + 26, ry + 1.5);
  ry += 5.5;
  // Grid 2×2 (U · T / S · B): label kecil di atas nilai — lebih hemat tinggi
  // daripada empat baris label/nilai, dan urutannya tetap searah jarum jam.
  const halfW = colW / 2;
  const sides = ["north", "east", "south", "west"] as const;
  for (let r = 0; r < 2; r++) {
    let rowBottom = ry;
    for (let c = 0; c < 2; c++) {
      const side = sides[r * 2 + c];
      const x = COL2_X + halfW * c;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_400);
      doc.text(SIDE_LABELS[side], x, ry);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE_800);
      const lines = doc.splitTextToSize(orDash(parcel.border?.[side]), halfW - 3) as string[];
      doc.text(lines, x, ry + 4);
      rowBottom = Math.max(rowBottom, ry + 4 + 4 * (lines.length - 1));
    }
    ry = rowBottom + 5.5;
  }
  if (parcel.border?.notes) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...SLATE_600);
    const lines = doc.splitTextToSize(`Catatan sepadan: ${parcel.border.notes}`, colW) as string[];
    doc.text(lines, COL2_X, ry - 1);
    ry += 3.8 * lines.length;
  }
  y = Math.max(legendBottom, ry) + 4;
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
      // Kolom Tahap wajib ada sejak #306: tanpa itu baris pengajuan tercetak
      // seolah STDB-nya sudah terbit.
      head: [["STDB", "Tahap", "Terbit", "Nama Pemegang", "Juga mencakup"]],
      body: legal.stdbs.map((st) => [
        st.number ?? "Belum bernomor",
        landStdbStageLabel(st.stage),
        orDash(st.issuedYear),
        orDash(st.holderName),
        st.otherParcelIds.length ? st.otherParcelIds.join(", ") : "Hanya lahan ini",
      ]),
      startY: y,
      theme: "striped",
      columnStyles: { 2: { halign: "right" } },
      ...tableCommon,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;
  }
  const metaLines: string[] = [];
  if (legal.stdbs.length === 0) metaLines.push("STDB: belum tercatat.");
  if (legal.externalIds.length > 0) metaLines.push(`UL Parcel Code: ${legal.externalIds.map((e) => `${e.code} (${parcelMapperShort(e.source)})`).join(", ")}`);
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
