"use client";

import { useEffect, useState } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent, LayerProps } from "react-map-gl/maplibre";
import type { Geometry, Position } from "geojson";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Target } from "lucide-react";

interface Props {
  geometry: Geometry | null | undefined;
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
        tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
        tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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

export function ParcelMapView({ geometry }: Props) {
  const [styleKey, setStyleKey] = useState<keyof typeof MAP_STYLES>("hybrid");

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

  const [viewport, setViewport] = useState({
    longitude: 101.8,
    latitude: 0.6,
    zoom: 12,
  });

  function zoomToLahan() {
    if (!parsedGeometry) return;

    let coords = parsedGeometry.coordinates;
    if (parsedGeometry.type === "Polygon") {
      coords = parsedGeometry.coordinates[0];
    } else if (parsedGeometry.type === "MultiPolygon") {
      coords = parsedGeometry.coordinates[0][0];
    }

    if (Array.isArray(coords)) {
      let sumLng = 0;
      let sumLat = 0;
      let count = 0;
      coords.forEach((c: Position) => {
        // Filter out null coordinates from failed reprojections/parses
        if (Array.isArray(c) && c.length >= 2 && c[0] !== null && c[1] !== null) {
          sumLng += c[0];
          sumLat += c[1];
          count++;
        }
      });
      if (count > 0) {
        setViewport({
          longitude: sumLng / count,
          latitude: sumLat / count,
          zoom: 14,
        });
      }
    }
  }

  useEffect(() => {
    zoomToLahan();
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

  if (!parsedGeometry || !hasValidCoordinates) {
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

  return (
    <div className="relative h-96 w-full rounded-md overflow-hidden border">
      <Map
        {...viewport}
        onMove={(evt) => setViewport(evt.viewState)}
        mapStyle={MAP_STYLES[styleKey]}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        interactiveLayerIds={["parcel-polygon"]}
      >
        <Source type="geojson" data={geojsonData}>
          <Layer {...layerStyle} />
          <Layer {...borderStyle} />
        </Source>
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
