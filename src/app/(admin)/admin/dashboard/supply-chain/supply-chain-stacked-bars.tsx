"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORICAL } from "@/lib/chart-palette";
import { formatPct } from "@/lib/format";
import type { SankeyGraph, SankeyNode } from "@/lib/supply-chain-flow";
import { buildOriginDestMatrix, matrixKey } from "@/lib/supply-chain-views";
import { fmtTon } from "@/lib/supply-chain-format";
import { isFilterableNode, isGroupNode, useChartDark, type SankeyUnit } from "./supply-chain-sankey";
import { UlBadge } from "./ul-badge";

const ROWS_COLLAPSED = 15;

/**
 * Tab Batang bertumpuk: satu batang per asal (Distrik/Lembaga), segmen = tujuan
 * (UL/Non-UL atau Mill) dengan warna tetap per tujuan; panjang batang = tonase
 * (Angka Ton) atau 100% (Angka %). Mudah dibaca berurutan; klik nama asal atau
 * segmen = filter.
 */
export function SupplyChainStackedBars({ graph, unit, onSelectNode }: { graph: SankeyGraph; unit: SankeyUnit; onSelectNode: (n: SankeyNode) => void }) {
  const dark = useChartDark();
  const [showAll, setShowAll] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const m = useMemo(() => buildOriginDestMatrix(graph), [graph]);
  if (!m.rows.length) return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;
  const colColor = (j: number, id: string) => (id === "M:?" ? (dark ? "#475569" : "#94a3b8") : CATEGORICAL[j % CATEGORICAL.length][dark ? "dark" : "light"]);
  const maxRow = Math.max(1, ...m.rows.map((r) => m.rowTotal.get(r.id) ?? 0));
  const rows = showAll ? m.rows : m.rows.slice(0, ROWS_COLLAPSED);
  const clickable = (n: SankeyNode) => isFilterableNode(n) || isGroupNode(n);

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legenda tujuan">
        {m.cols.map((c, j) => (
          <li key={c.id} className={cn("flex items-center gap-1.5", hover && hover !== c.id && "opacity-50")} onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)}>
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colColor(j, c.id) }} />
            {clickable(c) ? (
              <button type="button" className="hover:underline" onClick={() => onSelectNode(c)} title={`Filter: ${c.label}`}>{c.label}</button>
            ) : (
              <span>{c.label}</span>
            )}
            {c.isUl && c.id.startsWith("M:") && <UlBadge />}
            <span className="text-muted-foreground tabular-nums">{unit === "PCT" ? `${formatPct(((m.colTotal.get(c.id) ?? 0) / m.total) * 100)}%` : fmtTon(m.colTotal.get(c.id) ?? 0)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const total = m.rowTotal.get(r.id) ?? 0;
          const width = unit === "PCT" ? 100 : (total / maxRow) * 100;
          return (
            <div key={r.id} className="grid grid-cols-[minmax(120px,220px)_minmax(0,1fr)_84px] items-center gap-3 text-sm">
              <div className="truncate text-xs">
                {clickable(r) ? (
                  <button type="button" className="truncate font-medium hover:underline" title={isGroupNode(r) ? "Rinci per offtaker" : `Filter: ${r.label}`} onClick={() => onSelectNode(r)}>{r.label}</button>
                ) : (
                  <span className="font-medium">{r.label}</span>
                )}
                {r.sub ? <span className="ml-1 text-muted-foreground">{r.sub}</span> : null}
              </div>
              <div className="flex h-5 overflow-hidden rounded-sm bg-muted/40" style={{ width: `${width}%` }}>
                {m.cols.map((c, j) => {
                  const v = m.cells.get(matrixKey(r.id, c.id)) ?? 0;
                  if (v <= 0) return null;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={cn("h-full transition-opacity", hover && hover !== c.id && "opacity-35")}
                      style={{ width: `${(v / total) * 100}%`, background: colColor(j, c.id) }}
                      title={`${r.label} → ${c.label}: ${fmtTon(v)} (${formatPct((v / total) * 100)}% dari ${r.label} · ${m.total > 0 ? formatPct((v / m.total) * 100) : "0"}% dari total)`}
                      aria-label={`${r.label} ke ${c.label}: ${fmtTon(v)}`}
                      onMouseEnter={() => setHover(c.id)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => clickable(c) && onSelectNode(c)}
                    />
                  );
                })}
              </div>
              <div className="text-right text-xs tabular-nums">{unit === "PCT" ? `${m.total > 0 ? formatPct((total / m.total) * 100) : "0"}%` : fmtTon(total)}</div>
            </div>
          );
        })}
      </div>
      {m.rows.length > ROWS_COLLAPSED ? (
        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Tampilkan lebih sedikit" : `Tampilkan semua ${m.rows.length} asal`}
        </button>
      ) : null}
    </div>
  );
}
