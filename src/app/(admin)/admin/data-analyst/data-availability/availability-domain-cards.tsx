"use client";

import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { BandBar } from "@/components/shared/score-visuals";
import { cn } from "@/lib/utils";
import { BAND_THRESHOLDS, AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS, domainCriticalCount, scoreBand, shortDomainLabel } from "@/lib/data-availability-aggregation";
import { DOMAIN_WEIGHTS } from "@/lib/data-completeness";
import { BAND_TEXT } from "@/lib/score-band-styles";
import type { AvailabilityDomainKey, AvailabilityGroupEntry, AvailabilityTotals } from "@/types/dashboard";
import { formatNumber, formatPct } from "@/lib/format";
import { DOMAIN_ICONS } from "./domain-meta";

const DOMAIN_COUNT: Record<AvailabilityDomainKey, (t: AvailabilityTotals) => string> = {
  profil: (t) => `${formatNumber(t.totalGroups)} Lembaga`,
  petani: (t) => `${formatNumber(t.totalFarmers)} petani`,
  lahan: (t) => `${formatNumber(t.totalParcels)} lahan`,
  pelatihan: (t) => `${formatNumber(t.totalActivities)} sesi`,
  produksi: (t) => `${formatNumber(t.farmersWithProduction)} / ${formatNumber(t.totalFarmers)} petani`,
};

/**
 * Kartu domain DA-03 (#417 A): label satu baris (ikon + nama pendek), bobot
 * sebagai chip, skor besar berwarna tingkat, bar, sub-teks jumlah · kritis.
 * Kartu bukan lagi tombol utuh (T4: satu tombol satu aksi) — chip "Urutkan"
 * yang selalu terlihat mengurutkan matriks pada domain ini dan berubah jadi
 * "Terurut ↑" saat aktif; klik lagi = kembali ke Skor Total.
 */
export function AvailabilityDomainCards({
  totals,
  groups,
  activeSort,
  activeSortAsc = true,
  onSelect,
}: {
  totals: AvailabilityTotals;
  groups: AvailabilityGroupEntry[];
  activeSort: AvailabilityDomainKey | null;
  /** Arah urut aktif — chip memperlihatkan ↑/↓ yang sebenarnya (review #417). */
  activeSortAsc?: boolean;
  onSelect: (key: AvailabilityDomainKey) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {AVAILABILITY_DOMAIN_KEYS.map((key) => {
        const score = totals.domainScores[key];
        const band = scoreBand(score);
        const critical = domainCriticalCount(groups, key);
        const Icon = DOMAIN_ICONS[key];
        const active = activeSort === key;
        const weight = Math.round(DOMAIN_WEIGHTS[key] * 100);
        return (
          <div
            key={key}
            className={cn("flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-colors", active && "border-primary ring-1 ring-primary/40")}
            title={`${AVAILABILITY_DOMAIN_LABELS[key]} · bobot ${weight} % dari Skor Keseluruhan`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{shortDomainLabel(key)}</span>
              </span>
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground" title={`Bobot ${weight} % dari Skor Keseluruhan`}>
                bobot {weight}%
              </span>
            </div>
            <div className={cn("mt-2 text-3xl font-bold tabular-nums leading-none", BAND_TEXT[band])}>
              {formatPct(score)}
              <span className="text-base font-semibold">%</span>
            </div>
            <BandBar pct={score} className="mt-2 h-1.5" />
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{DOMAIN_COUNT[key](totals)}</span>
              <span
                className={cn("shrink-0", critical > 0 && "font-semibold text-rose-600 dark:text-rose-400")}
                title={`Lembaga berskor <${BAND_THRESHOLDS.warn} pada domain ini (tanpa Lembaga tanpa petani)`}
              >
                {formatNumber(critical)} kritis
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={active}
              aria-label={
                active
                  ? `Matriks terurut menurut ${AVAILABILITY_DOMAIN_LABELS[key]}, ${activeSortAsc ? "terendah" : "tertinggi"} dulu — klik untuk kembali ke Skor Total`
                  : `Urutkan matriks menurut ${AVAILABILITY_DOMAIN_LABELS[key]}, terendah dulu`
              }
              className={cn(
                "mt-3 inline-flex items-center gap-1 self-start rounded-full border px-2 py-0.5 text-xs transition-colors",
                active ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {active ? activeSortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowDownUp className="h-3 w-3" />}
              {active ? "Terurut" : "Urutkan"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
