"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import type { MultiPolygon, Polygon, Position } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { Target } from "lucide-react";
import { MAP_STYLE_KEYS, MAP_STYLE_LABELS, type MapStyleKey } from "@/lib/map-style";
import { useVectorBasemap } from "@/hooks/use-vector-basemap";

/** Warna tetap — dipakai juga di legenda & kartu ringkasan halaman. */
export const OVERLAP_COLORS = { a: "#2563eb", b: "#f97316", intersection: "#dc2626" } as const;

type Poly = Polygon | MultiPolygon;

interface Props {
  a: Poly;
  b: Poly;
  intersection: Poly | null;
  heightClassName?: string;
}

function positions(g: Poly): Position[] {
  return g.type === "Polygon" ? g.coordinates.flat() : g.coordinates.flat(2);
}

/** Pusat sederhana (rata-rata vertex ring luar) untuk label A/B. */
function centroid(g: Poly): [number, number] {
  const ring = g.type === "Polygon" ? g.coordinates[0] : g.coordinates[0][0];
  const [sx, sy] = ring.reduce(([x, y], p) => [x + p[0], y + p[1]], [0, 0]);
  return [sx / ring.length, sy / ring.length];
}

/**
 * Peta preview satu pasangan tumpang tindih (#317): lahan A biru, lahan B
 * oranye, irisan merah — di-zoom ke gabungan kedua lahan setiap pasangan berganti.
 * Basemap & pemilih gaya sama dengan peta Detail Lahan (`parcel-map-view.tsx`).
 */
export function OverlapPreviewMap({ a, b, intersection, heightClassName = "h-[420px]" }: Props) {
  const [styleKey, setStyleKey] = useState<MapStyleKey>("hybrid");
  const { mapStyle, labelBeforeId, syncStyle, registerImageFallback } = useVectorBasemap(styleKey);
  const mapRef = useRef<MapRef>(null);

  const bounds = useMemo((): [[number, number], [number, number]] => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of [...positions(a), ...positions(b)]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return [[minX, minY], [maxX, maxY]];
  }, [a, b]);
  const labels = useMemo(() => ({ a: centroid(a), b: centroid(b) }), [a, b]);

  const zoomToPair = () => mapRef.current?.fitBounds(bounds, { padding: 48, maxZoom: 18, duration: 500 });
  useEffect(() => {
    zoomToPair();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds]);

  return (
    <div className={`relative ${heightClassName} w-full overflow-hidden rounded-md border`}>
      <Map
        ref={mapRef}
        initialViewState={{ bounds, fitBoundsOptions: { padding: 48, maxZoom: 18 } }}
        onLoad={(e) => {
          registerImageFallback(e.target);
          syncStyle(e.target);
        }}
        onStyleData={(e) => syncStyle(e.target)}
        mapStyle={mapStyle}
      >
        <Source id="overlap-a" type="geojson" data={{ type: "Feature", geometry: a, properties: {} }}>
          <Layer id="overlap-a-fill" type="fill" beforeId={labelBeforeId} paint={{ "fill-color": OVERLAP_COLORS.a, "fill-opacity": 0.25 }} />
          <Layer id="overlap-a-line" type="line" beforeId={labelBeforeId} paint={{ "line-color": OVERLAP_COLORS.a, "line-width": 2.5 }} />
        </Source>
        <Source id="overlap-b" type="geojson" data={{ type: "Feature", geometry: b, properties: {} }}>
          <Layer id="overlap-b-fill" type="fill" beforeId={labelBeforeId} paint={{ "fill-color": OVERLAP_COLORS.b, "fill-opacity": 0.25 }} />
          {/* Putus-putus: saat A dan B nyaris identik, garis B tetap terlihat di atas A. */}
          <Layer
            id="overlap-b-line"
            type="line"
            beforeId={labelBeforeId}
            paint={{ "line-color": OVERLAP_COLORS.b, "line-width": 2.5, "line-dasharray": [2, 1.5] }}
          />
        </Source>
        {intersection && (
          <Source id="overlap-i" type="geojson" data={{ type: "Feature", geometry: intersection, properties: {} }}>
            <Layer
              id="overlap-i-fill"
              type="fill"
              beforeId={labelBeforeId}
              paint={{ "fill-color": OVERLAP_COLORS.intersection, "fill-opacity": 0.5 }}
            />
            <Layer
              id="overlap-i-line"
              type="line"
              beforeId={labelBeforeId}
              paint={{ "line-color": OVERLAP_COLORS.intersection, "line-width": 2 }}
            />
          </Source>
        )}
        {(["a", "b"] as const).map((k) => (
          // Digeser berlawanan: pada pasangan Duplikat pusat A dan B nyaris sama, label tak boleh saling tutup.
          <Marker
            key={k}
            longitude={labels[k][0]}
            latitude={labels[k][1]}
            anchor="center"
            offset={k === "a" ? [-12, 0] : [12, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold text-white shadow"
              style={{ backgroundColor: OVERLAP_COLORS[k] }}
            >
              {k.toUpperCase()}
            </span>
          </Marker>
        ))}
      </Map>

      <button
        onClick={zoomToPair}
        className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-md border bg-background/90 p-2 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted"
        title="Zoom ke pasangan lahan"
      >
        <Target className="h-3.5 w-3.5 text-primary" />
        <span>Zoom ke Lahan</span>
      </button>

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
        {[
          { c: OVERLAP_COLORS.a, t: "Lahan A" },
          { c: OVERLAP_COLORS.b, t: "Lahan B" },
          { c: OVERLAP_COLORS.intersection, t: "Irisan" },
        ].map((l) => (
          <span key={l.t} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.c }} />
            {l.t}
          </span>
        ))}
      </div>
    </div>
  );
}
