"use client";

import type { ReleaseMetric } from "@/types/release-metrics";
import {
  dayEpoch,
  effectiveDate,
  fmt1,
  fmtDate,
  fmtInt,
  niceTicks,
  seriesColor,
  windowSlice,
} from "./metrics-shared";
import { TimeSeriesChart, type SeriesPoint } from "./time-series-chart";

/**
 * Dua grafik pendamping Kurva RVS, memakai kerangka yang sama
 * (`TimeSeriesChart`) dan rentang waktu yang sama dari kontrol tunggal halaman.
 * Roadmap: garis BERTANGGA (naik diskret per fase selesai) + shading plateau.
 * Test: garis biasa, warnanya sama dengan RVS karena sama-sama "pertumbuhan".
 */

const H = 200;

type Pt = SeriesPoint & { r: ReleaseMetric };

/** Judul + tanggal pada tooltip — identik di kedua chart. */
function TooltipHead({ r, date }: { r: ReleaseMetric; date: string }) {
  return (
    <p className="font-medium">
      {r.isProvisional ? "Siklus berjalan" : r.version}
      <span className="ml-2 font-normal text-muted-foreground">{fmtDate(date)}</span>
    </p>
  );
}

export function RoadmapStepChart({
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
  const all: Pt[] = releases.map((r) => ({
    key: r.version,
    t: dayEpoch(effectiveDate(r, today)),
    v: r.roadmapPct,
    date: effectiveDate(r, today),
    soft: r.isProvisional,
    r,
  }));
  const points = windowSlice(all, (p) => p.t, windowDays);

  const vals = points.map((p) => p.v);
  // Rentang penuh 0–100 membuat plateau tak terbaca; hardcode jebol saat
  // roadmap mendekati 100% (#229) — domain ikut data, clamp 0–100.
  const yMin = Math.max(0, Math.floor((Math.min(...vals) - 2) / 5) * 5);
  const yMax = Math.min(100, Math.max(yMin + 5, Math.ceil((Math.max(...vals) + 2) / 5) * 5));

  // Plateau dihitung dari SELURUH riwayat (berapa lama % tak naik adalah fakta
  // lintas rilis), lalu digambar terpotong pada tepi kiri rentang tampak.
  const lastV = all[all.length - 1].v;
  let plateauStart = all.length - 1;
  while (plateauStart > 0 && all[plateauStart - 1].v === lastV) plateauStart--;
  const plateauDays = Math.round(all[all.length - 1].t - all[plateauStart].t);
  const plateauFrom = Math.max(all[plateauStart].t, points[0].t);

  return (
    <TimeSeriesChart
      points={points}
      stepped
      yMin={yMin}
      yMax={yMax}
      ticks={niceTicks(yMin, yMax)}
      formatTick={(v) => `${fmtInt(v)}%`}
      color={seriesColor("roadmap", dark)}
      surface={surface}
      gridColor={gridColor}
      height={H}
      title="Roadmap % per tanggal rilis"
      ariaLabel={`Progres roadmap tertimbang dari ${fmt1(points[0].v)}% menjadi ${fmt1(points[points.length - 1].v)}%, plateau ${fmtInt(plateauDays)} hari terakhir`}
      annotate={({ x, y }) =>
        plateauDays >= 5 && x(plateauFrom) < x(all[all.length - 1].t) ? (
          <g>
            <rect
              x={x(plateauFrom)}
              y={y(lastV) - 8}
              width={Math.max(0, x(points[points.length - 1].t) - x(plateauFrom))}
              height={16}
              fill={seriesColor("roadmap", dark)}
              opacity={0.08}
            />
            <text x={x(points[points.length - 1].t)} y={y(lastV) - 12} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
              plateau {fmtInt(plateauDays)} hari
            </text>
          </g>
        ) : null
      }
      tooltip={(p) => (
        <>
          <TooltipHead r={(p as Pt).r} date={p.date} />
          <p className="tabular-nums">Roadmap {fmt1(p.v)}%</p>
        </>
      )}
    />
  );
}

export function TestCountChart({
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
  const all: Pt[] = releases
    .filter((r) => r.testCount != null)
    .map((r) => ({
      key: r.version,
      t: dayEpoch(effectiveDate(r, today)),
      v: r.testCount as number,
      date: effectiveDate(r, today),
      soft: r.isEstimated || r.isProvisional,
      r,
    }));

  // Parser sah meloloskan sel test "—" — garis/lonjakan butuh ≥2 titik (#229).
  if (all.length < 2) {
    return (
      <p className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: H }}>
        Belum cukup titik test terukur untuk menggambar tren.
      </p>
    );
  }

  const points = windowSlice(all, (p) => p.t, windowDays);
  const vals = points.map((p) => p.v);
  const yMin = Math.max(0, Math.floor((Math.min(...vals) - 30) / 100) * 100);
  const yMax = Math.ceil((Math.max(...vals) + 30) / 100) * 100;

  // Anotasi lonjakan terbesar di antara titik yang tampak.
  let jumpIdx = 1;
  for (let i = 1; i < points.length; i++) {
    if (points[i].v - points[i - 1].v > points[jumpIdx].v - points[jumpIdx - 1].v) jumpIdx = i;
  }
  const jump = points.length > 1 ? points[jumpIdx].v - points[jumpIdx - 1].v : 0;

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
      height={H}
      title="Jumlah test otomatis per rilis"
      ariaLabel={`Jumlah test otomatis dari ${fmtInt(points[0].v)} menjadi ${fmtInt(points[points.length - 1].v)}; lonjakan terbesar +${fmtInt(jump)} pada ${points[jumpIdx].key}`}
      annotate={({ x, y }) =>
        jump > 0 ? (
          <text x={x(points[jumpIdx].t) + 6} y={y(points[jumpIdx].v) + 1} fontSize={9} fill="currentColor" opacity={0.65}>
            +{fmtInt(jump)} ({points[jumpIdx].key})
          </text>
        ) : null
      }
      tooltip={(p) => (
        <>
          <TooltipHead r={(p as Pt).r} date={p.date} />
          <p className="tabular-nums">{fmtInt(p.v)} test</p>
        </>
      )}
    />
  );
}
