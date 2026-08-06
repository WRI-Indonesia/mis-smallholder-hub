"use client";

import { useEffect, useRef, useState } from "react";
import type { ReleaseMetric } from "@/types/release-metrics";
import { dayEpoch, effectiveDate, fmtDate, fmtDateShort, fmtInt, fmt1, seriesColor } from "./metrics-shared";
import { TimeWindowButtons } from "./time-window";

/**
 * Panel 3 & 4 (spec §4.4–§4.5). Roadmap: STEPPED line (naik diskret — tanpa
 * kurva halus), domain Y dinamis mengikuti data ±margin, clamp 0–100 (rentang
 * penuh 0–100 membuat plateau tak terbaca; hardcode jebol saat roadmap
 * mendekati go-live 100% — #229), shading + label plateau. Test: line, sumbu Y
 * ikut data, anotasi lonjakan terbesar; warnanya sama dengan seri RVS
 * (sama-sama metrik "pertumbuhan").
 */

const H = 200;
const PAD = { l: 38, t: 16, b: 24 };

type Pt = { r: ReleaseMetric; t: number; v: number };

/**
 * Roadmap versi piksel nyata (revisi layout): lebar diukur ResizeObserver dan
 * tinggi tetap 200px — sebelumnya viewBox 352×200 di-stretch memenuhi kolom
 * sehingga font/garis membesar dan tingginya timpang dengan chart Test.
 */
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const color = seriesColor("roadmap", dark);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const pts: Pt[] = releases.map((r) => ({ r, t: dayEpoch(effectiveDate(r, today)), v: r.roadmapPct }));
  const t0 = pts[0].t;
  const t1 = Math.max(pts[pts.length - 1].t, t0 + 1);
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * Math.max(0, w - PAD.l - 14);
  const vMin = Math.min(...pts.map((p) => p.v));
  const vMax = Math.max(...pts.map((p) => p.v));
  const domLo = Math.max(0, Math.floor((vMin - 2) / 5) * 5);
  const domHi = Math.min(100, Math.max(domLo + 5, Math.ceil((vMax + 2) / 5) * 5));
  const gridVals: number[] = [];
  for (let v = domLo + 5; v <= domHi; v += 5) gridVals.push(v);
  const y = (v: number) => PAD.t + (1 - (v - domLo) / (domHi - domLo)) * (H - PAD.t - PAD.b);

  // Plateau terakhir: sejak kapan nilai tidak berubah (spec: shading + label).
  let plateauStart = pts.length - 1;
  while (plateauStart > 0 && pts[plateauStart - 1].v === pts[pts.length - 1].v) plateauStart--;
  const plateauDays = Math.round(pts[pts.length - 1].t - pts[plateauStart].t);

  const path = pts.map((p, i) => (i === 0 ? `M ${x(p.t)} ${y(p.v)}` : `H ${x(p.t)} V ${y(p.v)}`)).join(" ");
  const hovered = hover != null ? pts[hover] : null;

  return (
    <div ref={wrapRef} className="relative" style={{ height: H }}>
      {w > 0 && (
        <svg
          width={w}
          height={H}
          className="absolute inset-0"
          role="img"
          aria-label={`Progres roadmap tertimbang dari ${fmt1(pts[0].v)}% menjadi ${fmt1(pts[pts.length - 1].v)}%, plateau ${fmtInt(plateauDays)} hari terakhir`}
        >
          <title>Roadmap % per tanggal rilis</title>
          {gridVals.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={w} y1={y(v)} y2={y(v)} stroke={gridColor} strokeWidth={0.5} />
              <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
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
                fontSize={10}
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
              r={9}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          <text x={PAD.l} y={H - 6} fontSize={10} fill="currentColor" opacity={0.6}>
            {fmtDate(effectiveDate(pts[0].r, today))}
          </text>
          <text x={w - 4} y={H - 6} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
            {fmtDate(effectiveDate(pts[pts.length - 1].r, today))}
          </text>
        </svg>
      )}
      {hovered && w > 0 && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap"
          style={{
            left: x(hovered.t),
            transform: `translateX(${x(hovered.t) > w * 0.65 ? "calc(-100% - 8px)" : "8px"})`,
          }}
        >
          <p className="font-medium">
            {hovered.r.isProvisional ? "Siklus berjalan" : hovered.r.version}
            {hovered.r.releasedAt && (
              <span className="ml-2 font-normal text-muted-foreground">{fmtDate(hovered.r.releasedAt)}</span>
            )}
          </p>
          <p className="tabular-nums">Roadmap {fmt1(hovered.v)}%</p>
        </div>
      )}
    </div>
  );
}

/**
 * Jumlah test dengan slicer rentang yang sama dengan Kurva RVS (revisi owner):
 * tombol periode = zoom viewport, sisanya scroll horizontal + auto-slide ke
 * tanggal terbaru; sumbu Y tetap di kiri; geometri piksel nyata
 * (ResizeObserver) agar titik/dash tidak terdistorsi.
 */
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
  const [windowDays, setWindowDays] = useState<number | null>(30);
  const [hover, setHover] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerW, setInnerW] = useState(0);
  const color = seriesColor("growth", dark);

  const pts: Pt[] = releases
    .filter((r) => r.testCount != null)
    .map((r) => ({ r, t: dayEpoch(effectiveDate(r, today)), v: r.testCount as number }));

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setInnerW(el.clientWidth));
    ro.observe(el);
    setInnerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [windowDays, innerW]);

  // Parser sah meloloskan sel test "—" — garis/lonjakan butuh ≥2 titik (#229).
  if (pts.length < 2) {
    return (
      <p className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: H }}>
        Belum cukup titik test terukur untuk menggambar tren.
      </p>
    );
  }

  const t0 = pts[0].t;
  const t1 = Math.max(pts[pts.length - 1].t, t0 + 1);
  const scale = windowDays == null ? 1 : Math.max(1, (t1 - t0) / windowDays);

  const yMin = Math.max(0, Math.floor((Math.min(...pts.map((p) => p.v)) - 30) / 100) * 100);
  const yMax = Math.ceil((Math.max(...pts.map((p) => p.v)) + 30) / 100) * 100;
  const step = Math.max(1, Math.ceil((yMax - yMin) / 800)) * 100;
  const gridVals = Array.from({ length: Math.floor((yMax - yMin) / step) + 1 }, (_, i) => yMin + i * step);
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const x = (t: number) => 12 + ((t - t0) / (t1 - t0)) * Math.max(0, innerW - 24);

  // Anotasi lonjakan terbesar antar rilis (spec: v0.15.0, 519→640).
  let jumpIdx = 1;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].v - pts[i - 1].v > pts[jumpIdx].v - pts[jumpIdx - 1].v) jumpIdx = i;
  }
  const jump = pts[jumpIdx].v - pts[jumpIdx - 1].v;

  const uniqueDates = [...new Set(pts.map((p) => p.t))];
  const labelEvery = Math.max(1, Math.ceil(uniqueDates.length / (6 * scale)));
  const hovered = hover != null ? pts[hover] : null;

  return (
    <div>
      <div className="mb-3">
        <TimeWindowButtons value={windowDays} onChange={setWindowDays} compact />
      </div>
      <div className="flex gap-2">
        <div
          className="relative w-10 shrink-0 text-right text-[9px] tabular-nums text-muted-foreground"
          style={{ height: H }}
          aria-hidden
        >
          {gridVals.map((v) => (
            <span key={v} className="absolute right-0" style={{ top: y(v) - 5 }}>
              {fmtInt(v)}
            </span>
          ))}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-x-auto pb-1">
          <div ref={innerRef} className="relative" style={{ width: `${scale * 100}%`, minWidth: "100%", height: H }}>
            {innerW > 0 && (
              <svg
                width={innerW}
                height={H}
                className="absolute inset-0"
                role="img"
                aria-label={`Jumlah test otomatis dari ${fmtInt(pts[0].v)} menjadi ${fmtInt(pts[pts.length - 1].v)}; lonjakan terbesar +${fmtInt(jump)} pada ${pts[jumpIdx].r.version}`}
              >
                <title>Jumlah test otomatis per rilis</title>
                {gridVals.map((v) => (
                  <line key={v} x1={0} x2={innerW} y1={y(v)} y2={y(v)} stroke={gridColor} strokeWidth={0.5} />
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
                <text x={x(pts[jumpIdx].t) + 5} y={y(pts[jumpIdx].v) + 1} fontSize={9} fill="currentColor" opacity={0.65}>
                  +{fmtInt(jump)} ({pts[jumpIdx].r.version})
                </text>
                {uniqueDates.map((t, i) =>
                  i % labelEvery === 0 || i === uniqueDates.length - 1 ? (
                    <text
                      key={t}
                      x={x(t)}
                      y={H - 6}
                      textAnchor={i === 0 ? "start" : i === uniqueDates.length - 1 ? "end" : "middle"}
                      fontSize={9}
                      fill="currentColor"
                      opacity={0.6}
                    >
                      {fmtDateShort(new Date(t * 86_400_000).toISOString().slice(0, 10))}
                    </text>
                  ) : null
                )}
              </svg>
            )}
            {hovered && innerW > 0 && (
              <div
                className="pointer-events-none absolute top-0 z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap"
                style={{
                  left: x(hovered.t),
                  transform: `translateX(${x(hovered.t) > innerW * 0.7 ? "calc(-100% - 8px)" : "8px"})`,
                }}
              >
                <p className="font-medium">
                  {hovered.r.isProvisional ? "Siklus berjalan" : hovered.r.version}
                  {hovered.r.releasedAt && (
                    <span className="ml-2 font-normal text-muted-foreground">{fmtDate(hovered.r.releasedAt)}</span>
                  )}
                </p>
                <p className="tabular-nums">{fmtInt(hovered.v)} test</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
