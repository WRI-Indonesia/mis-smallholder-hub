"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChartBarBig, Donut, Grid3x3, LayoutGrid, ListOrdered, ListTree, Orbit, RotateCcw, Rows3, Spline, Workflow } from "lucide-react";
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
import { buildSupplyChainTree, type TreeDirection } from "@/lib/supply-chain-views";
import { CollapsibleCard, useStoredChoice } from "./collapsible-card";
import { SegmentToggle } from "./segment-toggle";
import { SupplyChainSankey, isGroupNode, type SankeyUnit } from "./supply-chain-sankey";
import { SupplyChainPathList } from "./supply-chain-path-list";
import { SupplyChainTreeTable } from "./supply-chain-tree-table";
import { SupplyChainFilterChips, notifyFilter } from "./supply-chain-filter-chips";
import { ResetFiltersButton } from "@/components/shared/reset-filters-button";
import type { SupplyChainFilterState } from "./use-supply-chain-filters";

// React Flow hanya dimuat saat tab Diagram Alur dibuka.
const SupplyChainFlowDiagram = dynamic(() => import("./supply-chain-flow-diagram").then((m) => m.SupplyChainFlowDiagram), {
  ssr: false,
  loading: () => <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">Memuat diagram…</div>,
});
// Enam tab tambahan (owner 2026-10-17) juga dimuat saat tabnya dibuka — d3 hanya terbawa bila dipakai.
// `dynamic(() => import(...).then((m) => m.X))` mempertahankan tipe prop komponen (review 2026-10-17).
// Opsi `dynamic` wajib literal objek (aturan next/dynamic) — komponen loading-nya saja yang dibagi.
const MemuatDiagram = () => <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Memuat diagram…</div>;
const SupplyChainSunburst = dynamic(() => import("./supply-chain-sunburst").then((m) => m.SupplyChainSunburst), { ssr: false, loading: MemuatDiagram });
const SupplyChainIcicle = dynamic(() => import("./supply-chain-icicle").then((m) => m.SupplyChainIcicle), { ssr: false, loading: MemuatDiagram });
const SupplyChainTreemap = dynamic(() => import("./supply-chain-treemap").then((m) => m.SupplyChainTreemap), { ssr: false, loading: MemuatDiagram });
const SupplyChainMatrix = dynamic(() => import("./supply-chain-matrix").then((m) => m.SupplyChainMatrix), { ssr: false, loading: MemuatDiagram });
const SupplyChainChord = dynamic(() => import("./supply-chain-chord").then((m) => m.SupplyChainChord), { ssr: false, loading: MemuatDiagram });
const SupplyChainStackedBars = dynamic(() => import("./supply-chain-stacked-bars").then((m) => m.SupplyChainStackedBars), { ssr: false, loading: MemuatDiagram });

const TABS = ["SANKEY", "ALUR", "JALUR", "POHON", "SUNBURST", "PARTISI", "TREEMAP", "MATRIKS", "CHORD", "BATANG"] as const;
type FlowTab = (typeof TABS)[number];
/** Tab yang membaca pohon bertingkat (ikut toggle Arah) — graf tanpa pelipatan seperti Tabel Pohon. */
const HIERARCHY_TABS: readonly FlowTab[] = ["POHON", "SUNBURST", "PARTISI", "TREEMAP"];
const TAB_META: Record<FlowTab, { label: string; icon: typeof Spline; hint: string }> = {
  SANKEY: { label: "Sankey", icon: Spline, hint: "Pita setebal tonase. Arahkan kursor untuk menyalakan jalurnya; klik node untuk memfilter." },
  ALUR: { label: "Diagram Alur", icon: Workflow, hint: "Kotak & garis beranimasi — klik kotak untuk menyorot jalurnya." },
  JALUR: { label: "Jalur", icon: ListOrdered, hint: "Satu baris per jalur utuh — tanpa garis yang bersilangan; klik judul kolom untuk mengurutkan." },
  POHON: { label: "Tabel Pohon", icon: ListTree, hint: "Agregasi bertingkat yang bisa dibuka-tutup, dari hulu ke hilir atau sebaliknya." },
  SUNBURST: { label: "Sunburst", icon: Donut, hint: "Cincin konsentris: pusat = total, tiap cincin keluar = satu tingkat sesuai Arah; lebar irisan = tonase. Klik irisan untuk memfilter." },
  PARTISI: { label: "Partisi", icon: Rows3, hint: "Sunburst versi persegi: kolom kiri → kanan = tingkat, tinggi kotak = tonase — labelnya lebih mudah dibaca." },
  TREEMAP: { label: "Treemap", icon: LayoutGrid, hint: "Kotak bersarang, luas = tonase — paling jelas untuk membandingkan porsi." },
  MATRIKS: { label: "Matriks", icon: Grid3x3, hint: "Tabel panas Asal × Tujuan; warna sel makin pekat makin besar tonasenya. Tanpa garis." },
  CHORD: { label: "Chord", icon: Orbit, hint: "Pita melingkar asal (hijau) ↔ tujuan (biru); arahkan kursor ke busur untuk rinciannya." },
  BATANG: { label: "Batang", icon: ChartBarBig, hint: "Satu batang per asal, segmen = tujuan; Angka % menjadikannya batang 100%." },
};

const TOP_OPTIONS = ["8", "12", "20", "999"] as const;
/** Bawaan tampilan (owner 2026-10-10): paling ringkas — Distrik · Per jenis · UL/Non-UL · Ton; di tiap toggle pilihan bawaan di kiri. */
const DEFAULT_ORIGIN: SankeyOrigin = "DISTRIK";
const DEFAULT_DESTINATION: SankeyDestination = "UL";
/** Mode Ringkas hanya melipat kolom Mill — kolom tengah sudah ≤ 5 node, jadi ada ruang untuk lebih banyak Mill. */
const RINGKAS_MILLS = 15;

/**
 * Kartu Aliran TBS (owner 2026-10-09): empat tab tampilan atas data yang sama;
 * owner 2026-10-17 menambah enam — Sunburst · Partisi · Treemap (pohon ber-Arah)
 * dan Matriks · Chord · Batang (matriks Asal × Tujuan) — klik = filter yang sama.
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
  // Toggle Offtaker opsi ketiga "Sembunyikan" (owner 2026-10-17): tingkat tengah dilewati → asal langsung ke tujuan di semua tab.
  const [hideMiddle, setHideMiddle] = useState(false);
  const [top, setTop] = useState<(typeof TOP_OPTIONS)[number]>("12");
  const [unit, setUnit] = useState<SankeyUnit>("TON");
  const [origin, setOrigin] = useState<SankeyOrigin>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<SankeyDestination>(DEFAULT_DESTINATION);
  const [direction, setDirection] = useState<TreeDirection>("HULU");

  const isHierarchy = HIERARCHY_TABS.includes(tab);
  // Arah berlaku di semua tab kecuali Chord (lingkaran tak punya kiri/kanan) — owner 2026-10-17.
  const hasDirection = tab !== "CHORD";
  // Tiap graf hanya dibangun untuk tab yang memakainya.
  const graph = useMemo(
    () =>
      isHierarchy
        ? null
        : buildSupplyChainSankey(view.data, records, { mode, origin, destination, hideMiddle, maxPerColumn: mode === "RINGKAS" ? RINGKAS_MILLS : Number(top) }),
    [isHierarchy, view.data, records, mode, origin, destination, hideMiddle, top],
  );
  // Tab hierarki (Tabel Pohon · Sunburst · Partisi · Treemap): per Lembaga & per Mill tanpa pelipatan — tingkat Distrik/UL ditambahkan pohon.
  const treeGraph = useMemo(
    // Tanpa hideMiddle: tingkat offtaker dilewati oleh pohon (withOfftaker) agar komposisi per jalur tetap utuh.
    () => (isHierarchy ? buildSupplyChainSankey(view.data, records, { mode, maxPerColumn: Infinity }) : null),
    [isHierarchy, view.data, records, mode],
  );
  const tree = useMemo(
    () =>
      treeGraph && tab !== "POHON"
        ? buildSupplyChainTree(treeGraph, view.data.groups, { direction, byDistrict: origin === "DISTRIK", byUl: destination === "UL", withOfftaker: !hideMiddle })
        : null,
    [treeGraph, tab, view.data.groups, direction, origin, destination, hideMiddle],
  );

  // Pilihan tampilan yang menyimpang dari bawaan — memunculkan tombol Tampilan bawaan.
  const changed = [
    origin !== DEFAULT_ORIGIN,
    destination !== DEFAULT_DESTINATION,
    mode !== "RINGKAS",
    hideMiddle,
    unit !== "TON",
    hasDirection && direction !== "HULU",
    mode === "RINCI" && !isHierarchy && top !== "12",
  ].filter(Boolean).length;
  const resetView = () => {
    setMode("RINGKAS");
    setHideMiddle(false);
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
    hasDirection && direction === "HILIR"
      ? `TBS yang masuk ke ${destination === "UL" ? "Mill UL dan bukan UL" : "tiap Mill"}${hideMiddle ? " ← langsung" : ` ← dari ${offText} mana ←`} dari ${origin === "DISTRIK" ? "distrik & Lembaga" : "Lembaga"} mana`
      : `TBS dari tiap ${origin === "DISTRIK" ? "distrik" : "Lembaga"} → ${hideMiddle ? "langsung (offtaker disembunyikan; pita pasangan yang sama dilebur, warna = jalur terbesar)" : `lewat ${offText}`} → sampai ke ${destination === "UL" ? "Mill UL atau bukan" : "tiap Mill"}`;

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
          {hasDirection && (
            <SegmentToggle
              caption="Arah"
              value={direction}
              onChange={setDirection}
              label="Arah agregasi"
              options={[
                { value: "HULU", label: "Hulu → Hilir", hint: "Mulai dari Lembaga ke Mill tujuannya — asal di kiri (bawaan)" },
                { value: "HILIR", label: "Hilir → Hulu", hint: "Mulai dari Mill ke Lembaga pemasoknya — Mill di kiri; di tabel: tujuan jadi baris/kolom pertama" },
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
          <SegmentToggle<SankeyMode | "TANPA">
            caption="Offtaker"
            value={hideMiddle ? "TANPA" : mode}
            onChange={(v) => {
              if (v === "TANPA") setHideMiddle(true);
              else {
                setHideMiddle(false);
                setMode(v);
              }
            }}
            label="Rincian offtaker"
            options={[
              { value: "RINGKAS", label: "Per jenis", hint: "Gabungkan per jenis: Agen, RAMP, KT/Koperasi, Agen → RAMP (bawaan)" },
              { value: "RINCI", label: "Satu per satu", hint: "Tiap agen, RAMP, dan KT/koperasi tampil sendiri" },
              { value: "TANPA", label: "Sembunyikan", hint: "Lewati tingkat offtaker: aliran langsung dari asal ke Mill; warna garis tetap menunjukkan jalurnya" },
            ]}
          />
          {mode === "RINCI" && !hideMiddle && !isHierarchy && (
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

        {/* Chip filter aktif + Reset juga di sini (owner 2026-10-17): bar filter di puncak halaman jauh dari kartu ini saat digulir. */}
        {f.hasFilter && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5">
            <SupplyChainFilterChips f={f} view={view} />
            <ResetFiltersButton active={f.hasFilter} onReset={f.reset} size="sm" title="Lepas semua filter halaman (sama dengan Reset di bar filter atas)" />
          </div>
        )}

        <div className="overflow-x-auto">
          {tab === "SANKEY" && graph && <SupplyChainSankey graph={graph} unit={unit} direction={direction} onSelectNode={selectNode} />}
          {tab === "ALUR" && graph && <SupplyChainFlowDiagram graph={graph} unit={unit} direction={direction} onSelectNode={selectNode} />}
          {tab === "JALUR" && graph && <SupplyChainPathList graph={graph} unit={unit} withOfftaker={!hideMiddle} direction={direction} onSelectNode={selectNode} />}
          {tab === "POHON" && treeGraph && (
            <SupplyChainTreeTable
              graph={treeGraph}
              groups={view.data.groups}
              direction={direction}
              byDistrict={origin === "DISTRIK"}
              byUl={destination === "UL"}
              withOfftaker={!hideMiddle}
              unit={unit}
              onSelectNode={selectNode}
            />
          )}
          {tab === "SUNBURST" && tree && treeGraph && <SupplyChainSunburst tree={tree} total={treeGraph.totalTon} unit={unit} onSelectNode={selectNode} />}
          {tab === "PARTISI" && tree && treeGraph && <SupplyChainIcicle tree={tree} total={treeGraph.totalTon} unit={unit} onSelectNode={selectNode} />}
          {tab === "TREEMAP" && tree && treeGraph && <SupplyChainTreemap tree={tree} total={treeGraph.totalTon} unit={unit} onSelectNode={selectNode} />}
          {tab === "MATRIKS" && graph && <SupplyChainMatrix graph={graph} unit={unit} direction={direction} onSelectNode={selectNode} />}
          {tab === "CHORD" && graph && <SupplyChainChord graph={graph} unit={unit} onSelectNode={selectNode} />}
          {tab === "BATANG" && graph && <SupplyChainStackedBars graph={graph} unit={unit} direction={direction} onSelectNode={selectNode} />}
        </div>
      </div>
    </CollapsibleCard>
  );
}
