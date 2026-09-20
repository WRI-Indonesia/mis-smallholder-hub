import { TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { formatScore } from "@/lib/bmp-assessment";
import type { BmpMonevWeakIndicatorRow } from "@/lib/bmp-monev-dashboard-aggregation";

/**
 * Indikator individu berbobot dengan rerata terendah (#346) — daftar kerja
 * pendampingan. Rerata dihitung atas petani ber-skor; jumlah "tidak dinilai"
 * ditampilkan agar indikator yang jarang diisi tak tampak buruk karena kosong.
 */
export function BmpMonevWeakestIndicators({ rows, yearLabel }: { rows: BmpMonevWeakIndicatorRow[]; yearLabel: string }) {
  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-primary" /> Indikator Terlemah ({yearLabel})
        </CardTitle>
        <p className="text-xs text-muted-foreground">Lima indikator berbobot dengan rerata skor terendah (skala 0–3) pada filter aktif.</p>
      </CardHeader>
      <CardContent className="flex-1">
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-muted-foreground">Belum ada rincian indikator pada filter ini.</div>
        ) : (
          <ol className="space-y-2.5">
            {rows.map((r, i) => (
              <li key={r.indicatorId} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0">
                    <span className="text-muted-foreground tabular-nums">{i + 1}.</span> <span className="font-mono text-muted-foreground">{r.code}</span>{" "}
                    <span className="font-medium">{r.name}</span> <span className="text-muted-foreground">· {r.activityName} · bobot {r.weight}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <strong>{r.avg == null ? "—" : formatScore(r.avg)}</strong>
                    <span className="text-muted-foreground"> · {formatNumber(r.n)} petani{r.nullCount > 0 ? `, ${formatNumber(r.nullCount)} tak dinilai` : ""}</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(((r.avg ?? 0) / 3) * 100, 100)}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
