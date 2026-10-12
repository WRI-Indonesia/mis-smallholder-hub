"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronsDownUp, ChevronsUpDown, Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { ResetFiltersButton } from "@/components/shared/reset-filters-button";
import { hasActiveFilters } from "@/lib/filter-reset";
import { HeatLegend } from "@/components/shared/score-visuals";
import { PRODUCTION_STALE_MONTHS } from "@/lib/data-completeness-registry";
import { formatGeneratedAt, formatNumber, MONTH_SHORT_ID } from "@/lib/format";
import {
  availableYears,
  cellAt,
  coveragePct,
  filterProductionGroups,
  groupRowsByDistrict,
  periodsOfYear,
  sortProductionGroups,
  summarizeRange,
  summarizeYear,
  percentUnavailableNote,
  yearCoverageAvg,
  yearOfPeriod,
  type ProductionSortKey,
} from "@/lib/production-availability";
import { getProductionAvailabilityGroupParcels } from "@/server/actions/production-availability";
import type { BmpFarmerGroupCategory } from "@/types/dashboard";
import type { ProductionAvailabilityView } from "@/types/production-availability";
import { CATEGORY_LABELS } from "../../data-availability/domain-meta";
import { MARKERS, ProductionCalendarTable } from "./production-calendar-table";

const SORT_LABEL: Record<ProductionSortKey, string> = {
  coverage: "Cakupan tahun terpilih",
  name: "Nama Lembaga",
  months: "Bulan ber-data",
  last: "Periode terakhir",
};
const SORT_KEYS = Object.keys(SORT_LABEL) as ProductionSortKey[];

/**
 * Ketersediaan Data › Produksi (#416): kalender cakupan Lembaga × bulan yang bisa
 * dibuka menjadi petani → lahan. Tahun, filter, pencarian, dan urutan tersimpan
 * di URL (pola Semua Lembaga); baris anak dimuat saat dibuka.
 */
export function ProductionAvailabilityClient({
  view,
  canExport,
  navSlot,
}: {
  view: ProductionAvailabilityView;
  canExport: boolean;
  /** Judul "Ketersediaan Data" + sub-nav keluarga menu (server component, #417 A). */
  navSlot?: React.ReactNode;
}) {
  const { get, setMany } = useUrlFilters();
  const allGroups = view.groups;
  const currentYear = yearOfPeriod(view.referencePeriod);
  const years = useMemo(() => availableYears(allGroups, currentYear), [allGroups, currentYear]);

  // Nilai URL divalidasi terhadap data nyata (tautan basi → bawaan).
  const yearParam = Number(get("tahun"));
  const year = years.includes(yearParam) ? yearParam : currentYear;
  const districtParam = get("distrik");
  const districtId = allGroups.some((g) => g.districtId === districtParam) ? districtParam : null;
  const categoryParam = get("kategori");
  const category = categoryParam === "EX_PLASMA" || categoryParam === "SWADAYA" ? (categoryParam as BmpFarmerGroupCategory) : null;
  const groupParam = get("lembaga");
  const groupId = allGroups.some((g) => g.id === groupParam && (!districtId || g.districtId === districtId) && (!category || g.category === category)) ? groupParam : null;
  const sortParam = get("urut");
  const sortKey: ProductionSortKey = SORT_KEYS.includes(sortParam as ProductionSortKey) ? (sortParam as ProductionSortKey) : "coverage";
  const sortAsc = get("arah") !== "turun";
  // Tingkat Distrik di atas Lembaga (usulan owner 2026-10-11) — bawaan nyala; `?tingkat=lembaga` mematikannya.
  const byDistrict = get("tingkat") !== "lembaga";
  const setByDistrict = (v: boolean) => setMany({ tingkat: v ? null : "lembaga" });
  // Tampilan bawaan (#427) — pembanding & isi tombol Reset: tahun berjalan, semua filter "Semua",
  // urut cakupan menaik, Per Distrik nyala, tanpa pencarian. Kunci selain `cari` = kunci URL;
  // bawaan = tidak ada di URL, jadi reset menghapusnya. Tahun bergantung data → dibentuk di sini.
  const filterDefaults = { tahun: currentYear, distrik: null, kategori: null, lembaga: null, urut: "coverage", arah: true, tingkat: true, cari: "" };
  const [query, setQuery] = useState(filterDefaults.cari);
  const [treeCommand, setTreeCommand] = useState<{ kind: "collapse" | "expandDistricts"; seq: number } | null>(null);
  const sendTree = (kind: "collapse" | "expandDistricts") => setTreeCommand((c) => ({ kind, seq: (c?.seq ?? 0) + 1 }));
  const filtersActive = hasActiveFilters(
    { tahun: year, distrik: districtId, kategori: category, lembaga: groupId, urut: sortKey, arah: sortAsc, tingkat: byDistrict, cari: query },
    filterDefaults,
  );
  const resetFilters = () => {
    const { cari, ...url } = filterDefaults;
    setMany(Object.fromEntries(Object.keys(url).map((k) => [k, null])));
    setQuery(cari);
  };

  const keepGroup = (nextDistrictId: string | null, nextCategory: BmpFarmerGroupCategory | null): Record<string, string | null> => {
    const g = groupId ? allGroups.find((x) => x.id === groupId) : undefined;
    const fits = !!g && (!nextDistrictId || g.districtId === nextDistrictId) && (!nextCategory || g.category === nextCategory);
    return fits ? {} : { lembaga: null };
  };
  const setYear = (y: number) => setMany({ tahun: y === currentYear ? null : String(y) });
  const setDistrictId = (v: string | null) => setMany({ distrik: v, ...keepGroup(v, category) });
  const setCategory = (v: BmpFarmerGroupCategory | null) => setMany({ kategori: v, ...keepGroup(districtId, v) });
  const setGroupId = (v: string | null) => setMany({ lembaga: v });
  const onSort = (key: ProductionSortKey) => {
    // Klik kolom aktif = balik arah; kolom lain = menaik (cakupan terendah dulu).
    const asc = key === sortKey ? !sortAsc : true;
    setMany({ urut: key === "coverage" ? null : key, arah: asc ? null : "turun" });
  };

  const districtOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of allGroups) map.set(g.districtId, g.districtName);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allGroups]);
  const groupOptions = useMemo(
    () =>
      filterProductionGroups(allGroups, { districtId, category })
        .map((g) => ({ id: g.id, name: g.name, code: g.code ?? undefined }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allGroups, districtId, category],
  );

  const rows = useMemo(
    () => sortProductionGroups(filterProductionGroups(allGroups, { districtId, category, groupId, query }), sortKey, sortAsc, year, view.referencePeriod),
    [allGroups, districtId, category, groupId, query, sortKey, sortAsc, year, view.referencePeriod],
  );
  // Baris Distrik ikut kunci urut yang sama; Lembaga di dalamnya sudah terurut dari `rows`.
  const districts = useMemo(
    () => (byDistrict ? sortProductionGroups(groupRowsByDistrict(rows), sortKey, sortAsc, year, view.referencePeriod) : null),
    [byDistrict, rows, sortKey, sortAsc, year, view.referencePeriod],
  );
  // Ringkasan rentang dihitung SEKALI per baris (Lembaga + Distrik) untuk tabel, header, dan ekspor (review #416).
  const summaries = useMemo(() => {
    const m = new Map(rows.map((g) => [g.id, summarizeRange(g.cells, view.referencePeriod)]));
    for (const d of districts ?? []) m.set(d.id, summarizeRange(d.cells, view.referencePeriod));
    return m;
  }, [rows, districts, view.referencePeriod]);

  // Ringkasan header: Lembaga tampil · yang basi · yang tanpa record tahun ini.
  const headline = useMemo(() => {
    const periods = periodsOfYear(year);
    let stale = 0;
    let silentThisYear = 0;
    let weighted = 0;
    let weight = 0;
    for (const g of rows) {
      if (summaries.get(g.id)?.stale) stale += 1;
      if (!periods.some((p) => (cellAt(g.cells, p)?.records ?? 0) > 0)) silentThisYear += 1;
      const avg = yearCoverageAvg(g, year);
      if (avg != null) {
        weighted += avg * g.nonPsrParcels;
        weight += g.nonPsrParcels;
      }
    }
    // Rata-rata cakupan tahun terpilih, tertimbang lahan non-PSR (Lembaga besar berbobot lebih besar — pola Index Ketersediaan).
    return { stale, silentThisYear, coverage: weight > 0 ? weighted / weight : null };
  }, [rows, year, summaries]);

  // Ekspor (K6): Sheet 1 Lembaga × bulan tahun terpilih + ringkasan; Sheet 2 lahan × bulan Lembaga terfilter.
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      // Nama sheet: ExcelJS menolak * ? : \ / [ ] dan > 31 karakter (review #416).
      const safeSheetName = (name: string) => name.replace(/[*?:\\/[\]]/g, "-").trim().slice(0, 31) || "Lahan";
      const { exportMultiSheetToExcel } = await import("@/lib/xlsx");
      const periods = periodsOfYear(year);
      const monthCols = periods.map((p, i) => ({ header: `${MONTH_SHORT_ID[i]} ${year}`, key: p, width: 9 }));
      const sheet1 = {
        name: `Lembaga ${year}`,
        // Urutan kolom: Distrik → Kategori → Lembaga → Kode (owner 2026-10-11, setelah melihat berkas) — cocok untuk filter/pivot per wilayah.
        columns: [
          { header: "Distrik", key: "district", width: 16 },
          { header: "Kategori", key: "category", width: 11 },
          { header: "Lembaga Petani", key: "name", width: 32 },
          { header: "Kode", key: "code", width: 10 },
          { header: "Petani", key: "farmers", width: 8 },
          { header: "Lahan aktif", key: "parcels", width: 10 },
          { header: "Lahan non-PSR", key: "nonPsr", width: 12 },
          ...monthCols,
          { header: `Bulan ber-data ${year}`, key: "months", width: 12 },
          { header: "Periode pertama", key: "first", width: 12 },
          { header: "Periode terakhir", key: "last", width: 12 },
          { header: "Jeda (bulan)", key: "gap", width: 10 },
          // Per tahun terpilih (owner 2026-10-12) — satu cakupan dengan kolom bulan & Sheet 2.
          { header: `Record ${year}`, key: "records", width: 11 },
          { header: `Record Estimasi ${year}`, key: "estimate", width: 14 },
          { header: `Record 0 kg ${year}`, key: "zero", width: 12 },
          { header: `Record tanpa persil ${year}`, key: "noParcel", width: 16 },
          { header: "Catatan", key: "note", width: 30 },
        ],
        data: rows.map((g) => {
          const s = summaries.get(g.id) ?? summarizeRange(g.cells, view.referencePeriod);
          const ys = summarizeYear(g.cells, year, view.referencePeriod);
          const months: Record<string, number | string> = {};
          for (const p of periods) {
            const c = cellAt(g.cells, p);
            const pct = c && c.records > 0 ? coveragePct(c.parcelsReporting, g.nonPsrParcels) : null;
            // Kolom bulan selalu angka atau kosong (dulu teks "12 rec" bila penyebut 0) — alasannya di Catatan.
            months[p] = pct == null ? "" : Math.round(pct);
          }
          return {
            name: g.name,
            code: g.code ?? "",
            district: g.districtName,
            category: CATEGORY_LABELS[g.category],
            farmers: g.totalFarmers,
            parcels: g.totalParcels,
            nonPsr: g.nonPsrParcels,
            ...months,
            months: s.monthsByYear[String(year)] ?? 0,
            first: s.firstPeriod ?? "",
            last: s.lastPeriod ?? "",
            gap: s.gapMonths ?? "",
            records: ys.totalRecords,
            estimate: ys.estimateRecords,
            zero: ys.zeroRecords,
            noParcel: ys.noParcelRecords,
            note: percentUnavailableNote(g.nonPsrParcels, g.totalParcels, ys.totalRecords),
          };
        }),
      };
      const parcelCols = [
        { header: "Petani", key: "farmer", width: 28 },
        { header: "Kode Petani", key: "farmerCode", width: 12 },
        { header: "Kode Lahan", key: "parcel", width: 14 },
        { header: "PSR", key: "psr", width: 6 },
        { header: "Luas (ha)", key: "area", width: 9 },
        ...periods.map((p, i) => ({ header: `${MONTH_SHORT_ID[i]} ${year} (kg)`, key: p, width: 11 })),
        { header: `Bulan ber-record ${year}`, key: "months", width: 12 },
        { header: "Record Estimasi", key: "estimate", width: 12 },
        { header: "Record 0 kg", key: "zero", width: 10 },
      ];
      const selected = groupId ? allGroups.find((g) => g.id === groupId) : undefined;
      const parcelRows = selected ? await getProductionAvailabilityGroupParcels(selected.id, year) : [];
      const sheet2 = {
        name: selected ? safeSheetName(`Lahan ${selected.abrv ?? selected.code ?? ""}`) : "Lahan",
        columns: parcelCols,
        data: selected
          ? parcelRows.map((p) => {
              const months: Record<string, number | string> = {};
              for (const per of periods) {
                const c = cellAt(p.cells, per);
                months[per] = c && c.records > 0 ? Math.round(c.kg) : "";
              }
              return {
                farmer: p.farmerName,
                farmerCode: p.farmerCode,
                parcel: p.parcelCode,
                psr: p.isPsr ? "Ya" : "",
                area: p.area ?? "",
                ...months,
                months: periods.filter((per) => (cellAt(p.cells, per)?.records ?? 0) > 0).length,
                estimate: p.cells.reduce((s, c) => s + c.estimateRecords, 0),
                zero: p.cells.reduce((s, c) => s + c.zeroRecords, 0),
              };
            })
          : [{ farmer: "Pilih satu Lembaga pada filter untuk mengekspor rincian lahan × bulan." }],
      };
      await exportMultiSheetToExcel({
        filename: `ketersediaan-produksi-${year}${selected ? `-${(selected.abrv ?? selected.code ?? "lembaga").toLowerCase()}` : ""}-${format(new Date(), "yyyyMMdd")}`,
        sheets: [sheet1, sheet2],
      });
    } catch (err) {
      toast.error(err instanceof Error ? `Ekspor gagal: ${err.message}` : "Ekspor Excel gagal");
    } finally {
      setExporting(false);
    }
  };

  const emptyMessage = query.trim() ? `Tidak ada Lembaga yang cocok dengan "${query.trim()}".` : "Tidak ada Lembaga Petani pada filter ini.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {navSlot}
          <p className="text-sm text-muted-foreground">
            Bulan apa saja yang sudah punya data produksi, per Lembaga Petani. Angka sel = % lahan aktif non-PSR yang punya record pada bulan itu — data per{" "}
            <span className="font-medium text-foreground">{formatGeneratedAt(view.generatedAt)}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-9 w-[110px]" aria-label="Tahun">
              <SelectValue>{(v) => `Tahun ${v}`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category ?? "all"} onValueChange={(v) => setCategory(v === "all" ? null : (v as BmpFarmerGroupCategory))}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue>{(value) => (value === "all" ? "Semua Kategori" : CATEGORY_LABELS[value as BmpFarmerGroupCategory])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="EX_PLASMA">Ex-Plasma</SelectItem>
              <SelectItem value="SWADAYA">Swadaya</SelectItem>
            </SelectContent>
          </Select>

          <FilterCombobox options={districtOptions} value={districtId} onSelect={setDistrictId} allLabel="Semua Distrik" searchPlaceholder="Cari distrik..." emptyLabel="Distrik tidak ditemukan." widthClass="w-[180px]" />
          <FilterCombobox options={groupOptions} value={groupId} onSelect={setGroupId} allLabel="Semua Lembaga" searchPlaceholder="Cari lembaga petani..." emptyLabel="Lembaga Petani tidak ditemukan." widthClass="w-[220px]" />

          <ResetFiltersButton
            active={filtersActive}
            onReset={resetFilters}
            title="Kembali ke tampilan bawaan: tahun berjalan, semua filter, urut cakupan, Per Distrik, tanpa pencarian"
          />
          {canExport && (
            <Button variant="outline" className="h-9" onClick={handleExport} disabled={rows.length === 0 || exporting} title={groupId ? "Excel: Lembaga × bulan + lahan × bulan Lembaga terpilih" : "Excel: Lembaga × bulan (pilih satu Lembaga untuk ikut rincian lahan)"}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Excel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            {/* Strip KPI: satu pandangan sebelum membaca sel — pola kartu ringkas Ketersediaan. */}
            <div className="flex flex-wrap items-stretch gap-2">
              <Kpi label="Tahun" value={String(year)} hint={`${districts ? `${formatNumber(districts.length)} Distrik · ` : ""}${formatNumber(rows.length)} Lembaga pada filter ini`} />
              <Kpi
                label={`Cakupan ${year}`}
                value={headline.coverage == null ? "—" : `${formatNumber(Math.round(headline.coverage))}%`}
                hint="Rata-rata 12 bulan % lahan non-PSR melapor, tertimbang jumlah lahan"
                tone={headline.coverage == null ? "muted" : headline.coverage >= 80 ? "good" : headline.coverage >= 50 ? "warn" : "bad"}
              />
              <Kpi label={`Tanpa record ${year}`} value={formatNumber(headline.silentThisYear)} hint="Lembaga yang belum punya satu pun record pada tahun terpilih" tone={headline.silentThisYear > 0 ? "warn" : "good"} />
              <Kpi label="Basi" value={formatNumber(headline.stale)} hint={`Lembaga yang periode terakhirnya ≥ ${PRODUCTION_STALE_MONTHS} bulan lalu`} tone={headline.stale > 0 ? "bad" : "good"} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari Lembaga / kode / distrik" className="h-8 w-[220px] pl-8 text-xs" aria-label="Cari Lembaga" />
              </div>
              <Select value={sortKey} onValueChange={(v) => setMany({ urut: v === "coverage" ? null : v, arah: null })}>
                <SelectTrigger className="h-8 w-[200px] text-xs" aria-label="Urutkan">
                  <SelectValue>{(v) => `Urut: ${SORT_LABEL[v as ProductionSortKey]}`}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SORT_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {SORT_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setMany({ arah: sortAsc ? "turun" : null })} title="Balik arah urutan">
                {sortAsc ? "Menaik" : "Menurun"}
              </Button>
              <Button variant={byDistrict ? "secondary" : "ghost"} size="sm" className="h-8 text-xs" onClick={() => setByDistrict(!byDistrict)} aria-pressed={byDistrict} title="Tingkat Distrik di atas Lembaga (baris agregat per kabupaten)">
                Per Distrik
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => sendTree("collapse")} title="Lipat semua tingkat (Distrik, Lembaga, petani)">
                <ChevronsDownUp className="mr-1 h-3.5 w-3.5" />
                Tutup semua
              </Button>
              {byDistrict && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => sendTree("expandDistricts")} title="Buka semua Distrik (Lembaga tetap tertutup)">
                  <ChevronsUpDown className="mr-1 h-3.5 w-3.5" />
                  Buka Distrik
                </Button>
              )}
            </div>
          </div>

          <ProductionCalendarTable groups={rows} districts={districts} summaries={summaries} treeCommand={treeCommand} year={year} referencePeriod={view.referencePeriod} sortKey={sortKey} onSort={onSort} emptyMessage={emptyMessage} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <HeatLegend label="% lahan non-PSR melapor">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-4 rounded-sm bg-muted/60" />
                tidak ada record
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-4 rounded-sm border border-dashed border-muted-foreground/30" />
                belum tiba
              </span>
            </HeatLegend>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">Penanda:</span>
              {(Object.keys(MARKERS) as (keyof typeof MARKERS)[]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1">
                  <span className={`rounded-[2px] px-1 text-[9px] font-bold ${MARKERS[k].className}`}>{MARKERS[k].code}</span>
                  {MARKERS[k].label}
                </span>
              ))}
              <span>· Jeda merah = basi (≥ {PRODUCTION_STALE_MONTHS} bulan)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Dihitung saat halaman dibuka, bukan snapshot. Lahan PSR (peremajaan) dikecualikan dari persen karena produksi 0 memang wajar; record tanpa ID Lahan dihitung
        terpisah (kolom TP). Kolom <span className="font-medium">Bulan</span>{" "}memakai aturan &quot;bulan ber-data&quot; yang sama dengan penyetahunan produktivitas di Peta BMP dan Detail
        Lembaga, jadi angkanya identik.
      </p>
    </div>
  );
}

/** Kartu angka ringkas di atas kalender. */
function Kpi({ label, value, hint, tone = "muted" }: { label: string; value: string; hint: string; tone?: "good" | "warn" | "bad" | "muted" }) {
  const toneClass = { good: "text-emerald-700 dark:text-emerald-400", warn: "text-amber-700 dark:text-amber-400", bad: "text-rose-600", muted: "text-foreground" }[tone];
  return (
    <div className="min-w-[96px] rounded-md border bg-muted/20 px-3 py-1.5" title={hint}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold leading-tight tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
