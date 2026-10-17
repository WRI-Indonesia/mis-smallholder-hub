"use client";

import { useMemo, useState } from "react";
import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy";
import { linkHorizontal } from "d3-shape";
import { Minus, Plus } from "lucide-react";
import { SITEMAP_CLASS_STYLE, primaryClass, type SitemapGraph } from "@/lib/sitemap-mermaid";
import { buildSpanningForest, type SitemapTreeNode } from "@/lib/sitemap-layout";

type Datum = { id: string; tn: SitemapTreeNode | null; children: Datum[] };

const ROW = 34;
const COL = 270;
const BOX_W = 236;
const BOX_H = 26;

function toDatum(t: SitemapTreeNode, collapsed: Set<string>): Datum {
  return { id: t.node.id, tn: t, children: collapsed.has(t.node.id) ? [] : t.children.map((c) => toDatum(c, collapsed)) };
}

/**
 * Tab Pohon rapi: hutan rentang graf (`buildSpanningForest`) ditata algoritma
 * tidy tree Reingold–Tilford (d3-hierarchy) kiri → kanan; tiap simpul satu
 * baris, bisa dilipat. Edge yang bukan cabang pohon (rujukan silang) digambar
 * putus-putus oranye antara dua simpul bila keduanya sedang tampil.
 */
export function SitemapTree({ graph, title }: { graph: SitemapGraph; title: string }) {
  const forest = useMemo(() => buildSpanningForest(graph), [graph]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const { nodes, links, width, height, offsetY, cross } = useMemo(() => {
    const rootDatum: Datum = { id: "__root", tn: null, children: forest.roots.map((r) => toDatum(r, collapsed)) };
    const root = hierarchy(rootDatum);
    const layout = tree<Datum>().nodeSize([ROW, COL]);
    const laid = layout(root);
    const all = laid.descendants().filter((d) => d.depth > 0);
    let minX = Infinity;
    let maxX = -Infinity;
    let maxDepth = 0;
    for (const d of all) {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x);
      maxDepth = Math.max(maxDepth, d.depth);
    }
    if (!all.length) return { nodes: [], links: [], width: 0, height: 0, offsetY: 0, cross: [] };
    const offsetY = -minX + ROW / 2 + 8;
    const byId = new Map(all.map((d) => [d.data.id, d]));
    const links = laid.links().filter((l) => l.source.depth > 0);
    const cross = forest.crossEdges
      .map((e) => ({ e, s: byId.get(e.source), t: byId.get(e.target) }))
      .filter((c): c is { e: (typeof forest.crossEdges)[number]; s: HierarchyPointNode<Datum>; t: HierarchyPointNode<Datum> } => !!c.s && !!c.t);
    return {
      nodes: all,
      links,
      cross,
      width: maxDepth * COL + 24,
      height: maxX - minX + ROW + 16,
      offsetY,
    };
  }, [forest, collapsed]);

  const px = (d: HierarchyPointNode<Datum>) => (d.depth - 1) * COL + 12;
  const py = (d: HierarchyPointNode<Datum>) => d.x + offsetY;
  const link = linkHorizontal<unknown, [number, number]>()
    .x((p) => p[0])
    .y((p) => p[1]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!nodes.length) return <p className="text-sm text-muted-foreground">Tidak ada simpul.</p>;

  return (
    <div className="overflow-auto rounded-lg border bg-card" style={{ maxHeight: 820 }}>
      <svg width={width} height={height} role="img" aria-label={`Pohon ${title}`} className="block">
        <g fill="none" stroke="var(--muted-foreground)" strokeWidth={1.2}>
          {links.map((l) => {
            const via = l.target.data.tn?.via;
            return (
              <path
                key={`${l.source.data.id}-${l.target.data.id}`}
                d={link({ source: [px(l.source) + BOX_W, py(l.source)], target: [px(l.target), py(l.target)] }) ?? ""}
                strokeDasharray={via?.kind === "dotted" ? "4 3" : undefined}
                strokeWidth={via?.kind === "thick" ? 2.2 : 1.2}
              />
            );
          })}
        </g>
        <g fill="none" stroke="#ea580c" strokeWidth={1.1} strokeDasharray="3 3">
          {cross.map(({ e, s, t }) => {
            const d = link({ source: [px(s) + BOX_W, py(s)], target: [px(t), py(t)] }) ?? "";
            return <path key={e.id} d={d} />;
          })}
        </g>
        {cross
          .filter(({ e }) => e.label)
          .map(({ e, s, t }) => (
            <text
              key={`${e.id}-l`}
              x={(px(s) + BOX_W + px(t)) / 2}
              y={(py(s) + py(t)) / 2 - 3}
              textAnchor="middle"
              fontSize={9}
              fill="#ea580c"
            >
              {e.label}
            </text>
          ))}
        {nodes.map((d) => {
          const tn = d.data.tn!;
          const cls = primaryClass(tn.node);
          const s = SITEMAP_CLASS_STYLE[cls] ?? SITEMAP_CLASS_STYLE.content;
          const dashed = tn.node.classes.includes("proto") || tn.node.classes.includes("planned");
          const more = tn.node.lines.length - 1;
          const hasChildren = tn.children.length > 0;
          const isCollapsed = collapsed.has(tn.node.id);
          return (
            <g key={d.data.id} transform={`translate(${px(d)}, ${py(d) - BOX_H / 2})`}>
              <rect
                width={BOX_W}
                height={BOX_H}
                rx={tn.node.shape === "stadium" ? BOX_H / 2 : 5}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={1.2}
                strokeDasharray={dashed ? "4 3" : undefined}
              />
              <title>{tn.node.lines.join("\n")}</title>
              <foreignObject width={BOX_W - (hasChildren ? 26 : 8)} height={BOX_H} x={8} y={0}>
                <div
                  className={cls === "menu" || cls === "page" ? "truncate font-semibold" : "truncate"}
                  style={{ color: s.color, fontSize: 11, lineHeight: `${BOX_H}px` }}
                >
                  {tn.node.lines[0]}
                  {more > 0 ? <span className="opacity-60"> · +{more} baris</span> : null}
                </div>
              </foreignObject>
              {hasChildren ? (
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={isCollapsed ? "Buka cabang" : "Lipat cabang"}
                  className="cursor-pointer"
                  transform={`translate(${BOX_W - 18}, ${BOX_H / 2 - 7})`}
                  onClick={() => toggle(tn.node.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") toggle(tn.node.id);
                  }}
                >
                  <rect width={14} height={14} rx={3} fill="var(--card)" stroke={s.stroke} />
                  {isCollapsed ? <Plus x={2} y={2} width={10} height={10} color={s.stroke} /> : <Minus x={2} y={2} width={10} height={10} color={s.stroke} />}
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      {forest.crossEdges.length ? (
        <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
          Garis putus-putus oranye = {forest.crossEdges.length} rujukan silang (edge yang bukan cabang pohon).
        </p>
      ) : null}
    </div>
  );
}
