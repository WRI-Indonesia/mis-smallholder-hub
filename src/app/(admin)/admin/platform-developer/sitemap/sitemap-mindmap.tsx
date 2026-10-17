"use client";

import { useEffect, useRef } from "react";
import type { IPureNode } from "markmap-common";
import { SITEMAP_CLASS_STYLE, primaryClass, type SitemapGraph } from "@/lib/sitemap-mermaid";
import { buildSpanningForest, type SitemapTreeNode } from "@/lib/sitemap-layout";
import { canvasHeight } from "./sitemap-flow-shared";

type MmNode = IPureNode & { payload?: { fold?: number; cls?: string } };

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toMm(t: SitemapTreeNode, depth: number): MmNode {
  const cls = primaryClass(t.node);
  const first = esc(t.node.lines[0]);
  const rest = t.node.lines.slice(1).map(esc);
  const content =
    cls === "content" && rest.length
      ? `<div style="font-size:11px;line-height:1.3">${[first, ...rest].join("<br/>")}</div>`
      : cls === "menu" || cls === "page"
        ? `<strong>${first}</strong>`
        : first;
  return {
    content,
    children: t.children.map((c) => toMm(c, depth + 1)),
    // Dua tingkat pertama terbuka; sisanya dilipat agar peta awal tetap terbaca.
    payload: { fold: depth >= 2 && t.children.length ? 1 : 0, cls },
  };
}

/**
 * Tab Peta pikiran: hutan rentang graf sebagai mind map (pustaka markmap-view)
 * — cabang bisa dilipat dengan klik lingkaran, warna cabang mengikuti jenis
 * node. Rujukan silang tidak digambar (mind map = pohon); lihat tab Daftar.
 */
export function SitemapMindmap({ graph, title }: { graph: SitemapGraph; title: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | null = null;
    (async () => {
      const { Markmap } = await import("markmap-view");
      if (cancelled || !ref.current) return;
      const forest = buildSpanningForest(graph);
      const roots = forest.roots.map((r) => toMm(r, 1));
      const data: MmNode = roots.length === 1 ? roots[0] : { content: `<strong>${esc(title)}</strong>`, children: roots, payload: { fold: 0, cls: "menu" } };
      const mm = Markmap.create(
        ref.current,
        {
          autoFit: true,
          duration: 200,
          // Roda mouse harus tetap menggulir halaman (banyak kanvas per halaman): zoom roda dimatikan,
          // geser dengan menyeret; autoFit menampung seluruh peta.
          zoom: false,
          pan: true,
          maxInitialScale: 1.2,
          maxWidth: 320,
          spacingHorizontal: 60,
          spacingVertical: 6,
          paddingX: 10,
          color: (n) => SITEMAP_CLASS_STYLE[(n.payload as { cls?: string } | undefined)?.cls ?? ""]?.stroke ?? "#64748b",
        },
        data
      );
      destroy = () => mm.destroy();
    })();
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [graph, title]);

  return (
    <div className="overflow-hidden rounded-lg border bg-card" style={{ height: canvasHeight(graph.nodes.length) }}>
      <svg ref={ref} className="h-full w-full text-foreground" style={{ color: "var(--foreground)", ["--markmap-font" as string]: "500 13px/18px var(--font-sans)" } as React.CSSProperties} />
    </div>
  );
}
