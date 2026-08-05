"use client";

import { useState } from "react";
import type { ReleaseMetric } from "@/types/release-metrics";
import { dayEpoch, effectiveDate, fmtDate, fmtInt, fmt1, seriesColor } from "./metrics-shared";

/**
 * Panel 3 & 4 (spec §4.4–§4.5). Roadmap: STEPPED line (naik diskret — tanpa
 * kurva halus), Y 68–90 (rentang 0–100 membuat plateau tak terbaca), shading +
 * label plateau. Test: line, Y mulai 400, anotasi lonjakan terbesar; warnanya
 * sama dengan seri RVS (sama-sama metrik "pertumbuhan").
 */

const W = 352;
const H = 200;
const PAD = { l: 38, r: 12, t: 16, b: 24 };

type Pt = { r: ReleaseMetric; t: number; v: number };

function useScales(pts: Pt[], yMin: number, yMaxRaw: number) {
  const t0 = pts[0].t;
  const t1 = Math.max(pts[pts.length - 1].t, t0 + 1);
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMaxRaw - yMin)) * (H - PAD.t - PAD.b);
  return { x, y };
}

function Tooltip({ pt, x, format }: { pt: Pt; x: number; format: (v: number) => string }) {
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: `${(x / W) * 100}%`, transform: `translateX(${x > W * 0.65 ? "-100%" : "8px"})` }}
    >
      <p className="font-medium">
        {pt.r.isProvisional ? "Siklus berjalan" : pt.r.version}
        {pt.r.releasedAt && <span className="ml-2 font-normal text-muted-foreground">{fmtDate(pt.r.releasedAt)}</span>}
      </p>
      <p className="tabular-nums">{format(pt.v)}</p>
    </div>
  );
}

export function RoadmapStepChart({
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
  const [hover, setHover] = useState<number | null>(null);
  const color = seriesColor("roadmap", dark);
  const pts: Pt[] = releases.map((r) => ({ r, t: dayEpoch(effectiveDate(r, today)), v: r.roadmapPct }));
  const { x, y } = useScales(pts, 68, 90);

  // Plateau terakhir: sejak kapan nilai tidak berubah (spec: shading + label).
  let plateauStart = pts.length - 1;
  while (plateauStart > 0 && pts[plateauStart - 1].v === pts[pts.length - 1].v) plateauStart--;
  const plateauDays = Math.round(pts[pts.length - 1].t - pts[plateauStart].t);

  const path = pts
    .map((p, i) => (i === 0 ? `M ${x(p.t)} ${y(p.v)}` : `H ${x(p.t)} V ${y(p.v)}`))
    .join(" ");

  const hovered = hover != null ? pts[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Progres roadmap tertimbang dari ${fmt1(pts[0].v)}% menjadi ${fmt1(pts[pts.length - 1].v)}%, plateau ${fmtInt(plateauDays)} hari terakhir`}
      >
        <title>Roadmap % per tanggal rilis</title>
        {[70, 75, 80, 85, 90].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={gridColor} strokeWidth={0.5} />
            <text x={PAD.l - 5} y={y(v) + 3} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.6}>
              {fmtInt(v)}%
            </text>
          </g>
        ))}
        {plateauDays >= 5 && (
          <g>
            <rect
              x={x(pts[plateauStart].t)}
              y={y(pts[pts.length - 1].v) - 8}
              width={x(pts[pts.length - 1].t) - x(pts[plateauStart].t)}
              height={16}
              fill={color}
              opacity={0.08}
            />
            <text
              x={x(pts[pts.length - 1].t)}
              y={y(pts[pts.length - 1].v) - 12}
              textAnchor="end"
              fontSize={9}
              fill="currentColor"
              opacity={0.6}
            >
              plateau {fmtInt(plateauDays)} hari
            </text>
          </g>
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
        {pts.map((p, i) => (
          <circle
            key={p.r.version}
            cx={x(p.t)}
            cy={y(p.v)}
            r={8}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <text x={PAD.l} y={H - 6} fontSize={9} fill="currentColor" opacity={0.6}>
          {fmtDate(effectiveDate(pts[0].r, today))}
        </text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.6}>
          {fmtDate(effectiveDate(pts[pts.length - 1].r, today))}
        </text>
      </svg>
      {hovered && <Tooltip pt={hovered} x={x(hovered.t)} format={(v) => `Roadmap ${fmt1(v)}%`} />}
    </div>
  );
}

export function TestCountChart({
  releases,
  today,
  dark,
  gridColor,
  surface,
}: {
  releases: ReleaseMetric[];
  today: string;
  dark: boolean;
  gridColor: string;
  surface: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const color = seriesColor("growth", dark);
  const pts: Pt[] = releases
    .filter((r) => r.testCount != null)
    .map((r) => ({ r, t: dayEpoch(effectiveDate(r, today)), v: r.testCount as number }));
  const yMax = Math.ceil((Math.max(...pts.map((p) => p.v)) + 30) / 100) * 100;
  const { x, y } = useScales(pts, 400, yMax);

  // Anotasi lonjakan terbesar antar rilis (spec: v0.15.0, 519→640).
  let jumpIdx = 1;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].v - pts[i - 1].v > pts[jumpIdx].v - pts[jumpIdx - 1].v) jumpIdx = i;
  }
  const jump = pts[jumpIdx].v - pts[jumpIdx - 1].v;

  const hovered = hover != null ? pts[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Jumlah test otomatis dari ${fmtInt(pts[0].v)} menjadi ${fmtInt(pts[pts.length - 1].v)}; lonjakan terbesar +${fmtInt(jump)} pada ${pts[jumpIdx].r.version}`}
      >
        <title>Jumlah test otomatis per rilis</title>
        {Array.from({ length: Math.floor((yMax - 400) / 100) + 1 }, (_, i) => 400 + i * 100).map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={gridColor} strokeWidth={0.5} />
            <text x={PAD.l - 5} y={y(v) + 3} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.6}>
              {fmtInt(v)}
            </text>
          </g>
        ))}
        <path
          d={`M ${pts.map((p) => `${x(p.t)} ${y(p.v)}`).join(" L ")}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <g key={p.r.version}>
            <circle
              cx={x(p.t)}
              cy={y(p.v)}
              r={3}
              fill={p.r.isEstimated || p.r.isProvisional ? surface : color}
              stroke={color}
              strokeWidth={1.5}
            />
            <circle
              cx={x(p.t)}
              cy={y(p.v)}
              r={9}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
        <text
          x={x(pts[jumpIdx].t) + 5}
          y={y(pts[jumpIdx].v) + 1}
          fontSize={9}
          fill="currentColor"
          opacity={0.65}
        >
          +{fmtInt(jump)} ({pts[jumpIdx].r.version})
        </text>
        <text x={PAD.l} y={H - 6} fontSize={9} fill="currentColor" opacity={0.6}>
          {fmtDate(effectiveDate(pts[0].r, today))}
        </text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.6}>
          {fmtDate(effectiveDate(pts[pts.length - 1].r, today))}
        </text>
      </svg>
      {hovered && <Tooltip pt={hovered} x={x(hovered.t)} format={(v) => `${fmtInt(v)} test`} />}
    </div>
  );
}
