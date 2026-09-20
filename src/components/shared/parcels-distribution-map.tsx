"use client";

import { useMemo, useRef, useState } from "react";
import MapGL, { Source, Layer, Popup, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import type { Feature, FeatureCollection, Geometry, Point, Polygon, MultiPolygon } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { Target, User, Info, Landmark } from "lucide-react";
import { LAND_MARKER_CONDITION_LABELS, labelOf } from "@/lib/land-marker";
import { TREE_POINT_PAINT, MAP_STYLE_KEYS, MAP_STYLE_LABELS, type MapStyleKey } from "@/lib/map-style";
import { useVectorBasemap } from "@/hooks/use-vector-basemap";
import { formatArea } from "@/lib/format";
import { isNktAffected, landNktStatusLabel } from "@/lib/land-parcel-satellite-format";
import { geomBounds, parcelLabelFit, quantizeZoom, PARCEL_LABEL_FONT_PX } from "@/app/(admin)/admin/map/parcel/map-geo";
import { ParcelPopupActions } from "@/app/(admin)/admin/master-data/parcels/components/parcel-popup-actions";
import { ParcelEditModalHost } from "@/app/(admin)/admin/master-data/parcels/components/parcel-edit-modal-host";
import { MAP_POPUP_PROPS, MapPopupHeader, MapPopupHighlight, MapPopupSection, MapPopupRows, useMapPopupAutoPan, useMapPopupDrag, MapPopupDragHandle } from "@/components/shared/map-popup";

export interface DistributionMapParcel {
  id: string;
  parcelId: string;
  farmerName: string;
  /** ID Petani (kode) & Lembaga Petani — untuk header popup (parity Peta Lahan). */
  farmerCode: string;
  farmerGroupName: string;
  /** Kelompok Tani (LandParcel.subGroupLv2) — basis warna poligon. */
  kelompokTani: string | null;
  blok: string | null;
  area: number | null;
  geometry: unknown;
  /** Status NKT (#330): INCLUDED/AFFECTED → tepi merah + baris legenda "Lahan NKT"; null = belum dinilai. */
  nktStatus?: string | null;
}

interface Props {
  parcels: DistributionMapParcel[];
  /** Izin menu `master-data-parcels` — mengatur tombol popup Lihat Detail / Edit. */
  canViewParcel?: boolean;
  canEditParcel?: boolean;
  /**
   * Titik pohon sawit (#238) — lingkaran kuning non-interaktif di atas poligon.
   * `landParcelId` (row id lahan) dipakai memetakan titik ke Kelompok Tani
   * agar ikut checklist legenda; tanpa itu titik dianggap tanpa-KT.
   */
  treePoints?: { longitude: number; latitude: number; landParcelId?: string }[];
  /** Patok batas (#331): satu layer kuning untuk semua patok lahan (#345), toggle sendiri di legenda; popup kode. */
  markerPoints?: { id: string; code: string; longitude: number; latitude: number; condition: string }[];
}

/** Palet kategorikal per Kelompok Tani — berulang bila KT > 12; tanpa-KT = abu. */
const KT_COLORS = [
  "#16a34a", "#2563eb", "#ea580c", "#9333ea", "#0d9488",
  "#dc2626", "#ca8a04", "#db2777", "#4f46e5", "#65a30d",
  "#0891b2", "#b45309",
];
const NO_KT_COLOR = "#94a3b8";
const NO_KT_LABEL = "Tanpa Kelompok Tani";
const NO_KT_KEY = "__tanpa_kt__";

/** Kumpulkan semua [lng, lat] valid dari nested coordinates (Polygon/MultiPolygon). */
function collectPositions(coords: unknown, out: [number, number][]): void {
  if (!Array.isArray(coords)) return;
  if (coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number") {
    out.push([coords[0], coords[1]]);
    return;
  }
  for (const c of coords) collectPositions(c, out);
}

function parseGeometry(raw: unknown): Geometry | null {
  const g = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
  if (!g || typeof g !== "object") return null;
  const geom = g as Polygon | MultiPolygon;
  if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") return null;
  const positions: [number, number][] = [];
  collectPositions(geom.coordinates, positions);
  return positions.length > 0 ? geom : null;
}

const fillStyle: LayerProps = {
  id: "group-parcels-fill",
  type: "fill",
  paint: { "fill-color": ["get", "color"], "fill-opacity": 0.45 },
};

const lineStyle: LayerProps = {
  id: "group-parcels-border",
  type: "line",
  paint: { "line-color": ["get", "color"], "line-width": 1.5 },
};

/** Tepi merah lahan NKT (#330) — warna & ketebalan sama dengan layer "Lahan NKT" Peta Lahan. */
const NKT_COLOR = "#dc2626";


interface SelectedParcel {
  lngLat: [number, number];
  id: string;
  parcelId: string;
  farmerName: string;
  farmerCode: string;
  farmerGroupName: string;
  kelompokTani: string | null;
  blok: string | null;
  area: number | null;
  nktStatus: string | null;
}

const formatAreaHa = (n: number | null) => (n != null ? `${formatArea(n)} Ha` : "—");

/** Peta sebaran lahan (poligon) satu Lembaga/Petani, diwarnai per Kelompok Tani (#171/#172). */
export function ParcelsDistributionMap({
  parcels,
  canViewParcel = false,
  canEditParcel = false,
  treePoints,
  markerPoints,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [styleKey, setStyleKey] = useState<MapStyleKey>("hybrid");
  const { mapStyle, labelFont, labelsReady, labelBeforeId, syncStyle, registerImageFallback } =
    useVectorBasemap(styleKey);
  // KT yang disembunyikan via checklist legenda.
  const [hiddenKts, setHiddenKts] = useState<Set<string>>(new Set());
  // Sorotan NKT (#330) — toggle sendiri, terpisah dari checklist KT.
  const [showNkt, setShowNkt] = useState(true);
  // Patok (#331) — satu toggle; default mati supaya peta Lembaga (ribuan titik) tetap ringan.
  const [showMarkers, setShowMarkers] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<{ lngLat: [number, number]; code: string; condition: string } | null>(null);
  const markerGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: (markerPoints ?? []).map((m) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [m.longitude, m.latitude] },
        properties: { id: m.id, code: m.code, condition: m.condition },
      })),
    }),
    [markerPoints],
  );
  const markerCount = markerPoints?.length ?? 0;
  const [zoom, setZoom] = useState(13);
  const [selected, setSelected] = useState<SelectedParcel | null>(null);
  const [editParcelId, setEditParcelId] = useState<string | null>(null);

  const popupKey = selected ? `${selected.parcelId}:${selected.lngLat[0]},${selected.lngLat[1]}` : null;
  useMapPopupAutoPan(mapRef, popupKey);
  // Popup bisa digeser agar tidak menutupi lahan yang dipilih (pola Peta Lahan).
  const popupDrag = useMapPopupDrag(popupKey);

  const { collection, bounds, validCount, legend, labelBase, nktCount } = useMemo(() => {
    // KT → warna: distinct ternormalisasi (trim + case-insensitive, konsisten
    // #154), label = varian pertama, urut alfabetis agar penetapan warna stabil.
    const ktLabels = new Map<string, string>();
    for (const p of parcels) {
      const label = p.kelompokTani?.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (!ktLabels.has(key)) ktLabels.set(key, label);
    }
    const sortedKeys = [...ktLabels.keys()].sort((a, b) => a.localeCompare(b));
    const colorByKey = new Map<string, string>(
      sortedKeys.map((key, i) => [key, KT_COLORS[i % KT_COLORS.length]])
    );

    const features: Feature[] = [];
    const positions: [number, number][] = [];
    const countByKey = new Map<string, number>();
    const labels: { name: string; bounds: [number, number, number, number]; centroid: [number, number]; ktKey: string }[] = [];
    let noKtCount = 0;
    let nktCount = 0;
    for (const p of parcels) {
      const geom = parseGeometry(p.geometry);
      if (!geom) continue;
      const label = p.kelompokTani?.trim();
      const key = label ? label.toLowerCase() : null;
      const color = key ? colorByKey.get(key) ?? NO_KT_COLOR : NO_KT_COLOR;
      if (key) countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
      else noKtCount += 1;
      const ktKey = key ?? NO_KT_KEY;
      features.push({
        type: "Feature",
        geometry: geom,
        properties: {
          id: p.id,
          parcelId: p.parcelId,
          color,
          ktKey,
          farmerName: p.farmerName,
          farmerCode: p.farmerCode,
          farmerGroupName: p.farmerGroupName,
          kelompokTani: p.kelompokTani,
          blok: p.blok,
          area: p.area,
          nktStatus: p.nktStatus ?? null,
          nktAffected: isNktAffected(p.nktStatus),
        },
      });
      if (isNktAffected(p.nktStatus)) nktCount += 1;
      const featurePositions: [number, number][] = [];
      collectPositions((geom as Polygon | MultiPolygon).coordinates, featurePositions);
      positions.push(...featurePositions);
      // Label nama petani di dalam poligon (pola Peta Lahan: hanya bila muat).
      const b = geomBounds(geom);
      if (b && featurePositions.length > 0) {
        const centroid: [number, number] = [
          featurePositions.reduce((s, c) => s + c[0], 0) / featurePositions.length,
          featurePositions.reduce((s, c) => s + c[1], 0) / featurePositions.length,
        ];
        labels.push({ name: p.farmerName, bounds: b, centroid, ktKey });
      }
    }

    let b: [[number, number], [number, number]] | null = null;
    if (positions.length > 0) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (const [lng, lat] of positions) {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
      b = [[minLng, minLat], [maxLng, maxLat]];
    }

    const legendRows = sortedKeys
      .filter((key) => (countByKey.get(key) ?? 0) > 0)
      .map((key) => ({
        key,
        label: ktLabels.get(key)!,
        color: colorByKey.get(key)!,
        count: countByKey.get(key) ?? 0,
      }));
    if (noKtCount > 0)
      legendRows.push({ key: NO_KT_KEY, label: NO_KT_LABEL, color: NO_KT_COLOR, count: noKtCount });

    const fc: FeatureCollection = { type: "FeatureCollection", features };
    return { collection: fc, bounds: b, validCount: features.length, legend: legendRows, labelBase: labels, nktCount };
  }, [parcels]);

  // Hanya render KT yang tercentang di legenda.
  const visibleCollection: FeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features: collection.features.filter((f) => !hiddenKts.has(String(f.properties?.ktKey))),
    }),
    [collection, hiddenKts]
  );

  // Titik pohon sawit (#238) — ber-ktKey agar ikut checklist legenda KT.
  const treeFeatures = useMemo(() => {
    if (!treePoints || treePoints.length === 0) return [];
    const ktKeyByParcelId = new Map(
      parcels.map((p) => {
        const label = p.kelompokTani?.trim();
        return [p.id, label ? label.toLowerCase() : NO_KT_KEY];
      }),
    );
    return treePoints.map((t) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [t.longitude, t.latitude] },
      properties: {
        ktKey: (t.landParcelId ? ktKeyByParcelId.get(t.landParcelId) : null) ?? NO_KT_KEY,
      },
    }));
  }, [treePoints, parcels]);

  // Titik pohon yang tampil mengikuti KT tercentang — jangan biarkan titik
  // "mengambang" saat KT-nya disembunyikan dari legenda.
  const visibleTreeGeojson = useMemo<FeatureCollection | null>(() => {
    const features = treeFeatures.filter((f) => !hiddenKts.has(f.properties.ktKey));
    return features.length > 0 ? { type: "FeatureCollection", features } : null;
  }, [treeFeatures, hiddenKts]);

  // Label nama petani: hanya yang muat di poligon pada zoom sekarang (pola Peta Lahan).
  const labelGeojson = useMemo<FeatureCollection>(() => {
    const features = labelBase.flatMap((l) => {
      if (hiddenKts.has(l.ktKey)) return [];
      const fit = parcelLabelFit(l.name, l.bounds, zoom);
      return fit
        ? [
            {
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: l.centroid },
              properties: { farmerName: l.name, maxWidthEms: fit.maxWidthEms },
            },
          ]
        : [];
    });
    return { type: "FeatureCollection", features };
  }, [labelBase, hiddenKts, zoom]);

  // Bounds gabungan poligon + titik pohon — titik lahan tanpa poligon tetap
  // terjangkau "Zoom ke semua" dan zoom awal.
  const combinedBounds = useMemo<[[number, number], [number, number]] | null>(() => {
    if (treeFeatures.length === 0) return bounds;
    let [minLng, minLat, maxLng, maxLat] = bounds
      ? [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]]
      : [Infinity, Infinity, -Infinity, -Infinity];
    for (const f of treeFeatures) {
      const [lng, lat] = f.geometry.coordinates;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
    return [[minLng, minLat], [maxLng, maxLat]];
  }, [bounds, treeFeatures]);

  // Tetap render peta bila ada titik pohon meski tak ada poligon (paritas
  // ParcelMapView) — jangan sembunyikan data pohon di balik empty state.
  if (validCount === 0 && treeFeatures.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted/30 border rounded-md text-muted-foreground text-sm p-4 text-center">
        Belum ada lahan ber-geometri (poligon) untuk Lembaga ini.
      </div>
    );
  }

  const zoomToAll = () => {
    if (combinedBounds) mapRef.current?.fitBounds(combinedBounds, { padding: 40, duration: 600 });
  };

  const toggleKt = (key: string) => {
    setHiddenKts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showAll = () => setHiddenKts(new Set());
  const hideAll = () => setHiddenKts(new Set(legend.map((r) => r.key)));

  // Zoom ke poligon + titik pohon KT yang sedang tercentang saja.
  const zoomToVisible = () => {
    const positions: [number, number][] = [];
    for (const f of visibleCollection.features) {
      collectPositions((f.geometry as Polygon | MultiPolygon).coordinates, positions);
    }
    for (const f of visibleTreeGeojson?.features ?? []) {
      const [lng, lat] = (f.geometry as Point).coordinates;
      positions.push([lng, lat]);
    }
    if (positions.length === 0) return;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of positions) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
    mapRef.current?.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 600 });
  };

  const onMapClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) {
      setSelected(null);
      setSelectedMarker(null);
      return;
    }
    const props = f.properties as Record<string, unknown>;
    if (f.layer?.id === "group-markers") {
      const [lng, lat] = (f.geometry as Point).coordinates;
      setSelected(null);
      setSelectedMarker({ lngLat: [lng, lat], code: String(props.code ?? ""), condition: String(props.condition ?? "") });
      return;
    }
    setSelectedMarker(null);
    setSelected({
      lngLat: [e.lngLat.lng, e.lngLat.lat],
      id: String(props.id ?? ""),
      parcelId: String(props.parcelId ?? "—"),
      farmerName: String(props.farmerName ?? "—"),
      farmerCode: String(props.farmerCode ?? "—"),
      farmerGroupName: String(props.farmerGroupName ?? "—"),
      kelompokTani: (props.kelompokTani as string | null) ?? null,
      blok: (props.blok as string | null) ?? null,
      area: props.area != null ? Number(props.area) : null,
      nktStatus: (props.nktStatus as string | null) ?? null,
    });
  };

  return (
    <div className="relative h-[768px] w-full rounded-md overflow-hidden border">
      <MapGL
        ref={mapRef}
        initialViewState={combinedBounds ? { bounds: combinedBounds, fitBoundsOptions: { padding: 40 } } : { longitude: 101.8, latitude: 0.6, zoom: 9 }}
        mapStyle={mapStyle}
        interactiveLayerIds={["group-parcels-fill", "group-markers"]}
        onLoad={(e) => {
          registerImageFallback(e.target);
          syncStyle(e.target);
        }}
        onStyleData={(e) => syncStyle(e.target)}
        onClick={onMapClick}
        onMoveEnd={(e) => setZoom(quantizeZoom(e.viewState.zoom))}
        onMouseEnter={(e) => { e.target.getCanvas().style.cursor = "pointer"; }}
        onMouseLeave={(e) => { e.target.getCanvas().style.cursor = ""; }}
      >
        <Source type="geojson" data={visibleCollection}>
          {/* Di bawah label basemap (vector) supaya nama tempat tetap terbaca. */}
          <Layer {...fillStyle} beforeId={labelBeforeId} />
          <Layer {...lineStyle} beforeId={labelBeforeId} />
          {/* Tepi merah lahan NKT (#330) di atas garis KT; ikut checklist KT (fitur yang disembunyikan tak ada di source). */}
          <Layer
            id="group-parcels-nkt"
            type="line"
            beforeId={labelBeforeId}
            filter={["==", ["get", "nktAffected"], true]}
            layout={{ visibility: showNkt ? "visible" : "none" }}
            paint={{ "line-color": "#b91c1c", "line-width": 3 }}
          />
        </Source>

        {visibleTreeGeojson && (
          <Source type="geojson" data={visibleTreeGeojson}>
            <Layer id="group-parcels-trees" type="circle" paint={TREE_POINT_PAINT} />
          </Source>
        )}

        {/* Patok (#331): satu layer kuning, warna sama dengan Peta Lahan & tab Patok (#345: layer merah turunan dihapus). */}
        {markerCount > 0 && (
          <Source type="geojson" data={markerGeojson}>
            <Layer
              id="group-markers"
              type="circle"
              layout={{ visibility: showMarkers ? "visible" : "none" }}
              paint={{ "circle-color": "#facc15", "circle-radius": 4.5, "circle-stroke-width": 1.5, "circle-stroke-color": "#854d0e" }}
            />
          </Source>
        )}

        {selectedMarker && (
          <Popup longitude={selectedMarker.lngLat[0]} latitude={selectedMarker.lngLat[1]} onClose={() => setSelectedMarker(null)} {...MAP_POPUP_PROPS}>
            <div className="w-[240px]">
              <MapPopupHeader
                accent="blue"
                icon={<Landmark className="h-5 w-5 text-muted-foreground" />}
                title={selectedMarker.code}
                rows={[
                  { label: "Kondisi", value: labelOf(LAND_MARKER_CONDITION_LABELS, selectedMarker.condition) },
                  { label: "Koordinat", value: `${selectedMarker.lngLat[1].toFixed(6)}, ${selectedMarker.lngLat[0].toFixed(6)}`, mono: true },
                ]}
              />
            </div>
          </Popup>
        )}

        {/* Label nama petani dalam poligon — menunggu glyphs style aktif cocok. */}
        {labelsReady && (
        <Source type="geojson" data={labelGeojson}>
          <Layer
            id="group-parcels-label"
            type="symbol"
            layout={{
              "text-field": ["get", "farmerName"],
              "text-font": [labelFont],
              "text-size": PARCEL_LABEL_FONT_PX,
              "text-max-width": ["get", "maxWidthEms"],
              "text-optional": true,
            }}
            paint={{
              "text-color": "#111827",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.5,
            }}
          />
        </Source>
        )}

        {selected && (
          <Popup
            key={popupKey}
            longitude={selected.lngLat[0]}
            latitude={selected.lngLat[1]}
            onClose={() => setSelected(null)}
            {...MAP_POPUP_PROPS}
            offset={popupDrag.offset}
          >
            <MapPopupDragHandle {...popupDrag.handleProps} />
            {/* Lebar mengikuti isi (ID mono tak dipotong) — clamp agar tak terlalu lebar. */}
            <div className="w-max min-w-[300px] max-w-[440px]">
              <MapPopupHeader
                accent="blue"
                icon={<User className="h-5 w-5 text-muted-foreground" />}
                title={selected.farmerName}
                rows={[
                  { label: "ID Petani", value: selected.farmerCode, mono: true },
                  { label: "ID Lahan", value: selected.parcelId, mono: true },
                  { label: "Lembaga Petani", value: selected.farmerGroupName },
                ]}
              />
              <MapPopupHighlight label="Luas Lahan" value={formatAreaHa(selected.area)} />
              <div className="divide-y">
                <MapPopupSection icon={<Info className="h-3.5 w-3.5" />} title="Detail Lahan" defaultOpen>
                  <MapPopupRows
                    rows={[
                      { label: "Kelompok Tani", value: selected.kelompokTani },
                      { label: "Blok", value: selected.blok },
                      { label: "NKT", value: selected.nktStatus ? landNktStatusLabel(selected.nktStatus, true) : "Belum dinilai" },
                    ]}
                  />
                </MapPopupSection>
              </div>
              {selected.id && (canViewParcel || canEditParcel) && (
                <ParcelPopupActions
                  parcelId={selected.id}
                  canView={canViewParcel}
                  canEdit={canEditParcel}
                  onEdit={() => setEditParcelId(selected.id)}
                />
              )}
            </div>
          </Popup>
        )}
      </MapGL>

      {editParcelId && (
        <ParcelEditModalHost
          key={editParcelId}
          parcelId={editParcelId}
          onClose={() => setEditParcelId(null)}
          // Tutup popup sesudah simpan agar tak menampilkan data lama
          // (router.refresh dari form menyegar poligon dari server props).
          onSaved={() => setSelected(null)}
        />
      )}

      {/* Legenda + checklist show/hide per Kelompok Tani — kiri atas */}
      <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-2.5 max-h-[calc(100%-6rem)] w-52 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Legenda — Kelompok Tani
        </p>
        <ul className="space-y-1">
          {legend.map((row) => (
            <li key={row.key}>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-primary"
                  checked={!hiddenKts.has(row.key)}
                  onChange={() => toggleKt(row.key)}
                />
                <span
                  className="h-3 w-3 shrink-0 rounded-sm border border-foreground/20"
                  style={{ backgroundColor: row.color }}
                />
                <span className="flex-1 truncate" title={row.label}>{row.label}</span>
                <span className="tabular-nums text-muted-foreground">{row.count}</span>
              </label>
            </li>
          ))}
        </ul>
        {(nktCount > 0 || markerCount > 0) && (
          <div className="mt-2 border-t pt-2 space-y-1">
            {nktCount > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={showNkt} onChange={(e) => setShowNkt(e.target.checked)} />
                <span className="h-3 w-3 shrink-0 rounded-sm border-2" style={{ borderColor: NKT_COLOR, backgroundColor: `${NKT_COLOR}22` }} />
                <span className="flex-1 truncate" title="Lahan termasuk/terdampak NKT">Lahan NKT</span>
                <span className="tabular-nums text-muted-foreground">{nktCount}</span>
              </label>
            )}
            {markerCount > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={showMarkers} onChange={(e) => setShowMarkers(e.target.checked)} />
                <span className="h-3 w-3 shrink-0 rounded-[2px] border-2 border-[#854d0e] bg-[#facc15]" />
                <span className="flex-1 truncate" title="Patok batas lahan">Patok lahan</span>
                <span className="tabular-nums text-muted-foreground">{markerCount}</span>
              </label>
            )}
          </div>
        )}
        <div className="mt-2 border-t pt-2 space-y-1.5">
          <div className="flex gap-1.5">
            <button
              onClick={showAll}
              className="flex-1 rounded border px-1.5 py-1 text-[10px] font-semibold hover:bg-muted transition-colors"
            >
              Tampilkan semua
            </button>
            <button
              onClick={hideAll}
              className="flex-1 rounded border px-1.5 py-1 text-[10px] font-semibold hover:bg-muted transition-colors"
            >
              Sembunyikan semua
            </button>
          </div>
          <button
            onClick={zoomToVisible}
            disabled={visibleCollection.features.length === 0}
            className="w-full rounded border px-1.5 py-1 text-[10px] font-semibold hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1"
          >
            <Target className="h-3 w-3 text-primary" />
            Zoom ke tercentang
          </button>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-1 flex gap-1">
        {MAP_STYLE_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setStyleKey(key)}
            title={MAP_STYLE_LABELS[key].full}
            className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${
              styleKey === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {MAP_STYLE_LABELS[key].short}
          </button>
        ))}
      </div>

      <button
        onClick={zoomToAll}
        className="absolute bottom-3 right-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-2 flex items-center gap-1.5 text-xs font-semibold hover:bg-muted text-foreground transition-colors"
        title="Zoom ke semua lahan"
      >
        <Target className="h-3.5 w-3.5 text-primary" />
        <span>Zoom ke semua</span>
      </button>

      <div className="absolute bottom-3 left-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md px-2 py-1 text-xs text-muted-foreground flex items-center gap-1.5">
        <span>
          {visibleCollection.features.length}/{validCount} lahan ditampilkan
        </span>
        {treeFeatures.length > 0 && (
          <span className="flex items-center gap-1 border-l pl-1.5">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#facc15] border border-[#854d0e]" />
            {visibleTreeGeojson?.features.length ?? 0}/{treeFeatures.length} titik pohon
          </span>
        )}
      </div>
    </div>
  );
}
