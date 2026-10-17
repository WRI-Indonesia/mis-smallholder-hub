"use client";

import { useMemo, useState } from "react";
import { partition, type HierarchyRectangularNode } from "d3-hierarchy";
import type { SankeyNode } from "@/lib/supply-chain-flow";
import { treeNodeAsSankeyNode, type SupplyTreeNode } from "@/lib/supply-chain-views";
import { fmtTon } from "@/lib/supply-chain-format";
import { useChartDark, type SankeyUnit } from "./supply-chain-sankey";
import { NodeInfoPanel, buildHierarchy, canFilterTreeNode, levelFill, type HDatum } from "./supply-chain-hierarchy-shared";

const W = 1000;

/**
 * Tab Partisi (icicle): sunburst versi persegi — kolom kiri → kanan = tingkat
 * (mengikuti Arah), tinggi kotak = tonase. Lebih mudah dibaca labelnya daripada
 * cincin; klik kotak = filter.
 */
export function SupplyChainIcicle({ tree, total, unit, onSelectNode }: { tree: SupplyTreeNode[]; total: number; unit: SankeyUnit; onSelectNode: (n: SankeyNode) => void }) {
  const dark = useChartDark();
  const [hover, setHover] = useState<HierarchyRectangularNode<HDatum> | null>(null);
  const { cells, height } = useMemo(() => {
    const root = buildHierarchy(tree);
    const leaves = Math.max(1, root.leaves().length);
    const height = Math.min(900, Math.max(320, leaves * 18));
    const laid = partition<HDatum>().size([height, W]).padding(1)(root);
    return { cells: laid.descendants().filter((d) => d.depth > 0), height };
  }, [tree]);
  if (!cells.length) return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;
  const maxDepth = Math.max(1, ...cells.map((d) => d.depth));
  const colW = W / maxDepth;
  const related = (d: HierarchyRectangularNode<HDatum>) => !hover || hover === d || hover.ancestors().includes(d) || d.ancestors().includes(hover);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" style={{ maxHeight: 820 }} role="img" aria-label="Partisi aliran TBS">
        {cells.map((d) => {
          const n = d.data.n!;
          const c = levelFill(n, dark);
          const x = (d.depth - 1) * colW;
          const h = d.x1 - d.x0;
          const filterable = canFilterTreeNode(n);
          return (
            <g key={d.data.key} transform={`translate(${x}, ${d.x0})`} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)} onClick={() => filterable && onSelectNode(treeNodeAsSankeyNode(n))} className={filterable ? "cursor-pointer" : undefined}>
              <rect width={colW - 2} height={Math.max(0, h - 1)} rx={3} fill={c.fill} opacity={related(d) ? 1 : 0.35} className="transition-opacity duration-150" />
              <title>{`${n.label}\n${fmtTon(n.ton)}`}</title>
              {h >= 14 ? (
                <text x={6} y={h / 2} dominantBaseline="middle" fontSize={11} fill={c.text} className="pointer-events-none">
                  {n.label.length > colW / 6.5 ? `${n.label.slice(0, Math.floor(colW / 6.5) - 1)}…` : n.label}
                  {h >= 30 ? <tspan x={6} dy={13} fontSize={10} opacity={0.85}>{fmtTon(n.ton)}</tspan> : null}
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
        hint="Kolom kiri → kanan = tingkat sesuai Arah; tinggi kotak = tonase. Arahkan kursor untuk angka; klik kotak untuk filter."
        onSelectNode={onSelectNode}
      />
    </div>
  );
}
