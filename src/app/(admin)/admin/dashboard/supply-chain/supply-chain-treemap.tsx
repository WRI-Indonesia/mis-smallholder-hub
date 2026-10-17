"use client";

import { useMemo, useState } from "react";
import { treemap, treemapSquarify, type HierarchyRectangularNode } from "d3-hierarchy";
import type { SankeyNode } from "@/lib/supply-chain-flow";
import { treeNodeAsSankeyNode, type SupplyTreeNode } from "@/lib/supply-chain-views";
import { fmtTon } from "@/lib/supply-chain-format";
import { useChartDark, type SankeyUnit } from "./supply-chain-sankey";
import { NodeInfoPanel, buildHierarchy, canFilterTreeNode, levelFill, type HDatum } from "./supply-chain-hierarchy-shared";

const W = 1000;
const H = 560;
const TITLE_H = 18;

/**
 * Tab Treemap: kotak bersarang, luas = tonase — paling jelas untuk membandingkan
 * porsi. Tingkat teratas (sesuai Arah) jadi bingkai berjudul, tingkat di
 * dalamnya kotak berwarna per tingkat; klik kotak = filter.
 */
export function SupplyChainTreemap({ tree, total, unit, onSelectNode }: { tree: SupplyTreeNode[]; total: number; unit: SankeyUnit; onSelectNode: (n: SankeyNode) => void }) {
  const dark = useChartDark();
  const [hover, setHover] = useState<HierarchyRectangularNode<HDatum> | null>(null);
  const cells = useMemo(() => {
    const root = buildHierarchy(tree).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const laid = treemap<HDatum>()
      .tile(treemapSquarify)
      .size([W, H])
      .paddingOuter(3)
      .paddingInner(2)
      .paddingTop((d) => (d.depth >= 1 && d.children?.length ? TITLE_H : 0))(root);
    return laid.descendants().filter((d) => d.depth > 0);
  }, [tree]);
  if (!cells.length) return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;
  const related = (d: HierarchyRectangularNode<HDatum>) => !hover || hover === d || hover.ancestors().includes(d) || d.ancestors().includes(hover);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Treemap aliran TBS">
        {cells.map((d) => {
          const n = d.data.n!;
          const c = levelFill(n, dark);
          const w = d.x1 - d.x0;
          const h = d.y1 - d.y0;
          const isParent = !!d.children?.length;
          const filterable = canFilterTreeNode(n);
          return (
            <g key={d.data.key} transform={`translate(${d.x0}, ${d.y0})`} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)} onClick={(e) => { e.stopPropagation(); if (filterable) onSelectNode(treeNodeAsSankeyNode(n)); }} className={filterable ? "cursor-pointer" : undefined}>
              <rect width={Math.max(0, w)} height={Math.max(0, h)} rx={isParent ? 4 : 2} fill={c.fill} fillOpacity={isParent ? 0.22 : 1} stroke={c.fill} strokeWidth={isParent ? 1 : 0} opacity={related(d) ? 1 : 0.35} className="transition-opacity duration-150" />
              <title>{`${n.label}\n${fmtTon(n.ton)}`}</title>
              {isParent && w > 40 && h > TITLE_H ? (
                <text x={5} y={TITLE_H / 2 + 1} dominantBaseline="middle" fontSize={10} fontWeight={600} fill={dark ? "#f8fafc" : "#0f172a"} className="pointer-events-none">
                  {n.label.length > w / 6 ? `${n.label.slice(0, Math.max(1, Math.floor(w / 6) - 1))}…` : n.label}
                </text>
              ) : !isParent && w > 34 && h > 16 ? (
                <text x={4} y={h / 2} dominantBaseline="middle" fontSize={10} fill={c.text} className="pointer-events-none">
                  {n.label.length > w / 6 ? `${n.label.slice(0, Math.max(1, Math.floor(w / 6) - 1))}…` : n.label}
                  {h > 32 ? <tspan x={4} dy={12} fontSize={9} opacity={0.85}>{fmtTon(n.ton)}</tspan> : null}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <NodeInfoPanel
        node={hover?.data.n ?? null}
        parentTon={hover?.parent?.data.n?.ton ?? null}
        total={total}
        unit={unit}
        dark={dark}
        hint="Luas kotak = tonase. Bingkai berjudul = tingkat teratas sesuai Arah, kotak di dalamnya = tingkat berikutnya. Arahkan kursor untuk angka; klik untuk filter."
        onSelectNode={onSelectNode}
      />
    </div>
  );
}
