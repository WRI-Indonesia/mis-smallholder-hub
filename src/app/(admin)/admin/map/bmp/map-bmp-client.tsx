"use client";

import { useState, useEffect, useMemo, useTransition, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  getDistrictsForMap,
  getFarmerGroupsForMap,
  getBmpMapData,
} from "@/server/actions/map";
import { enumeratePeriods, formatPeriodLabel } from "@/lib/report-production";
import {
  BMP_PRODUCTIVITY_CLASSES,
  bmpProductionYears,
  buildBmpProductivityMatrix,
  buildBmpProductivityView,
  productivityViewLabel,
} from "@/lib/map-data";
import type {
  BmpMapData,
  BmpParcelFeature,
  ProductionAvailabilityCategory,
  MapSelectOption,
  MapGroupOption,
} from "@/types/map";
import {
  MapBmpControlPanel,
  BMP_CATEGORIES,
  DEFAULT_BMP_VISIBILITY,
  DEFAULT_BMP_PRODUCTIVITY_VISIBILITY,
  type BmpColorMode,
  type BmpLayerVisibility,
  type BmpProductivityVisibility,
} from "./map-bmp-control-panel";
import type { BmpMapCapture } from "./map-bmp-canvas";

const MapCanvas = dynamic(
  () => import("./map-bmp-canvas").then((m) => m.MapBmpCanvas),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-muted/30 animate-pulse" />,
  }
);

interface Props {
  provinces: MapSelectOption[];
}

/**
 * Shared basis for the print/Excel exports: the global month range across all
 * parcels (enumerated) + parcels sorted by farmer name.
 */
function buildAvailabilityMatrix(parcels: BmpParcelFeature[]) {
  let min: string | null = null;
  let max: string | null = null;
  for (const p of parcels) {
    if (p.firstPeriod && (!min || p.firstPeriod < min)) min = p.firstPeriod;
    if (p.lastPeriod && (!max || p.lastPeriod > max)) max = p.lastPeriod;
  }
  const periods = min && max ? enumeratePeriods(min, max) : [];
  const rows = [...parcels].sort((a, b) => a.farmerName.localeCompare(b.farmerName, "id"));
  return { periods, rows };
}

export function MapBmpClient({ provinces }: Props) {
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [farmerGroupId, setFarmerGroupId] = useState<string | null>(null);

  const [districts, setDistricts] = useState<MapSelectOption[]>([]);
  const [farmerGroups, setFarmerGroups] = useState<MapGroupOption[]>([]);

  const [mapData, setMapData] = useState<BmpMapData | null>(null);
  const [filterOpen, setFilterOpen] = useState(true);
  const [layers, setLayers] = useState<BmpLayerVisibility>(DEFAULT_BMP_VISIBILITY);
  const [colorMode, setColorMode] = useState<BmpColorMode>("AVAILABILITY");
  // Productivity view: "AVG" or a year as string (Select values are strings).
  const [prodView, setProdView] = useState("AVG");
  const [prodLayers, setProdLayers] = useState<BmpProductivityVisibility>(
    DEFAULT_BMP_PRODUCTIVITY_VISIBILITY
  );
  const [isPending, startTransition] = useTransition();
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Per-parcel Ton/Ha + class for the selected view — pure client-side math
  // over the already-fetched per-period production (no extra query).
  const productivity = useMemo(
    () =>
      mapData
        ? buildBmpProductivityView(mapData.parcels, prodView === "AVG" ? "AVG" : Number(prodView))
        : null,
    [mapData, prodView]
  );

  // The canvas registers a snapshot fn here so the print button can grab the map.
  const captureRef = useRef<(() => Promise<BmpMapCapture | null>) | null>(null);
  const registerCapture = useCallback((fn: (() => Promise<BmpMapCapture | null>) | null) => {
    captureRef.current = fn;
  }, []);

  // Refetch districts when province changes.
  useEffect(() => {
    let active = true;
    getDistrictsForMap(provinceId)
      .then((d) => active && setDistricts(d))
      .catch(() => active && toast.error("Gagal memuat Distrik"));
    return () => {
      active = false;
    };
  }, [provinceId]);

  // Refetch farmer groups when district changes (null district → full scope, so
  // the user can pick a KT directly without choosing Province/Distrik first).
  useEffect(() => {
    let active = true;
    getFarmerGroupsForMap(districtId)
      .then((g) => active && setFarmerGroups(g))
      .catch(() => active && toast.error("Gagal memuat Lembaga Petani"));
    return () => {
      active = false;
    };
  }, [districtId]);

  const handleProvinceChange = (val: string | null) => {
    setProvinceId(val);
    setDistrictId(null);
    setFarmerGroupId(null);
  };

  const handleDistrictChange = (val: string | null) => {
    setDistrictId(val);
    setFarmerGroupId(null);
  };

  const handlePrint = async () => {
    if (!mapData || printing) return;
    const capture = captureRef.current;
    if (!capture) {
      toast.error("Peta belum siap");
      return;
    }
    setPrinting(true);
    try {
      const shot = await capture();
      if (!shot) {
        toast.error("Gagal mengambil gambar peta. Coba basemap Light/Dark (bukan Hybrid).");
        return;
      }
      const ktName =
        farmerGroups.find((g) => g.id === farmerGroupId)?.name ??
        mapData.kt[0]?.name ??
        "Lembaga Petani";
      const dateStr = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());
      const c = mapData.counts;

      // WYSIWYG: legend, subtitle, and the data page(s) all follow the active
      // layer — productivity table vs availability matrix. Both legends map
      // over the same metadata the on-screen legend uses, so they can't drift.
      const isProd = colorMode === "PRODUCTIVITY" && productivity != null;
      const prodLabel = productivityViewLabel(prodView === "AVG" ? "AVG" : Number(prodView));
      const availCount = { BAIK: c.baik, CUKUP: c.cukup, KURANG: c.kurang, NONE: c.none };
      const legend = isProd
        ? BMP_PRODUCTIVITY_CLASSES.map((cls) => ({
            color: cls.color,
            label: cls.label,
            count: productivity.counts[cls.key],
            outlineOnly: cls.key === "NO_DATA",
          }))
        : BMP_CATEGORIES.map((cat) => ({
            color: cat.color,
            label: cat.label,
            count: availCount[cat.key],
            outlineOnly: cat.key === "NONE",
          }));

      // Data page(s) follow the active layer too.
      const dataPages = isProd
        ? { productivityMatrix: buildBmpProductivityMatrix(mapData.parcels) }
        : (() => {
            const { periods, rows: sortedParcels } = buildAvailabilityMatrix(mapData.parcels);
            return {
              matrix: {
                periods,
                rows: sortedParcels.map((p) => ({
                  name: p.farmerName,
                  farmerCode: p.farmerCode,
                  parcelId: p.parcelId,
                  production: p.production,
                })),
              },
            };
          })();

      const ktSlug = ktName.replace(/\s+/g, "-").toLowerCase();
      const { generateBmpMapPdf } = await import("@/lib/bmp-map-print");
      generateBmpMapPdf({
        title: `Peta BMP — ${ktName}`,
        subtitle: isProd
          ? `Produktivitas ${prodLabel} (Ton/Ha) · Dicetak ${dateStr}`
          : `Ketersediaan Data Produksi · Dicetak ${dateStr}`,
        imageDataUrl: shot.dataUrl,
        imageWidthPx: shot.width,
        imageHeightPx: shot.height,
        legend,
        legendTitle: isProd ? "Legenda Produktivitas (Ton/Ha):" : undefined,
        ...dataPages,
        fileName: isProd ? `peta-bmp-produktivitas-${ktSlug}.pdf` : `peta-bmp-${ktSlug}.pdf`,
      });
    } catch {
      toast.error("Gagal membuat PDF peta");
    } finally {
      setPrinting(false);
    }
  };

  const handleExport = async () => {
    if (!mapData || exporting) return;
    setExporting(true);
    try {
      const ktName =
        farmerGroups.find((g) => g.id === farmerGroupId)?.name ??
        mapData.kt[0]?.name ??
        "Lembaga Petani";
      const ktSlug = ktName.replace(/\s+/g, "-").toLowerCase();

      // WYSIWYG: the Excel follows the active layer as well.
      if (colorMode === "PRODUCTIVITY") {
        const round2 = (n: number) => Math.round(n * 100) / 100;
        const matrix = buildBmpProductivityMatrix(mapData.parcels);
        const columns = [
          { header: "Nama", key: "nama", width: 24 },
          { header: "ID Petani", key: "idPetani", width: 16 },
          { header: "ID Lahan", key: "idLahan", width: 18 },
          { header: "Luas Lahan (Ha)", key: "luas", width: 14 },
          ...matrix.years.map((y) => ({ header: `${y} (Ton/Ha)`, key: String(y), width: 13 })),
          { header: "Rata-rata (Ton/Ha)", key: "rataRata", width: 16 },
        ];
        const data = matrix.rows.map((r) => {
          const row: Record<string, unknown> = {
            nama: r.name,
            idPetani: r.farmerCode,
            idLahan: r.parcelId,
          };
          if (r.area != null) row.luas = r.area;
          for (const year of matrix.years) {
            const v = r.tonHaByYear[String(year)];
            if (v != null) row[String(year)] = round2(v);
          }
          if (r.avg != null) row.rataRata = round2(r.avg);
          return row;
        });
        const { exportToExcel } = await import("@/lib/xlsx");
        await exportToExcel({
          filename: `produktivitas-${ktSlug}`,
          sheetName: "Produktivitas",
          columns,
          data,
        });
        return;
      }

      const { periods, rows } = buildAvailabilityMatrix(mapData.parcels);
      const statusLabel = (c: ProductionAvailabilityCategory) =>
        c === "BAIK" ? "Baik" : c === "CUKUP" ? "Cukup" : c === "KURANG" ? "Kurang" : "Tidak ada Data";
      const columns = [
        { header: "Nama", key: "nama", width: 24 },
        { header: "ID Petani", key: "idPetani", width: 16 },
        { header: "ID Lahan", key: "idLahan", width: 18 },
        { header: "Status Ketersediaan Data", key: "status", width: 22 },
        { header: "Luas Lahan (Ha)", key: "luas", width: 14 },
        ...periods.map((p) => ({ header: formatPeriodLabel(p), key: p, width: 9 })),
      ];
      const data = rows.map((p) => {
        const row: Record<string, unknown> = {
          nama: p.farmerName,
          idPetani: p.farmerCode,
          idLahan: p.parcelId,
          status: statusLabel(p.category),
        };
        if (p.area != null) row.luas = p.area;
        for (const period of periods) {
          if (p.production[period] !== undefined) row[period] = p.production[period];
        }
        return row;
      });
      const { exportToExcel } = await import("@/lib/xlsx");
      await exportToExcel({
        filename: `ketersediaan-data-${ktName.replace(/\s+/g, "-").toLowerCase()}`,
        sheetName: "Ketersediaan Data",
        columns,
        data,
      });
    } catch {
      toast.error("Gagal membuat Excel");
    } finally {
      setExporting(false);
    }
  };

  const handleLoad = () => {
    if (!farmerGroupId) {
      toast.error("Silakan pilih Lembaga Petani terlebih dahulu");
      return;
    }
    startTransition(async () => {
      const res = await getBmpMapData({ provinceId, districtId, farmerGroupId });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setMapData(res.data ?? null);
      // Default the productivity view to the newest year with data (#174).
      const years = bmpProductionYears(res.data?.parcels ?? []);
      setProdView(years.length > 0 ? String(years[0]) : "AVG");
      setFilterOpen(false);
      const counts = res.data?.counts;
      const total = counts
        ? counts.baik + counts.cukup + counts.kurang + counts.none
        : 0;
      if (total === 0) {
        toast.info("Tidak ada lahan untuk filter ini");
      } else {
        toast.success("Data berhasil dimuat");
      }
    });
  };

  return (
    <div className="relative -m-6 h-[calc(100vh-3.5rem)] w-auto overflow-hidden">
      <MapCanvas
        data={mapData}
        layers={layers}
        colorMode={colorMode}
        // Gated by mode: year changes must not rebuild the map sources while
        // the availability layer is the one being rendered.
        productivity={colorMode === "PRODUCTIVITY" ? productivity : null}
        prodLayers={prodLayers}
        registerCapture={registerCapture}
      />

      <MapBmpControlPanel
        provinces={provinces}
        districts={districts}
        farmerGroups={farmerGroups}
        provinceId={provinceId}
        districtId={districtId}
        farmerGroupId={farmerGroupId}
        onProvinceChange={handleProvinceChange}
        onDistrictChange={handleDistrictChange}
        onFarmerGroupChange={setFarmerGroupId}
        onLoad={handleLoad}
        isLoading={isPending}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        counts={mapData?.counts ?? null}
        layers={layers}
        onLayersChange={setLayers}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        productivity={productivity}
        prodView={prodView}
        onProdViewChange={setProdView}
        prodLayers={prodLayers}
        onProdLayersChange={setProdLayers}
        onPrint={handlePrint}
        printing={printing}
        onExport={handleExport}
        exporting={exporting}
      />
    </div>
  );
}
