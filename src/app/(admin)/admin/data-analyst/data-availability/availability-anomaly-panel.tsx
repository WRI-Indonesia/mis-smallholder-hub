import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { topAnomalies } from "@/lib/data-availability-aggregation";
import type { AvailabilityGroupEntry } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

/** Top-10 tipe anomali terbanyak pada irisan yang tampil — prioritas pembersihan data. */
export function AvailabilityAnomalyPanel({ groups }: { groups: AvailabilityGroupEntry[] }) {
  const rows = topAnomalies(groups, 10);
  const max = rows.length > 0 ? rows[0].count : 0;

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Anomali Terbanyak
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Dijumlah lintas Lembaga pada irisan yang sedang tampil.
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        {rows.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            Tidak ada anomali pada filter ini. 🎉
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((a) => (
              <div key={a.key}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate">{a.label}</span>
                  <span className="tabular-nums font-semibold shrink-0">
                    {formatNumber(a.count)}
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger render={<div className="mt-1 h-2 w-full rounded-full bg-muted" />}>
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: max > 0 ? `${(a.count / max) * 100}%` : 0 }}
                    />
                  </TooltipTrigger>
                  <StatTooltipContent
                    title={a.label}
                    footer={`tersebar di ${formatNumber(a.groupsAffected)} Lembaga`}
                  >
                    <StatTooltipRow chip="bg-amber-400" label="Temuan" value={a.count} />
                  </StatTooltipContent>
                </Tooltip>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  di {formatNumber(a.groupsAffected)} Lembaga
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/admin/data-analyst/data-completeness"
          className="inline-block mt-4 text-xs font-medium text-primary hover:underline"
        >
          Buka Analisa Ketersediaan Data untuk daftar petaninya →
        </Link>
      </CardContent>
    </Card>
  );
}
