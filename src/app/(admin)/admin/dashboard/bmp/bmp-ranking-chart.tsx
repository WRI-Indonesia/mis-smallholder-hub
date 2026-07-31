import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BmpGroupRankingEntry } from "@/lib/bmp-dashboard-aggregation";
import { CATEGORY_COLORS, CategoryLegend } from "./bmp-category-panel";

const formatTon = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/**
 * Top-10 produktivitas per Lembaga Petani (#191) — bar horizontal, warna per
 * kategori (Ex-Plasma/Swadaya), hanya lembaga dengan luas terdata > 0.
 */
export function BmpRankingChart({
  entries,
  yearLabel,
}: {
  entries: BmpGroupRankingEntry[];
  yearLabel: string;
}) {
  const max = Math.max(1, ...entries.map((e) => e.produktivitasTonHa));

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Produktivitas per Lembaga — Top 10 (
            {yearLabel})
          </CardTitle>
          <CategoryLegend />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {entries.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            Belum ada lembaga dengan luas terdata.
          </div>
        ) : (
          <div className="space-y-2.5">
            {entries.map((e, i) => {
              const color =
                e.category === "EX_PLASMA" ? CATEGORY_COLORS.exPlasma : CATEGORY_COLORS.swadaya;
              return (
                <div key={e.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate">
                      <span className="text-muted-foreground tabular-nums">{i + 1}.</span>{" "}
                      <span className="font-medium">{e.name}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {formatTon(e.produktivitasTonHa)} Ton/Ha
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min((e.produktivitasTonHa / max) * 100, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-[11px] text-muted-foreground">
              Ton/Ha = Σ produksi ÷ Σ luas terdata lembaga ybs; warna mengikuti kategori
              (Ex-Plasma/Swadaya).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
