"use client";

import { useState, useEffect, useMemo, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  getDistrictsForMap,
  getFarmerGroupsForMap,
  getMapData,
} from "@/server/actions/map";
import { expandMapData } from "@/lib/map-data";
import type {
  MapData,
  MapSelectOption,
  MapGroupOption,
} from "@/types/map";
import type { FeatureCollection } from "geojson";
import { MapControlPanel, type LayerVisibility, type LayerZoomTarget } from "./map-control-panel";
import {
  DEFAULT_OVERLAY_STATE,
  buildSymbology,
  type OverlayState,
  type CustomLayer,
} from "./map-overlays";
import {
  DEFAULT_HOTSPOT_STATE,
  countByConfidence,
  fetchHotspots,
  RIAU_BBOX,
  type HotspotState,
} from "./map-hotspot";
import {
  calcHotspotNearest,
  downloadHotspotShapefile,
  filterNearSorted,
  printHotspotPdf,
  type HotspotNearestRow,
} from "./map-hotspot-export";
import { HotspotSummaryDialog } from "./map-hotspot-summary";

const MapCanvas = dynamic(
  () => import("./map-canvas").then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-muted/30 animate-pulse" />,
  }
);

interface Props {
  provinces: MapSelectOption[];
  canViewParcel: boolean;
  canEditParcel: boolean;
  /** PRINT menu Lahan — gate tombol "Profil Lahan" (PDF) di popup lahan. */
  canPrintParcel: boolean;
  /** EXPORT menu Peta Lahan — gate tombol "Unduh SHP" titik api. */
  canExport: boolean;
  /** PRINT menu Peta Lahan — gate tombol "Cetak PDF" titik api. */
  canPrint: boolean;
  /** HelpHint dirender di server agar markdown Bantuan tak masuk bundle client. */
  helpSlot?: React.ReactNode;
}

export function MapParcelClient({ provinces, canViewParcel, canEditParcel, canPrintParcel, canExport, canPrint, helpSlot }: Props) {
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [farmerGroupId, setFarmerGroupId] = useState<string | null>(null);

  const [districts, setDistricts] = useState<MapSelectOption[]>([]);
  const [farmerGroups, setFarmerGroups] = useState<MapGroupOption[]>([]);

  const [mapData, setMapData] = useState<MapData | null>(null);
  const [filterOpen, setFilterOpen] = useState(true);
  // parcelPoints default mati (#223): ribuan titik jarang dipakai dan berat;
  // layer point dibangun lazy di MapCanvas saat dicentang.
  const [layers, setLayers] = useState<LayerVisibility>({
    kt: true,
    parcelPoints: false,
    parcelAreas: true,
  });
  const [overlays, setOverlays] = useState<OverlayState>(DEFAULT_OVERLAY_STATE);
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>([]);
  const [hotspot, setHotspot] = useState<HotspotState>(DEFAULT_HOTSPOT_STATE);
  const [hotspotData, setHotspotData] = useState<FeatureCollection | null>(null);
  const [hotspotLoading, setHotspotLoading] = useState(false);
  // Hasil kalkulasi lembaga terdekat per titik api (lazy, background), beserta
  // identitas input yang dihitungnya — hasil basi otomatis terabaikan lewat
  // pengecekan identitas (tanpa reset setState sinkron di effect).
  const [hotspotNearestResult, setHotspotNearestResult] = useState<{
    forData: FeatureCollection;
    forKt: MapData["kelompokTani"];
    rows: HotspotNearestRow[];
  } | null>(null);
  // Modal ringkasan titik api: auto-terbuka saat kalkulasi selesai, bisa
  // dibuka ulang dari tombol "Lihat Ringkasan" di panel.
  const [hotspotSummaryOpen, setHotspotSummaryOpen] = useState(false);
  // Zoom ke satu titik api dari klik baris tabel ringkasan.
  const [pointZoomRequest, setPointZoomRequest] = useState<{
    coord: [number, number];
    token: number;
  } | null>(null);
  // Data titik api yang sudah pernah memicu auto-open modal ringkasan.
  const autoOpenedForData = useRef<FeatureCollection | null>(null);
  // Snapshot Provinsi & Distrik SAAT data dimuat — header PDF/modal harus
  // menggambarkan data yang dimuat, bukan pilihan combobox yang bisa berubah
  // tanpa Muat Data (temuan review 2026-08-10).
  const [loadedArea, setLoadedArea] = useState<{
    provinceName: string | null;
    districtName: string | null;
  } | null>(null);

  const addCustomLayer = (layer: CustomLayer) => setCustomLayers((prev) => [...prev, layer]);
  const removeCustomLayer = (id: string) =>
    setCustomLayers((prev) => prev.filter((l) => l.id !== id));
  const toggleCustomLayer = (id: string, visible: boolean) =>
    setCustomLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible } : l)));
  // Symbology unique-value per layer vector: pilih atribut → mapping nilai→warna
  // dihitung sekali di sini; null mengembalikan ke warna tunggal.
  const setCustomLayerSymbology = (id: string, attribute: string | null) =>
    setCustomLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id || l.kind !== "vector") return l;
        return {
          ...l,
          symbology: attribute ? buildSymbology(l.data, attribute) : undefined,
        };
      })
    );
  // Zoom request ke satu layer GIS tambahan; token membedakan klik berulang pada
  // layer yang sama. Zoom juga menyalakan layer bila sedang disembunyikan.
  const [customZoomRequest, setCustomZoomRequest] = useState<{ id: string; token: number } | null>(null);
  const zoomToCustomLayer = (id: string) => {
    setCustomLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: true } : l)));
    setCustomZoomRequest({ id, token: Date.now() });
  };
  // Zoom request ke layer internal (klik label Legenda / Titik Api di panel kiri).
  const [layerZoomRequest, setLayerZoomRequest] = useState<{ target: LayerZoomTarget; token: number } | null>(null);
  const zoomToLayer = (target: LayerZoomTarget) => setLayerZoomRequest({ target, token: Date.now() });
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
      .catch(() => active && toast.error("Gagal memuat Lembaga Petani"));
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
    // Abort membatalkan request yang masih jalan saat toggle-off/ganti rentang —
    // stale-guard `active` tetap dipakai untuk mencegah setState basi.
    const controller = new AbortController();
    fetchHotspots(RIAU_BBOX, hotspot.dayRange, Date.now(), controller.signal)
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
      controller.abort();
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

  const hotspotCounts = useMemo(() => countByConfidence(hotspotData), [hotspotData]);

  // Kalkulasi jarak titik api → Lembaga Petani berjalan lazy di background
  // setelah titik tampil, chunked agar peta tetap responsif saat titik ribuan.
  // Cetak PDF disabled sampai selesai (lihat hotspotPdfCalculating).
  useEffect(() => {
    if (!hotspotData || hotspotData.features.length === 0) return;
    const ktPoints = mapData?.kelompokTani;
    if (!ktPoints || ktPoints.length === 0) return;
    const controller = new AbortController();
    calcHotspotNearest(hotspotData, ktPoints, controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
        setHotspotNearestResult({ forData: hotspotData, forKt: ktPoints, rows });
        // Auto-open + toast hanya untuk titik api yang BARU dimuat. Kalkulasi
        // juga terulang saat mapData berganti identitas (mis. reload setelah
        // Edit Lahan) — jarak diperbarui diam-diam, modal tidak boleh
        // menyembul lagi setelah user menutupnya (temuan review 2026-08-10).
        if (autoOpenedForData.current !== hotspotData) {
          autoOpenedForData.current = hotspotData;
          setHotspotSummaryOpen(true);
          toast.success("Kalkulasi jarak titik api selesai — Cetak PDF siap");
        }
      })
      .catch(() => {
        // Abort (ganti data/rentang/unmount) — hasil sengaja dibuang.
      });
    return () => controller.abort();
  }, [hotspotData, mapData]);

  // Hasil hanya berlaku untuk pasangan (titik api, lembaga) yang sama persis.
  const hotspotNearest =
    hotspotNearestResult &&
    hotspotNearestResult.forData === hotspotData &&
    hotspotNearestResult.forKt === (mapData?.kelompokTani ?? null)
      ? hotspotNearestResult.rows
      : null;

  const hotspotNearRows = useMemo(
    () => (hotspotNearest ? filterNearSorted(hotspotNearest) : []),
    [hotspotNearest]
  );

  const zoomToHotspotPoint = (lon: number, lat: number) => {
    setHotspotSummaryOpen(false);
    setPointZoomRequest({ coord: [lon, lat], token: Date.now() });
  };

  // PDF menunggu kalkulasi hanya bila memang ada yang dihitung (titik api +
  // data lembaga sama-sama tersedia); tanpa data peta, PDF tetap bisa dicetak
  // (kolom jarak "—").
  const hotspotPdfCalculating =
    !!hotspotData &&
    hotspotData.features.length > 0 &&
    (mapData?.kelompokTani.length ?? 0) > 0 &&
    hotspotNearest === null;

  const handleHotspotDownloadShp = () => {
    if (!hotspotData) return;
    downloadHotspotShapefile(hotspotData, hotspot.dayRange, new Date()).catch(() =>
      toast.error("Gagal membuat shapefile titik api")
    );
  };

  const hotspotArea = loadedArea ?? { provinceName: null, districtName: null };

  const handleHotspotPrintPdf = () => {
    if (!hotspotData || hotspotPdfCalculating) return;
    printHotspotPdf(hotspotData, hotspot.dayRange, new Date(), hotspotNearest, hotspotArea).catch(
      () => toast.error("Gagal membuat PDF titik api")
    );
  };

  // Nama area sesuai filter yang benar-benar dipakai memuat data.
  const currentAreaNames = () => ({
    provinceName: provinces.find((p) => p.id === provinceId)?.name ?? null,
    districtName: districts.find((d) => d.id === districtId)?.name ?? null,
  });

  // Re-fetch GeoJSON dengan filter aktif (dipakai setelah Edit Lahan dari popup).
  const reloadMapData = () => {
    if (!districtId) return;
    const area = currentAreaNames();
    startTransition(async () => {
      const res = await getMapData({ provinceId, districtId, farmerGroupId });
      if (res.success) {
        setMapData(res.data ? expandMapData(res.data) : null);
        setLoadedArea(area);
      }
    });
  };

  const handleLoad = () => {
    if (!districtId) {
      toast.error("Silakan pilih Distrik terlebih dahulu");
      return;
    }
    const area = currentAreaNames();
    startTransition(async () => {
      const res = await getMapData({ provinceId, districtId, farmerGroupId });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setMapData(res.data ? expandMapData(res.data) : null);
      setLoadedArea(area);
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
        customZoomRequest={customZoomRequest}
        layerZoomRequest={layerZoomRequest}
        pointZoomRequest={pointZoomRequest}
        hotspot={hotspot}
        hotspotData={hotspotData}
        canViewParcel={canViewParcel}
        canEditParcel={canEditParcel}
        canPrintParcel={canPrintParcel}
        onParcelUpdated={reloadMapData}
      />

      <MapControlPanel
        helpSlot={helpSlot}
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
        onZoomLayer={zoomToLayer}
        overlays={overlays}
        onOverlaysChange={setOverlays}
        customLayers={customLayers}
        onAddCustomLayer={addCustomLayer}
        onRemoveCustomLayer={removeCustomLayer}
        onToggleCustomLayer={toggleCustomLayer}
        onZoomCustomLayer={zoomToCustomLayer}
        onCustomLayerSymbology={setCustomLayerSymbology}
        hotspot={hotspot}
        onHotspotChange={handleHotspotChange}
        hotspotLoading={hotspotLoading}
        hotspotCounts={hotspotCounts}
        onHotspotDownloadShp={handleHotspotDownloadShp}
        onHotspotPrintPdf={handleHotspotPrintPdf}
        hotspotPdfCalculating={hotspotPdfCalculating}
        onHotspotShowSummary={() => setHotspotSummaryOpen(true)}
        canExport={canExport}
        canPrint={canPrint}
      />

      <HotspotSummaryDialog
        open={hotspotSummaryOpen}
        onOpenChange={setHotspotSummaryOpen}
        dayRange={hotspot.dayRange}
        area={hotspotArea}
        counts={hotspotCounts}
        distancesAvailable={hotspotNearest !== null}
        nearRows={hotspotNearRows}
        onDownloadShp={handleHotspotDownloadShp}
        onPrintPdf={handleHotspotPrintPdf}
        onZoomToPoint={zoomToHotspotPoint}
        canExport={canExport}
        canPrint={canPrint}
      />
    </div>
  );
}
