"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { HeatCell, HeatLegend } from "@/components/shared/score-visuals";
import { scoreBand } from "@/lib/data-availability-aggregation";
import { MODULE_CATALOG, MODULE_DOMAIN_LABELS } from "@/lib/data-completeness-registry";
import { BAND_BAR, BAND_LABEL } from "@/lib/score-band-styles";
import { cn } from "@/lib/utils";
import type { AvailabilityModuleCoverage, AvailabilityModuleSummary } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";
import type { MatrixRowsView, ModuleSortKey } from "./matrix-rows";
import { emptyRowsMessage, MatrixLimitToggle } from "./matrix-toolbar";

/**
 * Matriks Lembaga × modul (#352 A1/B3) — informatif, di luar Index; sel bergaris
 * = modul belum dimulai di Lembaga itu. #417 B: isi kartu saja (toolbar bersama
 * milik pemanggil, tanpa header `Collapsible`), urutan dari URL (`?urut=modul:<key>`),
 * cari & Ringkas berlaku seperti radar/heatmap. Tetap scroll horizontal dengan
 * kolom nama lengket (15 modul tak muat satu layar).
 */
export function AvailabilityModuleMatrix({
  rows,
  totals,
  sortKey,
  sortAsc,
  onSortChange,
}: {
  rows: MatrixRowsView;
  totals: AvailabilityModuleSummary[];
  sortKey: ModuleSortKey;
  sortAsc: boolean;
  onSortChange: (key: ModuleSortKey, asc: boolean) => void;
}) {
  const { sorted, limited, query, canLimit, showAll, hiddenCount, onToggleShowAll } = rows;
  const totalsByKey = useMemo(() => new Map(totals.map((t) => [t.key, t])), [totals]);
  const toggleSort = (key: ModuleSortKey) => onSortChange(key, key === sortKey ? !sortAsc : true);

  const headBtn = (key: ModuleSortKey, label: string, title?: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      title={title}
      aria-label={`Urutkan menurut ${title ?? label}${sortKey === key ? (sortAsc ? " (menaik)" : " (menurun)") : ""}`}
      className={cn("inline-flex items-center gap-1 transition-colors hover:text-foreground", sortKey === key && "text-foreground")}
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === key ? "text-primary" : "opacity-40")} />
    </button>
  );

  return (
    <div className="p-4">
      {sorted.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">{emptyRowsMessage(query)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-[2px] text-sm">
            <thead>
              <tr className="text-xs font-semibold text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card py-2 pr-4 text-left font-semibold">{headBtn("name", "Lembaga Petani")}</th>
                {MODULE_CATALOG.map((m) => (
                  <th key={m.key} className="whitespace-nowrap px-1 py-2 text-center align-bottom font-semibold">
                    <span className="block text-[10px] font-normal text-muted-foreground/70">{MODULE_DOMAIN_LABELS[m.domain]}</span>
                    {headBtn(m.key, m.short, m.label)}
                  </th>
                ))}
              </tr>
              {/* Baris portfolio: Σ atas Lembaga yang modulnya berlaku. */}
              <tr className="text-xs">
                <th className="sticky left-0 z-10 bg-card py-1 pr-4 text-left font-semibold text-muted-foreground">Semua Lembaga (pilihan filter)</th>
                {MODULE_CATALOG.map((m) => {
                  const t = totalsByKey.get(m.key);
                  return (
                    <th key={m.key} className="p-0 font-semibold">
                      <ModuleCell cell={t ? { key: m.key, covered: t.covered, total: t.total, pct: t.pct } : null} label={m.label} groupName={t ? `${formatNumber(t.groupsApplicable)} Lembaga berlaku` : "—"} bold />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {limited.map((e) => (
                <tr key={e.id} className="align-middle">
                  <td className="sticky left-0 z-10 bg-card py-0 pr-4">
                    <div className="flex h-7 min-w-0 items-center gap-2 whitespace-nowrap">
                      <Link href={`/admin/data-analyst/data-completeness?lembaga=${e.id}`} className="min-w-0 truncate font-medium leading-tight hover:text-primary hover:underline" title={e.name}>
                        {e.name}
                      </Link>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {e.code ? `${e.code} · ` : ""}
                        {e.districtName}
                      </span>
                    </div>
                  </td>
                  {MODULE_CATALOG.map((m) => (
                    <td key={m.key} className="p-0">
                      <ModuleCell cell={e.moduleCoverage.find((x) => x.key === m.key) ?? null} label={m.label} groupName={e.name} yesNo={m.grain === "lembaga"} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <HeatLegend label="Skala cakupan">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-4 rounded-sm border border-dashed bg-muted/40" />
            belum dimulai di Lembaga itu
          </span>
        </HeatLegend>
        {canLimit && <MatrixLimitToggle showAll={showAll} onToggle={onToggleShowAll} hiddenCount={hiddenCount} unit="baris" />}
      </div>
    </div>
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
            <div className="flex h-7 w-full items-center justify-center rounded-[3px] border border-dashed bg-muted/40 text-xs text-muted-foreground" />
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
      <TooltipTrigger render={<HeatCell score={cell.pct} emphasis={bold} />}>
        {yesNo ? (cell.covered ? "✓" : "✗") : formatNumber(Math.round(cell.pct))}
      </TooltipTrigger>
      <StatTooltipContent title={label} subtitle={groupName} footer={`Tingkat skor: ${BAND_LABEL[band]}`}>
        <StatTooltipRow chip={BAND_BAR[band]} label="Terisi" value={`${formatNumber(cell.covered)} / ${formatNumber(cell.total)}`} pct={cell.pct} />
      </StatTooltipContent>
    </Tooltip>
  );
}
