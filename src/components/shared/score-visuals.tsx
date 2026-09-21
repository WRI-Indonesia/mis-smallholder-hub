"use client";

import { cn } from "@/lib/utils";
import { scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_BAR, BAND_TEXT } from "@/lib/score-band-styles";

/**
 * Visual skor band (#352): dipakai Ketersediaan Data — Per Lembaga, Semua
 * Lembaga, dan kartu KPI Detail Lembaga supaya angka yang sama tampil dengan
 * bentuk & warna yang sama. Ambang warna dari `scoreBand` (satu sumber).
 */

/** Cincin skor (SVG) — angka besar di tengah, warna band. */
export function ScoreGauge({
  score,
  size = 132,
  label = "Index",
  className,
}: {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const band = scoreBand(score);
  const stroke = Math.max(6, Math.round(size / 12));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          className={cn("transition-[stroke-dasharray] duration-700", BAND_TEXT[band])}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold tabular-nums leading-none", BAND_TEXT[band])} style={{ fontSize: size / 4 }}>
          {Math.round(score)}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/** Bar tipis 0–100 dengan warna band; `inactive` = bergaris (tidak berlaku). */
export function BandBar({ pct, className, inactive }: { pct: number; className?: string; inactive?: boolean }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", inactive && "border border-dashed bg-muted/40", className)}>
      {!inactive && (
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", BAND_BAR[scoreBand(pct)])}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      )}
    </div>
  );
}
