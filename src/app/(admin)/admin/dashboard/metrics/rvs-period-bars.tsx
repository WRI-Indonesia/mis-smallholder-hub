"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PeriodGranularity, ReleaseMetric } from "@/types/release-metrics";
import { bucketRvsGains } from "@/lib/release-metrics";
import { SERIES, fmt1, fmtInt, seriesColor } from "./metrics-shared";

/**
 * Panel 2 (spec §4.3): perolehan RVS per periode — stacked bar 3 seri
 * (Senin–Jumat · Sabtu · Minggu; permintaan eksplisit, jangan disederhanakan)
 * dengan toggle granularitas Hari/Minggu/Bulan/Tahun (default Minggu).
 * Sabtu/Minggu memakai arsir sebagai pembeda kedua selain warna (a11y §6).
 * Mode Hari dibatasi 90 hari terakhir (keputusan retensi §10.5).
 */

const W = 720;
const H = 240;
const PAD = { l: 40, r: 12, t: 12, b: 26 };
const GRANULARITIES: { key: PeriodGranularity; label: string }[] = [
  { key: "day", label: "Hari" },
  { key: "week", label: "Minggu" },
  { key: "month", label: "Bulan" },
  { key: "year", label: "Tahun" },
];
const STACK_ORDER = ["weekday", "saturday", "sunday"] as const;

export function RvsPeriodBars({
  releases,
  today,
  dark,
  gridColor,
}: {
  releases: ReleaseMetric[];
  today: string;
  dark: boolean;
  gridColor: string;
}) {
  const [granularity, setGranularity] = useState<PeriodGranularity>("week");
  const [hover, setHover] = useState<number | null>(null);

  const buckets = useMemo(() => {
    const all = bucketRvsGains(releases, granularity, today);
    // Retensi mode Hari: 90 kunci periode terakhir.
    return granularity === "day" ? all.slice(-90) : all;
  }, [releases, granularity, today]);

  const maxTotal = Math.max(1, ...buckets.map((b) => b.total));
  const plotH = H - PAD.t - PAD.b;
  const slot = (W - PAD.l - PAD.r) / Math.max(buckets.length, 1);
  // Ketebalan batang §5: maks 24px mode Hari; 64–90px mode lain.
  const barW = Math.min(granularity === "day" ? 24 : 90, Math.max(granularity === "day" ? 8 : 64, slot * 0.6));

  const gridVals = [0.25, 0.5, 0.75, 1].map((f) => Math.round(maxTotal * f));
  const avg = buckets.length > 0 ? buckets.reduce((s, b) => s + b.total, 0) / buckets.length : 0;
  const peak = buckets.reduce((m, b) => (b.total > m.total ? b : m), buckets[0]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Granularitas periode" className="inline-flex rounded-md border p-0.5">
          {GRANULARITIES.map((g) => (
            <button
              key={g.key}
              onClick={() => {
                setGranularity(g.key);
                setHover(null);
              }}
              aria-pressed={granularity === g.key}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                granularity === g.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {STACK_ORDER.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <svg width={12} height={12} aria-hidden className="shrink-0">
                <rect width={12} height={12} rx={2} fill={seriesColor(k, dark)} />
                {k !== "weekday" && (
                  <path
                    d={k === "saturday" ? "M0 12 L12 0 M-4 8 L8 -4 M4 16 L16 4" : "M0 0 L12 12 M-4 4 L8 16 M4 -4 L16 8"}
                    stroke="#ffffff"
                    strokeOpacity={0.55}
                    strokeWidth={1.5}
                  />
                )}
              </svg>
              {SERIES[k].label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Perolehan RVS per ${GRANULARITIES.find((g) => g.key === granularity)?.label.toLowerCase()}: ${buckets
            .map((b) => `${b.label} ${fmtInt(b.total)}`)
            .join(", ")}`}
        >
          <title>Perolehan RVS per periode, dipecah hari kerja / Sabtu / Minggu</title>
          <defs>
            <pattern id="hatch-sat" patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={6} stroke="#ffffff" strokeOpacity={0.45} strokeWidth={1.5} />
            </pattern>
            <pattern id="hatch-sun" patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(135)">
              <line x1={0} y1={0} x2={0} y2={6} stroke="#ffffff" strokeOpacity={0.45} strokeWidth={1.5} />
            </pattern>
          </defs>
          {gridVals.map((v) => (
            <g key={v}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={PAD.t + (1 - v / maxTotal) * plotH}
                y2={PAD.t + (1 - v / maxTotal) * plotH}
                stroke={gridColor}
                strokeWidth={0.5}
              />
              <text
                x={PAD.l - 5}
                y={PAD.t + (1 - v / maxTotal) * plotH + 3}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                opacity={0.6}
              >
                {fmtInt(v)}
              </text>
            </g>
          ))}
          {buckets.map((b, i) => {
            const cx = PAD.l + slot * i + slot / 2;
            let yTop = PAD.t + plotH;
            return (
              <g key={b.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                {STACK_ORDER.map((k, si) => {
                  const val = b[k];
                  if (val <= 0) return null;
                  const h = (val / maxTotal) * plotH;
                  yTop -= h;
                  const yRect = yTop;
                  const isTop = STACK_ORDER.slice(si + 1).every((kk) => b[kk] <= 0);
                  return (
                    <g key={k}>
                      <rect
                        x={cx - barW / 2}
                        y={yRect}
                        width={barW}
                        // 2px gap antarsegmen; radius 4px hanya di ujung data (§5)
                        height={Math.max(1, h - (si > 0 || !isTop ? 2 : 0))}
                        rx={isTop ? 4 : 0}
                        fill={seriesColor(k, dark)}
                      />
                      {k !== "weekday" && (
                        <rect
                          x={cx - barW / 2}
                          y={yRect}
                          width={barW}
                          height={Math.max(1, h - 2)}
                          rx={isTop ? 4 : 0}
                          fill={`url(#hatch-${k === "saturday" ? "sat" : "sun"})`}
                        />
                      )}
                    </g>
                  );
                })}
                <rect x={cx - slot / 2} y={PAD.t} width={slot} height={plotH} fill="transparent" />
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={granularity === "day" ? 8 : 10}
                  fill="currentColor"
                  opacity={0.65}
                >
                  {granularity === "day" && buckets.length > 12 && i % 2 === 1 ? "" : b.label}
                </text>
              </g>
            );
          })}
        </svg>
        {hover != null && buckets[hover] && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `${((PAD.l + slot * hover + slot / 2) / W) * 100}%`,
              transform: `translateX(${hover > buckets.length * 0.7 ? "-100%" : "8px"})`,
            }}
          >
            <p className="font-medium">
              {buckets[hover].label}
              {buckets[hover].hasEstimated && <span className="ml-1 text-muted-foreground">≈</span>}
            </p>
            {STACK_ORDER.filter((k) => buckets[hover][k] > 0).map((k) => (
              <p key={k} className="tabular-nums">
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-[2px] align-middle"
                  style={{ background: seriesColor(k, dark) }}
                />
                {SERIES[k].label}: +{fmtInt(buckets[hover][k])}
              </p>
            ))}
            <p className="mt-0.5 border-t pt-0.5 tabular-nums text-muted-foreground">
              Total +{fmtInt(buckets[hover].total)} · {fmtInt(buckets[hover].releases)} rilis
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {fmtInt(buckets.length)} periode · rata-rata +{fmt1(avg)}/periode · puncak {peak ? `${peak.label} (+${fmtInt(peak.total)})` : "—"}
        </span>
        {(granularity === "month" || granularity === "year") && (
          <span className="rounded bg-muted px-2 py-0.5">
            Rentang data belum genap satu {granularity === "month" ? "bulan" : "tahun"} penuh — perbandingan antar periode tidak setara.
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        Perolehan dicatat pada tanggal rilisnya — pekerjaan berlangsung di hari-hari sebelum rilis.
      </p>
    </div>
  );
}
