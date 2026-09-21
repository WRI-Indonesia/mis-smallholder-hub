"use client";

import { cn } from "@/lib/utils";
import { scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_BAR, BAND_TEXT } from "@/lib/score-band-styles";
import { HEAT_FULL, HEAT_GRADIENT_CSS, heatStyle, rgbCss } from "@/lib/score-heat";

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

/**
 * Sel heatmap (#352 putaran 4): latar solid dari skala kontinu `heatStyle`,
 * angka kecil di dalam sel. `emphasis` untuk kolom Skor Total (lebih tebal,
 * ber-ring) supaya tetap jadi angka utama di antara sel domain.
 */
export function HeatCell({
  score,
  children,
  emphasis,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { score: number; emphasis?: boolean }) {
  return (
    <div
      {...rest}
      style={{ ...heatStyle(score), ...rest.style }}
      className={cn(
        "flex h-7 w-full items-center justify-center rounded-[3px] tabular-nums",
        emphasis ? "rounded-md text-sm font-bold ring-1 ring-inset ring-black/15" : "text-[11px] font-semibold",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Segmen legenda skala: label band di bawah ramp, diposisikan pada rentang skornya. */
const HEAT_SEGMENTS: { from: number; to: number; label: string }[] = [
  { from: 0, to: 50, label: "kritis" },
  { from: 50, to: 80, label: "perhatian" },
  { from: 80, to: 100, label: "baik" },
];

/** Legenda heatmap: ramp gradasi 0→99 bertanda ambang band + swatch 100. */
export function HeatLegend({ label = "Skala skor", className, children }: { label?: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground", className)}>
      <span className="font-medium">{label}:</span>
      <span className="inline-flex items-start gap-1.5">
        <span className="tabular-nums leading-3">0</span>
        <span className="relative inline-block w-52" style={{ height: 24 }} title="Merah → kuning → hijau mengikuti skor; garis = ambang 50 dan 80">
          <span className="absolute inset-x-0 top-0 h-3 rounded-sm" style={{ background: HEAT_GRADIENT_CSS }} />
          {HEAT_SEGMENTS.map((seg) => (
            <span key={seg.label} className="absolute top-3 text-[10px] leading-3" style={{ left: `${seg.from}%`, width: `${seg.to - seg.from}%` }}>
              <span className="block truncate text-center">{seg.label}</span>
            </span>
          ))}
          {[50, 80].map((t) => (
            <span key={t} className="absolute top-0 h-3 w-px bg-background" style={{ left: `${t}%` }} />
          ))}
        </span>
        <span className="tabular-nums leading-3">99</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-4 rounded-sm" style={{ backgroundColor: rgbCss(HEAT_FULL) }} />
        100 — lengkap penuh
      </span>
      {children}
    </div>
  );
}
