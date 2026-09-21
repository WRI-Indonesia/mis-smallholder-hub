"use client";

import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BandBar } from "@/components/shared/score-visuals";
import { cn } from "@/lib/utils";
import { AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS, domainLaggards, scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_TEXT } from "@/lib/score-band-styles";
import type { AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";
import { DOMAIN_ICONS } from "./domain-meta";

/**
 * "Paling tertinggal per domain" (#352 putaran 3) — menggantikan bar chart skor
 * total yang menduplikasi kolom matriks. Lima kolom kecil, masing-masing 5
 * Lembaga terendah pada domain itu: langsung menjawab "untuk Produksi,
 * Lembaga mana yang didatangi dulu?". Lembaga tanpa petani dikeluarkan.
 */
export function AvailabilityDomainLaggards({ groups, n = 5 }: { groups: AvailabilityGroupEntry[]; n?: number }) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <ListOrdered className="h-4 w-4 text-primary" /> Paling tertinggal per domain
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Sampai {n} Lembaga berskor terendah (di bawah 100 %) tiap domain pada irisan yang tampil — daftar kunjungan per urusan. Lembaga tanpa
          petani tidak diikutkan.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {AVAILABILITY_DOMAIN_KEYS.map((key) => {
            // Lembaga yang sudah 100 % bukan "tertinggal" — disembunyikan agar daftar tidak berisi noise.
            const rows = domainLaggards(groups, key, n).filter((r) => r.score < 100);
            // "Semua 100 %" hanya bila memang ada Lembaga yang dinilai (profil: semua;
            // domain lain: yang berpetani) — irisan kosong/tereksklusi bukan prestasi.
            const eligible = key === "profil" ? groups.length : groups.filter((g) => g.totalFarmers > 0).length;
            const Icon = DOMAIN_ICONS[key];
            return (
              <div key={key} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" /> {AVAILABILITY_DOMAIN_LABELS[key]}
                </div>
                {rows.length === 0 ? (
                  eligible === 0 ? (
                    <p className="text-xs text-muted-foreground">{groups.length === 0 ? "Tidak ada Lembaga pada irisan ini." : "Belum ada Lembaga berpetani pada irisan ini."}</p>
                  ) : (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">Semua Lembaga sudah 100 %.</p>
                  )
                ) : (
                  <ol className="space-y-2.5">
                    {rows.map((r, i) => (
                      <li key={r.id} className="text-xs">
                        <div className="flex items-baseline justify-between gap-2">
                          <Link
                            href={`/admin/data-analyst/data-completeness?lembaga=${r.id}`}
                            className="min-w-0 truncate font-medium hover:text-primary hover:underline"
                            title={`${r.name} · ${r.districtName}`}
                          >
                            <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                            {r.name}
                          </Link>
                          <span className={cn("shrink-0 font-semibold tabular-nums", BAND_TEXT[scoreBand(r.score)])}>{Math.round(r.score)}%</span>
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {r.districtName} · {formatNumber(r.totalFarmers)} petani
                        </div>
                        <BandBar pct={r.score} className="mt-1 h-1.5" />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
