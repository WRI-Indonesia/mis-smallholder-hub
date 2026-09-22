// PDF "Profil Petani" (#343) — Bagian A ringkasan petani (identitas, 5 kartu
// KPI, Daftar Lahan bernomor, peta sebaran penanda bernomor, pelatihan,
// produksi gabungan + rekap per lahan) lalu Bagian B lampiran Profil Lahan
// penuh per lahan ber-geometri (`drawFarmPassport`, isi identik dengan PDF
// Profil Lahan berdiri sendiri). Satu pass footer di akhir → nomor halaman
// menerus. Angka Bagian A datang dari `buildFarmerDetail` lewat action —
// tidak dihitung ulang di sini, sehingga PDF = Detail Petani.
// Gaya (warna, margin, footer, tabel) dipakai bersama dari `farm-passport.ts`.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Position } from "geojson";
import {
  AREA_FILL,
  CONTENT_BOTTOM,
  CONTENT_W,
  EMERALD,
  MARGIN,
  MONTHS_ID,
  PAGE_W,
  SLATE_200,
  SLATE_400,
  SLATE_600,
  SLATE_800,
  drawFarmPassport,
  drawFootersOnAllPages,
  drawMapDecorations,
  ensureSpace,
  exteriorRings,
  fitText,
  fmtDate,
  fmtNum,
  orDash,
  passportTableCommon,
  sectionHeading,
  strokeRing,
  type Box,
  type Projector,
} from "@/lib/farm-passport";
import { drawGraticule } from "@/lib/layer-report-pdf";
import { isNktAffected, landNktStatusLabel } from "@/lib/land-parcel-satellite-format";
import { BMP_ASSESSMENT_CATEGORIES, BMP_SCORE_MAX, bmpAssessmentCategory, formatScore, formatUtcDate } from "@/lib/bmp-assessment";
import type { FarmerProfileBmpActivity, FarmerProfileParcel, FarmerProfilePassport } from "@/types/farmer-profile";

const NKT_EDGE: [number, number, number] = [220, 38, 38];
const NKT_FILL: [number, number, number] = [254, 226, 226];
/** Warna seri radar — sama dengan `BMP_RADAR_SERIES_COLORS.a` di SVG layar (biru, bukan hijau pita). */
const BMP_SERIES: [number, number, number] = [37, 99, 235];

const hexToRgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
/** Campur warna ke putih (0 = warna asli, 1 = putih) — latar badge/pita tanpa GState. */
const tint = (c: [number, number, number], t: number): [number, number, number] => [Math.round(255 - (255 - c[0]) * (1 - t)), Math.round(255 - (255 - c[1]) * (1 - t)), Math.round(255 - (255 - c[2]) * (1 - t))];
/** Nama pendek kegiatan untuk kolom/sumbu — sama dengan `bmpRadarShortName` di SVG layar (komponen "use client", tak diimpor ke sini). */
const bmpShortName = (name: string) => name.replace(/\s*\(.*\)$/, "").replace("Pengendalian ", "").replace("Hama Penyakit Terpadu", "PHPT");

const fmtDec = (n: number, digits = 2) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

/** Umur dalam tahun dari tanggal lahir ISO; null bila tak diketahui / belum lahir. */
function ageFromIso(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const b = new Date(iso);
  if (Number.isNaN(b.getTime())) return null;
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * Nomor peta/lampiran per lahan: urut daftar, hanya lahan ber-geometri yang
 * dinomori (null = "belum dipetakan"). Satu sumber untuk kolom No tabel,
 * penanda peta sebaran, dan "Lampiran n dari N" — tak boleh saling geser.
 */
export function assignParcelNumbers(parcels: Pick<FarmerProfileParcel, "geometry" | "centroid">[]): (number | null)[] {
  let n = 0;
  return parcels.map((p) => (p.geometry && p.centroid ? ++n : null));
}

/**
 * Bingkai peta sebaran (murni, diuji): bbox semua titik + margin 10 % span
 * terbesar atau ≈ 100 m — bukan 40 % seperti Profil Lahan (`passportMapFrame`),
 * karena pada bingkai 26 km (sebaran maks di prod) margin 40 % membuang
 * separuh kertas untuk kekosongan, sementara pada lahan tunggal (≈ 100 m)
 * margin 100 m menjaga poligon tidak menempel tepi kotak.
 */
export function overviewMapFrame(points: [number, number][]): { minLon: number; maxLon: number; minLat: number; maxLat: number; cosLat: number } {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
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
  const hundredMDeg = 100 / 111_320;
  const marginDeg = Math.max(0.1 * Math.max(spanLon0 * cosLat, spanLat0), hundredMDeg);
  return {
    minLon: minLon - marginDeg / cosLat,
    maxLon: maxLon + marginDeg / cosLat,
    minLat: minLat - marginDeg,
    maxLat: maxLat + marginDeg,
    cosLat,
  };
}

/**
 * Peta sebaran lahan petani: fit-bounds semua lahan ber-geometri, poligon di
 * bawah (terbaca hanya bila lahan berdekatan — kasus median 1,3 km), lalu
 * SELALU penanda lingkaran bernomor di centroid (pada bingkai 26 km poligon
 * 1 ha < 1 mm di kertas). Merah = lahan NKT. Nomor = `assignParcelNumbers`.
 */
export function drawParcelsOverviewMap(doc: jsPDF, box: Box, parcels: FarmerProfileParcel[]) {
  const numbers = assignParcelNumbers(parcels);
  const mapped = parcels
    .map((p, i) => ({ p, n: numbers[i] }))
    .filter((x): x is { p: FarmerProfileParcel & { geometry: NonNullable<FarmerProfileParcel["geometry"]>; centroid: [number, number] }; n: number } => x.n != null);
  if (mapped.length === 0) return;

  const ringsOf = mapped.map(({ p }) => exteriorRings(p.geometry));
  const points: [number, number][] = [
    ...ringsOf.flat(2).map(([lon, lat]) => [lon, lat] as [number, number]),
    ...mapped.map(({ p }) => p.centroid),
  ];
  const { minLon, maxLon, minLat, maxLat, cosLat } = overviewMapFrame(points);
  const spanLon = maxLon - minLon;
  const spanLat = maxLat - minLat;
  const s = Math.min(box.w / (spanLon * cosLat), box.h / spanLat);
  const drawW = spanLon * cosLat * s;
  const drawH = spanLat * s;
  const offX = box.x + (box.w - drawW) / 2;
  const offY = box.y + (box.h - drawH) / 2;
  const project: Projector = (lon, lat) => [offX + (lon - minLon) * cosLat * s, offY + (maxLat - lat) * s];
  const mmPerMeter = s / 111_320;

  doc.saveGraphicsState();
  doc.rect(box.x, box.y, box.w, box.h, null);
  doc.clip();
  doc.discardPath();
  drawGraticule(doc, box, { minLon, maxLon, minLat, maxLat }, project);

  // Poligon dulu (di bawah penanda).
  mapped.forEach(({ p }, i) => {
    const nkt = isNktAffected(p.nktStatus);
    doc.setDrawColor(...(nkt ? NKT_EDGE : EMERALD));
    doc.setFillColor(...(nkt ? NKT_FILL : AREA_FILL));
    doc.setLineWidth(0.3);
    for (const ring of ringsOf[i]) strokeRing(doc, ring as Position[], project, "FD");
  });

  // Penanda bernomor di centroid — di atas segalanya.
  for (const { p, n } of mapped) {
    const [px, py] = project(p.centroid[0], p.centroid[1]);
    const nkt = isNktAffected(p.nktStatus);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...(nkt ? NKT_EDGE : EMERALD));
    doc.setLineWidth(0.45);
    doc.circle(px, py, 2.4, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_800);
    doc.text(String(n), px, py + 0.1, { align: "center", baseline: "middle" });
  }

  drawMapDecorations(doc, box, mmPerMeter);
  doc.restoreGraphicsState();
}

/**
 * Radar 5 kegiatan BMP (vektor) — cermin `BmpActivityRadarSvg`: pita empat
 * kategori sebagai latar (Belum < 1 · Perintis 1–1,49 · Praktisi 1,5–2,5 ·
 * Teladan > 2,5), sumbu dari atas searah jarum jam, nilai diplot setara 0–3
 * (score/max × 3). Pita dicat rata (tanpa opacity) dengan warna kategori yang
 * dipucatkan supaya garis nilai biru tetap menonjol (owner #346).
 */
export function drawBmpRadar(doc: jsPDF, cx: number, cy: number, R: number, rows: FarmerProfileBmpActivity[]) {
  const n = rows.length;
  if (n < 3) return;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const pt = (i: number, r: number): [number, number] => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];
  const ringPts = (score: number) => rows.map((_, i) => pt(i, (score / BMP_SCORE_MAX) * R));
  const poly = (pts: [number, number][], style: "F" | "S" | "FD") => {
    const segs = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
    doc.lines(segs, pts[0][0], pts[0][1], [1, 1], style, true);
  };
  // Pita dari luar ke dalam — tiap pita menimpa bagian dalam pita sebelumnya.
  const bands = BMP_ASSESSMENT_CATEGORIES.map((c) => ({ hi: c.key === "TELADAN" ? BMP_SCORE_MAX : c.key === "PRAKTISI" ? 2.5 : c.key === "PERINTIS" ? 1.5 : 1, color: c.color }));
  doc.setLineWidth(0.2);
  doc.setDrawColor(255, 255, 255);
  for (const b of bands) {
    doc.setFillColor(...tint(hexToRgb(b.color), 0.72));
    poly(ringPts(b.hi), "FD");
  }
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, R);
    doc.line(cx, cy, x, y);
  }
  // Nilai: poligon biru berisi pucat + titik di tiap sumbu.
  const scaled = (r: FarmerProfileBmpActivity) => (r.max > 0 ? Math.min((r.score / r.max) * BMP_SCORE_MAX, BMP_SCORE_MAX) : 0);
  const valuePts = rows.map((r, i) => pt(i, (scaled(r) / BMP_SCORE_MAX) * R));
  doc.setDrawColor(...BMP_SERIES);
  doc.setLineWidth(0.6);
  poly(valuePts, "S");
  doc.setFillColor(...BMP_SERIES);
  for (const [x, y] of valuePts) doc.circle(x, y, 0.8, "F");
  // Label sumbu (nama pendek) di luar ujung sumbu + nilai setara.
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_800);
  rows.forEach((r, i) => {
    const [x, y] = pt(i, R + 3);
    const a = angle(i);
    const align: "left" | "center" | "right" = Math.abs(Math.cos(a)) < 0.2 ? "center" : Math.cos(a) > 0 ? "left" : "right";
    doc.text(bmpShortName(r.name), x, y + (Math.sin(a) > 0.2 ? 2 : Math.sin(a) < -0.2 ? -0.5 : 0.8), { align });
    doc.setFontSize(5.5);
    doc.setTextColor(...BMP_SERIES);
    doc.text(formatScore(scaled(r)), x, y + (Math.sin(a) > 0.2 ? 4.6 : Math.sin(a) < -0.2 ? 2.1 : 3.4), { align });
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE_800);
  });
}

/** Baris label : nilai (nilai tebal, boleh membungkus). Mengembalikan y bawah. */
function drawAttrs(doc: jsPDF, items: { label: string; value: string }[], x: number, y: number, labelW: number, maxW: number, maxLines = 3): number {
  let cy = y;
  for (const it of items) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_400);
    doc.text(it.label, x, cy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_800);
    let lines = doc.splitTextToSize(it.value, maxW - labelW) as string[];
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = fitText(doc, `${lines[maxLines - 1]}…`, maxW - labelW);
    }
    doc.text(lines, x + labelW, cy);
    cy += 5.5 * Math.max(1, lines.length);
  }
  return cy;
}

/** Jarak baku antar section Bagian A (mm) — sama dengan `finalY + 12` di Profil Lahan. */
const SECTION_GAP = 12;

/**
 * Kepadatan tabel Bagian A seragam: font 8 / padding 1,8 (Pelatihan, Rekap,
 * Monev BMP). Pengecualian yang lebih rapat: Daftar Lahan 12 kolom (7,5/1,4)
 * dan matriks bulanan 16 kolom (7/1,5). Lampiran Profil Lahan memakai gayanya
 * sendiri (9/2,6) — tidak disentuh.
 */
function profileTable() {
  const t = passportTableCommon();
  return {
    ...t,
    styles: { font: "helvetica", cellPadding: 1.8, overflow: "linebreak" as const },
    headStyles: { ...t.headStyles, fontSize: 8 },
    bodyStyles: { ...t.bodyStyles, fontSize: 8 },
  };
}

/**
 * Perkiraan tinggi judul + tabel (mm) untuk `ensureSpace` SEBELUM judul
 * digambar — supaya judul tidak tertinggal yatim di dasar halaman sementara
 * tabelnya pindah, dan tabel pendek tidak menyisakan satu baris di halaman
 * berikutnya. Tabel panjang tetap boleh pecah (dibatasi `cap`).
 */
const blockNeed = (rows: number, rowH = 6.4, headH = 13, cap = 80) => Math.min(headH + rows * rowH, cap);

/** Sub-judul di dalam section (mis. "Rekap per Lahan per Tahun"). */
function subHeading(doc: jsPDF, text: string, y: number) {
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text(text, MARGIN, y);
}

function emptyLine(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  doc.text(text, MARGIN, y + 3);
  return y + 9;
}

/** Bagian A — ringkasan petani. Mengembalikan y akhir (untuk uji/lanjutan). */
function drawFarmerSummary(doc: jsPDF, data: FarmerProfilePassport): number {
  const { farmer, group, subGroups, summary, parcels, training, production, bmp } = data;
  const tableCommon = passportTableCommon();
  const now = new Date();
  const numbers = assignParcelNumbers(parcels);
  const mappedCount = numbers.filter((n) => n != null).length;

  // ── Header
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, PAGE_W, 4, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  doc.text("SMALLHOLDER HUB  ·  PROFIL PETANI", MARGIN, 14);
  doc.text(`Dicetak ${fmtDate(now.toISOString())}`, PAGE_W - MARGIN, 14, { align: "right" });

  // Badge kanan: L/P · Lembaga · Aktif/Nonaktif · kategori Monev BMP terbaru (cermin header Detail Petani).
  doc.setFontSize(7.5);
  const latestBmp = bmp?.assessments[0] ?? null;
  const badges: { text: string; tone: "neutral" | "green" | "red" | "bmp" }[] = [
    { text: farmer.gender === "M" ? "Laki-laki" : farmer.gender === "F" ? "Perempuan" : "—", tone: "neutral" },
    { text: fitText(doc, orDash(group.name), 60), tone: "green" },
    farmer.isActive ? { text: "Aktif", tone: "green" as const } : { text: "Nonaktif", tone: "red" as const },
    ...(latestBmp ? [{ text: bmpAssessmentCategory(latestBmp.score).label, tone: "bmp" as const }] : []),
  ];
  const bmpColor = latestBmp ? hexToRgb(bmpAssessmentCategory(latestBmp.score).color) : SLATE_600;
  let bx = PAGE_W - MARGIN;
  for (const b of [...badges].reverse()) {
    const w = doc.getTextWidth(b.text) + 5;
    bx -= w;
    if (b.tone === "red") { doc.setFillColor(254, 226, 226); doc.setDrawColor(220, 38, 38); }
    else if (b.tone === "green") { doc.setFillColor(209, 250, 229); doc.setDrawColor(...EMERALD); }
    else if (b.tone === "bmp") { doc.setFillColor(...tint(bmpColor, 0.85)); doc.setDrawColor(...bmpColor); }
    else { doc.setFillColor(241, 245, 249); doc.setDrawColor(...SLATE_200); }
    doc.roundedRect(bx, 20, w, 6, 1.5, 1.5, "FD");
    if (b.tone === "red") doc.setTextColor(153, 27, 27);
    else if (b.tone === "green") doc.setTextColor(6, 95, 70);
    else if (b.tone === "bmp") doc.setTextColor(...bmpColor);
    else doc.setTextColor(...SLATE_600);
    doc.text(b.text, bx + w / 2, 24.1, { align: "center" });
    bx -= 2;
  }
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SLATE_800);
  doc.text(fitText(doc, farmer.name, bx - MARGIN - 4), MARGIN, 24);
  doc.setFontSize(10);
  doc.setFont("courier", "bold");
  doc.setTextColor(...SLATE_600);
  doc.text(farmer.code, MARGIN, 30);
  const codeW = doc.getTextWidth(farmer.code);
  doc.setFont("helvetica", "normal");
  doc.text(`  ·  ${orDash(group.name)}  ·  ${orDash(group.districtName)}, ${orDash(group.provinceName)}`, MARGIN + codeW, 30);
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 35, PAGE_W - MARGIN, 35);

  // ── Identitas (dua kolom)
  let y = 42;
  sectionHeading(doc, "Identitas", y);
  y += 6;
  const colW = (CONTENT_W - 8) / 2;
  const age = ageFromIso(farmer.birthDate, now);
  const leftBottom = drawAttrs(
    doc,
    [
      { label: "Lembaga Petani", value: `${orDash(group.name)}${group.code ? ` (${group.code})` : ""}` },
      { label: "Kelompok Tani", value: subGroups.kelompokTani.length ? subGroups.kelompokTani.join(", ") : "—" },
      { label: "Distrik", value: orDash(group.districtName) },
      { label: "Provinsi", value: orDash(group.provinceName) },
      { label: "Jenis Kelamin", value: farmer.gender === "M" ? "Laki-laki" : farmer.gender === "F" ? "Perempuan" : "—" },
      { label: "Tahun Bergabung", value: orDash(farmer.joinedYear) },
    ],
    MARGIN,
    y,
    30,
    colW,
  );
  const rightX = MARGIN + colW + 8;
  const rightBottom = drawAttrs(
    doc,
    [
      // NIK & tanggal lahir penuh — dokumen resmi milik petani (standar ui-ux §Masking); layar tetap disensor.
      { label: "NIK", value: orDash(farmer.nik) },
      { label: "Lahir", value: `${orDash(farmer.birthPlace)}, ${fmtDate(farmer.birthDate)}${age != null ? ` (${age} th)` : ""}` },
      { label: "Alamat", value: orDash(farmer.address) },
      { label: "Dibuat", value: fmtDate(farmer.createdAt) },
      { label: "Terakhir Diubah", value: fmtDate(farmer.modifiedAt) },
    ],
    rightX,
    y,
    30,
    colW,
  );
  y = Math.max(leftBottom, rightBottom) + 3;

  // ── 5 kartu ringkasan (sama dengan layar)
  const cards: { title: string; value: string; sub: string }[] = [
    { title: "LAHAN", value: `${fmtNum(summary.totalParcels)} persil`, sub: `${fmtDec(summary.totalArea)} Ha` },
    {
      title: "PRODUKSI",
      value: `${fmtDec(summary.productionTotalKg / 1000)} Ton`,
      sub: summary.productionYears.length > 0
        ? `${summary.productionYears.length} tahun ber-data (${summary.productionYears[0]}–${summary.productionYears[summary.productionYears.length - 1]})`
        : "Belum ada data",
    },
    {
      title: "PELATIHAN",
      value: `${fmtNum(summary.packagesDone)}/${fmtNum(summary.packagesTotal)} paket`,
      sub: summary.packagesDone === summary.packagesTotal ? "Semua paket diikuti" : "Belum semua paket",
    },
    {
      title: "KELENGKAPAN PROFIL",
      value: `${fmtNum(summary.profile.complete)}/${fmtNum(summary.profile.total)}`,
      sub: summary.profile.missing.length > 0 ? `Belum: ${summary.profile.missing.join(", ")}` : "Lengkap",
    },
    {
      // Judul layar "Produktivitas Terakhir" tak muat 33 mm — "terakhir" pindah ke sub-teks.
      title: "PRODUKTIVITAS",
      value: summary.lastProductivity ? `${fmtDec(summary.lastProductivity.tonHa)} Ton/Ha` : "—",
      sub: summary.lastProductivity ? `terakhir · tahun ${summary.lastProductivity.year}` : "Belum ada data",
    },
  ];
  const cardGap = 3;
  const cardW = (CONTENT_W - cardGap * 4) / 5;
  const cardH = 25;
  y = ensureSpace(doc, y, cardH + 4);
  cards.forEach((c, i) => {
    const x = MARGIN + i * (cardW + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...SLATE_200);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_400);
    doc.text(fitText(doc, c.title, cardW - 6), x + 3, y + 5.5);
    doc.setFontSize(11.5);
    doc.setTextColor(...SLATE_800);
    doc.text(fitText(doc, c.value, cardW - 6), x + 3, y + 12.5);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_600);
    // Sub-teks maksimal 2 baris (daftar field "Belum: …" bisa panjang) — sisanya "…".
    const all = doc.splitTextToSize(c.sub, cardW - 6) as string[];
    const sub = all.slice(0, 2);
    if (all.length > 2) sub[1] = fitText(doc, `${sub[1]}…`, cardW - 6);
    doc.text(sub, x + 3, y + 17.5);
  });
  y += cardH + SECTION_GAP;

  // ── Daftar Lahan — No = nomor peta sebaran = nomor lampiran.
  y = ensureSpace(doc, y, blockNeed(Math.min(parcels.length, 4) + 1, 7));
  sectionHeading(doc, `Daftar Lahan (${fmtNum(parcels.length)})`, y);
  y += 5;
  if (parcels.length === 0) {
    y = emptyLine(doc, "Petani ini belum memiliki lahan.", y);
  } else {
    const unmapped = parcels.length - mappedCount;
    autoTable(doc, {
      head: [["No", "Kode Lahan", "Kelompok Tani", "Blok", "Surat", "STDB", "NKT", "Luas (Ha)", "Tahun Tanam", "Pohon", "Patok", "Rev."]],
      body: parcels.map((p, i) => [
        numbers[i] != null ? String(numbers[i]) : "—",
        numbers[i] != null ? p.parcelId : `${p.parcelId}\nbelum dipetakan`,
        orDash(p.subGroupLv2),
        orDash(p.blok),
        orDash(p.surat),
        orDash(p.stdb),
        // Kolom sudah berjudul NKT → "Terdampak"/"Termasuk" tanpa akhiran (muat satu baris di 17 mm).
        isNktAffected(p.nktStatus) ? landNktStatusLabel(p.nktStatus!, true).replace(/ NKT$/, "") : p.nktStatus ? "Tidak" : "—",
        p.area != null ? fmtDec(p.area) : "—",
        orDash(p.plantingYear),
        p.treeCount > 0 ? fmtNum(p.treeCount) : "—",
        p.markerCount > 0 ? fmtNum(p.markerCount) : "—",
        String(p.revision),
      ]),
      foot: [[
        "", `Total ${fmtNum(parcels.length)} persil`, "", "", "", "", "",
        fmtDec(summary.totalArea), "",
        fmtNum(parcels.reduce((s, p) => s + p.treeCount, 0)),
        fmtNum(parcels.reduce((s, p) => s + p.markerCount, 0)),
        "",
      ]],
      startY: y,
      theme: "striped",
      ...tableCommon,
      // 12 kolom dalam 182 mm (Σ lebar tetap 174 + Rev. sisa 8): font 7,5 + padding 1,4;
      // Kode Lahan 34 mm memuat ID panjang "SSJ.14.01.12.2007.0002.A" satu baris.
      styles: { font: "helvetica", cellPadding: 1.4, overflow: "linebreak" },
      headStyles: { ...tableCommon.headStyles, fontSize: 7 },
      bodyStyles: { ...tableCommon.bodyStyles, fontSize: 7.5 },
      footStyles: { fillColor: [241, 245, 249], textColor: SLATE_800, fontSize: 7.5, fontStyle: "bold" },
      // Baris Total rata kanan di kolom angka (footStyles tidak mewarisi columnStyles).
      didParseCell: (d) => {
        if (d.section === "foot" && d.column.index >= 7) d.cell.styles.halign = "right";
      },
      columnStyles: {
        0: { halign: "right", cellWidth: 7 }, 1: { cellWidth: 34 }, 2: { cellWidth: 20 }, 3: { cellWidth: 11 },
        4: { cellWidth: 19 }, 5: { cellWidth: 21 }, 6: { cellWidth: 17 },
        7: { halign: "right", cellWidth: 12 }, 8: { halign: "right", cellWidth: 11 }, 9: { halign: "right", cellWidth: 11 },
        10: { halign: "right", cellWidth: 10 }, 11: { halign: "right" },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
    if (unmapped > 0) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...SLATE_600);
      doc.text(`${fmtNum(unmapped)} lahan belum dipetakan (tanpa poligon) — tercantum tanpa nomor peta dan tanpa lampiran Profil Lahan.`, MARGIN, y);
      y += 4;
    }
    y += SECTION_GAP - 4;
  }

  // ── Peta Sebaran Lahan — hanya bila ada geometri; bagian berikutnya naik bila tidak.
  if (mappedCount > 0) {
    // Tinggi adaptif 60–80 mm: pakai sisa halaman bila masih ≥ 60 mm (peta
    // ikut di halaman 1 untuk petani 1–4 lahan), selebihnya halaman baru 80 mm.
    const MAP_MAX = 80, MAP_MIN = 55, MAP_EXTRA = 23; // EXTRA = judul 5 + keterangan 2 baris + jarak section
    const room = CONTENT_BOTTOM - y - MAP_EXTRA;
    const mapH = room >= MAP_MIN ? Math.min(MAP_MAX, room) : MAP_MAX;
    y = ensureSpace(doc, y, mapH + MAP_EXTRA);
    sectionHeading(doc, "Peta Sebaran Lahan", y);
    y += 5;
    const box: Box = { x: MARGIN, y, w: CONTENT_W, h: mapH };
    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.4);
    doc.rect(box.x, box.y, box.w, box.h, "S");
    drawParcelsOverviewMap(doc, box, parcels);
    y += mapH + 4;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_600);
    // "Merah = lahan NKT" hanya bila memang ada penanda merah di peta (owner 2026-09-22).
    const hasNkt = parcels.some((p, i) => numbers[i] != null && isNktAffected(p.nktStatus));
    doc.text(`Lingkaran bernomor = titik tengah lahan; nomor = kolom No pada Daftar Lahan = nomor lampiran.${hasNkt ? " Merah = lahan NKT." : ""}`, MARGIN, y);
    y += 3.6;
    doc.setFont("helvetica", "italic");
    doc.text("Bentuk & batas tiap lahan: lihat lampiran Profil Lahan.", MARGIN, y);
    y += SECTION_GAP - 2;
  }

  // ── Pelatihan — SATU tabel (owner 2026-09-22, smoke prod: "dalam satu table
  // saja: Paket | Tanggal | Pre / Post Test"; semula checklist + riwayat terpisah).
  // Baris = tiap partisipasi, urut paket wajib (urutan checklist layar), paket
  // lain (OTHER) menyusul; paket wajib yang belum diikuti tetap satu baris
  // "Belum" supaya makna checklist tidak hilang. Lokasi tidak dicetak.
  const trainingRowCount = Math.max(training.checklist.length, 1) + Math.max(training.history.length - training.checklist.length, 0);
  y = ensureSpace(doc, y, blockNeed(trainingRowCount + 1));
  sectionHeading(doc, "Pelatihan", y);
  y += 5;
  const score = (h: { preTestScore: number | null; postTestScore: number | null }) =>
    h.preTestScore != null || h.postTestScore != null ? `${orDash(h.preTestScore)} / ${orDash(h.postTestScore)}` : "—";
  const byPackage = new Map<string, typeof training.history>();
  for (const h of training.history) byPackage.set(h.packageCode, [...(byPackage.get(h.packageCode) ?? []), h]);
  const trainingRows: string[][] = [];
  for (const c of training.checklist) {
    const items = byPackage.get(c.code) ?? [];
    byPackage.delete(c.code);
    if (items.length === 0) trainingRows.push([c.label, "Belum", "—"]);
    for (const h of items) trainingRows.push([c.label, fmtDate(h.trainingDate), score(h)]);
  }
  for (const h of [...byPackage.values()].flat().sort((a, b) => b.trainingDate.localeCompare(a.trainingDate))) {
    trainingRows.push([h.packageName, fmtDate(h.trainingDate), score(h)]);
  }
  if (trainingRows.length === 0) {
    y = emptyLine(doc, "Belum pernah mengikuti pelatihan.", y);
  } else {
    autoTable(doc, {
      // Font bawaan jsPDF (WinAnsi) tak punya "→" — pakai "/" (layar: "Pre → Post Test").
      head: [["Paket", "Tanggal", "Pre / Post Test"]],
      body: trainingRows,
      startY: y,
      theme: "striped",
      ...profileTable(),
      columnStyles: { 1: { cellWidth: 34 }, 2: { halign: "right", cellWidth: 32 } },
      // Baris "Belum" dibedakan (miring, abu) dari tanggal — tanpa mengubah teksnya.
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1 && data.cell.raw === "Belum") {
          data.cell.styles.fontStyle = "italic";
          data.cell.styles.textColor = SLATE_400;
        }
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY;
  }
  y += SECTION_GAP;

  // ── Produksi: matriks gabungan semua lahan + rekap per lahan per tahun.
  // Judul + pengantar + matriks (tahun ber-data biasanya ≤ 3 → satu blok).
  y = ensureSpace(doc, y, production.all.perYear.length === 0 ? 14 : blockNeed(production.all.perYear.length + 1, 6, 22, 60));
  sectionHeading(doc, "Produksi", y);
  y += 5;
  if (production.all.perYear.length === 0) {
    y = emptyLine(doc, "Belum ada data produksi untuk petani ini.", y);
    return drawBmpSection(doc, data, y + SECTION_GAP - 9);
  }
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_600);
  doc.text(
    `Produksi panen seluruh lahan dalam kg  ·  Total tercatat ${fmtNum(summary.productionTotalKg)} kg  ·  ${fmtNum(production.all.totalParcels)} persil, ${fmtDec(production.all.totalArea)} Ha`,
    MARGIN,
    y + 1,
  );
  y += 5;
  const cell = (n: number | undefined) => (n && n > 0 ? fmtNum(n) : "");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monthCols: Record<number, any> = {};
  for (let i = 2; i <= 13; i++) monthCols[i] = { halign: "right" };
  autoTable(doc, {
    head: [["Tahun", "Luas Terdata (Ha)", ...MONTHS_ID, "Total (kg)", "Ton/Ha"]],
    body: production.all.perYear.map((yr) => {
      const byMonth = new Map(yr.months.map((m) => [parseInt(m.period.slice(5, 7), 10), m.totalKg]));
      return [
        String(yr.year),
        fmtDec(yr.areaReporting),
        ...MONTHS_ID.map((_, i) => cell(byMonth.get(i + 1))),
        fmtNum(yr.totalKg),
        yr.productivityTonHa > 0 ? fmtDec(yr.productivityTonHa) : "—",
      ];
    }),
    startY: y,
    theme: "grid",
    headStyles: { fillColor: EMERALD, textColor: [255, 255, 255], fontSize: 6.5, fontStyle: "bold", halign: "right" },
    bodyStyles: { fontSize: 7, textColor: SLATE_600, halign: "right" },
    columnStyles: { 0: { halign: "left", fontStyle: "bold" }, 1: { halign: "right" }, ...monthCols, 14: { halign: "right", fontStyle: "bold" }, 15: { halign: "right", fontStyle: "bold" } },
    margin: tableCommon.margin,
    styles: { font: "helvetica", cellPadding: 1.5, overflow: "linebreak" },
    pageBreak: "auto",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 3.5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  doc.text("Ton/Ha = produksi tahun tsb ÷ total luas lahan yang melapor tahun itu (Luas Terdata) — sama dengan tab Produksi di layar.", MARGIN, y + 2);
  y += 9;

  // Rekap per lahan per tahun — rincian bulanan per lahan TIDAK diulang (ada di lampiran).
  // Bentuk PIVOT (owner 2026-09-22, "biar lebih enak dibaca"): satu baris per
  // lahan, tahun berjajar sebagai kelompok kolom kg · Ton/Ha · bulan, urutan
  // tahun = matriks di atasnya (terbaru dulu) + baris Total dari `perYear`
  // supaya kedua tabel saling mengikat. Lebih dari 4 tahun ber-data → terlalu
  // lebar → kembali ke baris-per-tahun, tetapi ID/Luas/Umur hanya di baris
  // pertama tiap lahan (tanpa pengulangan).
  const umur = (r: { isPsr: boolean; plantingYear: number | null }) =>
    r.isPsr ? "PSR" : r.plantingYear != null ? `${production.currentYear - r.plantingYear} thn` : "—";
  const monthsFilled = (r: { months: Record<number, unknown> }) => `${Object.keys(r.months).length}/12`;
  const years = [...new Set(production.parcelBreakdown.map((r) => r.year))].sort((a, b) => b - a);
  const byParcel = new Map<string, { label: string; area: number | null; isPsr: boolean; plantingYear: number | null; rows: Map<number, (typeof production.parcelBreakdown)[number]> }>();
  for (const r of [...production.parcelBreakdown].sort((a, b) => a.label.localeCompare(b.label, "id") || b.year - a.year)) {
    const g = byParcel.get(r.parcelKey) ?? { label: r.label, area: r.area, isPsr: r.isPsr, plantingYear: r.plantingYear, rows: new Map() };
    g.rows.set(r.year, r);
    byParcel.set(r.parcelKey, g);
  }
  const groups = [...byParcel.values()];
  // ≤ 3 tahun: tiap sub-kolom ≥ 12 mm sehingga judul "Ton/Ha" 7,5 pt masih satu baris (prod: maks 3 tahun/petani).
  const pivot = years.length <= 3;
  const rowCount = pivot ? groups.length + 2 : production.parcelBreakdown.length + 1;
  y = ensureSpace(doc, y, blockNeed(rowCount, 6.4, pivot ? 18 : 11));
  subHeading(doc, "Rekap per Lahan per Tahun", y);
  y += 3;
  const perYear = new Map(production.all.perYear.map((p) => [p.year, p]));
  const tonHa = (n: number) => (n > 0 ? fmtDec(n) : "—");
  if (pivot) {
    const yearCols = years.length * 3;
    autoTable(doc, {
      head: [
        [
          { content: "Lahan", rowSpan: 2 }, { content: "Luas (Ha)", rowSpan: 2, styles: { halign: "right" } }, { content: "Umur/PSR", rowSpan: 2, styles: { halign: "center" } },
          ...years.map((yr) => ({ content: String(yr), colSpan: 3, styles: { halign: "center" as const } })),
        ],
        years.flatMap(() => [{ content: "kg", styles: { halign: "right" as const } }, { content: "Ton/Ha", styles: { halign: "right" as const } }, { content: "Bulan", styles: { halign: "right" as const } }]),
      ],
      body: groups.map((g) => [
        g.label,
        g.area != null ? fmtDec(g.area) : "—",
        umur(g),
        ...years.flatMap((yr) => {
          const r = g.rows.get(yr);
          return r ? [fmtNum(r.totalKg), tonHa(r.productivityTonHa), monthsFilled(r)] : ["—", "—", "—"];
        }),
      ]),
      foot: [[
        "Total", fmtDec(production.all.totalArea), "",
        ...years.flatMap((yr) => {
          const p = perYear.get(yr);
          return p ? [fmtNum(p.totalKg), tonHa(p.productivityTonHa), `${p.months.length}/12`] : ["", "", ""];
        }),
      ]],
      startY: y,
      theme: "striped",
      ...profileTable(),
      headStyles: { ...profileTable().headStyles, fontSize: 7.5 },
      footStyles: { fillColor: [241, 245, 249], textColor: SLATE_800, fontSize: 8, fontStyle: "bold" },
      // Lahan 38 (ID panjang satu baris) · Luas 13 · Umur/PSR 19 = 70 mm; tiap tahun berbagi sisa 112 mm (≥ 37 mm per tahun).
      columnStyles: {
        0: { cellWidth: 38 }, 1: { halign: "right", cellWidth: 13 }, 2: { halign: "center", cellWidth: 19 },
        ...Object.fromEntries(Array.from({ length: yearCols }, (_, i) => [3 + i, { halign: "right" }])),
      },
      // Baris Total: rata kanan mengikuti kolom angka (footStyles tidak mewarisi columnStyles).
      didParseCell: (d) => {
        if (d.section === "foot" && d.column.index >= 1) d.cell.styles.halign = d.column.index === 2 ? "center" : "right";
      },
      // Garis pemisah tipis di kiri tiap kelompok tahun supaya tiga kolomnya terbaca satu kesatuan.
      didDrawCell: (d) => {
        if (d.column.index >= 3 && (d.column.index - 3) % 3 === 0) {
          doc.setDrawColor(...SLATE_200);
          doc.setLineWidth(0.3);
          doc.line(d.cell.x, d.cell.y, d.cell.x, d.cell.y + d.cell.height);
        }
      },
    });
  } else {
    const body: string[][] = [];
    for (const g of groups) {
      [...g.rows.values()].forEach((r, i) => {
        body.push([i === 0 ? g.label : "", String(r.year), i === 0 ? (g.area != null ? fmtDec(g.area) : "—") : "", i === 0 ? umur(g) : "", fmtNum(r.totalKg), tonHa(r.productivityTonHa), monthsFilled(r)]);
      });
    }
    autoTable(doc, {
      head: [["Lahan", "Tahun", "Luas (Ha)", "Umur/PSR", "Produksi (kg)", "Ton/Ha", "Bulan Terisi"]],
      body,
      startY: y,
      theme: "striped",
      ...profileTable(),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "center" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 3.5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  doc.text("Bulan = jumlah bulan ber-data dari 12; Ton/Ha lahan = produksi ÷ luas lahan. Rincian bulanan tiap lahan ada di lampiran Profil Lahan.", MARGIN, y + 2, { maxWidth: CONTENT_W });
  y += 6;
  return drawBmpSection(doc, data, y + SECTION_GAP);
}

/**
 * Section Monev BMP (owner 2026-09-22): tabel per tahun (Tgl Survei · Skor ·
 * Kategori · Lahan · Penilai · terisi n/m · skor 5 kegiatan) + radar tahun
 * terbaru dengan daftar kegiatannya (cermin tab Monev BMP #344/#346).
 * Dilewati seluruhnya bila `bmp` null (tanpa izin VIEW menu Monev BMP).
 */
function drawBmpSection(doc: jsPDF, data: FarmerProfilePassport, y: number): number {
  const { bmp } = data;
  if (!bmp) return y;
  const tableCommon = profileTable();
  // Satu blok utuh: judul + tabel + legenda + radar (≈ 72 mm) — radar sendirian
  // di halaman berikutnya terbaca yatim; tabel > 5 tahun boleh pecah (cap).
  const hasRadar = bmp.assessments.some((a) => a.activities.length > 0);
  y = ensureSpace(doc, y, bmp.assessments.length === 0 ? 14 : blockNeed(bmp.assessments.length + 1, 8, 20 + (hasRadar ? 72 : 0), 130));
  sectionHeading(doc, "Monev BMP", y);
  y += 5;
  if (bmp.assessments.length === 0) return emptyLine(doc, "Belum ada penilaian Monev BMP untuk petani ini.", y);

  // Kolom kegiatan mengikuti penilaian pertama yang punya rincian (master sama untuk semua tahun).
  const activityCols = bmp.assessments.find((a) => a.activities.length > 0)?.activities.map((a) => ({ code: a.code, name: a.name })) ?? [];
  autoTable(doc, {
    head: [["Tahun", "Tgl Survei", "Skor", "Kategori", "Lahan Dikunjungi", "Penilai", ...activityCols.map((c) => bmpShortName(c.name))]],
    body: bmp.assessments.map((a) => [
      String(a.surveyYear),
      formatUtcDate(a.surveyDate),
      formatScore(a.score),
      bmpAssessmentCategory(a.score).label,
      orDash(a.parcelId),
      orDash(a.assessor),
      ...activityCols.map((c) => {
        const act = a.activities.find((x) => x.code === c.code);
        return act ? formatScore(act.score) : "—";
      }),
    ]),
    startY: y,
    theme: "striped",
    ...tableCommon,
    styles: { font: "helvetica", cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { ...tableCommon.headStyles, fontSize: 7 },
    // 11 kolom: 6 tetap = 106 mm, 5 kegiatan berbagi ≈ 76 mm (≈ 15 mm — "Pemupukan" 7 pt muat satu baris);
    // Lahan Dikunjungi 28 mm: ID panjang "ITM.0043.A.14.06.06.2017" boleh 2 baris.
    columnStyles: {
      0: { cellWidth: 11 }, 1: { cellWidth: 18 }, 2: { halign: "right", cellWidth: 11 }, 3: { cellWidth: 22 }, 4: { cellWidth: 28 }, 5: { cellWidth: 16 },
      ...Object.fromEntries(activityCols.map((_, i) => [6 + i, { halign: "right" }])),
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 3.5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE_400);
  doc.text(`Kategori: ${BMP_ASSESSMENT_CATEGORIES.map((c) => `${c.label} ${c.range}`).join(" · ")} (skala 0–3). Kolom kegiatan = skor kegiatan /3.`, MARGIN, y + 2, { maxWidth: CONTENT_W });
  y += 9;

  // Radar tahun terbaru yang punya rincian + daftar kegiatan (kanan) — satu blok utuh.
  const latest = bmp.assessments.find((a) => a.activities.length > 0);
  if (!latest) return y;
  const R = 22;
  const boxH = 2 * R + 20;
  y = ensureSpace(doc, y, boxH + 8);
  subHeading(doc, `Rincian ${latest.surveyYear} — skor ${formatScore(latest.score)} (${bmpAssessmentCategory(latest.score).label})`, y);
  y += 4;
  const radarW = 70;
  drawBmpRadar(doc, MARGIN + radarW / 2, y + R + 8, R, latest.activities);
  let ry = y + 6;
  const rx = MARGIN + radarW + 6;
  for (const a of latest.activities) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_800);
    // Nama terpanjang "1.4 Pengendalian Hama Penyakit Terpadu (PHPT)" ≈ 66 mm pada 8 pt — sisa 70 mm setelah kolom angka 36 mm.
    doc.text(fitText(doc, `${a.code} ${a.name}`, CONTENT_W - radarW - 6 - 36), rx, ry);
    doc.setTextColor(...SLATE_400);
    doc.text(`${a.filled}/${a.total} terisi`, PAGE_W - MARGIN - 18, ry, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_800);
    doc.text(`${formatScore(a.score)} / ${formatScore(a.max)}`, PAGE_W - MARGIN, ry, { align: "right" });
    ry += 5.5;
  }
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...SLATE_600);
  doc.text(
    `Indikator Lembaga: ${latest.groupFilled != null ? `terisi ${latest.groupFilled}/${latest.groupTotal}` : "belum ada penilaian Lembaga tahun ini"}${latest.notes ? ` · Catatan: ${latest.notes}` : ""}`,
    rx,
    ry + 1,
    { maxWidth: CONTENT_W - radarW - 6 },
  );
  return Math.max(y + boxH, ry + 6);
}

/**
 * Build dokumen Profil Petani (tanpa save): Bagian A, lalu lampiran Profil
 * Lahan per lahan ber-geometri (urut nomor tabel), lalu SATU pass footer
 * "Hal. n/N" menerus + metadata berkas. Dipisah dari
 * `generateFarmerProfilePdf` agar bisa diverifikasi unit test (pola TD-019).
 */
export function buildFarmerProfileDoc(data: FarmerProfilePassport): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  drawFarmerSummary(doc, data);

  if (data.includeParcels) {
    const total = data.parcelPassports.length;
    data.parcelPassports.forEach((passport, i) => {
      drawFarmPassport(doc, passport, { appendix: { no: i + 1, total } });
    });
  }

  drawFootersOnAllPages(doc);
  // Judul ASCII saja: jsPDF meng-encode metadata non-ASCII sebagai UTF-16 (aman di reader, tapi tak perlu).
  doc.setProperties({
    title: `Profil Petani ${data.farmer.code} - ${data.farmer.name}`,
    subject: `Profil Petani ${data.farmer.name} (${data.farmer.code}) · ${orDash(data.group.name)}${data.includeParcels ? ` · ${data.parcelPassports.length} lampiran Profil Lahan` : " · ringkasan saja"}`,
    author: "Smallholder HUB",
  });
  return doc;
}

/** Generate & unduh PDF Profil Petani. */
export function generateFarmerProfilePdf(data: FarmerProfilePassport) {
  const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "_");
  buildFarmerProfileDoc(data).save(`Profil_Petani_${safe(orDash(data.group.name))}_${safe(data.farmer.name)}_${safe(data.farmer.code)}.pdf`);
}
