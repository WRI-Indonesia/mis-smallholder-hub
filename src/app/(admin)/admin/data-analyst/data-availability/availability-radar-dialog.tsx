"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardList, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { HeatCell } from "@/components/shared/score-visuals";
import { cn } from "@/lib/utils";
import { AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS, domainScoreOf } from "@/lib/data-availability-aggregation";
import { DOMAIN_WEIGHTS } from "@/lib/data-completeness";
import { BAND_TEXT } from "@/lib/score-band-styles";
import { scoreBand } from "@/lib/data-availability-aggregation";
import type { AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";
import { bandLabel, CATEGORY_LABELS, DOMAIN_ICONS, formatScore, entryDomainScores } from "./domain-meta";
import { RadarChart } from "@/components/shared/radar-chart";

const formatPts = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

/**
 * Modal radar besar (#352 putaran 4, permintaan owner "kalau diklik tampil
 * modal agar grafiknya lebih besar — kiri radar, kanan info/tabel"). Kanan:
 * tabel domain (bobot · skor · kontribusi = bobot × skor, jadi Skor Total
 * terbaca sebagai jumlahnya dan poin yang hilang terlihat per domain) +
 * tautan daftar kerja & Detail Lembaga. Footer: ◀ ▶ mengikuti urutan aktif
 * grid (juga tombol panah kiri/kanan) supaya bisa "membalik" radar besar
 * satu per satu tanpa menutup modal.
 */
export function RadarDetailDialog({
  entries,
  index,
  onIndexChange,
  onClose,
}: {
  /** Daftar pada urutan aktif (setelah cari & urut). */
  entries: AvailabilityGroupEntry[];
  /** Indeks Lembaga yang terbuka; null = tertutup. */
  index: number | null;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const entry = index != null ? entries[index] : undefined;
  const hasPrev = index != null && index > 0;
  const hasNext = index != null && index < entries.length - 1;
  const go = (delta: number) => {
    if (index == null) return;
    const next = index + delta;
    if (next >= 0 && next < entries.length) onIndexChange(next);
  };

  return (
    <Dialog open={entry != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-4xl"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-3 pr-8 text-base">
                <span className="min-w-0 truncate">{entry.name}</span>
                <HeatCell score={entry.healthScore} emphasis className="h-7 w-14 text-base">
                  {formatNumber(entry.healthScore)}
                </HeatCell>
                <span className={cn("text-xs font-semibold", BAND_TEXT[scoreBand(entry.healthScore)])}>{bandLabel(entry.healthScore)}</span>
              </DialogTitle>
              <DialogDescription>
                {entry.code ? `${entry.code} · ` : ""}
                {entry.districtName} · {CATEGORY_LABELS[entry.category]} · {formatNumber(entry.totalFarmers)} petani · {formatNumber(entry.totalParcels)} persil ·{" "}
                {formatNumber(entry.totalAnomalies)} temuan
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-[1.15fr_1fr] md:items-center">
              {/* Kiri: radar besar */}
              <div className="rounded-xl border bg-muted/20 p-3">
                <RadarChart name={entry.name} total={entry.healthScore} scores={entryDomainScores(entry)} large />
              </div>

              {/* Kanan: tabel domain + tautan */}
              <div className="space-y-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-1.5 text-left font-semibold">Domain</th>
                      <th className="py-1.5 text-right font-semibold">Bobot</th>
                      <th className="py-1.5 pl-3 text-center font-semibold">Skor</th>
                      <th className="py-1.5 pl-3 text-right font-semibold" title="Bobot × skor — bagian yang membentuk Skor Total">
                        Kontribusi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {AVAILABILITY_DOMAIN_KEYS.map((key) => {
                      const score = domainScoreOf(entry, key);
                      const weight = DOMAIN_WEIGHTS[key] * 100;
                      const Icon = DOMAIN_ICONS[key];
                      return (
                        <tr key={key} className="border-t border-border/60">
                          <td className="py-1.5">
                            <span className="inline-flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {AVAILABILITY_DOMAIN_LABELS[key]}
                            </span>
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-muted-foreground">{Math.round(weight)} %</td>
                          <td className="py-1.5 pl-3">
                            <HeatCell score={score} className="h-6 w-16 text-xs">
                              {formatScore(score)}
                            </HeatCell>
                          </td>
                          <td className="py-1.5 pl-3 text-right tabular-nums">
                            <span className="font-semibold">{formatPts((weight * score) / 100)}</span>
                            <span className="text-muted-foreground"> / {Math.round(weight)}</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="py-1.5" colSpan={3}>
                        Skor Total
                      </td>
                      <td className="py-1.5 pl-3 text-right tabular-nums">
                        {formatNumber(entry.healthScore)}
                        <span className="font-normal text-muted-foreground"> / 100</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground">
                  Kontribusi = bobot × skor domain; selisihnya terhadap bobot adalah poin yang masih bisa direbut di domain itu.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/data-analyst/data-completeness?lembaga=${entry.id}`} className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
                    <ClipboardList className="h-4 w-4" /> Buka daftar kerja
                  </Link>
                  <Link href={`/admin/master-data/groups/${entry.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                    <Building2 className="h-4 w-4" /> Detail Lembaga
                  </Link>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-row items-center justify-between sm:justify-between">
              <span className="text-xs text-muted-foreground">
                {formatNumber((index ?? 0) + 1)} / {formatNumber(entries.length)} pada urutan aktif · tombol ← → untuk berpindah
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={!hasPrev} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </Button>
                <Button variant="outline" size="sm" onClick={() => go(1)} disabled={!hasNext} className="gap-1">
                  Berikutnya <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
