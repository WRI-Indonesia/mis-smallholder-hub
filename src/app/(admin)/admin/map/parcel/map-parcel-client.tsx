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
import type { FeatureCollection } from "geojson";
import { MapControlPanel, type LayerVisibility } from "./map-control-panel";
import { DEFAULT_OVERLAY_STATE, type OverlayState, type CustomLayer } from "./map-overlays";
import {
  DEFAULT_HOTSPOT_STATE,
  fetchHotspots,
  RIAU_BBOX,
  type HotspotState,
} from "./map-hotspot";

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
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>([]);
  const [hotspot, setHotspot] = useState<HotspotState>(DEFAULT_HOTSPOT_STATE);
  const [hotspotData, setHotspotData] = useState<FeatureCollection | null>(null);
  const [hotspotLoading, setHotspotLoading] = useState(false);

  const addCustomLayer = (layer: CustomLayer) => setCustomLayers((prev) => [...prev, layer]);
  const removeCustomLayer = (id: string) =>
    setCustomLayers((prev) => prev.filter((l) => l.id !== id));
  const toggleCustomLayer = (id: string, visible: boolean) =>
    setCustomLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible } : l)));
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

  // Refetch farmer groups when district changes. The list is cleared eagerly in
  // the province/district change handlers so we never setState synchronously here.
  useEffect(() => {
    if (!districtId) return;
    let active = true;
    getFarmerGroupsForMap(districtId)
      .then((g) => active && setFarmerGroups(g))
      .catch(() => active && toast.error("Gagal memuat Lembaga Tani"));
    return () => {
      active = false;
    };
  }, [districtId]);

  // Fetch fire hotspots when the layer is toggled on or the time window changes.
  // Query area is fixed to Riau province. Data is cleared in handleHotspotChange
  // when the layer is turned off, so no synchronous setState is needed here.
  useEffect(() => {
    if (!hotspot.visible) return;
    let active = true;
    fetchHotspots(RIAU_BBOX, hotspot.dayRange, Date.now())
      .then((fc) => {
        if (!active) return;
        setHotspotData(fc);
        if (fc.features.length === 0) {
          toast.info("Tidak ada titik api pada area & rentang waktu ini");
        }
      })
      .catch(() => active && toast.error("Gagal memuat titik api"))
      .finally(() => active && setHotspotLoading(false));
    return () => {
      active = false;
    };
  }, [hotspot.visible, hotspot.dayRange]);

  const handleProvinceChange = (val: string | null) => {
    setProvinceId(val);
    setDistrictId(null);
    setFarmerGroupId(null);
    setFarmerGroups([]);
  };

  const handleDistrictChange = (val: string | null) => {
    setDistrictId(val);
    setFarmerGroupId(null);
    if (!val) setFarmerGroups([]);
  };

  // Drive hotspot data/loading resets from the change handler so the fetch effect
  // holds no synchronous setState. Turning the layer off clears the data; any
  // change that keeps it on (toggle-on or day-range) re-enters the loading state.
  const handleHotspotChange = (next: HotspotState) => {
    setHotspot(next);
    if (!next.visible) setHotspotData(null);
    else setHotspotLoading(true);
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
      <MapCanvas
        data={mapData}
        layers={layers}
        overlays={overlays}
        customLayers={customLayers}
        hotspot={hotspot}
        hotspotData={hotspotData}
      />

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
        customLayers={customLayers}
        onAddCustomLayer={addCustomLayer}
        onRemoveCustomLayer={removeCustomLayer}
        onToggleCustomLayer={toggleCustomLayer}
        hotspot={hotspot}
        onHotspotChange={handleHotspotChange}
        hotspotLoading={hotspotLoading}
        hotspotCount={hotspotData?.features.length ?? 0}
      />
    </div>
  );
}
