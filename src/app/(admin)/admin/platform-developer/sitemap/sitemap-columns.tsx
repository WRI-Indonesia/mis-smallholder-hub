"use client";

import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import type { SitemapGraph } from "@/lib/sitemap-mermaid";
import { columnLayout } from "@/lib/sitemap-layout";
import { SitemapCanvas } from "./sitemap-canvas";
import { toFlowEdge, toFlowNode, type SitemapFlowEdgeType } from "./sitemap-flow-shared";

/** Nama kolom (sama dengan legenda). */
const COLUMN_LABEL: Record<string, string> = {
  menu: "Menu",
  sub: "Sub menu",
  page: "Halaman",
  section: "Bagian",
  content: "Isi",
  dialog: "Dialog",
  decision: "Percabangan",
  data: "Data/berkas",
  external: "Layanan luar",
  planned: "Direncanakan",
};

function layout(graph: SitemapGraph): { nodes: Node[]; edges: SitemapFlowEdgeType[] } {
  const lay = columnLayout(graph);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const headers: Node[] = lay.columns.map((c) => ({
    id: `col-${c.cls}`,
    type: "column-header",
    position: { x: c.x, y: 0 },
    width: c.width,
    height: 28,
    data: { label: COLUMN_LABEL[c.cls] ?? c.cls, cls: c.cls },
    draggable: false,
    selectable: false,
  }));
  const nodes: Node[] = lay.nodes.map((p) => toFlowNode(byId.get(p.id)!, { x: p.x, y: p.y }, { width: p.width, height: p.height }));
  // Tanpa titik rute: garis bezier bawaan kanan → kiri antar kolom; label di tengah garis.
  const edges = graph.edges.map((e) => toFlowEdge(e, { curve: "basis" }));
  return { nodes: [...headers, ...nodes], edges };
}

/**
 * Tab Kolom per jenis: setiap jenis node punya kolom tetap (Menu · Sub menu ·
 * Halaman · Bagian · Isi · …) sehingga tingkat hierarki terbaca dari posisi
 * horizontal; urutan dalam kolom mengikuti rata-rata posisi induknya agar
 * garis sesedikit mungkin bersilang.
 */
export function SitemapColumns({ graph, dark }: { graph: SitemapGraph; dark: boolean }) {
  const { nodes, edges } = useMemo(() => layout(graph), [graph]);
  return <SitemapCanvas nodes={nodes} edges={edges} dark={dark} nodeCount={graph.nodes.length} />;
}
