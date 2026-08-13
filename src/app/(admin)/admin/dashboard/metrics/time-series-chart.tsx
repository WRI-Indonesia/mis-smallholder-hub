"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmtDate } from "./metrics-shared";

/**
 * Kerangka bersama tiga grafik waktu halaman ini (RVS · Roadmap · Test).
 * Sebelumnya masing-masing membawa sumbu, ResizeObserver, tooltip, dan
 * kontainer scroll sendiri — geometri jadi tidak seragam dan tiap chart punya
 * aturan waktunya sendiri. Sekarang: satu kerangka, tiga konfigurasi.
 *
 * Rentang waktu datang dari kontrol tunggal di halaman (menyaring titik, lihat
 * `windowSlice`) — tidak ada lagi scroll horizontal per chart.
 */

const PAD = { l: 42, r: 12, t: 16, b: 26 };

export type SeriesPoint = {
  /** Kunci unik untuk React (versi rilis). */
  key: string;
  /** Epoch hari (sumbu X). */
  t: number;
  v: number;
  /** Tanggal ISO titik ini — dipakai label tepi sumbu. */
  date: string;
  /** Angka estimasi / siklus berjalan: titik berongga + garis putus. */
  soft?: boolean;
};

/** Konteks penggambar anotasi (plateau, penanda "mulai diukur", label lonjakan). */
export type PlotContext = {
  x: (t: number) => number;
  y: (v: number) => number;
  w: number;
  h: number;
};

export function TimeSeriesChart({
  points,
  yMin,
  yMax,
  ticks,
  formatTick,
  color,
  surface,
  gridColor,
  stepped = false,
  height = 200,
  ariaLabel,
  title,
  tooltip,
  annotate,
}: {
  points: SeriesPoint[];
  yMin: number;
  yMax: number;
  ticks: number[];
  formatTick: (v: number) => string;
  color: string;
  /** Warna permukaan card — isi titik berongga. */
  surface: string;
  gridColor: string;
  /** Garis bertangga (roadmap naik diskret per fase), bukan garis lurus. */
  stepped?: boolean;
  height?: number;
  ariaLabel: string;
  title: string;
  tooltip: (p: SeriesPoint) => ReactNode;
  annotate?: (ctx: PlotContext) => ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const t0 = points[0].t;
  const t1 = Math.max(points[points.length - 1].t, t0 + 1);
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * Math.max(0, w - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (height - PAD.t - PAD.b);

  const steppedPath = points
    .map((p, i) => (i === 0 ? `M ${x(p.t)} ${y(p.v)}` : `H ${x(p.t)} V ${y(p.v)}`))
    .join(" ");
  const hovered = hover != null ? points[hover] : null;

  return (
    <div ref={wrapRef} className="relative" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} className="absolute inset-0" role="img" aria-label={ariaLabel}>
          <title>{title}</title>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} stroke={gridColor} strokeWidth={0.5} />
              <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
                {formatTick(v)}
              </text>
            </g>
          ))}

          {annotate?.({ x, y, w, h: height })}

          {/* Garis: bertangga sekali jalan; garis lurus per segmen agar ruas
              menuju titik estimasi bisa digambar putus-putus. */}
          {stepped ? (
            <path d={steppedPath} fill="none" stroke={color} strokeWidth={2} />
          ) : (
            points.slice(1).map((p, i) => (
              <line
                key={p.key}
                x1={x(points[i].t)}
                y1={y(points[i].v)}
                x2={x(p.t)}
                y2={y(p.v)}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={p.soft || points[i].soft ? "5 4" : undefined}
              />
            ))
          )}

          {points.map((p, i) => (
            <g key={p.key}>
              <circle
                cx={x(p.t)}
                cy={y(p.v)}
                r={3.5}
                fill={p.soft ? surface : color}
                stroke={color}
                strokeWidth={p.soft ? 1.5 : 2}
              />
              {/* Sasaran hover lebih besar dari markanya (interaksi dataviz). */}
              <circle
                cx={x(p.t)}
                cy={y(p.v)}
                r={11}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}

          <text x={PAD.l} y={height - 6} fontSize={10} fill="currentColor" opacity={0.6}>
            {fmtDate(points[0].date)}
          </text>
          {points.length > 1 && (
            <text x={w - PAD.r} y={height - 6} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
              {fmtDate(points[points.length - 1].date)}
            </text>
          )}
        </svg>
      )}

      {hovered && w > 0 && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
          style={{
            left: x(hovered.t),
            transform: `translateX(${x(hovered.t) > w * 0.6 ? "calc(-100% - 8px)" : "8px"})`,
          }}
        >
          {tooltip(hovered)}
        </div>
      )}
    </div>
  );
}
