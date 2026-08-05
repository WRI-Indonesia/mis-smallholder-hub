"use client";

import { Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TRAINING_PACKAGE_LABELS,
  TRAINING_PASS_SCORE,
} from "@/lib/training-dashboard-aggregation";
import type { TrainingScoreRow } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatDecimal = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

/**
 * Kelulusan post-test per paket (#214): petani unik ber-skor dengan post ≥
 * TRAINING_PASS_SCORE (lulus) vs di bawahnya — pelengkap panel Efektivitas
 * yang hanya menampilkan rata-rata. Basis petani (bukan kehadiran) mengikuti
 * indikator impact "# of smallholders demonstrating knowledge …".
 */
export function TrainingPassPanel({ rows }: { rows: TrainingScoreRow[] }) {
  const scoredRows = rows.filter((r) => r.scoredFarmers > 0);

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" /> Kelulusan Post-Test per Paket
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Petani unik ber-skor — lulus bila salah satu post-test-nya ≥ {TRAINING_PASS_SCORE}.
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        {scoredRows.length === 0 ? (
          <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-muted-foreground">
            Belum ada peserta dengan skor pre &amp; post terisi.
          </div>
        ) : (
          <div className="space-y-4">
            {scoredRows.map((r) => {
              const failed = r.scoredFarmers - r.passedFarmers;
              const passPct = (r.passedFarmers / r.scoredFarmers) * 100;
              return (
                <div key={r.packageCode}>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium leading-tight">
                      {TRAINING_PACKAGE_LABELS[r.packageCode]}
                    </span>
                    <span className="text-sm font-bold tabular-nums shrink-0">
                      {formatDecimal(Math.round(passPct * 10) / 10)}%
                    </span>
                  </div>

                  <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                    {r.passedFarmers > 0 && (
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${passPct}%` }}
                      />
                    )}
                    {failed > 0 && (
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${100 - passPct}%` }}
                      />
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    <span className="font-medium text-emerald-600">
                      {formatNumber(r.passedFarmers)} lulus
                    </span>{" "}
                    ·{" "}
                    <span className={failed > 0 ? "font-medium text-amber-600" : undefined}>
                      {formatNumber(failed)} belum lulus
                    </span>{" "}
                    · dari {formatNumber(r.scoredFarmers)} petani ber-skor
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
