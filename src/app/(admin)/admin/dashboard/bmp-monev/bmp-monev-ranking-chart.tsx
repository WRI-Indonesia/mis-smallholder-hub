import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { BMP_SCORE_MAX, bmpAssessmentCategory, formatScore } from "@/lib/bmp-assessment";
import type { BmpMonevGroupRow } from "@/lib/bmp-monev-dashboard-aggregation";
import { BmpCategoryBadge } from "@/components/shared/bmp-category-badge";

/**
 * Ranking rerata skor per Lembaga (pola Top-10 BMP #191). Batang satu hue
 * (skala 0–3 tetap, bukan relatif ke maksimum) supaya jarak ke Teladan
 * terbaca; kategori rerata ditandai badge di kanan, bukan warna batang —
 * warna mengikuti kategori, bukan peringkat.
 */
export function BmpMonevRankingChart({ rows, yearLabel, limit = 10 }: { rows: BmpMonevGroupRow[]; yearLabel: string; limit?: number }) {
  const entries = rows.filter((r) => r.avgScore != null).slice(0, limit);

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Rerata Skor per Lembaga — Top {limit} ({yearLabel})
        </CardTitle>
        <p className="text-xs text-muted-foreground">Batang = rerata skor pada skala tetap 0–3; badge = kategori rerata itu.</p>
      </CardHeader>
      <CardContent className="flex-1">
        {entries.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            Belum ada Lembaga dengan penilaian.
          </div>
        ) : (
          <div className="space-y-2.5">
            {entries.map((r, i) => {
              const avg = r.avgScore!;
              const cat = bmpAssessmentCategory(avg);
              return (
                <div key={r.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate">
                      <span className="text-muted-foreground tabular-nums">{i + 1}.</span> <span className="font-medium">{r.name}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="tabular-nums text-muted-foreground">
                        {formatScore(avg)} · {formatNumber(r.assessedFarmers)} petani
                      </span>
                      <BmpCategoryBadge category={cat} className="text-[10px] px-1.5" />
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted" title={`${r.name}: ${formatScore(avg)}`}>
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min((avg / BMP_SCORE_MAX) * 100, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
