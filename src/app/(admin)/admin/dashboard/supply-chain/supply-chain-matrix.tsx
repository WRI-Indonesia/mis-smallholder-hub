"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/format";
import type { SankeyGraph, SankeyNode } from "@/lib/supply-chain-flow";
import { buildOriginDestMatrix, matrixKey } from "@/lib/supply-chain-views";
import { fmtTon } from "@/lib/supply-chain-format";
import { isFilterableNode, isGroupNode, type SankeyUnit } from "./supply-chain-sankey";
import { UlBadge } from "./ul-badge";

/**
 * Tab Matriks: tabel panas Asal (baris) × Tujuan (kolom); warna sel makin pekat
 * makin besar tonasenya. Tanpa garis sama sekali — paling ramah layar sempit.
 * Klik judul baris/kolom = filter (penangan yang sama dengan tab lain).
 */
export function SupplyChainMatrix({ graph, unit, onSelectNode }: { graph: SankeyGraph; unit: SankeyUnit; onSelectNode: (n: SankeyNode) => void }) {
  const m = useMemo(() => buildOriginDestMatrix(graph), [graph]);
  if (!m.rows.length) return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;
  const show = (v: number) => (unit === "PCT" ? `${m.total > 0 ? formatPct((v / m.total) * 100) : "0"}%` : fmtTon(v));
  const head = (n: SankeyNode) => {
    const clickable = isFilterableNode(n) || isGroupNode(n);
    const inner = (
      <span className="inline-flex items-center gap-1">
        {n.label}
        {n.isUl && n.column === 3 && n.id.startsWith("M:") && <UlBadge />}
      </span>
    );
    return clickable ? (
      <button type="button" className="text-left font-medium hover:underline" title={isGroupNode(n) ? "Rinci per offtaker" : `Filter: ${n.label}`} onClick={() => onSelectNode(n)}>
        {inner}
      </button>
    ) : (
      <span className="font-medium">{inner}</span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card py-1.5 pr-3 text-left text-xs font-medium text-muted-foreground">Asal ↓ · Tujuan →</th>
            {m.cols.map((c) => (
              <th key={c.id} className="min-w-[96px] px-2 py-1.5 text-left align-bottom text-xs">
                {head(c)}
              </th>
            ))}
            <th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r) => (
            <tr key={r.id}>
              <th className="sticky left-0 z-10 bg-card py-1 pr-3 text-left text-xs">{head(r)}</th>
              {m.cols.map((c) => {
                const v = m.cells.get(matrixKey(r.id, c.id)) ?? 0;
                const a = m.max > 0 ? v / m.max : 0;
                return (
                  <td
                    key={c.id}
                    className={cn("px-2 py-1 text-right tabular-nums", v === 0 && "text-muted-foreground/50")}
                    style={v > 0 ? { background: `color-mix(in oklab, var(--primary) ${Math.round(8 + a * 72)}%, transparent)`, color: a > 0.55 ? "var(--primary-foreground)" : undefined } : undefined}
                    title={v > 0 ? `${r.label} → ${c.label}: ${fmtTon(v)} (${m.total > 0 ? formatPct((v / m.total) * 100) : "0"}% dari total · ${formatPct((v / (m.rowTotal.get(r.id) || 1)) * 100)}% dari ${r.label})` : undefined}
                  >
                    {v > 0 ? show(v) : "·"}
                  </td>
                );
              })}
              <td className="px-2 py-1 text-right font-medium tabular-nums">{show(m.rowTotal.get(r.id) ?? 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t">
            <th className="sticky left-0 z-10 bg-card py-1.5 pr-3 text-left text-xs font-medium text-muted-foreground">Total</th>
            {m.cols.map((c) => (
              <td key={c.id} className="px-2 py-1.5 text-right font-medium tabular-nums">{show(m.colTotal.get(c.id) ?? 0)}</td>
            ))}
            <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{show(m.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
