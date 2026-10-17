"use client";

import { useMemo, useState } from "react";
import { hierarchy, partition, type HierarchyRectangularNode } from "d3-hierarchy";
import { arc as d3Arc } from "d3-shape";
import { SITEMAP_CLASS_STYLE, primaryClass, type SitemapGraph } from "@/lib/sitemap-mermaid";
import { buildSpanningForest, type SitemapTreeNode } from "@/lib/sitemap-layout";

type Datum = { id: string; tn: SitemapTreeNode | null; children: Datum[] };

const R = 230;

function toDatum(t: SitemapTreeNode): Datum {
  return { id: t.node.id, tn: t, children: t.children.map(toDatum) };
}

/**
 * Tab Sunburst: hutan rentang sebagai cincin konsentris (d3 partition) —
 * pusat = berkas/akar, cincin berikutnya = tingkat hierarki; lebar irisan =
 * jumlah daun di bawahnya. Arahkan kursor untuk membaca label di tengah.
 */
export function SitemapSunburst({ graph, title }: { graph: SitemapGraph; title: string }) {
  const [hover, setHover] = useState<HierarchyRectangularNode<Datum> | null>(null);
  const arcs = useMemo(() => {
    const forest = buildSpanningForest(graph);
    const rootDatum: Datum = { id: "__root", tn: null, children: forest.roots.map(toDatum) };
    const root = hierarchy(rootDatum).count();
    const laid = partition<Datum>().size([2 * Math.PI, R])(root);
    return laid.descendants().filter((d) => d.depth > 0);
  }, [graph]);
  const maxDepth = Math.max(1, ...arcs.map((d) => d.depth));
  const ring = R / (maxDepth + 0.6);
  const arcGen = d3Arc<HierarchyRectangularNode<Datum>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle(0.006)
    .padRadius(R / 2)
    .innerRadius((d) => (d.depth - 1) * ring + ring * 0.6)
    .outerRadius((d) => d.depth * ring + ring * 0.6 - 1.5);

  const center = hover?.data.tn?.node;
  const centerCls = center ? primaryClass(center) : null;

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-3 md:flex-row md:items-start">
      <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="h-[460px] w-[460px] max-w-full" role="img" aria-label={`Sunburst ${title}`}>
        {arcs.map((d) => {
          const tn = d.data.tn!;
          const cls = primaryClass(tn.node);
          const s = SITEMAP_CLASS_STYLE[cls] ?? SITEMAP_CLASS_STYLE.content;
          const angle = d.x1 - d.x0;
          const mid = (d.x0 + d.x1) / 2;
          const rMid = ((d.depth - 1) * ring + d.depth * ring) / 2 + ring * 0.6;
          const deg = (mid * 180) / Math.PI - 90;
          const flip = deg > 90 ? 180 : 0;
          const showLabel = angle * rMid > 70;
          const label = tn.node.lines[0];
          const maxChars = Math.max(4, Math.floor((angle * rMid) / 6));
          return (
            <g key={d.data.id} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}>
              <path
                d={arcGen(d) ?? ""}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={hover?.data.id === d.data.id ? 2 : 0.8}
                strokeDasharray={tn.node.classes.includes("proto") || tn.node.classes.includes("planned") ? "3 2" : undefined}
                opacity={hover && hover.data.id !== d.data.id && !hover.ancestors().includes(d) && !d.ancestors().includes(hover) ? 0.45 : 1}
              />
              <title>{tn.node.lines.join("\n")}</title>
              {showLabel && angle > 1.6 ? (
                // Irisan sangat lebar (hampir atau seluruh lingkaran): label mendatar di tengah cincin, bukan diputar.
                <text
                  x={rMid * Math.cos(mid - Math.PI / 2)}
                  y={rMid * Math.sin(mid - Math.PI / 2)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={s.color}
                  className="pointer-events-none"
                >
                  {label.length > 28 ? `${label.slice(0, 27)}…` : label}
                </text>
              ) : showLabel ? (
                <text
                  transform={`rotate(${deg}) translate(${rMid},0) rotate(${flip})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  fill={s.color}
                  className="pointer-events-none"
                >
                  {label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label}
                </text>
              ) : null}
            </g>
          );
        })}
        <circle r={ring * 0.55} fill="var(--card)" />
        <text textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="var(--muted-foreground)" className="pointer-events-none">
          {center ? "" : title.length > 24 ? `${title.slice(0, 23)}…` : title}
        </text>
      </svg>
      <div className="min-w-0 flex-1 text-sm">
        {center && centerCls ? (
          <>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm border" style={{ background: SITEMAP_CLASS_STYLE[centerCls].fill, borderColor: SITEMAP_CLASS_STYLE[centerCls].stroke }} />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{centerCls}</span>
            </div>
            <div className="whitespace-pre-wrap font-medium">{center.lines.join("\n")}</div>
            {hover?.children?.length ? <p className="mt-1 text-xs text-muted-foreground">{hover.children.length} anak · {hover.value} daun</p> : null}
          </>
        ) : (
          <p className="text-muted-foreground">Arahkan kursor ke irisan untuk membaca isinya. Pusat = {title}; tiap cincin keluar = satu tingkat Menu → Sub menu → Halaman → Bagian → Isi.</p>
        )}
      </div>
    </div>
  );
}
