import { documentTypeShort, landStdbStageLabel, LAND_PROGRAM_LABELS, LAND_PROGRAM_STATUS_LABELS, parcelMapperShort, LAND_BORDER_SIDES, LAND_BORDER_SIDE_LABELS, isNktAffected, landNktStatusLabel, summarizeNkt } from "@/lib/land-parcel-satellite-format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Position } from "geojson";
import type { ParcelPassport } from "@/types/map";
import { NEIGHBOR_DISTANCE_M, neighborOwnerLabel } from "@/lib/parcel-neighbor";
import { LAND_MARKER_CONDITION_LABELS, LAND_MARKER_TYPE_LABELS, labelOf } from "@/lib/land-marker";
import { drawGraticule } from "@/lib/layer-report-pdf";

const EMERALD: [number, number, number] = [16, 185, 129];
const SLATE_800: [number, number, number] = [30, 41, 59];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_400: [number, number, number] = [148, 163, 184];
const SLATE_200: [number, number, number] = [226, 232, 240];
const AREA_FILL: [number, number, number] = [209, 240, 224];
const MARKER_FILL: [number, number, number] = [253, 224, 71];
const MARKER_EDGE: [number, number, number] = [133, 77, 14];

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
 * Bingkai peta Profil Lahan (murni, diuji): bbox lahan ini + PATOK-nya + margin.
 * Patok ikut bbox (#329) karena patok GPS sah sampai 100 m dari batas — lebih
 * jauh dari margin 50 m — dan gambar di-clip ke kotak, sehingga persegi bernomor
 * bisa lenyap padahal tercantum di tabel "Patok Batas"; peta layar
 * (`parcel-map-view.tsx`) sudah memasukkan patok ke bounds (review 2026-09-15).
 * Margin: 40% span terbesar atau ≈50 m — supaya tetangga bersinggungan terlihat
 * meski lahannya kecil, tanpa membuat lahan utama jadi titik.
 */
export function passportMapFrame(
  rings: Position[][],
  markers: { longitude: number; latitude: number }[],
): { minLon: number; maxLon: number; minLat: number; maxLat: number; cosLat: number } {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  const points: [number, number][] = [...rings.flat().map(([lon, lat]) => [lon, lat] as [number, number]), ...markers.map((m) => [m.longitude, m.latitude] as [number, number])];
  for (const [lon, lat] of points) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));
  const spanLon0 = maxLon - minLon || 1e-6;
  const spanLat0 = maxLat - minLat || 1e-6;
  const fiftyMDeg = 50 / 111_320;
  const marginDeg = Math.max(0.4 * Math.max(spanLon0 * cosLat, spanLat0), fiftyMDeg);
  return {
    minLon: minLon - marginDeg / cosLat,
    maxLon: maxLon + marginDeg / cosLat,
    minLat: minLat - marginDeg,
    maxLat: maxLat + marginDeg,
    cosLat,
  };
}

/**
 * Peta lahan (#327): lahan ini solid emerald di tengah, lahan tetangga ≤ 25 m
 * (sudah lewat aturan scope) putus-putus abu bernomor. Bingkai = bbox lahan
 * ini (+ patoknya) + margin — bukan bbox gabungan — supaya lahan yang dicetak tetap dominan;
 * tetangga yang lebih besar DIPOTONG di tepi (clip), nomornya ditempel ke tepi
 * dalam. Skala batang + panah utara agar "≤ 25 m" terbaca di kertas.
 */
function drawParcelMap(
  doc: jsPDF,
  geometry: ParcelPassport["parcel"]["geometry"],
  neighbors: ParcelPassport["neighbors"],
  markers: ParcelPassport["markers"],
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

  const { minLon, maxLon, minLat, maxLat, cosLat } = passportMapFrame(rings, markers);
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
  // Kisi koordinat di latar (#331, permintaan owner) — sebelum poligon supaya tidak menimpa.
  drawGraticule(doc, box, { minLon, maxLon, minLat, maxLat }, project);

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

  // Patok batas (#329): persegi kuning bernomor di atas segalanya — semua patok
  // lahan satu warna (#345: warna merah "patok lahan NKT" turunan dihapus;
  // patok NKT kelak entitas sendiri). Nomor = tabel "Patok Batas".
  for (const m of markers) {
    const [px, py] = project(m.longitude, m.latitude);
    doc.setFillColor(...MARKER_FILL);
    doc.setDrawColor(...MARKER_EDGE);
    doc.setLineWidth(0.3);
    doc.rect(px - 2.1, py - 2.1, 4.2, 4.2, "FD");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_800);
    doc.text(String(m.sequenceNo), px, py + 0.1, { align: "center", baseline: "middle" });
  }

  drawMapDecorations(doc, box, mmPerMeter);
  doc.restoreGraphicsState();
}

/**
 * Bungkus teks maksimal `maxLines` baris selebar `maxW`; baris terakhir diberi
 * "…" bila terpotong. Untuk kolom kanan halaman 1 yang TIDAK punya pemenggalan
 * halaman (tata letak dua kolom): nilai sepanjang skema (200/500 karakter) tak
 * boleh mendorong konten melewati footer (review 2026-09-14).
 */
function clampLines(doc: jsPDF, text: string, maxW: number, maxLines: number): string[] {
  const lines = doc.splitTextToSize(text, maxW) as string[];
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fitText(doc, `${kept[maxLines - 1]}…`, maxW);
  return kept;
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
  doc.text("Hanya lahan yang terdaftar di MIS — jalan, sungai, dan lahan yang belum dipetakan tidak muncul.", x, y, { maxWidth: w });
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
  const { farmer, group, parcel, legal, training, production, neighbors, neighborsOmitted, markers } = data;

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
  // NKT (#328) ikut sebagai badge berwarna (merah termasuk / amber terdampak) —
  // status yang harus terlihat sebelum apa pun, sama dengan header Detail Lahan.
  const nktBadge = parcel.nkt && isNktAffected(parcel.nkt.status) ? landNktStatusLabel(parcel.nkt.status, true) : null;
  const badges: { text: string; tone: "neutral" | "red" | "amber" }[] = [
    nktBadge ? { text: nktBadge, tone: "red" } : null,
    parcel.isPsr ? { text: "PSR (replanting)", tone: "neutral" as const } : null,
    parcel.cropType ? { text: parcel.cropType, tone: "neutral" as const } : null,
  ].filter((b): b is { text: string; tone: "neutral" | "red" | "amber" } => Boolean(b));
  let bx = PAGE_W - MARGIN;
  doc.setFontSize(7.5);
  for (const b of badges.reverse()) {
    const w = doc.getTextWidth(b.text) + 5;
    bx -= w;
    if (b.tone === "red") { doc.setFillColor(254, 226, 226); doc.setDrawColor(220, 38, 38); }
    else if (b.tone === "amber") { doc.setFillColor(254, 243, 199); doc.setDrawColor(217, 119, 6); }
    else { doc.setFillColor(241, 245, 249); doc.setDrawColor(...SLATE_200); }
    doc.roundedRect(bx, 20, w, 6, 1.5, 1.5, "FD");
    if (b.tone === "red") doc.setTextColor(153, 27, 27);
    else if (b.tone === "amber") doc.setTextColor(146, 64, 14);
    else doc.setTextColor(...SLATE_600);
    doc.text(b.text, bx + w / 2, 24.1, { align: "center" });
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
  drawParcelMap(doc, parcel.geometry, neighbors, markers, mapBox, parcel.parcelId.split(".").find((x) => /^[A-Z]$/i.test(x)) ?? parcel.parcelId);
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
      // NKT (#328): satu baris ringkas; belum dinilai → "Belum dinilai" (bukan "—", supaya beda dengan "tidak terdampak").
      { label: "NKT", value: summarizeNkt(parcel.nkt) + (parcel.nkt?.affectedAreaHa != null ? ` · ${fmtArea(parcel.nkt.affectedAreaHa)}` : "") },
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
  // memang kosong. Anggaran tinggi halaman 1 ketat (Legalitas harus tetap di
  // halaman 1, Pelatihan+Produksi selalu halaman 2 — #298): kosong → SATU
  // baris; terisi → grid 2×2 label+nilai sebaris, nilai dipangkas 2 baris.
  // Blok selalu dicetak: pembaca perlu tahu sepadan belum didata, bukan luput cetak.
  ry += 3;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text("Sepadan", COL2_X, ry);
  doc.setDrawColor(...EMERALD);
  doc.line(COL2_X, ry + 1.5, COL2_X + 26, ry + 1.5);
  ry += 5.5;
  if (!parcel.border) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...SLATE_600);
    doc.text("Belum diisi — batas Utara / Timur / Selatan / Barat.", COL2_X, ry);
    ry += 4;
  } else {
    // Empat baris label+nilai sebaris (label 14 mm, nilai ±35 karakter/baris,
    // dipangkas 2 baris): grid 2×2 terbukti terlalu sempit untuk nilai lazim
    // seperti "Lahan Pak Budi".
    const labelW = 14;
    for (const side of LAND_BORDER_SIDES) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_400);
      doc.text(LAND_BORDER_SIDE_LABELS[side], COL2_X, ry);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SLATE_800);
      const lines = clampLines(doc, orDash(parcel.border[side]), colW - labelW, 2);
      doc.text(lines, COL2_X + labelW, ry);
      ry += 4.2 + 3.8 * (lines.length - 1);
    }
    ry += 0.5;
    if (parcel.border.notes) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...SLATE_600);
      const lines = clampLines(doc, `Catatan sepadan: ${parcel.border.notes}`, colW, 2);
      doc.text(lines, COL2_X, ry - 1);
      ry += 3.6 * lines.length;
    }
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

  // ── Patok Batas (#329) — hanya bila ada; nomor = persegi kuning di peta.
  // Koordinat 6 desimal (≈ 0,1 m) agar bisa dipakai kembali di GPS lapangan.
  if (markers.length > 0) {
    // Jeda kecil setelah baris meta legalitas (UL Parcel Code/Program) supaya judul tidak menempel.
    y = ensureSpace(doc, y + 4, 30);
    sectionHeading(doc, "Patok Batas", y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_600);
    doc.text(`${markers.length} patok · persegi kuning bernomor di peta = patok lahan; patok di batas bersama juga dipakai lahan tetangga`, MARGIN, y + 1);
    y += 4;
    autoTable(doc, {
      // "Bahan" (owner 2026-09-20, #345): beton/kayu/pipa/tanda alam — bukan "jenis" patok.
      head: [["No", "Kode", "Lintang", "Bujur", "Kondisi", "Bahan", "Dipasang", "Juga patok lahan"]],
      body: markers.map((m) => [
        String(m.sequenceNo),
        m.code,
        m.latitude.toFixed(6),
        m.longitude.toFixed(6),
        labelOf(LAND_MARKER_CONDITION_LABELS, m.condition),
        labelOf(LAND_MARKER_TYPE_LABELS, m.type),
        fmtDate(m.installedAt),
        m.sharedWith.length ? m.sharedWith.join(", ") : "—",
      ]),
      startY: y,
      theme: "striped",
      ...tableCommon,
      // Delapan kolom (ada Kode sejak #331): font 8 + padding 2 supaya "HJP-PTK-000123" dan
      // "Belum dipasang" muat satu baris dan kolom "Juga patok lahan" masih punya ruang.
      styles: { font: "helvetica", cellPadding: 2, overflow: "linebreak" },
      headStyles: { ...tableCommon.headStyles, fontSize: 8 },
      bodyStyles: { ...tableCommon.bodyStyles, fontSize: 8 },
      columnStyles: { 0: { halign: "right", cellWidth: 10 }, 1: { cellWidth: 27 }, 2: { halign: "right", cellWidth: 18 }, 3: { halign: "right", cellWidth: 20 }, 4: { cellWidth: 26 }, 5: { cellWidth: 18 }, 6: { cellWidth: 21 } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Pelatihan + Produksi — sejak #327 (keputusan owner 2026-09-14) section
  // MENGALIR: dulu Pelatihan selalu dipaksa mulai halaman 2 (#298), tetapi
  // dengan legenda tetangga + sepadan halaman 1 sudah penuh, dan pemaksaan
  // itu membuat lahan berlegalitas penuh jadi 3 halaman (Legalitas meluber ke
  // halaman 2, Pelatihan ke halaman 3). Kini pindah halaman hanya bila sisa
  // ruang tak cukup untuk judul + tabelnya.
  y = ensureSpace(doc, y, 40);
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
