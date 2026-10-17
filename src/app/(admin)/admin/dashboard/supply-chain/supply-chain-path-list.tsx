"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPct } from "@/lib/format";
import { CHANNEL_LABEL, sankeyLinkKey, type SankeyGraph, type SankeyNode } from "@/lib/supply-chain-flow";
import { DIRECT_LABEL, buildPathRows, sortPathRows, type PathSortKey, type SortDir } from "@/lib/supply-chain-views";
import { fmtTon } from "@/lib/supply-chain-format";
import { channelBreakdownEntries, channelColor, isFilterableNode, isGroupNode, useChartDark, type SankeyUnit } from "./supply-chain-sankey";
import { SortHead } from "./sort-head";

const ROWS_COLLAPSED = 20;

/**
 * Tab Jalur: satu baris per jalur utuh asal → offtaker → tujuan, urut tonase.
 * Tak ada garis yang saling silang — untuk pembaca yang bingung dengan pita
 * Sankey (owner 2026-10-09). Node yang bisa difilter tampil sebagai tombol.
 */
export function SupplyChainPathList({
  graph,
  unit,
  withOfftaker = true,
  direction = "HULU",
  onSelectNode,
}: {
  graph: SankeyGraph;
  unit: SankeyUnit;
  /** `false` = kolom Offtaker disembunyikan (toggle Offtaker = Sembunyikan; jalur dua langkah bukan berarti langsung ke Mill). */
  withOfftaker?: boolean;
  /** Hilir → Hulu = urutan kolom dibalik: Tujuan → Offtaker → Asal (owner 2026-10-17). */
  direction?: "HULU" | "HILIR";
  onSelectNode: (n: SankeyNode) => void;
}) {
  const mirror = direction === "HILIR";
  const dark = useChartDark();
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<{ key: PathSortKey; dir: SortDir }>({ key: "TON", dir: "desc" });
  const ranked = useMemo(() => buildPathRows(graph), [graph]);
  // Kolom # = peringkat tonase, tetap walau tabel diurut per nama.
  const rank = useMemo(() => new Map(ranked.map((r, i) => [r.key, i + 1])), [ranked]);
  const rows = useMemo(() => sortPathRows(ranked, sort.key, sort.dir), [ranked, sort]);
  const max = Math.max(1, ...rows.map((r) => r.ton));
  const total = graph.totalTon;
  const share = (v: number) => `${total > 0 ? formatPct((v / total) * 100) : "0"}%`;

  if (rows.length === 0) {
    return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Tidak ada aliran bertonase pada filter ini.</div>;
  }
  const visible = showAll ? rows : rows.slice(0, ROWS_COLLAPSED);

  const step = (n: SankeyNode | undefined) => {
    if (!n) return <span className="text-xs italic text-muted-foreground">{DIRECT_LABEL}</span>;
    const clickable = isFilterableNode(n) || isGroupNode(n);
    const text = (
      <>
        <span className="truncate">{n.label}</span>
        {n.isUl && <span className="ml-1 font-semibold text-primary">UL</span>}
      </>
    );
    return clickable ? (
      <button
        type="button"
        onClick={() => onSelectNode(n)}
        title={isGroupNode(n) ? "Klik untuk melihat per offtaker" : `Klik untuk memfilter ${n.label}`}
        className="inline-flex max-w-full items-center rounded border border-border/70 bg-background px-1.5 py-0.5 text-left text-xs hover:border-primary hover:text-primary"
      >
        {text}
      </button>
    ) : (
      <span className="inline-flex max-w-full items-center px-1.5 py-0.5 text-xs text-muted-foreground">{text}</span>
    );
  };

  // Nama mulai A–Z; tonase mulai terbesar.
  const toggleSort = (key: PathSortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "TON" ? "desc" : "asc" }));
  const sortHead = (key: PathSortKey, label: string, className: string) => <SortHead sortKey={key} sort={sort} onToggle={toggleSort} label={label} className={className} />;
  const sortText =
    sort.key === "TON"
      ? sort.dir === "desc" ? "diurut dari tonase terbesar" : "diurut dari tonase terkecil"
      : `diurut menurut ${{ ORIGIN: "asal", OFFTAKER: "offtaker", DEST: "tujuan" }[sort.key]} ${sort.dir === "asc" ? "A–Z" : "Z–A"}`;

  // Pita gabungan (offtaker disembunyikan): satu jalur = satu pita; rincian jalur ada di byChannel.
  const linkByKey = new Map(graph.links.map((l) => [sankeyLinkKey(l), l]));
  // Hilir → Hulu: panah ikut arah baca supaya tidak terbaca "Mill → Lembaga" (review 2026-10-17).
  const Arrow = mirror ? ArrowLeft : ArrowRight;
  const originHead = graph.nodes.some((n) => n.id.startsWith("D:")) ? "Distrik" : "Lembaga";
  const destHead = graph.nodes.some((n) => n.id.startsWith("U:")) ? "UL / Non-UL" : "Mill";

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {formatNumber(rows.length)} jalur, {sortText} — klik judul kolom untuk mengurutkan (Porsi ikut Tonase). Kolom # = peringkat tonase. Warna batang = jalur pertama TBS dari petani.
      </p>
      <div className="overflow-x-auto">
        <table className={cn("w-full text-sm", withOfftaker ? "min-w-[760px]" : "min-w-[560px]")}>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium w-8 text-right">#</th>
              {sortHead(mirror ? "DEST" : "ORIGIN", mirror ? destHead : originHead, "py-2 pr-2")}
              <th className="w-4" />
              {withOfftaker && (
                <>
                  {sortHead("OFFTAKER", "Offtaker", "py-2 pr-2")}
                  <th className="w-4" />
                </>
              )}
              {sortHead(mirror ? "ORIGIN" : "DEST", mirror ? originHead : destHead, "py-2 pr-2")}
              {sortHead("TON", "Tonase", "py-2 pr-2 w-[26%]")}
              <th className="py-2 text-right font-medium">Porsi</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              // Hilir → Hulu: tujuan di kiri, asal di kanan; panah menunjuk ke kiri (arah aliran TBS).
              const first = mirror ? r.steps[r.steps.length - 1] : r.steps[0];
              const last = mirror ? r.steps[0] : r.steps[r.steps.length - 1];
              const mid = r.steps.length === 3 ? r.steps[1] : undefined;
              const color = channelColor(r.channel, dark);
              const parts = linkByKey.get(r.key)?.byChannel;
              const segments = parts ? channelBreakdownEntries(parts) : [{ channel: r.channel, ton: r.ton }];
              const title = segments.map((sg) => `${CHANNEL_LABEL[sg.channel]}: ${fmtTon(sg.ton)}`).join(" · ");
              return (
                <tr key={r.key} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-1.5 pr-2 text-right text-xs tabular-nums text-muted-foreground">{rank.get(r.key)}</td>
                  <td className="max-w-[180px] py-1.5 pr-2">{step(first)}</td>
                  <td className="text-muted-foreground"><Arrow className="h-3.5 w-3.5" /></td>
                  {withOfftaker && (
                    <>
                      <td className="max-w-[240px] py-1.5 pr-2">{step(mid)}</td>
                      <td className="text-muted-foreground"><Arrow className="h-3.5 w-3.5" /></td>
                    </>
                  )}
                  <td className="max-w-[240px] py-1.5 pr-2">{step(last)}</td>
                  <td className="py-1.5 pr-2" title={title}>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        {segments.length > 1 ? (
                          // Pita gabungan: batang dibagi per jalur agar tonase non-dominan tidak hilang.
                          <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${(r.ton / max) * 100}%` }}>
                            {segments.map((sg) => (
                              <div key={sg.channel} className="h-full" style={{ width: `${(sg.ton / r.ton) * 100}%`, background: channelColor(sg.channel, dark) }} />
                            ))}
                          </div>
                        ) : (
                          <div className="h-full rounded-full" style={{ width: `${(r.ton / max) * 100}%`, background: color }} />
                        )}
                      </div>
                      <span className={cn("w-20 text-right tabular-nums", unit === "PCT" && "text-muted-foreground")}>{fmtTon(r.ton)}</span>
                    </div>
                  </td>
                  <td className={cn("py-1.5 text-right tabular-nums", unit === "TON" && "text-muted-foreground")}>{share(r.ton)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > ROWS_COLLAPSED && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? `Tampilkan ${ROWS_COLLAPSED} teratas` : `Tampilkan semua (${formatNumber(rows.length)} jalur)`}
        </Button>
      )}
    </div>
  );
}
