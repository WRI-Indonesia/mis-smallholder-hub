"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, ChevronDown, CircleCheck, CircleDashed, CircleHelp, Factory, FlaskConical, Map as MapIcon, RotateCcw, Truck, Weight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatEmph } from "@/components/shared/stat-emph";
import { formatNumber, formatPct } from "@/lib/format";
import {
  CHANNEL_LABEL,
  CHANNEL_ORDER,
  MILL_BASIS_LABEL,
  MILL_STATUS_LABEL,
  GROUP_CATEGORY_LABEL,
  UL_FILTER_LABEL,
  UNKNOWN_MILL_FILTER,
  buildSupplyChainSankey,
  millLabel,
  millVolumes,
  parseChainNodeId,
  summarizeSupplyChain,
  type MillStatus,
  type MillVolumeRow,
  type SankeyMode,
  type SankeyDestination,
  type SankeyOrigin,
  type SupplyChainSummary,
  type SupplyChainView,
} from "@/lib/supply-chain-flow";
import { SupplyChainSankey, channelColor, isGroupNode, useChartDark, type SankeyUnit } from "./supply-chain-sankey";
import { SupplyChainFilterBar } from "./supply-chain-filter-bar";
import { useSupplyChainFilters } from "./use-supply-chain-filters";

const fmtTon = (n: number) => `${formatNumber(Math.round(n))} t`;
const pct = (part: number, total: number) => (total > 0 ? `${formatPct(Math.round((part / total) * 1000) / 10)}%` : "—");
const TOP_OPTIONS = ["8", "12", "20", "999"] as const;
const MILL_ROWS_COLLAPSED = 10;
/** Mode Ringkas hanya melipat kolom Mill — kolom tengah sudah ≤ 3 node, jadi ada ruang untuk lebih banyak Mill. */
const RINGKAS_MILLS = 15;

/** Keadaan kosong bila folder tabel CSV tidak ada di server ini. */
export function SupplyChainUnavailable({ tablesDir }: { tablesDir: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Data prototipe rantai pasok belum tersedia di server ini.</p>
        <p>
          Halaman ini membaca tabel CSV dari <code className="rounded bg-muted px-1">{tablesDir}</code> — sengaja tidak ikut repo (berisi
          nama orang). Unggah dengan skrip <code className="rounded bg-muted px-1">scripts/seed/upload-supply-chain-tables.mjs</code>.
        </p>
      </CardContent>
    </Card>
  );
}

/** Tombol segmen kecil (pilihan tunggal) — dipakai untuk Ringkas | Detail dan Ton | %. */
export function SegmentToggle<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-md border bg-muted/50 p-0.5 text-xs", className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded px-3 py-1 font-medium transition-colors", value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tombol segmen Ringkas | Detail. */
export function ModeToggle({ mode, onChange, className }: { mode: SankeyMode; onChange: (m: SankeyMode) => void; className?: string }) {
  return (
    <SegmentToggle
      value={mode}
      onChange={onChange}
      label="Tingkat rincian"
      className={className}
      options={[{ value: "RINGKAS", label: "Ringkas" }, { value: "RINCI", label: "Detail" }]}
    />
  );
}

export function SupplyChainDashboardClient({ view, helpSlot }: { view: SupplyChainView; helpSlot?: React.ReactNode }) {
  const f = useSupplyChainFilters(view);
  const { records, offtakers, millsById } = f;
  const [mode, setMode] = useState<SankeyMode>("RINGKAS");
  const [top, setTop] = useState<(typeof TOP_OPTIONS)[number]>("12");
  const [unit, setUnit] = useState<SankeyUnit>("TON");
  const [origin, setOrigin] = useState<SankeyOrigin>("LEMBAGA");
  const [destination, setDestination] = useState<SankeyDestination>("MILL");

  const summary = useMemo(() => summarizeSupplyChain(records, offtakers), [records, offtakers]);

  // Reset di kartu diagram: bar filter sudah di luar layar saat diagram dibaca.
  const chipMill = f.filter.millId ? millsById.get(f.filter.millId) : undefined;
  const activeFilters = [
    f.district && `Distrik: ${f.district}`,
    f.category && `Kategori: ${GROUP_CATEGORY_LABEL[f.category]}`,
    f.filter.groupCode && `Lembaga: ${view.data.groups.find((g) => g.code === f.filter.groupCode)?.abrv ?? f.filter.groupCode}`,
    f.filter.collectorId && `Agen: ${offtakers.get(f.filter.collectorId)?.name ?? f.filter.collectorId}`,
    f.filter.rampId && `RAMP: ${offtakers.get(f.filter.rampId)?.name ?? f.filter.rampId}`,
    f.filter.millId && (f.filter.millId === UNKNOWN_MILL_FILTER ? "Mill tidak diketahui" : `Mill: ${chipMill ? millLabel(chipMill) : f.filter.millId}`),
    f.filter.ul && UL_FILTER_LABEL[f.filter.ul],
  ].filter((x): x is string => !!x);
  const viewChanged = mode !== "RINGKAS" || origin !== "LEMBAGA" || destination !== "MILL" || unit !== "TON";
  const resetAll = () => {
    f.reset();
    setMode("RINGKAS");
    setOrigin("LEMBAGA");
    setDestination("MILL");
    setUnit("TON");
  };
  const graph = useMemo(() => buildSupplyChainSankey(view.data, records, { mode, origin, destination, maxPerColumn: mode === "RINGKAS" ? RINGKAS_MILLS : Number(top) }), [view.data, records, mode, origin, destination, top]);
  const millRows = useMemo(() => millVolumes(records, millsById), [records, millsById]);

  // Asal PKS: disebut langsung di survei vs dipetakan dari nama PT lewat UML (dikonfirmasi owner 2026-10-06).
  const namedPksTon = useMemo(() => records.filter((r) => r.millBasis === "NAMA_PKS" && r.millStatus === "PKS_PASTI").reduce((a, r) => a + (r.supplyTon ?? 0), 0), [records]);

  const offTypeCount = useMemo(() => {
    const ids = new Set(records.flatMap((r) => [r.offtakerId, r.nextOfftakerId]).filter((x): x is string => !!x));
    const c = { AGEN: 0, RAMP: 0, KT: 0, KOPERASI: 0 };
    for (const id of ids) {
      const o = offtakers.get(id);
      if (o) c[o.type]++;
    }
    return c;
  }, [records, offtakers]);

  const cards = [
    {
      title: "TBS Dideklarasikan",
      value: fmtTon(summary.totalTon),
      sub: <>dari <StatEmph kind="total">{formatNumber(summary.groupCount)}</StatEmph> Lembaga · survei {f.year ?? "—"}</>,
      icon: Weight,
      iconClass: "text-emerald-600",
    },
    {
      title: "Ke Mill Pemasok UL",
      value: fmtTon(summary.ulTon),
      sub: <><StatEmph kind="percent">{pct(summary.ulTon, summary.totalTon)}</StatEmph> dari tonase dideklarasikan</>,
      icon: Factory,
      iconClass: "text-sky-600",
    },
    {
      title: "Sampai PKS Pasti",
      value: pct(summary.tonByStatus.PKS_PASTI, summary.totalTon),
      sub: (
        <>
          {pct(namedPksTon, summary.totalTon)} disebut di survei · {pct(summary.tonByStatus.PKS_PASTI - namedPksTon, summary.totalTon)} dipetakan dari nama PT ·{" "}
          {pct(summary.tonByStatus.TIDAK_DIKETAHUI, summary.totalTon)} tak diketahui
        </>
      ),
      icon: BadgeCheck,
      iconClass: "text-violet-600",
    },
    {
      title: "Offtaker",
      value: formatNumber(summary.offtakerCount),
      sub: <>{offTypeCount.AGEN} Agen · {offTypeCount.RAMP} RAMP · {offTypeCount.KT + offTypeCount.KOPERASI} KT/Koperasi</>,
      icon: Truck,
      iconClass: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Dashboard Rantai Pasok</h1>
            <Badge variant="outline" className="gap-1"><FlaskConical className="h-3 w-3" /> Prototipe</Badge>
            {helpSlot}
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Ke mana petani dan dealer <span className="font-medium text-foreground">menyatakan</span> menjual TBS — data pengakuan survei, bukan
            bukti transaksi.
          </p>
        </div>
        <Link href={`/admin/map/supply-chain${f.query ? `?${f.query}` : ""}`} className={cn(buttonVariants({ variant: "outline" }), "gap-2 shrink-0")}>
          <MapIcon className="h-4 w-4" /> Lihat di Peta
        </Link>
      </div>

      <SupplyChainFilterBar f={f} years={view.years} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="shadow-sm border border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <Icon className={`h-4 w-4 ${card.iconClass}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ChannelComposition summary={summary} />
      <DataNotes summary={summary} records={records} view={view} />

      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Aliran TBS: Lembaga → Offtaker → Mill</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Arahkan kursor ke {origin === "DISTRIK" ? "Distrik" : "Lembaga"} atau Mill untuk menyalakan seluruh jalurnya. Klik node untuk memfilter
                {mode === "RINGKAS" ? "; klik Agen / RAMP / KT/Koperasi untuk melihat per offtaker." : "."} Rantai Agen → RAMP tampil sebagai satu node.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              {(activeFilters.length > 0 || viewChanged) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  title={activeFilters.length > 0 ? `Filter aktif — ${activeFilters.join(" · ")}` : "Kembalikan tampilan bawaan"}
                  className="h-8 gap-1.5 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                  {activeFilters.length > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{activeFilters.length}</span>
                  )}
                </Button>
              )}
              {mode === "RINCI" && (
                <Select value={top} onValueChange={(v) => setTop(v as (typeof TOP_OPTIONS)[number])}>
                  <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TOP_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t === "999" ? "Semua node" : `${t} teratas/kolom`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <SegmentToggle
                value={origin}
                onChange={setOrigin}
                label="Kelompok asal"
                options={[{ value: "LEMBAGA", label: "Lembaga" }, { value: "DISTRIK", label: "Distrik" }]}
              />
              <SegmentToggle
                value={destination}
                onChange={setDestination}
                label="Kelompok tujuan"
                options={[{ value: "MILL", label: "Mill" }, { value: "UL", label: "UL / Non-UL" }]}
              />
              <SegmentToggle
                value={unit}
                onChange={setUnit}
                label="Satuan label"
                options={[{ value: "TON", label: "Ton" }, { value: "PCT", label: "%" }]}
              />
              <ModeToggle mode={mode} onChange={setMode} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <SupplyChainSankey
            graph={graph}
            unit={unit}
            onSelectNode={(n) => {
              if (isGroupNode(n)) setMode("RINCI");
              else if (n.id.startsWith("U:")) {
                // Klik UL/Non-UL = filter UL lalu turun ke rincian per Mill.
                f.update({ ul: n.id.slice(2) });
                setDestination("MILL");
              } else if (n.id.startsWith("D:")) {
                // Klik Distrik = filter distrik lalu turun ke rincian per Lembaga.
                f.update({ distrik: n.id.slice(2) });
                setOrigin("LEMBAGA");
              }
              else if (n.column === 0 && n.groupCode) f.update({ lembaga: n.groupCode });
              else if (n.column === 1) {
                // Satu bagian offtaker: rantai → filter Agen + RAMP; tunggal → sesuai tipenya.
                const chain = parseChainNodeId(n.id);
                if (chain) f.update({ agen: chain.collectorId, ramp: chain.rampId });
                else if (offtakers.get(n.id.slice(2))?.type === "RAMP") f.update({ ramp: n.id.slice(2) });
                else f.update({ agen: n.id.slice(2) });
              }
              else f.update({ mill: n.id === "M:?" ? UNKNOWN_MILL_FILTER : n.id.slice(2) });
            }}
          />
        </CardContent>
      </Card>

      <MillTable rows={millRows} total={summary.totalTon} onSelect={(id) => f.update({ mill: id ?? UNKNOWN_MILL_FILTER })} />
    </div>
  );
}

/** Komposisi jalur TBS (100%) — sekaligus legenda warna Sankey & peta. */
function ChannelComposition({ summary }: { summary: SupplyChainSummary }) {
  const dark = useChartDark();
  const total = CHANNEL_ORDER.reduce((a, c) => a + summary.tonByChannel[c], 0);
  if (total <= 0) return null;
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="py-4 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Jalur TBS dari petani</span>
          <span className="text-xs text-muted-foreground">warna ini dipakai di diagram &amp; peta</span>
        </div>
        <div className="flex h-7 w-full gap-0.5 overflow-hidden rounded-md" role="img" aria-label="Komposisi jalur TBS">
          {CHANNEL_ORDER.map((c) => {
            const share = summary.tonByChannel[c] / total;
            if (share <= 0) return null;
            return (
              <div
                key={c}
                className="flex items-center justify-center text-[11px] font-semibold text-white"
                style={{ width: `${share * 100}%`, background: channelColor(c, dark) }}
                title={`${CHANNEL_LABEL[c]}: ${fmtTon(summary.tonByChannel[c])} (${pct(summary.tonByChannel[c], total)})`}
              >
                {share >= 0.07 && pct(summary.tonByChannel[c], total)}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {CHANNEL_ORDER.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: channelColor(c, dark) }} />
              <span className="text-foreground">{CHANNEL_LABEL[c]}</span>
              <span className="tabular-nums text-muted-foreground">{fmtTon(summary.tonByChannel[c])}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Catatan kualitas data — satu baris ringkas, rincian dilipat. */
function DataNotes({ summary, records, view }: { summary: SupplyChainSummary; records: SupplyChainView["data"]["records"]; view: SupplyChainView }) {
  const [open, setOpen] = useState(false);
  const flagCount = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of records) for (const fl of r.flags) c.set(fl, (c.get(fl) ?? 0) + 1);
    return c;
  }, [records]);
  const levelByDistrict = useMemo(() => {
    const gd = new Map(view.data.groups.map((g) => [g.code, g.districtName]));
    const m = new Map<string, { lahan: number; dealer: number }>();
    for (const r of records) {
      const d = gd.get(r.groupCode) ?? "?";
      const acc = m.get(d) ?? { lahan: 0, dealer: 0 };
      acc[r.level === "LAHAN" ? "lahan" : "dealer"] += r.supplyTon ?? 0;
      m.set(d, acc);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [records, view.data.groups]);
  const n = (k: string) => flagCount.get(k) ?? 0;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left" aria-expanded={open}>
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="flex-1 text-muted-foreground">
          <span className="font-medium text-foreground">Catatan data:</span> {formatNumber(summary.recordsWithoutTon)} baris tanpa tonase ·{" "}
          {fmtTon(summary.tonByStatus.TIDAK_DIKETAHUI)} ke Mill tak diketahui · data pengakuan, bukan bukti transaksi
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-amber-500/20 px-4 py-3 text-xs text-muted-foreground md:grid-cols-2">
          <div>
            <div className="mb-1 font-medium text-foreground">Tingkat form per distrik</div>
            {levelByDistrict.map(([d, v]) => (
              <div key={d} className="flex justify-between gap-2 tabular-nums">
                <span>{d}</span>
                <span>
                  {v.lahan > 0 && `per lahan ${fmtTon(v.lahan)}`}
                  {v.lahan > 0 && v.dealer > 0 && " · "}
                  {v.dealer > 0 && `per dealer ${fmtTon(v.dealer)}`}
                </span>
              </div>
            ))}
            <p className="mt-1">Siak memakai form per lahan; rekap dealer Siak tidak dipakai karena merangkum lahan yang sama. Rantai Agen → RAMP hanya tercatat di form per dealer.</p>
          </div>
          <ul className="list-disc space-y-1 pl-4">
            <li>Baris tanpa tonase (kosong, &quot;Belum Tersedia&quot;, atau beberapa PT dalam satu sel) tidak ikut diagram.</li>
            {n("DUA_MILL") > 0 && <li>{n("DUA_MILL")} baris lahan menyebut dua Mill (Mill offtaker + Mill UL) — dipecah jadi dua aliran.</li>}
            {n("TIPE_DEALER_ASUMSI_AGEN") > 0 && <li>{n("TIPE_DEALER_ASUMSI_AGEN")} baris dealer Kampar diasumsikan Agen — form tidak menyebut tipenya.</li>}
            {n("SUPPLY_MELEBIHI_PRODUKSI") > 0 && <li>{n("SUPPLY_MELEBIHI_PRODUKSI")} baris supply ke offtaker &gt; produksi lahan (peringatan K10).</li>}
            {n("PARCEL_TIDAK_COCOK") > 0 && <li>{n("PARCEL_TIDAK_COCOK")} baris Parcel ID tak ditemukan di MIS.</li>}
            <li>Survei yang hanya menyebut nama PT dipetakan ke PKS Universal Mill List (satu-satunya PKS PT itu, atau yang terdekat ke Lembaga) — dikonfirmasi benar 2026-10-06.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

const STATUS_ICON: Record<MillStatus, { icon: typeof CircleCheck; className: string }> = {
  PKS_PASTI: { icon: CircleCheck, className: "text-emerald-600" },
  PKS_BELUM_PASTI: { icon: CircleDashed, className: "text-amber-600" },
  TIDAK_DIKETAHUI: { icon: CircleHelp, className: "text-muted-foreground" },
};

function MillTable({ rows, total, onSelect }: { rows: MillVolumeRow[]; total: number; onSelect: (millId: string | null) => void }) {
  const [showAll, setShowAll] = useState(false);
  const max = Math.max(1, ...rows.map((r) => r.ton));
  const visible = showAll ? rows : rows.slice(0, MILL_ROWS_COLLAPSED);
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Volume per Mill</CardTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(Object.keys(STATUS_ICON) as MillStatus[]).filter((s) => rows.some((r) => r.status === s)).map((s) => {
              const { icon: Icon, className } = STATUS_ICON[s];
              return (
                <span key={s} className="inline-flex items-center gap-1">
                  <Icon className={cn("h-3.5 w-3.5", className)} /> {MILL_STATUS_LABEL[s]}
                </span>
              );
            })}
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-primary" /> porsi ke UL
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Mill</th>
              <th className="py-2 pr-3 font-medium w-[38%]">Tonase</th>
              <th className="py-2 pr-3 text-right font-medium">Porsi</th>
              <th className="py-2 pr-3 text-right font-medium">Lembaga</th>
              <th className="py-2 text-right font-medium">Offtaker</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => {
              const { icon: Icon, className } = STATUS_ICON[m.status];
              return (
                <tr
                  key={m.millId ?? "?"}
                  className="group cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  title={`${MILL_STATUS_LABEL[m.status]} — ${MILL_BASIS_LABEL[m.basis] ?? m.basis}. Klik untuk memfilter Mill ini.`}
                  onClick={() => onSelect(m.millId)}
                >
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", className)} aria-label={MILL_STATUS_LABEL[m.status]} />
                      <span className="font-medium group-hover:text-primary">{m.name}</span>
                      {m.isUl && <Badge className="h-4 px-1.5 text-[10px]">UL</Badge>}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">
                    {m.ton > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${(m.ulTon / max) * 100}%` }} />
                          <div className="h-full bg-foreground/35" style={{ width: `${(Math.max(m.ton - m.ulTon, 0) / max) * 100}%` }} />
                        </div>
                        <span className="w-20 text-right tabular-nums">{fmtTon(m.ton)}</span>
                      </div>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">tonase belum tersedia</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{pct(m.ton, total)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{m.groupCount}</td>
                  <td className="py-1.5 text-right tabular-nums">{m.offtakerCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > MILL_ROWS_COLLAPSED && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Tampilkan 10 teratas" : `Tampilkan semua (${rows.length} Mill)`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
