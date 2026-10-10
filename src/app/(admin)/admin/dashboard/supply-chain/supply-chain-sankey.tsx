"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { formatPct } from "@/lib/format";
import { fmtTon } from "@/lib/supply-chain-format";
import { CATEGORICAL } from "@/lib/chart-palette";
import { cn } from "@/lib/utils";
import {
  CHANNEL_LABEL,
  CHANNEL_ORDER,
  SANKEY_COLUMNS,
  layoutSankey,
  sankeyLinkKey,
  type LaidOutLink,
  type LaidOutNode,
  type SankeyGraph,
  type SankeyNode,
  type SupplyChannel,
} from "@/lib/supply-chain-flow";

const emptySubscribe = () => () => {};

/**
 * Tema gelap yang aman hydration (pola navbar): saat SSR tema belum diketahui,
 * jadi render pertama selalu memakai warna terang, lalu menyesuaikan.
 */
export function useChartDark() {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  return mounted && resolvedTheme === "dark";
}

/** Warna per jalur — slot palet kategorikal tetap 1–4 (entitas = jalur, bukan peringkat). */
export function channelColor(channel: SupplyChannel, dark: boolean) {
  const slot = CATEGORICAL[CHANNEL_ORDER.indexOf(channel)];
  return dark ? slot.dark : slot.light;
}

/** Node yang bisa dipilih sebagai filter: semua kecuali node lipatan "… lain" dan node gabungan Ringkas. */
export const isFilterableNode = (n: SankeyNode) =>
  (n.column === 0 && (!!n.groupCode || n.id.startsWith("D:"))) ||
  (n.column === 1 && (n.id.startsWith("O:") || n.id.startsWith("C:"))) ||
  (n.column === 3 && (n.id.startsWith("M:") || n.id.startsWith("U:")));
/** Node gabungan mode Ringkas — klik = buka mode Detail. */
export const isGroupNode = (n: SankeyNode) => n.id.startsWith("G:");
const NODE_KIND = ["Lembaga", "offtaker", "RAMP", "Mill"] as const;
const nodeKind = (n: SankeyNode) => (n.id.startsWith("D:") ? "Distrik" : n.id.startsWith("U:") ? "kelompok Mill" : n.id.startsWith("C:") ? "rantai" : NODE_KIND[n.column]);

const LABEL_GAP = 6;
const LEFT_MARGIN = 130;
const RIGHT_MARGIN = 270;
const MAX_LABEL = 30;
const clip = (s: string, n = MAX_LABEL) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

type Hover = { kind: "node"; node: LaidOutNode } | { kind: "link"; link: LaidOutLink } | null;

/**
 * Sankey 4 kolom tetap (Lembaga → Agen·KT/Koperasi → RAMP → Mill). Tebal pita =
 * tonase; warna pita = jalur pertama TBS dari petani. Pita boleh melompati
 * kolom (mis. Lembaga langsung ke RAMP atau Mill). Label Lembaga di kiri dan
 * Mill di kanan diagram (tidak menimpa pita); menyorot node/pita menyalakan
 * seluruh jalur hulu-hilir yang melewatinya.
 */
/** Satuan label node: tonase atau persen dari total aliran pada filter aktif. */
export type SankeyUnit = "TON" | "PCT";

export function SupplyChainSankey({
  graph,
  unit = "TON",
  onSelectNode,
}: {
  graph: SankeyGraph;
  unit?: SankeyUnit;
  onSelectNode?: (node: SankeyNode) => void;
}) {
  const dark = useChartDark();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState<Hover>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(entry.contentRect.width, 480)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const maxRows = Math.max(1, ...[0, 1, 2, 3].map((c) => graph.nodes.filter((n) => n.column === c).length));
  const height = Math.min(Math.max(maxRows * 28, 320), 1100);
  const innerW = Math.max(width - LEFT_MARGIN - RIGHT_MARGIN, 200);
  const layout = useMemo(() => layoutSankey(graph, { width: innerW, height, nodeWidth: 14, nodePadding: 10 }), [graph, innerW, height]);
  const colHeaders = [0, 1, 2, 3].map((c) => ({ c, node: layout.nodes.find((n) => n.column === c) })).filter((h) => h.node);

  // Sorotan jalur penuh: semua pita & node pada jalur yang melewati node/pita yang disorot.
  const lit = useMemo(() => {
    if (!hover) return null;
    const key = hover.kind === "link" ? sankeyLinkKey(hover.link) : null;
    const id = hover.kind === "node" ? hover.node.id : null;
    const links = new Set<string>();
    const nodes = new Set<string>();
    for (const p of graph.paths) {
      if ((id && p.nodes.includes(id)) || (key && p.links.includes(key))) {
        p.links.forEach((k) => links.add(k));
        p.nodes.forEach((n) => nodes.add(n));
      }
    }
    return { links, nodes };
  }, [hover, graph.paths]);

  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout.nodes]);
  const total = graph.totalTon;
  const fmtValue = (v: number) => (unit === "PCT" ? `${total > 0 ? formatPct((v / total) * 100) : "0"}%` : fmtTon(v));
  const litTon = useMemo(() => {
    if (!hover || !lit) return 0;
    // Tonase jalur yang menyala = jumlah pita yang masuk ke Mill pada jalur itu.
    return layout.links.filter((l) => lit.links.has(sankeyLinkKey(l)) && nodeById.get(l.target)?.column === 3).reduce((a, l) => a + l.value, 0);
  }, [hover, lit, layout.links, nodeById]);

  if (graph.nodes.length === 0) {
    // Wrapper ber-ref yang SAMA dengan tampilan berisi: elemen yang diamati ResizeObserver
    // (efek sekali pasang) tak boleh terlepas saat hasil filter kosong lalu terisi lagi.
    return (
      <div ref={wrapRef} className="relative w-full">
        <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
    >
      <div className="relative mb-2 h-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {colHeaders.map(({ c, node }) => (
          <span
            key={c}
            className="absolute whitespace-nowrap"
            style={
              c === 0
                ? { left: LEFT_MARGIN + node!.x1, transform: "translateX(-100%)" }
                : c === 3
                  ? { left: LEFT_MARGIN + node!.x0 }
                  : { left: LEFT_MARGIN + node!.x0, transform: "translateX(-40%)" }
            }
          >
            {c === 0 && node!.id.startsWith("D:") ? "Distrik" : c === 3 && layout.nodes.some((n) => n.id.startsWith("U:")) ? "Mill UL / Non-UL" : SANKEY_COLUMNS[c]}
          </span>
        ))}
      </div>
      <svg width={width} height={height + 12} className="block overflow-visible" role="img" aria-label="Diagram Sankey aliran TBS Lembaga ke offtaker dan Mill">
        <g transform={`translate(${LEFT_MARGIN},6)`}>
          <g>
            {layout.links.map((l) => {
              const k = sankeyLinkKey(l);
              const on = !lit || lit.links.has(k);
              return (
                <path
                  key={k}
                  d={l.path}
                  fill="none"
                  stroke={channelColor(l.channel, dark)}
                  strokeWidth={Math.max(l.width, 1)}
                  strokeOpacity={on ? (lit ? 0.8 : 0.42) : 0.06}
                  className="transition-[stroke-opacity] duration-150"
                  onMouseEnter={() => setHover({ kind: "link", link: l })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </g>
          <g>
            {layout.nodes.map((n) => {
              const h = Math.max(n.y1 - n.y0, 1);
              const clickable = !!onSelectNode && (isFilterableNode(n) || isGroupNode(n));
              const on = !lit || lit.nodes.has(n.id);
              const labelLeft = n.column === 0;
              const originMax = n.id.startsWith("D:") ? 18 : 14;
              const outerLabel = n.column === 0 || n.column === 3;
              return (
                <g
                  key={n.id}
                  opacity={on ? 1 : 0.3}
                  className={cn("transition-opacity duration-150", clickable && "cursor-pointer")}
                  onMouseEnter={() => setHover({ kind: "node", node: n })}
                  onMouseLeave={() => setHover(null)}
                  onClick={clickable ? () => onSelectNode!(n) : undefined}
                >
                  <rect x={n.x0 - 4} y={n.y0 - 2} width={n.x1 - n.x0 + 8} height={h + 4} fill="transparent" />
                  <rect
                    x={n.x0}
                    y={n.y0}
                    width={n.x1 - n.x0}
                    height={h}
                    rx={3}
                    className={
                      n.millStatus === "TIDAK_DIKETAHUI" || n.id.startsWith("X:")
                        ? "fill-muted-foreground/40"
                        : n.millStatus === "PKS_BELUM_PASTI"
                          ? "fill-foreground/30 stroke-foreground/70"
                          : isGroupNode(n) || n.id.startsWith("U:") || n.id.startsWith("D:")
                            ? "fill-primary"
                            : "fill-foreground/80"
                    }
                    strokeDasharray={n.millStatus === "PKS_BELUM_PASTI" ? "3 2" : undefined}
                  />
                  <text
                    x={labelLeft ? n.x0 - LABEL_GAP : n.x1 + LABEL_GAP}
                    y={(n.y0 + n.y1) / 2}
                    dy="0.35em"
                    textAnchor={labelLeft ? "end" : "start"}
                    className={cn("fill-foreground", isGroupNode(n) ? "text-[12px] font-semibold" : "text-[11px]")}
                    style={outerLabel ? undefined : { paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3, strokeLinejoin: "round" }}
                  >
                    {clip(n.label, n.column === 0 ? originMax : MAX_LABEL)}
                    {n.isUl && <tspan className="fill-primary font-semibold"> UL</tspan>}
                    <tspan className="fill-muted-foreground"> {fmtValue(n.value)}</tspan>
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-[300px] rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md"
          style={{ left: Math.min(mouse.x + 14, width - 310), top: mouse.y + 14 }}
        >
          {hover.kind === "link" ? (
            <>
              <div className="font-semibold">
                {nodeById.get(hover.link.source)?.label} → {nodeById.get(hover.link.target)?.label}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block h-2 w-3 rounded-sm" style={{ background: channelColor(hover.link.channel, dark) }} />
                {CHANNEL_LABEL[hover.link.channel]}
              </div>
              <div className="mt-1 tabular-nums">
                <span className="font-medium">{fmtTon(hover.link.value)}</span>
                <span className="text-muted-foreground"> · {formatPct((hover.link.value / total) * 100)}% dari total</span>
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold">{hover.node.label}</div>
              {hover.node.sub && <div className="text-muted-foreground">{hover.node.sub}</div>}
              <div className="mt-1 tabular-nums">
                <span className="font-medium">{fmtTon(hover.node.value)}</span>
                <span className="text-muted-foreground"> · {formatPct((hover.node.value / total) * 100)}% dari total</span>
              </div>
              {hover.node.isUl && <div className="mt-0.5 text-primary">Mill pemasok program UL</div>}
              {hover.node.millStatus === "PKS_BELUM_PASTI" && <div className="mt-0.5 text-muted-foreground">Survei hanya menyebut nama PT — PKS dipilih dari Universal Mill List</div>}
              {onSelectNode && isGroupNode(hover.node) && <div className="mt-1 text-primary">Klik untuk melihat rinciannya (Detail)</div>}
              {onSelectNode && isFilterableNode(hover.node) && (
                <div className="mt-1 text-muted-foreground">
                  {hover.node.id.startsWith("O:") ? "Klik untuk memfilter semua aliran lewat offtaker ini (termasuk rantai ke/dari RAMP)" : `Klik untuk memfilter ${nodeKind(hover.node)} ini`}
                </div>
              )}
            </>
          )}
          {lit && litTon > 0 && hover.kind === "node" && hover.node.column !== 3 && (
            <div className="mt-1 border-t pt-1 text-muted-foreground">Jalur yang menyala sampai Mill: {fmtTon(litTon)}</div>
          )}
        </div>
      )}
    </div>
  );
}
