"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowDownWideNarrow, Building2, Percent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPct } from "@/lib/format";
import { bmpAssessmentCategory, formatScore } from "@/lib/bmp-assessment";
import { BMP_MONEV_STACK_ORDER, type BmpMonevGroupRow } from "@/lib/bmp-monev-dashboard-aggregation";
import { BmpCategoryBadge } from "@/components/shared/bmp-category-badge";
import { BmpMonevCategoryLegend } from "./bmp-monev-category-legend";

type SortKey = "avg" | "coverage" | "name";

/**
 * Papan Lembaga (revisi UX 2026-09-20): menggabungkan "Komposisi kategori"
 * dan "Ranking rerata" yang dulu menampilkan 8 Lembaga yang sama dua kali.
 * Satu baris per Lembaga = peringkat · nama (klik = filter) · batang komposisi
 * 100% · rerata + badge · cakupan. Urut rerata / cakupan / abjad.
 */
export function BmpMonevGroupBoard({
  rows,
  yearLabel,
  selectedGroupId,
  onSelectGroup,
}: {
  rows: BmpMonevGroupRow[];
  yearLabel: string;
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
}) {
  const [sort, setSort] = useState<SortKey>("avg");
  const [hover, setHover] = useState<string | null>(null);
  const withData = useMemo(() => {
    const list = rows.filter((r) => r.assessedFarmers > 0);
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "coverage") return b.assessedFarmers / Math.max(b.totalFarmers, 1) - a.assessedFarmers / Math.max(a.totalFarmers, 1) || a.name.localeCompare(b.name);
      return (b.avgScore ?? -1) - (a.avgScore ?? -1) || a.name.localeCompare(b.name);
    });
  }, [rows, sort]);
  const empty = rows.length - withData.length;

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Papan Lembaga Petani ({yearLabel})
          </CardTitle>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Urutkan:</span>
            <Button size="sm" variant={sort === "avg" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setSort("avg")}>
              <ArrowDownWideNarrow className="mr-1 h-3.5 w-3.5" /> Rerata
            </Button>
            <Button size="sm" variant={sort === "coverage" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setSort("coverage")}>
              <Percent className="mr-1 h-3.5 w-3.5" /> Cakupan
            </Button>
            <Button size="sm" variant={sort === "name" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setSort("name")}>
              <ArrowDownAZ className="mr-1 h-3.5 w-3.5" /> Abjad
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BmpMonevCategoryLegend />
          {selectedGroupId ? (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSelectGroup(null)}>
              <X className="mr-1 h-3.5 w-3.5" /> Semua Lembaga
            </Button>
          ) : (
            <span className="text-[11px] text-muted-foreground">Klik nama Lembaga untuk memfokuskan seluruh dashboard.</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {withData.length === 0 ? (
          <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">Belum ada penilaian pada filter ini.</div>
        ) : (
          <div className="space-y-1">
            <div className="hidden sm:grid grid-cols-[2rem_minmax(10rem,14rem)_1fr_7rem_6rem] items-center gap-3 px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>#</span>
              <span>Lembaga</span>
              <span>Komposisi petani dinilai</span>
              <span className="text-right">Rerata</span>
              <span className="text-right">Cakupan</span>
            </div>
            {withData.map((r, i) => {
              const dim = hover !== null && hover !== r.id;
              const cat = r.avgScore == null ? null : bmpAssessmentCategory(r.avgScore);
              const coverage = r.totalFarmers > 0 ? (r.assessedFarmers / r.totalFarmers) * 100 : 0;
              const active = selectedGroupId === r.id;
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-1 sm:grid-cols-[2rem_minmax(10rem,14rem)_1fr_7rem_6rem] items-center gap-1 sm:gap-3 rounded-md px-1 py-1.5 transition-colors ${active ? "bg-primary/5" : "hover:bg-muted/40"}`}
                  style={{ opacity: dim ? 0.5 : 1 }}
                  onMouseEnter={() => setHover(r.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <span className="hidden sm:block text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                  <button type="button" className="truncate text-left text-sm font-medium text-primary hover:underline" onClick={() => onSelectGroup(active ? null : r.id)} title={active ? "Lepas fokus" : `Fokus ke ${r.name}`}>
                    {r.name}
                  </button>
                  <div className="relative">
                    <div className="flex h-5 w-full gap-0.5 overflow-hidden rounded-md">
                      {BMP_MONEV_STACK_ORDER.map((c) => {
                        const n = r.byCategory[c.key];
                        if (n <= 0) return null;
                        const w = (n / r.assessedFarmers) * 100;
                        return (
                          <div key={c.key} className="flex items-center justify-center text-[10px] font-medium text-white tabular-nums" style={{ width: `${w}%`, backgroundColor: c.color }} title={`${c.label}: ${formatNumber(n)} (${formatPct(w)}%)`}>
                            {w >= 9 ? formatNumber(n) : null}
                          </div>
                        );
                      })}
                    </div>
                    {hover === r.id && (
                      <div className="pointer-events-none absolute left-0 top-6 z-10 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md">
                        <div className="font-semibold mb-1">{r.name}</div>
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
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">{r.avgScore == null ? "—" : formatScore(r.avgScore)}</span>
                    {cat && <BmpCategoryBadge category={cat} className="text-[10px] px-1.5" />}
                  </div>
                  <div className="text-right text-xs tabular-nums text-muted-foreground" title={`${formatNumber(r.assessedFarmers)} dari ${formatNumber(r.totalFarmers)} petani aktif dinilai`}>
                    {formatNumber(r.assessedFarmers)}/{formatNumber(r.totalFarmers)} · {formatPct(coverage)}%
                  </div>
                </div>
              );
            })}
            <p className="pt-2 text-[11px] text-muted-foreground">
              Lebar segmen = proporsi petani dinilai per kategori; rerata pada skala 0–3; cakupan = dinilai ÷ petani aktif.
              {empty > 0 && ` ${formatNumber(empty)} Lembaga lain belum dinilai (lihat tabel rekap di bawah).`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
