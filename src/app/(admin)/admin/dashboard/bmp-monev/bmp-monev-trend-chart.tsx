"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPct } from "@/lib/format";
import { formatScore } from "@/lib/bmp-assessment";
import { BMP_MONEV_STACK_ORDER, type BmpMonevTrendBucket } from "@/lib/bmp-monev-dashboard-aggregation";
import { BmpMonevCategoryLegend } from "./bmp-monev-category-legend";

/**
 * Tren per tahun survei: komposisi kategori (batang 100%, satu sumbu persen)
 * dengan rerata skor sebagai label langsung di atas batang — bukan sumbu
 * kedua. Bermakna mulai ada dua tahun; satu tahun tetap ditampilkan agar
 * pembaca tahu tren akan terisi.
 */
export function BmpMonevTrendChart({ buckets, activeYear }: { buckets: BmpMonevTrendBucket[]; activeYear: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const hasData = buckets.some((b) => b.assessedFarmers > 0);
  const slot = buckets.length > 0 ? 100 / buckets.length : 100;
  const barW = Math.min(slot * 0.5, 18);

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Tren Kategori per Tahun Survei
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Tinggi segmen = proporsi petani dinilai per kategori; angka di atas batang = rerata skor tahun itu.
          {buckets.length === 1 && " Tren terbentuk setelah survei tahun berikutnya masuk."}
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!hasData ? (
          <div className="flex flex-1 min-h-[220px] items-center justify-center text-sm text-muted-foreground">Belum ada penilaian pada filter ini.</div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex gap-2">
              <div className="flex flex-col justify-between h-[220px] text-[10px] text-muted-foreground tabular-nums text-right w-9 shrink-0">
                {[100, 75, 50, 25, 0].map((p) => (
                  <span key={p}>{p}%</span>
                ))}
              </div>
              <div className="relative flex-1 h-[220px]">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                  {[0, 25, 50, 75, 100].map((p) => (
                    <line key={p} x1="0" x2="100" y1={100 - p} y2={100 - p} stroke="currentColor" strokeWidth="0.15" className="text-border" vectorEffect="non-scaling-stroke" />
                  ))}
                  {buckets.map((b, i) => {
                    const x = i * slot + (slot - barW) / 2;
                    let acc = 0;
                    return (
                      <g key={b.year} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                        <rect x={i * slot} y="0" width={slot} height="100" fill="transparent" />
                        {BMP_MONEV_STACK_ORDER.map((c) => {
                          const n = b.byCategory[c.key];
                          if (n <= 0 || b.assessedFarmers === 0) return null;
                          const h = (n / b.assessedFarmers) * 100;
                          const y = 100 - acc - h;
                          acc += h;
                          return (
                            <rect
                              key={c.key}
                              x={x}
                              y={y}
                              width={barW}
                              height={Math.max(h - 0.6, 0)}
                              fill={c.color}
                              opacity={hover === null || hover === i ? (activeYear == null || activeYear === b.year ? 1 : 0.6) : 0.4}
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>
                {hover !== null && buckets[hover].assessedFarmers > 0 && (
                  <div
                    className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md"
                    style={{ left: `${Math.min(Math.max(hover * slot + slot / 2, 12), 88)}%`, transform: "translateX(-50%)", top: 4 }}
                  >
                    <div className="font-semibold mb-1">{buckets[hover].year}</div>
                    <div className="text-muted-foreground mb-1">
                      {formatNumber(buckets[hover].assessedFarmers)} petani dinilai · rerata {buckets[hover].avgScore == null ? "—" : formatScore(buckets[hover].avgScore)}
                    </div>
                    {BMP_MONEV_STACK_ORDER.map((c) => (
                      <div key={c.key} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: c.color }} />
                        {c.label}
                        <span className="ml-auto pl-3 tabular-nums font-medium">
                          {formatNumber(buckets[hover].byCategory[c.key])} · {formatPct((buckets[hover].byCategory[c.key] / buckets[hover].assessedFarmers) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <div className="w-9 shrink-0" />
              <div className="flex-1 flex text-[10px] text-muted-foreground">
                {buckets.map((b) => (
                  <span key={b.year} className="text-center" style={{ width: `${slot}%` }}>
                    <span className={activeYear === b.year ? "font-semibold text-foreground" : undefined}>{b.year}</span>
                    <br />
                    <span className="tabular-nums">{b.avgScore == null ? "—" : `rerata ${formatScore(b.avgScore)}`}</span>
                  </span>
                ))}
              </div>
            </div>
            <BmpMonevCategoryLegend className="mt-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
