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
  summarizeRange,
  type ProductionAvailabilityDistrictRow,
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

/** Penanda kualitas di pojok sel (K5): E = Estimasi, 0 = ada record 0 kg, TP = tanpa persil. */
export const MARKERS = {
  estimate: { code: "E", label: "Estimasi", className: "bg-amber-200 text-amber-900" },
  zero: { code: "0", label: "Record 0 kg", className: "bg-rose-200 text-rose-900" },
  noParcel: { code: "TP", label: "Tanpa persil", className: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100" },
} as const;

function Marker({ kind }: { kind: keyof typeof MARKERS }) {
  const m = MARKERS[kind];
  return (
    <span className={cn("rounded-[2px] px-0.5 text-[8px] font-bold leading-[10px]", m.className)} aria-label={m.label}>
      {m.code}
    </span>
  );
}

function MarkerStrip({ cell }: { cell: { estimateRecords: number; zeroRecords: number; noParcelRecords?: number } }) {
  const any = cell.estimateRecords > 0 || cell.zeroRecords > 0 || (cell.noParcelRecords ?? 0) > 0;
  if (!any) return null;
  return (
    <span className="pointer-events-none absolute right-0.5 top-0.5 flex gap-px">
      {cell.estimateRecords > 0 && <Marker kind="estimate" />}
      {cell.zeroRecords > 0 && <Marker kind="zero" />}
      {(cell.noParcelRecords ?? 0) > 0 && <Marker kind="noParcel" />}
    </span>
  );
}

const monthLabel = (period: string) => {
  const m = Number(period.slice(5, 7));
  return `${MONTH_NAMES_ID[m - 1] ?? period} ${period.slice(0, 4)}`;
};

/** Sel Lembaga/petani × bulan: % lahan non-PSR melapor (K3) di atas skala heatmap; kosong = tanpa record. */
function CoverageCell({ cell, nonPsrParcels, period, owner }: { cell: ProductionCellStats | undefined; nonPsrParcels: number; period: string; owner: string }) {
  if (!cell || cell.records === 0) {
    return <div className="h-7 w-full rounded-[3px] border border-dashed border-muted-foreground/20 bg-muted/30" title={`${monthLabel(period)} · ${owner}: tidak ada record`} aria-label="tidak ada record" />;
  }
  const pct = coveragePct(cell.parcelsReporting, nonPsrParcels);
  const rows = (
    <>
      {pct != null && <StatTooltipRow chip={BAND_BAR[scoreBand(pct)]} label="Lahan non-PSR melapor" value={`${formatNumber(cell.parcelsReporting)} / ${formatNumber(nonPsrParcels)} (${formatPct(pct)}%)`} />}
      <StatTooltipRow chip="bg-slate-400" label="Record" value={formatNumber(cell.records)} />
      <StatTooltipRow chip="bg-emerald-500" label="Σ hasil" value={`${formatNumber(Math.round(cell.kg))} kg`} />
      {cell.estimateRecords > 0 && <StatTooltipRow chip="bg-amber-400" label="Record Estimasi" value={formatNumber(cell.estimateRecords)} />}
      {cell.zeroRecords > 0 && <StatTooltipRow chip="bg-rose-500" label="Record 0 kg" value={formatNumber(cell.zeroRecords)} />}
      {cell.noParcelRecords > 0 && <StatTooltipRow chip="bg-slate-500" label="Tanpa persil" value={formatNumber(cell.noParcelRecords)} />}
    </>
  );
  if (pct == null) {
    // Tanpa lahan non-PSR → persen tak terdefinisi; tampilkan jumlah record, netral.
    return (
      <Tooltip>
        <TooltipTrigger render={<div className="relative flex h-7 w-full items-center justify-center rounded-[3px] bg-slate-200 text-[11px] font-semibold tabular-nums text-slate-700 dark:bg-slate-700 dark:text-slate-100" />}>
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
      <TooltipTrigger render={<HeatCell score={pct} className="relative" />}>
        {formatNumber(Math.round(pct))}
        <MarkerStrip cell={cell} />
      </TooltipTrigger>
      <StatTooltipContent title={monthLabel(period)} subtitle={owner}>
        {rows}
      </StatTooltipContent>
    </Tooltip>
  );
}

/** Sel lahan × bulan: kg; 0 kg merah; Estimasi bertanda; PSR dibisukan. Klik → Master Data Produksi (Lembaga + periode + petani). */
function ParcelCell({ cell, period, isPsr, href }: { cell: ProductionParcelCell | undefined; period: string; isPsr: boolean; href: string }) {
  if (!cell || cell.records === 0) {
    return <div className={cn("flex h-6 items-center justify-center text-[10px] text-muted-foreground/50", isPsr && "bg-muted/40")} title={`${monthLabel(period)}: tidak ada record`}>—</div>;
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

export function ProductionCalendarTable({
  groups,
  districts,
  year,
  referencePeriod,
  sortKey,
  onSort,
  emptyMessage,
}: {
  groups: ProductionAvailabilityGroupRow[];
  /** Baris Distrik (tingkat teratas) atau `null` = tanpa tingkat Distrik. */
  districts: ProductionAvailabilityDistrictRow[] | null;
  year: number;
  referencePeriod: string;
  sortKey: ProductionSortKey;
  onSort: (key: ProductionSortKey) => void;
  emptyMessage: string;
}) {
  const periods = periodsOfYear(year);
  // Cache anak berkunci tahun — ganti tahun tidak membuang yang sudah dimuat untuk tahun lain.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedFarmers, setExpandedFarmers] = useState<Set<string>>(new Set());
  // Distrik bawaan TERBUKA (himpunan yang ditutup, bukan yang dibuka — Distrik yang
  // baru muncul karena filter berubah ikut terbuka tanpa klik).
  const [collapsedDistricts, setCollapsedDistricts] = useState<Set<string>>(new Set());
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
    setFarmers((m) => (m.has(key) ? m : new Map(m).set(key, { state: "loading" })));
    getProductionAvailabilityFarmers(id, y)
      .then((data) => setFarmers((m) => new Map(m).set(key, { state: "ready", data })))
      .catch((e: unknown) => setFarmers((m) => new Map(m).set(key, { state: "error", message: e instanceof Error ? e.message : "Gagal memuat" })));
  }, []);
  const loadParcels = useCallback((id: string, y: number) => {
    const key = `${y}:${id}`;
    setParcels((m) => (m.has(key) ? m : new Map(m).set(key, { state: "loading" })));
    getProductionAvailabilityParcels(id, y)
      .then((data) => setParcels((m) => new Map(m).set(key, { state: "ready", data })))
      .catch((e: unknown) => setParcels((m) => new Map(m).set(key, { state: "error", message: e instanceof Error ? e.message : "Gagal memuat" })));
  }, []);

  const toggleGroup = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id);
    else {
      next.add(id);
      if (!farmers.has(`${year}:${id}`)) loadFarmers(id, year);
    }
    setExpandedGroups(next);
  };
  const toggleFarmer = (id: string) => {
    const next = new Set(expandedFarmers);
    if (next.has(id)) next.delete(id);
    else {
      next.add(id);
      if (!parcels.has(`${year}:${id}`)) loadParcels(id, year);
    }
    setExpandedFarmers(next);
  };
  // Tahun berganti → anak yang sedang terbuka dimuat untuk tahun itu bila belum
  // ada di cache. `farmers`/`parcels` sengaja di luar dependensi: efek ini hanya
  // perlu berjalan saat tahun/himpunan terbuka berubah, bukan tiap hasil tiba.
  useEffect(() => {
    for (const id of expandedGroups) if (!farmers.has(`${year}:${id}`)) loadFarmers(id, year);
    for (const id of expandedFarmers) if (!parcels.has(`${year}:${id}`)) loadParcels(id, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, expandedGroups, expandedFarmers, loadFarmers, loadParcels]);

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

  const indent = (depth: number) => ({ paddingLeft: depth * 18 });
  const stateRow = (depth: number, content: React.ReactNode, key: string) => (
    <tr key={key}>
      <td colSpan={periods.length + 7} className="px-2 py-1.5 text-xs text-muted-foreground" style={indent(depth)}>
        {content}
      </td>
    </tr>
  );

  const renderGroup = (g: ProductionAvailabilityGroupRow, depth: number) => {
    const open = expandedGroups.has(g.id);
    const sum = summarizeRange(g.cells, referencePeriod);
    const monthsYear = sum.monthsByYear[String(year)] ?? 0;
    const kids = farmers.get(`${year}:${g.id}`);
    return (
      <Fragment key={g.id}>
        <tr className="group/row align-middle">
          <td className="rounded-md px-1 py-0 pr-2 transition-colors group-hover/row:bg-muted/50">
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
              <span className="shrink-0 truncate text-[11px] text-muted-foreground">
                {g.code ? `${g.code} · ` : ""}
                {g.districtName}
              </span>
            </div>
          </td>
          <td className="px-1 py-0 text-right text-xs tabular-nums text-muted-foreground" title={`${formatNumber(g.nonPsrParcels)} lahan non-PSR dari ${formatNumber(g.totalParcels)} lahan aktif · ${formatNumber(g.totalFarmers)} petani`}>
            {formatNumber(g.nonPsrParcels)}
          </td>
          {periods.map((p) => (
            <td key={p} className="p-0">
              <CoverageCell cell={cellAt(g.cells, p)} nonPsrParcels={g.nonPsrParcels} period={p} owner={g.name} />
            </td>
          ))}
          <td className="px-1 py-0 text-center text-xs tabular-nums" title={`Bulan ber-data per tahun: ${Object.entries(sum.monthsByYear).map(([y, n]) => `${y}: ${n}`).join(" · ") || "—"}`}>
            <span className={cn(monthsYear === 12 && "font-semibold text-emerald-700 dark:text-emerald-400")}>{monthsYear}</span>
            <span className="text-muted-foreground">/12</span>
          </td>
          <td className="px-1 py-0 text-center text-[11px] tabular-nums text-muted-foreground">
            {sum.firstPeriod ? `${sum.firstPeriod} – ${sum.lastPeriod}` : "—"}
          </td>
          <td className={cn("px-1 py-0 text-center text-xs tabular-nums", sum.stale ? "font-semibold text-rose-600" : "text-muted-foreground")} title={sum.gapMonths == null ? "Tidak ada record" : `${sum.gapMonths} bulan sejak ${sum.lastPeriod}${sum.stale ? " — basi" : ""}`}>
            {sum.gapMonths == null ? "—" : sum.gapMonths}
          </td>
          <td className={cn("px-1 py-0 text-center text-xs tabular-nums", sum.estimateRecords > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")} title={`${formatNumber(sum.estimateRecords)} dari ${formatNumber(sum.totalRecords)} record berlabel Estimasi`}>
            {sum.totalRecords > 0 ? `${formatNumber(Math.round(sum.estimatePct))}%` : "—"}
          </td>
          <td className={cn("px-1 py-0 text-center text-xs tabular-nums", sum.noParcelRecords > 0 ? "text-slate-700 dark:text-slate-200" : "text-muted-foreground")} title={`${formatNumber(sum.noParcelRecords)} record tanpa ID Lahan`}>
            {sum.noParcelRecords > 0 ? formatNumber(sum.noParcelRecords) : "—"}
          </td>
        </tr>

        {open && kids?.state === "loading" && stateRow(depth + 1, <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat petani…</span>, `${g.id}-loading`)}
        {open && kids?.state === "error" && stateRow(depth + 1, <span className="text-destructive">{kids.message}</span>, `${g.id}-error`)}
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
                  <td className="rounded-md px-1 py-0 pr-2 transition-colors group-hover/row:bg-muted/50">
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
                      <CoverageCell cell={cellAt(f.cells, p)} nonPsrParcels={f.nonPsrParcels} period={p} owner={f.name} />
                    </td>
                  ))}
                  <td className="px-1 py-0 text-center text-[11px] tabular-nums text-muted-foreground">{fMonths}/12</td>
                  <td className="px-1 py-0 text-center text-[11px] tabular-nums text-muted-foreground">{fLast ?? "—"}</td>
                  <td className="px-1 py-0" />
                  <td className="px-1 py-0" />
                  <td className="px-1 py-0" />
                </tr>
                {fOpen && fKids?.state === "loading" && stateRow(depth + 2, <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat lahan…</span>, `${f.id}-loading`)}
                {fOpen && fKids?.state === "error" && stateRow(depth + 2, <span className="text-destructive">{fKids.message}</span>, `${f.id}-error`)}
                {fOpen && fKids?.state === "ready" && fKids.data.parcels.length === 0 && fKids.data.noParcel.length === 0 && stateRow(depth + 2, "Petani ini belum punya lahan aktif maupun record produksi.", `${f.id}-empty`)}
                {fOpen &&
                  fKids?.state === "ready" &&
                  fKids.data.parcels.map((p) => (
                    <tr key={p.id} className={cn("group/row align-middle text-xs", p.isPsr && "text-muted-foreground")}>
                      <td className="rounded-md px-1 py-0 pr-2 transition-colors group-hover/row:bg-muted/50">
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
                          <ParcelCell cell={cellAt(p.cells, per)} period={per} isPsr={p.isPsr} href={productionHref(g.id, per, f.farmerCode)} />
                        </td>
                      ))}
                      <td className="px-1 py-0 text-center text-[11px] tabular-nums text-muted-foreground">{monthsWithRecords(p.cells, periods)}/12</td>
                      <td className="px-1 py-0" colSpan={4} />
                    </tr>
                  ))}
                {fOpen && fKids?.state === "ready" && fKids.data.noParcel.length > 0 && (
                  <tr key={`${f.id}-np`} className="group/row align-middle text-xs text-muted-foreground">
                    <td className="rounded-md px-1 py-0 pr-2 transition-colors group-hover/row:bg-muted/50">
                      <div className="flex h-6 min-w-0 items-center gap-2" style={indent(depth + 2)}>
                        <span className="inline-block w-4" />
                        <span className="italic" title="Record petani ini yang tidak ber-ID Lahan — tidak masuk persen cakupan">Tanpa persil</span>
                        <Marker kind="noParcel" />
                      </div>
                    </td>
                    <td className="px-1 py-0" />
                    {periods.map((per) => (
                      <td key={per} className="p-0">
                        <ParcelCell cell={cellAt(fKids.data.noParcel, per)} period={per} isPsr={false} href={productionHref(g.id, per, f.farmerCode)} />
                      </td>
                    ))}
                    <td className="px-1 py-0 text-center text-[11px] tabular-nums">{monthsWithRecords(fKids.data.noParcel, periods)}/12</td>
                    <td className="px-1 py-0" colSpan={4} />
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px] table-fixed border-separate border-spacing-[2px] text-sm">
        <colgroup>
          <col className="w-[280px]" />
          <col className="w-[64px]" />
          {periods.map((p) => (
            <col key={p} className="w-[56px]" />
          ))}
          <col className="w-[68px]" />
          <col className="w-[128px]" />
          <col className="w-[56px]" />
          <col className="w-[64px]" />
          <col className="w-[56px]" />
        </colgroup>
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="py-1.5 pr-3 text-left font-semibold">{headBtn("name", districts ? "Distrik / Lembaga Petani" : "Lembaga Petani")}</th>
            <th className="px-1 py-1.5 text-right font-semibold" title="Lahan aktif non-PSR — penyebut persen cakupan">Lahan</th>
            {periods.map((p, i) => (
              <th key={p} className="px-0 py-1.5 text-center font-semibold" title={`${MONTH_NAMES_ID[i]} ${year}`}>
                {MONTH_SHORT_ID[i]}
              </th>
            ))}
            <th className="px-1 py-1.5 text-center font-semibold">{headBtn("months", "Bulan", `Bulan ber-data ${year} (aturan penyetahunan Peta BMP)`)}</th>
            <th className="px-1 py-1.5 text-center font-semibold" title="Periode pertama – terakhir yang punya record (rentang penuh, bukan hanya tahun terpilih)">Rentang</th>
            <th className="px-1 py-1.5 text-center font-semibold">{headBtn("last", "Jeda", `Bulan sejak periode terakhir ke ${referencePeriod}; merah bila ≥ ${PRODUCTION_STALE_MONTHS}`)}</th>
            <th className="px-1 py-1.5 text-center font-semibold" title="% record berlabel Estimasi (rentang penuh)">Est.</th>
            <th className="px-1 py-1.5 text-center font-semibold" title="Record tanpa ID Lahan (rentang penuh)">TP</th>
          </tr>
        </thead>
        <tbody>
          {districts
            ? districts.map((d) => {
                const open = !collapsedDistricts.has(d.id);
                const sum = summarizeRange(d.cells, referencePeriod);
                const monthsYear = sum.monthsByYear[String(year)] ?? 0;
                return (
                  <Fragment key={d.id}>
                    <tr className="group/row align-middle bg-muted/20 font-medium">
                      <td className="rounded-md px-1 py-0 pr-2 transition-colors group-hover/row:bg-muted/50">
                        <div className="flex h-7 min-w-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleDistrict(d.id)}
                            aria-expanded={open}
                            aria-label={`${open ? "Tutup" : "Buka"} Lembaga di ${d.name}`}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
                          </button>
                          <span className="truncate">{d.name}</span>
                          <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
                            {formatNumber(d.groups.length)} Lembaga · {formatNumber(d.totalFarmers)} petani
                          </span>
                          <span className="ml-1 shrink-0 text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">Distrik</span>
                        </div>
                      </td>
                      <td className="px-1 py-0 text-right text-xs tabular-nums text-muted-foreground" title={`${formatNumber(d.nonPsrParcels)} lahan non-PSR dari ${formatNumber(d.totalParcels)} lahan aktif`}>
                        {formatNumber(d.nonPsrParcels)}
                      </td>
                      {periods.map((p) => (
                        <td key={p} className="p-0">
                          <CoverageCell cell={cellAt(d.cells, p)} nonPsrParcels={d.nonPsrParcels} period={p} owner={`Distrik ${d.name}`} />
                        </td>
                      ))}
                      <td className="px-1 py-0 text-center text-xs tabular-nums" title={`Bulan ber-data per tahun (gabungan Lembaga): ${Object.entries(sum.monthsByYear).map(([y, n]) => `${y}: ${n}`).join(" · ") || "—"}`}>
                        <span className={cn(monthsYear === 12 && "font-semibold text-emerald-700 dark:text-emerald-400")}>{monthsYear}</span>
                        <span className="text-muted-foreground">/12</span>
                      </td>
                      <td className="px-1 py-0 text-center text-[11px] tabular-nums text-muted-foreground">{sum.firstPeriod ? `${sum.firstPeriod} – ${sum.lastPeriod}` : "—"}</td>
                      <td className={cn("px-1 py-0 text-center text-xs tabular-nums", sum.stale ? "font-semibold text-rose-600" : "text-muted-foreground")}>{sum.gapMonths == null ? "—" : sum.gapMonths}</td>
                      <td className={cn("px-1 py-0 text-center text-xs tabular-nums", sum.estimateRecords > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                        {sum.totalRecords > 0 ? `${formatNumber(Math.round(sum.estimatePct))}%` : "—"}
                      </td>
                      <td className={cn("px-1 py-0 text-center text-xs tabular-nums", sum.noParcelRecords > 0 ? "text-slate-700 dark:text-slate-200" : "text-muted-foreground")}>
                        {sum.noParcelRecords > 0 ? formatNumber(sum.noParcelRecords) : "—"}
                      </td>
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
