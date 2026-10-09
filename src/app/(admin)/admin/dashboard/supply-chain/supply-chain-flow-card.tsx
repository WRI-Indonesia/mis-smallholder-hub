"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ListOrdered, ListTree, RotateCcw, Spline, Workflow, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GROUP_CATEGORY_LABEL,
  UL_FILTER_LABEL,
  UNKNOWN_MILL_FILTER,
  buildSupplyChainSankey,
  millLabel,
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
import type { ScFilterParam, SupplyChainFilterState } from "./use-supply-chain-filters";

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
  JALUR: { label: "Jalur", icon: ListOrdered, hint: "Satu baris per jalur utuh, urut tonase — tanpa garis yang bersilangan." },
  POHON: { label: "Tabel Pohon", icon: ListTree, hint: "Agregasi bertingkat yang bisa dibuka-tutup, dari hulu ke hilir atau sebaliknya." },
};

const TOP_OPTIONS = ["8", "12", "20", "999"] as const;
/** Mode Ringkas hanya melipat kolom Mill — kolom tengah sudah ≤ 5 node, jadi ada ruang untuk lebih banyak Mill. */
const RINGKAS_MILLS = 15;

/**
 * Kartu Aliran TBS (owner 2026-10-09): empat tab tampilan atas data yang sama,
 * toolbar berlabel yang dipakai bersama (pilihan yang tak berlaku di tab aktif
 * disembunyikan), chip filter aktif yang bisa dihapus satu per satu, dan kartu
 * yang bisa dilipat. Klik node di tab mana pun = penangan filter yang sama.
 */
export function SupplyChainFlowCard({ view, f }: { view: SupplyChainView; f: SupplyChainFilterState }) {
  const { records, offtakers, millsById } = f;
  const [tab, setTab] = useStoredChoice<FlowTab>("tab", "SANKEY", TABS);
  const [mode, setMode] = useState<SankeyMode>("RINGKAS");
  const [top, setTop] = useState<(typeof TOP_OPTIONS)[number]>("12");
  const [unit, setUnit] = useState<SankeyUnit>("TON");
  const [origin, setOrigin] = useState<SankeyOrigin>("LEMBAGA");
  const [destination, setDestination] = useState<SankeyDestination>("MILL");
  const [direction, setDirection] = useState<TreeDirection>("HULU");

  const graph = useMemo(
    () => buildSupplyChainSankey(view.data, records, { mode, origin, destination, maxPerColumn: mode === "RINGKAS" ? RINGKAS_MILLS : Number(top) }),
    [view.data, records, mode, origin, destination, top],
  );
  // Tabel pohon: per Lembaga & per Mill tanpa pelipatan — tingkat Distrik/UL ditambahkan pohon.
  const treeGraph = useMemo(
    () => (tab === "POHON" ? buildSupplyChainSankey(view.data, records, { mode, maxPerColumn: Infinity }) : null),
    [tab, view.data, records, mode],
  );

  const chipMill = f.filter.millId ? millsById.get(f.filter.millId) : undefined;
  const chips: { param: ScFilterParam; label: string }[] = [
    f.district ? { param: "distrik" as const, label: `Distrik: ${f.district}` } : null,
    f.category ? { param: "kategori" as const, label: `Kategori: ${GROUP_CATEGORY_LABEL[f.category]}` } : null,
    f.filter.groupCode
      ? { param: "lembaga" as const, label: `Lembaga: ${view.data.groups.find((g) => g.code === f.filter.groupCode)?.abrv ?? f.filter.groupCode}` }
      : null,
    f.filter.collectorId ? { param: "agen" as const, label: `Agen: ${offtakers.get(f.filter.collectorId)?.name ?? f.filter.collectorId}` } : null,
    f.filter.rampId ? { param: "ramp" as const, label: `RAMP: ${offtakers.get(f.filter.rampId)?.name ?? f.filter.rampId}` } : null,
    f.filter.millId
      ? { param: "mill" as const, label: f.filter.millId === UNKNOWN_MILL_FILTER ? "Mill tidak diketahui" : `Mill: ${chipMill ? millLabel(chipMill) : f.filter.millId}` }
      : null,
    f.filter.ul ? { param: "ul" as const, label: UL_FILTER_LABEL[f.filter.ul] } : null,
  ].filter((x) => x !== null);

  const viewChanged = mode !== "RINGKAS" || origin !== "LEMBAGA" || destination !== "MILL" || unit !== "TON" || direction !== "HULU";
  const resetView = () => {
    setMode("RINGKAS");
    setOrigin("LEMBAGA");
    setDestination("MILL");
    setUnit("TON");
    setDirection("HULU");
  };

  const selectNode = (n: SankeyNode) => {
    if (isGroupNode(n)) setMode("RINCI");
    else if (n.id.startsWith("U:")) {
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
          <p className="pb-2 text-xs text-muted-foreground">{TAB_META[tab].hint}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md bg-muted/30 px-3 py-2">
          {tab === "POHON" && (
            <SegmentToggle
              caption="Arah"
              value={direction}
              onChange={setDirection}
              label="Arah agregasi"
              options={[
                { value: "HULU", label: "Hulu → Hilir", hint: "Mulai dari Lembaga, buka sampai Mill tujuannya" },
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
              { value: "LEMBAGA", label: "Lembaga", hint: "Satu baris/node per Lembaga Petani" },
              { value: "DISTRIK", label: "Distrik", hint: "Gabungkan Lembaga per kabupaten" },
            ]}
          />
          <SegmentToggle
            caption="Ke"
            value={destination}
            onChange={setDestination}
            label="Kelompok tujuan"
            options={[
              { value: "MILL", label: "Mill", hint: "Satu baris/node per Mill (PKS)" },
              { value: "UL", label: "UL / Non-UL", hint: "Gabungkan jadi Ke Mill UL dan Bukan ke Mill UL" },
            ]}
          />
          <SegmentToggle
            caption="Offtaker"
            value={mode}
            onChange={setMode}
            label="Rincian offtaker"
            options={[
              { value: "RINGKAS", label: "Per jenis", hint: "Gabungkan per jenis: Agen, RAMP, KT/Koperasi, Agen → RAMP" },
              { value: "RINCI", label: "Satu per satu", hint: "Tiap agen, RAMP, dan KT/koperasi tampil sendiri" },
            ]}
          />
          {mode === "RINCI" && tab !== "POHON" && (
            <div className="inline-flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tampilkan</span>
              <Select value={top} onValueChange={(v) => setTop(v as (typeof TOP_OPTIONS)[number])}>
                <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue /></SelectTrigger>
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
              { value: "TON", label: "Ton", hint: "Tonase TBS per tahun survei" },
              { value: "PCT", label: "%", hint: "Persen dari total pada filter aktif" },
            ]}
          />
          {viewChanged && (
            <Button variant="ghost" size="sm" onClick={resetView} className="ml-auto h-7 gap-1.5 text-xs" title="Kembalikan pilihan tampilan ke bawaan">
              <RotateCcw className="h-3.5 w-3.5" /> Tampilan bawaan
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Menampilkan {reading}.</span>
          {chips.length > 0 && (
            <>
              <span className="ml-2 font-medium text-foreground">Filter:</span>
              {chips.map((c) => (
                <span key={c.param} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-0.5 pl-2 pr-1 text-foreground">
                  {c.label}
                  <button
                    type="button"
                    onClick={() => f.update({ [c.param]: null })}
                    aria-label={`Hapus filter ${c.label}`}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-primary/20 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {chips.length > 1 && (
                <button type="button" onClick={f.reset} className="ml-1 text-primary underline-offset-2 hover:underline">
                  Hapus semua
                </button>
              )}
            </>
          )}
        </div>

        <div className="overflow-x-auto">
          {tab === "SANKEY" && <SupplyChainSankey graph={graph} unit={unit} onSelectNode={selectNode} />}
          {tab === "ALUR" && <SupplyChainFlowDiagram graph={graph} unit={unit} onSelectNode={selectNode} />}
          {tab === "JALUR" && <SupplyChainPathList graph={graph} unit={unit} onSelectNode={selectNode} />}
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
