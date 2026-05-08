"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import * as turf from "@turf/turf";
import { Skeleton } from "@/components/ui/skeleton";
import { MapLayerPanel } from "@/components/maps/map-layer-panel";
import type { MapStyleKey } from "@/lib/map-utils";
import type { MapData, MapFarmerGroup, MapLandParcel } from "@/server/actions/map";

// ─── Basemap config (reuse pola dari parcel-view-modal) ───────────────────────

const GOOGLE_SATELLITE_TILES = [
  "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
  "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
];
const GOOGLE_HYBRID_TILES = [
  "https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
];

function buildRasterStyle(tiles: string[]): StyleSpecification {
  return {
    version: 8,
    sources: {
      "raster-tiles": { type: "raster", tiles, tileSize: 256, attribution: "© Google" },
    },
    layers: [{ id: "raster-layer", type: "raster", source: "raster-tiles", minzoom: 0, maxzoom: 22 }],
  };
}

export const MAP_STYLES: Record<MapStyleKey, { label: string; style: string | StyleSpecification; isRaster: boolean }> = {
  light:     { label: "Light",     style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",    isRaster: false },
  dark:      { label: "Dark",      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json", isRaster: false },
  satellite: { label: "Satellite", style: buildRasterStyle(GOOGLE_SATELLITE_TILES), isRaster: true },
  hybrid:    { label: "Hybrid",    style: buildRasterStyle(GOOGLE_HYBRID_TILES),    isRaster: true },
};

// ─── Popup state types ────────────────────────────────────────────────────────

type GroupPopup = { type: "group"; lng: number; lat: number; data: MapFarmerGroup };
type ParcelPopup = { type: "parcel"; lng: number; lat: number; data: MapLandParcel };
type ActivePopup = GroupPopup | ParcelPopup | null;

// ─── GeoJSON builders ─────────────────────────────────────────────────────────

function buildGroupsGeoJSON(groups: MapFarmerGroup[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: groups.map((g) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [g.lng, g.lat] },
      properties: {
        id: g.id,
        name: g.name,
        code: g.code,
        farmerCount: g.farmerCount,
        districtName: g.districtName,
        provinceName: g.provinceName,
      },
    })),
  };
}

function buildParcelsGeoJSON(parcels: MapLandParcel[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: parcels.map((p) => ({
      type: "Feature",
      geometry: p.polygonGeoJSON,
      properties: {
        id: p.id,
        parcelCode: p.parcelCode,
        farmerName: p.farmerName,
        groupName: p.groupName,
        polygonSizeHa: p.polygonSizeHa,
        commodityName: p.commodityName,
      },
    })),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface InteractiveMapProps {
  data: MapData;
}

export function InteractiveMap({ data }: InteractiveMapProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeStyle, setActiveStyle] = useState<MapStyleKey | null>(null);
  const [popup, setPopup] = useState<ActivePopup>(null);
  const [layers, setLayers] = useState({ farmerGroups: true, landParcels: true });
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const mapRef = useRef<MapRef>(null);

  useEffect(() => { setMounted(true); }, []);

  const ensureGroupMarkerImage = useCallback((map: MapLibreMap) => {
    if (map.hasImage("group-marker")) return;

    const canvas = document.createElement("canvas");
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#10b981";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 3);
    ctx.bezierCurveTo(9.5, 3, 6, 6.5, 6, 11);
    ctx.bezierCurveTo(6, 16.5, 14, 25, 14, 25);
    ctx.bezierCurveTo(14, 25, 22, 16.5, 22, 11);
    ctx.bezierCurveTo(22, 6.5, 18.5, 3, 14, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(14, 11, 3.5, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    map.addImage("group-marker", ctx.getImageData(0, 0, 28, 28), { sdf: false });
  }, []);

  const defaultStyle: MapStyleKey = resolvedTheme === "dark" ? "dark" : "light";
  const currentStyle = activeStyle ?? defaultStyle;
  const isRaster = MAP_STYLES[currentStyle].isRaster;

  // GeoJSON sources — akan diupdate setelah filter state ditambahkan
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const handleDistrictChange = useCallback((district: string) => {
    setSelectedDistrict(district);
    setSelectedGroupIds(new Set());
  }, []);

  const handleGroupFilterToggle = useCallback((groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const handleGroupFilterClear = useCallback(() => {
    setSelectedGroupIds(new Set());
  }, []);

  // Apply filter:
  // 1) district filter
  // 2) group selection (empty set means "show all" within district)
  const districtGroups = selectedDistrict === "all"
    ? data.farmerGroups
    : data.farmerGroups.filter((g) => g.districtName === selectedDistrict);

  const districtGroupIds = new Set(districtGroups.map((g) => g.id));
  const districtParcels = selectedDistrict === "all"
    ? data.landParcels
    : data.landParcels.filter((p) => districtGroupIds.has(p.groupId));

  const filteredGroups = selectedGroupIds.size > 0
    ? districtGroups.filter((g) => selectedGroupIds.has(g.id))
    : districtGroups;

  const filteredParcels = selectedGroupIds.size > 0
    ? districtParcels.filter((p) => selectedGroupIds.has(p.groupId))
    : districtParcels;

  // Filtered stats — shown in panel, updates when filter changes
  const filteredStats = {
    groups: filteredGroups.length,
    farmers: filteredGroups.reduce((sum, g) => sum + g.farmerCount, 0),
    parcels: filteredParcels.length,
  };

  const groupsGeoJSON = buildGroupsGeoJSON(filteredGroups);
  const parcelsGeoJSON = buildParcelsGeoJSON(filteredParcels);

  // Layer visibility
  const groupVisibility = layers.farmerGroups ? "visible" : "none";
  const parcelVisibility = layers.landParcels ? "visible" : "none";

  // Parcel colors based on basemap
  const parcelFill   = isRaster ? "#fbbf24" : "#f59e0b";
  const parcelStroke = isRaster ? "#ffffff" : "#d97706";

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLayerToggle = useCallback((layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleZoomToLayer = useCallback(
    (layer: keyof typeof layers) => {
      const map = mapRef.current;
      if (!map) return;

      let collection: GeoJSON.FeatureCollection | null = null;

      if (layer === "farmerGroups" && filteredGroups.length > 0) {
        collection = buildGroupsGeoJSON(filteredGroups);
      } else if (layer === "landParcels" && filteredParcels.length > 0) {
        collection = buildParcelsGeoJSON(filteredParcels);
      }

      if (!collection || collection.features.length === 0) return;

      const bbox = turf.bbox(collection) as [number, number, number, number];
      map.fitBounds(bbox, { padding: 60, duration: 800, maxZoom: 16 });
    },
    [filteredGroups, filteredParcels]
  );

  const handleGroupClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as MapFarmerGroup & { id: string };
      const group = data.farmerGroups.find((g) => g.id === props.id);
      if (!group) return;
      setPopup({ type: "group", lng: group.lng, lat: group.lat, data: group });
    },
    [data.farmerGroups]
  );

  const handleParcelClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as { id: string };
      const parcel = data.landParcels.find((p) => p.id === props.id);
      if (!parcel) return;
      // Use click lngLat for parcel popup position
      setPopup({ type: "parcel", lng: e.lngLat.lng, lat: e.lngLat.lat, data: parcel });
    },
    [data.landParcels]
  );

  if (!mounted) {
    return <Skeleton className="h-full w-full rounded-none" />;
  }

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 101.5, latitude: 0.5, zoom: 8 }}
        mapStyle={MAP_STYLES[currentStyle].style}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={["groups-icon", "groups-cluster", "parcels-fill"]}
        onLoad={() => {
          const map = mapRef.current?.getMap();
          if (map) ensureGroupMarkerImage(map as unknown as MapLibreMap);
        }}
        onStyleData={() => {
          // When basemap changes, the style reload can drop runtime images; re-add if needed.
          const map = mapRef.current?.getMap();
          if (map) ensureGroupMarkerImage(map as unknown as MapLibreMap);
        }}
        onClick={(e) => {
          // Determine which layer was clicked
          const features = e.features ?? [];
          const groupFeature = features.find(
            (f) => f.layer?.id === "groups-icon" || f.layer?.id === "groups-cluster"
          );
          const parcelFeature = features.find((f) => f.layer?.id === "parcels-fill");

          if (groupFeature) {
            handleGroupClick({ ...e, features: [groupFeature] } as MapLayerMouseEvent);
          } else if (parcelFeature) {
            handleParcelClick({ ...e, features: [parcelFeature] } as MapLayerMouseEvent);
          } else {
            setPopup(null);
          }
        }}
        cursor="auto"
      >
        {/* Navigation controls */}
        <NavigationControl position="bottom-right" />

        {/* ── Land Parcels layer ─────────────────────────────────────────── */}
        <Source id="parcels" type="geojson" data={parcelsGeoJSON}>
          <Layer
            id="parcels-fill"
            type="fill"
            layout={{ visibility: parcelVisibility }}
            paint={{ "fill-color": parcelFill, "fill-opacity": 0.3 }}
          />
          <Layer
            id="parcels-outline"
            type="line"
            layout={{ visibility: parcelVisibility }}
            paint={{ "line-color": parcelStroke, "line-width": 1.5 }}
          />
        </Source>

        {/* ── Farmer Groups layer (with cluster) ────────────────────────── */}
        <Source
          id="groups"
          type="geojson"
          data={groupsGeoJSON}
          cluster={true}
          clusterMaxZoom={12}
          clusterRadius={50}
        >
          {/* Cluster circles */}
          <Layer
            id="groups-cluster"
            type="circle"
            filter={["has", "point_count"]}
            layout={{ visibility: groupVisibility }}
            paint={{
              "circle-color": [
                "step", ["get", "point_count"],
                "#10b981", 5, "#059669", 10, "#047857",
              ],
              "circle-radius": ["step", ["get", "point_count"], 18, 5, 24, 10, 30],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fff",
            }}
          />
          {/* Cluster count label */}
          <Layer
            id="groups-cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              visibility: groupVisibility,
              "text-field": "{point_count_abbreviated}",
              "text-size": 12,
              "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            }}
            paint={{ "text-color": "#fff" }}
          />
          {/* Individual markers */}
          <Layer
            id="groups-icon"
            type="symbol"
            filter={["!", ["has", "point_count"]]}
            layout={{
              visibility: groupVisibility,
              "icon-image": "group-marker",
              "icon-size": 1.1,
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "icon-anchor": "bottom",
            }}
          />
        </Source>

        {/* ── Popup ─────────────────────────────────────────────────────── */}
        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            onClose={() => setPopup(null)}
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
            maxWidth="260px"
          >
            {popup.type === "group" ? (
              <div className="p-1 space-y-1 text-sm">
                <p className="font-semibold text-foreground">{popup.data.name}</p>
                {popup.data.code && (
                  <p className="text-xs font-mono text-muted-foreground">{popup.data.code}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{popup.data.districtName}</span>
                  <span>·</span>
                  <span>{popup.data.provinceName}</span>
                </div>
                <p className="text-xs font-medium text-emerald-600">
                  {popup.data.farmerCount} petani
                </p>
              </div>
            ) : (
              <div className="p-1 space-y-1 text-sm">
                <p className="font-semibold text-foreground">
                  {popup.data.parcelCode ?? "Persil Lahan"}
                </p>
                <p className="text-xs text-muted-foreground">{popup.data.farmerName}</p>
                <p className="text-xs text-muted-foreground">{popup.data.groupName}</p>
                {popup.data.polygonSizeHa && (
                  <p className="text-xs font-medium text-amber-600">
                    {popup.data.polygonSizeHa.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ha
                  </p>
                )}
                {popup.data.commodityName && (
                  <p className="text-xs text-muted-foreground">{popup.data.commodityName}</p>
                )}
              </div>
            )}
          </Popup>
        )}
      </Map>

      {/* Layer control panel */}
      <MapLayerPanel
        stats={data.stats}
        filteredStats={filteredStats}
        selectedDistrict={selectedDistrict}
        onDistrictChange={handleDistrictChange}
        layers={layers}
        onLayerToggle={handleLayerToggle}
        onZoomToLayer={handleZoomToLayer}
        activeStyle={currentStyle}
        onStyleChange={setActiveStyle}
        allGroups={data.farmerGroups}
        selectedGroupIds={selectedGroupIds}
        onGroupFilterToggle={handleGroupFilterToggle}
        onGroupFilterClear={handleGroupFilterClear}
      />

      {/* Attribution */}
      <div className="absolute bottom-2 left-4 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] border shadow-sm pointer-events-none">
        {isRaster ? "© Google" : "© CartoDB · © OpenStreetMap"}
      </div>
    </div>
  );
}
