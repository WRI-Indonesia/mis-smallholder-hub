"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ListOrdered, ListTree, RotateCcw, Spline, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UNKNOWN_MILL_FILTER,
  buildSupplyChainSankey,
  parseChainNodeId,
  type SankeyDestination,
  type SankeyMode,
  type SankeyNode,
  type SankeyOrigin,
  type SupplyChainView,
} from "@/lib/supply-chain-flow";
import type { TreeDirection } from "@/lib/supply-chain-views";
import { CollapsibleCard, useStoredChoice } from "./collapsible-card";
import { SegmentToggle } from "./segment-toggle";
import { SupplyChainSankey, isGroupNode, type SankeyUnit } from "./supply-chain-sankey";
import { SupplyChainPathList } from "./supply-chain-path-list";
import { SupplyChainTreeTable } from "./supply-chain-tree-table";
import { notifyFilter } from "./supply-chain-filter-chips";
import type { SupplyChainFilterState } from "./use-supply-chain-filters";

// React Flow hanya dimuat saat tab Diagram Alur dibuka.
const SupplyChainFlowDiagram = dynamic(() => import("./supply-chain-flow-diagram").then((m) => m.SupplyChainFlowDiagram), {
  ssr: false,
  loading: () => <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">Memuat diagram…</div>,
});

const TABS = ["SANKEY", "ALUR", "JALUR", "POHON"] as const;
type FlowTab = (typeof TABS)[number];
const TAB_META: Record<FlowTab, { label: string; icon: typeof Spline; hint: string }> = {
  SANKEY: { label: "Sankey", icon: Spline, hint: "Pita setebal tonase. Arahkan kursor untuk menyalakan jalurnya; klik node untuk memfilter." },
  ALUR: { label: "Diagram Alur", icon: Workflow, hint: "Kotak & garis beranimasi — klik kotak untuk menyorot jalurnya." },
  JALUR: { label: "Jalur", icon: ListOrdered, hint: "Satu baris per jalur utuh — tanpa garis yang bersilangan; klik judul kolom untuk mengurutkan." },
  POHON: { label: "Tabel Pohon", icon: ListTree, hint: "Agregasi bertingkat yang bisa dibuka-tutup, dari hulu ke hilir atau sebaliknya." },
};

const TOP_OPTIONS = ["8", "12", "20", "999"] as const;
/** Bawaan tampilan (owner 2026-10-10): paling ringkas — Distrik · Per jenis · UL/Non-UL · Ton; di tiap toggle pilihan bawaan di kiri. */
const DEFAULT_ORIGIN: SankeyOrigin = "DISTRIK";
const DEFAULT_DESTINATION: SankeyDestination = "UL";
/** Mode Ringkas hanya melipat kolom Mill — kolom tengah sudah ≤ 5 node, jadi ada ruang untuk lebih banyak Mill. */
const RINGKAS_MILLS = 15;

/**
 * Kartu Aliran TBS (owner 2026-10-09): empat tab tampilan atas data yang sama.
 * Toolbar tampilan (Arah · Dari · Ke · Offtaker · Angka) tetap **lepasan** di
 * bawah tab — sempat dicoba popover "Tampilan", owner 2026-10-10: pengguna
 * sering tak menyadarinya. Bawaan paling ringkas (Distrik · Per jenis ·
 * UL/Non-UL · Ton), pilihan bawaan di kiri; kalimat "Menampilkan …" merangkum.
 * Chip filter aktif global di bawah bar filter. Klik node di tab mana pun =
 * penangan filter yang sama + toast singkat.
 */
export function SupplyChainFlowCard({ view, f }: { view: SupplyChainView; f: SupplyChainFilterState }) {
  const { records, offtakers } = f;
  const [tab, setTab] = useStoredChoice<FlowTab>("tab", "SANKEY", TABS);
  const [mode, setMode] = useState<SankeyMode>("RINGKAS");
  const [top, setTop] = useState<(typeof TOP_OPTIONS)[number]>("12");
  const [unit, setUnit] = useState<SankeyUnit>("TON");
  const [origin, setOrigin] = useState<SankeyOrigin>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<SankeyDestination>(DEFAULT_DESTINATION);
  const [direction, setDirection] = useState<TreeDirection>("HULU");

  // Tiap graf hanya dibangun untuk tab yang memakainya.
  const graph = useMemo(
    () =>
      tab === "POHON"
        ? null
        : buildSupplyChainSankey(view.data, records, { mode, origin, destination, maxPerColumn: mode === "RINGKAS" ? RINGKAS_MILLS : Number(top) }),
    [tab, view.data, records, mode, origin, destination, top],
  );
  // Tabel pohon: per Lembaga & per Mill tanpa pelipatan — tingkat Distrik/UL ditambahkan pohon.
  const treeGraph = useMemo(
    () => (tab === "POHON" ? buildSupplyChainSankey(view.data, records, { mode, maxPerColumn: Infinity }) : null),
    [tab, view.data, records, mode],
  );

  // Pilihan tampilan yang menyimpang dari bawaan — memunculkan tombol Tampilan bawaan.
  const changed = [
    origin !== DEFAULT_ORIGIN,
    destination !== DEFAULT_DESTINATION,
    mode !== "RINGKAS",
    unit !== "TON",
    tab === "POHON" && direction !== "HULU",
    mode === "RINCI" && tab !== "POHON" && top !== "12",
  ].filter(Boolean).length;
  const resetView = () => {
    setMode("RINGKAS");
    setTop("12");
    setOrigin(DEFAULT_ORIGIN);
    setDestination(DEFAULT_DESTINATION);
    setUnit("TON");
    setDirection("HULU");
  };

  const selectNode = (n: SankeyNode) => {
    if (isGroupNode(n)) {
      setMode("RINCI");
      return;
    }
    if (n.id.startsWith("U:")) {
      // Klik UL/Non-UL = filter UL lalu turun ke rincian per Mill.
      f.update({ ul: n.id.slice(2) });
      setDestination("MILL");
    } else if (n.id.startsWith("D:")) {
      // Klik Distrik = filter distrik lalu turun ke rincian per Lembaga.
      f.update({ distrik: n.id.slice(2) });
      setOrigin("LEMBAGA");
    } else if (n.column === 0 && n.groupCode) f.update({ lembaga: n.groupCode });
    else if (n.column === 1) {
      // Satu bagian offtaker: rantai → filter Agen + RAMP; tunggal → sesuai tipenya.
      const chain = parseChainNodeId(n.id);
      if (chain) f.update({ agen: chain.collectorId, ramp: chain.rampId });
      else if (offtakers.get(n.id.slice(2))?.type === "RAMP") f.update({ ramp: n.id.slice(2) });
      else f.update({ agen: n.id.slice(2) });
    } else f.update({ mill: n.id === "M:?" ? UNKNOWN_MILL_FILTER : n.id.slice(2) });
    notifyFilter(n.label);
  };

  // Kalimat baca: apa yang sedang ditampilkan, dalam bahasa biasa.
  const offText = mode === "RINGKAS" ? "jenis offtaker (Agen, RAMP, KT/Koperasi)" : "tiap offtaker";
  const reading =
    tab === "POHON" && direction === "HILIR"
      ? `TBS yang masuk ke ${destination === "UL" ? "Mill UL dan bukan UL" : "tiap Mill"} ← dari ${offText} mana ← dari ${origin === "DISTRIK" ? "distrik & Lembaga" : "Lembaga"} mana`
      : `TBS dari tiap ${origin === "DISTRIK" ? "distrik" : "Lembaga"} → lewat ${offText} → sampai ke ${destination === "UL" ? "Mill UL atau bukan" : "tiap Mill"}`;

  return (
    <CollapsibleCard id="aliran" title="Aliran TBS: Lembaga → Offtaker → Mill">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b">
          <div className="-mb-px flex flex-wrap gap-1" role="tablist" aria-label="Tampilan aliran">
            {TABS.map((t) => {
              const Icon = TAB_META[t].icon;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  title={TAB_META[t].hint}
                  onClick={() => setTab(t)}
                  className={cn(
                    "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" /> {TAB_META[t].label}
                </button>
              );
            })}
          </div>
          <p className="hidden pb-2 text-xs text-muted-foreground lg:block">{TAB_META[tab].hint}</p>
        </div>

        {/* Toolbar lepasan (owner 2026-10-10: popover sering tak disadari) — satu strip ringkas, bawaan di kiri tiap toggle. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          {tab === "POHON" && (
            <SegmentToggle
              caption="Arah"
              value={direction}
              onChange={setDirection}
              label="Arah agregasi"
              options={[
                { value: "HULU", label: "Hulu → Hilir", hint: "Mulai dari Lembaga, buka sampai Mill tujuannya (bawaan)" },
                { value: "HILIR", label: "Hilir → Hulu", hint: "Mulai dari Mill, buka sampai Lembaga pemasoknya" },
              ]}
            />
          )}
          <SegmentToggle
            caption="Dari"
            value={origin}
            onChange={setOrigin}
            label="Kelompok asal"
            options={[
              { value: "DISTRIK", label: "Distrik", hint: "Gabungkan Lembaga per kabupaten (bawaan)" },
              { value: "LEMBAGA", label: "Lembaga", hint: "Satu baris/node per Lembaga Petani" },
            ]}
          />
          <SegmentToggle
            caption="Ke"
            value={destination}
            onChange={setDestination}
            label="Kelompok tujuan"
            options={[
              { value: "UL", label: "UL / Non-UL", hint: "Gabungkan jadi Ke Mill UL dan Bukan ke Mill UL (bawaan)" },
              { value: "MILL", label: "Mill", hint: "Satu baris/node per Mill (PKS)" },
            ]}
          />
          <SegmentToggle
            caption="Offtaker"
            value={mode}
            onChange={setMode}
            label="Rincian offtaker"
            options={[
              { value: "RINGKAS", label: "Per jenis", hint: "Gabungkan per jenis: Agen, RAMP, KT/Koperasi, Agen → RAMP (bawaan)" },
              { value: "RINCI", label: "Satu per satu", hint: "Tiap agen, RAMP, dan KT/koperasi tampil sendiri" },
            ]}
          />
          {mode === "RINCI" && tab !== "POHON" && (
            <div className="inline-flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tampilkan</span>
              <Select value={top} onValueChange={(v) => setTop(v as (typeof TOP_OPTIONS)[number])}>
                <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOP_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t === "999" ? "Semua" : `${t} teratas per kolom`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <SegmentToggle
            caption="Angka"
            value={unit}
            onChange={setUnit}
            label="Satuan angka"
            options={[
              { value: "TON", label: "Ton", hint: "Tonase TBS per tahun survei (bawaan)" },
              { value: "PCT", label: "%", hint: "Persen dari total pada filter aktif" },
            ]}
          />
          {changed > 0 && (
            <Button variant="ghost" size="sm" onClick={resetView} className="ml-auto h-7 gap-1.5 text-xs" title="Kembalikan pilihan tampilan ke bawaan">
              <RotateCcw className="h-3.5 w-3.5" /> Tampilan bawaan
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">Menampilkan {reading}.</p>

        <div className="overflow-x-auto">
          {tab === "SANKEY" && graph && <SupplyChainSankey graph={graph} unit={unit} onSelectNode={selectNode} />}
          {tab === "ALUR" && graph && <SupplyChainFlowDiagram graph={graph} unit={unit} onSelectNode={selectNode} />}
          {tab === "JALUR" && graph && <SupplyChainPathList graph={graph} unit={unit} onSelectNode={selectNode} />}
          {tab === "POHON" && treeGraph && (
            <SupplyChainTreeTable
              graph={treeGraph}
              groups={view.data.groups}
              direction={direction}
              byDistrict={origin === "DISTRIK"}
              byUl={destination === "UL"}
              unit={unit}
              onSelectNode={selectNode}
            />
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
}
