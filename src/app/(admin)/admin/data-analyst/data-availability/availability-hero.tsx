"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { ScoreGauge } from "@/components/shared/score-visuals";
import { cn } from "@/lib/utils";
import { scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_BAR, BAND_TEXT, BAND_LABEL } from "@/lib/score-band-styles";
import type { AvailabilityBandDistribution, AvailabilityScoreBand, AvailabilityTotals } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";

const BAND_ORDER: AvailabilityScoreBand[] = ["bad", "warn", "good", "full"];

/** Nama pendek tingkat skor untuk label di dalam segmen (BAND_LABEL lengkap tetap di tooltip & aria). */
export const BAND_SHORT: Record<AvailabilityScoreBand, string> = {
  bad: "kritis",
  warn: "perhatian",
  good: "baik",
  full: "lengkap",
};

/**
 * Hero DA-03 satu baris (#417 A, keputusan K1): cincin Skor Keseluruhan ·
 * label tingkat skor · satu kalimat angka ringkas · bar distribusi Lembaga per
 * tingkat skor selebar sisa baris. Segmen = tombol filter dengan label jumlah
 * di dalamnya dan `aria-label` (T4). "Aksi lintas Lembaga" pindah ke Daftar
 * Kerja (T2: satu informasi satu tempat); pelepasan filter lewat baris
 * filter aktif (T3).
 */
export function AvailabilityHero({
  totals,
  distribution,
  activeBand,
  onBandChange,
}: {
  totals: AvailabilityTotals;
  distribution: AvailabilityBandDistribution;
  activeBand: AvailabilityScoreBand | null;
  onBandChange: (band: AvailabilityScoreBand | null) => void;
}) {
  const total = totals.totalGroups;
  const overallBand = scoreBand(totals.overallScore);

  // Irisan kosong (filter basi) bukan skor 0 — tampilkan keadaan kosong, bukan cincin merah.
  if (total === 0) {
    return (
      <Card className="border border-dashed border-border/60">
        <CardContent className="flex min-h-[96px] flex-col items-center justify-center gap-1 py-6 text-center">
          <p className="text-sm font-medium">Tidak ada Lembaga Petani pada pilihan filter ini.</p>
          <p className="text-xs text-muted-foreground">Klik Reset semua di atas — atau cakupan akses Anda memang belum memuat Lembaga.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex shrink-0 items-center gap-4">
          <Tooltip>
            <TooltipTrigger render={<div className="cursor-help" />}>
              <ScoreGauge score={totals.overallScore} size={88} label="Skor" />
            </TooltipTrigger>
            <StatTooltipContent title="Skor Keseluruhan" subtitle="Rata-rata tertimbang jumlah petani, lalu berbobot 5 domain">
              <StatTooltipRow chip={BAND_BAR[overallBand]} label="Skor" value={`${formatNumber(totals.overallScore)} / 100`} />
              <StatTooltipRow chip="bg-amber-400" label="Temuan anomali" value={totals.totalAnomalies} />
            </StatTooltipContent>
          </Tooltip>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">Skor Keseluruhan</div>
            <div className={cn("text-lg font-bold leading-tight", BAND_TEXT[overallBand])}>{BAND_LABEL[overallBand]}</div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{formatNumber(totals.totalGroups)}</span> Lembaga ·{" "}
              <span className="font-semibold text-foreground tabular-nums">{formatNumber(totals.totalFarmers)}</span> petani ·{" "}
              <span className="font-semibold text-foreground tabular-nums">{formatNumber(totals.totalParcels)}</span> lahan
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Sebaran Lembaga per tingkat skor — klik segmen untuk menyaring</div>
          <div className="flex h-8 w-full gap-0.5 overflow-hidden rounded-md bg-muted">
            {BAND_ORDER.map((b) => {
              const n = distribution[b];
              if (n === 0) return null;
              const active = activeBand === b;
              const pct = (n / total) * 100;
              const label = `${formatNumber(n)} Lembaga ${BAND_LABEL[b]}`;
              return (
                <Tooltip key={b}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => onBandChange(active ? null : b)}
                        aria-pressed={active}
                        aria-label={`${label} — ${active ? "klik untuk melepas filter" : "klik untuk menyaring"}`}
                        data-band={b}
                        className={cn(
                          "flex min-w-[28px] items-center justify-center gap-1 overflow-hidden whitespace-nowrap px-1 text-xs font-semibold text-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          BAND_BAR[b],
                          activeBand && !active && "opacity-30",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    }
                  >
                    <span className="tabular-nums">{formatNumber(n)}</span>
                    {/* Nama tingkat hanya bila segmennya cukup lebar — angka selalu tampil. */}
                    {pct >= 18 && <span className="font-normal opacity-90">{BAND_SHORT[b]}</span>}
                  </TooltipTrigger>
                  <StatTooltipContent title={BAND_LABEL[b]} footer={active ? "Klik lagi untuk melepas filter" : "Klik untuk menyaring matriks & Daftar Kerja"}>
                    <StatTooltipRow chip={BAND_BAR[b]} label="Lembaga" value={n} pct={pct} />
                  </StatTooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
