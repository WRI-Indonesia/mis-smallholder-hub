"use client";

import { useEffect, useRef, useState } from "react";
import type { Core } from "cytoscape";
import { Loader2, Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITEMAP_CLASS_STYLE, primaryClass, type SitemapGraph, type SitemapShape } from "@/lib/sitemap-mermaid";
import { estimateNodeSize } from "@/lib/sitemap-layout";
import { canvasHeight } from "./sitemap-flow-shared";

const CY_SHAPE: Record<SitemapShape, string> = {
  stadium: "round-rectangle",
  subroutine: "rectangle",
  rect: "rectangle",
  rounded: "round-rectangle",
  hexagon: "hexagon",
  diamond: "diamond",
  cylinder: "barrel",
  parallelogram: "rhomboid",
};

let fcoseRegistered = false;

/**
 * Tab Jaringan: tata letak gaya-pegas fCoSE (cytoscape) — node yang saling
 * terhubung saling mendekat, jadi hubungan lintas cabang (rujukan silang,
 * alur lintas menu) menonjol; bukan untuk membaca urutan, melainkan kerapatan
 * hubungan. Roda mouse tetap menggulir halaman; zoom lewat tombol.
 */
export function SitemapNetwork({ graph, dark }: { graph: SitemapGraph; dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  // Siap dikunci ke graf asalnya: graf baru → otomatis "menata" tanpa setState di badan efek.
  const [readyFor, setReadyFor] = useState<SitemapGraph | null>(null);
  const ready = readyFor === graph;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ default: cytoscape }, { default: fcose }] = await Promise.all([import("cytoscape"), import("cytoscape-fcose")]);
      if (cancelled || !ref.current) return;
      if (!fcoseRegistered) {
        cytoscape.use(fcose);
        fcoseRegistered = true;
      }
      const labelBg = dark ? "#0f172a" : "#ffffff";
      const cy = cytoscape({
        container: ref.current,
        userZoomingEnabled: false,
        boxSelectionEnabled: false,
        autounselectify: true,
        elements: [
          ...graph.nodes.map((n) => {
            const cls = primaryClass(n);
            const s = SITEMAP_CLASS_STYLE[cls] ?? SITEMAP_CLASS_STYLE.content;
            // Ukuran eksplisit (nilai `label` untuk width/height sudah usang di cytoscape 3.34).
            const size = estimateNodeSize({ ...n, lines: n.lines.slice(0, 2) });
            return {
              data: {
                id: n.id,
                w: Math.min(size.width, 200),
                h: Math.min(size.height, 60),
                label: n.lines.length > 2 ? `${n.lines[0]}\n…(+${n.lines.length - 1})` : n.lines.join("\n"),
                shape: CY_SHAPE[n.shape],
                fill: s.fill,
                stroke: s.stroke,
                color: s.color,
                borderStyle: n.classes.includes("proto") || n.classes.includes("planned") ? "dashed" : "solid",
                weight: cls === "menu" || cls === "page" ? "bold" : "normal",
              },
            };
          }),
          ...graph.edges.map((e) => ({
            data: {
              id: e.id,
              source: e.source,
              target: e.target,
              label: e.label ?? "",
              lineStyle: e.kind === "dotted" ? "dashed" : "solid",
              width: e.kind === "thick" ? 2.5 : 1.2,
            },
          })),
        ],
        style: [
          {
            selector: "node",
            style: {
              shape: "data(shape)" as never,
              "background-color": "data(fill)",
              "border-color": "data(stroke)",
              "border-width": 1.5,
              "border-style": "data(borderStyle)" as never,
              label: "data(label)",
              color: "data(color)",
              "font-size": 10,
              "font-weight": "data(weight)" as never,
              "text-wrap": "wrap",
              "text-max-width": "160",
              "text-valign": "center",
              "text-halign": "center",
              width: "data(w)",
              height: "data(h)",
            } as never,
          },
          {
            selector: "edge",
            style: {
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "arrow-scale": 0.8,
              "line-color": "#94a3b8",
              "target-arrow-color": "#94a3b8",
              "line-style": "data(lineStyle)" as never,
              width: "data(width)",
              label: "data(label)",
              "font-size": 9,
              color: dark ? "#e2e8f0" : "#334155",
              "text-background-color": labelBg,
              "text-background-opacity": 0.9,
              "text-background-padding": "2px",
              "text-rotation": "autorotate",
            } as never,
          },
        ],
        layout: {
          name: "fcose",
          animate: false,
          randomize: true,
          quality: "proof",
          nodeSeparation: 90,
          idealEdgeLength: () => 110,
          nodeRepulsion: () => 7000,
          padding: 16,
        } as never,
      });
      cyRef.current = cy;
      setReadyFor(graph);
    })();
    return () => {
      cancelled = true;
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [graph, dark]);

  const zoom = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card" style={{ height: canvasHeight(graph.nodes.length) }}>
      <div ref={ref} className="h-full w-full" />
      {!ready ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Menata jaringan…
        </div>
      ) : null}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1">
        <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Perbesar" onClick={() => zoom(1.25)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Perkecil" onClick={() => zoom(0.8)}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Muat seluruh diagram" onClick={() => cyRef.current?.fit(undefined, 16)}>
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
