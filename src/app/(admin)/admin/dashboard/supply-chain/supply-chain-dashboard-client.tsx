"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, ChevronDown, Download, Factory, FlaskConical, Loader2, Map as MapIcon, Truck, Weight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatEmph } from "@/components/shared/stat-emph";
import { formatNumber } from "@/lib/format";
import {
  CHANNEL_LABEL,
  CHANNEL_ORDER,
  UNKNOWN_MILL_FILTER,
  millVolumes,
  summarizeSupplyChain,
  type ScRecord,
  type SupplyChainSummary,
  type SupplyChainView,
} from "@/lib/supply-chain-flow";
import { distanceStats, groupVolumes, millKey, supplyChainInsights } from "@/lib/supply-chain-insights";
import { channelColor, fmtTon, useChartDark } from "./supply-chain-sankey";
import { CollapsibleCard } from "./collapsible-card";
import { SupplyChainFlowCard } from "./supply-chain-flow-card";
import { SupplyChainFilterBar } from "./supply-chain-filter-bar";
import { SupplyChainFilterChips, notifyFilter, pctOf } from "./supply-chain-filter-chips";
import { SupplyChainInsightsCard } from "./supply-chain-insights-card";
import { SupplyChainMillTable } from "./supply-chain-mill-table";
import { GROUP_TABLE_ID, SupplyChainGroupTable, groupDefaultDir, type GroupSortKey } from "./supply-chain-group-table";
import { useTableSort } from "./sort-head";
import { useSupplyChainFilters, type ScFilterParam } from "./use-supply-chain-filters";

/**
 * Keadaan kosong bila tabel CSV tidak ada di server ini. Detail teknis (path, bucket, skrip)
 * hanya bila `tablesDir` dikirim — server mengirimnya untuk SUPERADMIN saja.
 */
export function SupplyChainUnavailable({ tablesDir }: { tablesDir: string | null }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Data prototipe rantai pasok belum tersedia di server ini.</p>
        {tablesDir ? (
          <p>
            Halaman ini membaca tabel CSV dari <code className="rounded bg-muted px-1">{tablesDir}</code> — sengaja tidak ikut repo (berisi
            nama orang). Unggah dengan skrip <code className="rounded bg-muted px-1">scripts/seed/upload-supply-chain-tables.mjs</code>.
          </p>
        ) : (
          <p>Hubungi admin aplikasi bila data ini dibutuhkan.</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Susunan halaman (owner 2026-10-10): header (Unduh Excel · Lihat di Peta) →
 * bar filter + chip filter global → kartu KPI → Sorotan → Jalur & Kepastian
 * Mill → Aliran TBS → Volume per Mill → Volume per Lembaga → Catatan data.
 */
export function SupplyChainDashboardClient({ view, helpSlot, canExport = false }: { view: SupplyChainView; helpSlot?: React.ReactNode; canExport?: boolean }) {
  const f = useSupplyChainFilters(view);
  const { records, offtakers, millsById } = f;

  const summary = useMemo(() => summarizeSupplyChain(records, offtakers), [records, offtakers]);
  const millRows = useMemo(() => millVolumes(records, millsById), [records, millsById]);
  const millDist = useMemo(() => distanceStats(records, view.data, millKey), [records, view.data]);
  const groupRows = useMemo(() => groupVolumes(records, view.data), [records, view.data]);
  const insights = useMemo(() => supplyChainInsights(records, view.data), [records, view.data]);
  const groupSort = useTableSort<GroupSortKey>({ key: "TON", dir: "desc" }, groupDefaultDir);

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

  /** Tautan ke Peta Rantai Pasok dengan filter aktif + tambahan. */
  const mapHref = useCallback(
    (patch: Partial<Record<ScFilterParam, string>> = {}) => {
      const p = new URLSearchParams(f.query);
      for (const [k, v] of Object.entries(patch)) p.set(k, v);
      const q = p.toString();
      return `/admin/map/supply-chain${q ? `?${q}` : ""}`;
    },
    [f.query],
  );
  const filterMill = (millId: string | null, label: string) => {
    f.update({ mill: millId ?? UNKNOWN_MILL_FILTER });
    notifyFilter(label);
  };
  const filterGroup = (code: string, label: string) => {
    f.update({ lembaga: code });
    notifyFilter(label);
  };
  const focusGroups = (key: GroupSortKey) => {
    groupSort.setSort({ key, dir: key === "PASTI" ? "asc" : "desc" });
    document.getElementById(GROUP_TABLE_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    setExporting(true);
    try {
      const [{ exportMultiSheetToExcel }, { supplyChainExportSheets, supplyChainExportFilename }] = await Promise.all([import("@/lib/xlsx"), import("@/lib/supply-chain-xlsx")]);
      const parts = [f.district, f.category, f.filter.groupCode, f.filter.collectorId, f.filter.rampId, f.filter.millId, f.filter.ul].filter((x): x is string => !!x);
      await exportMultiSheetToExcel({ filename: supplyChainExportFilename(f.year, parts), sheets: supplyChainExportSheets(records, view.data) });
    } catch {
      toast.error("Gagal membuat berkas Excel");
    } finally {
      setExporting(false);
    }
  };

  const cards = [
    {
      title: "TBS",
      value: fmtTon(summary.totalTon),
      sub: <>dari <StatEmph kind="total">{formatNumber(summary.groupCount)}</StatEmph> Lembaga · survei {f.year ?? "—"}</>,
      icon: Weight,
      iconClass: "text-emerald-600",
    },
    {
      title: "Ke Mill Pemasok UL",
      value: fmtTon(summary.ulTon),
      sub: <><StatEmph kind="percent">{pctOf(summary.ulTon, summary.totalTon)}</StatEmph> dari TBS</>,
      icon: Factory,
      iconClass: "text-sky-600",
    },
    {
      title: "Sampai PKS Pasti",
      value: pctOf(summary.tonByStatus.PKS_PASTI, summary.totalTon),
      sub: <><StatEmph kind="percent">{pctOf(namedPksTon, summary.totalTon)}</StatEmph> disebut langsung di survei · rinciannya di batang Kepastian Mill</>,
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
        <div className="flex shrink-0 flex-wrap gap-2">
          {canExport && (
            <Button variant="outline" onClick={exportExcel} disabled={exporting || records.length === 0} className="gap-2" title="Unduh Excel: sheet Jalur · Mill · Lembaga mengikuti filter aktif">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Unduh Excel
            </Button>
          )}
          <Link href={mapHref()} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <MapIcon className="h-4 w-4" /> Lihat di Peta
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        <SupplyChainFilterBar f={f} years={view.years} showReset={false} />
        <SupplyChainFilterChips f={f} view={view} className="px-1" />
      </div>

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

      <SupplyChainInsightsCard insights={insights} onFilterMill={filterMill} onFilterGroup={filterGroup} onFocusGroups={focusGroups} />

      <ChannelComposition summary={summary} namedPksTon={namedPksTon} onSelectUnknown={() => filterMill(null, "Mill tidak diketahui")} />

      <SupplyChainFlowCard view={view} f={f} />

      <SupplyChainMillTable
        rows={millRows}
        total={summary.totalTon}
        distances={millDist}
        selectedMillId={f.filter.millId}
        onSelect={(m) => filterMill(m.millId, m.name)}
        mapHref={(millId) => mapHref({ mill: millId ?? UNKNOWN_MILL_FILTER })}
      />

      <SupplyChainGroupTable
        rows={groupRows}
        sort={groupSort.sort}
        onToggleSort={groupSort.toggle}
        selectedCode={f.filter.groupCode}
        onSelect={(g) => filterGroup(g.code, g.abrv)}
        mapHref={(code) => mapHref({ lembaga: code })}
      />

      <DataNotes summary={summary} records={records} view={view} />
    </div>
  );
}

/** Satu batang 100% bersegmen + legenda di bawahnya. */
function StackedBar({
  label,
  segments,
  total,
  ariaLabel,
}: {
  label: React.ReactNode;
  /** `color` = warna inline (palet jalur); `colorClass` = kelas Tailwind (warna status). */
  segments: { key: string; label: string; ton: number; color?: string; colorClass?: string; onClick?: () => void; title?: string }[];
  total: number;
  ariaLabel: string;
}) {
  if (total <= 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-foreground">{label}</div>
      <div className="flex h-7 w-full gap-0.5 overflow-hidden rounded-md" role="img" aria-label={ariaLabel}>
        {segments.map((s) => {
          const share = s.ton / total;
          if (share <= 0) return null;
          const common = {
            className: cn("flex items-center justify-center text-[11px] font-semibold text-white", s.colorClass, s.onClick && "cursor-pointer hover:brightness-110"),
            style: { width: `${share * 100}%`, background: s.color },
            title: s.title ?? `${s.label}: ${fmtTon(s.ton)} (${pctOf(s.ton, total)})`,
          };
          const text = share >= 0.07 && pctOf(s.ton, total);
          return s.onClick ? (
            <button key={s.key} type="button" onClick={s.onClick} {...common}>{text}</button>
          ) : (
            <div key={s.key} {...common}>{text}</div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", s.colorClass)} style={{ background: s.color }} />
            <span className="text-foreground">{s.label}</span>
            <span className="tabular-nums text-muted-foreground">{fmtTon(s.ton)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Jalur TBS (100%) — sekaligus legenda warna Sankey & peta — dan batang
 * Kepastian Mill (owner 2026-10-10: tiga persen di sub-teks kartu KPI sulit
 * dibaca). Segmen "tak diketahui" bisa diklik → filter Mill tidak diketahui.
 */
function ChannelComposition({ summary, namedPksTon, onSelectUnknown }: { summary: SupplyChainSummary; namedPksTon: number; onSelectUnknown: () => void }) {
  const dark = useChartDark();
  const total = CHANNEL_ORDER.reduce((a, c) => a + summary.tonByChannel[c], 0);
  if (total <= 0) return null;
  const s = summary.tonByStatus;
  return (
    <CollapsibleCard id="jalur" title="Jalur TBS & Kepastian Mill" aside={<span className="text-xs text-muted-foreground">warna jalur dipakai di diagram &amp; peta</span>} contentClassName="space-y-4">
      <StackedBar
        label="Jalur TBS dari petani"
        ariaLabel="Komposisi jalur TBS"
        total={total}
        segments={CHANNEL_ORDER.map((c) => ({ key: c, label: CHANNEL_LABEL[c], ton: summary.tonByChannel[c], color: channelColor(c, dark) }))}
      />
      <StackedBar
        label="Kepastian Mill tujuan"
        ariaLabel="Kepastian Mill tujuan"
        total={summary.totalTon}
        segments={[
          { key: "disebut", label: "PKS disebut di survei", ton: namedPksTon, colorClass: "bg-emerald-600" },
          { key: "dipetakan", label: "PKS dipetakan dari nama PT", ton: Math.max(s.PKS_PASTI - namedPksTon, 0), colorClass: "bg-emerald-400" },
          { key: "belum", label: "PKS belum pasti", ton: s.PKS_BELUM_PASTI, colorClass: "bg-amber-500" },
          { key: "tak", label: "Mill tidak diketahui", ton: s.TIDAK_DIKETAHUI, colorClass: "bg-zinc-400", onClick: onSelectUnknown, title: `Mill tidak diketahui: ${fmtTon(s.TIDAK_DIKETAHUI)} (${pctOf(s.TIDAK_DIKETAHUI, summary.totalTon)}). Klik untuk memfilter.` },
        ]}
      />
    </CollapsibleCard>
  );
}

/** Catatan kualitas data — satu baris ringkas, rincian dilipat. Di bawah tabel agar tidak memotong alur baca. */
function DataNotes({ summary, records, view }: { summary: SupplyChainSummary; records: ScRecord[]; view: SupplyChainView }) {
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
          {fmtTon(summary.tonByStatus.TIDAK_DIKETAHUI)} ke Mill tak diketahui · jarak = garis lurus, bukan jarak tempuh · data pengakuan, bukan bukti transaksi
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
            <li>Jarak = garis lurus Lembaga → offtaker → Mill dari koordinat tabel (K8); offtaker tanpa koordinat dilompati, Lembaga/Mill tanpa koordinat tidak dihitung.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
