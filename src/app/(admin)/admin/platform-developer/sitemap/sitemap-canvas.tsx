"use client";

import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { canvasHeight, sitemapEdgeTypes, sitemapNodeTypes } from "./sitemap-flow-shared";

/**
 * Pembungkus React Flow yang sama untuk ketiga kanvas Peta Fitur: roda mouse
 * tetap menggulir halaman (banyak kanvas per halaman), zoom lewat +/− atau
 * cubit, node tidak bisa dihubungkan/dipilih, peta mini hanya pada diagram besar.
 */
export function SitemapCanvas({ nodes, edges, dark, nodeCount }: { nodes: Node[]; edges: Edge[]; dark: boolean; /** Jumlah node diagram (tanpa node pembantu seperti judul kolom) untuk tinggi & ambang peta mini. */ nodeCount?: number }) {
  const count = nodeCount ?? nodes.length;
  const h = canvasHeight(count);
  return (
    <div className="overflow-hidden rounded-lg border bg-card" style={{ height: h }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={sitemapNodeTypes}
        edgeTypes={sitemapEdgeTypes}
        colorMode={dark ? "dark" : "light"}
        fitView
        fitViewOptions={{ padding: 0.08, maxZoom: 1.2 }}
        minZoom={0.1}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
        zoomOnPinch
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        {count > 14 ? <MiniMap pannable zoomable className="!bg-card" /> : null}
      </ReactFlow>
    </div>
  );
}
