"use client";

import Link from "next/link";
import { Building2, Users, Map, Columns3, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { ScoreGauge } from "@/components/shared/score-visuals";
import { cn } from "@/lib/utils";
import { scoreBand, topSystemicAnomalies } from "@/lib/data-availability-aggregation";
import { anomalyDef, SYSTEMIC_THRESHOLD } from "@/lib/data-completeness-registry";
import { BAND_BAR, BAND_TEXT, BAND_LABEL } from "@/lib/score-band-styles";
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
  actionGroups,
  activeBand,
  onBandChange,
}: {
  totals: AvailabilityTotals;
  distribution: AvailabilityBandDistribution;
  /** Irisan untuk "Aksi lintas Lembaga" — sama dengan panel Anomali (sudah termasuk filter band). */
  actionGroups: AvailabilityGroupEntry[];
  activeBand: AvailabilityScoreBand | null;
  onBandChange: (band: AvailabilityScoreBand | null) => void;
}) {
  const total = totals.totalGroups;
  const overallBand = scoreBand(totals.overallScore);
  const actions = topSystemicAnomalies(actionGroups, 3);

  // Irisan kosong (filter basi) bukan skor 0 — tampilkan keadaan kosong, bukan cincin merah.
  if (total === 0) {
    return (
      <Card className="border border-dashed border-border/60">
        <CardContent className="flex min-h-[140px] flex-col items-center justify-center gap-1 py-8 text-center">
          <p className="text-sm font-medium">Tidak ada Lembaga Petani pada filter ini.</p>
          <p className="text-xs text-muted-foreground">Kembalikan Kategori / Distrik / Lembaga ke &quot;Semua&quot; — atau cakupan akses Anda memang belum memuat Lembaga.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="pt-6">
        {/* Dua kolom seimbang (masukan owner): kiri = cincin + label + angka ringkas
            di satu baris, distribusi band selebar kolom di bawahnya (justify-between
            agar dasarnya sejajar); kanan = aksi lintas Lembaga setinggi kolom kiri. */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          <div className="flex flex-col justify-between gap-6 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-5">
              <Tooltip>
                <TooltipTrigger render={<div className="cursor-help" />}>
                  <ScoreGauge score={totals.overallScore} size={120} label="Skor" />
                </TooltipTrigger>
                <StatTooltipContent title="Skor Keseluruhan" subtitle="Rata-rata tertimbang jumlah petani, lalu berbobot 5 domain">
                  <StatTooltipRow chip={BAND_BAR[overallBand]} label="Skor" value={`${formatNumber(totals.overallScore)} / 100`} />
                  <StatTooltipRow chip="bg-amber-400" label="Temuan anomali" value={totals.totalAnomalies} />
                </StatTooltipContent>
              </Tooltip>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skor Keseluruhan</div>
                <div className={cn("mt-0.5 text-lg font-bold leading-tight", BAND_TEXT[overallBand])}>{BAND_LABEL[overallBand]}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  rata-rata tertimbang {formatNumber(total)} Lembaga · {formatNumber(totals.totalAnomalies)} temuan
                </div>
              </div>
              <div className="ml-auto grid grid-cols-3 gap-2">
                {[
                  { icon: Building2, label: "Lembaga", value: totals.totalGroups },
                  { icon: Users, label: "Petani", value: totals.totalFarmers },
                  { icon: Map, label: "Persil", value: totals.totalParcels },
                ].map((s) => (
                  <div key={s.label} className="min-w-[96px] rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <s.icon className="h-3.5 w-3.5" /> {s.label}
                    </div>
                    <div className="text-lg font-bold tabular-nums leading-tight">{formatNumber(s.value)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">Distribusi Lembaga per band</span>
                {activeBand && (
                  <button type="button" onClick={() => onBandChange(null)} className="text-primary hover:underline">
                    hapus filter band
                  </button>
                )}
              </div>
              <div className="flex h-6 w-full overflow-hidden rounded-md bg-muted">
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
                      <StatTooltipContent title={BAND_LABEL[b]} footer={active ? "Klik lagi untuk melepas filter" : "Klik untuk menyaring matriks"}>
                        <StatTooltipRow chip={BAND_BAR[b]} label="Lembaga" value={n} pct={total > 0 ? (n / total) * 100 : 0} />
                      </StatTooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                {BAND_ORDER.map((b) => {
                  const empty = distribution[b] === 0;
                  const active = activeBand === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      disabled={empty}
                      onClick={() => onBandChange(active ? null : b)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-muted-foreground transition-colors",
                        empty ? "cursor-default opacity-40" : "hover:bg-muted",
                        active && "border-foreground/30 bg-muted font-semibold text-foreground",
                      )}
                      aria-pressed={active}
                    >
                      <span className={cn("inline-block h-2 w-2 rounded-full", BAND_BAR[b])} />
                      {BAND_LABEL[b]}
                      <span className="tabular-nums font-semibold text-foreground">{distribution[b]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Aksi lintas Lembaga — setinggi kolom kiri */}
          <div className="flex flex-col rounded-lg border bg-muted/20 p-4 lg:col-span-5">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Columns3 className="h-3.5 w-3.5" /> Aksi lintas Lembaga
            </div>
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada kolom yang kosong sistemik pada irisan ini.</p>
            ) : (
              <ol className="flex-1 space-y-2.5">
                {actions.map((a, i) => {
                  const fix = anomalyDef(a.key).fix;
                  // Satu menu tujuan saja di baris (alternatif & kolom lengkap di tooltip) — agar tiap aksi cukup dua baris.
                  const primaryMenu = fix.menu.split(" · ")[0];
                  const fullRoute = fix.field ? `${fix.menu} › ${fix.field}` : fix.menu;
                  return (
                    <li key={a.key} className="flex gap-2.5 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-500/15 text-[11px] font-bold">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0 truncate font-medium leading-snug" title={a.label}>
                            {a.label}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatNumber(a.count)} · {formatNumber(a.groupsAffected)} Lembaga
                          </span>
                        </div>
                        <div className="truncate text-xs text-muted-foreground" title={fullRoute}>
                          {fix.href ? (
                            <Link href={fix.href} className="text-primary hover:underline">
                              {primaryMenu}
                              {fix.field ? ` › ${fix.field}` : ""}
                            </Link>
                          ) : (
                            primaryMenu
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="mt-3 flex items-center gap-1 border-t pt-2 text-[11px] text-muted-foreground">
              <span className="truncate">
                Kolom ≥ {Math.round(SYSTEMIC_THRESHOLD * 100)} % kosong — urusan unggah massal, bukan perbaikan satu per satu.
                {activeBand && " Mengikuti filter band."}
              </span>
              <span className="ml-auto inline-flex shrink-0 items-center gap-0.5">
                Panel Anomali <ArrowRight className="h-3 w-3" />
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
