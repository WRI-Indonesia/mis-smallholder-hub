"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORICAL } from "@/lib/chart-palette";
import { MONTH_SHORT_ID, axisMax } from "@/lib/format";
import { addDays, clipWeeks, weeklyTrend, type GithubIssue, type WeekBucket } from "@/lib/github-issues";

/**
 * Tab Tren mingguan (minggu Senin–Minggu, WIB), tiga kartu:
 * 1. batang dibuat vs ditutup per minggu;
 * 2. akumulasi bertumpuk (permintaan owner 2026-10-13): kumulatif ditutup
 *    (bawah) + masih terbuka (atas) — tinggi batang = kumulatif dibuat;
 * 3. garis masih terbuka di akhir minggu — grafik terpisah, bukan sumbu kedua.
 * Warna per entitas (Dibuat biru · Ditutup aqua · Masih terbuka oranye) dari
 * `CATEGORICAL`, lulus validator dataviz light & dark; kontras aqua di light
 * < 3:1 → direlief readout angka, legenda, dan tabel.
 *
 * Data = issue tersaring cari + label SAJA (bukan status/rentang), lalu
 * minggu dipotong ke rentang aktivitas — lihat `clipWeeks`.
 */

/** Lebar cadangan sebelum wadah terukur (render pertama). */
const FALLBACK_W = 720;
/** Padding horizontal CardContent (`px-4` = 2 × 16px) + border kartu 2 × 1px — lebar SVG = wadah − ini. */
const CARD_PAD_X = 34;
const BAR_H = 200;
const LINE_H = 140;
const PAD = { l: 36, r: 12, t: 10, b: 24 };

const SERIES = {
  created: { ...CATEGORICAL[0], label: "Dibuat" },
  closed: { ...CATEGORICAL[2], label: "Ditutup" },
  open: { ...CATEGORICAL[1], label: "Masih terbuka" },
} as const;
type SeriesKey = keyof typeof SERIES;

const shortDay = (d: string) => `${Number(d.slice(8))} ${MONTH_SHORT_ID[Number(d.slice(5, 7)) - 1]}`;
const weekRange = (w: string) => `${shortDay(w)} – ${shortDay(addDays(w, 6))} ${addDays(w, 6).slice(0, 4)}`;

function Gridlines({ max, w, h, grid }: { max: number; w: number; h: number; grid: string }) {
  const plotH = h - PAD.t - PAD.b;
  return (
    <>
      {[0, 0.5, 1].filter((f) => Number.isInteger(max * f)).map((f) => {
        const y = PAD.t + plotH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y} y2={y} stroke={grid} />
            <text x={PAD.l - 6} y={y + 3} textAnchor="end" fontSize={10} className="fill-muted-foreground">
              {max * f}
            </text>
          </g>
        );
      })}
    </>
  );
}

/** Label bulan di sumbu X: pada minggu pertama tiap bulan. */
function MonthTicks({ weeks, slot, h }: { weeks: WeekBucket[]; slot: number; h: number }) {
  return (
    <>
      {weeks.map((b, i) => {
        const prev = weeks[i - 1];
        if (prev && prev.week.slice(0, 7) === b.week.slice(0, 7)) return null;
        return (
          <text key={b.week} x={PAD.l + slot * i} y={h - 6} fontSize={10} className="fill-muted-foreground">
            {MONTH_SHORT_ID[Number(b.week.slice(5, 7)) - 1]}
          </text>
        );
      })}
    </>
  );
}

function Legend({ keys, color }: { keys: SeriesKey[]; color: (k: SeriesKey) => string }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {keys.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(k) }} aria-hidden />
          {SERIES[k].label}
        </span>
      ))}
    </div>
  );
}

/** Kartu satu grafik: judul, legenda, dan readout angka minggu yang disorot/diketuk. */
function ChartCard({ title, legend, readout, children }: { title: string; legend?: ReactNode; readout: ReactNode; children: ReactNode }) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="space-y-2 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          {legend}
        </div>
        <p className="min-h-4 text-xs tabular-nums text-muted-foreground">{readout}</p>
        {children}
      </CardContent>
    </Card>
  );
}

export function IssuesTrend({
  issues,
  today,
  from,
  to,
}: {
  issues: GithubIssue[];
  today: string;
  from: string | null;
  to: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const grid = dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)";
  const surface = dark ? "#26332a" : "#ffffff";
  const color = (k: SeriesKey) => (dark ? SERIES[k].dark : SERIES[k].light);
  const weeks = useMemo(() => clipWeeks(weeklyTrend(issues, today), from, to), [issues, today, from, to]);

  // Sorotan = minggu (kunci), bukan indeks: filter yang mengubah daftar minggu
  // tak boleh membuat readout menunjuk minggu lain (review #429).
  const [hoverWeek, setHoverWeek] = useState<string | null>(null);
  const hoverIdx = hoverWeek ? weeks.findIndex((b) => b.week === hoverWeek) : -1;
  const hovered = hoverIdx >= 0 ? weeks[hoverIdx] : null;

  // Lebar SVG = lebar wadah (pola `time-series-chart.tsx`): tinggi & ukuran teks
  // tetap di layar lebar, bukan ikut membesar seperti viewBox yang diregangkan.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setMeasured(el.clientWidth));
    ro.observe(el);
    setMeasured(el.clientWidth);
    return () => ro.disconnect();
  }, [weeks.length]);
  const W = measured ? Math.max(0, measured - CARD_PAD_X) : FALLBACK_W;

  if (weeks.length === 0) {
    return (
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Tidak ada issue untuk filter ini.</CardContent>
      </Card>
    );
  }

  const slot = (W - PAD.l - PAD.r) / weeks.length;
  const pairW = Math.max(2, Math.min(18, (slot - 6) / 2));
  const stackW = Math.max(3, Math.min(28, slot - 4));
  const barMax = axisMax(Math.max(...weeks.map((b) => Math.max(b.created, b.closed))), 5);
  const stackMax = axisMax(Math.max(...weeks.map((b) => b.closedTotal + b.openAtEnd)), 5);
  const openMax = axisMax(Math.max(...weeks.map((b) => b.openAtEnd)), 5);
  const cx = (i: number) => PAD.l + slot * i + slot / 2;
  const base = (h: number) => h - PAD.b;
  const yOf = (v: number, max: number, h: number) => PAD.t + (h - PAD.t - PAD.b) * (1 - v / max);

  // Target sorot/ketuk selebar slot penuh — lebih besar dari batangnya; onClick
  // supaya ketukan di layar sentuh juga menampilkan angka.
  const hitTargets = (h: number) =>
    weeks.map((b, i) => (
      <rect
        key={b.week}
        x={PAD.l + slot * i}
        y={0}
        width={slot}
        height={base(h)}
        fill={hoverIdx === i ? (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)") : "transparent"}
        onMouseEnter={() => setHoverWeek(b.week)}
        onClick={() => setHoverWeek(b.week)}
      />
    ));
  const hint = "Arahkan kursor (atau ketuk) sebuah minggu untuk melihat angkanya.";
  const svgProps = (h: number, label: string) => ({
    width: W,
    height: h,
    className: "block",
    role: "img" as const,
    "aria-label": label,
    onMouseLeave: () => setHoverWeek(null),
  });

  return (
    <div ref={wrapRef} className="space-y-4">
      <ChartCard
        title="Issue dibuat vs ditutup per minggu"
        legend={<Legend keys={["created", "closed"]} color={color} />}
        readout={hovered ? `${weekRange(hovered.week)} · Dibuat ${hovered.created} · Ditutup ${hovered.closed}` : hint}
      >
        <svg {...svgProps(BAR_H, "Grafik batang issue dibuat dan ditutup per minggu")}>
          <Gridlines max={barMax} w={W} h={BAR_H} grid={grid} />
          {weeks.map((b, i) =>
            (["created", "closed"] as const).map((k, j) => {
              const v = b[k];
              if (v === 0) return null;
              const y = yOf(v, barMax, BAR_H);
              return <rect key={`${b.week}-${k}`} x={cx(i) - pairW - 1 + j * (pairW + 2)} y={y} width={pairW} height={base(BAR_H) - y} rx={2} fill={color(k)} />;
            }),
          )}
          <MonthTicks weeks={weeks} slot={slot} h={BAR_H} />
          {hitTargets(BAR_H)}
        </svg>
      </ChartCard>

      <ChartCard
        title="Akumulasi issue: ditutup + masih terbuka"
        legend={<Legend keys={["closed", "open"]} color={color} />}
        readout={
          hovered
            ? `${weekRange(hovered.week)} · Total dibuat ${hovered.closedTotal + hovered.openAtEnd} = Ditutup ${hovered.closedTotal} + Masih terbuka ${hovered.openAtEnd}`
            : hint
        }
      >
        <svg {...svgProps(BAR_H, "Grafik batang bertumpuk akumulasi issue ditutup dan masih terbuka per akhir minggu")}>
          <Gridlines max={stackMax} w={W} h={BAR_H} grid={grid} />
          {weeks.map((b, i) => {
            const yClosed = yOf(b.closedTotal, stackMax, BAR_H);
            const yTotal = yOf(b.closedTotal + b.openAtEnd, stackMax, BAR_H);
            const x = cx(i) - stackW / 2;
            // Celah 2px warna permukaan antar-segmen (spec mark dataviz).
            const gap = b.closedTotal > 0 ? 2 : 0;
            return (
              <g key={b.week}>
                {b.closedTotal > 0 && <rect x={x} y={yClosed} width={stackW} height={base(BAR_H) - yClosed} rx={2} fill={color("closed")} />}
                {b.openAtEnd > 0 && (
                  <rect x={x} y={yTotal} width={stackW} height={Math.max(1, yClosed - yTotal - gap)} rx={2} fill={color("open")} />
                )}
              </g>
            );
          })}
          <MonthTicks weeks={weeks} slot={slot} h={BAR_H} />
          {hitTargets(BAR_H)}
        </svg>
      </ChartCard>

      <ChartCard title="Issue yang masih terbuka di akhir minggu" readout={hovered ? `${weekRange(hovered.week)} · Masih terbuka ${hovered.openAtEnd}` : hint}>
        <svg {...svgProps(LINE_H, "Grafik garis jumlah issue terbuka per akhir minggu")}>
          <Gridlines max={openMax} w={W} h={LINE_H} grid={grid} />
          <polyline
            points={weeks.map((b, i) => `${cx(i)},${yOf(b.openAtEnd, openMax, LINE_H)}`).join(" ")}
            fill="none"
            stroke={color("open")}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {hovered && <circle cx={cx(hoverIdx)} cy={yOf(hovered.openAtEnd, openMax, LINE_H)} r={4} fill={color("open")} stroke={surface} strokeWidth={2} />}
          <MonthTicks weeks={weeks} slot={slot} h={LINE_H} />
          {hitTargets(LINE_H)}
        </svg>
      </ChartCard>

      <details className="rounded-lg border border-border/60 p-4 text-sm">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Lihat tabel per minggu</summary>
        <div className="mt-2 max-h-80 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">Minggu</th>
                <th className="py-1 text-right font-medium">Dibuat</th>
                <th className="py-1 text-right font-medium">Ditutup</th>
                <th className="py-1 text-right font-medium">Total ditutup</th>
                <th className="py-1 text-right font-medium">Masih terbuka</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...weeks].reverse().map((b) => (
                <tr key={b.week} className="border-t">
                  <td className="py-1">{weekRange(b.week)}</td>
                  <td className="py-1 text-right">{b.created}</td>
                  <td className="py-1 text-right">{b.closed}</td>
                  <td className="py-1 text-right">{b.closedTotal}</td>
                  <td className="py-1 text-right">{b.openAtEnd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
