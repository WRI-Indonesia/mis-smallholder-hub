"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Rows3, ArrowUpDown, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { scoreBand } from "@/lib/data-availability-aggregation";
import { MODULE_CATALOG, MODULE_DOMAIN_LABELS } from "@/lib/data-completeness-registry";
import { BAND_BAR, BAND_CELL, BAND_LEGEND } from "@/lib/score-band-styles";
import type {
  AvailabilityGroupEntry,
  AvailabilityModuleCoverage,
  AvailabilityModuleSummary,
} from "@/types/dashboard";
import { formatNumber } from "@/lib/format";

const formatPct = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

type SortKey = "name" | string;

/**
 * Matriks Lembaga × modul (#352 A1/B3) — informatif, di luar Index. Band warna
 * sama dengan matriks kelengkapan; sel abu-abu bergaris = modul belum dimulai
 * di Lembaga itu (tidak berlaku, keluar dari penyebut portfolio).
 */
export function AvailabilityModuleMatrix({
  rows,
  totals,
}: {
  rows: AvailabilityGroupEntry[];
  totals: AvailabilityModuleSummary[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);
  const [open, setOpen] = useState(true);

  const totalsByKey = useMemo(() => new Map(totals.map((t) => [t.key, t])), [totals]);

  const sorted = useMemo(() => {
    const value = (e: AvailabilityGroupEntry): string | number => {
      if (sortKey === "name") return e.name.toLowerCase();
      const m = e.moduleCoverage.find((x) => x.key === sortKey);
      // Tidak berlaku diurutkan paling bawah (menaik) — bukan disamakan dengan 0 %.
      return m?.pct ?? -1;
    };
    return [...rows].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return asc ? cmp : -cmp;
    });
  }, [rows, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
  };

  const headBtn = (key: SortKey, label: string, title?: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      title={title}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === key ? "text-primary" : "opacity-40"}`} />
    </button>
  );

  return (
    <Card className="border border-border/60 shadow-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button type="button" className="flex w-full items-start justify-between gap-3 px-6 py-4 text-left">
              <span className="min-w-0">
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Rows3 className="h-4 w-4 text-primary" /> Matriks Cakupan Modul per Lembaga
                </span>
                <span className="block text-xs text-muted-foreground mt-1">
                  {open
                    ? "Informatif — tidak masuk Index. % entitas (persil/petani) yang sudah mengisi modul; tingkat Lembaga = ada/tidak. Sel bergaris = modul belum dimulai di Lembaga itu."
                    : `${formatNumber(rows.length)} Lembaga · ${MODULE_CATALOG.length} modul`}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 mt-0.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          }
        />
        <CollapsibleContent>
          <CardContent className="border-t pt-4">
            {sorted.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                Tidak ada Lembaga Petani pada filter ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-semibold sticky left-0 bg-background z-10">
                        {headBtn("name", "Lembaga Petani")}
                      </th>
                      {MODULE_CATALOG.map((m) => (
                        <th key={m.key} className="text-center py-2 px-1 font-semibold whitespace-nowrap align-bottom">
                          <span className="block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                            {MODULE_DOMAIN_LABELS[m.domain]}
                          </span>
                          {headBtn(m.key, m.short, m.label)}
                        </th>
                      ))}
                    </tr>
                    {/* Baris portfolio: Σ atas Lembaga yang modulnya berlaku. */}
                    <tr className="text-xs">
                      <th className="text-left py-1 pr-4 font-semibold sticky left-0 bg-background z-10 text-muted-foreground">
                        Semua Lembaga (irisan)
                      </th>
                      {MODULE_CATALOG.map((m) => {
                        const t = totalsByKey.get(m.key);
                        return (
                          <th key={m.key} className="py-1 px-1 font-semibold">
                            <ModuleCell
                              cell={t ? { key: m.key, covered: t.covered, total: t.total, pct: t.pct } : null}
                              label={m.label}
                              groupName={t ? `${formatNumber(t.groupsApplicable)} Lembaga berlaku` : "—"}
                              bold
                            />
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((e) => (
                      <tr key={e.id} className="align-middle">
                        <td className="py-1.5 pr-4 sticky left-0 bg-background z-10">
                          <Link
                            href={`/admin/data-analyst/data-completeness?lembaga=${e.id}`}
                            className="font-medium leading-tight hover:text-primary hover:underline"
                          >
                            {e.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {e.code ? `${e.code} · ` : ""}
                            {e.districtName}
                          </div>
                        </td>
                        {MODULE_CATALOG.map((m) => (
                          <td key={m.key} className="py-1.5 px-1">
                            <ModuleCell
                              cell={e.moduleCoverage.find((x) => x.key === m.key) ?? null}
                              label={m.label}
                              groupName={e.name}
                              yesNo={m.grain === "lembaga"}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
              <span className="font-medium">Band cakupan:</span>
              {BAND_LEGEND.map((s) => (
                <span key={s.band} className="inline-flex items-center gap-1.5">
                  <span className={`inline-block h-3 w-5 rounded ${BAND_CELL[s.band]}`} />
                  {s.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-5 rounded border border-dashed bg-muted/40" />
                belum dimulai di Lembaga itu
              </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ModuleCell({
  cell,
  label,
  groupName,
  bold,
  yesNo,
}: {
  cell: AvailabilityModuleCoverage | null;
  label: string;
  groupName: string;
  bold?: boolean;
  /** Modul tingkat Lembaga pada baris Lembaga: tampil ✓/✗, bukan persen. */
  yesNo?: boolean;
}) {
  if (!cell || cell.pct == null) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="w-full rounded-md border border-dashed bg-muted/40 px-2 py-1.5 text-center text-xs text-muted-foreground" />
          }
        >
          —
        </TooltipTrigger>
        <StatTooltipContent title={label} subtitle={groupName} footer="Belum dimulai — keluar dari penyebut">
          <StatTooltipRow chip="bg-muted-foreground/40" label="Terisi" value={cell ? `${cell.covered} / ${cell.total}` : "—"} />
        </StatTooltipContent>
      </Tooltip>
    );
  }
  const band = scoreBand(cell.pct);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={`w-full rounded-md px-2 py-1.5 text-center tabular-nums text-sm ${bold ? "font-bold" : "font-semibold"} ${BAND_CELL[band]}`}
          />
        }
      >
        {yesNo ? (cell.covered ? "✓" : "✗") : `${formatPct(cell.pct)}%`}
      </TooltipTrigger>
      <StatTooltipContent title={label} subtitle={groupName} footer={`Band: ${BAND_LEGEND.find((s) => s.band === band)?.label ?? ""}`}>
        <StatTooltipRow chip={BAND_BAR[band]} label="Terisi" value={`${formatNumber(cell.covered)} / ${formatNumber(cell.total)}`} pct={cell.pct} />
      </StatTooltipContent>
    </Tooltip>
  );
}
