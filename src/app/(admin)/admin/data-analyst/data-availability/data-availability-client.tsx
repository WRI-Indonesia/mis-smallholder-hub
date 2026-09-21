"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import {
  AVAILABILITY_DOMAIN_LABELS,
  availabilityTotals,
  filterAvailabilityGroups,
  moduleCoverageTotals,
} from "@/lib/data-availability-aggregation";
import { MODULE_CATALOG, MODULE_DOMAIN_LABELS } from "@/lib/data-completeness-registry";
import { AvailabilityScoreCards } from "./availability-score-cards";
import { AvailabilityMatrix } from "./availability-matrix";
import { AvailabilityModuleMatrix } from "./availability-module-matrix";
import { AvailabilityGroupChart } from "./availability-group-chart";
import { AvailabilityAnomalyPanel } from "./availability-anomaly-panel";
import type { BmpFarmerGroupCategory, DataAvailabilityView } from "@/types/dashboard";
import { formatGeneratedAt } from "@/lib/format";

const CATEGORY_LABELS: Record<BmpFarmerGroupCategory, string> = {
  EX_PLASMA: "Ex-Plasma",
  SWADAYA: "Swadaya",
};

type MatrixView = "inti" | "modul";

export function DataAvailabilityClient({
  view,
  canExport,
  helpSlot,
}: {
  view: DataAvailabilityView;
  canExport: boolean;
  helpSlot?: React.ReactNode;
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

  // Filter Lembaga (#352 B3) — memfokuskan bar chart & matriks ke satu Lembaga.
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
  const matrixView: MatrixView = viewParam === "modul" ? "modul" : "inti";

  // Lembaga terpilih yang tidak lagi masuk irisan Distrik/Kategori baru
  // di-reset (pola DistrictGroupFilter) — bukan diam-diam menampilkan irisan kosong.
  const keepGroup = (
    districtId: string | null,
    category: BmpFarmerGroupCategory | null,
  ): Record<string, string | null> => {
    const g = groupId ? allGroups.find((x) => x.id === groupId) : undefined;
    const fits = !!g && (!districtId || g.districtId === districtId) && (!category || g.category === category);
    return fits ? {} : { lembaga: null };
  };
  const setDistrictId = (v: string | null) => setMany({ distrik: v, ...keepGroup(v, category) });
  const setCategory = (v: BmpFarmerGroupCategory | null) => setMany({ kategori: v, ...keepGroup(districtId, v) });
  const setGroupId = (v: string | null) => setMany({ lembaga: v });
  const setMatrixView = (v: MatrixView) => setMany({ tampilan: v === "inti" ? null : v });

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

  // Satu irisan dipakai bersama oleh seluruh panel di bawah.
  const groups = useMemo(
    () => filterAvailabilityGroups(view.data, { districtId, category, groupId }),
    [view.data, districtId, category, groupId],
  );

  const totals = useMemo(() => availabilityTotals(groups), [groups]);
  const moduleTotals = useMemo(() => moduleCoverageTotals(groups), [groups]);

  // Ekspor matriks (#352 B3, menutup 6l): dua sheet — kelengkapan inti & cakupan modul.
  const handleExport = async () => {
    const { exportMultiSheetToExcel } = await import("@/lib/xlsx");
    const domainKeys = ["profil", "petani", "lahan", "pelatihan", "produksi"] as const;
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
            ...domainKeys.map((k) => ({ header: `Skor ${AVAILABILITY_DOMAIN_LABELS[k]}`, key: k })),
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
              g.moduleCoverage.map((m) => [m.key, m.pct == null ? "belum dimulai" : `${m.pct.toFixed(1)}%`]),
            ),
          })),
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Ketersediaan Data — Semua Lembaga</h1>
            {helpSlot}
          </div>
          <p className="text-muted-foreground">
            Kelengkapan data 5 domain lintas Lembaga Petani — data per{" "}
            <span className="font-medium text-foreground">
              {formatGeneratedAt(view.generatedAt)}
            </span>
            . Klik baris Lembaga untuk rinciannya.
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

      <AvailabilityScoreCards totals={totals} />

      {/* Segmented control (#352 B3): Kelengkapan inti (Index) | Cakupan modul (informatif) */}
      <Tabs value={matrixView} onValueChange={(v) => setMatrixView(v as MatrixView)}>
        <TabsList>
          <TabsTrigger value="inti">Kelengkapan inti</TabsTrigger>
          <TabsTrigger value="modul">Cakupan modul</TabsTrigger>
        </TabsList>
      </Tabs>

      {matrixView === "inti" ? (
        <AvailabilityMatrix rows={groups} />
      ) : (
        <AvailabilityModuleMatrix rows={groups} totals={moduleTotals} />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AvailabilityGroupChart groups={groups} />
        </div>
        <AvailabilityAnomalyPanel groups={groups} />
      </div>
    </div>
  );
}
