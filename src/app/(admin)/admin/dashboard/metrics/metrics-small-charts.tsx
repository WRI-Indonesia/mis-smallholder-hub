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
    segment: r.roadmapBaseline,
    r,
  }));
  const points = windowSlice(all, (p) => p.t, windowDays);
  const lastBaseline = all[all.length - 1].r.roadmapBaseline;
  // Lebih dari satu baseline tampak → sumbu penuh 0–100: dua baseline tak
  // sebanding, dan domain ketat akan menggambar baseline baru "jatuh" (#392).
  const multiBaseline = new Set(points.map((p) => p.r.roadmapBaseline)).size > 1;

  const vals = points.map((p) => p.v);
  // Rentang penuh 0–100 membuat plateau tak terbaca; hardcode jebol saat
  // roadmap mendekati 100% (#229) — domain ikut data, clamp 0–100.
  const yMin = multiBaseline ? 0 : Math.max(0, Math.floor((Math.min(...vals) - 2) / 5) * 5);
  const yMax = multiBaseline ? 100 : Math.min(100, Math.max(yMin + 5, Math.ceil((Math.max(...vals) + 2) / 5) * 5));

  // Plateau dihitung dari seluruh riwayat BASELINE AKTIF (berapa lama % tak
  // naik adalah fakta lintas rilis), lalu digambar terpotong pada tepi kiri
  // rentang tampak. Tak melintasi reset: nilai baseline lama tak sebanding.
  const current = all.filter((p) => p.r.roadmapBaseline === lastBaseline);
  const lastV = current[current.length - 1].v;
  let plateauStart = current.length - 1;
  while (plateauStart > 0 && current[plateauStart - 1].v === lastV) plateauStart--;
  const plateauDays = Math.round(current[current.length - 1].t - current[plateauStart].t);
  const plateauFrom = Math.max(current[plateauStart].t, points[0].t);

  // Batas baseline yang tampak: titik reset + titik terakhir baseline sebelumnya.
  const resets = points
    .map((p, i) => ({ p, prev: i > 0 ? points[i - 1] : null }))
    .filter(({ p, prev }) => prev && p.r.roadmapBaseline !== prev.r.roadmapBaseline) as { p: Pt; prev: Pt }[];

  return (
    <TimeSeriesChart
      points={points}
      stepped
      fadeEarlierSegments
      yMin={yMin}
      yMax={yMax}
      ticks={niceTicks(yMin, yMax)}
      formatTick={(v) => `${fmtInt(v)}%`}
      color={seriesColor("roadmap", dark)}
      surface={surface}
      gridColor={gridColor}
      height={H}
      title="Roadmap % per tanggal rilis"
      ariaLabel={
        resets.length > 0
          ? `Progres roadmap: baseline lama dibekukan pada ${fmt1(resets[resets.length - 1].prev.v)}%, baseline aktif ${fmt1(lastV)}% sejak reset ${fmtDate(resets[resets.length - 1].p.date)}`
          : `Progres roadmap tertimbang dari ${fmt1(points[0].v)}% menjadi ${fmt1(points[points.length - 1].v)}%, plateau ${fmtInt(plateauDays)} hari terakhir`
      }
      annotate={({ x, y, h }) => (
        <>
          {/* Batas baseline: garis vertikal putus di titik reset + label nilai beku baseline lama. */}
          {resets.map(({ p, prev }) => (
            <g key={p.key}>
              <line x1={x(p.t)} x2={x(p.t)} y1={y(yMax)} y2={h - 26} stroke="currentColor" strokeDasharray="3 3" opacity={0.35} />
              {/* Tiga label di tiga ketinggian berbeda: reset sering hanya sehari
                  sesudah rilis terakhir baseline lama, jadi x-nya nyaris sama. */}
              <text x={x(prev.t) - 4} y={y(prev.v) - 8} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
                baseline lama beku {fmt1(prev.v)}%
              </text>
              <text x={x(p.t) - 4} y={y((yMin + yMax) / 2)} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
                reset {fmtDate(p.date)}
              </text>
              <text x={x(p.t) - 8} y={y(p.v) + 3} textAnchor="end" fontSize={10} fontWeight={500} fill="currentColor" opacity={0.8}>
                baseline baru {fmt1(p.v)}%
              </text>
            </g>
          ))}
          {plateauDays >= 5 && x(plateauFrom) < x(all[all.length - 1].t) && (
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
          )}
        </>
      )}
      tooltip={(p) => (
        <>
          <TooltipHead r={(p as Pt).r} date={p.date} />
          <p className="tabular-nums">Roadmap {fmt1(p.v)}%</p>
          <p className="text-muted-foreground">
            {(p as Pt).r.roadmapBaseline < lastBaseline
              ? "baseline lama (dibekukan)"
              : (p as Pt).r.roadmapReset
                ? "awal baseline baru"
                : "baseline aktif"}
          </p>
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
