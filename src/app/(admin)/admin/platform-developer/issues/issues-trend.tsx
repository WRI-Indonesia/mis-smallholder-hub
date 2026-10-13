"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORICAL } from "@/lib/chart-palette";
import { MONTH_SHORT_ID, axisMax } from "@/lib/format";
import { addDays, weeklyTrend, type GithubIssue, type WeekBucket } from "@/lib/github-issues";

/**
 * Tab Tren mingguan: batang dibuat vs ditutup per minggu (Senin–Minggu, WIB)
 * dan — di grafik TERPISAH, bukan sumbu kedua — jumlah issue yang masih
 * terbuka di akhir minggu. Palet biru/aqua `CATEGORICAL` lulus validator
 * dataviz (light & dark); kontras aqua di light < 3:1 → direlief legenda,
 * tooltip, dan tabel.
 */

/** Lebar cadangan sebelum wadah terukur (render pertama). */
const FALLBACK_W = 720;
const BAR_H = 200;
const LINE_H = 140;
const PAD = { l: 36, r: 12, t: 10, b: 24 };

const SERIES = {
  created: { ...CATEGORICAL[0], label: "Dibuat" },
  closed: { ...CATEGORICAL[2], label: "Ditutup" },
  open: { ...CATEGORICAL[1], label: "Masih terbuka (akhir minggu)" },
} as const;

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

function Legend({ keys, dark }: { keys: (keyof typeof SERIES)[]; dark: boolean }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {keys.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: dark ? SERIES[k].dark : SERIES[k].light }} aria-hidden />
          {SERIES[k].label}
        </span>
      ))}
    </div>
  );
}

export function IssuesTrend({ issues, today }: { issues: GithubIssue[]; today: string }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const grid = dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)";
  const color = (k: keyof typeof SERIES) => (dark ? SERIES[k].dark : SERIES[k].light);
  const weeks = useMemo(() => weeklyTrend(issues, today), [issues, today]);
  const [hover, setHover] = useState<number | null>(null);
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
  const W = measured || FALLBACK_W;

  if (weeks.length === 0) {
    return (
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Tidak ada issue untuk filter ini.</CardContent>
      </Card>
    );
  }

  const slot = (W - PAD.l - PAD.r) / weeks.length;
  const barW = Math.max(2, Math.min(18, (slot - 6) / 2));
  const barMax = axisMax(Math.max(...weeks.map((b) => Math.max(b.created, b.closed))), 5);
  const openMax = axisMax(Math.max(...weeks.map((b) => b.openAtEnd)), 5);
  const barPlot = BAR_H - PAD.t - PAD.b;
  const linePlot = LINE_H - PAD.t - PAD.b;
  const cx = (i: number) => PAD.l + slot * i + slot / 2;
  const lineY = (v: number) => PAD.t + linePlot * (1 - v / openMax);
  const hovered = hover != null ? weeks[hover] : null;

  // Target hover selebar slot penuh, di kedua grafik — lebih besar dari batangnya.
  const hitTargets = (h: number) =>
    weeks.map((b, i) => (
      <rect
        key={b.week}
        x={PAD.l + slot * i}
        y={0}
        width={slot}
        height={h - PAD.b}
        fill={hover === i ? (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)") : "transparent"}
        onMouseEnter={() => setHover(i)}
      />
    ));

  const tooltip = hovered && (
    <div className="pointer-events-none rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{weekRange(hovered.week)}</p>
      <p>
        {SERIES.created.label}: <span className="tabular-nums font-medium">{hovered.created}</span> · {SERIES.closed.label}:{" "}
        <span className="tabular-nums font-medium">{hovered.closed}</span>
      </p>
      <p>
        Masih terbuka: <span className="tabular-nums font-medium">{hovered.openAtEnd}</span>
      </p>
    </div>
  );

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="space-y-5 pt-5">
        <div ref={wrapRef} className="min-h-[3.75rem]">
          {tooltip ?? <p className="text-xs text-muted-foreground">Arahkan kursor ke sebuah minggu untuk melihat angkanya.</p>}
        </div>

        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">Issue dibuat vs ditutup per minggu</h3>
            <Legend keys={["created", "closed"]} dark={dark} />
          </div>
          <svg width={W} height={BAR_H} className="block" role="img" aria-label="Grafik batang issue dibuat dan ditutup per minggu" onMouseLeave={() => setHover(null)}>
            <Gridlines max={barMax} w={W} h={BAR_H} grid={grid} />
            {weeks.map((b, i) =>
              (["created", "closed"] as const).map((k, j) => {
                const v = b[k];
                if (v === 0) return null;
                const h = (barPlot * v) / barMax;
                return (
                  <rect
                    key={`${b.week}-${k}`}
                    x={cx(i) - barW - 1 + j * (barW + 2)}
                    y={PAD.t + barPlot - h}
                    width={barW}
                    height={h}
                    rx={2}
                    fill={color(k)}
                  />
                );
              }),
            )}
            <MonthTicks weeks={weeks} slot={slot} h={BAR_H} />
            {hitTargets(BAR_H)}
          </svg>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">Issue yang masih terbuka di akhir minggu</h3>
          </div>
          <svg width={W} height={LINE_H} className="block" role="img" aria-label="Grafik garis jumlah issue terbuka per akhir minggu" onMouseLeave={() => setHover(null)}>
            <Gridlines max={openMax} w={W} h={LINE_H} grid={grid} />
            <polyline
              points={weeks.map((b, i) => `${cx(i)},${lineY(b.openAtEnd)}`).join(" ")}
              fill="none"
              stroke={color("open")}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {hovered && hover != null && (
              <circle cx={cx(hover)} cy={lineY(hovered.openAtEnd)} r={4} fill={color("open")} stroke={dark ? "#26332a" : "#ffffff"} strokeWidth={2} />
            )}
            <MonthTicks weeks={weeks} slot={slot} h={LINE_H} />
            {hitTargets(LINE_H)}
          </svg>
        </section>

        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Lihat tabel per minggu</summary>
          <div className="mt-2 max-h-80 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background text-muted-foreground">
                <tr>
                  <th className="py-1 text-left font-medium">Minggu</th>
                  <th className="py-1 text-right font-medium">Dibuat</th>
                  <th className="py-1 text-right font-medium">Ditutup</th>
                  <th className="py-1 text-right font-medium">Masih terbuka</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...weeks].reverse().map((b) => (
                  <tr key={b.week} className="border-t">
                    <td className="py-1">{weekRange(b.week)}</td>
                    <td className="py-1 text-right">{b.created}</td>
                    <td className="py-1 text-right">{b.closed}</td>
                    <td className="py-1 text-right">{b.openAtEnd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
