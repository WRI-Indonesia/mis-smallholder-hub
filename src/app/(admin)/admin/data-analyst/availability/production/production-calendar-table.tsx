"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { HeatCell } from "@/components/shared/score-visuals";
import { formatArea, formatNumber, formatPct, MONTH_NAMES_ID, MONTH_SHORT_ID } from "@/lib/format";
import { scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_BAR } from "@/lib/score-band-styles";
import { PRODUCTION_STALE_MONTHS } from "@/lib/data-completeness-registry";
import {
  cellAt,
  coveragePct,
  periodsOfYear,
  type ProductionAvailabilityDistrictRow,
  type ProductionRangeSummary,
  type ProductionSortKey,
} from "@/lib/production-availability";
import { getProductionAvailabilityFarmers, getProductionAvailabilityParcels } from "@/server/actions/production-availability";
import type {
  ProductionAvailabilityFarmerRow,
  ProductionAvailabilityGroupRow,
  ProductionAvailabilityParcelsResult,
  ProductionCellStats,
  ProductionParcelCell,
} from "@/types/production-availability";

type Loaded<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: T };

/** Penanda kualitas (K5): 0 = ada record 0 kg, TP = tanpa persil. */
export const MARKERS = {
  zero: { code: "0", label: "Record 0 kg", className: "bg-rose-200 text-rose-900" },
  noParcel: { code: "TP", label: "Tanpa persil", className: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100" },
} as const;

function Marker({ kind, children }: { kind: keyof typeof MARKERS; children?: React.ReactNode }) {
  const m = MARKERS[kind];
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-[3px] px-1 text-[9px] font-bold leading-[13px]", m.className)} aria-label={m.label}>
      {m.code}
      {children}
    </span>
  );
}

/** Penanda di pojok sel — hanya huruf, tanpa angka (angkanya di tooltip). */
function MarkerStrip({ cell }: { cell: { zeroRecords: number; noParcelRecords?: number } }) {
  const any = cell.zeroRecords > 0 || (cell.noParcelRecords ?? 0) > 0;
  if (!any) return null;
  return (
    <span className="pointer-events-none absolute right-0.5 top-0.5 flex gap-px">
      {cell.zeroRecords > 0 && <Marker kind="zero" />}
      {(cell.noParcelRecords ?? 0) > 0 && <Marker kind="noParcel" />}
    </span>
  );
}

const monthLabel = (period: string) => {
  const m = Number(period.slice(5, 7));
  return `${MONTH_NAMES_ID[m - 1] ?? period} ${period.slice(0, 4)}`;
};

/**
 * Sel kosong: bulan yang BELUM TIBA (setelah periode acuan) diredam supaya tidak
 * terbaca sebagai data bolong; bulan yang sudah lewat tanpa record = sel polos
 * (tanpa garis putus-putus — 12 × 30 kotak bergaris hanya jadi derau).
 */
function EmptyCell({ period, owner, future, compact }: { period: string; owner: string; future: boolean; compact?: boolean }) {
  return (
    <div
      className={cn("w-full rounded-[3px]", compact ? "h-6" : "h-7", future ? "bg-transparent" : "bg-muted/35")}
      title={future ? `${monthLabel(period)}: belum tiba` : `${monthLabel(period)} · ${owner}: tidak ada record`}
      aria-label={future ? "belum tiba" : "tidak ada record"}
    />
  );
}

/** Sel Distrik/Lembaga/petani × bulan: % lahan non-PSR melapor (K3) di atas skala heatmap. */
function CoverageCell({
  cell,
  nonPsrParcels,
  period,
  owner,
  future,
  compact,
}: {
  cell: ProductionCellStats | undefined;
  nonPsrParcels: number;
  period: string;
  owner: string;
  future: boolean;
  compact?: boolean;
}) {
  if (!cell || cell.records === 0) return <EmptyCell period={period} owner={owner} future={future} compact={compact} />;
  const pct = coveragePct(cell.parcelsReporting, nonPsrParcels);
  const rows = (
    <>
      {pct != null && <StatTooltipRow chip={BAND_BAR[scoreBand(pct)]} label="Lahan non-PSR melapor" value={`${formatNumber(cell.parcelsReporting)} / ${formatNumber(nonPsrParcels)} (${formatPct(pct)}%)`} />}
      <StatTooltipRow chip="bg-slate-400" label="Record" value={formatNumber(cell.records)} />
      <StatTooltipRow chip="bg-emerald-500" label="Σ hasil" value={`${formatNumber(Math.round(cell.kg))} kg`} />
      {cell.zeroRecords > 0 && <StatTooltipRow chip="bg-rose-500" label="Record 0 kg" value={formatNumber(cell.zeroRecords)} />}
      {cell.noParcelRecords > 0 && <StatTooltipRow chip="bg-slate-500" label="Tanpa persil" value={formatNumber(cell.noParcelRecords)} />}
    </>
  );
  const h = compact ? "h-6" : "h-7";
  if (pct == null) {
    // Tanpa lahan non-PSR → persen tak terdefinisi; tampilkan jumlah record, netral.
    return (
      <Tooltip>
        <TooltipTrigger render={<div className={cn("relative flex w-full items-center justify-center rounded-[3px] bg-slate-200 text-[11px] font-semibold tabular-nums text-slate-700 dark:bg-slate-700 dark:text-slate-100", h)} />}>
          {formatNumber(cell.records)} rec
          <MarkerStrip cell={cell} />
        </TooltipTrigger>
        <StatTooltipContent title={monthLabel(period)} subtitle={owner} footer="Tidak ada lahan non-PSR — persen tak dihitung">
          {rows}
        </StatTooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<HeatCell score={pct} className={cn("relative", h)} />}>
        {formatNumber(Math.round(pct))}
        <MarkerStrip cell={cell} />
      </TooltipTrigger>
      <StatTooltipContent title={monthLabel(period)} subtitle={owner}>
        {rows}
      </StatTooltipContent>
    </Tooltip>
  );
}

/** Sel lahan × bulan: kg; 0 kg merah; PSR dibisukan. Klik → Master Data Produksi (Lembaga + periode + petani). */
function ParcelCell({ cell, period, isPsr, href, future }: { cell: ProductionParcelCell | undefined; period: string; isPsr: boolean; href: string; future: boolean }) {
  if (!cell || cell.records === 0) {
    return (
      <div className={cn("flex h-6 items-center justify-center rounded-[3px] text-[10px] text-muted-foreground/40", isPsr && "bg-muted/40", future && "opacity-40")} title={future ? `${monthLabel(period)}: belum tiba` : `${monthLabel(period)}: tidak ada record`}>
        {future ? "" : "—"}
      </div>
    );
  }
  const zero = cell.kg === 0;
  return (
    <Link
      href={href}
      title={`${monthLabel(period)} · ${formatNumber(cell.records)} record · buka di Master Data Produksi`}
      className={cn(
        "relative flex h-6 items-center justify-center rounded-[3px] text-[11px] tabular-nums hover:ring-1 hover:ring-primary",
        isPsr ? "bg-muted/60 text-muted-foreground" : zero ? "bg-rose-100 font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" : "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
      )}
    >
      {formatNumber(Math.round(cell.kg))}
      <MarkerStrip cell={cell} />
    </Link>
  );
}

const productionHref = (groupId: string, period: string, search?: string) =>
  `/admin/master-data/production?farmerGroupId=${encodeURIComponent(groupId)}&period=${period}${search ? `&search=${encodeURIComponent(search)}` : ""}`;

/** Jumlah bulan tahun terpilih yang punya ≥1 record pada deretan sel. */
const monthsWithRecords = (cells: { period: string; records: number }[], periods: string[]) =>
  periods.filter((p) => (cellAt(cells, p)?.records ?? 0) > 0).length;

const EMPTY_SUMMARY: ProductionRangeSummary = {
  firstPeriod: null,
  lastPeriod: null,
  monthsByYear: {},
  gapMonths: null,
  futureLast: false,
  stale: false,
  totalRecords: 0,
  zeroRecords: 0,
  noParcelRecords: 0,
};

const gapTitle = (s: ProductionRangeSummary) =>
  s.gapMonths == null
    ? "Tidak ada record"
    : s.futureLast
      ? `Periode terakhir ${s.lastPeriod} melampaui bulan berjalan — periksa tahun pada record (salah ketik?)`
      : `${s.gapMonths} bulan sejak ${s.lastPeriod}${s.stale ? " — basi" : ""}`;

/** "2025-01" → "Jan 25": muat di kolom sempit, tetap terbaca. */
const shortPeriod = (p: string) => `${MONTH_SHORT_ID[Number(p.slice(5, 7)) - 1] ?? p} ${p.slice(2, 4)}`;

/** Empat kolom ringkasan rentang penuh — sama untuk baris Distrik dan Lembaga. */
function SummaryCells({ sum, year }: { sum: ProductionRangeSummary; year: number }) {
  const monthsYear = sum.monthsByYear[String(year)] ?? 0;
  const none = sum.totalRecords === 0;
  return (
    <>
      <td className="px-1 py-0 text-center text-xs tabular-nums" title={`Bulan ber-data per tahun: ${Object.entries(sum.monthsByYear).map(([y, n]) => `${y}: ${n}`).join(" · ") || "—"}`}>
        {none ? (
          <span className="text-muted-foreground/60">—</span>
        ) : (
          <>
            <span className={cn("font-semibold", monthsYear === 12 ? "text-emerald-700 dark:text-emerald-400" : monthsYear === 0 ? "text-muted-foreground" : "")}>{monthsYear}</span>
            <span className="text-muted-foreground">/12</span>
          </>
        )}
      </td>
      <td className="whitespace-nowrap px-1 py-0 text-center text-[11px] tabular-nums text-muted-foreground" title={sum.firstPeriod ? `${sum.firstPeriod} – ${sum.lastPeriod}` : "Tidak ada record"}>
        {sum.firstPeriod && sum.lastPeriod ? `${shortPeriod(sum.firstPeriod)} – ${shortPeriod(sum.lastPeriod)}` : "—"}
      </td>
      <td className={cn("px-1 py-0 text-center text-xs tabular-nums", sum.stale ? "font-semibold text-rose-600" : sum.futureLast ? "font-semibold text-amber-600" : "text-muted-foreground")} title={gapTitle(sum)}>
        {sum.gapMonths == null ? "—" : sum.futureLast ? `${sum.gapMonths}!` : sum.gapMonths}
      </td>
      <td className="px-1 py-0">
        <div className="flex h-7 items-center justify-center gap-1">
          {sum.zeroRecords > 0 && (
            <span title={`${formatNumber(sum.zeroRecords)} record 0 kg`}>
              <Marker kind="zero">{formatNumber(sum.zeroRecords)}</Marker>
            </span>
          )}
          {sum.noParcelRecords > 0 && (
            <span title={`${formatNumber(sum.noParcelRecords)} record tanpa ID Lahan`}>
              <Marker kind="noParcel">{formatNumber(sum.noParcelRecords)}</Marker>
            </span>
          )}
          {sum.zeroRecords === 0 && sum.noParcelRecords === 0 && <span className="text-xs text-muted-foreground/60">—</span>}
        </div>
      </td>
    </>
  );
}

/** Sel nama lengket di kiri — latar opak supaya sel bulan yang tergulir di bawahnya tidak tembus. */
const NAME_CELL = "sticky left-0 z-10 bg-card px-1 py-0 pr-2 transition-colors";

export function ProductionCalendarTable({
  groups,
  districts,
  summaries,
  treeCommand,
  year,
  referencePeriod,
  sortKey,
  onSort,
  emptyMessage,
}: {
  groups: ProductionAvailabilityGroupRow[];
  /** Baris Distrik (tingkat teratas) atau `null` = tanpa tingkat Distrik. */
  districts: ProductionAvailabilityDistrictRow[] | null;
  /** Ringkasan rentang per id baris (Lembaga & Distrik), dihitung sekali di induk. */
  summaries: Map<string, ProductionRangeSummary>;
  /** Perintah pohon dari toolbar induk (owner 2026-10-11): `seq` naik tiap klik agar perintah yang sama bisa diulang. */
  treeCommand: { kind: "collapse" | "expandDistricts"; seq: number } | null;
  year: number;
  referencePeriod: string;
  sortKey: ProductionSortKey;
  onSort: (key: ProductionSortKey) => void;
  emptyMessage: string;
}) {
  const periods = periodsOfYear(year);
  const isFuture = (p: string) => p > referencePeriod;
  // Cache anak berkunci tahun — ganti tahun tidak membuang yang sudah dimuat untuk tahun lain.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedFarmers, setExpandedFarmers] = useState<Set<string>>(new Set());
  // Distrik bawaan TERBUKA (himpunan yang ditutup, bukan yang dibuka — Distrik yang
  // baru muncul karena filter berubah ikut terbuka tanpa klik).
  const [collapsedDistricts, setCollapsedDistricts] = useState<Set<string>>(new Set());
  // Tutup semua = semua tingkat dilipat (Distrik, Lembaga, petani); Buka Distrik =
  // kembali ke bawaan (Distrik terbuka, Lembaga tertutup). "Buka semua" sengaja
  // tidak ada: membuka 30-an Lembaga sekaligus = 30-an permintaan + ribuan baris.
  useEffect(() => {
    if (!treeCommand) return;
    if (treeCommand.kind === "collapse") {
      setCollapsedDistricts(new Set((districts ?? []).map((d) => d.id)));
      setExpandedGroups(new Set());
      setExpandedFarmers(new Set());
    } else {
      setCollapsedDistricts(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeCommand?.seq]);
  const toggleDistrict = (id: string) => {
    const next = new Set(collapsedDistricts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedDistricts(next);
  };
  const [farmers, setFarmers] = useState<Map<string, Loaded<ProductionAvailabilityFarmerRow[]>>>(new Map());
  const [parcels, setParcels] = useState<Map<string, Loaded<ProductionAvailabilityParcelsResult>>>(new Map());

  const loadFarmers = useCallback((id: string, y: number) => {
    const key = `${y}:${id}`;
    // Entri error juga diganti "loading" saat dicoba ulang: spinner tampil dan `needsLoad`
    // tak memicu permintaan ganda selama yang pertama berjalan (review pra-rilis v1.7.0).
    setFarmers((m) => (m.has(key) && m.get(key)!.state !== "error" ? m : new Map(m).set(key, { state: "loading" })));
    getProductionAvailabilityFarmers(id, y)
      .then((data) => setFarmers((m) => new Map(m).set(key, { state: "ready", data })))
      .catch((e: unknown) => setFarmers((m) => new Map(m).set(key, { state: "error", message: e instanceof Error ? e.message : "Gagal memuat" })));
  }, []);
  const loadParcels = useCallback((id: string, y: number) => {
    const key = `${y}:${id}`;
    // Entri error juga diganti "loading" saat dicoba ulang: spinner tampil dan `needsLoad`
    // tak memicu permintaan ganda selama yang pertama berjalan (review pra-rilis v1.7.0).
    setParcels((m) => (m.has(key) && m.get(key)!.state !== "error" ? m : new Map(m).set(key, { state: "loading" })));
    getProductionAvailabilityParcels(id, y)
      .then((data) => setParcels((m) => new Map(m).set(key, { state: "ready", data })))
      .catch((e: unknown) => setParcels((m) => new Map(m).set(key, { state: "error", message: e instanceof Error ? e.message : "Gagal memuat" })));
  }, []);

  // Entri error dianggap belum dimuat → klik lagi / ganti tahun memuat ulang (review #416).
  const needsLoad = <T,>(m: Map<string, Loaded<T>>, key: string) => {
    const cur = m.get(key);
    return !cur || cur.state === "error";
  };
  const toggleGroup = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id);
    else {
      next.add(id);
      if (needsLoad(farmers, `${year}:${id}`)) loadFarmers(id, year);
    }
    setExpandedGroups(next);
  };
  const toggleFarmer = (id: string) => {
    const next = new Set(expandedFarmers);
    if (next.has(id)) next.delete(id);
    else {
      next.add(id);
      if (needsLoad(parcels, `${year}:${id}`)) loadParcels(id, year);
    }
    setExpandedFarmers(next);
  };
  // Tahun berganti → anak yang sedang terbuka DAN tampil dimuat untuk tahun itu
  // bila belum ada di cache; baris yang tersaring keluar tidak memicu permintaan
  // (review #416). `farmers`/`parcels` sengaja di luar dependensi: efek ini hanya
  // perlu berjalan saat tahun/himpunan terbuka/irisan berubah, bukan tiap hasil tiba.
  useEffect(() => {
    const visibleGroups = groups.filter((g) => expandedGroups.has(g.id)).map((g) => g.id);
    const visibleFarmers = new Set<string>();
    for (const [key, entry] of farmers) {
      const gid = key.slice(key.indexOf(":") + 1);
      if (entry.state === "ready" && visibleGroups.includes(gid)) for (const f of entry.data) visibleFarmers.add(f.id);
    }
    for (const id of visibleGroups) if (needsLoad(farmers, `${year}:${id}`)) loadFarmers(id, year);
    for (const id of expandedFarmers) if (visibleFarmers.has(id) && needsLoad(parcels, `${year}:${id}`)) loadParcels(id, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, groups, expandedGroups, expandedFarmers, loadFarmers, loadParcels]);

  const headBtn = (key: ProductionSortKey, label: string, title?: string) => (
    <button
      type="button"
      onClick={() => onSort(key)}
      title={title ?? `Urutkan menurut ${label}`}
      className={cn("inline-flex items-center gap-1 hover:text-foreground", sortKey === key && "text-foreground")}
      aria-pressed={sortKey === key}
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === key ? "opacity-100" : "opacity-40")} />
    </button>
  );

  const COLS = periods.length + 6;
  const indent = (depth: number) => ({ paddingLeft: depth * 18 });
  const stateRow = (depth: number, content: React.ReactNode, key: string) => (
    <tr key={key}>
      <td colSpan={COLS} className="px-2 py-1.5 text-xs text-muted-foreground" style={indent(depth)}>
        {content}
      </td>
    </tr>
  );

  /** Satu Lembaga + (bila terbuka) petani → lahan. `depth` 0 tanpa Distrik, 1 di bawah Distrik. */
  const renderGroup = (g: ProductionAvailabilityGroupRow, depth: number) => {
    const open = expandedGroups.has(g.id);
    const sum = summaries.get(g.id) ?? EMPTY_SUMMARY;
    const kids = farmers.get(`${year}:${g.id}`);
    return (
      <Fragment key={g.id}>
        <tr className="group/row align-middle">
          <td className={cn(NAME_CELL, "group-hover/row:bg-muted/50")}>
            <div className="flex h-7 min-w-0 items-center gap-1" style={indent(depth)}>
              <button
                type="button"
                onClick={() => toggleGroup(g.id)}
                aria-expanded={open}
                aria-label={`${open ? "Tutup" : "Buka"} petani ${g.name}`}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                disabled={g.totalFarmers === 0}
                title={g.totalFarmers === 0 ? "Tidak ada petani aktif" : `${formatNumber(g.totalFarmers)} petani`}
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90", g.totalFarmers === 0 && "opacity-30")} />
              </button>
              <Link
                href={`/admin/data-analyst/data-completeness?lembaga=${g.id}`}
                className="flex min-w-0 items-center gap-1 font-medium leading-tight text-primary hover:underline"
                title={`${g.name} — buka Ketersediaan Data › Per Lembaga`}
              >
                <span className="truncate">{g.name}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
              </Link>
              {/* Di bawah Distrik, nama distrik tidak diulang — cukup kode. */}
              <span className="shrink-0 truncate text-[11px] text-muted-foreground">{depth > 0 ? (g.code ?? "") : [g.code, g.districtName].filter(Boolean).join(" · ")}</span>
            </div>
          </td>
          <td className="px-1 py-0 text-right text-xs tabular-nums text-muted-foreground" title={`${formatNumber(g.nonPsrParcels)} lahan non-PSR dari ${formatNumber(g.totalParcels)} lahan aktif · ${formatNumber(g.totalFarmers)} petani`}>
            {formatNumber(g.nonPsrParcels)}
          </td>
          {periods.map((p) => (
            <td key={p} className="p-0">
              <CoverageCell cell={cellAt(g.cells, p)} nonPsrParcels={g.nonPsrParcels} period={p} owner={g.name} future={isFuture(p)} />
            </td>
          ))}
          <SummaryCells sum={sum} year={year} />
        </tr>

        {open && kids?.state === "loading" && stateRow(depth + 1, <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat petani…</span>, `${g.id}-loading`)}
        {open && kids?.state === "error" && stateRow(depth + 1, <span className="text-destructive">{kids.message} — klik ▸ lagi untuk mencoba ulang.</span>, `${g.id}-error`)}
        {open && kids?.state === "ready" && kids.data.length === 0 && stateRow(depth + 1, "Tidak ada petani aktif dalam cakupan akses Anda.", `${g.id}-empty`)}
        {open &&
          kids?.state === "ready" &&
          kids.data.map((f) => {
            const fOpen = expandedFarmers.has(f.id);
            const fKids = parcels.get(`${year}:${f.id}`);
            const fMonths = monthsWithRecords(f.cells, periods);
            const fLast = [...f.cells].filter((c) => c.records > 0).map((c) => c.period).sort().pop();
            return (
              <Fragment key={f.id}>
                <tr className="group/row align-middle text-[13px]">
                  <td className={cn(NAME_CELL, "group-hover/row:bg-muted/50")}>
                    <div className="flex h-6 min-w-0 items-center gap-1" style={indent(depth + 1)}>
                      <button
                        type="button"
                        onClick={() => toggleFarmer(f.id)}
                        aria-expanded={fOpen}
                        aria-label={`${fOpen ? "Tutup" : "Buka"} lahan ${f.name}`}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", fOpen && "rotate-90")} />
                      </button>
                      <Link href={`/admin/master-data/farmers/${f.id}`} className="truncate hover:underline" title={`${f.name} · ${f.farmerCode} — buka Detail Petani`}>
                        {f.name}
                      </Link>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{f.farmerCode}</span>
                    </div>
                  </td>
                  <td className="px-1 py-0 text-right text-[11px] tabular-nums text-muted-foreground" title={`${formatNumber(f.nonPsrParcels)} lahan non-PSR dari ${formatNumber(f.totalParcels)} lahan aktif`}>
                    {formatNumber(f.nonPsrParcels)}
                  </td>
                  {periods.map((p) => (
                    <td key={p} className="p-0">
                      <CoverageCell cell={cellAt(f.cells, p)} nonPsrParcels={f.nonPsrParcels} period={p} owner={f.name} future={isFuture(p)} compact />
                    </td>
                  ))}
                  <td className="px-1 py-0 text-center text-[11px] tabular-nums text-muted-foreground">{fMonths}/12</td>
                  <td className="px-1 py-0 text-center text-[11px] tabular-nums text-muted-foreground">{fLast ? shortPeriod(fLast) : "—"}</td>
                  <td className="px-1 py-0" colSpan={2} />
                </tr>
                {fOpen && fKids?.state === "loading" && stateRow(depth + 2, <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat lahan…</span>, `${f.id}-loading`)}
                {fOpen && fKids?.state === "error" && stateRow(depth + 2, <span className="text-destructive">{fKids.message} — klik ▸ lagi untuk mencoba ulang.</span>, `${f.id}-error`)}
                {fOpen && fKids?.state === "ready" && fKids.data.parcels.length === 0 && fKids.data.noParcel.length === 0 && stateRow(depth + 2, "Petani ini belum punya lahan aktif maupun record produksi.", `${f.id}-empty`)}
                {fOpen &&
                  fKids?.state === "ready" &&
                  fKids.data.parcels.map((p) => (
                    <tr key={p.id} className={cn("group/row align-middle text-xs", p.isPsr && "text-muted-foreground")}>
                      <td className={cn(NAME_CELL, "group-hover/row:bg-muted/50")}>
                        <div className="flex h-6 min-w-0 items-center gap-2" style={indent(depth + 2)}>
                          <span className="inline-block w-4" />
                          <Link href={`/admin/master-data/parcels/${p.id}`} className="truncate font-mono text-[11px] hover:underline" title={`${p.parcelCode} — buka Detail Lahan`}>
                            {p.parcelCode}
                          </Link>
                          {p.isPsr && <span className="rounded bg-muted px-1 text-[9px] font-semibold uppercase" title="PSR (peremajaan) — dikecualikan dari persen cakupan">PSR</span>}
                          {!p.isOwn && <span className="rounded bg-amber-100 px-1 text-[9px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" title="Lahan ini bukan lahan aktif petani ini (milik petani lain atau revisi lama) tetapi ditunjuk record-nya">lain</span>}
                        </div>
                      </td>
                      <td className="px-1 py-0 text-right text-[11px] tabular-nums text-muted-foreground" title="Luas (ha)">
                        {p.area != null ? formatArea(p.area) : "—"}
                      </td>
                      {periods.map((per) => (
                        <td key={per} className="p-0">
                          <ParcelCell cell={cellAt(p.cells, per)} period={per} isPsr={p.isPsr} href={productionHref(g.id, per, f.farmerCode)} future={isFuture(per)} />
                        </td>
                      ))}
                      <td className="px-1 py-0 text-center text-[11px] tabular-nums text-muted-foreground">{monthsWithRecords(p.cells, periods)}/12</td>
                      <td className="px-1 py-0" colSpan={3} />
                    </tr>
                  ))}
                {fOpen && fKids?.state === "ready" && fKids.data.noParcel.length > 0 && (
                  <tr key={`${f.id}-np`} className="group/row align-middle text-xs text-muted-foreground">
                    <td className={cn(NAME_CELL, "group-hover/row:bg-muted/50")}>
                      <div className="flex h-6 min-w-0 items-center gap-2" style={indent(depth + 2)}>
                        <span className="inline-block w-4" />
                        <span className="italic" title="Record petani ini yang tidak ber-ID Lahan — tidak masuk persen cakupan">Tanpa persil</span>
                        <Marker kind="noParcel" />
                      </div>
                    </td>
                    <td className="px-1 py-0" />
                    {periods.map((per) => (
                      <td key={per} className="p-0">
                        <ParcelCell cell={cellAt(fKids.data.noParcel, per)} period={per} isPsr={false} href={productionHref(g.id, per, f.farmerCode)} future={isFuture(per)} />
                      </td>
                    ))}
                    <td className="px-1 py-0 text-center text-[11px] tabular-nums">{monthsWithRecords(fKids.data.noParcel, periods)}/12</td>
                    <td className="px-1 py-0" colSpan={3} />
                  </tr>
                )}
              </Fragment>
            );
          })}
      </Fragment>
    );
  };

  if (groups.length === 0) {
    return <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    // Area gulir sendiri: header & kolom nama lengket, jadi 30+ baris Lembaga +
    // petani tetap terbaca kolom bulannya; lebar minimum muat layar 1280 tanpa terpotong.
    <div className="relative max-h-[calc(100vh-380px)] min-h-[320px] overflow-auto rounded-md border">
      <table className="w-full min-w-[1120px] table-fixed border-separate border-spacing-[2px] text-sm">
        <colgroup>
          <col className="w-[260px]" />
          <col className="w-[56px]" />
          {periods.map((p) => (
            <col key={p} className="w-[48px]" />
          ))}
          <col className="w-[52px]" />
          <col className="w-[104px]" />
          <col className="w-[44px]" />
          <col className="w-[96px]" />
        </colgroup>
        <thead className="sticky top-0 z-20 bg-card">
          <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="sticky left-0 z-30 bg-card py-2 pr-3 text-left font-semibold">{headBtn("name", districts ? "Distrik / Lembaga" : "Lembaga Petani")}</th>
            <th className="px-1 py-2 text-right font-semibold" title="Lahan aktif non-PSR — penyebut persen cakupan">
              Lahan
            </th>
            {periods.map((p, i) => (
              <th
                key={p}
                className={cn("px-0 py-2 text-center font-semibold", isFuture(p) && "text-muted-foreground/40", p === referencePeriod && "text-foreground")}
                title={`${MONTH_NAMES_ID[i]} ${year}${isFuture(p) ? " — belum tiba" : p === referencePeriod ? " — bulan berjalan" : ""}`}
              >
                {MONTH_SHORT_ID[i]}
              </th>
            ))}
            <th className="px-1 py-2 text-center font-semibold">{headBtn("months", "Bulan", `Bulan ber-data ${year} (aturan penyetahunan Peta BMP)`)}</th>
            <th className="px-1 py-2 text-center font-semibold" title="Periode pertama – terakhir yang punya record (rentang penuh, bukan hanya tahun terpilih)">
              Rentang
            </th>
            <th className="px-1 py-2 text-center font-semibold">{headBtn("last", "Jeda", `Bulan sejak periode terakhir ke ${referencePeriod}; merah bila ≥ ${PRODUCTION_STALE_MONTHS}`)}</th>
            <th className="px-1 py-2 text-center font-semibold" title="Rentang penuh: record 0 kg · record tanpa ID Lahan">
              Penanda
            </th>
          </tr>
        </thead>
        <tbody>
          {districts
            ? districts.map((d) => {
                const open = !collapsedDistricts.has(d.id);
                const sum = summaries.get(d.id) ?? EMPTY_SUMMARY;
                return (
                  <Fragment key={d.id}>
                    <tr className="group/row align-middle font-semibold">
                      <td className={cn(NAME_CELL, "bg-muted group-hover/row:bg-muted")}>
                        <div className="flex h-8 min-w-0 items-center gap-1">
                          <span className="mr-1 h-5 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                          <button
                            type="button"
                            onClick={() => toggleDistrict(d.id)}
                            aria-expanded={open}
                            aria-label={`${open ? "Tutup" : "Buka"} Lembaga di ${d.name}`}
                            className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                          >
                            <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
                          </button>
                          <span className="truncate">{d.name}</span>
                          <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
                            {formatNumber(d.groups.length)} Lembaga · {formatNumber(d.totalFarmers)} petani
                          </span>
                        </div>
                      </td>
                      <td className="rounded-[3px] bg-muted/40 px-1 py-0 text-right text-xs tabular-nums text-muted-foreground" title={`${formatNumber(d.nonPsrParcels)} lahan non-PSR dari ${formatNumber(d.totalParcels)} lahan aktif`}>
                        {formatNumber(d.nonPsrParcels)}
                      </td>
                      {periods.map((p) => (
                        <td key={p} className="p-0">
                          <CoverageCell cell={cellAt(d.cells, p)} nonPsrParcels={d.nonPsrParcels} period={p} owner={`Distrik ${d.name}`} future={isFuture(p)} />
                        </td>
                      ))}
                      <SummaryCells sum={sum} year={year} />
                    </tr>
                    {open && d.groups.map((g) => renderGroup(g, 1))}
                  </Fragment>
                );
              })
            : groups.map((g) => renderGroup(g, 0))}
        </tbody>
      </table>
    </div>
  );
}
