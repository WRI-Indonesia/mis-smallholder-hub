"use client";

import { useMemo, useState } from "react";
import { chordDirected, ribbonArrow, type Chord, type ChordGroup } from "d3-chord";
import { arc as d3Arc } from "d3-shape";
import { formatPct } from "@/lib/format";
import type { SankeyGraph, SankeyNode } from "@/lib/supply-chain-flow";
import { buildOriginDestMatrix, matrixKey } from "@/lib/supply-chain-views";
import { fmtTon, fmtTonOrPct } from "@/lib/supply-chain-format";
import { isFilterableNode, isGroupNode, useChartDark, type SankeyUnit } from "./supply-chain-sankey";

const R = 230;
const BAND = 16;
/** Ruang label di luar lingkaran — 18 karakter × ~6 px + jarak (review 2026-10-17: 90 px memotong label sisi kiri/kanan). */
const MARGIN = 140;
const ORIGIN_COLORS = ["#166534", "#15803d", "#16a34a", "#22c55e", "#4ade80", "#86efac", "#065f46", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];
const DEST_COLORS = ["#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#312e81", "#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc"];

/**
 * Tab Chord: pita melingkar Asal ↔ Tujuan (tingkat offtaker dilipat) — asal
 * di sisi hijau, tujuan di sisi biru, tebal pita = tonase. Menonjolkan ke mana
 * saja satu asal mengirim dan dari mana saja satu Mill menerima. Klik busur = filter.
 */
export function SupplyChainChord({ graph, unit, onSelectNode }: { graph: SankeyGraph; unit: SankeyUnit; onSelectNode: (n: SankeyNode) => void }) {
  const dark = useChartDark();
  // Hover per id node (bukan indeks): urutan/jumlah node berubah saat graf dibangun ulang (review 2026-10-17).
  const [hoverId, setHoverId] = useState<string | null>(null);
  const { m, nodes, chords, color } = useMemo(() => {
    const m = buildOriginDestMatrix(graph);
    const nodes = [...m.rows, ...m.cols];
    const n = nodes.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    m.rows.forEach((r, i) => m.cols.forEach((c, j) => (matrix[i][m.rows.length + j] = m.cells.get(matrixKey(r.id, c.id)) ?? 0)));
    const chords = chordDirected().padAngle(0.03).sortSubgroups((a, b) => b - a)(matrix);
    const color = (i: number) => (i < m.rows.length ? ORIGIN_COLORS[i % ORIGIN_COLORS.length] : DEST_COLORS[(i - m.rows.length) % DEST_COLORS.length]);
    return { m, nodes, chords, color };
  }, [graph]);
  const hover = hoverId ? nodes.findIndex((n) => n.id === hoverId) : -1;
  const hasHover = hover >= 0;
  if (!nodes.length) return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;

  const inner = R - BAND;
  const arcGen = d3Arc<ChordGroup>().innerRadius(inner).outerRadius(R);
  const ribbonGen = ribbonArrow<Chord, Chord["source"]>().radius(inner - 2).padAngle(0.01).headRadius(10);
  const lit = (c: Chord) => !hasHover || c.source.index === hover || c.target.index === hover;
  const show = (v: number) => fmtTonOrPct(v, m.total, unit);
  const hovered = hasHover ? nodes[hover] : null;
  const hoveredTotal = hovered ? (hover < m.rows.length ? m.rowTotal.get(hovered.id) : m.colTotal.get(hovered.id)) ?? 0 : 0;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <svg viewBox={`${-R - MARGIN} ${-R - MARGIN} ${2 * (R + MARGIN)} ${2 * (R + MARGIN)}`} className="h-[520px] w-[520px] max-w-full shrink-0" role="img" aria-label="Chord aliran TBS">
        <g>
          {chords.map((c, i) => (
            <path key={i} d={ribbonGen(c) ?? ""} fill={color(c.source.index)} fillOpacity={lit(c) ? (hasHover ? 0.85 : 0.55) : 0.08} stroke={dark ? "#0f172a" : "#ffffff"} strokeWidth={0.5} className="transition-[fill-opacity] duration-150">
              <title>{`${nodes[c.source.index].label} → ${nodes[c.target.index].label}: ${fmtTon(c.source.value)}`}</title>
            </path>
          ))}
        </g>
        {chords.groups.map((g) => {
          const n = nodes[g.index];
          const mid = (g.startAngle + g.endAngle) / 2;
          const deg = (mid * 180) / Math.PI - 90;
          const flip = mid > Math.PI;
          const clickable = isFilterableNode(n) || isGroupNode(n);
          const total = g.index < m.rows.length ? m.rowTotal.get(n.id) : m.colTotal.get(n.id);
          return (
            <g key={g.index} onMouseEnter={() => setHoverId(n.id)} onMouseLeave={() => setHoverId(null)} onClick={() => clickable && onSelectNode(n)} className={clickable ? "cursor-pointer" : undefined}>
              <path d={arcGen(g) ?? ""} fill={color(g.index)} opacity={!hasHover || hover === g.index ? 1 : 0.45} />
              <title>{`${n.label}: ${fmtTon(total ?? 0)}`}</title>
              <text transform={`rotate(${deg}) translate(${R + 6},0) ${flip ? "rotate(180)" : ""}`} textAnchor={flip ? "end" : "start"} dominantBaseline="middle" fontSize={10} fill={!hasHover || hover === g.index ? "var(--foreground)" : "var(--muted-foreground)"} className="pointer-events-none">
                {n.label.length > 18 ? `${n.label.slice(0, 17)}…` : n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="min-w-0 flex-1 space-y-2 text-sm md:pt-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: ORIGIN_COLORS[1] }} /> Asal ({m.rows.length})</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: DEST_COLORS[1] }} /> Tujuan ({m.cols.length})</span>
        </div>
        {hovered ? (
          <div className="space-y-1">
            <div className="font-medium">{hovered.label}</div>
            {hovered.sub ? <div className="text-xs text-muted-foreground">{hovered.sub}</div> : null}
            <div className="tabular-nums"><span className="font-semibold">{fmtTon(hoveredTotal)}</span><span className="text-muted-foreground"> · {m.total > 0 ? formatPct((hoveredTotal / m.total) * 100) : "0"}% dari total</span></div>
            <ul className="space-y-0.5 text-xs">
              {chords
                .filter((c) => c.source.index === hover || c.target.index === hover)
                .sort((a, b) => b.source.value - a.source.value)
                .slice(0, 12)
                .map((c, i) => {
                  const other = nodes[c.source.index === hover ? c.target.index : c.source.index];
                  return (
                    <li key={i} className="flex justify-between gap-3 tabular-nums">
                      <span className="truncate">{c.source.index === hover ? "→" : "←"} {other.label}</span>
                      <span className="shrink-0">{show(c.source.value)}</span>
                    </li>
                  );
                })}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground">Pita = aliran dari asal (hijau) ke tujuan (biru), tebalnya sebanding tonase. Arahkan kursor ke busur untuk melihat rinciannya; klik busur Lembaga/Distrik/Mill untuk menjadikannya filter.</p>
        )}
      </div>
    </div>
  );
}
