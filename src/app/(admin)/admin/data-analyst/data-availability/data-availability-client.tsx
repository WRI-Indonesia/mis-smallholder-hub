"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import {
  AVAILABILITY_DOMAIN_KEYS,
  AVAILABILITY_DOMAIN_LABELS,
  availabilityTotals,
  bandDistribution,
  shortDomainLabel,
  filterAvailabilityGroups,
  moduleCoverageTotals,
} from "@/lib/data-availability-aggregation";
import { MODULE_CATALOG, MODULE_DOMAIN_LABELS } from "@/lib/data-completeness-registry";
import { AvailabilityHero, BAND_SHORT } from "./availability-hero";
import { ActiveFilterBar, type ActiveFilterChip } from "./active-filter-bar";
import { AvailabilityDomainCards } from "./availability-domain-cards";
import { AvailabilityMatrix } from "./availability-matrix";
import { AvailabilityModuleMatrix } from "./availability-module-matrix";
import { AvailabilityRadarGrid } from "./availability-radar-grid";
import { MODULE_SORT_PREFIX, sortKeyLabel, sortMatrixRows, sortModuleRows, useMatrixRows, type MatrixSortKey, type ModuleSortKey } from "./matrix-rows";
import { MatrixToolbar, rowsSummary, type MatrixSortOption, type MatrixView } from "./matrix-toolbar";
import { CATEGORY_LABELS } from "./domain-meta";
import { AvailabilityWorklist, WORKLIST_TABS, type WorklistTab } from "./availability-worklist";
import type { AvailabilityDomainKey, AvailabilityScoreBand, BmpFarmerGroupCategory, DataAvailabilityView } from "@/types/dashboard";
import { formatGeneratedAt, formatPct } from "@/lib/format";

/** Pilihan Urut radar & heatmap (kunci sama dengan judul kolom heatmap & chip kartu domain). */
const DOMAIN_SORT_OPTIONS: MatrixSortOption[] = [
  { value: "health", label: "Skor Total" },
  { value: "name", label: "Nama" },
  { value: "totalFarmers", label: "Jumlah petani" },
  ...AVAILABILITY_DOMAIN_KEYS.map((key) => ({ value: key, label: shortDomainLabel(key) })),
];
/** Pilihan Urut Cakupan modul — `modul:<key>` (#417 B: urutan modul kini di URL). */
const MODULE_SORT_OPTIONS: MatrixSortOption[] = [
  { value: "name", label: "Nama" },
  ...MODULE_CATALOG.map((m) => ({ value: `${MODULE_SORT_PREFIX}${m.key}`, label: m.short })),
];
const BANDS: AvailabilityScoreBand[] = ["full", "good", "warn", "bad"];

export function DataAvailabilityClient({
  view,
  canExport,
  navSlot,
}: {
  view: DataAvailabilityView;
  canExport: boolean;
  /** Judul "Ketersediaan Data" + sub-nav keluarga menu (server component, #417 A). */
  navSlot?: React.ReactNode;
}) {
  // Filter disimpan di query string (TD-021) agar tampilan bisa di-bookmark &
  // dikirim ke rekan, dan bertahan saat halaman dimuat ulang.
  const { get, setMany } = useUrlFilters();
  const allGroups = view.data.groups;

  // Nilai dari URL divalidasi terhadap data yang benar-benar ada — tautan bisa
  // basi atau diketik sembarang (pola Dashboard Pelatihan).
  const districtParam = get("distrik");
  const districtId = allGroups.some((g) => g.districtId === districtParam) ? districtParam : null;

  const categoryParam = get("kategori");
  const category =
    categoryParam === "EX_PLASMA" || categoryParam === "SWADAYA"
      ? (categoryParam as BmpFarmerGroupCategory)
      : null;

  // Filter Lembaga (#352 B3) — memfokuskan semua panel ke satu Lembaga.
  // Divalidasi terhadap irisan Distrik/Kategori (bukan seluruh daftar) supaya
  // tautan basi tidak menghasilkan dashboard kosong tanpa penjelasan (review #352).
  const groupParam = get("lembaga");
  const groupId = allGroups.some(
    (g) =>
      g.id === groupParam &&
      (!districtId || g.districtId === districtId) &&
      (!category || g.category === category),
  )
    ? groupParam
    : null;

  const viewParam = get("tampilan");
  // `inti` = nilai lama (v0.36) untuk tabel — bookmark lama tetap membuka heatmap.
  const matrixView: MatrixView = viewParam === "modul" || viewParam === "heatmap" ? viewParam : viewParam === "inti" ? "heatmap" : "radar";

  // Urutan matriks di URL (review #352 putaran 3): `?urut=` kunci + `?arah=turun`
  // (bawaan menaik). Satu tempat untuk kartu domain, judul kolom, dan tautan.
  const sortParam = get("urut");
  const sortKey: MatrixSortKey = AVAILABILITY_DOMAIN_KEYS.includes(sortParam as AvailabilityDomainKey)
    ? (sortParam as AvailabilityDomainKey)
    : sortParam === "name" || sortParam === "totalFarmers"
      ? sortParam
      : "health";
  const sortAsc = get("arah") !== "turun";
  const kerjaParam = get("kerja");
  const worklistTab: WorklistTab = WORKLIST_TABS.includes(kerjaParam as WorklistTab) ? (kerjaParam as WorklistTab) : "sistemik";
  // Urutan Cakupan modul (#417 B): `?urut=modul:<key>`; selainnya Nama (bawaan lama tampilan modul).
  const moduleSortKey: ModuleSortKey =
    sortParam?.startsWith(MODULE_SORT_PREFIX) && MODULE_CATALOG.some((m) => `${MODULE_SORT_PREFIX}${m.key}` === sortParam)
      ? sortParam.slice(MODULE_SORT_PREFIX.length)
      : "name";

  // Lembaga terpilih yang tidak lagi masuk irisan Distrik/Kategori baru
  // di-reset (pola DistrictGroupFilter) — bukan diam-diam menampilkan irisan
  // kosong. Filter band ikut di-reset setiap irisan berubah.
  const keepGroup = (
    nextDistrictId: string | null,
    nextCategory: BmpFarmerGroupCategory | null,
  ): Record<string, string | null> => {
    const g = groupId ? allGroups.find((x) => x.id === groupId) : undefined;
    const fits = !!g && (!nextDistrictId || g.districtId === nextDistrictId) && (!nextCategory || g.category === nextCategory);
    return fits ? {} : { lembaga: null };
  };
  const setDistrictId = (v: string | null) => setMany({ distrik: v, band: null, ...keepGroup(v, category) });
  const setCategory = (v: BmpFarmerGroupCategory | null) => setMany({ kategori: v, band: null, ...keepGroup(districtId, v) });
  const setGroupId = (v: string | null) => setMany({ lembaga: v, band: null });
  const setBand = (v: AvailabilityScoreBand | null) => setMany({ band: v });
  // Ganti tampilan: urutan yang tak berlaku di tampilan tujuan dilepas (mis. urut
  // Produksi → Cakupan modul), supaya chip "Urut" tak menunjuk urutan yang tak dipakai.
  const setMatrixView = (v: MatrixView) => {
    const moduleSort = !!sortParam?.startsWith(MODULE_SORT_PREFIX);
    const keepSort = sortParam === "name" || (v === "modul" ? moduleSort : !moduleSort);
    setMany({ tampilan: v === "radar" ? null : v, ...(keepSort ? {} : { urut: null, arah: null }) });
  };
  const setSort = (key: MatrixSortKey, asc: boolean) => setMany({ urut: key === "health" ? null : key, arah: asc ? null : "turun" });
  const setModuleSort = (key: ModuleSortKey, asc: boolean) =>
    setMany({ urut: key === "name" ? (asc ? null : "name") : `${MODULE_SORT_PREFIX}${key}`, arah: asc ? null : "turun" });

  // Cari & Ringkas milik halaman (#417 B): satu toolbar untuk ketiga tampilan;
  // bawaan Ringkas 10 terendah (K2) — pencarian tetap menampilkan semua hasil.
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const [matrixEl, setMatrixEl] = useState<HTMLDivElement | null>(null);

  const districtOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of allGroups) map.set(g.districtId, g.districtName);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allGroups]);

  // Opsi Lembaga mengikuti Distrik/Kategori terpilih (cascade).
  const groupOptions = useMemo(
    () =>
      filterAvailabilityGroups(view.data, { districtId, category })
        .map((g) => ({ id: g.id, name: g.name, code: g.code }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [view.data, districtId, category],
  );

  // Irisan hero/kartu = Distrik/Kategori/Lembaga (distribusi band dihitung dari sini);
  // irisan matriks & panel bawah ditambah filter band.
  const scope = useMemo(
    () => filterAvailabilityGroups(view.data, { districtId, category, groupId }),
    [view.data, districtId, category, groupId],
  );
  const distribution = useMemo(() => bandDistribution(scope), [scope]);

  // Band skor total (klik segmen distribusi di hero) — `?band=`; hanya sah bila
  // band itu memang berisi Lembaga pada irisan ini (tautan basi → diabaikan).
  const bandParam = get("band");
  const band =
    BANDS.includes(bandParam as AvailabilityScoreBand) && distribution[bandParam as AvailabilityScoreBand] > 0
      ? (bandParam as AvailabilityScoreBand)
      : null;
  const groups = useMemo(() => (band ? filterAvailabilityGroups({ groups: scope }, { band }) : scope), [scope, band]);

  // Chip filter aktif (#417 A): kunci URL `kategori distrik lembaga band urut/arah`.
  // Tampilan (`tampilan`) bukan filter — tidak ikut chip maupun Reset.
  const filterChips: ActiveFilterChip[] = [
    ...(category ? [{ id: "kategori", label: "Kategori", value: CATEGORY_LABELS[category], onRemove: () => setCategory(null) }] : []),
    ...(districtId ? [{ id: "distrik", label: "Distrik", value: districtOptions.find((d) => d.id === districtId)?.name ?? "—", onRemove: () => setDistrictId(null) }] : []),
    ...(groupId ? [{ id: "lembaga", label: "Lembaga", value: allGroups.find((g) => g.id === groupId)?.name ?? "—", onRemove: () => setGroupId(null) }] : []),
    ...(band ? [{ id: "band", label: "Tingkat skor", value: BAND_SHORT[band], onRemove: () => setBand(null) }] : []),
    ...(matrixView === "modul"
      ? moduleSortKey !== "name" || !sortAsc
        ? [
            {
              id: "urut",
              label: "Urut",
              value: `${moduleSortKey === "name" ? "nama" : (MODULE_CATALOG.find((m) => m.key === moduleSortKey)?.short ?? moduleSortKey)} ${sortAsc ? "↑" : "↓"}`,
              onRemove: () => setModuleSort("name", true),
            },
          ]
        : []
      : sortKey !== "health" || !sortAsc
        ? [{ id: "urut", label: "Urut", value: `${sortKeyLabel(sortKey)} ${sortAsc ? "↑" : "↓"}`, onRemove: () => setSort("health", true) }]
        : []),
  ];
  const resetFilters = () => setMany({ kategori: null, distrik: null, lembaga: null, band: null, urut: null, arah: null });

  const totals = useMemo(() => availabilityTotals(scope), [scope]);
  const moduleTotals = useMemo(() => moduleCoverageTotals(groups), [groups]);

  const domainSort = useCallback((rows: typeof groups) => sortMatrixRows(rows, sortKey, sortAsc), [sortKey, sortAsc]);
  const moduleSort = useCallback((rows: typeof groups) => sortModuleRows(rows, moduleSortKey, sortAsc), [moduleSortKey, sortAsc]);
  const domainRows = useMatrixRows(groups, domainSort, query, showAll);
  const moduleRows = useMatrixRows(groups, moduleSort, query, showAll);
  const activeRows = matrixView === "modul" ? moduleRows : domainRows;
  const criticalCount = useMemo(() => bandDistribution(groups).bad, [groups]);

  // Kartu domain → radar/heatmap diurut menaik pada domain itu (tampilan modul
  // punya urutan sendiri, jadi dipindah dulu ke bawaan = radar); klik lagi =
  // kembali ke total.
  const selectDomain = (key: AvailabilityDomainKey) => {
    setMany({ urut: sortKey === key ? null : key, arah: null, tampilan: matrixView === "heatmap" ? "heatmap" : null });
    matrixEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Ekspor matriks (#352 B3, menutup 6l): dua sheet — kelengkapan inti & cakupan modul.
  const handleExport = async () => {
    const { exportMultiSheetToExcel } = await import("@/lib/xlsx");
    await exportMultiSheetToExcel({
      filename: `ketersediaan-data-semua-lembaga-${format(new Date(), "yyyyMMdd")}`,
      sheets: [
        {
          name: "Kelengkapan Inti",
          columns: [
            { header: "Lembaga Petani", key: "name" },
            { header: "Kode", key: "code" },
            { header: "Distrik", key: "district" },
            { header: "Kategori", key: "category" },
            { header: "Petani", key: "farmers" },
            { header: "Persil", key: "parcels" },
            ...AVAILABILITY_DOMAIN_KEYS.map((k) => ({ header: `Skor ${AVAILABILITY_DOMAIN_LABELS[k]}`, key: k })),
            { header: "Skor Total", key: "health" },
            { header: "Temuan Anomali", key: "anomalies" },
          ],
          data: groups.map((g) => ({
            name: g.name,
            code: g.code ?? "",
            district: g.districtName,
            category: CATEGORY_LABELS[g.category],
            farmers: g.totalFarmers,
            parcels: g.totalParcels,
            profil: g.profileScore,
            petani: g.domainScores.petani,
            lahan: g.domainScores.lahan,
            pelatihan: g.domainScores.pelatihan,
            produksi: g.domainScores.produksi,
            health: g.healthScore,
            anomalies: g.totalAnomalies,
          })),
        },
        {
          name: "Cakupan Modul",
          columns: [
            { header: "Lembaga Petani", key: "name" },
            { header: "Kode", key: "code" },
            ...MODULE_CATALOG.map((m) => ({ header: `${MODULE_DOMAIN_LABELS[m.domain]} · ${m.label}`, key: m.key })),
          ],
          data: groups.map((g) => ({
            name: g.name,
            code: g.code ?? "",
            ...Object.fromEntries(
              g.moduleCoverage.map((m) => [m.key, m.pct == null ? "belum dimulai" : `${formatPct(m.pct)}%`]),
            ),
          })),
        },
      ],
    });
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {navSlot}
          <p className="text-sm text-muted-foreground">
            Kelengkapan data 5 domain lintas Lembaga Petani · data per{" "}
            <span className="font-medium text-foreground">{formatGeneratedAt(view.generatedAt)}</span>. Klik nama Lembaga untuk rinciannya.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Kategori Lembaga */}
          <Select
            value={category ?? "all"}
            onValueChange={(v) => {
              setCategory(v === "all" ? null : (v as BmpFarmerGroupCategory));
            }}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue>
                {(value) =>
                  value === "all"
                    ? "Semua Kategori"
                    : CATEGORY_LABELS[value as BmpFarmerGroupCategory]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="EX_PLASMA">Ex-Plasma</SelectItem>
              <SelectItem value="SWADAYA">Swadaya</SelectItem>
            </SelectContent>
          </Select>

          {/* Distrik */}
          <FilterCombobox
            options={districtOptions}
            value={districtId}
            onSelect={setDistrictId}
            allLabel="Semua Distrik"
            searchPlaceholder="Cari distrik..."
            emptyLabel="Distrik tidak ditemukan."
            widthClass="w-[180px]"
          />

          {/* Lembaga (#352 B3) */}
          <FilterCombobox
            options={groupOptions}
            value={groupId}
            onSelect={setGroupId}
            allLabel="Semua Lembaga"
            searchPlaceholder="Cari lembaga petani..."
            emptyLabel="Lembaga Petani tidak ditemukan."
            widthClass="w-[220px]"
          />

          {canExport && (
            <Button variant="outline" className="h-9" onClick={handleExport} disabled={groups.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          )}
        </div>
      </div>

      {/* Filter aktif (#417 A, T3): satu tempat untuk melihat & melepas pilihan filter/urutan. */}
      <ActiveFilterBar chips={filterChips} onReset={resetFilters} />

      {/* Hero satu baris: skor, kalimat ringkas, sebaran Lembaga per tingkat skor (segmen = filter). */}
      <AvailabilityHero totals={totals} distribution={distribution} activeBand={band} onBandChange={setBand} />

      {/* Kartu domain — skor memimpin; klik = urutkan matriks pada domain itu */}
      <AvailabilityDomainCards
        totals={totals}
        groups={scope}
        activeSort={matrixView !== "modul" && AVAILABILITY_DOMAIN_KEYS.includes(sortKey as AvailabilityDomainKey) ? (sortKey as AvailabilityDomainKey) : null}
        onSelect={selectDomain}
      />

      {/* Matriks: satu kartu, satu toolbar lengket (#417 B). Bukan <Card> — overflow
          kartu memutus `position: sticky` toolbar. */}
      <div ref={setMatrixEl} className="scroll-mt-4 rounded-xl border border-border/60 bg-card shadow-sm">
        <MatrixToolbar
          view={matrixView}
          onViewChange={setMatrixView}
          status={rowsSummary(groups.length, criticalCount, activeRows.limited.length)}
          sortOptions={matrixView === "modul" ? MODULE_SORT_OPTIONS : DOMAIN_SORT_OPTIONS}
          sortValue={matrixView === "modul" ? (moduleSortKey === "name" ? "name" : `${MODULE_SORT_PREFIX}${moduleSortKey}`) : sortKey}
          sortAsc={sortAsc}
          onSortChange={(v) =>
            matrixView === "modul" ? setModuleSort(v.startsWith(MODULE_SORT_PREFIX) ? v.slice(MODULE_SORT_PREFIX.length) : "name", true) : setSort(v as MatrixSortKey, true)
          }
          onDirectionToggle={() => (matrixView === "modul" ? setModuleSort(moduleSortKey, !sortAsc) : setSort(sortKey, !sortAsc))}
          query={query}
          onQueryChange={setQuery}
        />
        {matrixView === "radar" ? (
          <AvailabilityRadarGrid {...domainRows} query={query} showAll={showAll} onToggleShowAll={() => setShowAll((v) => !v)} />
        ) : matrixView === "heatmap" ? (
          <AvailabilityMatrix {...domainRows} query={query} showAll={showAll} onToggleShowAll={() => setShowAll((v) => !v)} sortKey={sortKey} sortAsc={sortAsc} onSortChange={setSort} />
        ) : (
          <AvailabilityModuleMatrix
            {...moduleRows}
            totals={moduleTotals}
            query={query}
            showAll={showAll}
            onToggleShowAll={() => setShowAll((v) => !v)}
            sortKey={moduleSortKey}
            sortAsc={sortAsc}
            onSortChange={setModuleSort}
          />
        )}
      </div>

      {/* Daftar Kerja bertab (#417 C): satu tempat untuk aksi sistemik, anomali per entitas, dan Lembaga tertinggal. */}
      <AvailabilityWorklist groups={groups} tab={worklistTab} onTabChange={(t) => setMany({ kerja: t === "sistemik" ? null : t })} />
    </div>
  );
}
