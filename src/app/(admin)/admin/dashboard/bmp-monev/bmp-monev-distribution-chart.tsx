"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPct } from "@/lib/format";
import { formatScore } from "@/lib/bmp-assessment";
import { BMP_MONEV_STACK_ORDER, type BmpMonevGroupRow } from "@/lib/bmp-monev-dashboard-aggregation";
import { BmpMonevCategoryLegend } from "./bmp-monev-category-legend";

/**
 * Komposisi kategori per Lembaga — batang horizontal 100% (kiri = terendah,
 * kanan = tertinggi), urut rerata skor menurun. Segmen berjarak 2px, label
 * jumlah langsung pada segmen yang cukup lebar; tooltip per batang memuat
 * rincian lengkap (kontras hijau muda < 3:1 ditopang label + tabel di bawah).
 */
export function BmpMonevDistributionChart({ rows, yearLabel }: { rows: BmpMonevGroupRow[]; yearLabel: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const withData = rows.filter((r) => r.assessedFarmers > 0);

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Komposisi Kategori per Lembaga ({yearLabel})
          </CardTitle>
        </div>
        <BmpMonevCategoryLegend />
      </CardHeader>
      <CardContent className="flex-1">
        {withData.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            Belum ada penilaian pada filter ini.
          </div>
        ) : (
          <div className="space-y-2.5">
            {withData.map((r) => {
              const dim = hover !== null && hover !== r.id;
              return (
                <div key={r.id} className="space-y-1" onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{r.name}</span>
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {formatNumber(r.assessedFarmers)} dinilai · rerata {r.avgScore == null ? "—" : formatScore(r.avgScore)}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="flex h-5 w-full gap-0.5 overflow-hidden rounded-md" style={{ opacity: dim ? 0.45 : 1 }}>
                      {BMP_MONEV_STACK_ORDER.map((c) => {
                        const n = r.byCategory[c.key];
                        if (n <= 0) return null;
                        const w = (n / r.assessedFarmers) * 100;
                        return (
                          <div
                            key={c.key}
                            className="flex items-center justify-center text-[10px] font-medium text-white tabular-nums"
                            style={{ width: `${w}%`, backgroundColor: c.color }}
                            title={`${c.label}: ${formatNumber(n)} (${formatPct(w)}%)`}
                          >
                            {w >= 9 ? formatNumber(n) : null}
                          </div>
                        );
                      })}
                    </div>
                    {hover === r.id && (
                      <div className="pointer-events-none absolute left-0 top-6 z-10 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md">
                        <div className="font-semibold mb-1">{r.name}</div>
                        <div className="text-muted-foreground mb-1">
                          {formatNumber(r.assessedFarmers)} dari {formatNumber(r.totalFarmers)} petani dinilai
                        </div>
                        {BMP_MONEV_STACK_ORDER.map((c) => (
                          <div key={c.key} className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: c.color }} />
                            {c.label}
                            <span className="ml-auto pl-3 tabular-nums font-medium">
                              {formatNumber(r.byCategory[c.key])} · {formatPct((r.byCategory[c.key] / r.assessedFarmers) * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-[11px] text-muted-foreground">
              Lebar segmen = proporsi petani dinilai per kategori; Lembaga tanpa penilaian tidak ditampilkan (lihat tabel).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
