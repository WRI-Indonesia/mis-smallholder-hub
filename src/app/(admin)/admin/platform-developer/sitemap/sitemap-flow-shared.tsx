"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { line as d3Line, curveBasis } from "d3-shape";
import { cn } from "@/lib/utils";
import { SITEMAP_CLASS_STYLE, primaryClass, type SitemapEdge, type SitemapNode, type SitemapShape } from "@/lib/sitemap-mermaid";
import type { NodeSize } from "@/lib/sitemap-layout";

/**
 * Bagian bersama tiga kanvas React Flow Peta Fitur (dagre · ELK · Kolom per
 * jenis): node berbentuk & berwarna palet `legend.md`, edge kustom yang
 * menggambar rute dari titik-titik hasil mesin tata letak (bukan garis
 * smoothstep bawaan yang menembus node dan menumpuk di satu batang), dan
 * pembuat edge/node dari graf parser.
 */

export type FlowNodeData = {
  lines: string[];
  shape: SitemapShape;
  cls: string;
  dashed: boolean;
};

export type Point = { x: number; y: number };

export type FlowEdgeData = {
  /** Titik rute dari mesin tata letak (termasuk ujung di tepi node). Kosong → garis bezier bawaan React Flow. */
  points?: Point[];
  /** `basis` = spline halus (dagre, seperti Mermaid) · `ortho` = siku membulat (ELK). */
  curve?: "basis" | "ortho";
  /** Pusat label bila mesin tata letak menyisakan ruang untuknya. */
  labelX?: number;
  labelY?: number;
};

export type SitemapFlowNodeType = Node<FlowNodeData, "sitemap">;
export type SitemapFlowEdgeType = Edge<FlowEdgeData, "sitemap">;

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

export function SitemapFlowNode({ data, width, height }: NodeProps<SitemapFlowNodeType>) {
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
      style={{ width, height, background: style.fill, borderColor: style.stroke, color: style.color }}
    >
      {/* Handle wajib ada agar React Flow mau merender edge; rutenya digambar SitemapFlowEdge dari titik mesin tata letak. */}
      <Handle type="target" position={Position.Left} className="!h-1 !w-1 !border-0 !opacity-0" />
      <div className="whitespace-pre-wrap break-words">{data.lines.join("\n")}</div>
      <Handle type="source" position={Position.Right} className="!h-1 !w-1 !border-0 !opacity-0" />
    </div>
  );
}

/** Judul kolom pada tab Kolom per jenis — node pasif di atas tiap kolom. */
export function ColumnHeaderNode({ data, width }: NodeProps<Node<{ label: string; cls: string }, "column-header">>) {
  const style = SITEMAP_CLASS_STYLE[data.cls] ?? SITEMAP_CLASS_STYLE.content;
  return (
    <div
      className="flex h-7 items-center justify-center rounded-md border text-[11px] font-semibold uppercase tracking-wide"
      style={{ width, background: style.fill, borderColor: style.stroke, color: style.color }}
    >
      {data.label}
    </div>
  );
}

const basisLine = d3Line<Point>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveBasis);

/** Polyline siku dengan sudut membulat (radius ≤ 8 px, mengecil bila ruasnya pendek). */
function orthoPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const r = Math.min(8, Math.hypot(cur.x - prev.x, cur.y - prev.y) / 2, Math.hypot(next.x - cur.x, next.y - cur.y) / 2);
    const inDir = { x: Math.sign(cur.x - prev.x), y: Math.sign(cur.y - prev.y) };
    const outDir = { x: Math.sign(next.x - cur.x), y: Math.sign(next.y - cur.y) };
    d += ` L ${cur.x - inDir.x * r} ${cur.y - inDir.y * r}`;
    d += ` Q ${cur.x} ${cur.y} ${cur.x + outDir.x * r} ${cur.y + outDir.y * r}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** Titik tengah sepanjang polyline (untuk label bila mesin tak memberi posisi). */
function midpoint(points: Point[]): Point {
  let total = 0;
  const segs: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    segs.push(len);
    total += len;
  }
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= total / 2) {
      const t = segs[i] === 0 ? 0 : (total / 2 - acc) / segs[i];
      return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t };
    }
    acc += segs[i];
  }
  return points[points.length - 1];
}

export function SitemapFlowEdge({
  id,
  data,
  label,
  markerEnd,
  style,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: EdgeProps<SitemapFlowEdgeType>) {
  let path: string;
  let mid: Point;
  if (data?.points && data.points.length >= 2) {
    const points = data.points;
    path = data.curve === "ortho" ? orthoPath(points) : (basisLine(points) ?? "");
    mid = data.labelX !== undefined && data.labelY !== undefined ? { x: data.labelX, y: data.labelY } : midpoint(points);
  } else {
    // Tanpa titik rute (tab Kolom): kurva bezier React Flow yang keluar/masuk sesuai sisi handle —
    // garis lurus dua titik akan menembus node untuk edge mundur/lompat kolom (review 2026-10-17).
    const [d, lx, ly] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    path = d;
    mid = { x: lx, y: ly };
  }
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded border bg-card/95 px-1 text-[11px] leading-4 text-foreground"
            style={{ transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const sitemapNodeTypes = { sitemap: SitemapFlowNode, "column-header": ColumnHeaderNode };
export const sitemapEdgeTypes = { sitemap: SitemapFlowEdge };

export function toFlowNode(n: SitemapNode, pos: Point, size: NodeSize): SitemapFlowNodeType {
  return {
    id: n.id,
    type: "sitemap",
    position: pos,
    width: size.width,
    height: size.height,
    data: {
      lines: n.lines,
      shape: n.shape,
      cls: primaryClass(n),
      dashed: n.classes.includes("proto") || n.classes.includes("planned"),
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: false,
  };
}

export function toFlowEdge(e: SitemapEdge, data: FlowEdgeData = {}): SitemapFlowEdgeType {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: "sitemap",
    label: e.label,
    animated: e.kind === "thick",
    data,
    style: {
      strokeWidth: e.kind === "thick" ? 2.5 : 1.5,
      strokeDasharray: e.kind === "dotted" ? "5 4" : undefined,
      stroke: "var(--muted-foreground)",
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--muted-foreground)", width: 16, height: 16 },
  };
}

/** Tinggi kanvas mengikuti jumlah node, dibatasi agar halaman tetap bisa digulir. */
export function canvasHeight(nodeCount: number): number {
  return Math.min(820, Math.max(320, 160 + nodeCount * 26));
}
