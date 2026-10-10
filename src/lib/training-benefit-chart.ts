/**
 * Grafik kartu Training Benefit per year (#402/#403) — helper MURNI (tanpa React/DOM):
 * data trayektori vs Kontrak, tata letak grafik trayektori (dipakai komponen layar DAN
 * gambar ekspor Excel agar keduanya tak menyimpang), serta pembangun SVG berwarna tetap
 * untuk gambar Excel (Grafis & vs Kontrak). SVG ekspor memakai font sistem karena
 * web font tidak ikut saat SVG dirender sebagai gambar.
 */
import { formatNumber } from "@/lib/format";
import type { ContractRow } from "@/lib/program-target";
import type { TrainingBenefitRow, TrainingBenefitYear } from "@/lib/training-dashboard-aggregation";

export interface TrajectoryPoint {
  label: string;
  target: number;
  /** null = tahun belum berjalan. */
  actual: number | null;
}

/** Titik kumulatif target & realisasi: Start lalu tiap tahun bertarget; realisasi berhenti di tahun berjalan. */
export function contractTrajectory(row: ContractRow, baselineYear: number | null, years: number[], currentYear: number): TrajectoryPoint[] {
  const pts: TrajectoryPoint[] = [];
  let t = row.start?.target ?? 0;
  let a = row.start?.actual ?? 0;
  if (baselineYear != null) pts.push({ label: `s.d. ${baselineYear}`, target: t, actual: a });
  years.forEach((y, i) => {
    t += row.years[i].target ?? 0;
    a += row.years[i].actual;
    pts.push({ label: String(y), target: t, actual: y <= currentYear ? a : null });
  });
  return pts;
}

/** Angka kepala kotak: total kontrak (target kumulatif terakhir), realisasi terkini, % capaian. */
export function trajectorySummary(pts: TrajectoryPoint[]): { total: number; realized: number; pct: number | null } {
  const total = pts.at(-1)?.target ?? 0;
  const realized = [...pts].reverse().find((p) => p.actual != null)?.actual ?? 0;
  return { total, realized, pct: total > 0 ? Math.round((realized / total) * 100) : null };
}

/** Selisih realisasi − target dalam 1% target dianggap sesuai (angka kontrak dibulatkan). */
const ON_TARGET_TOLERANCE = 0.01;
export const onTarget = (gap: number, target: number) => target > 0 && Math.abs(gap) < target * ON_TARGET_TOLERANCE;

export const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}k` : String(n));

/** Kotak gambar satu grafik trayektori (satuan viewBox). */
export const TRAJECTORY_BOX = { W: 380, H: 190, L: 44, R: 16, T: 16, B: 28 } as const;

export interface TrajectoryLayout {
  xs: number[];
  yTarget: number[];
  yActual: (number | null)[];
  ticks: { value: number; y: number; label: string }[];
  curIdx: number;
  targetPath: string;
  actualPath: string;
  /** Titik target berimpit titik realisasi → digambar sebagai cincin di sekelilingnya. */
  ring: boolean[];
  gapLabel: { x: number; y: number; anchor: "start" | "end"; text: string; tone: "ok" | "behind" } | null;
}

/**
 * Tata letak grafik trayektori. Skala Y dari `scaleMax` (sama untuk semua grafik kecil agar
 * tinggi garis antarpaket bisa dibandingkan). Label selisih di bawah titik yang lebih rendah:
 * ruang itu kosong — tak menabrak cincin target maupun garis target ke tahun berikutnya.
 */
export function trajectoryLayout(points: TrajectoryPoint[], currentLabel: string, scaleMax: number): TrajectoryLayout {
  const { W, H, L, R, T, B } = TRAJECTORY_BOX;
  const max = Math.max(1, scaleMax) * 1.08;
  const x = (i: number) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const xs = points.map((_, i) => x(i));
  const yTarget = points.map((p) => y(p.target));
  const yActual = points.map((p) => (p.actual == null ? null : y(p.actual)));
  const path = (ys: (number | null)[]) => ys.map((v, i) => (v == null ? null : `${xs[i]},${v}`)).filter(Boolean).join(" ");
  const lastReal = yActual.reduce<number>((acc, v, i) => (v != null ? i : acc), -1);
  const curIdx = points.findIndex((p) => p.label === currentLabel);
  const gapIdx = curIdx >= 0 && points[curIdx].actual != null ? curIdx : lastReal;
  let gapLabel: TrajectoryLayout["gapLabel"] = null;
  if (gapIdx >= 0) {
    const p = points[gapIdx];
    const gap = (p.actual ?? 0) - p.target;
    const lx = Math.min(xs[gapIdx] + 12, W - R);
    const anchor = xs[gapIdx] + 12 > W - R - 80 ? "end" : "start";
    const ly = Math.max(yTarget[gapIdx], yActual[gapIdx] ?? 0) + 17;
    if (onTarget(gap, p.target)) gapLabel = { x: lx, y: ly, anchor, text: "≈ sesuai target", tone: "ok" };
    else if (gap !== 0)
      gapLabel = {
        x: lx,
        y: ly,
        anchor,
        text: gap < 0 ? `tertinggal ${formatNumber(-gap)}` : `+${formatNumber(gap)} di atas target`,
        tone: gap < 0 ? "behind" : "ok",
      };
  }
  return {
    xs,
    yTarget,
    yActual,
    // Nilai tick unik: skala ≤ 1 (target 0, tanpa pelatihan) membulatkan 0,5 → 1 → kunci & label ganda (review).
    ticks: [...new Set([0, 0.5, 1].map((f) => Math.round((max / 1.08) * f)))].map((value) => ({ value, y: y(value), label: fmtK(value) })),
    curIdx,
    targetPath: path(yTarget),
    actualPath: path(yActual),
    ring: points.map((_, i) => yActual[i] != null && Math.abs(yActual[i]! - yTarget[i]) < 7),
    gapLabel,
  };
}

// ── SVG ekspor (warna tetap, setara kelas Tailwind di layar) ──────────────────────────

const C = {
  text: "#0f172a",
  muted: "#64748b",
  grid: "#e2e8f0",
  track: "#f1f5f9",
  seg: ["#065f46", "#10b981", "#6ee7b7"],
  segText: ["#ffffff", "#ffffff", "#022c22"],
  actual: "#059669",
  target: "#94a3b8",
  band: "rgba(16,185,129,0.10)",
  ok: "#047857",
  behind: "#d97706",
  pct: "#047857",
  anyBorder: "#6ee7b7",
  anyFill: "#f0fdf4",
  border: "#e2e8f0",
};
const FONT = "Arial, Helvetica, sans-serif";

/** Escape teks untuk SVG — label paket memuat "&" (P&C RSPO). */
export const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const text = (x: number, y: number, s: string, o: { size?: number; weight?: number; fill?: string; anchor?: string } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${o.size ?? 12}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? C.text}" text-anchor="${o.anchor ?? "start"}">${xmlEscape(s)}</text>`;

/** Margin putih di sekeliling gambar agar teks rata kanan/kiri tak menempel bingkai. */
const MARGIN = 8;
const svgDoc = (w: number, h: number, body: string) => {
  const W = w + MARGIN * 2, H = h + MARGIN * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/><g transform="translate(${MARGIN},${MARGIN})">${body}</g></svg>`;
};

/**
 * Gambar tampilan Grafis: bar bertumpuk per paket + baris "pernah mengikuti"; trek penuh =
 * petani aktif, sisa abu = belum dilatih; angka di segmen bila ≥ 9% trek (sama dengan layar).
 */
export function benefitBarsSvg(years: TrainingBenefitYear[], rows: TrainingBenefitRow[], any: TrainingBenefitRow, activeFarmers: number): { svg: string; width: number; height: number } {
  const W = 960, TRACK_X = 370, TRACK_W = 500, ROW_H = 30, GAP = 14, TOP = 44;
  const lastIdx = years.length - 1;
  const max = Math.max(1, activeFarmers, ...[...rows, any].map((r) => r.cells[lastIdx].cumulative));
  const parts: string[] = [];
  // Legenda
  let lx = 0;
  years.forEach((y, i) => {
    parts.push(`<rect x="${lx}" y="8" width="12" height="12" rx="2" fill="${C.seg[i]}"/>`);
    const label = y.upTo ? `s.d. ${y.year}` : `baru ${y.year}`;
    parts.push(text(lx + 18, 18, label, { size: 12, fill: C.muted }));
    lx += 30 + label.length * 7;
  });
  parts.push(`<rect x="${lx}" y="8" width="12" height="12" rx="2" fill="${C.track}" stroke="${C.border}"/>`);
  parts.push(text(lx + 18, 18, `belum dilatih · trek penuh = ${formatNumber(activeFarmers)} petani terdaftar`, { size: 12, fill: C.muted }));
  parts.push(text(W, 18, `Angka di ujung = kumulatif s.d. ${years[lastIdx].year}`, { size: 12, fill: C.muted, anchor: "end" }));

  const drawRow = (r: TrainingBenefitRow, top: number, strong: boolean) => {
    const total = r.cells[lastIdx].cumulative;
    const cy = top + ROW_H / 2 + 4;
    parts.push(text(0, cy, r.label, { size: 13, weight: strong ? 700 : 500 }));
    parts.push(`<rect x="${TRACK_X}" y="${top}" width="${TRACK_W}" height="${ROW_H}" rx="6" fill="${C.track}"/>`);
    let x = TRACK_X;
    r.cells.forEach((c, i) => {
      if (c.actual <= 0) return;
      const w = (c.actual / max) * TRACK_W;
      parts.push(`<rect x="${x}" y="${top}" width="${w}" height="${ROW_H}" fill="${C.seg[i]}"/>`);
      if (c.actual / max >= 0.09) parts.push(text(x + w / 2, cy, i === 0 ? formatNumber(c.actual) : `+${formatNumber(c.actual)}`, { size: 12, weight: 700, fill: C.segText[i], anchor: "middle" }));
      x += w;
    });
    parts.push(text(W, cy, formatNumber(total), { size: 14, weight: strong ? 700 : 600, anchor: "end" }));
  };
  rows.forEach((r, i) => drawRow(r, TOP + i * (ROW_H + GAP), false));
  const sepY = TOP + rows.length * (ROW_H + GAP) + 2;
  parts.push(`<line x1="0" x2="${W}" y1="${sepY}" y2="${sepY}" stroke="${C.border}"/>`);
  drawRow(any, sepY + 12, true);
  const height = sepY + 12 + ROW_H + 10;
  return { svg: svgDoc(W, height, parts.join("")), width: W + MARGIN * 2, height: height + MARGIN * 2 };
}

/** Satu grafik trayektori sebagai fragmen SVG pada (ox, oy) — warna tetap. */
function trajectoryFragment(points: TrajectoryPoint[], currentLabel: string, scaleMax: number, ox: number, oy: number): string {
  const { W, H, L, R, T, B } = TRAJECTORY_BOX;
  const lay = trajectoryLayout(points, currentLabel, scaleMax);
  const out: string[] = [`<g transform="translate(${ox},${oy})">`];
  for (const t of lay.ticks) {
    out.push(`<line x1="${L}" x2="${W - R}" y1="${t.y}" y2="${t.y}" stroke="${C.grid}" stroke-dasharray="2 3"/>`);
    out.push(text(L - 6, t.y + 4, t.label, { size: 11, fill: C.muted, anchor: "end" }));
  }
  if (lay.curIdx >= 0) out.push(`<rect x="${lay.xs[lay.curIdx] - 14}" y="${T}" width="28" height="${H - T - B}" rx="4" fill="${C.band}"/>`);
  points.forEach((p, i) =>
    out.push(text(lay.xs[i], H - 8, p.label, { size: 11.5, weight: i === lay.curIdx ? 700 : 400, fill: i === lay.curIdx ? C.text : C.muted, anchor: "middle" })),
  );
  out.push(`<polyline points="${lay.targetPath}" fill="none" stroke="${C.target}" stroke-width="2" stroke-dasharray="5 4"/>`);
  if (lay.actualPath) out.push(`<polyline points="${lay.actualPath}" fill="none" stroke="${C.actual}" stroke-width="2.75"/>`);
  lay.yActual.forEach((ya, i) => {
    if (ya != null) out.push(`<circle cx="${lay.xs[i]}" cy="${ya}" r="4" fill="${C.actual}"/>`);
  });
  lay.yTarget.forEach((yt, i) =>
    out.push(`<circle cx="${lay.xs[i]}" cy="${yt}" r="${lay.ring[i] ? 6.5 : 3.5}" fill="${lay.ring[i] ? "none" : "#ffffff"}" stroke="${C.target}" stroke-width="1.5"/>`),
  );
  if (lay.gapLabel) {
    const g = lay.gapLabel;
    out.push(text(g.x, g.y, g.text, { size: 12.5, weight: 700, fill: g.tone === "behind" ? C.behind : C.ok, anchor: g.anchor }));
  }
  out.push("</g>");
  return out.join("");
}

export interface ContractSeries {
  label: string;
  points: TrajectoryPoint[];
  /** Kotak total program ("pernah mengikuti") ditonjolkan. */
  emphasis: boolean;
}

/**
 * Gambar tampilan vs Kontrak: grid 3 kolom grafik kecil (skala Y bersama), tiap kotak
 * berjudul + realisasi "dari" total kontrak + % capaian — sama dengan layar.
 */
export function contractGridSvg(series: ContractSeries[], currentYear: number): { svg: string; width: number; height: number } {
  const COLS = 3, PAD = 14, GAP = 16, HEAD = 64;
  const cardW = TRAJECTORY_BOX.W + PAD * 2;
  const cardH = HEAD + TRAJECTORY_BOX.H + PAD;
  const scaleMax = Math.max(1, ...series.flatMap((s) => s.points.map((p) => Math.max(p.target, p.actual ?? 0))));
  const rowsN = Math.max(1, Math.ceil(series.length / COLS));
  const width = COLS * cardW + (COLS - 1) * GAP;
  const legendH = 30;
  const height = rowsN * cardH + (rowsN - 1) * GAP + legendH;
  const parts: string[] = [];
  series.forEach((s, i) => {
    const ox = (i % COLS) * (cardW + GAP);
    const oy = Math.floor(i / COLS) * (cardH + GAP);
    const { total, realized, pct } = trajectorySummary(s.points);
    parts.push(
      `<rect x="${ox + 0.5}" y="${oy + 0.5}" width="${cardW - 1}" height="${cardH - 1}" rx="8" fill="${s.emphasis ? C.anyFill : "#ffffff"}" stroke="${s.emphasis ? C.anyBorder : C.border}"/>`,
    );
    parts.push(text(ox + PAD, oy + 22, s.label, { size: 12, weight: s.emphasis ? 700 : 500, fill: s.emphasis ? C.text : C.muted }));
    // Satu <text> dengan tspan: "dari …" mengikuti lebar angka besar tanpa menaksir lebar huruf.
    const sub = total > 0 ? `dari ${formatNumber(total)}` : "target belum diisi";
    parts.push(
      `<text x="${ox + PAD}" y="${oy + 52}" font-family="${FONT}" fill="${C.text}"><tspan font-size="24" font-weight="700">${formatNumber(realized)}</tspan><tspan dx="8" font-size="12" fill="${C.muted}">${xmlEscape(sub)}</tspan></text>`,
    );
    if (pct != null) parts.push(text(ox + cardW - PAD, oy + 54, `${pct}%`, { size: 28, weight: 700, fill: C.pct, anchor: "end" }));
    parts.push(trajectoryFragment(s.points, String(currentYear), scaleMax, ox + PAD, oy + HEAD));
  });
  const ly = height - 10;
  parts.push(`<line x1="0" x2="22" y1="${ly - 4}" y2="${ly - 4}" stroke="${C.actual}" stroke-width="2.75"/>`);
  parts.push(text(28, ly, "realisasi kumulatif", { size: 12, fill: C.muted }));
  parts.push(`<line x1="160" x2="182" y1="${ly - 4}" y2="${ly - 4}" stroke="${C.target}" stroke-width="2" stroke-dasharray="5 4"/>`);
  parts.push(text(188, ly, "target kontrak kumulatif", { size: 12, fill: C.muted }));
  parts.push(text(width, ly, "Persen = realisasi ÷ total kontrak paket itu · skala sumbu sama di semua grafik", { size: 12, fill: C.muted, anchor: "end" }));
  return { svg: svgDoc(width, height, parts.join("")), width: width + MARGIN * 2, height: height + MARGIN * 2 };
}
