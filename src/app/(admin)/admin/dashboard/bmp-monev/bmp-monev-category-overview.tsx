import { Info, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent } from "@/components/shared/stat-tooltip";
import { formatNumber, formatPct } from "@/lib/format";
import { BMP_MONEV_STACK_ORDER, type BmpMonevTotals } from "@/lib/bmp-monev-dashboard-aggregation";

/**
 * Hero dashboard: jawaban utama Monev — berapa petani di tiap kategori.
 * Empat ubin (jumlah + % dari petani dinilai, urut terendah → tertinggi seperti
 * batang) di atas satu batang 100% seluruh petani dinilai. Warna dari konstanta
 * kategori; label selalu menyertai warna. Tiap ubin ber-tooltip arti kategori
 * (`description` konstanta, #360) — ikon Info penanda, ubin bisa difokus.
 */
export function BmpMonevCategoryOverview({ totals, yearLabel }: { totals: BmpMonevTotals; yearLabel: string }) {
  const total = totals.assessedFarmers;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" /> Sebaran Kategori Petani ({yearLabel})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {/* Tanpa entitas &gt;/&lt; di teks JSX: SWC membuang spasi setelah `{expr}` bila baris memuat entitas (terlihat "188petani"). */}
          Dari {formatNumber(total)} petani dinilai — kategori dihitung dari skor: Teladan {">"} 2,50 · Praktisi 1,50–2,50 · Perintis 1,00–1,49 · Belum Implementasi {"<"} 1,00.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {BMP_MONEV_STACK_ORDER.map((c) => {
            const n = totals.byCategory[c.key];
            return (
              <Tooltip key={c.key}>
                <TooltipTrigger
                  render={
                    <div
                      tabIndex={0}
                      className="rounded-lg border border-border/60 p-3 flex items-stretch gap-3 cursor-help focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                  }
                >
                  <span className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate flex items-center gap-1">
                      {c.label}
                      <Info className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                    </p>
                    <p className="text-2xl font-bold tabular-nums leading-tight mt-1">
                      {formatNumber(n)}
                      <span className="ml-1.5 text-sm font-medium text-muted-foreground">petani</span>
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {total > 0 ? `${formatPct(pct(n))}%` : "—"} · skor {c.range}
                    </p>
                  </div>
                </TooltipTrigger>
                <StatTooltipContent title={c.label} subtitle={`skor ${c.range}`}>
                  <p className="max-w-[16rem] whitespace-normal font-normal">{c.description}</p>
                </StatTooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {total > 0 && (
          <div>
            <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-md">
              {BMP_MONEV_STACK_ORDER.map((c) => {
                const n = totals.byCategory[c.key];
                if (n <= 0) return null;
                const w = pct(n);
                return (
                  <div
                    key={c.key}
                    className="flex items-center justify-center text-[11px] font-medium text-white tabular-nums"
                    style={{ width: `${w}%`, backgroundColor: c.color }}
                    title={`${c.label}: ${formatNumber(n)} (${formatPct(w)}%)`}
                  >
                    {w >= 7 ? `${formatPct(w)}%` : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
              <span>← belum menerapkan</span>
              <span>menerapkan BMP: {formatNumber(totals.adopters)} petani ({total > 0 ? `${formatPct(pct(totals.adopters))}%` : "—"}) →</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
