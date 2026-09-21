"use client";

import Link from "next/link";
import { Building2, Users, Map, Columns3, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { ScoreGauge } from "@/components/shared/score-visuals";
import { cn } from "@/lib/utils";
import { scoreBand, topSystemicAnomalies } from "@/lib/data-availability-aggregation";
import { anomalyDef } from "@/lib/data-completeness-registry";
import { BAND_BAR, BAND_LEGEND, BAND_TEXT } from "@/lib/score-band-styles";
import type { AvailabilityBandDistribution, AvailabilityGroupEntry, AvailabilityScoreBand, AvailabilityTotals } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";

const BAND_ORDER: AvailabilityScoreBand[] = ["bad", "warn", "good", "full"];

/**
 * Hero DA-03 (#352 putaran 3): cincin Skor Keseluruhan · distribusi Lembaga
 * per band (segmen bisa diklik → filter matriks) · 3 angka ringkas · "Aksi
 * lintas Lembaga" (kolom sistemik terbesar + menu pengisiannya). Menjawab
 * "seberapa sehat portfolio, berapa yang kritis, dan apa yang harus
 * dikerjakan lintas Lembaga" tanpa membaca matriks.
 */
export function AvailabilityHero({
  totals,
  distribution,
  groups,
  activeBand,
  onBandChange,
}: {
  totals: AvailabilityTotals;
  distribution: AvailabilityBandDistribution;
  groups: AvailabilityGroupEntry[];
  activeBand: AvailabilityScoreBand | null;
  onBandChange: (band: AvailabilityScoreBand | null) => void;
}) {
  const total = totals.totalGroups;
  const overallBand = scoreBand(totals.overallScore);
  const bandLabel = (b: AvailabilityScoreBand) => BAND_LEGEND.find((l) => l.band === b)?.label ?? b;
  const actions = topSystemicAnomalies(groups, 3);

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="pt-6">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr_minmax(280px,1fr)]">
          {/* Cincin skor */}
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger render={<div className="cursor-help" />}>
                <ScoreGauge score={totals.overallScore} size={140} label="Skor" />
              </TooltipTrigger>
              <StatTooltipContent title="Skor Keseluruhan" subtitle="Rata-rata tertimbang jumlah petani, lalu berbobot 5 domain">
                <StatTooltipRow chip={BAND_BAR[overallBand]} label="Skor" value={`${formatNumber(totals.overallScore)} / 100`} />
                <StatTooltipRow chip="bg-amber-400" label="Temuan anomali" value={totals.totalAnomalies} />
              </StatTooltipContent>
            </Tooltip>
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skor Keseluruhan</div>
              <div className={cn("text-sm font-semibold", BAND_TEXT[overallBand])}>{bandLabel(overallBand)}</div>
              <div className="text-xs text-muted-foreground">
                {formatNumber(total)} Lembaga · {formatNumber(totals.totalAnomalies)} temuan
              </div>
            </div>
          </div>

          {/* Distribusi band + angka ringkas */}
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">Distribusi Lembaga per band</span>
                {activeBand && (
                  <button type="button" onClick={() => onBandChange(null)} className="text-primary hover:underline">
                    hapus filter band
                  </button>
                )}
              </div>
              <div className="flex h-5 w-full overflow-hidden rounded-md bg-muted">
                {BAND_ORDER.map((b) => {
                  const n = distribution[b];
                  if (n === 0) return null;
                  const active = activeBand === b;
                  return (
                    <Tooltip key={b}>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            onClick={() => onBandChange(active ? null : b)}
                            className={cn(
                              "flex items-center justify-center text-[11px] font-semibold text-white transition-opacity",
                              BAND_BAR[b],
                              activeBand && !active && "opacity-30",
                            )}
                            style={{ width: `${(n / total) * 100}%` }}
                            aria-pressed={active}
                          />
                        }
                      >
                        {n}
                      </TooltipTrigger>
                      <StatTooltipContent title={bandLabel(b)} footer={active ? "Klik lagi untuk melepas filter" : "Klik untuk menyaring matriks"}>
                        <StatTooltipRow chip={BAND_BAR[b]} label="Lembaga" value={n} pct={total > 0 ? (n / total) * 100 : 0} />
                      </StatTooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {BAND_ORDER.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => onBandChange(activeBand === b ? null : b)}
                    className={cn("inline-flex items-center gap-1.5 rounded px-1 hover:bg-muted", activeBand === b && "bg-muted font-semibold text-foreground")}
                  >
                    <span className={cn("inline-block h-2.5 w-2.5 rounded-full", BAND_BAR[b])} />
                    {bandLabel(b)} · <span className="tabular-nums">{distribution[b]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Building2, label: "Lembaga", value: totals.totalGroups },
                { icon: Users, label: "Petani", value: totals.totalFarmers },
                { icon: Map, label: "Persil", value: totals.totalParcels },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <s.icon className="h-3.5 w-3.5" /> {s.label}
                  </div>
                  <div className="text-lg font-bold tabular-nums">{formatNumber(s.value)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Aksi lintas Lembaga */}
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Columns3 className="h-3.5 w-3.5" /> Aksi lintas Lembaga
            </div>
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada kolom yang kosong sistemik pada irisan ini.</p>
            ) : (
              <ol className="space-y-2">
                {actions.map((a, i) => {
                  const fix = anomalyDef(a.key).fix;
                  return (
                    <li key={a.key} className="flex gap-2 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-500/15 text-[11px] font-bold">{i + 1}</span>
                      <div className="min-w-0">
                        <div className="font-medium leading-snug">{a.label}</div>
                        <div className="text-xs text-muted-foreground">
                          <span className="tabular-nums">{formatNumber(a.count)}</span> entitas · {formatNumber(a.groupsAffected)} Lembaga ·{" "}
                          {fix.href ? (
                            <Link href={fix.href} className="text-primary hover:underline">
                              {fix.field ? `${fix.menu} › ${fix.field}` : fix.menu}
                            </Link>
                          ) : (
                            fix.menu
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Kolom yang belum pernah diisi (≥ 95 % kosong) — urusan unggah massal, bukan perbaikan satu per satu.{" "}
              <span className="inline-flex items-center gap-0.5">
                Rincian di panel Anomali <ArrowRight className="h-3 w-3" />
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
