"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleDashed, CircleHelp, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fmtKm, fmtTon, pctOf } from "@/lib/supply-chain-format";
import { MILL_BASIS_LABEL, MILL_STATUS_LABEL, UNKNOWN_MILL_FILTER, type MillStatus, type MillVolumeRow } from "@/lib/supply-chain-flow";
import type { DistanceStat } from "@/lib/supply-chain-insights";
import { CollapsibleCard } from "./collapsible-card";
import { SortHead, sortRows, useTableSort } from "./sort-head";
import { UlBadge } from "./ul-badge";

const ROWS_COLLAPSED = 10;

export const STATUS_ICON: Record<MillStatus, { icon: typeof CircleCheck; className: string }> = {
  PKS_PASTI: { icon: CircleCheck, className: "text-emerald-600" },
  PKS_BELUM_PASTI: { icon: CircleDashed, className: "text-amber-600" },
  TIDAK_DIKETAHUI: { icon: CircleHelp, className: "text-muted-foreground" },
};

type SortKey = "NAME" | "DISTRICT" | "TON" | "GROUPS" | "OFFTAKERS" | "KM";
const defaultDir = (k: SortKey) => (k === "NAME" || k === "DISTRICT" ? "asc" : "desc");


/**
 * Tabel Volume per Mill (owner 2026-10-10: bisa diurut, baris Mill yang sedang
 * difilter ditandai, tautan ke Peta per baris, kolom jarak garis lurus).
 */
export function SupplyChainMillTable({
  rows,
  total,
  distances,
  selectedMillId,
  onSelect,
  mapHref,
}: {
  rows: MillVolumeRow[];
  total: number;
  distances: Map<string, DistanceStat>;
  /** ID Mill filter aktif (atau `UNKNOWN_MILL_FILTER`); null = tak ada. */
  selectedMillId: string | null;
  onSelect: (row: MillVolumeRow) => void;
  mapHref: (millId: string | null) => string;
}) {
  const [showAll, setShowAll] = useState(false);
  const { sort, toggle } = useTableSort<SortKey>({ key: "TON", dir: "desc" }, defaultDir);
  const km = (r: MillVolumeRow) => distances.get(r.millId ?? UNKNOWN_MILL_FILTER)?.avgKm ?? null;
  const sorted = useMemo(
    () =>
      sortRows(rows, sort, (r, key) =>
        key === "NAME" ? r.name : key === "DISTRICT" ? r.district : key === "TON" ? r.ton : key === "GROUPS" ? r.groupCount : key === "OFFTAKERS" ? r.offtakerCount : km(r),
      ),
    // `km` hanya membaca `distances`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, sort, distances],
  );
  const max = Math.max(1, ...rows.map((r) => r.ton));
  const visible = showAll ? sorted : sorted.slice(0, ROWS_COLLAPSED);
  const isSelected = (r: MillVolumeRow) => selectedMillId != null && (r.millId ?? UNKNOWN_MILL_FILTER) === selectedMillId;

  return (
    <CollapsibleCard
      id="mill"
      title="Volume per Mill"
      contentClassName="overflow-x-auto"
      aside={
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(Object.keys(STATUS_ICON) as MillStatus[]).filter((s) => rows.some((r) => r.status === s)).map((s) => {
            const { icon: Icon, className } = STATUS_ICON[s];
            return (
              <span key={s} className="inline-flex items-center gap-1">
                <Icon className={cn("h-3.5 w-3.5", className)} /> {MILL_STATUS_LABEL[s]}
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm bg-primary" /> porsi ke UL
          </span>
        </div>
      }
    >
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <SortHead sortKey="NAME" sort={sort} onToggle={toggle} label="Mill" />
            <SortHead sortKey="DISTRICT" sort={sort} onToggle={toggle} label="Distrik" />
            <SortHead sortKey="TON" sort={sort} onToggle={toggle} label="Tonase" className="w-[30%]" />
            <th className="py-2 pr-3 text-right font-medium">Porsi</th>
            <SortHead sortKey="GROUPS" sort={sort} onToggle={toggle} label="Lembaga" className="text-right" />
            <SortHead sortKey="OFFTAKERS" sort={sort} onToggle={toggle} label="Offtaker" className="text-right" />
            <SortHead sortKey="KM" sort={sort} onToggle={toggle} label="Jarak" className="text-right" title="Rata-rata garis lurus Lembaga → offtaker → Mill, tertimbang tonase (bukan jarak tempuh jalan)" />
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {visible.map((m) => {
            const { icon: Icon, className } = STATUS_ICON[m.status];
            const selected = isSelected(m);
            return (
              <tr
                key={m.millId ?? "?"}
                className={cn("group cursor-pointer border-b last:border-0 hover:bg-muted/50", selected && "bg-primary/10 hover:bg-primary/15")}
                aria-selected={selected}
                title={`${MILL_STATUS_LABEL[m.status]} — ${MILL_BASIS_LABEL[m.basis] ?? m.basis}. ${selected ? "Mill ini sedang difilter." : "Klik untuk memfilter Mill ini."}`}
                onClick={() => onSelect(m)}
              >
                <td className="py-1.5 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", className)} aria-label={MILL_STATUS_LABEL[m.status]} />
                    <span className={cn("font-medium group-hover:text-primary", selected && "text-primary")}>{m.name}</span>
                    {m.isUl && <UlBadge />}
                  </span>
                </td>
                <td className="whitespace-nowrap py-1.5 pr-3 text-muted-foreground">{m.district ?? "—"}</td>
                <td className="py-1.5 pr-3">
                  {m.ton > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${(m.ulTon / max) * 100}%` }} />
                        <div className="h-full bg-foreground/35" style={{ width: `${(Math.max(m.ton - m.ulTon, 0) / max) * 100}%` }} />
                      </div>
                      <span className="w-20 text-right tabular-nums">{fmtTon(m.ton)}</span>
                    </div>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">tonase belum tersedia</span>
                  )}
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{pctOf(m.ton, total)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{m.groupCount}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{m.offtakerCount}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{fmtKm(km(m))}</td>
                <td className="py-1.5 text-right">
                  <Link
                    href={mapHref(m.millId)}
                    onClick={(e) => e.stopPropagation()}
                    title="Lihat Mill ini di Peta Rantai Pasok"
                    aria-label={`Lihat ${m.name} di peta`}
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
          {showAll ? `Tampilkan ${ROWS_COLLAPSED} teratas` : `Tampilkan semua (${rows.length} Mill)`}
        </Button>
      )}
    </CollapsibleCard>
  );
}
