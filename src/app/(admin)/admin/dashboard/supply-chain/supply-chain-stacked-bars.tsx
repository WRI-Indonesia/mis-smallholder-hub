"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORICAL } from "@/lib/chart-palette";
import { formatPct } from "@/lib/format";
import type { SankeyGraph, SankeyNode } from "@/lib/supply-chain-flow";
import { buildOriginDestMatrix, matrixKey, transposeOriginDestMatrix } from "@/lib/supply-chain-views";
import { fmtTon } from "@/lib/supply-chain-format";
import { isFilterableNode, isGroupNode, useChartDark, type SankeyUnit } from "./supply-chain-sankey";
import { UlBadge } from "./ul-badge";

const ROWS_COLLAPSED = 15;
/** Segmen berwarna maks = slot palet kategorikal; sisanya digabung "… lain" abu-abu (review 2026-10-17: warna tak boleh berulang). */
const MAX_SEGMENTS = CATEGORICAL.length;
const OTHER_ID = "__lain";

type Segment = { id: string; label: string; node: SankeyNode | null; color: string; total: number };

/**
 * Tab Batang bertumpuk: satu batang per asal (Distrik/Lembaga), segmen = tujuan
 * (UL/Non-UL atau Mill) dengan warna tetap per tujuan; panjang batang = tonase
 * (Angka Ton) atau 100% (Angka %). Arah Hilir → Hulu = satu batang per tujuan,
 * segmen = asal. Segmen lebih dari 8 digabung "… lain". Klik nama atau segmen = filter.
 */
export function SupplyChainStackedBars({
  graph,
  unit,
  direction = "HULU",
  onSelectNode,
}: {
  graph: SankeyGraph;
  unit: SankeyUnit;
  /** Hilir → Hulu = satu batang per tujuan, segmen = asal (owner 2026-10-17). */
  direction?: "HULU" | "HILIR";
  onSelectNode: (n: SankeyNode) => void;
}) {
  const dark = useChartDark();
  const [showAll, setShowAll] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const m = useMemo(() => buildOriginDestMatrix(graph), [graph]);
  const mirror = direction === "HILIR";
  const t = useMemo(() => (mirror ? transposeOriginDestMatrix(m) : m), [m, mirror]);

  const segments = useMemo<Segment[]>(() => {
    const grey = dark ? "#475569" : "#94a3b8";
    const folded = t.cols.length > MAX_SEGMENTS;
    const kept = folded ? t.cols.slice(0, MAX_SEGMENTS - 1) : t.cols;
    const out: Segment[] = kept.map((c, j) => ({
      id: c.id,
      label: c.label,
      node: c,
      color: c.id === "M:?" ? grey : CATEGORICAL[j][dark ? "dark" : "light"],
      total: t.colTotal.get(c.id) ?? 0,
    }));
    if (folded) {
      const rest = t.cols.slice(MAX_SEGMENTS - 1);
      out.push({
        id: OTHER_ID,
        label: `${mirror ? "Asal" : "Tujuan"} lain (${rest.length})`,
        node: null,
        color: grey,
        total: rest.reduce((a, c) => a + (t.colTotal.get(c.id) ?? 0), 0),
      });
    }
    return out;
  }, [t, dark, mirror]);

  if (!m.rows.length) return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;
  const keptIds = new Set(segments.filter((s) => s.node).map((s) => s.id));
  const cell = (r: SankeyNode, sg: Segment) => {
    if (sg.node) return t.cells.get(matrixKey(r.id, sg.id)) ?? 0;
    // Segmen "lain" = total baris dikurangi segmen yang tampil.
    const shown = t.cols.filter((c) => keptIds.has(c.id)).reduce((a, c) => a + (t.cells.get(matrixKey(r.id, c.id)) ?? 0), 0);
    return Math.max(0, (t.rowTotal.get(r.id) ?? 0) - shown);
  };
  const maxRow = Math.max(1, ...t.rows.map((r) => t.rowTotal.get(r.id) ?? 0));
  const rows = showAll ? t.rows : t.rows.slice(0, ROWS_COLLAPSED);
  const clickable = (n: SankeyNode) => isFilterableNode(n) || isGroupNode(n);
  const pct = (v: number) => `${m.total > 0 ? formatPct((v / m.total) * 100) : "0"}%`;

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label={mirror ? "Legenda asal" : "Legenda tujuan"}>
        {segments.map((sg) => (
          <li key={sg.id} className={cn("flex items-center gap-1.5", hover && hover !== sg.id && "opacity-50")} onMouseEnter={() => setHover(sg.id)} onMouseLeave={() => setHover(null)}>
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: sg.color }} />
            {sg.node && clickable(sg.node) ? (
              <button type="button" className="hover:underline" onClick={() => onSelectNode(sg.node!)} title={`Filter: ${sg.label}`}>
                {sg.label}
              </button>
            ) : (
              <span>{sg.label}</span>
            )}
            {sg.node?.isUl && <UlBadge />}
            <span className="text-muted-foreground tabular-nums">{unit === "PCT" ? pct(sg.total) : fmtTon(sg.total)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const total = t.rowTotal.get(r.id) ?? 0;
          const width = unit === "PCT" ? 100 : (total / maxRow) * 100;
          return (
            <div key={r.id} className="grid grid-cols-[minmax(120px,220px)_minmax(0,1fr)_84px] items-center gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-1 text-xs">
                {clickable(r) ? (
                  <button type="button" className="truncate font-medium hover:underline" title={isGroupNode(r) ? "Rinci per offtaker" : `Filter: ${r.label}`} onClick={() => onSelectNode(r)}>
                    {r.label}
                  </button>
                ) : (
                  <span className="truncate font-medium">{r.label}</span>
                )}
                {r.isUl && <UlBadge />}
                {r.sub ? <span className="truncate text-muted-foreground">{r.sub}</span> : null}
              </div>
              <div className="flex h-5 overflow-hidden rounded-sm bg-muted/40" style={{ width: `${width}%` }}>
                {segments.map((sg) => {
                  const v = cell(r, sg);
                  if (v <= 0) return null;
                  const from = mirror ? sg.label : r.label;
                  const to = mirror ? r.label : sg.label;
                  return (
                    <button
                      key={sg.id}
                      type="button"
                      className={cn("h-full transition-opacity", hover && hover !== sg.id && "opacity-35")}
                      style={{ width: `${(v / total) * 100}%`, background: sg.color }}
                      title={`${from} → ${to}: ${fmtTon(v)} (${formatPct((v / total) * 100)}% dari ${r.label} · ${pct(v)} dari total)`}
                      aria-label={`${from} ke ${to}: ${fmtTon(v)}`}
                      onMouseEnter={() => setHover(sg.id)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => sg.node && clickable(sg.node) && onSelectNode(sg.node)}
                    />
                  );
                })}
              </div>
              <div className="text-right text-xs tabular-nums">{unit === "PCT" ? pct(total) : fmtTon(total)}</div>
            </div>
          );
        })}
      </div>
      {t.rows.length > ROWS_COLLAPSED ? (
        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Tampilkan lebih sedikit" : `Tampilkan semua ${t.rows.length} ${mirror ? "tujuan" : "asal"}`}
        </button>
      ) : null}
    </div>
  );
}
