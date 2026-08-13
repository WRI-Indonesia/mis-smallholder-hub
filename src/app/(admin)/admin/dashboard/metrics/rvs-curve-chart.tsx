"use client";

import type { ReleaseMetric } from "@/types/release-metrics";
import {
  dayEpoch,
  effectiveDate,
  fmtDate,
  fmtDelta,
  fmtInt,
  fmtRvs,
  niceTicks,
  seriesColor,
  windowSlice,
} from "./metrics-shared";
import { TimeSeriesChart, type SeriesPoint } from "./time-series-chart";

/**
 * Kurva RVS kumulatif pada sumbu kalender (jarak antar titik proporsional
 * waktu). Rentang tampak datang dari kontrol tunggal halaman — dulu tiap chart
 * punya slicer + scroll sendiri sehingga sumbunya tak bisa dibandingkan.
 *
 * Area di bawah kurva sengaja dihapus: domain Y mengikuti data (bukan nol),
 * dan area dengan garis dasar terpotong melebih-lebihkan besarnya perubahan.
 */
export function RvsCurveChart({
  releases,
  today,
  windowDays,
  dark,
  gridColor,
  surface,
}: {
  releases: ReleaseMetric[];
  today: string;
  windowDays: number | null;
  dark: boolean;
  gridColor: string;
  surface: string;
}) {
  const all: (SeriesPoint & { r: ReleaseMetric })[] = releases.map((r) => ({
    key: r.version,
    t: dayEpoch(effectiveDate(r, today)),
    v: r.rvs,
    date: effectiveDate(r, today),
    soft: r.isEstimated || r.isProvisional,
    r,
  }));
  const points = windowSlice(all, (p) => p.t, windowDays);

  const vals = points.map((p) => p.v);
  const yMin = Math.floor((Math.min(...vals) - 60) / 100) * 100;
  const yMax = Math.ceil((Math.max(...vals) + 60) / 100) * 100;

  // Penanda "mulai diukur" hanya bila rilis terukur pertama ada di rentang ini.
  const measuredFirst = releases.find((r) => !r.isEstimated && !r.isProvisional);
  const markerT = measuredFirst?.releasedAt ? dayEpoch(measuredFirst.releasedAt) : null;
  const showMarker = markerT != null && markerT >= points[0].t && markerT <= points[points.length - 1].t;

  return (
    <TimeSeriesChart
      points={points}
      yMin={yMin}
      yMax={yMax}
      ticks={niceTicks(yMin, yMax)}
      formatTick={fmtInt}
      color={seriesColor("growth", dark)}
      surface={surface}
      gridColor={gridColor}
      title="Kurva RVS kumulatif per tanggal rilis"
      ariaLabel={`Kurva RVS kumulatif dari ${fmtInt(points[0].v)} (${fmtDate(points[0].date)}) menjadi ${fmtInt(points[points.length - 1].v)} (${fmtDate(points[points.length - 1].date)}); garis putus-putus = angka estimasi`}
      annotate={({ x, y, h }) =>
        showMarker && markerT != null ? (
          <g>
            <line x1={x(markerT)} x2={x(markerT)} y1={y(yMax)} y2={h - 26} stroke="currentColor" opacity={0.35} strokeWidth={0.75} strokeDasharray="2 3" />
            <text x={x(markerT) - 4} y={y(yMax) + 8} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.65}>
              mulai diukur
            </text>
          </g>
        ) : null
      }
      tooltip={(p) => {
        const r = (p as SeriesPoint & { r: ReleaseMetric }).r;
        return (
          <>
            <p className="font-medium">
              {r.isProvisional ? "Siklus berjalan" : r.version}
              <span className="ml-2 font-normal text-muted-foreground">{fmtDate(p.date)}</span>
            </p>
            <p className="tabular-nums">
              RVS {fmtRvs(r)}
              {r.delta != null && <span className="ml-2 text-muted-foreground">Δ {fmtDelta(r.delta)}</span>}
            </p>
          </>
        );
      }}
    />
  );
}
