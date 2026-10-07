"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import type { MultiPolygon, Polygon, Position } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { Target } from "lucide-react";
import { MAP_STYLE_KEYS, MAP_STYLE_LABELS, type MapStyleKey } from "@/lib/map-style";
import { useVectorBasemap } from "@/hooks/use-vector-basemap";

/** Warna tetap — dipakai juga di legenda halaman. */
export const FINDING_COLORS = { parcel: "#2563eb", boundary: "#f59e0b" } as const;

type Poly = Polygon | MultiPolygon;

function positions(g: Poly): Position[] {
  return g.type === "Polygon" ? g.coordinates.flat() : g.coordinates.flat(2);
}

/** Pusat bbox — titik penanda lahan yang tetap terlihat saat peta di-zoom jauh (lahan 20 km dari boundary). */
function centerOf(b: [[number, number], [number, number]]): [number, number] {
  return [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2];
}

function boundsOf(geoms: Poly[]): [[number, number], [number, number]] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const g of geoms) {
    for (const [x, y] of positions(g)) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return [[minX, minY], [maxX, maxY]];
}

/**
 * Peta preview satu lahan temuan (#317 tab Luar Boundary & Selisih Luas): poligon lahan
 * biru, dan bila diberikan, garis boundary ICS Lembaganya (oranye putus-putus, tanpa isi —
 * boundary bisa jauh lebih luas dari lahan). "Zoom ke Lahan" = lahan saja; "Lahan +
 * boundary" = keduanya, untuk melihat seberapa jauh lahan dari boundary.
 * Basemap & pemilih gaya sama dengan `overlap-preview-map.tsx`.
 */
export function ParcelFindingMap({
  parcel,
  boundary,
  heightClassName = "h-[420px]",
}: {
  parcel: Poly;
  boundary: Poly | null;
  heightClassName?: string;
}) {
  const [styleKey, setStyleKey] = useState<MapStyleKey>("hybrid");
  const { mapStyle, labelBeforeId, syncStyle, registerImageFallback } = useVectorBasemap(styleKey);
  const mapRef = useRef<MapRef>(null);
  const parcelBounds = useMemo(() => boundsOf([parcel]), [parcel]);
  const center = useMemo(() => centerOf(parcelBounds), [parcelBounds]);
  const bothBounds = useMemo(() => (boundary ? boundsOf([parcel, boundary]) : parcelBounds), [parcel, boundary, parcelBounds]);

  const fit = (b: [[number, number], [number, number]]) => mapRef.current?.fitBounds(b, { padding: 48, maxZoom: 18, duration: 500 });
  useEffect(() => {
    fit(parcelBounds);
  }, [parcelBounds]);

  return (
    <div className={`relative ${heightClassName} w-full overflow-hidden rounded-md border`}>
      <Map
        ref={mapRef}
        initialViewState={{ bounds: parcelBounds, fitBoundsOptions: { padding: 48, maxZoom: 18 } }}
        onLoad={(e) => {
          registerImageFallback(e.target);
          syncStyle(e.target);
        }}
        onStyleData={(e) => syncStyle(e.target)}
        mapStyle={mapStyle}
      >
        {boundary && (
          <Source id="finding-boundary" type="geojson" data={{ type: "Feature", geometry: boundary, properties: {} }}>
            <Layer
              id="finding-boundary-line"
              type="line"
              beforeId={labelBeforeId}
              paint={{ "line-color": FINDING_COLORS.boundary, "line-width": 2.5, "line-dasharray": [2, 1.5] }}
            />
          </Source>
        )}
        <Source id="finding-parcel" type="geojson" data={{ type: "Feature", geometry: parcel, properties: {} }}>
          <Layer id="finding-parcel-fill" type="fill" beforeId={labelBeforeId} paint={{ "fill-color": FINDING_COLORS.parcel, "fill-opacity": 0.3 }} />
          <Layer id="finding-parcel-line" type="line" beforeId={labelBeforeId} paint={{ "line-color": FINDING_COLORS.parcel, "line-width": 2.5 }} />
        </Source>
        {/* Titik pusat: poligon 0,5 ha tak terlihat saat "Lahan + boundary" mencakup puluhan km. */}
        <Source id="finding-parcel-point" type="geojson" data={{ type: "Feature", geometry: { type: "Point", coordinates: center }, properties: {} }}>
          <Layer
            id="finding-parcel-point"
            type="circle"
            maxzoom={14}
            paint={{ "circle-radius": 6, "circle-color": FINDING_COLORS.parcel, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 }}
          />
        </Source>
      </Map>

      <div className="absolute left-3 top-3 z-10 flex gap-1">
        <button
          onClick={() => fit(parcelBounds)}
          className="flex items-center gap-1.5 rounded-md border bg-background/90 p-2 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted"
          title="Zoom ke lahan"
        >
          <Target className="h-3.5 w-3.5 text-primary" />
          <span>Zoom ke Lahan</span>
        </button>
        {boundary && (
          <button
            onClick={() => fit(bothBounds)}
            className="rounded-md border bg-background/90 p-2 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted"
            title="Tampilkan lahan dan boundary ICS Lembaganya"
          >
            Lahan + boundary
          </button>
        )}
      </div>

      <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-md border bg-background/90 p-1 shadow-md backdrop-blur-sm">
        {MAP_STYLE_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setStyleKey(key)}
            title={MAP_STYLE_LABELS[key].full}
            className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              styleKey === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {MAP_STYLE_LABELS[key].short}
          </button>
        ))}
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-3 rounded-md border bg-background/90 px-2.5 py-1.5 text-[11px] shadow-md backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: FINDING_COLORS.parcel }} />
          Lahan
        </span>
        {boundary && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: FINDING_COLORS.boundary }} />
            Boundary ICS Lembaga
          </span>
        )}
      </div>
    </div>
  );
}
