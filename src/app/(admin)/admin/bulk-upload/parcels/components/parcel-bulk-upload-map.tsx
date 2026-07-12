"use client";

import { useEffect, useState } from "react";
import Map, { Source, Layer, Popup } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent, LayerProps } from "react-map-gl/maplibre";
import type { Feature, Polygon, MultiPolygon, Position } from "geojson";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Target } from "lucide-react";

interface ParcelPreviewRow {
  geometry?: { type?: string; coordinates?: unknown } | null;
  parcelId?: string;
  _isValid?: boolean;
  _farmerName?: string;
  _errors?: string[];
}

interface Props {
  data: ParcelPreviewRow[];
}

const MAP_STYLES: Record<"hybrid" | "satellite" | "light" | "dark", StyleSpecification> = {
  hybrid: {
    version: 8,
    sources: {
      "google-hybrid": {
        type: "raster",
        tiles: [
          "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        ],
        tileSize: 256,
        attribution: "Map data &copy; Google"
      }
    },
    layers: [
      {
        id: "google-hybrid-layer",
        type: "raster",
        source: "google-hybrid",
        minzoom: 0,
        maxzoom: 20
      }
    ]
  },
  satellite: {
    version: 8,
    sources: {
      "google-satellite": {
        type: "raster",
        tiles: [
          "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        ],
        tileSize: 256,
        attribution: "Map data &copy; Google"
      }
    },
    layers: [
      {
        id: "google-satellite-layer",
        type: "raster",
        source: "google-satellite",
        minzoom: 0,
        maxzoom: 20
      }
    ]
  },
  light: {
    version: 8,
    sources: {
      "carto-light": {
        type: "raster",
        tiles: [
          "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>"
      }
    },
    layers: [
      {
        id: "carto-light-layer",
        type: "raster",
        source: "carto-light",
        minzoom: 0,
        maxzoom: 20
      }
    ]
  },
  dark: {
    version: 8,
    sources: {
      "carto-dark": {
        type: "raster",
        tiles: [
          "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>"
      }
    },
    layers: [
      {
        id: "carto-dark-layer",
        type: "raster",
        source: "carto-dark",
        minzoom: 0,
        maxzoom: 20
      }
    ]
  }
};

export function ParcelBulkUploadMap({ data }: Props) {
  const [styleKey, setStyleKey] = useState<keyof typeof MAP_STYLES>("hybrid");
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
    parcelId: string;
    farmerName: string;
    isValid: boolean;
    errors: string;
  } | null>(null);

  const [viewport, setViewport] = useState({
    longitude: 101.8,
    latitude: 0.6,
    zoom: 11,
  });

  // Calculate center of all valid geometry coordinates in data
  function zoomToFitAll() {
    let sumLng = 0;
    let sumLat = 0;
    let count = 0;

    data.forEach((row) => {
      if (!row.geometry) return;
      
      let parsed = row.geometry;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return;
        }
      }

      const geom = parsed as Polygon | MultiPolygon;
      let coords: Position[] | Position[][] | Position[][][] = geom.coordinates;
      if (geom.type === "Polygon") {
        coords = geom.coordinates[0];
      } else if (geom.type === "MultiPolygon") {
        coords = geom.coordinates[0][0];
      }

      if (Array.isArray(coords)) {
        (coords as Position[]).forEach((c: Position) => {
          if (Array.isArray(c) && c.length >= 2 && c[0] !== null && c[1] !== null) {
            sumLng += c[0];
            sumLat += c[1];
            count++;
          }
        });
      }
    });

    if (count > 0) {
      setViewport({
        longitude: sumLng / count,
        latitude: sumLat / count,
        zoom: 11,
      });
    }
  }

  useEffect(() => {
    zoomToFitAll();
    setPopupInfo(null);
  }, [data]);

  // Construct GeoJSON FeatureCollection from data list
  const featureCollection = (() => {
    const features: Feature[] = [];
    data.forEach((row) => {
      if (!row.geometry) return;
      let parsed = row.geometry;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return;
        }
      }

      // Check if coordinate is null
      const geom = parsed as Polygon | MultiPolygon;
      let coords: Position[] | Position[][] | Position[][][] = geom.coordinates;
      if (geom.type === "Polygon") {
        coords = geom.coordinates[0];
      } else if (geom.type === "MultiPolygon") {
        coords = geom.coordinates[0][0];
      }
      if (!Array.isArray(coords) || coords.length === 0) return;
      const firstCoord = coords[0];
      if (Array.isArray(firstCoord) && (firstCoord[0] === null || firstCoord[1] === null)) {
        return; // skip null coords
      }

      features.push({
        type: "Feature",
        geometry: geom,
        properties: {
          isValid: !!row._isValid,
          parcelId: row.parcelId || "—",
          farmerName: row._farmerName || "—",
          errors: Array.isArray(row._errors) ? row._errors.join("; ") : ""
        }
      });
    });

    return {
      type: "FeatureCollection" as const,
      features
    };
  })();

  const hasFeatures = featureCollection.features.length > 0;

  if (!hasFeatures) {
    return null;
  }

  // Dynamic layers to style depending on row validation status (isValid)
  const layerStyle: LayerProps = {
    id: "bulk-parcels-fill",
    type: "fill",
    paint: {
      "fill-color": ["case", ["get", "isValid"], "#22c55e", "#ef4444"],
      "fill-opacity": 0.4
    }
  };

  const borderStyle: LayerProps = {
    id: "bulk-parcels-border",
    type: "line",
    paint: {
      "line-color": ["case", ["get", "isValid"], "#16a34a", "#dc2626"],
      "line-width": 2
    }
  };

  const onMapClick = (event: MapLayerMouseEvent) => {
    const features = event.features;
    if (features && features.length > 0) {
      const feat = features[0];
      const props = feat.properties;
      setPopupInfo({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        parcelId: props.parcelId,
        farmerName: props.farmerName,
        isValid: props.isValid === "true" || props.isValid === true,
        errors: props.errors || ""
      });
    }
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
        onClick={onMapClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        interactiveLayerIds={["bulk-parcels-fill"]}
      >
        <Source type="geojson" data={featureCollection}>
          <Layer {...layerStyle} />
          <Layer {...borderStyle} />
        </Source>

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            className="z-20 text-xs"
          >
            <div className="p-2 space-y-1.5 min-w-[150px]">
              <div className="flex items-center justify-between border-b pb-1">
                <span className="font-semibold text-foreground">Detail Lahan</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  popupInfo.isValid ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}>
                  {popupInfo.isValid ? "Valid" : "Error"}
                </span>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">ID:</strong> {popupInfo.parcelId}</p>
                <p><strong className="text-foreground">Petani:</strong> {popupInfo.farmerName}</p>
                {popupInfo.errors && (
                  <p className="text-destructive font-medium border-t pt-1 mt-1 text-[11px] max-w-[200px] leading-tight">
                    <strong className="text-foreground block mb-0.5 text-xs">Error Detail:</strong>
                    {popupInfo.errors}
                  </p>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Fit Bounds / Re-center Button */}
      <button
        onClick={zoomToFitAll}
        className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-2 flex items-center gap-1.5 text-xs font-semibold hover:bg-muted text-foreground transition-colors"
        title="Fokus ke Semua Lahan"
      >
        <Target className="h-3.5 w-3.5 text-primary" />
        <span>Fokus Semua</span>
      </button>

      {/* Map style selector overlay */}
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
