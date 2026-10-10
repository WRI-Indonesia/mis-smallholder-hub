"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OFFTAKER_TYPE_LABEL } from "@/lib/supply-chain-flow";
import { DEPENDENCY_THRESHOLD, type GroupVolumeRow } from "@/lib/supply-chain-insights";
import { fmtTon } from "./supply-chain-sankey";
import { CollapsibleCard } from "./collapsible-card";
import { SortHead, sortRows, type SortState } from "./sort-head";
import { pctOf } from "./supply-chain-filter-chips";
import { fmtKm } from "./supply-chain-mill-table";
import { UlBadge } from "./ul-badge";

const ROWS_COLLAPSED = 10;

export type GroupSortKey = "NAME" | "DISTRICT" | "TON" | "UL" | "PASTI" | "OFFTAKER" | "MILL" | "KM";
export const groupDefaultDir = (k: GroupSortKey) => (k === "NAME" || k === "DISTRICT" ? "asc" : "desc");
/** ID elemen kartu — tujuan gulir dari kartu Sorotan. */
export const GROUP_TABLE_ID = "sc-lembaga";

const share = (part: number, total: number) => (total > 0 ? part / total : 0);

/**
 * Tabel Volume per Lembaga (owner 2026-10-10) — padanan hulu tabel Mill:
 * Lembaga mana yang datanya lemah (PKS tak pasti), bergantung pada satu
 * offtaker (≥ 80%), atau jauh dari Mill-nya. Urutan dikendalikan dari luar
 * agar kartu Sorotan bisa membuka tabel ini terurut menurut temuannya.
 */
export function SupplyChainGroupTable({
  rows,
  sort,
  onToggleSort,
  selectedCode,
  onSelect,
  mapHref,
}: {
  rows: GroupVolumeRow[];
  sort: SortState<GroupSortKey>;
  onToggleSort: (key: GroupSortKey) => void;
  selectedCode: string | null;
  onSelect: (row: GroupVolumeRow) => void;
  mapHref: (code: string) => string;
}) {
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(
    () =>
      sortRows(rows, sort, (r, key) =>
        key === "NAME" ? r.abrv
        : key === "DISTRICT" ? r.district
        : key === "TON" ? r.ton
        : key === "UL" ? share(r.ulTon, r.ton)
        : key === "PASTI" ? share(r.pastiTon, r.ton)
        : key === "OFFTAKER" ? (r.mainOfftaker ? share(r.mainOfftaker.ton, r.ton) : null)
        : key === "MILL" ? (r.mainMill ? share(r.mainMill.ton, r.ton) : null)
        : r.avgKm,
      ),
    [rows, sort],
  );
  const max = Math.max(1, ...rows.map((r) => r.ton));
  const visible = showAll ? sorted : sorted.slice(0, ROWS_COLLAPSED);
  const thresholdPct = Math.round(DEPENDENCY_THRESHOLD * 100);

  return (
    <div id={GROUP_TABLE_ID} className="scroll-mt-4">
      <CollapsibleCard
        id="lembaga"
        title="Volume per Lembaga"
        contentClassName="overflow-x-auto"
        aside={
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-primary" /> porsi ke UL
            </span>
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> ≥ {thresholdPct}% lewat satu offtaker luar
            </span>
          </div>
        }
      >
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <SortHead sortKey="NAME" sort={sort} onToggle={onToggleSort} label="Lembaga" />
              <SortHead sortKey="DISTRICT" sort={sort} onToggle={onToggleSort} label="Distrik" />
              <SortHead sortKey="TON" sort={sort} onToggle={onToggleSort} label="Tonase" className="w-[22%]" />
              <SortHead sortKey="UL" sort={sort} onToggle={onToggleSort} label="ke UL" className="text-right" title="Porsi tonase Lembaga yang ke Mill pemasok UL" />
              <SortHead sortKey="PASTI" sort={sort} onToggle={onToggleSort} label="PKS pasti" className="text-right" title="Porsi tonase yang PKS-nya pasti (disebut di survei atau dipetakan dari nama PT)" />
              <SortHead sortKey="OFFTAKER" sort={sort} onToggle={onToggleSort} label="Offtaker utama" title="Offtaker pertama dengan tonase terbesar dan porsinya" />
              <SortHead sortKey="MILL" sort={sort} onToggle={onToggleSort} label="Mill utama" title="Mill dengan tonase terbesar dan porsinya" />
              <SortHead sortKey="KM" sort={sort} onToggle={onToggleSort} label="Jarak" className="text-right" title="Rata-rata garis lurus Lembaga → offtaker → Mill, tertimbang tonase (bukan jarak tempuh jalan)" />
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {visible.map((g) => {
              const selected = selectedCode === g.code;
              const offShare = g.mainOfftaker ? share(g.mainOfftaker.ton, g.ton) : 0;
              const dependent = g.mainOfftaker != null && !g.mainOfftaker.isSelf && offShare >= DEPENDENCY_THRESHOLD;
              return (
                <tr
                  key={g.code}
                  className={cn("group cursor-pointer border-b last:border-0 hover:bg-muted/50", selected && "bg-primary/10 hover:bg-primary/15")}
                  aria-selected={selected}
                  title={`${g.name}. ${selected ? "Lembaga ini sedang difilter." : "Klik untuk memfilter Lembaga ini."}`}
                  onClick={() => onSelect(g)}
                >
                  <td className="py-1.5 pr-3">
                    <span className={cn("font-medium group-hover:text-primary", selected && "text-primary")}>{g.abrv}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{g.code}</span>
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-muted-foreground">{g.district}</td>
                  <td className="py-1.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${(g.ulTon / max) * 100}%` }} />
                        <div className="h-full bg-foreground/35" style={{ width: `${(Math.max(g.ton - g.ulTon, 0) / max) * 100}%` }} />
                      </div>
                      <span className="w-20 text-right tabular-nums">{fmtTon(g.ton)}</span>
                    </div>
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{pctOf(g.ulTon, g.ton)}</td>
                  <td className={cn("py-1.5 pr-3 text-right tabular-nums", share(g.pastiTon, g.ton) < 0.5 ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground")}>
                    {pctOf(g.pastiTon, g.ton)}
                  </td>
                  <td className="max-w-[220px] py-1.5 pr-3">
                    {g.mainOfftaker ? (
                      <span className="inline-flex max-w-full items-center gap-1.5" title={`${g.mainOfftaker.name} · ${OFFTAKER_TYPE_LABEL[g.mainOfftaker.type]}${g.mainOfftaker.isSelf ? " (koperasi Lembaga sendiri)" : ""} · ${fmtTon(g.mainOfftaker.ton)}`}>
                        {dependent && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-label={`≥ ${thresholdPct}% lewat satu offtaker`} />}
                        <span className="truncate">{g.mainOfftaker.name}</span>
                        <span className={cn("shrink-0 tabular-nums text-xs", dependent ? "font-semibold text-amber-700 dark:text-amber-500" : "text-muted-foreground")}>{pctOf(g.mainOfftaker.ton, g.ton)}</span>
                      </span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">langsung ke Mill</span>
                    )}
                  </td>
                  <td className="max-w-[240px] py-1.5 pr-3">
                    {g.mainMill ? (
                      <span className="inline-flex max-w-full items-center gap-1.5" title={`${g.mainMill.name} · ${fmtTon(g.mainMill.ton)}`}>
                        <span className={cn("truncate", g.mainMill.millId == null && "italic text-muted-foreground")}>{g.mainMill.name}</span>
                        {g.mainMill.isUl && <UlBadge />}
                        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{pctOf(g.mainMill.ton, g.ton)}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{fmtKm(g.avgKm)}</td>
                  <td className="py-1.5 text-right">
                    <Link
                      href={mapHref(g.code)}
                      onClick={(e) => e.stopPropagation()}
                      title="Lihat Lembaga ini di Peta Rantai Pasok"
                      aria-label={`Lihat ${g.abrv} di peta`}
                      className="inline-flex rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <MapIcon className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > ROWS_COLLAPSED && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((v) => !v)}>
            {showAll ? `Tampilkan ${ROWS_COLLAPSED} teratas` : `Tampilkan semua (${rows.length} Lembaga)`}
          </Button>
        )}
      </CollapsibleCard>
    </div>
  );
}
