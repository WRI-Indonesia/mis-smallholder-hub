"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPct } from "@/lib/format";
import { CHANNEL_LABEL, type SankeyGraph, type SankeyNode } from "@/lib/supply-chain-flow";
import { buildPathRows } from "@/lib/supply-chain-views";
import { channelColor, isFilterableNode, isGroupNode, useChartDark, type SankeyUnit } from "./supply-chain-sankey";

const ROWS_COLLAPSED = 20;
const fmtTon = (n: number) => `${formatNumber(Math.round(n))} t`;

/**
 * Tab Jalur: satu baris per jalur utuh asal → offtaker → tujuan, urut tonase.
 * Tak ada garis yang saling silang — untuk pembaca yang bingung dengan pita
 * Sankey (owner 2026-10-09). Node yang bisa difilter tampil sebagai tombol.
 */
export function SupplyChainPathList({ graph, unit, onSelectNode }: { graph: SankeyGraph; unit: SankeyUnit; onSelectNode: (n: SankeyNode) => void }) {
  const dark = useChartDark();
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(() => buildPathRows(graph), [graph]);
  const max = Math.max(1, ...rows.map((r) => r.ton));
  const total = graph.totalTon;
  const share = (v: number) => `${total > 0 ? formatPct((v / total) * 100) : "0"}%`;

  if (rows.length === 0) {
    return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;
  }
  const visible = showAll ? rows : rows.slice(0, ROWS_COLLAPSED);

  const step = (n: SankeyNode | undefined) => {
    if (!n) return <span className="text-xs italic text-muted-foreground">langsung ke Mill</span>;
    const clickable = isFilterableNode(n) || isGroupNode(n);
    const text = (
      <>
        <span className="truncate">{n.label}</span>
        {n.isUl && <span className="ml-1 font-semibold text-primary">UL</span>}
      </>
    );
    return clickable ? (
      <button
        type="button"
        onClick={() => onSelectNode(n)}
        title={isGroupNode(n) ? "Klik untuk melihat per offtaker" : `Klik untuk memfilter ${n.label}`}
        className="inline-flex max-w-full items-center rounded border border-border/70 bg-background px-1.5 py-0.5 text-left text-xs hover:border-primary hover:text-primary"
      >
        {text}
      </button>
    ) : (
      <span className="inline-flex max-w-full items-center px-1.5 py-0.5 text-xs text-muted-foreground">{text}</span>
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {formatNumber(rows.length)} jalur, diurut dari tonase terbesar. Warna batang = jalur pertama TBS dari petani.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium w-8 text-right">#</th>
              <th className="py-2 pr-2 font-medium">{graph.nodes.some((n) => n.id.startsWith("D:")) ? "Distrik" : "Lembaga"}</th>
              <th className="w-4" />
              <th className="py-2 pr-2 font-medium">Offtaker</th>
              <th className="w-4" />
              <th className="py-2 pr-2 font-medium">{graph.nodes.some((n) => n.id.startsWith("U:")) ? "UL / Non-UL" : "Mill"}</th>
              <th className="py-2 pr-2 font-medium w-[26%]">Tonase</th>
              <th className="py-2 text-right font-medium">Porsi</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const first = r.steps[0];
              const last = r.steps[r.steps.length - 1];
              const mid = r.steps.length === 3 ? r.steps[1] : undefined;
              const color = channelColor(r.channel, dark);
              return (
                <tr key={r.key} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-1.5 pr-2 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="max-w-[180px] py-1.5 pr-2">{step(first)}</td>
                  <td className="text-muted-foreground"><ArrowRight className="h-3.5 w-3.5" /></td>
                  <td className="max-w-[240px] py-1.5 pr-2">{step(mid)}</td>
                  <td className="text-muted-foreground"><ArrowRight className="h-3.5 w-3.5" /></td>
                  <td className="max-w-[240px] py-1.5 pr-2">{step(last)}</td>
                  <td className="py-1.5 pr-2" title={CHANNEL_LABEL[r.channel]}>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${(r.ton / max) * 100}%`, background: color }} />
                      </div>
                      <span className={cn("w-20 text-right tabular-nums", unit === "PCT" && "text-muted-foreground")}>{fmtTon(r.ton)}</span>
                    </div>
                  </td>
                  <td className={cn("py-1.5 text-right tabular-nums", unit === "TON" && "text-muted-foreground")}>{share(r.ton)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > ROWS_COLLAPSED && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? `Tampilkan ${ROWS_COLLAPSED} teratas` : `Tampilkan semua (${formatNumber(rows.length)} jalur)`}
        </Button>
      )}
    </div>
  );
}
