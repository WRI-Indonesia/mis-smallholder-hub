"use client";

import { useRef, useMemo, useEffect, useState, useCallback, type ReactNode } from "react";
import { useTheme } from "next-themes";
import Map, { Source, Layer, Popup, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, GraduationCap, BarChart3, Info, ChevronDown, Check, Loader2, User, Printer, Flame, Ruler, X, Undo2, List, Search, Crosshair, Maximize } from "lucide-react";
import { toast } from "sonner";
import type { FeatureCollection, Point } from "geojson";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFarmerTraining, getParcelProduction, getParcelPassport } from "@/server/actions/map";
import type { MapData, ParcelFeature, FarmerTrainingItem, ProductionSummary } from "@/types/map";
import type { LayerVisibility } from "./map-control-panel";
import {
  MAP_OVERLAYS,
  overlayTileUrl,
  geojsonBounds,
  type OverlayState,
  type CustomLayer,
} from "./map-overlays";
import {
  HOTSPOT_RECENT_COLOR,
  HOTSPOT_OLDER_COLOR,
  type HotspotState,
} from "./map-hotspot";
import {
  PARCEL_LABEL_FONT_PX,
  haversineMeters,
  pathMeters,
  sphericalAreaM2,
  formatDistance,
  formatMeasureArea,
  geomBounds,
  parcelLabelFit,
  type LngLat,
} from "./map-geo";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

const GLYPHS = "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf";

const MAP_STYLES = {
  light: {
    version: 8 as const,
    glyphs: GLYPHS,
    sources: {
      "carto-light": {
        type: "raster",
        tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [{ id: "carto-light-layer", type: "raster", source: "carto-light", minzoom: 0, maxzoom: 20 }],
  },
  dark: {
    version: 8 as const,
    glyphs: GLYPHS,
    sources: {
      "carto-dark": {
        type: "raster",
        tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [{ id: "carto-dark-layer", type: "raster", source: "carto-dark", minzoom: 0, maxzoom: 20 }],
  },
  hybrid: {
    version: 8 as const,
    glyphs: GLYPHS,
    sources: {
      "google-hybrid": {
        type: "raster",
        tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
        tileSize: 256,
        attribution: "Map data &copy; Google",
      },
    },
    layers: [{ id: "google-hybrid-layer", type: "raster", source: "google-hybrid", minzoom: 0, maxzoom: 20 }],
  },
};

const formatArea = (n: number | null | undefined) =>
  n == null ? "—" : `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ha`;

const MEASURE_COLOR = "#f59e0b";

type SelectedFeature = {
  longitude: number;
  latitude: number;
  kind: "kt" | "parcel" | "hotspot";
  props: Record<string, unknown>;
};

interface Props {
  data: MapData | null;
  layers: LayerVisibility;
  overlays: OverlayState;
  customLayers: CustomLayer[];
  hotspot: HotspotState;
  hotspotData: FeatureCollection | null;
}

export function MapCanvas({ data, layers, overlays, customLayers, hotspot, hotspotData }: Props) {
  const mapRef = useRef<MapRef>(null);
  const { resolvedTheme } = useTheme();

  // Basemap follows the app theme until the user picks one explicitly (override).
  const [styleOverride, setStyleOverride] = useState<keyof typeof MAP_STYLES | null>(null);
  const styleKey: keyof typeof MAP_STYLES = styleOverride ?? (resolvedTheme === "dark" ? "dark" : "light");

  const [selected, setSelected] = useState<SelectedFeature | null>(null);

  // Close any open popup when a new dataset loads (adjusts state during render on
  // prop change — the React-endorsed alternative to a setState-in-effect).
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setSelected(null);
  }

  // Right-side parcel list panel (searchable list of the currently-shown parcels).
  const [showParcelList, setShowParcelList] = useState(false);
  const [parcelSearch, setParcelSearch] = useState("");

  // Ruler tool: while active, map clicks drop vertices and the running
  // geodesic distance along the path is shown.
  const [measuring, setMeasuring] = useState(false);
  const [measurePts, setMeasurePts] = useState<LngLat[]>([]);

  const measureLineFc = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features:
        measurePts.length >= 2
          ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: measurePts } }]
          : [],
    }),
    [measurePts]
  );
  const measurePointsFc = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: measurePts.map((p, i) => ({
        type: "Feature",
        properties: { idx: i },
        geometry: { type: "Point", coordinates: p },
      })),
    }),
    [measurePts]
  );
  const measureMeters = useMemo(() => pathMeters(measurePts), [measurePts]);
  const measureAreaM2 = useMemo(() => sphericalAreaM2(measurePts), [measurePts]);

  // Per-segment distance labels at each segment midpoint.
  const measureSegmentFc = useMemo<FeatureCollection>(() => {
    const features = [];
    for (let i = 1; i < measurePts.length; i++) {
      const a = measurePts[i - 1];
      const b = measurePts[i];
      features.push({
        type: "Feature" as const,
        properties: { label: formatDistance(haversineMeters(a, b)) },
        geometry: { type: "Point" as const, coordinates: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] },
      });
    }
    return { type: "FeatureCollection", features };
  }, [measurePts]);

  // Closed polygon fill once there are ≥3 points (enables area readout).
  const measurePolygonFc = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features:
        measurePts.length >= 3
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: { type: "Polygon", coordinates: [[...measurePts, measurePts[0]]] },
              },
            ]
          : [],
    }),
    [measurePts]
  );

  const removeLastMeasure = () => setMeasurePts((prev) => prev.slice(0, -1));

  const toggleMeasure = () => {
    setMeasuring((on) => {
      if (!on) {
        setMeasurePts([]); // fresh measurement when entering
        setSelected(null);
      }
      return !on;
    });
  };

  // Esc finishes the current measurement (keeps the drawing, stops adding points).
  useEffect(() => {
    if (!measuring) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMeasuring(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [measuring]);

  const parcelAreaGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: (data?.parcels ?? []).map((p) => ({
        type: "Feature",
        geometry: p.geometry,
        properties: parcelProps(p),
      })),
    }),
    [data]
  );

  const parcelPointGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: (data?.parcels ?? []).map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: p.centroid },
        properties: parcelProps(p),
      })),
    }),
    [data]
  );

  // Current zoom drives the "does the label fit inside the polygon" test.
  const [zoom, setZoom] = useState(9);

  // Bounds + centroid per named parcel — computed once per dataset (zoom-independent),
  // so the per-zoom label pass only runs the cheap fit math.
  const namedParcels = useMemo(
    () =>
      (data?.parcels ?? []).flatMap((p) => {
        const name = p.farmerName?.trim();
        const bounds = name ? geomBounds(p.geometry) : null;
        return name && bounds ? [{ name, bounds, centroid: p.centroid }] : [];
      }),
    [data]
  );

  // Parcel name labels: only those whose (wrapped) name fits at the current zoom.
  const parcelLabelGeojson = useMemo<FeatureCollection>(() => {
    const features = namedParcels.flatMap((p) => {
      const fit = parcelLabelFit(p.name, p.bounds, zoom);
      return fit
        ? [
            {
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: p.centroid },
              properties: { farmerName: p.name, maxWidthEms: fit.maxWidthEms },
            },
          ]
        : [];
    });
    return { type: "FeatureCollection", features };
  }, [namedParcels, zoom]);

  const ktGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: (data?.kelompokTani ?? []).map((kt) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [kt.long, kt.lat] },
        properties: {
          id: kt.id,
          name: kt.name,
          code: kt.code,
          districtName: kt.districtName,
        },
      })),
    }),
    [data]
  );

  const fitAll = useCallback(() => {
    const map = mapRef.current;
    if (!map || !data) return;
    const coords: [number, number][] = [
      ...data.kelompokTani.map((kt) => [kt.long, kt.lat] as [number, number]),
      ...data.parcels.map((p) => p.centroid),
    ];
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.easeTo({ center: coords[0], zoom: 13, duration: 600 });
      return;
    }
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80, maxZoom: 15, duration: 600 });
  }, [data]);

  useEffect(() => {
    fitAll();
  }, [fitAll]);

  // Zoom to a newly-added vector GIS layer so the user can see where it landed.
  const fittedLayerIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const l of customLayers) {
      if (l.kind !== "vector" || fittedLayerIds.current.has(l.id)) continue;
      fittedLayerIds.current.add(l.id);
      const bounds = geojsonBounds(l.data);
      if (bounds) map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
    }
  }, [customLayers]);

  const vis = (on: boolean) => ({ visibility: (on ? "visible" : "none") as "visible" | "none" });

  // Label colors follow the basemap so they stay legible (matches DASH-03).
  const labelColors =
    styleKey === "dark"
      ? { text: "#f8fafc", halo: "#0f172a" }
      : styleKey === "hybrid"
        ? { text: "#ffffff", halo: "#000000" }
        : { text: "#1f2937", halo: "#ffffff" };

  const handleClick = (e: MapLayerMouseEvent) => {
    if (measuring) {
      setMeasurePts((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
      return;
    }
    const feature = e.features?.[0];
    if (!feature) {
      setSelected(null);
      return;
    }
    const layerId = feature.layer?.id;
    if (layerId === "kt-point") {
      const [longitude, latitude] = (feature.geometry as Point).coordinates;
      setSelected({ longitude, latitude, kind: "kt", props: feature.properties ?? {} });
    } else if (layerId === "parcel-point") {
      const [longitude, latitude] = (feature.geometry as Point).coordinates;
      setSelected({ longitude, latitude, kind: "parcel", props: feature.properties ?? {} });
    } else if (layerId === "parcel-fill") {
      setSelected({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        kind: "parcel",
        props: feature.properties ?? {},
      });
    } else if (layerId === "hotspot-point") {
      const [longitude, latitude] = (feature.geometry as Point).coordinates;
      setSelected({ longitude, latitude, kind: "hotspot", props: feature.properties ?? {} });
    }
  };

  const filteredParcels = useMemo(() => {
    const parcels = data?.parcels ?? [];
    const q = parcelSearch.trim().toLowerCase();
    if (!q) return parcels;
    return parcels.filter(
      (p) =>
        p.farmerName.toLowerCase().includes(q) ||
        p.farmerCode.toLowerCase().includes(q) ||
        p.parcelId.toLowerCase().includes(q)
    );
  }, [data, parcelSearch]);

  // Zoom the map to a parcel's extent and open its popup.
  const zoomToParcel = useCallback((p: ParcelFeature) => {
    setSelected({ longitude: p.centroid[0], latitude: p.centroid[1], kind: "parcel", props: parcelProps(p) });
    const map = mapRef.current;
    if (!map) return;
    const b = geomBounds(p.geometry);
    if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 80, maxZoom: 17, duration: 600 });
    else map.easeTo({ center: p.centroid, zoom: 16, duration: 600 });
  }, []);

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 101.8, latitude: 0.6, zoom: 9 }}
        mapStyle={MAP_STYLES[styleKey] as StyleSpecification}
        interactiveLayerIds={["kt-point", "parcel-point", "parcel-fill", "hotspot-point"]}
        onLoad={(e) => {
          fitAll();
          setZoom(e.target.getZoom());
        }}
        onZoomEnd={(e) => setZoom(e.viewState.zoom)}
        onClick={handleClick}
        onMouseMove={(e) => {
          e.target.getCanvas().style.cursor = measuring
            ? "crosshair"
            : e.features?.length
              ? "pointer"
              : "";
        }}
        doubleClickZoom={!measuring}
        onError={(e) => {
          // Swallow tile/source fetch failures (e.g. upstream WMS down or no CORS)
          // so they don't surface as a fatal dev overlay; log for diagnostics.
          console.warn("Map source error:", e.error?.message ?? e.error);
        }}
      >
        {/* Peta lainnya (raster overlay) — below farmer data layers.
            Rendered in reverse so the first entry in MAP_OVERLAYS ends up on top. */}
        {[...MAP_OVERLAYS].reverse().map((o) => (
          <Source
            key={o.key}
            id={`overlay-${o.key}`}
            type="raster"
            tiles={[overlayTileUrl(o.key)]}
            tileSize={256}
            attribution="SIGAP KLHK / Kementerian Kehutanan"
          >
            <Layer
              id={`overlay-${o.key}-layer`}
              type="raster"
              layout={vis(!!overlays.visible[o.key])}
              paint={{ "raster-opacity": overlays.opacity }}
            />
          </Source>
        ))}

        {/* GIS tambahan dari user ("Tambah Data GIS Lain") — di atas overlay referensi,
            di bawah data petani. WMS → raster; vektor → fill+line+circle. */}
        {customLayers.map((l) =>
          l.kind === "wms" ? (
            <Source
              key={l.id}
              id={`custom-${l.id}`}
              type="raster"
              tiles={[l.tileUrl]}
              tileSize={256}
            >
              <Layer id={`custom-${l.id}-raster`} type="raster" layout={vis(l.visible)} />
            </Source>
          ) : (
            <Source key={l.id} id={`custom-${l.id}`} type="geojson" data={l.data}>
              <Layer
                id={`custom-${l.id}-fill`}
                type="fill"
                layout={vis(l.visible)}
                paint={{ "fill-color": l.color, "fill-opacity": 0.25 }}
              />
              <Layer
                id={`custom-${l.id}-line`}
                type="line"
                layout={vis(l.visible)}
                paint={{ "line-color": l.color, "line-width": 1.5 }}
              />
              <Layer
                id={`custom-${l.id}-circle`}
                type="circle"
                layout={vis(l.visible)}
                paint={{
                  "circle-color": l.color,
                  "circle-radius": 4,
                  "circle-stroke-width": 1,
                  "circle-stroke-color": "#ffffff",
                }}
              />
            </Source>
          )
        )}

        {/* Area lahan (polygon) — bottom */}
        <Source id="parcel-area-source" type="geojson" data={parcelAreaGeojson}>
          <Layer
            id="parcel-fill"
            type="fill"
            layout={vis(layers.parcelAreas)}
            paint={{ "fill-color": "#22c55e", "fill-opacity": 0.2 }}
          />
          <Layer
            id="parcel-outline"
            type="line"
            layout={vis(layers.parcelAreas)}
            paint={{ "line-color": "#16a34a", "line-width": 1.5 }}
          />
        </Source>

        {/* Parcel farmer-name labels — only where the name fits inside the polygon */}
        <Source id="parcel-label-source" type="geojson" data={parcelLabelGeojson}>
          <Layer
            id="parcel-label"
            type="symbol"
            layout={{
              ...vis(layers.parcelAreas),
              "text-field": ["get", "farmerName"],
              "text-font": ["Open Sans Regular"],
              "text-size": PARCEL_LABEL_FONT_PX,
              "text-max-width": ["get", "maxWidthEms"],
              "text-optional": true,
            }}
            paint={{
              "text-color": labelColors.text,
              "text-halo-color": labelColors.halo,
              "text-halo-width": 1.5,
            }}
          />
        </Source>

        {/* Point lahan (centroid) */}
        <Source id="parcel-point-source" type="geojson" data={parcelPointGeojson}>
          <Layer
            id="parcel-point"
            type="circle"
            layout={vis(layers.parcelPoints)}
            paint={{
              "circle-color": "#3b82f6",
              "circle-radius": 5,
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </Source>

        {/* Point Lembaga Petani — top */}
        <Source id="kt-source" type="geojson" data={ktGeojson}>
          <Layer
            id="kt-point"
            type="circle"
            layout={vis(layers.kt)}
            paint={{
              "circle-color": "#22c55e",
              "circle-radius": 8,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
          <Layer
            id="kt-label"
            type="symbol"
            layout={{
              ...vis(layers.kt),
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Regular"],
              "text-size": 11,
              "text-anchor": "top",
              "text-offset": [0, 0.9],
              "text-max-width": 10,
              "text-optional": true,
            }}
            paint={{
              "text-color": labelColors.text,
              "text-halo-color": labelColors.halo,
              "text-halo-width": 1.5,
            }}
          />
        </Source>

        {/* Titik Api (Hotspot) — NASA FIRMS, top layer; colored by recency */}
        <Source
          id="hotspot-source"
          type="geojson"
          data={hotspotData ?? EMPTY_FC}
          attribution="Titik api: NASA FIRMS (LANCE/EOSDIS)"
        >
          <Layer
            id="hotspot-point"
            type="circle"
            layout={vis(hotspot.visible)}
            paint={{
              "circle-color": [
                "match",
                ["get", "ageBucket"],
                "recent",
                HOTSPOT_RECENT_COLOR,
                HOTSPOT_OLDER_COLOR,
              ],
              "circle-radius": 5,
              "circle-opacity": 0.85,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </Source>

        {/* Ruler measure tool — drawn on top of everything */}
        <Source id="measure-polygon-source" type="geojson" data={measurePolygonFc}>
          <Layer
            id="measure-fill"
            type="fill"
            paint={{ "fill-color": MEASURE_COLOR, "fill-opacity": 0.12 }}
          />
        </Source>
        <Source id="measure-line-source" type="geojson" data={measureLineFc}>
          <Layer
            id="measure-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": MEASURE_COLOR, "line-width": 2.5, "line-dasharray": [2, 1] }}
          />
        </Source>
        <Source id="measure-segment-source" type="geojson" data={measureSegmentFc}>
          <Layer
            id="measure-segment-label"
            type="symbol"
            layout={{
              "text-field": ["get", "label"],
              "text-font": ["Open Sans Regular"],
              "text-size": 10,
              "text-allow-overlap": true,
            }}
            paint={{ "text-color": labelColors.text, "text-halo-color": labelColors.halo, "text-halo-width": 1.5 }}
          />
        </Source>
        <Source id="measure-point-source" type="geojson" data={measurePointsFc}>
          <Layer
            id="measure-point"
            type="circle"
            paint={{
              "circle-radius": 4,
              "circle-color": MEASURE_COLOR,
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </Source>

        {selected && (
          <Popup
            key={`${selected.kind}:${selected.props.id ?? `${selected.longitude},${selected.latitude}`}`}
            longitude={selected.longitude}
            latitude={selected.latitude}
            anchor="bottom"
            offset={16}
            onClose={() => setSelected(null)}
            closeOnClick={false}
            maxWidth="none"
            className="map-parcel-popup"
          >
            {selected.kind === "hotspot" ? (
              <div className="w-[264px]">
                <PopupHeader
                  accent="red"
                  icon={<Flame className="h-4 w-4" />}
                  title="Titik Api"
                  subtitle={selected.props.ageBucket === "recent" ? "< 24 jam" : "1–5 hari"}
                />
                <AttrRows
                  className="border-t px-3.5 py-3"
                  rows={[
                    { label: "Waktu Deteksi", value: formatWib(selected.props.acqDatetime as string) },
                    { label: "Satelit", value: satelliteLabel(selected.props.satellite) },
                    { label: "Keyakinan", value: confidenceLabel(selected.props.confidence) },
                    {
                      label: "FRP",
                      value:
                        selected.props.frp == null
                          ? "—"
                          : `${Number(selected.props.frp).toFixed(1)} MW`,
                    },
                    {
                      label: "Koordinat",
                      value: `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`,
                      mono: true,
                    },
                  ]}
                />
                <p className="px-3.5 pb-3 text-[10px] leading-snug text-muted-foreground">
                  Deteksi anomali panas (VIIRS 375 m), bukan konfirmasi kebakaran. Sumber: NASA FIRMS · jeda ±3 jam.
                </p>
              </div>
            ) : selected.kind === "kt" ? (
              <div className="w-[252px]">
                <PopupHeader accent="emerald" icon={<MapPin className="h-4 w-4" />} title={String(selected.props.name ?? "—")} subtitle="Lembaga Petani" />
                <AttrRows
                  className="border-t px-3.5 py-3"
                  rows={[
                    { label: "Kode", value: selected.props.code, mono: true },
                    { label: "Distrik", value: selected.props.districtName },
                    {
                      label: "Koordinat",
                      value: `${selected.latitude.toFixed(6)}, ${selected.longitude.toFixed(6)}`,
                      mono: true,
                    },
                  ]}
                />
              </div>
            ) : (
              <ParcelPopupBody props={selected.props} />
            )}
          </Popup>
        )}
      </Map>

      {/* Top-right controls: ruler + parcel list */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        {/* Ruler / measure tool */}
        <button
          onClick={toggleMeasure}
          title="Ukur jarak & luas"
          aria-pressed={measuring}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border shadow-md backdrop-blur-sm transition-colors",
            measuring
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background/90 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Ruler className="h-4 w-4" />
        </button>

        {/* Parcel list toggle */}
        {data && data.parcels.length > 0 && (
          <button
            onClick={() => setShowParcelList((v) => !v)}
            title="Daftar lahan"
            aria-pressed={showParcelList}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md border shadow-md backdrop-blur-sm transition-colors",
              showParcelList
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/90 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        )}

        {showParcelList && data && (
          <div className="flex w-80 flex-col overflow-hidden rounded-md border bg-background/95 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <List className="h-3.5 w-3.5" />
                Daftar Lahan
                <span className="text-muted-foreground">({filteredParcels.length})</span>
              </span>
              <button
                onClick={() => setShowParcelList(false)}
                title="Tutup"
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="border-b p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={parcelSearch}
                  onChange={(e) => setParcelSearch(e.target.value)}
                  placeholder="Cari nama / ID petani / ID lahan"
                  className="h-8 w-full rounded-md border bg-background pr-2 pl-7 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {filteredParcels.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">Tidak ada lahan.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm">
                    <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="w-[1%] px-2 py-1.5 text-left whitespace-nowrap">Aksi</th>
                      <th className="px-2 py-1.5 text-left">Petani</th>
                      <th className="px-2 py-1.5 text-left">ID Lahan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParcels.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="w-[1%] px-2 py-1.5 whitespace-nowrap">
                          <button
                            onClick={() => zoomToParcel(p)}
                            title="Zoom ke lahan"
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Crosshair className="h-3.5 w-3.5" />
                          </button>
                        </td>
                        <td className="px-2 py-1.5">
                          <p className="leading-tight font-medium">{p.farmerName}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{p.farmerCode}</p>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-muted-foreground">{p.parcelId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {(measuring || measurePts.length > 0) && (
          <div className="w-48 rounded-md border bg-background/95 backdrop-blur-sm shadow-md px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Ruler className="h-3.5 w-3.5" />
                Ukur
              </span>
              {measurePts.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <button
                    onClick={removeLastMeasure}
                    title="Hapus titik terakhir"
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setMeasurePts([])}
                    title="Hapus ukuran"
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
            <dl className="mt-1.5 space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Jarak</dt>
                <dd className="font-mono text-sm font-bold tabular-nums">
                  {measurePts.length >= 2 ? formatDistance(measureMeters) : "—"}
                </dd>
              </div>
              {measurePts.length >= 3 && (
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Luas</dt>
                  <dd className="font-mono text-sm font-bold tabular-nums">{formatMeasureArea(measureAreaM2)}</dd>
                </div>
              )}
            </dl>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
              {measurePts.length === 0
                ? "Klik pada peta untuk mulai mengukur."
                : `${measurePts.length} titik · klik menambah · Esc selesai.`}
            </p>
          </div>
        )}
      </div>

      {/* Bottom-right controls: zoom-to-all + basemap switcher */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
        {data && data.parcels.length + data.kelompokTani.length > 0 && (
          <button
            onClick={() => fitAll()}
            title="Zoom ke semua data"
            aria-label="Zoom ke semua data"
            className="flex h-9 w-9 items-center justify-center rounded-md border bg-background/90 text-muted-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <Maximize className="h-4 w-4" />
          </button>
        )}
        <div className="bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-1 flex gap-1">
          {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((key) => (
            <button
              key={key}
              onClick={() => setStyleOverride(key)}
              className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${styleKey === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const ACCENTS = {
  emerald: { bar: "bg-emerald-500", tint: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  blue: { bar: "bg-blue-500", tint: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  red: { bar: "bg-red-500", tint: "bg-red-500/10", text: "text-red-600 dark:text-red-400" },
};

/** Format a FIRMS acquisition timestamp (UTC ISO) as local Jakarta time. */
function formatWib(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(d) + " WIB"
  );
}

/** VIIRS confidence codes (l/n/h) → Bahasa labels; pass through anything else. */
function confidenceLabel(v: unknown) {
  const s = String(v ?? "").toLowerCase();
  if (s === "l") return "Rendah";
  if (s === "n") return "Nominal";
  if (s === "h") return "Tinggi";
  return v == null || v === "" ? "—" : String(v);
}

/** FIRMS satellite code → readable name (VIIRS S-NPP / NOAA-20). */
function satelliteLabel(v: unknown) {
  const s = String(v ?? "").toUpperCase();
  if (s === "N") return "Suomi NPP";
  if (s === "1" || s === "NOAA-20") return "NOAA-20";
  return v == null || v === "" ? "—" : String(v);
}

type InfoRow = { label: string; value: unknown; mono?: boolean };

function PopupHeader({ accent, icon, title, subtitle }: { accent: keyof typeof ACCENTS; icon: ReactNode; title: string; subtitle: string }) {
  const c = ACCENTS[accent];
  return (
    <div className={cn("flex items-center gap-2.5 px-3.5 py-3 pr-8", c.tint)}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white", c.bar)}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight truncate">{title}</p>
        <p className={cn("text-[10px] font-semibold uppercase tracking-wider", c.text)}>{subtitle}</p>
      </div>
    </div>
  );
}

/** Parcel popup header: farmer photo placeholder + identity fields. */
function ParcelHeader({
  name,
  farmerCode,
  parcelId,
  groupName,
}: {
  name: string;
  farmerCode: string;
  parcelId: string;
  groupName: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-blue-500/10 px-3.5 py-3 pr-8">
      {/* TODO: replace placeholder with farmer photo when a photo field exists */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        <User className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold leading-tight">{name}</p>
        <div className="space-y-0.5 text-[11px] text-muted-foreground">
          <p>
            <span>ID Petani: </span>
            <span className="font-mono text-foreground/80 break-all">{farmerCode}</span>
          </p>
          <p>
            <span>ID Lahan: </span>
            <span className="font-mono text-foreground/80 break-all">{parcelId}</span>
          </p>
          <p>
            <span>Lembaga Petani: </span>
            <span className="text-foreground/80">{groupName}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Parcel popup footer: download the Farm Passport PDF for the parcel owner. */
/**
 * Parcel popup body. Owns the parcel's production summary so the "Produksi"
 * section and the "Profil Lahan" (passport) button share a single fetch:
 * whichever loads it first fills the cache, and the other reuses it.
 */
function ParcelPopupBody({ props }: { props: Record<string, unknown> }) {
  const landParcelId = String(props.id);
  const [production, setProduction] = useState<ProductionSummary | null>(null);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState(false);
  const inFlight = useRef<Promise<ProductionSummary> | null>(null);

  // Fetch production at most once per popup; concurrent/repeat calls share the promise.
  const loadProduction = useCallback(() => {
    if (production) return Promise.resolve(production);
    if (inFlight.current) return inFlight.current;
    setProdLoading(true);
    setProdError(false);
    const p = getParcelProduction(landParcelId)
      .then((res) => {
        setProduction(res);
        return res;
      })
      .catch((e) => {
        setProdError(true);
        throw e;
      })
      .finally(() => {
        setProdLoading(false);
        inFlight.current = null;
      });
    inFlight.current = p;
    return p;
  }, [landParcelId, production]);

  return (
    <div className="w-[340px]">
      <ParcelHeader
        name={String(props.farmerName ?? "—")}
        farmerCode={String(props.farmerCode ?? "—")}
        parcelId={String(props.parcelId ?? "—")}
        groupName={String(props.farmerGroupName ?? "—")}
      />
      <PopupHighlight label="Luas Lahan" value={formatArea(props.area as number | null)} />
      <div className="divide-y">
        <PopupSection icon={<Info className="h-3.5 w-3.5" />} title="Detail Lahan" defaultOpen>
          <AttrRows
            rows={[
              { label: "Tahun Tanam", value: props.plantingYear },
              { label: "Komoditas", value: props.cropType },
              { label: "Status Lahan", value: props.landStatus },
            ]}
          />
        </PopupSection>
        {props.farmerId ? <ParcelTrainingSection farmerId={String(props.farmerId)} /> : null}
        <ParcelProductionSection
          production={production}
          loading={prodLoading}
          error={prodError}
          onRequest={() => {
            void loadProduction().catch(() => {});
          }}
        />
      </div>
      <ParcelFooter landParcelId={landParcelId} production={production} onProductionLoaded={setProduction} />
    </div>
  );
}

function ParcelFooter({
  landParcelId,
  production,
  onProductionLoaded,
}: {
  landParcelId: string;
  production: ProductionSummary | null;
  onProductionLoaded: (p: ProductionSummary) => void;
}) {
  const [generating, setGenerating] = useState(false);

  const handlePrint = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      // Skip the passport's production query when the popup already loaded it.
      const res = await getParcelPassport(landParcelId, production == null);
      if (!res.success || !res.data) {
        toast.error(res.success ? "Data tidak ditemukan" : res.error);
        return;
      }
      const data = production ? { ...res.data, production } : res.data;
      if (!production) onProductionLoaded(res.data.production);
      const { generateFarmPassportPdf } = await import("@/lib/farm-passport");
      generateFarmPassportPdf(data);
    } catch {
      toast.error("Gagal membuat PDF profil lahan");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border-t px-3.5 py-2.5">
      <Button variant="outline" size="sm" className="h-8 w-full gap-2" onClick={handlePrint} disabled={generating}>
        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
        {generating ? "Menyiapkan..." : "Profil Lahan"}
      </Button>
    </div>
  );
}

function PopupHighlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-y bg-muted/40 px-3.5 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-bold tabular-nums">{value}</span>
    </div>
  );
}

function AttrRows({ rows, className }: { rows: InfoRow[]; className?: string }) {
  return (
    <dl className={cn("space-y-1.5", className)}>
      {rows.map((r) => {
        const display = r.value === null || r.value === undefined || r.value === "" ? "—" : String(r.value);
        return (
          <div key={r.label} className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-xs text-muted-foreground">{r.label}</dt>
            <dd className={cn("text-right text-xs font-medium", r.mono && "font-mono")}>{display}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Generic collapsible section inside a popup card. */
function PopupSection({
  icon,
  title,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  icon: ReactNode;
  title: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const handle = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  return (
    <Collapsible open={open} onOpenChange={handle}>
      <CollapsibleTrigger
        render={
          <button className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-muted/40">
            <span className="flex items-center gap-2 text-xs font-semibold">
              {icon}
              {title}
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        }
      />
      <CollapsibleContent>
        <div className="px-3.5 pb-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const formatShortDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_ID[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
};

/** Collapsible "Pelatihan Petani" section that lazy-loads on first expand. */
function ParcelTrainingSection({ farmerId }: { farmerId: string }) {
  const [items, setItems] = useState<FarmerTrainingItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (open && items === null && !loading) {
      setLoading(true);
      setError(false);
      getFarmerTraining(farmerId)
        .then((res) => setItems(res))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  };

  return (
    <PopupSection icon={<GraduationCap className="h-3.5 w-3.5" />} title="Pelatihan Petani" onOpenChange={handleOpenChange}>
      {loading && (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Memuat...
        </div>
      )}
      {error && <p className="py-1 text-xs text-destructive">Gagal memuat pelatihan.</p>}
      {items && (
        <ul className="space-y-1.5">
          {items.map((t) => (
            <li key={t.code} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                {t.completed ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <span className="inline-block h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
                )}
                <span className={cn(!t.completed && "text-muted-foreground")}>{t.label}</span>
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {t.date ? formatShortDate(t.date) : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PopupSection>
  );
}

const MONTHS_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const fmtKg = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

/** Collapsible "Produksi" section: lazy-loads real yield, with an Average/year selector. */
function ParcelProductionSection({
  production: data,
  loading,
  error,
  onRequest,
}: {
  production: ProductionSummary | null;
  loading: boolean;
  error: boolean;
  onRequest: () => void;
}) {
  const [view, setView] = useState("average");

  const handleOpenChange = (open: boolean) => {
    if (open) onRequest();
  };

  const selectedYear = view === "average" ? null : data?.byYear.find((y) => String(y.year) === view);
  const monthly = view === "average" ? data?.monthly : selectedYear?.monthly;

  return (
    <PopupSection icon={<BarChart3 className="h-3.5 w-3.5" />} title="Produksi" onOpenChange={handleOpenChange}>
      {loading && (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Memuat...
        </div>
      )}
      {error && <p className="py-1 text-xs text-destructive">Gagal memuat produksi.</p>}
      {data && data.recordCount === 0 && <p className="py-1 text-xs text-muted-foreground">Belum ada data produksi.</p>}
      {data && data.recordCount > 0 && monthly && (
        <div>
          <Select value={view} onValueChange={(v) => setView(v ?? "average")}>
            <SelectTrigger className="mb-2 h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="average">Rata-rata</SelectItem>
              {data.byYear.map((y) => (
                <SelectItem key={y.year} value={String(y.year)}>
                  {y.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ProductionChart monthly={monthly} />
          <p className="mt-2 text-[10px] italic text-muted-foreground">
            {view === "average" ? "Rata-rata bulanan (kg)" : `Produksi bulanan ${view} (kg)`}
            {selectedYear ? ` · Total ${fmtKg(selectedYear.total)} kg` : ""}
          </p>
        </div>
      )}
    </PopupSection>
  );
}

/** Round up to the nearest multiple of 100 for a tidy chart ceiling. */
const niceCeil = (max: number) => (max <= 0 ? 100 : Math.ceil(max / 100) * 100);

function ProductionChart({ monthly }: { monthly: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = niceCeil(Math.max(...monthly));
  const mid = top / 2;
  return (
    <div className="flex gap-1">
      <div className="min-w-0 flex-1">
        <div className="relative h-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-muted-foreground/20" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-muted-foreground/20" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-muted-foreground/25" />
          <div className="flex h-full items-end gap-[3px]">
            {monthly.map((v, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-t-sm bg-blue-500/80 transition-colors hover:bg-blue-500",
                  hover === i && "bg-blue-500"
                )}
                style={{ height: `${(v / top) * 100}%` }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </div>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap text-background"
              style={{ left: `${((hover + 0.5) / monthly.length) * 100}%` }}
            >
              {MONTHS_ID[hover]}: {fmtKg(monthly[hover])} kg
            </div>
          )}
        </div>
        <div className="mt-1 flex gap-[3px]">
          {MONTHS_SHORT.map((m, i) => (
            <span key={i} className="flex-1 text-center text-[8px] text-muted-foreground">
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className="flex h-20 w-9 flex-col justify-between text-left text-[8px] tabular-nums text-muted-foreground">
        <span>{fmtKg(top)}</span>
        <span>{fmtKg(mid)}</span>
        <span>0</span>
      </div>
    </div>
  );
}

function parcelProps(p: ParcelFeature) {
  return {
    id: p.id,
    parcelId: p.parcelId,
    farmerId: p.farmerId,
    farmerCode: p.farmerCode,
    farmerName: p.farmerName,
    farmerGroupName: p.farmerGroupName,
    area: p.area,
    plantingYear: p.plantingYear,
    cropType: p.cropType,
    landStatus: p.landStatus,
  };
}
