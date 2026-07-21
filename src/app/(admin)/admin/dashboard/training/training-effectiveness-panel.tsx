"use client";

import { ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRAINING_PACKAGE_LABELS } from "@/lib/training-dashboard-aggregation";
import type { TrainingScoreRow } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatDecimal = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

export function TrainingEffectivenessPanel({ rows }: { rows: TrainingScoreRow[] }) {
  const scoredRows = rows.filter((r) => r.scored > 0);
  // Skala bar dibuat relatif terhadap skor tertinggi yang muncul, bukan diasumsikan 100.
  const maxScore = Math.max(1, ...scoredRows.flatMap((r) => [r.avgPre, r.avgPost]));

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Efektivitas Pre / Post-Test
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Hanya peserta dengan skor pre <em>dan</em> post terisi yang dihitung.
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        {scoredRows.length === 0 ? (
          <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-muted-foreground">
            Belum ada peserta dengan skor pre &amp; post terisi.
          </div>
        ) : (
          <div className="space-y-4">
            {scoredRows.map((r) => (
              <div key={r.packageCode}>
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium leading-tight">
                    {TRAINING_PACKAGE_LABELS[r.packageCode]}
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums shrink-0 ${
                      r.gain > 0
                        ? "text-emerald-600"
                        : r.gain < 0
                          ? "text-rose-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {r.gain >= 0 ? "+" : "−"}
                    {formatDecimal(Math.abs(r.gain))}
                  </span>
                </div>

                <div className="space-y-1">
                  {(
                    [
                      { label: "Pre", value: r.avgPre, cls: "bg-slate-400" },
                      { label: "Post", value: r.avgPost, cls: "bg-emerald-500" },
                    ] as const
                  ).map((bar) => (
                    <div key={bar.label} className="flex items-center gap-2">
                      <span className="w-9 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {bar.label}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bar.cls}`}
                          style={{ width: `${(bar.value / maxScore) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums font-medium">
                        {formatDecimal(bar.value)}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {formatNumber(r.scored)} dari {formatNumber(r.attendance)} kehadiran ber-skor
                  {r.declined > 0 || r.unchanged > 0 ? " · " : ""}
                  {r.declined > 0 && (
                    // Skor post di bawah pre praktis selalu salah input — ditandai supaya
                    // bisa ditelusuri, bukan dibaca sebagai hasil belajar yang menurun.
                    <span className="text-rose-600 font-medium">
                      {formatNumber(r.declined)} turun
                    </span>
                  )}
                  {r.declined > 0 && r.unchanged > 0 ? " · " : ""}
                  {r.unchanged > 0 && <span>{formatNumber(r.unchanged)} tetap</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
