"use client";

import { hierarchy, type HierarchyNode } from "d3-hierarchy";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPct } from "@/lib/format";
import { CHANNEL_LABEL, type SankeyNode } from "@/lib/supply-chain-flow";
import { DIRECT_NODE_ID, TREE_LEVEL_LABEL, channelSegments, treeNodeAsSankeyNode, type SupplyTreeNode, type TreeLevel } from "@/lib/supply-chain-views";
import { fmtTon, fmtTonOrPct } from "@/lib/supply-chain-format";
import { channelColor, isFilterableNode, isGroupNode, type SankeyUnit } from "./supply-chain-sankey";
import { UlBadge } from "./ul-badge";

/**
 * Bagian bersama tab hierarki kartu Aliran TBS (Sunburst · Partisi · Treemap):
 * pohon `buildSupplyChainTree` → hierarki d3 (daun membawa tonase), warna per
 * tingkat, dan panel info saat kursor di atas irisan/kotak. Klik = filter,
 * penangan yang sama dengan tab lain (owner 2026-10-17).
 */

export interface HDatum {
  key: string;
  n: SupplyTreeNode | null;
  children: HDatum[];
}

const toDatum = (n: SupplyTreeNode): HDatum => ({ key: n.key, n, children: n.children.map(toDatum) });

/** Akar maya di atas tingkat teratas; nilai = tonase daun (induk = jumlah anaknya). */
export function buildHierarchy(tree: SupplyTreeNode[]): HierarchyNode<HDatum> {
  const root: HDatum = { key: "__root", n: null, children: tree.map(toDatum) };
  return hierarchy(root).sum((d) => (d.children.length ? 0 : (d.n?.ton ?? 0)));
}

type Fill = { fill: string; text: string };
/** Palet per tingkat (konstan modul — `levelFill` dipanggil per sel tiap render). */
const LEVEL_FILL_LIGHT: Record<TreeLevel, Fill> = {
  DISTRIK: { fill: "#166534", text: "#ffffff" },
  LEMBAGA: { fill: "#4ade80", text: "#052e16" },
  OFFTAKER: { fill: "#fbbf24", text: "#451a03" },
  UL: { fill: "#64748b", text: "#ffffff" },
  MILL: { fill: "#cbd5e1", text: "#0f172a" },
};
const LEVEL_FILL_DARK: Record<TreeLevel, Fill> = {
  DISTRIK: { fill: "#15803d", text: "#ffffff" },
  LEMBAGA: { fill: "#22c55e", text: "#052e16" },
  OFFTAKER: { fill: "#d97706", text: "#451a03" },
  UL: { fill: "#475569", text: "#ffffff" },
  MILL: { fill: "#64748b", text: "#f8fafc" },
};
const UL_FILL: Record<"light" | "dark", Record<"UL" | "MILL", Fill>> = {
  light: { UL: { fill: "#1d4ed8", text: "#ffffff" }, MILL: { fill: "#93c5fd", text: "#1e3a8a" } },
  dark: { UL: { fill: "#2563eb", text: "#ffffff" }, MILL: { fill: "#3b82f6", text: "#f8fafc" } },
};
const DIRECT_FILL: Record<"light" | "dark", Fill> = { light: { fill: "#fde68a", text: "#451a03" }, dark: { fill: "#78350f", text: "#fef3c7" } };
const UNKNOWN_FILL: Record<"light" | "dark", Fill> = { light: { fill: "#e2e8f0", text: "#334155" }, dark: { fill: "#334155", text: "#e2e8f0" } };

/** Warna per tingkat: asal hijau, offtaker amber, tujuan biru (UL) / abu (bukan UL / tak diketahui). */
export function levelFill(n: SupplyTreeNode, dark: boolean): Fill {
  const theme = dark ? "dark" : "light";
  if (n.nodeId === DIRECT_NODE_ID) return DIRECT_FILL[theme];
  if (n.nodeId === "M:?") return UNKNOWN_FILL[theme];
  if (n.isUl && (n.level === "UL" || n.level === "MILL")) return UL_FILL[theme][n.level];
  return (dark ? LEVEL_FILL_DARK : LEVEL_FILL_LIGHT)[n.level];
}

export const canFilterTreeNode = (n: SupplyTreeNode) => {
  if (n.nodeId === DIRECT_NODE_ID) return false;
  const sn = treeNodeAsSankeyNode(n);
  return isFilterableNode(sn) || isGroupNode(sn);
};

/** Panel kanan: isi node yang disorot (atau petunjuk) + tombol Filter. */
export function NodeInfoPanel({
  node,
  parentTon,
  total,
  unit,
  dark,
  hint,
  onSelectNode,
}: {
  node: SupplyTreeNode | null;
  parentTon: number | null;
  total: number;
  unit: SankeyUnit;
  dark: boolean;
  hint: string;
  onSelectNode: (n: SankeyNode) => void;
}) {
  if (!node) return <p className="text-sm text-muted-foreground">{hint}</p>;
  const segs = channelSegments(node);
  const filterable = canFilterTreeNode(node);
  const sn = treeNodeAsSankeyNode(node);
  return (
    <div className="space-y-2 text-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{TREE_LEVEL_LABEL[node.level]}</div>
      <div className="flex items-center gap-2 font-medium">
        {node.label}
        {node.isUl && node.level === "MILL" && <UlBadge />}
      </div>
      {node.sub ? <div className="text-xs text-muted-foreground">{node.sub}</div> : null}
      <div className="tabular-nums">
        <span className="font-semibold">{fmtTon(node.ton)}</span>
        <span className="text-muted-foreground"> · {total > 0 ? formatPct((node.ton / total) * 100) : "0"}% dari total</span>
        {parentTon != null && parentTon > 0 && parentTon !== total ? (
          <span className="text-muted-foreground"> · {formatPct((node.ton / parentTon) * 100)}% dari induk</span>
        ) : null}
      </div>
      {segs.length > 1 ? (
        <div className="space-y-1">
          <div className="flex h-2 overflow-hidden rounded-full">
            {segs.map((s) => (
              <div key={s.channel} style={{ width: `${(s.ton / node.ton) * 100}%`, background: channelColor(s.channel, dark) }} title={`${CHANNEL_LABEL[s.channel]}: ${fmtTon(s.ton)}`} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {segs.map((s) => (
              <li key={s.channel} className="flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm" style={{ background: channelColor(s.channel, dark) }} />
                {CHANNEL_LABEL[s.channel]} {fmtTonOrPct(s.ton, total, unit)}
              </li>
            ))}
          </ul>
        </div>
      ) : segs.length === 1 ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: channelColor(segs[0].channel, dark) }} />
          {CHANNEL_LABEL[segs[0].channel]}
        </div>
      ) : null}
      {filterable ? (
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => onSelectNode(sn)}>
          <Filter className="h-3.5 w-3.5" /> {isGroupNode(sn) ? "Rinci per offtaker" : "Jadikan filter"}
        </Button>
      ) : null}
    </div>
  );
}
