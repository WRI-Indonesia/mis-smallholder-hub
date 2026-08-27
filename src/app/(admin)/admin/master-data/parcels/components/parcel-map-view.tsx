"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Map, { Source, Layer, Marker, Popup } from "react-map-gl/maplibre";
import type { MapRef, MapLayerMouseEvent, LayerProps } from "react-map-gl/maplibre";
import type { Geometry, Position } from "geojson";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ExternalLink, LandPlot, Target } from "lucide-react";
import { TREE_POINT_PAINT } from "@/lib/map-style";
import { MAP_POPUP_PROPS, MapPopupHeader, MapPopupRows, useMapPopupAutoPan } from "@/components/shared/map-popup";
import { formatArea } from "@/lib/format";

interface Props {
  geometry: Geometry | null | undefined;
  /** Kelas tinggi container peta (default h-96). */
  heightClassName?: string;
  /** Geometri lahan lain (mis. milik petani yang sama) — dirender biru. */
  siblingGeometries?: (Geometry | string | null | undefined)[];
  /**
   * Lahan lain ber-atribut (#298): dirender biru + label singkat + popup saat
   * diklik (ID, luas, tahun tanam, tautan detail). Bila diberikan,
   * `siblingGeometries` diabaikan.
   */
  siblings?: { id: string; parcelId: string; area: number | null; plantingYear: number | null; geometry?: Geometry | string | null }[];
  /** Label singkat lahan ini di atas poligonnya (mis. "A"). */
  label?: string;
  /** Label singkat tiap lahan lain — dipetakan dari parcelId. */
  siblingLabel?: (parcelId: string) => string;
  /** Titik pohon sawit (#238) — dirender lingkaran kuning di atas poligon. */
  treePoints?: { longitude: number; latitude: number }[];
}

// Kumpulkan semua posisi [lng, lat] dari struktur koordinat GeoJSON apa pun
// (rekursif); posisi dengan null (hasil parse gagal) otomatis terlewati.
function collectPositions(node: unknown, into: Position[]) {
  if (!Array.isArray(node)) return;
  if (node.length >= 2 && typeof node[0] === "number" && typeof node[1] === "number") {
    into.push(node as Position);
    return;
  }
  for (const child of node) collectPositions(child, into);
}

// Geometry dari Prisma bisa objek GeoJSON atau string JSON (legacy).
function parseGeom(g: Geometry | string | null | undefined): Geometry | null {
  if (!g) return null;
  if (typeof g === "string") {
    try {
      return JSON.parse(g);
    } catch {
      return null;
    }
  }
  return g;
}

export const MAP_STYLES: Record<"hybrid" | "satellite" | "light" | "dark", StyleSpecification> = {
  hybrid: {
    version: 8,
    sources: {
      "google-hybrid": {
        type: "raster",
        tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
        tileSize: 256,
        attribution: "Map data &copy; Google",
      },
    },
    layers: [
      {
        id: "google-hybrid-layer",
        type: "raster",
        source: "google-hybrid",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
  satellite: {
    version: 8,
    sources: {
      "google-satellite": {
        type: "raster",
        tiles: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"],
        tileSize: 256,
        attribution: "Map data &copy; Google",
      },
    },
    layers: [
      {
        id: "google-satellite-layer",
        type: "raster",
        source: "google-satellite",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
  light: {
    version: 8,
    sources: {
      "carto-light": {
        type: "raster",
        // OSM standar (tanpa API key) — pengganti CARTO yang sejak 2024 menandai tile zoom tinggi "API KEY REQUIRED" (#298).
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        maxzoom: 19,
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: "carto-light-layer",
        type: "raster",
        source: "carto-light",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
  dark: {
    version: 8,
    sources: {
      "carto-dark": {
        type: "raster",
        // Esri World Dark Gray (tanpa API key); zoom >16 diperbesar dari tile 16 — tanpa tanda air (#298).
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
        maxzoom: 16,
        tileSize: 256,
        attribution:
          'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ',
      },
    },
    layers: [
      {
        id: "carto-dark-layer",
        type: "raster",
        source: "carto-dark",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
};

/** Titik pusat sederhana (rata-rata semua posisi) untuk menempatkan label. */
function centroid(g: Geometry | null): [number, number] | null {
  if (!g || !("coordinates" in g)) return null;
  const pts: Position[] = [];
  collectPositions(g.coordinates, pts);
  if (pts.length === 0) return null;
  const [sx, sy] = pts.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sx / pts.length, sy / pts.length];
}

interface SiblingSelection {
  id: string;
  parcelId: string;
  area: number | null;
  plantingYear: number | null;
  lngLat: [number, number];
}

export function ParcelMapView({
  geometry,
  heightClassName = "h-96",
  siblingGeometries,
  siblings,
  label,
  siblingLabel,
  treePoints,
}: Props) {
  const [styleKey, setStyleKey] = useState<keyof typeof MAP_STYLES>("hybrid");
  const [selected, setSelected] = useState<SiblingSelection | null>(null);

  const parsedGeometry =
    typeof geometry === "string"
      ? (() => {
          try {
            return JSON.parse(geometry);
          } catch (e) {
            console.error("Failed to parse geometry string:", e);
            return null;
          }
        })()
      : geometry;

  const siblingFeatures = siblings
    ? siblings
        .map((sb) => ({ sb, g: parseGeom(sb.geometry) }))
        .filter((x): x is { sb: NonNullable<Props["siblings"]>[number]; g: Geometry } => x.g != null)
        .map(({ sb, g }) => ({
          type: "Feature" as const,
          geometry: g,
          properties: { id: sb.id, parcelId: sb.parcelId, area: sb.area, plantingYear: sb.plantingYear },
        }))
    : (siblingGeometries ?? [])
        .map(parseGeom)
        .filter((g): g is Geometry => g != null)
        .map((g) => ({ type: "Feature" as const, geometry: g, properties: {} }));
  // Label lahan lain: [lng, lat] centroid + teks singkat.
  const siblingLabels = siblingFeatures
    .map((f) => ({ c: centroid(f.geometry), parcelId: (f.properties as { parcelId?: string }).parcelId }))
    .filter((x): x is { c: [number, number]; parcelId: string } => x.c != null && typeof x.parcelId === "string")
    .map((x) => ({ ...x, text: siblingLabel ? siblingLabel(x.parcelId) : x.parcelId }));

  const mapRef = useRef<MapRef>(null);
  // Geser peta agar popup lahan lain tidak terpotong tepi (pola parcels-distribution-map).
  useMapPopupAutoPan(mapRef, selected?.id ?? null);
  const [viewport, setViewport] = useState({
    longitude: 101.8,
    latitude: 0.6,
    zoom: 12,
  });

  // Bounding box seluruh lahan (utama + lahan lain + titik pohon) untuk fit zoom.
  const allPositions: Position[] = [];
  if (parsedGeometry && "coordinates" in parsedGeometry) {
    collectPositions(parsedGeometry.coordinates, allPositions);
  }
  for (const f of siblingFeatures) {
    if ("coordinates" in f.geometry) collectPositions(f.geometry.coordinates, allPositions);
  }
  for (const t of treePoints ?? []) {
    allPositions.push([t.longitude, t.latitude]);
  }
  let bounds: [[number, number], [number, number]] | null = null;
  if (allPositions.length > 0) {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of allPositions) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
    bounds = [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }

  function zoomToLahan() {
    if (!bounds) return;
    mapRef.current?.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
  }

  useEffect(() => {
    zoomToLahan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedGeometry]);

  // Check if geometry coordinates are valid/non-null
  const hasValidCoordinates = (() => {
    if (!parsedGeometry) return false;
    let coords = parsedGeometry.coordinates;
    if (parsedGeometry.type === "Polygon") {
      coords = parsedGeometry.coordinates[0];
    } else if (parsedGeometry.type === "MultiPolygon") {
      coords = parsedGeometry.coordinates[0][0];
    }
    if (!Array.isArray(coords) || coords.length === 0) return false;
    // Check if first coordinate is null
    const firstCoord = coords[0];
    if (Array.isArray(firstCoord) && (firstCoord[0] === null || firstCoord[1] === null)) {
      return false;
    }
    return true;
  })();

  // Tetap render peta bila ada titik pohon meski poligon lahan kosong.
  const hasTreePoints = (treePoints?.length ?? 0) > 0;

  if ((!parsedGeometry || !hasValidCoordinates) && !hasTreePoints) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted/30 border rounded-md text-muted-foreground text-sm flex-col gap-2 p-4 text-center">
        <p className="font-medium">Tidak ada data spasial (geometri) untuk lahan ini</p>
        <p className="text-xs text-muted-foreground max-w-md">
          Geometri kosong atau koordinat gagal diurai dengan benar saat bulk upload (sebelum
          perbaikan proyeksi). Silakan upload ulang shapefile.
        </p>
      </div>
    );
  }

  const layerStyle: LayerProps = {
    id: "parcel-polygon",
    type: "fill",
    paint: {
      "fill-color": "#22c55e",
      "fill-opacity": 0.4,
    },
  };

  const borderStyle: LayerProps = {
    id: "parcel-border",
    type: "line",
    paint: {
      "line-color": "#16a34a",
      "line-width": 2,
    },
  };

  const geojsonData = {
    type: "Feature" as const,
    geometry: parsedGeometry,
    properties: {},
  };

  const onMouseEnter = (event: MapLayerMouseEvent) => {
    event.target.getCanvas().style.cursor = "pointer";
  };

  const onMouseLeave = (event: MapLayerMouseEvent) => {
    event.target.getCanvas().style.cursor = "";
  };

  // Klik lahan lain (biru) → popup ringkas + tautan detail. Klik lahan ini tidak
  // memunculkan apa pun: atributnya sudah tampil di panel kanan halaman.
  const onClick = (event: MapLayerMouseEvent) => {
    const f = event.features?.find((x) => x.layer.id === "sibling-fill");
    if (!f || !siblings) {
      setSelected(null);
      return;
    }
    const p = f.properties as { id?: string; parcelId?: string; area?: number | null; plantingYear?: number | null };
    if (!p.id || !p.parcelId) return;
    setSelected({
      id: p.id,
      parcelId: p.parcelId,
      area: p.area ?? null,
      plantingYear: p.plantingYear ?? null,
      lngLat: [event.lngLat.lng, event.lngLat.lat],
    });
  };
  const mainCentroid = label ? centroid(parsedGeometry) : null;

  return (
    <div className={`relative ${heightClassName} w-full rounded-md overflow-hidden border`}>
      <Map
        ref={mapRef}
        {...viewport}
        onMove={(evt) => setViewport(evt.viewState)}
        onLoad={zoomToLahan}
        mapStyle={MAP_STYLES[styleKey]}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        // Layer polygon kini kondisional (jalur titik-pohon-saja) — jangan
        // daftarkan layer yang tidak dirender, MapLibre error tiap mousemove.
        interactiveLayerIds={[
          ...(parsedGeometry && hasValidCoordinates ? ["parcel-polygon"] : []),
          ...(siblings && siblingFeatures.length > 0 ? ["sibling-fill"] : []),
        ]}
      >
        {siblingFeatures.length > 0 && (
          <Source
            type="geojson"
            data={{ type: "FeatureCollection" as const, features: siblingFeatures }}
          >
            <Layer
              id="sibling-fill"
              type="fill"
              paint={{ "fill-color": "#0ea5e9", "fill-opacity": 0.3 }}
            />
            <Layer
              id="sibling-border"
              type="line"
              paint={{ "line-color": "#0284c7", "line-width": 1.5 }}
            />
          </Source>
        )}
        {parsedGeometry && hasValidCoordinates && (
          <Source type="geojson" data={geojsonData}>
            <Layer {...layerStyle} />
            <Layer {...borderStyle} />
          </Source>
        )}
        {/* Label singkat (#298) sebagai Marker HTML — style raster tak punya glyphs untuk symbol layer.
            pointer-events none pada WADAH marker (bukan hanya span) agar klik tembus ke poligon di bawahnya. */}
        {mainCentroid && label && (
          <Marker longitude={mainCentroid[0]} latitude={mainCentroid[1]} anchor="center" style={{ pointerEvents: "none" }}>
            <span className="pointer-events-none rounded-md border border-[#16a34a] bg-[#22c55e] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white shadow">
              {label}
            </span>
          </Marker>
        )}
        {siblingLabels.map((l) => (
          <Marker key={l.parcelId} longitude={l.c[0]} latitude={l.c[1]} anchor="center" style={{ pointerEvents: "none" }}>
            <span className="pointer-events-none rounded-md border border-[#0284c7] bg-[#0ea5e9] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white shadow">
              {l.text}
            </span>
          </Marker>
        ))}
        {selected && (
          <Popup
            key={selected.id}
            longitude={selected.lngLat[0]}
            latitude={selected.lngLat[1]}
            onClose={() => setSelected(null)}
            {...MAP_POPUP_PROPS}
          >
            <div className="w-max min-w-[260px] max-w-[380px]">
              <MapPopupHeader
                accent="blue"
                icon={<LandPlot className="h-5 w-5 text-muted-foreground" />}
                title="Lahan lain milik petani ini"
                rows={[{ label: "ID Lahan", value: selected.parcelId, mono: true }]}
              />
              <MapPopupRows
                className="px-3.5 py-2"
                rows={[
                  { label: "Luas", value: selected.area != null ? `${formatArea(selected.area)} Ha` : "—" },
                  { label: "Tahun Tanam", value: selected.plantingYear ?? "—" },
                ]}
              />
              <div className="border-t px-3.5 py-2">
                <Link
                  href={`/admin/master-data/parcels/${selected.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Buka detail lahan <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Popup>
        )}
        {hasTreePoints && (
          <Source
            type="geojson"
            data={{
              type: "FeatureCollection" as const,
              features: (treePoints ?? []).map((t) => ({
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: [t.longitude, t.latitude] },
                properties: {},
              })),
            }}
          >
            <Layer id="tree-points" type="circle" paint={TREE_POINT_PAINT} />
          </Source>
        )}
      </Map>

      {/* Zoom to Lahan Button */}
      <button
        onClick={zoomToLahan}
        className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-2 flex items-center gap-1.5 text-xs font-semibold hover:bg-muted text-foreground transition-colors"
        title="Zoom ke Lahan"
      >
        <Target className="h-3.5 w-3.5 text-primary" />
        <span>Zoom ke Lahan</span>
      </button>

      {/* Background style selector overlay */}
      <div className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-1 flex gap-1">
        {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((key) => (
          <button
            key={key}
            onClick={() => setStyleKey(key)}
            className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${
              styleKey === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
