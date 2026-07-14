"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  getDistrictsForMap,
  getFarmerGroupsForMap,
  getBmpMapData,
} from "@/server/actions/map";
import { enumeratePeriods, formatPeriodLabel } from "@/lib/report-production";
import type {
  BmpMapData,
  BmpParcelFeature,
  ProductionAvailabilityCategory,
  MapSelectOption,
  MapGroupOption,
} from "@/types/map";
import {
  MapBmpControlPanel,
  DEFAULT_BMP_VISIBILITY,
  type BmpLayerVisibility,
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
  const [isPending, startTransition] = useTransition();
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

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

      // Availability matrix (same data as the right panel): global month range +
      // one row per parcel, sorted by farmer name.
      const { periods, rows: sortedParcels } = buildAvailabilityMatrix(mapData.parcels);
      const rows = sortedParcels.map((p) => ({
        name: p.farmerName,
        farmerCode: p.farmerCode,
        parcelId: p.parcelId,
        production: p.production,
      }));

      const { generateBmpMapPdf } = await import("@/lib/bmp-map-print");
      generateBmpMapPdf({
        title: `Peta BMP — ${ktName}`,
        subtitle: `Ketersediaan Data Produksi · Dicetak ${dateStr}`,
        imageDataUrl: shot.dataUrl,
        imageWidthPx: shot.width,
        imageHeightPx: shot.height,
        legend: [
          { color: "#22c55e", label: "Baik (> 2 thn)", count: c.baik },
          { color: "#eab308", label: "Cukup (1–2 thn)", count: c.cukup },
          { color: "#f97316", label: "Kurang (< 1 thn)", count: c.kurang },
          { color: "#9ca3af", label: "Tidak ada data", count: c.none, outlineOnly: true },
        ],
        matrix: { periods, rows },
        fileName: `peta-bmp-${ktName.replace(/\s+/g, "-").toLowerCase()}.pdf`,
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
      <MapCanvas data={mapData} layers={layers} registerCapture={registerCapture} />

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
        onPrint={handlePrint}
        printing={printing}
        onExport={handleExport}
        exporting={exporting}
      />
    </div>
  );
}
