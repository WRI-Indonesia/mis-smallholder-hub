"use client";

import { useMemo } from "react";
import dagre from "@dagrejs/dagre";
import type { SitemapGraph } from "@/lib/sitemap-mermaid";
import { estimateEdgeLabelSize, estimateNodeSize } from "@/lib/sitemap-layout";
import { SitemapCanvas } from "./sitemap-canvas";
import { toFlowEdge, toFlowNode, type SitemapFlowEdgeType, type SitemapFlowNodeType } from "./sitemap-flow-shared";

function layout(graph: SitemapGraph): { nodes: SitemapFlowNodeType[]; edges: SitemapFlowEdgeType[] } {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: 80, edgesep: 16, marginx: 12, marginy: 12 });
  const sizes = new Map(graph.nodes.map((n) => [n.id, estimateNodeSize(n)]));
  // dagre menyusun node terakhir di atas; dibalik agar urutan dokumen
  // (Header dulu, lalu kartu, tabel, …) terbaca dari atas ke bawah.
  for (const n of [...graph.nodes].reverse()) g.setNode(n.id, sizes.get(n.id)!);
  for (const e of [...graph.edges].reverse()) {
    // Label diberi ukuran supaya dagre menyisakan ruang di tengah edge — label
    // tidak lagi menimpa garis lain (temuan review owner 2026-10-17).
    const lbl = e.label ? { ...estimateEdgeLabelSize(e.label), labelpos: "c" as const } : {};
    g.setEdge(e.source, e.target, lbl, e.id);
  }
  dagre.layout(g);

  const nodes = graph.nodes.map((n) => {
    const pos = g.node(n.id);
    const size = sizes.get(n.id)!;
    return toFlowNode(n, { x: pos.x - size.width / 2, y: pos.y - size.height / 2 }, size);
  });
  // Rute edge = titik dagre (ujung di tepi node, melewati rank antara untuk
  // edge lintas-rank) digambar sebagai spline basis seperti Mermaid; edge
  // fan-out berpencar sejak keluar dari node, tidak menumpuk di satu batang.
  const edges = graph.edges.map((e) => {
    const ge = g.edge(e.source, e.target, e.id);
    return toFlowEdge(e, {
      points: ge?.points,
      curve: "basis",
      labelX: e.label ? ge?.x : undefined,
      labelY: e.label ? ge?.y : undefined,
    });
  });
  return { nodes, edges };
}

/**
 * Tab React Flow (dagre): graf parser ditata dagre kiri → kanan
 * (Page → Section → Content). Mesin tata letaknya sama dengan Mermaid bawaan,
 * jadi bentuknya mirip tab Mermaid tetapi bisa digeser & di-zoom.
 */
export function SitemapFlow({ graph, dark }: { graph: SitemapGraph; dark: boolean }) {
  const { nodes, edges } = useMemo(() => layout(graph), [graph]);
  return <SitemapCanvas nodes={nodes} edges={edges} dark={dark} />;
}
