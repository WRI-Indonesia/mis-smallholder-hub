"use client";

import { ArrowDownWideNarrow } from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { BandBar } from "@/components/shared/score-visuals";
import { cn } from "@/lib/utils";
import { BAND_THRESHOLDS, AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS, domainCriticalCount, scoreBand } from "@/lib/data-availability-aggregation";
import { DOMAIN_WEIGHTS } from "@/lib/data-completeness";
import { BAND_BAR, BAND_TEXT } from "@/lib/score-band-styles";
import type { AvailabilityDomainKey, AvailabilityGroupEntry, AvailabilityTotals } from "@/types/dashboard";
import { formatNumber, formatPct } from "@/lib/format";
import { DOMAIN_ICONS } from "./domain-meta";

const DOMAIN_META: Record<AvailabilityDomainKey, { count: (t: AvailabilityTotals) => string; basis: string }> = {
  profil: { count: (t) => `${formatNumber(t.totalGroups)} Lembaga`, basis: "rata-rata sederhana per Lembaga" },
  petani: { count: (t) => `${formatNumber(t.totalFarmers)} petani`, basis: "tertimbang jumlah petani" },
  lahan: { count: (t) => `${formatNumber(t.totalParcels)} persil`, basis: "tertimbang jumlah petani" },
  pelatihan: { count: (t) => `${formatNumber(t.totalActivities)} sesi`, basis: "tertimbang jumlah petani" },
  produksi: { count: (t) => `${formatNumber(t.farmersWithProduction)} / ${formatNumber(t.totalFarmers)} petani ber-produksi`, basis: "tertimbang jumlah petani" },
};

/**
 * Kartu domain DA-03 (#352 putaran 3): SKOR yang memimpin (besar, warna band)
 * + bar mini + bobot Index, jumlah entitas jadi sub-teks, "n Lembaga kritis";
 * klik kartu → matriks tersortir menaik pada domain itu (kartu aktif disorot).
 */
export function AvailabilityDomainCards({
  totals,
  groups,
  activeSort,
  onSelect,
}: {
  totals: AvailabilityTotals;
  groups: AvailabilityGroupEntry[];
  activeSort: AvailabilityDomainKey | null;
  onSelect: (key: AvailabilityDomainKey) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {AVAILABILITY_DOMAIN_KEYS.map((key) => {
        const meta = DOMAIN_META[key];
        const score = totals.domainScores[key];
        const band = scoreBand(score);
        const critical = domainCriticalCount(groups, key);
        const Icon = DOMAIN_ICONS[key];
        const active = activeSort === key;
        return (
          <Tooltip key={key}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => onSelect(key)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50",
                    active && "border-primary ring-1 ring-primary/40",
                  )}
                />
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-4 w-4" /> {AVAILABILITY_DOMAIN_LABELS[key]}
                </span>
                <span className="text-[10px] text-muted-foreground">{Math.round(DOMAIN_WEIGHTS[key] * 100)} %</span>
              </div>
              <div className={cn("mt-2 text-3xl font-bold tabular-nums leading-none", BAND_TEXT[band])}>
                {formatPct(score)}
                <span className="text-base font-semibold">%</span>
              </div>
              <BandBar pct={score} className="mt-2 h-1.5" />
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">{meta.count(totals)}</span>
                {critical > 0 ? (
                  <span className="shrink-0 font-semibold text-rose-600 dark:text-rose-400" title="Lembaga berskor <50 pada domain ini (tanpa Lembaga tanpa petani)">
                    {critical} kritis
                  </span>
                ) : (
                  <span className="shrink-0">0 kritis</span>
                )}
              </div>
              {active && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                  <ArrowDownWideNarrow className="h-3 w-3" /> matriks diurut domain ini
                </div>
              )}
            </TooltipTrigger>
            <StatTooltipContent
              title={`${AVAILABILITY_DOMAIN_LABELS[key]} · bobot ${Math.round(DOMAIN_WEIGHTS[key] * 100)} % dari Skor Keseluruhan`}
              subtitle={`Skor portfolio ${meta.basis}`}
              footer="Klik untuk mengurutkan matriks pada domain ini"
            >
              <StatTooltipRow chip={BAND_BAR[band]} label="Skor domain" value={`${formatPct(score)}%`} />
              <StatTooltipRow chip="bg-rose-500" label={`Lembaga kritis (<${BAND_THRESHOLDS.warn})`} value={critical} />
            </StatTooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
