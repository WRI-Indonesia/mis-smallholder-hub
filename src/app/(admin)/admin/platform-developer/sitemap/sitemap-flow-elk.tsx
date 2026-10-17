"use client";

import { useEffect, useState } from "react";
import type { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api";
import { Loader2 } from "lucide-react";
import type { SitemapGraph } from "@/lib/sitemap-mermaid";
import { estimateEdgeLabelSize, estimateNodeSize } from "@/lib/sitemap-layout";
import { SitemapCanvas } from "./sitemap-canvas";
import { toFlowEdge, toFlowNode, type Point, type SitemapFlowEdgeType, type SitemapFlowNodeType } from "./sitemap-flow-shared";

type Laid = { nodes: SitemapFlowNodeType[]; edges: SitemapFlowEdgeType[] };

const ELK_OPTIONS: Record<string, string> = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.layered.spacing.edgeNodeBetweenLayers": "24",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "14",
  "elk.spacing.nodeNode": "28",
  "elk.spacing.edgeNode": "24",
  "elk.spacing.edgeEdge": "14",
  "elk.spacing.edgeLabel": "6",
  "elk.edgeLabels.inline": "true",
  "elk.padding": "[top=12,left=12,bottom=12,right=12]",
};

async function layout(graph: SitemapGraph): Promise<Laid> {
  // Bundel satu berkas di main thread: graf sitemap kecil (≤ 25 node), tak perlu worker.
  const { default: ELK } = await import("elkjs/lib/elk.bundled.js");
  const elk = new ELK();
  const sizes = new Map(graph.nodes.map((n) => [n.id, estimateNodeSize(n)]));
  const root: ElkNode = {
    id: "root",
    layoutOptions: ELK_OPTIONS,
    children: graph.nodes.map((n) => ({ id: n.id, ...sizes.get(n.id)! })),
    edges: graph.edges.map<ElkExtendedEdge>((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
      labels: e.label ? [{ id: `${e.id}-l`, text: e.label, ...estimateEdgeLabelSize(e.label) }] : undefined,
    })),
  };
  const out = await elk.layout(root);
  const posOf = new Map((out.children ?? []).map((c) => [c.id, c]));
  const nodes = graph.nodes.map((n) => {
    const c = posOf.get(n.id)!;
    return toFlowNode(n, { x: c.x ?? 0, y: c.y ?? 0 }, sizes.get(n.id)!);
  });
  const edgeOf = new Map((out.edges ?? []).map((e) => [e.id, e]));
  const edges = graph.edges.map((e) => {
    const le = edgeOf.get(e.id);
    const sec = le?.sections?.[0];
    const points: Point[] | undefined = sec ? [sec.startPoint, ...(sec.bendPoints ?? []), sec.endPoint] : undefined;
    const lbl = le?.labels?.[0];
    return toFlowEdge(e, {
      points,
      curve: "ortho",
      labelX: lbl?.x !== undefined ? lbl.x + (lbl.width ?? 0) / 2 : undefined,
      labelY: lbl?.y !== undefined ? lbl.y + (lbl.height ?? 0) / 2 : undefined,
    });
  });
  return { nodes, edges };
}

/**
 * Tab React Flow ELK: tata letak berlapis Eclipse Layout Kernel dengan rute
 * edge **ortogonal** — garis sejajar diberi jarak, label mendapat ruang di
 * ruas garisnya, edge tidak menembus node. Tata letak dihitung asinkron saat
 * kartu dipasang.
 */
export function SitemapFlowElk({ graph, dark }: { graph: SitemapGraph; dark: boolean }) {
  // Hasil dikunci ke graf asalnya: graf baru → otomatis "menata" tanpa setState di badan efek.
  const [done, setDone] = useState<{ graph: SitemapGraph; result: Laid | { error: string } } | null>(null);
  const laid = done && done.graph === graph ? done.result : null;
  useEffect(() => {
    let cancelled = false;
    layout(graph)
      .then((r) => {
        if (!cancelled) setDone({ graph, result: r });
      })
      .catch((err: unknown) => {
        if (!cancelled) setDone({ graph, result: { error: err instanceof Error ? err.message : String(err) } });
      });
    return () => {
      cancelled = true;
    };
  }, [graph]);

  if (!laid)
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Menata diagram (ELK)…
      </div>
    );
  if ("error" in laid) return <p className="text-sm text-destructive">Tata letak ELK gagal: {laid.error}</p>;
  return <SitemapCanvas nodes={laid.nodes} edges={laid.edges} dark={dark} />;
}
