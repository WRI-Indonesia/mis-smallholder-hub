"use client";

import { useState, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  getDistrictsForMap,
  getFarmerGroupsForMap,
  getMapData,
} from "@/server/actions/map";
import type {
  MapData,
  MapSelectOption,
  MapGroupOption,
} from "@/types/map";
import { MapControlPanel, type LayerVisibility } from "./map-control-panel";
import { DEFAULT_OVERLAY_STATE, type OverlayState } from "./map-overlays";

const MapCanvas = dynamic(
  () => import("./map-canvas").then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-muted/30 animate-pulse" />,
  }
);

interface Props {
  provinces: MapSelectOption[];
}

export function MapParcelClient({ provinces }: Props) {
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [farmerGroupId, setFarmerGroupId] = useState<string | null>(null);

  const [districts, setDistricts] = useState<MapSelectOption[]>([]);
  const [farmerGroups, setFarmerGroups] = useState<MapGroupOption[]>([]);

  const [mapData, setMapData] = useState<MapData | null>(null);
  const [filterOpen, setFilterOpen] = useState(true);
  const [layers, setLayers] = useState<LayerVisibility>({
    kt: true,
    parcelPoints: true,
    parcelAreas: true,
  });
  const [overlays, setOverlays] = useState<OverlayState>(DEFAULT_OVERLAY_STATE);
  const [isPending, startTransition] = useTransition();

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

  // Refetch farmer groups when district changes.
  useEffect(() => {
    if (!districtId) {
      setFarmerGroups([]);
      return;
    }
    let active = true;
    getFarmerGroupsForMap(districtId)
      .then((g) => active && setFarmerGroups(g))
      .catch(() => active && toast.error("Gagal memuat Kelompok Tani"));
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

  const handleLoad = () => {
    if (!districtId) {
      toast.error("Silakan pilih Distrik terlebih dahulu");
      return;
    }
    startTransition(async () => {
      const res = await getMapData({ provinceId, districtId, farmerGroupId });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setMapData(res.data ?? null);
      setFilterOpen(false);
      const total =
        (res.data?.counts.kt ?? 0) + (res.data?.counts.parcelAreas ?? 0);
      if (total === 0) {
        toast.info("Tidak ada data untuk filter ini");
      } else {
        toast.success("Data berhasil dimuat");
      }
    });
  };

  return (
    <div className="relative -m-6 h-[calc(100vh-3.5rem)] w-auto overflow-hidden">
      <MapCanvas data={mapData} layers={layers} overlays={overlays} />

      <MapControlPanel
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
        overlays={overlays}
        onOverlaysChange={setOverlays}
      />
    </div>
  );
}
