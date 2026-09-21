import Link from "next/link";
import { AlertTriangle, Columns3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { topAnomalies, topSystemicAnomalies } from "@/lib/data-availability-aggregation";
import { anomalyDef } from "@/lib/data-completeness-registry";
import type { AvailabilityAnomalySummary, AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";

const MAX_TOOLTIP_GROUPS = 6;

/** Deep link ke DA-02 pada Lembaga terdampak terbanyak; tooltip menyebut daftarnya (#352 B3). */
function AnomalyRow({ a, max, unit, chip }: { a: AvailabilityAnomalySummary; max: number; unit: string; chip: string }) {
  const top = a.groups[0];
  const rest = a.groups.length - MAX_TOOLTIP_GROUPS;
  const fix = anomalyDef(a.key).fix;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <Link
          href={`/admin/data-analyst/data-completeness?lembaga=${top.id}`}
          className="truncate hover:text-primary hover:underline"
          title={`Buka ${top.name} — Lembaga terdampak terbanyak`}
        >
          {a.label}
        </Link>
        <span className="tabular-nums font-semibold shrink-0">{formatNumber(a.count)}</span>
      </div>
      <Tooltip>
        <TooltipTrigger render={<div className="mt-1 h-2 w-full rounded-full bg-muted" />}>
          <div className={`h-full rounded-full ${chip}`} style={{ width: max > 0 ? `${(a.count / max) * 100}%` : 0 }} />
        </TooltipTrigger>
        <StatTooltipContent
          title={a.label}
          subtitle={fix.field ? `${fix.menu} › ${fix.field}` : fix.menu}
          footer={`${formatNumber(a.groupsAffected)} Lembaga · klik label untuk membuka ${top.name}`}
        >
          <StatTooltipRow chip={chip} label={unit} value={a.count} />
          {a.groups.slice(0, MAX_TOOLTIP_GROUPS).map((g) => (
            <StatTooltipRow key={g.id} chip="bg-transparent" label={g.name} value={g.count} />
          ))}
          {rest > 0 && <StatTooltipRow chip="bg-transparent" label={`… ${rest} Lembaga lain`} value="" />}
        </StatTooltipContent>
      </Tooltip>
      <div className="text-[11px] text-muted-foreground mt-0.5">di {formatNumber(a.groupsAffected)} Lembaga</div>
    </div>
  );
}

/**
 * Anomali terbanyak pada irisan yang tampil — dibagi dua (#352 A3): PER ENTITAS
 * (bisa dikejar per petani/persil) vs KOLOM BELUM PERNAH DIISI (sistemik:
 * ≥ 95 % entitas kosong di Lembaga itu — alur pengisiannya yang belum ada).
 */
export function AvailabilityAnomalyPanel({ groups }: { groups: AvailabilityGroupEntry[] }) {
  const perEntity = topAnomalies(groups, 8);
  const systemic = topSystemicAnomalies(groups, 8);
  const maxEntity = perEntity.length > 0 ? perEntity[0].count : 0;
  const maxSystemic = systemic.length > 0 ? systemic[0].count : 0;

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Anomali Terbanyak
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Dijumlah lintas Lembaga pada irisan yang sedang tampil. Klik label → Lembaga terdampak terbanyak.
        </p>
      </CardHeader>
      <CardContent>
        {/* Dua seksi berdampingan (penuh-lebar) — bukan satu kolom tinggi. */}
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Per entitas — bisa dikejar per petani/persil</h4>
            {perEntity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada anomali per entitas pada filter ini. 🎉</p>
            ) : (
              <div className="space-y-2.5">
                {perEntity.map((a) => (
                  <AnomalyRow key={a.key} a={a} max={maxEntity} unit="Temuan" chip="bg-amber-400" />
                ))}
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Columns3 className="h-3.5 w-3.5" /> Kolom belum pernah diisi — sistemik (≥ 95 % kosong)
            </h4>
            {systemic.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada kolom yang kosong sistemik pada filter ini.</p>
            ) : (
              <div className="space-y-2.5">
                {systemic.map((a) => (
                  <AnomalyRow key={a.key} a={a} max={maxSystemic} unit="Entitas kosong" chip="bg-slate-400" />
                ))}
              </div>
            )}
          </section>
        </div>

        <Link
          href="/admin/data-analyst/data-completeness"
          className="mt-4 inline-block text-xs font-medium text-primary hover:underline"
        >
          Buka Ketersediaan Data — Per Lembaga untuk daftar petaninya →
        </Link>
      </CardContent>
    </Card>
  );
}
