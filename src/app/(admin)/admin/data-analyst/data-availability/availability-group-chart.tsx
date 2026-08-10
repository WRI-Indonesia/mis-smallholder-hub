import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { availabilityScoreRows, scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_BAR, BAND_LEGEND } from "./score-band-styles";
import type { AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";

/**
 * Bar horizontal skor kelengkapan per Lembaga, terburuk dulu — daftar kerja
 * "Lembaga mana yang datanya paling perlu dikejar". Skala bar 0–100 sehingga
 * panjangnya bisa dibandingkan langsung antar-Lembaga.
 */
export function AvailabilityGroupChart({ groups }: { groups: AvailabilityGroupEntry[] }) {
  const rows = availabilityScoreRows(groups);

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Skor Kelengkapan per Lembaga Petani
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Skor berbobot lintas 5 domain, urut terendah dulu.
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        {rows.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            Tidak ada Lembaga Petani pada filter ini.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {rows.map((e) => {
              const band = scoreBand(e.healthScore);
              return (
                <div key={e.id}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-medium">
                      {e.name}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {e.districtName} · {formatNumber(e.totalFarmers)} petani
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold shrink-0">
                      {formatNumber(e.healthScore)}
                    </span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger render={<div className="mt-1 h-2.5 w-full rounded-full bg-muted" />}>
                      <div
                        className={`h-full rounded-full ${BAND_BAR[band]}`}
                        style={{ width: `${Math.min(100, Math.max(0, e.healthScore))}%` }}
                      />
                    </TooltipTrigger>
                    <StatTooltipContent
                      title={e.name}
                      subtitle={`${e.districtName} · ${formatNumber(e.totalFarmers)} petani`}
                    >
                      <StatTooltipRow
                        chip={BAND_BAR[band]}
                        label="Skor kelengkapan"
                        value={`${formatNumber(e.healthScore)}/100`}
                      />
                      <StatTooltipRow
                        chip="bg-amber-400"
                        label="Anomali terdeteksi"
                        value={e.totalAnomalies}
                      />
                    </StatTooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
          {BAND_LEGEND.map((s) => (
            <span key={s.band} className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-5 rounded-full ${BAND_BAR[s.band]}`} />
              {s.label}
            </span>
          ))}
          <Link
            href="/admin/data-analyst/data-completeness"
            className="ml-auto font-medium text-primary hover:underline"
          >
            Analisa detail per Lembaga →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
