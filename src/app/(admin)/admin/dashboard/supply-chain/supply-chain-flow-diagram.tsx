"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Panel,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPct } from "@/lib/format";
import { CHANNEL_LABEL, SANKEY_COLUMNS, layoutSankey, sankeyLinkKey, type SankeyGraph, type SankeyNode, type SupplyChannel } from "@/lib/supply-chain-flow";
import { dodgeLabels, spreadEdgeEnds } from "@/lib/supply-chain-views";
import { channelColor, isFilterableNode, isGroupNode, useChartDark, type SankeyUnit } from "./supply-chain-sankey";

/**
 * Tab Diagram Alur (owner 2026-10-09): graf yang sama dengan Sankey, digambar
 * sebagai bagan alir — kotak per node, garis beranimasi ke arah aliran TBS, tebal
 * garis ∝ tonase. Kotak berukuran sama (tidak ∝ tonase) dan angka tertulis di
 * kotaknya, jadi pembaca tidak perlu menaksir tebal pita yang saling menimpa.
 * React Flow dipakai karena butuh geser/zoom (pola kanvas Peta Data & Skema).
 */

const NODE_W = 230;
const NODE_H = 46;
const ROW_GAP = 10;
const COL_GAP = 170;
/**
 * Kanvas setinggi isinya dan zoom bawah 0,8: lebih baik halaman digulir daripada
 * seluruh diagram dimuatkan satu layar tapi nama Lembaga tak terbaca (percobaan
 * pertama: 28 Lembaga → zoom ~0,45).
 */
const FIT_VIEW = { padding: 0.04, minZoom: 0.8, maxZoom: 1 } as const;
const fmtTon = (n: number) => `${formatNumber(Math.round(n))} t`;

type FlowNodeData = {
  node: SankeyNode;
  valueText: string;
  dimmed: boolean;
  active: boolean;
  clickable: boolean;
};

function FlowNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const n = d.node;
  const accent =
    n.millStatus === "TIDAK_DIKETAHUI" || n.id.startsWith("X:")
      ? "border-l-muted-foreground/40"
      : isGroupNode(n) || n.id.startsWith("U:") || n.id.startsWith("D:")
        ? "border-l-primary"
        : "border-l-foreground/60";
  return (
    <div
      className={cn(
        "flex h-[46px] w-[230px] flex-col justify-center rounded-md border border-l-4 bg-card px-2.5 shadow-sm transition-opacity",
        accent,
        d.active ? "ring-2 ring-primary/50" : "border-border/70",
        n.millStatus === "PKS_BELUM_PASTI" && "border-dashed",
        d.dimmed && "opacity-25",
        d.clickable && "cursor-pointer",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-1 !w-1 !min-h-0 !min-w-0 !border-0 !bg-transparent" isConnectable={false} />
      <div className="flex items-baseline gap-1 text-xs leading-tight">
        <span className="truncate font-medium">{n.label}</span>
        {n.isUl && <span className="shrink-0 font-semibold text-primary">UL</span>}
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px] leading-tight text-muted-foreground">
        <span className="truncate">{n.sub}</span>
        <span className="shrink-0 font-medium tabular-nums text-foreground">{d.valueText}</span>
      </div>
      <Handle type="source" position={Position.Right} className="!h-1 !w-1 !min-h-0 !min-w-0 !border-0 !bg-transparent" isConnectable={false} />
    </div>
  );
}

type FlowEdgeData = {
  color: string;
  width: number;
  dimmed: boolean;
  lit: boolean;
  animate: boolean;
  label: string | null;
  /** Ujung garis digeser sepanjang sisi kotak (`spreadEdgeEnds`). */
  sourceOffset: number;
  targetOffset: number;
  /** Posisi label sesudah dihindarkan dari label lain (`dodgeLabels`). */
  labelX: number;
  labelY: number;
};

function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps) {
  const d = data as unknown as FlowEdgeData;
  const [path] = getBezierPath({ sourceX, sourceY: sourceY + d.sourceOffset, targetX, targetY: targetY + d.targetOffset, sourcePosition, targetPosition });
  const base = d.dimmed ? 0.06 : d.lit ? 0.45 : 0.28;
  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: d.color, strokeWidth: d.width, strokeOpacity: base, strokeLinecap: "round" }} interactionWidth={Math.max(d.width, 12)} />
      {!d.dimmed && (
        <path
          d={path}
          fill="none"
          stroke={d.color}
          strokeWidth={Math.max(1.5, d.width * 0.45)}
          strokeOpacity={d.lit ? 1 : 0.85}
          strokeDasharray="2 14"
          strokeLinecap="round"
          className={cn("pointer-events-none", d.animate && "sc-flow-dash")}
        />
      )}
      {d.label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded border bg-popover px-1.5 py-0.5 text-[10px] font-medium tabular-nums shadow-sm"
            style={{ transform: `translate(-50%, -50%) translate(${d.labelX}px, ${d.labelY}px)` }}
          >
            {d.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/** Judul kolom — node non-interaktif di atas tiap kolom, ikut tergeser/ter-zoom. */
function HeaderNode({ data }: NodeProps) {
  return <div className="w-[230px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{(data as { title: string }).title}</div>;
}

const nodeTypes = { sc: FlowNode, hdr: HeaderNode };
const edgeTypes = { sc: FlowEdge };

export function SupplyChainFlowDiagram({ graph, unit, onSelectNode }: { graph: SankeyGraph; unit: SankeyUnit; onSelectNode: (n: SankeyNode) => void }) {
  const dark = useChartDark();
  const [selected, setSelected] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [animate, setAnimate] = useState(true);
  // `fitView` (prop) hanya berlaku saat inisialisasi → pasang ulang viewport tiap graf
  // berubah dengan tinggi kanvas sama (filter); tinggi berubah ditangani `key` ReactFlow.
  const instance = useRef<ReactFlowInstance | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => instance.current?.fitView(FIT_VIEW));
    return () => cancelAnimationFrame(id);
  }, [graph]);
  const total = graph.totalTon;
  const fmtValue = useCallback((v: number) => (unit === "PCT" ? `${total > 0 ? formatPct((v / total) * 100) : "0"}%` : fmtTon(v)), [unit, total]);

  // Urutan node per kolom = urutan barycenter Sankey (persilangan minimum); posisi kotak seragam.
  const placed = useMemo(() => {
    const layout = layoutSankey(graph, { width: 1000, height: 1000 });
    const cols = [...new Set(layout.nodes.map((n) => n.column))].sort((a, b) => a - b);
    const byCol = cols.map((c) => layout.nodes.filter((n) => n.column === c).sort((a, b) => a.y0 - b.y0));
    const tallest = Math.max(...byCol.map((c) => c.length));
    const span = tallest * (NODE_H + ROW_GAP) - ROW_GAP;
    const pos = new Map<string, { x: number; y: number }>();
    // Kolom yang lebih pendek disebar rata sepanjang kolom terpanjang (bukan ditumpuk di
    // tengah) — garis jadi landai dan tidak berkerumun di satu titik.
    byCol.forEach((nodes, ci) => {
      const slot = span / nodes.length;
      nodes.forEach((n, ri) => pos.set(n.id, { x: ci * (NODE_W + COL_GAP), y: nodes.length === tallest ? ri * (NODE_H + ROW_GAP) : slot * ri + (slot - NODE_H) / 2 }));
    });
    return { pos, cols, tallest };
  }, [graph]);

  const sel = selected ? graph.nodes.find((n) => n.id === selected) ?? null : null;
  const lit = useMemo(() => {
    if (!sel) return null;
    // Tonase per garis yang LEWAT node terpilih — label garis menyala menunjukkan porsi
    // jalur ini, bukan total garis (garis Agen → Mill lain bisa memuat banyak Lembaga).
    const links = new Map<string, number>();
    const nodes = new Set<string>();
    let ton = 0;
    for (const p of graph.paths) {
      if (!p.nodes.includes(sel.id)) continue;
      p.links.forEach((k) => links.set(k, (links.get(k) ?? 0) + p.ton));
      p.nodes.forEach((n) => nodes.add(n));
      ton += p.ton;
    }
    return { links, nodes, ton };
  }, [sel, graph.paths]);

  const columnTitle = useCallback(
    (c: number) =>
      c === 0 && graph.nodes.some((n) => n.id.startsWith("D:"))
        ? "Distrik"
        : c === 3 && graph.nodes.some((n) => n.id.startsWith("U:"))
          ? "UL / Non-UL"
          : c === 1
            ? "Offtaker · Agen · RAMP · KT/Koperasi"
            : SANKEY_COLUMNS[c],
    [graph.nodes],
  );

  const nodes: Node[] = useMemo(
    () => [
      ...placed.cols.map((c, ci) => ({
        id: `hdr:${c}`,
        type: "hdr",
        position: { x: ci * (NODE_W + COL_GAP), y: -34 },
        data: { title: columnTitle(c) },
        selectable: false,
        focusable: false,
      })),
      ...graph.nodes.map((n) => ({
        id: n.id,
        type: "sc",
        position: placed.pos.get(n.id) ?? { x: 0, y: 0 },
        data: {
          node: n,
          valueText: fmtValue(n.value),
          dimmed: !!lit && !lit.nodes.has(n.id),
          active: selected === n.id,
          clickable: true,
        } satisfies FlowNodeData,
      })),
    ],
    [graph.nodes, placed, fmtValue, lit, selected, columnTitle],
  );

  const maxLink = Math.max(1, ...graph.links.map((l) => l.value));
  const ends = useMemo(() => {
    const keyed = graph.links.map((l) => ({ ...l, key: sankeyLinkKey(l) }));
    return spreadEdgeEnds(keyed, (id) => placed.pos.get(id)?.y ?? 0, NODE_H - 16);
  }, [graph.links, placed]);

  // Label hanya untuk garis menyala / disorot kursor; posisinya titik tengah kurva
  // (setelah ujungnya disebar) lalu dihindarkan dari label lain di celah kolom yang sama.
  const labels = useMemo(() => {
    const items: { key: string; x: number; y: number }[] = [];
    for (const l of graph.links) {
      const k = sankeyLinkKey(l);
      if (!(lit ? lit.links.has(k) : hoverEdge === k)) continue;
      const s = placed.pos.get(l.source);
      const t = placed.pos.get(l.target);
      if (!s || !t) continue;
      const sy = s.y + NODE_H / 2 + (ends.sourceOffset.get(k) ?? 0);
      const ty = t.y + NODE_H / 2 + (ends.targetOffset.get(k) ?? 0);
      items.push({ key: k, x: (s.x + NODE_W + t.x) / 2, y: (sy + ty) / 2 });
    }
    return dodgeLabels(items, 22);
  }, [graph.links, lit, hoverEdge, placed, ends]);

  const edges: Edge[] = useMemo(
    () =>
      graph.links.map((l) => {
        const k = sankeyLinkKey(l);
        const on = !lit || lit.links.has(k);
        const pos = labels.get(k);
        return {
          id: k,
          source: l.source,
          target: l.target,
          type: "sc",
          data: {
            color: channelColor(l.channel as SupplyChannel, dark),
            width: 2 + 14 * Math.sqrt(l.value / maxLink),
            dimmed: !on,
            lit: !!lit && on,
            animate,
            label: !pos ? null : lit ? fmtValue(lit.links.get(k) ?? 0) : fmtValue(l.value),
            sourceOffset: ends.sourceOffset.get(k) ?? 0,
            targetOffset: ends.targetOffset.get(k) ?? 0,
            labelX: pos?.x ?? 0,
            labelY: pos?.y ?? 0,
          } satisfies FlowEdgeData,
        };
      }),
    [graph.links, lit, dark, maxLink, animate, fmtValue, labels, ends],
  );

  if (graph.nodes.length === 0) {
    return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;
  }

  const height = Math.max(placed.tallest * (NODE_H + ROW_GAP) + 80, 360);
  const hovered = hoverEdge ? graph.links.find((l) => sankeyLinkKey(l) === hoverEdge) : undefined;
  const nodeLabel = (id: string) => graph.nodes.find((n) => n.id === id)?.label ?? id;
  const selActionable = sel && (isFilterableNode(sel) || isGroupNode(sel));

  return (
    <div className="space-y-2">
      <style>{`@keyframes sc-flow-dash{to{stroke-dashoffset:-32}}.sc-flow-dash{animation:sc-flow-dash 1.1s linear infinite}@media (prefers-reduced-motion: reduce){.sc-flow-dash{animation:none}}`}</style>
      <p className="text-xs text-muted-foreground">
        Klik kotak untuk menyorot seluruh jalurnya. Tebal garis = tonase, titik bergerak = arah aliran TBS. Seret untuk menggeser; zoom dengan tombol +/− atau
        Ctrl/⌘ + gulir.
      </p>
      <div className="overflow-hidden rounded-lg border border-border/60" style={{ height }}>
        <ReactFlow
          // Tinggi kanvas berubah (mis. Lembaga → Distrik) → pasang ulang: fitView di efek
          // berjalan sebelum React Flow mengukur tinggi baru dan menyisakan viewport lama.
          key={height}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_, n) => {
            if (n.type === "sc") setSelected((cur) => (cur === n.id ? null : n.id));
          }}
          onPaneClick={() => setSelected(null)}
          onEdgeMouseEnter={(_, e) => setHoverEdge(e.id)}
          onEdgeMouseLeave={() => setHoverEdge(null)}
          colorMode={dark ? "dark" : "light"}
          fitView
          fitViewOptions={FIT_VIEW}
          onInit={(inst) => {
            instance.current = inst;
          }}
          minZoom={0.3}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch
          preventScrolling={false}
        >
          <Controls showInteractive={false} />
          <Panel position="top-right" className="!m-2">
            <Button variant="outline" size="sm" className="h-7 gap-1 bg-card text-xs" onClick={() => setAnimate((a) => !a)} aria-pressed={animate}>
              {animate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} Animasi
            </Button>
          </Panel>
          {(sel || hovered) && (
            <Panel position="bottom-right" className="!m-2 max-w-[320px] rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
              {sel ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{sel.label}</div>
                      {sel.sub && <div className="text-muted-foreground">{sel.sub}</div>}
                    </div>
                    <button type="button" onClick={() => setSelected(null)} aria-label="Lepas sorotan" className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 tabular-nums">
                    <span className="font-medium">{fmtTon(sel.value)}</span>
                    <span className="text-muted-foreground"> · {formatPct(total > 0 ? (sel.value / total) * 100 : 0)}% dari total</span>
                  </div>
                  {lit && sel.column !== 3 && lit.ton > 0 && (
                    <div className="mt-1 border-t pt-1 text-muted-foreground">Jalur yang menyala sampai Mill: {fmtTon(lit.ton)}</div>
                  )}
                  {selActionable && (
                    <Button size="sm" variant="secondary" className="mt-2 h-7 w-full text-xs" onClick={() => onSelectNode(sel)}>
                      {isGroupNode(sel) ? "Rinci per offtaker" : "Jadikan filter"}
                    </Button>
                  )}
                </>
              ) : hovered ? (
                <>
                  <div className="font-semibold">
                    {nodeLabel(hovered.source)} → {nodeLabel(hovered.target)}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                    <span className="inline-block h-2 w-3 rounded-sm" style={{ background: channelColor(hovered.channel, dark) }} />
                    {CHANNEL_LABEL[hovered.channel]}
                  </div>
                  <div className="mt-1 tabular-nums">
                    <span className="font-medium">{fmtTon(hovered.value)}</span>
                    <span className="text-muted-foreground"> · {formatPct(total > 0 ? (hovered.value / total) * 100 : 0)}% dari total</span>
                  </div>
                </>
              ) : null}
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
