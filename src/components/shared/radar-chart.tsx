"use client";

import { AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS } from "@/lib/data-availability-aggregation";
import { heatRgb, rgbCss } from "@/lib/score-heat";
import { radarLabelAnchor, radarPoints, toPointsAttr, type RadarFrame } from "@/lib/radar-geometry";
import type { AvailabilityDomainKey } from "@/types/dashboard";
import { cn } from "@/lib/utils";

/** Cincin pada ambang band (`scoreBand`): 50 · 80 · 100. */
const RINGS = [50, 80, 100];
const FULL = AVAILABILITY_DOMAIN_KEYS.map(() => 100);

const formatScore = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);
const axisLabel = (key: AvailabilityDomainKey) => AVAILABILITY_DOMAIN_LABELS[key].replace("Profil Lembaga", "Profil");

export type RadarScores = Record<AvailabilityDomainKey, number>;

/**
 * Lapisan pentagon "sidik jari" (#352 putaran 4): cincin di ambang band,
 * sumbu (Profil di atas, lalu searah jarum jam Petani · Lahan · Pelatihan ·
 * Produksi), poligon skor berisi warna skala heatmap skor total, titik sudut
 * berwarna skor domain, label sumbu di luar jari-jari — pentagon penuh =
 * lengkap, gepeng ke satu sisi = domain itu kosong.
 */
function RadarLayers({
  frame,
  labelRadius,
  total,
  scores,
  showValues,
  labelClass,
  dotRadius,
  onAxisClick,
}: {
  frame: RadarFrame;
  labelRadius: number;
  total: number;
  scores: RadarScores;
  showValues: boolean;
  labelClass: string;
  dotRadius: number;
  /** Label sumbu jadi tautan (strip Per Lembaga: lompat ke seksi domain). */
  onAxisClick?: (key: AvailabilityDomainKey) => void;
}) {
  const values = AVAILABILITY_DOMAIN_KEYS.map((k) => scores[k]);
  const outer = radarPoints(FULL, frame);
  const poly = radarPoints(values, frame);
  const labels = radarPoints(FULL, { ...frame, r: labelRadius });
  const totalColor = rgbCss(heatRgb(total));
  return (
    <>
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={toPointsAttr(radarPoints(AVAILABILITY_DOMAIN_KEYS.map(() => ring), frame))}
          className="fill-none stroke-border"
          strokeWidth={ring === 100 ? 1 : 0.75}
          strokeDasharray={ring === 100 ? undefined : "2 2"}
        />
      ))}
      {outer.map(([x, y], i) => (
        <line key={AVAILABILITY_DOMAIN_KEYS[i]} x1={frame.cx} y1={frame.cy} x2={x} y2={y} className="stroke-border" strokeWidth={0.75} />
      ))}
      <polygon points={toPointsAttr(poly)} style={{ fill: totalColor, stroke: totalColor }} fillOpacity={0.3} strokeWidth={1.5} strokeLinejoin="round" />
      {poly.map(([x, y], i) => (
        <circle
          key={AVAILABILITY_DOMAIN_KEYS[i]}
          cx={x}
          cy={y}
          r={dotRadius}
          style={{ fill: rgbCss(heatRgb(values[i])) }}
          className="stroke-background"
          strokeWidth={1}
        >
          <title>{`${AVAILABILITY_DOMAIN_LABELS[AVAILABILITY_DOMAIN_KEYS[i]]}: ${formatScore(values[i])}%`}</title>
        </circle>
      ))}
      {labels.map(([x, y], i) => (
        <text
          key={AVAILABILITY_DOMAIN_KEYS[i]}
          x={x}
          y={y}
          textAnchor={radarLabelAnchor(i, AVAILABILITY_DOMAIN_KEYS.length)}
          dominantBaseline="middle"
          className={cn("fill-muted-foreground", labelClass, onAxisClick && "cursor-pointer hover:fill-primary hover:underline")}
          onClick={onAxisClick ? () => onAxisClick(AVAILABILITY_DOMAIN_KEYS[i]) : undefined}
        >
          {onAxisClick && <title>{`Buka seksi ${AVAILABILITY_DOMAIN_LABELS[AVAILABILITY_DOMAIN_KEYS[i]]}`}</title>}
          {axisLabel(AVAILABILITY_DOMAIN_KEYS[i])}
          {showValues && (
            <>
              {" "}
              <tspan className="fill-foreground font-semibold tabular-nums">{formatScore(values[i])}</tspan>
            </>
          )}
        </text>
      ))}
    </>
  );
}

/** Bingkai SVG radar — label kiri/kanan ("Produksi 100") butuh ±50 px di luar jari-jari. */
const CHART_FRAME: RadarFrame = { cx: 118, cy: 92, r: 56 };
const CHART_VIEW = { w: 236, h: 172 };
const CHART_LABEL_OFFSET = 13;

/**
 * Pentagon satu Lembaga — grid kartu & modal Semua Lembaga, dan strip skor Per
 * Lembaga. `large` = versi modal (label lebih kecil relatif viewBox agar
 * proporsional saat 2×); `showValues={false}` = label sumbu tanpa angka;
 * `onAxisClick` = label sumbu jadi tautan (strip Per Lembaga: menggantikan
 * kartu domain sebagai navigasi ke seksi — keputusan owner, tanpa redundansi).
 */
export function RadarChart({
  name,
  total,
  scores,
  large,
  showValues = true,
  onAxisClick,
  className,
}: {
  name: string;
  total: number;
  scores: RadarScores;
  large?: boolean;
  showValues?: boolean;
  onAxisClick?: (key: AvailabilityDomainKey) => void;
  className?: string;
}) {
  return (
    <svg viewBox={`0 0 ${CHART_VIEW.w} ${CHART_VIEW.h}`} className={cn("h-auto w-full", className)} role="img" aria-label={`Radar ${name}`}>
      <RadarLayers
        frame={CHART_FRAME}
        labelRadius={CHART_FRAME.r + CHART_LABEL_OFFSET}
        total={total}
        scores={scores}
        showValues={showValues}
        labelClass={large ? "text-[7px]" : "text-[9px]"}
        dotRadius={large ? 2.5 : 3}
        onAxisClick={onAxisClick}
      />
    </svg>
  );
}
