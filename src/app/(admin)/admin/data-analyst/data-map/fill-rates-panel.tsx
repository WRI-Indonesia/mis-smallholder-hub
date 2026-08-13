"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { EntityFill } from "@/types/data-map";
import type { RoadmapPhase } from "@/types/roadmap";

/**
 * Tab Keterisian (DA-07, #256): berapa baris tiap entitas punya, dan kolom mana
 * yang ternyata tidak pernah diisi. Panjang batang yang membawa besaran —
 * warnanya tetap satu, karena ini magnitudo, bukan kategori.
 *
 * Yang dihitung NULL, bukan "kosong": string "" atau "-" tetap terhitung terisi.
 * Kualitas isi per Lembaga ada di Analisa Ketersediaan Data (DA-02/DA-03).
 */

const pctLabel = (pct: number | null) => (pct === null ? "—" : `${pct.toFixed(pct < 10 && pct > 0 ? 1 : 0)}%`);

function FieldRow({ name, pct, filled, rows, isRequired }: {
  name: string;
  pct: number | null;
  filled: number;
  rows: number;
  isRequired: boolean;
}) {
  const empty = rows > 0 && filled === 0;
  return (
    <div className="grid grid-cols-[minmax(120px,1fr)_100px_minmax(90px,140px)] items-center gap-3 py-1 text-xs">
      <span className="truncate">
        <span className={cn("font-mono", empty && "text-amber-700 dark:text-amber-400")}>{name}</span>
        {isRequired && <span className="ml-1.5 text-[10px] text-muted-foreground">wajib</span>}
      </span>
      <span className="flex items-center gap-2 tabular-nums">
        <span className={cn("w-9 text-right", empty && "text-amber-700 dark:text-amber-400")}>{pctLabel(pct)}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span className="block h-full rounded-full bg-primary" style={{ width: `${pct ?? 0}%` }} />
        </span>
      </span>
      <span className="text-right text-muted-foreground tabular-nums">
        {formatNumber(filled)} / {formatNumber(rows)}
      </span>
    </div>
  );
}

export function FillRatesPanel({ fills, planned }: { fills: EntityFill[]; planned: RoadmapPhase[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const totalRows = fills.reduce((sum, f) => sum + f.rows, 0);
  const emptyColumns = fills.flatMap((f) =>
    f.fields.filter((x) => f.rows > 0 && x.filled === 0).map((x) => `${f.entity}.${x.field}`)
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Total baris aktif</p>
          <p className="mt-0.5 text-lg font-medium tabular-nums">{formatNumber(totalRows)}</p>
          <p className="text-xs text-muted-foreground">{fills.length} entitas</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Entitas masih kosong</p>
          <p className="mt-0.5 text-lg font-medium tabular-nums">{fills.filter((f) => f.rows === 0).length}</p>
          <p className="text-xs text-muted-foreground">tabel ada, isinya belum</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Kolom tak pernah terisi</p>
          <p className="mt-0.5 text-lg font-medium tabular-nums">{emptyColumns.length}</p>
          <p className="text-xs text-muted-foreground">ada di skema, 0 baris mengisinya</p>
        </div>
      </div>

      {emptyColumns.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="text-xs font-medium">Kolom yang ada di skema tapi tidak pernah diisi</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Kandidat untuk ditinjau: entah memang belum dipakai, entah alur pengisiannya terlewat.
          </p>
          <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            {emptyColumns.join(" · ")}
          </p>
        </div>
      )}

      <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
        {fills.map((fill) => (
          <Collapsible
            key={fill.entity}
            open={open === fill.entity}
            onOpenChange={(next) => setOpen(next ? fill.entity : null)}
          >
            <CollapsibleTrigger
              render={
                <button className="w-full px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{fill.entity}</span>
                    <span className="text-xs text-muted-foreground">{fill.domain}</span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {formatNumber(fill.rows)} baris · {fill.fields.length} kolom
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        open === fill.entity && "rotate-180"
                      )}
                    />
                  </span>
                </button>
              }
            />
            <CollapsibleContent>
              <div className="border-t border-border/40 bg-muted/20 px-3 py-2">
                {fill.rows === 0 ? (
                  <p className="py-1 text-xs text-muted-foreground">
                    Belum ada baris aktif — keterisian kolom tidak bisa dihitung.
                  </p>
                ) : (
                  fill.fields.map((field) => (
                    <FieldRow key={field.field} name={field.field} pct={field.pct} filled={field.filled} rows={fill.rows} isRequired={field.isRequired} />
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {planned.length > 0 && (
        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-sm font-medium">Belum ada di sistem</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Modul data yang direncanakan tapi belum punya tabel — sumber: tabel Phase Status pada
            docs/project/roadmap.md, stream MD.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {planned.map((phase) => (
              <Badge key={phase.key} variant="outline" className="font-normal">
                <span className="mr-1.5 font-medium">{phase.key}</span>
                {phase.description}
                <span className="ml-1.5 text-muted-foreground">· {phase.horizon}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
