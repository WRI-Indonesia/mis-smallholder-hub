"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import {
  SITEMAP_CLASS_STYLE,
  primaryClass,
  type SitemapGraph,
  type SitemapNode,
  type SitemapShape,
} from "@/lib/sitemap-mermaid";

type FlowNodeData = {
  lines: string[];
  shape: SitemapShape;
  cls: string;
  dashed: boolean;
};

/** Lebar/tinggi node ditaksir dari teksnya — dagre butuh ukuran sebelum render. */
function estimateSize(n: SitemapNode): { width: number; height: number } {
  const longest = Math.max(...n.lines.map((l) => l.length), 4);
  const cls = primaryClass(n);
  const charW = cls === "content" ? 6.4 : 7.2;
  const width = Math.min(440, Math.max(120, Math.round(longest * charW) + 36));
  // Baris panjang melipat di lebar maksimum.
  const wrapped = n.lines.reduce((acc, l) => acc + Math.max(1, Math.ceil((l.length * charW) / (width - 36))), 0);
  const height = wrapped * 18 + 22;
  // Bentuk ber-clip-path memotong sudut — beri ruang ekstra agar teks tidak terpotong.
  if (n.shape === "diamond") return { width: Math.round(width * 1.7), height: Math.round(height * 2.2) };
  if (n.shape === "hexagon") return { width: width + 48, height: height + 8 };
  if (n.shape === "parallelogram") return { width: width + 32, height };
  return { width, height };
}

function layout(graph: SitemapGraph): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 18, ranksep: 70, marginx: 12, marginy: 12 });
  const sizes = new Map(graph.nodes.map((n) => [n.id, estimateSize(n)]));
  // dagre menyusun node terakhir di atas; dibalik agar urutan dokumen
  // (Header dulu, lalu kartu, tabel, …) terbaca dari atas ke bawah.
  for (const n of [...graph.nodes].reverse()) g.setNode(n.id, sizes.get(n.id)!);
  for (const e of [...graph.edges].reverse()) g.setEdge(e.source, e.target);
  dagre.layout(g);

  const nodes: Node<FlowNodeData>[] = graph.nodes.map((n) => {
    const pos = g.node(n.id);
    const size = sizes.get(n.id)!;
    const cls = primaryClass(n);
    return {
      id: n.id,
      type: "sitemap",
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
      width: size.width,
      height: size.height,
      data: {
        lines: n.lines,
        shape: n.shape,
        cls,
        dashed: n.classes.includes("proto") || n.classes.includes("planned"),
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    label: e.label,
    animated: e.kind === "thick",
    style: {
      strokeWidth: e.kind === "thick" ? 2.5 : 1.5,
      strokeDasharray: e.kind === "dotted" ? "5 4" : undefined,
      stroke: "var(--muted-foreground)",
    },
    labelStyle: { fontSize: 11, fill: "var(--foreground)" },
    labelBgStyle: { fill: "var(--card)", fillOpacity: 0.9 },
    labelBgPadding: [4, 2],
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--muted-foreground)", width: 16, height: 16 },
  }));

  return { nodes, edges };
}

const SHAPE_CLASS: Record<SitemapShape, string> = {
  stadium: "rounded-full px-5",
  subroutine: "rounded-sm border-double border-4",
  rect: "rounded-md",
  rounded: "rounded-xl",
  hexagon: "rounded-md [clip-path:polygon(10%_0,90%_0,100%_50%,90%_100%,10%_100%,0_50%)] px-6",
  diamond: "rounded-lg [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)] px-8 py-4",
  cylinder: "rounded-[14px] border-t-4",
  parallelogram: "rounded-sm [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)] px-5",
};

function SitemapFlowNode({ data, width, height }: NodeProps<Node<FlowNodeData>>) {
  const style = SITEMAP_CLASS_STYLE[data.cls] ?? SITEMAP_CLASS_STYLE.content;
  const bold = data.cls === "menu" || data.cls === "page";
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center border px-3 py-2 text-[12px] leading-[18px] shadow-sm",
        SHAPE_CLASS[data.shape],
        data.cls === "content" ? "items-start justify-start text-left" : "text-center",
        bold && "font-semibold",
        data.dashed && "border-dashed"
      )}
      style={{
        width,
        height,
        background: style.fill,
        borderColor: style.stroke,
        color: style.color,
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-muted-foreground" />
      <div className="whitespace-pre-wrap break-words">{data.lines.join("\n")}</div>
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-muted-foreground" />
    </div>
  );
}

const nodeTypes = { sitemap: SitemapFlowNode };

/**
 * Tab React Flow Peta Fitur: graf hasil parser subset (`sitemap-mermaid.ts`)
 * ditata dagre kiri → kanan (Page → Section → Content), bentuk & warna node
 * mengikuti palet `legend.md` — sama dengan tab Mermaid, hanya mesin gambarnya
 * yang berbeda (pola kanvas Peta Data & Skema).
 */
export function SitemapFlow({ graph, dark }: { graph: SitemapGraph; dark: boolean }) {
  const { nodes, edges } = useMemo(() => layout(graph), [graph]);
  const height = Math.min(820, Math.max(320, 160 + graph.nodes.length * 26));
  return (
    <div className="overflow-hidden rounded-lg border bg-card" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={dark ? "dark" : "light"}
        fitView
        fitViewOptions={{ padding: 0.1, maxZoom: 1.2 }}
        minZoom={0.15}
        // Halaman berisi banyak kanvas: roda mouse harus tetap menggulir halaman,
        // zoom lewat tombol +/− atau cubit trackpad.
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
        zoomOnPinch
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        {graph.nodes.length > 14 ? <MiniMap pannable zoomable className="!bg-card" /> : null}
      </ReactFlow>
    </div>
  );
}
