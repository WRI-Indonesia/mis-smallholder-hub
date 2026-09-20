"use client";

import { useState } from "react";
import { BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { bmpAssessmentCategoryByKey, formatScore } from "@/lib/bmp-assessment";
import type { BmpMonevScoreBin } from "@/lib/bmp-monev-dashboard-aggregation";
import { BmpMonevCategoryLegend } from "./bmp-monev-category-legend";

/** Ceiling sumbu yang rapi (1/2/5 × 10^k) — pola BmpTrendChart. */
function axisMax(dataMax: number): number {
  if (dataMax <= 0) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(dataMax)));
  for (const m of [1, 2, 5, 10]) if (dataMax <= m * pow) return m * pow;
  return 10 * pow;
}

/**
 * Sebaran skor petani dinilai — histogram bin 0,25 (0–3), warna bin mengikuti
 * kategori. Menjawab "seberapa dekat petani ke ambang berikutnya", yang tidak
 * terlihat dari hitungan per kategori saja. Rerata ditandai garis putus-putus.
 */
export function BmpMonevScoreHistogram({ bins, avgScore, yearLabel }: { bins: BmpMonevScoreBin[]; avgScore: number | null; yearLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = bins.reduce((s, b) => s + b.count, 0);
  const max = axisMax(Math.max(0, ...bins.map((b) => b.count)));
  const divisions = String(max).startsWith("2") ? 4 : 5;
  const fractions = Array.from({ length: divisions + 1 }, (_, i) => i / divisions);
  const slot = 100 / bins.length;
  const barW = slot * 0.7;

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" /> Sebaran Skor Petani ({yearLabel})
        </CardTitle>
        <p className="text-xs text-muted-foreground">Jumlah petani per rentang skor 0,25; garis putus-putus = rerata.</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {total === 0 ? (
          <div className="flex flex-1 min-h-[220px] items-center justify-center text-sm text-muted-foreground">Belum ada penilaian pada filter ini.</div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex gap-2">
              <div className="flex flex-col justify-between h-[200px] text-[10px] text-muted-foreground tabular-nums text-right w-8 shrink-0">
                {[...fractions].reverse().map((f) => (
                  <span key={f}>{formatNumber(Math.round(max * f))}</span>
                ))}
              </div>
              <div className="relative flex-1 h-[200px]">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                  {fractions.map((f) => (
                    <line key={f} x1="0" x2="100" y1={100 - f * 100} y2={100 - f * 100} stroke="currentColor" strokeWidth="0.15" className="text-border" vectorEffect="non-scaling-stroke" />
                  ))}
                  {bins.map((b, i) => {
                    const h = (b.count / max) * 100;
                    const x = i * slot + (slot - barW) / 2;
                    return (
                      <g key={b.from} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                        <rect x={i * slot} y="0" width={slot} height="100" fill="transparent" />
                        {b.count > 0 && (
                          <rect x={x} y={100 - h} width={barW} height={h} fill={bmpAssessmentCategoryByKey(b.categoryKey).color} opacity={hover === null || hover === i ? 1 : 0.4} />
                        )}
                      </g>
                    );
                  })}
                  {avgScore != null && (
                    <line x1={(avgScore / 3) * 100} x2={(avgScore / 3) * 100} y1="0" y2="100" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" className="text-foreground/70" vectorEffect="non-scaling-stroke" />
                  )}
                </svg>
                {hover !== null && bins[hover].count > 0 && (
                  <div
                    className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md whitespace-nowrap"
                    style={{ left: `${Math.min(Math.max(hover * slot + slot / 2, 14), 86)}%`, transform: "translateX(-50%)", top: 4 }}
                  >
                    <div className="font-semibold">
                      {formatScore(bins[hover].from)} – {formatScore(bins[hover].to)}
                    </div>
                    <div className="text-muted-foreground">
                      {formatNumber(bins[hover].count)} petani · {bmpAssessmentCategoryByKey(bins[hover].categoryKey).label}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <div className="w-8 shrink-0" />
              <div className="flex-1 flex text-[10px] text-muted-foreground tabular-nums">
                {bins.map((b) => (
                  <span key={b.from} className="text-center" style={{ width: `${slot}%` }}>
                    {Number.isInteger(b.from) || b.from === 1.5 || b.from === 2.5 ? formatScore(b.from) : ""}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <BmpMonevCategoryLegend />
              {avgScore != null && <span className="text-[11px] text-muted-foreground tabular-nums">rerata {formatScore(avgScore)}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
