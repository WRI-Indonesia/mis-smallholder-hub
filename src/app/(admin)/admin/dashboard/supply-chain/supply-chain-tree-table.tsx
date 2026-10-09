"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPct } from "@/lib/format";
import { CHANNEL_LABEL, type SankeyGraph, type SankeyNode, type ScGroup } from "@/lib/supply-chain-flow";
import {
  DIRECT_NODE_ID,
  TREE_LEVEL_LABEL,
  buildSupplyChainTree,
  channelSegments,
  treeBranchKeys,
  type SupplyTreeNode,
  type TreeDirection,
  type TreeLevel,
} from "@/lib/supply-chain-views";
import { channelColor, isFilterableNode, isGroupNode, useChartDark, type SankeyUnit } from "./supply-chain-sankey";
import { UlBadge } from "./ul-badge";

const fmtTon = (n: number) => `${formatNumber(Math.round(n))} t`;
const LEVEL_COLUMN: Record<TreeLevel, 0 | 1 | 3> = { DISTRIK: 0, LEMBAGA: 0, OFFTAKER: 1, UL: 3, MILL: 3 };

/** Node pohon → bentuk node Sankey, supaya klik-filter memakai penangan yang sama dengan diagram. */
const asSankeyNode = (n: SupplyTreeNode): SankeyNode => ({
  id: n.nodeId, column: LEVEL_COLUMN[n.level], label: n.label, sub: n.sub, value: n.ton, folded: 0, isUl: n.isUl, millStatus: null, groupCode: n.groupCode,
});

/**
 * Tab Tabel Pohon (owner 2026-10-09): agregasi bertingkat yang bisa dibuka-tutup,
 * dibaca dari hulu ke hilir (Lembaga → Offtaker → Mill) atau sebaliknya. Tingkat
 * Distrik / UL ikut toggle Dari / Ke; tingkat Offtaker ikut toggle Offtaker.
 * `graph` = graf per Lembaga & per Mill tanpa pelipatan (lihat `buildSupplyChainTree`).
 */
export function SupplyChainTreeTable({
  graph,
  groups,
  direction,
  byDistrict,
  byUl,
  unit,
  onSelectNode,
}: {
  graph: SankeyGraph;
  groups: ScGroup[];
  direction: TreeDirection;
  byDistrict: boolean;
  byUl: boolean;
  unit: SankeyUnit;
  onSelectNode: (n: SankeyNode) => void;
}) {
  const dark = useChartDark();
  const tree = useMemo(() => buildSupplyChainTree(graph, groups, { direction, byDistrict, byUl }), [graph, groups, direction, byDistrict, byUl]);
  const levels = useMemo(() => {
    const out: TreeLevel[] = [];
    for (let nodes = tree; nodes.length > 0; nodes = nodes.flatMap((n) => n.children)) out.push(nodes[0].level);
    return out;
  }, [tree]);

  // Bawaan: tingkat pertama terbuka. Kunci = jalur id dari akar → tetap berlaku saat filter
  // berubah; susunan tingkat berubah (arah / Distrik / UL) → kembali ke bawaan.
  const sig = `${direction}|${byDistrict}|${byUl}`;
  const defaultKeys = useMemo(() => new Set(treeBranchKeys(tree, 1)), [tree]);
  const [state, setState] = useState<{ sig: string; keys: Set<string> } | null>(null);
  const expanded = state && state.sig === sig ? state.keys : defaultKeys;
  const setExpanded = (keys: Set<string>) => setState({ sig, keys });
  const toggle = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  };

  const total = graph.totalTon;
  // Skala batang = baris akar terbesar (anak ≤ induk ≤ akar terbesar) — skala total
  // membuat batang 32 Lembaga nyaris tak terlihat.
  const scaleMax = Math.max(1, ...tree.map((n) => n.ton));
  const share = (v: number, of: number) => `${of > 0 ? formatPct((v / of) * 100) : "0"}%`;

  if (tree.length === 0) {
    return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;
  }

  const rows: React.ReactNode[] = [];
  const walk = (nodes: SupplyTreeNode[], depth: number, parentTon: number) => {
    for (const n of nodes) {
      const open = expanded.has(n.key);
      const hasKids = n.children.length > 0;
      const sn = asSankeyNode(n);
      const filterable = n.nodeId !== DIRECT_NODE_ID && (isFilterableNode(sn) || isGroupNode(sn));
      const childLevel = hasKids ? TREE_LEVEL_LABEL[n.children[0].level] : null;
      rows.push(
        <tr key={n.key} className={cn("group border-b last:border-0 hover:bg-muted/40", depth === 0 && "bg-muted/20 font-medium")}>
          <td className="py-1.5 pr-2">
            <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
              {hasKids ? (
                <button
                  type="button"
                  onClick={() => toggle(n.key)}
                  aria-expanded={open}
                  aria-label={`${open ? "Tutup" : "Buka"} ${n.label}`}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
                </button>
              ) : (
                <span className="inline-block w-5" />
              )}
              <button
                type="button"
                onClick={hasKids ? () => toggle(n.key) : undefined}
                className={cn("min-w-0 truncate text-left", hasKids ? "cursor-pointer" : "cursor-default")}
                title={n.sub ? `${n.label} · ${n.sub}` : n.label}
              >
                {n.label}
              </button>
              {n.isUl && n.level === "MILL" && <UlBadge />}
              <span className="ml-1 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">{TREE_LEVEL_LABEL[n.level]}</span>
              {filterable && (
                <button
                  type="button"
                  onClick={() => onSelectNode(sn)}
                  title={isGroupNode(sn) ? "Rinci per offtaker" : `Filter: ${n.label}`}
                  aria-label={isGroupNode(sn) ? `Rinci ${n.label} per offtaker` : `Filter ${n.label}`}
                  className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Filter className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </td>
          <td className="whitespace-nowrap py-1.5 pr-2 text-xs text-muted-foreground tabular-nums">
            {hasKids ? `${formatNumber(n.children.length)} ${childLevel}` : ""}
          </td>
          <td className="py-1.5 pr-2">
            <div className="flex items-center gap-2">
              <div
                className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
                title={channelSegments(n).map((s) => `${CHANNEL_LABEL[s.channel]}: ${fmtTon(s.ton)}`).join("\n")}
              >
                {channelSegments(n).map((s) => (
                  <div key={s.channel} className="h-full" style={{ width: `${(s.ton / scaleMax) * 100}%`, background: channelColor(s.channel, dark) }} />
                ))}
              </div>
              <span className={cn("w-20 text-right tabular-nums", unit === "PCT" && "text-muted-foreground")}>{fmtTon(n.ton)}</span>
            </div>
          </td>
          <td className={cn("py-1.5 pr-2 text-right tabular-nums", unit === "TON" && "text-muted-foreground")}>{share(n.ton, total)}</td>
          <td className="py-1.5 text-right tabular-nums text-muted-foreground">{depth === 0 ? "—" : share(n.ton, parentTon)}</td>
        </tr>,
      );
      if (open && hasKids) walk(n.children, depth + 1, n.ton);
    }
  };
  walk(tree, 0, total);

  const allKeys = treeBranchKeys(tree);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Tingkat:{" "}
          {levels.map((l, i) => (
            <Fragment key={l}>
              {i > 0 && " › "}
              <span className="font-medium text-foreground">{TREE_LEVEL_LABEL[l]}</span>
            </Fragment>
          ))}
          . Klik baris untuk membuka; ikon corong = jadikan filter. Batang berwarna = komposisi jalur TBS.
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(new Set(allKeys))}>Buka semua</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(new Set())}>Tutup semua</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Nama</th>
              <th className="py-2 pr-2 font-medium">Isi</th>
              <th className="py-2 pr-2 font-medium w-[30%]">Tonase</th>
              <th className="py-2 pr-2 text-right font-medium">% total</th>
              <th className="py-2 text-right font-medium">% induk</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );
}
