"use client";

import { useMemo, useState } from "react";
import { partition, type HierarchyRectangularNode } from "d3-hierarchy";
import { arc as d3Arc } from "d3-shape";
import type { SankeyNode } from "@/lib/supply-chain-flow";
import { treeNodeAsSankeyNode, type SupplyTreeNode } from "@/lib/supply-chain-views";
import { fmtTon, fmtTonOrPct } from "@/lib/supply-chain-format";
import { sunburstLabel } from "@/lib/sunburst-label";
import { useChartDark, type SankeyUnit } from "./supply-chain-sankey";
import { NodeInfoPanel, buildHierarchy, canFilterTreeNode, levelFill, type HDatum } from "./supply-chain-hierarchy-shared";

const R = 210;

/**
 * Tab Sunburst (owner 2026-10-17): cincin konsentris mengikuti Arah — pusat =
 * total, cincin keluar = tingkat berikutnya (Distrik › Lembaga › Offtaker ›
 * UL › Mill, atau sebaliknya); lebar irisan = tonase. Arahkan kursor untuk
 * membaca angka di panel kanan; klik irisan = filter.
 */
export function SupplyChainSunburst({ tree, total, unit, onSelectNode }: { tree: SupplyTreeNode[]; total: number; unit: SankeyUnit; onSelectNode: (n: SankeyNode) => void }) {
  const dark = useChartDark();
  // Kunci hover = jalur dari akar (string), bukan objek d3: saat pohon dibangun ulang (klik-filter) sorotan tetap benar atau hilang, tidak basi (review 2026-10-17).
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const arcs = useMemo(() => partition<HDatum>().size([2 * Math.PI, R])(buildHierarchy(tree)).descendants().filter((d) => d.depth > 0), [tree]);
  const hover = hoverKey ? (arcs.find((d) => d.data.key === hoverKey) ?? null) : null;
  const maxDepth = Math.max(1, ...arcs.map((d) => d.depth));
  const inner = R * 0.22;
  const ring = (R - inner) / maxDepth;
  const r0 = (d: HierarchyRectangularNode<HDatum>) => inner + (d.depth - 1) * ring;
  const r1 = (d: HierarchyRectangularNode<HDatum>) => inner + d.depth * ring - 1.5;
  const arcGen = d3Arc<HierarchyRectangularNode<HDatum>>().startAngle((d) => d.x0).endAngle((d) => d.x1).padAngle(0.004).padRadius(R / 2).innerRadius(r0).outerRadius(r1);

  if (!arcs.length) return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;

  const related = (d: HierarchyRectangularNode<HDatum>) => !hover || hover === d || hover.ancestors().includes(d) || d.ancestors().includes(hover);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="h-[440px] w-[440px] max-w-full shrink-0" role="img" aria-label="Sunburst aliran TBS">
        {arcs.map((d) => {
          const n = d.data.n!;
          const c = levelFill(n, dark);
          const lbl = sunburstLabel(d.x0, d.x1, (r0(d) + r1(d)) / 2, n.label);
          const filterable = canFilterTreeNode(n);
          return (
            <g key={d.data.key} onMouseEnter={() => setHoverKey(d.data.key)} onMouseLeave={() => setHoverKey(null)} onClick={() => filterable && onSelectNode(treeNodeAsSankeyNode(n))} className={filterable ? "cursor-pointer" : undefined}>
              <path d={arcGen(d) ?? ""} fill={c.fill} stroke="var(--card)" strokeWidth={1} opacity={related(d) ? 1 : 0.35} className="transition-opacity duration-150" />
              <title>{`${n.label}\n${fmtTon(n.ton)} · ${fmtTonOrPct(n.ton, total, "PCT")} dari total`}</title>
              {lbl?.kind === "flat" ? (
                <text x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={600} fill={c.text} className="pointer-events-none">
                  {lbl.text}
                </text>
              ) : lbl ? (
                <text transform={lbl.transform} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill={c.text} className="pointer-events-none">
                  {lbl.text}
                </text>
              ) : null}
            </g>
          );
        })}
        <circle r={inner - 2} fill="var(--card)" />
        <text textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="var(--muted-foreground)" className="pointer-events-none tabular-nums">
          <tspan x={0} dy={-6}>Total</tspan>
          <tspan x={0} dy={14} fontWeight={600} fill="var(--foreground)">{fmtTon(total)}</tspan>
        </text>
      </svg>
      <div className="min-w-0 flex-1 md:pt-4">
        <NodeInfoPanel
          node={hover?.data.n ?? null}
          parentTon={hover?.parent?.data.n?.ton ?? null}
          total={total}
          unit={unit}
          dark={dark}
          hint="Arahkan kursor ke irisan untuk membaca tonase dan porsinya; klik irisan Lembaga, Distrik, offtaker, atau Mill untuk menjadikannya filter."
          onSelectNode={onSelectNode}
        />
      </div>
    </div>
  );
}
