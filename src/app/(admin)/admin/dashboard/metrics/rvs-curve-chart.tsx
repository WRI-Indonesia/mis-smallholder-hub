"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ReleaseMetric } from "@/types/release-metrics";
import { dayEpoch, effectiveDate, fmtDate, fmtDateShort, fmtDelta, fmtInt, fmtRvs } from "./metrics-shared";

/**
 * Panel 1 (spec §4.2 + revisi owner): kurva RVS pada SUMBU KALENDER
 * proporsional, mengikuti konsep chart produksi Detail Lahan
 * (`parcel-production-chart.tsx`) — tombol periode mengatur rentang waktu yang
 * muat di viewport (1 Minggu · 1 Bulan · 6 Bulan · 1 Tahun · Semua), sisanya
 * di-slide (scroll horizontal) dan otomatis diposisikan ke tanggal terbaru;
 * sumbu Y tetap di kiri. Titik estimasi: garis putus-putus + titik berongga;
 * anotasi vertikal "mulai diukur". Y mulai 900 (anchor 1000).
 *
 * Geometri dihitung dalam PIKSEL nyata (lebar konten diukur ResizeObserver) —
 * bukan viewBox yang di-stretch — supaya lingkaran titik dan pola dash tidak
 * terdistorsi saat konten lebih lebar dari viewport.
 */

const H = 240;
const PAD = { t: 18, b: 26 };

/** Rentang hari yang tampak di viewport; null = seluruh riwayat. */
const PERIODS: { label: string; days: number | null }[] = [
  { label: "1 Minggu", days: 7 },
  { label: "1 Bulan", days: 30 },
  { label: "6 Bulan", days: 183 },
  { label: "1 Tahun", days: 365 },
  { label: "Semua", days: null },
];

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
  const [windowDays, setWindowDays] = useState<number | null>(30);
  const [hover, setHover] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerW, setInnerW] = useState(0);
  const color = dark ? "#3987e5" : "#2a78d6";

  const pts = releases.map((r) => ({ r, t: dayEpoch(effectiveDate(r, today)) }));
  const t0 = pts[0].t;
  const t1 = Math.max(pts[pts.length - 1].t, t0 + 1);
  const totalDays = t1 - t0;
  // Lebar konten = totalRentang/rentangTampak × lebar viewport (pola chart
  // produksi); belum melebihi jendela → pas 100% tanpa scroll.
  const scale = windowDays == null ? 1 : Math.max(1, totalDays / windowDays);

  const yMin = 900;
  const yMax = Math.ceil((Math.max(...pts.map((p) => p.r.rvs)) + 60) / 100) * 100;
  const gridVals = Array.from({ length: Math.floor((yMax - yMin) / 200) + 1 }, (_, i) => yMin + i * 200);
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);

  // Lebar piksel konten diukur nyata; margin 14px di kedua tepi agar titik &
  // label ujung tidak terpotong.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setInnerW(el.clientWidth));
    ro.observe(el);
    setInnerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const x = (t: number) => 14 + ((t - t0) / (t1 - t0)) * Math.max(0, innerW - 28);

  // Slide ke ujung kanan (tanggal terbaru) tiap ganti periode / ukuran.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [windowDays, innerW]);

  const measuredFirst = releases.find((r) => !r.isEstimated && !r.isProvisional);
  const hovered = hover != null ? pts[hover] : null;

  // Label tanggal unik, ditipiskan agar ≤ ~10 label per lebar jendela tampak.
  const uniqueDates = [...new Set(pts.map((p) => p.t))];
  const labelEvery = Math.max(1, Math.ceil(uniqueDates.length / (10 * scale)));

  return (
    <div>
      <div className="mb-3 flex justify-end gap-1" role="group" aria-label="Rentang waktu tampak">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setWindowDays(p.days)}
            aria-pressed={windowDays === p.days}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              windowDays === p.days
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {/* Sumbu kiri tetap — tidak ikut scroll */}
        <div
          className="relative shrink-0 w-12 text-right text-[10px] tabular-nums text-muted-foreground"
          style={{ height: H }}
          aria-hidden
        >
          {gridVals.map((v) => (
            <span key={v} className="absolute right-0" style={{ top: y(v) - 6 }}>
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
                aria-label={`Kurva RVS kumulatif dari ${fmtInt(pts[0].r.rvs)} (${fmtDate(effectiveDate(pts[0].r, today))}) menjadi ${fmtInt(pts[pts.length - 1].r.rvs)}; titik sebelum ${measuredFirst?.version ?? ""} adalah estimasi`}
              >
                <title>Kurva RVS kumulatif per tanggal rilis</title>
                {gridVals.map((v) => (
                  <line key={v} x1={0} x2={innerW} y1={y(v)} y2={y(v)} stroke={gridColor} strokeWidth={0.5} />
                ))}
                <path
                  d={`M ${pts.map((p) => `${x(p.t)} ${y(p.r.rvs)}`).join(" L ")} L ${x(pts[pts.length - 1].t)} ${H - PAD.b} L ${x(pts[0].t)} ${H - PAD.b} Z`}
                  fill={color}
                  opacity={0.1}
                />
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
                {/* Label tanggal — ikut scroll bersama kurva */}
                {uniqueDates.map((t, i) =>
                  i % labelEvery === 0 || i === uniqueDates.length - 1 ? (
                    <text
                      key={t}
                      x={x(t)}
                      y={H - 8}
                      textAnchor={i === 0 ? "start" : i === uniqueDates.length - 1 ? "end" : "middle"}
                      fontSize={10}
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
                  transform: `translateX(${x(hovered.t) > innerW * 0.8 ? "calc(-100% - 8px)" : "8px"})`,
                }}
              >
                <p className="font-medium">
                  {hovered.r.isProvisional ? "Siklus berjalan" : hovered.r.version}
                  <span className="ml-2 font-normal text-muted-foreground">{fmtDate(effectiveDate(hovered.r, today))}</span>
                </p>
                <p className="tabular-nums">
                  RVS {fmtRvs(hovered.r)}
                  {hovered.r.delta != null && (
                    <span className="ml-2 text-muted-foreground">Δ {fmtDelta(hovered.r.delta)}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
