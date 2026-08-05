"use client";

import { useState } from "react";
import type { ReleaseMetric } from "@/types/release-metrics";
import { dayEpoch, effectiveDate, fmtDate, fmtDelta, fmtInt, fmtRvs } from "./metrics-shared";

/**
 * Panel 1 (spec §4.2): kurva RVS pada SUMBU KALENDER — jarak horizontal
 * proporsional waktu nyata (requirement, bukan preferensi) sehingga jeda
 * 22→28 Jul terlihat. Titik estimasi: garis putus-putus + titik berongga;
 * anotasi vertikal "mulai diukur" pada rilis terukur pertama. Y mulai 900
 * (anchor 1000 — mulai dari 0 membuang ruang).
 */

const W = 720;
const H = 240;
const PAD = { l: 46, r: 16, t: 18, b: 26 };

export function RvsCurveChart({
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
  const color = dark ? "#3987e5" : "#2a78d6";

  const pts = releases.map((r) => ({ r, t: dayEpoch(effectiveDate(r, today)) }));
  const t0 = pts[0].t;
  const t1 = Math.max(pts[pts.length - 1].t, t0 + 1);
  const yMin = 900;
  const yMax = Math.ceil((Math.max(...pts.map((p) => p.r.rvs)) + 60) / 100) * 100;

  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);

  const measuredFirst = releases.find((r) => !r.isEstimated && !r.isProvisional);
  const gridVals = Array.from({ length: Math.floor((yMax - yMin) / 200) + 1 }, (_, i) => yMin + i * 200);
  const area = `M ${pts.map((p) => `${x(p.t)} ${y(p.r.rvs)}`).join(" L ")} L ${x(pts[pts.length - 1].t)} ${H - PAD.b} L ${x(pts[0].t)} ${H - PAD.b} Z`;

  const hovered = hover != null ? pts[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Kurva RVS kumulatif dari ${fmtInt(pts[0].r.rvs)} (${fmtDate(effectiveDate(pts[0].r, today))}) menjadi ${fmtInt(pts[pts.length - 1].r.rvs)}; titik sebelum ${measuredFirst?.version ?? ""} adalah estimasi`}
      >
        <title>Kurva RVS kumulatif per tanggal rilis</title>
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={gridColor} strokeWidth={0.5} />
            <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
              {fmtInt(v)}
            </text>
          </g>
        ))}
        <path d={area} fill={color} opacity={0.1} />
        {pts.slice(1).map((p, i) => {
          const prev = pts[i];
          const dashed = p.r.isEstimated || prev.r.isEstimated || p.r.isProvisional;
          return (
            <line
              key={p.r.version}
              x1={x(prev.t)}
              y1={y(prev.r.rvs)}
              x2={x(p.t)}
              y2={y(p.r.rvs)}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={dashed ? "5 4" : undefined}
            />
          );
        })}
        {/* Anotasi "mulai diukur" (spec §2.3) */}
        {measuredFirst?.releasedAt && (
          <g>
            <line
              x1={x(dayEpoch(measuredFirst.releasedAt))}
              x2={x(dayEpoch(measuredFirst.releasedAt))}
              y1={PAD.t - 4}
              y2={H - PAD.b}
              stroke="currentColor"
              opacity={0.35}
              strokeWidth={0.75}
              strokeDasharray="2 3"
            />
            <text
              x={x(dayEpoch(measuredFirst.releasedAt)) - 4}
              y={PAD.t + 4}
              textAnchor="end"
              fontSize={10}
              fill="currentColor"
              opacity={0.65}
            >
              mulai diukur
            </text>
          </g>
        )}
        {pts.map((p, i) => (
          <g key={p.r.version}>
            <circle
              cx={x(p.t)}
              cy={y(p.r.rvs)}
              r={3.5}
              fill={p.r.isEstimated || p.r.isProvisional ? surface : color}
              stroke={color}
              strokeWidth={p.r.isEstimated || p.r.isProvisional ? 1.5 : 2}
            />
            {/* target hover lebih besar dari mark */}
            <circle
              cx={x(p.t)}
              cy={y(p.r.rvs)}
              r={11}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
        {/* Label sumbu X: awal, anotasi, akhir */}
        <text x={PAD.l} y={H - 8} fontSize={10} fill="currentColor" opacity={0.6}>
          {fmtDate(effectiveDate(pts[0].r, today))}
        </text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
          {fmtDate(effectiveDate(pts[pts.length - 1].r, today))}
        </text>
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: `${(x(hovered.t) / W) * 100}%`,
            top: 0,
            transform: `translateX(${x(hovered.t) > W * 0.7 ? "-100%" : "8px"})`,
          }}
        >
          <p className="font-medium">
            {hovered.r.isProvisional ? "Siklus berjalan" : hovered.r.version}
            <span className="ml-2 font-normal text-muted-foreground">{fmtDate(effectiveDate(hovered.r, today))}</span>
          </p>
          <p className="tabular-nums">
            RVS {fmtRvs(hovered.r)}
            {hovered.r.delta != null && <span className="ml-2 text-muted-foreground">Δ {fmtDelta(hovered.r.delta)}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
