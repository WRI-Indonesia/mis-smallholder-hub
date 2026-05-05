"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import * as turf from "@turf/turf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, AlertCircle } from "lucide-react";
import {
  getLandParcelWithGeometry,
  type LandParcelDetail,
  type LandParcelRow,
} from "@/server/actions/land-parcel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParcelViewModalProps {
  parcel: LandParcelRow;
  onClose: () => void;
}

// ─── Detail row helper ────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-36">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

// ─── Map style config ─────────────────────────────────────────────────────────

type MapStyleKey = "light" | "dark" | "satellite";

const MAP_STYLES: Record<MapStyleKey, { label: string; url: string }> = {
  light: {
    label: "Light",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
  dark: {
    label: "Dark",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  satellite: {
    label: "Satellite",
    url: "https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL",
  },
};

// Satellite uses MapTiler public demo key — replace with project key in production.
// For seeded/demo data without a key, falls back gracefully to an empty map.

// ─── Map panel ────────────────────────────────────────────────────────────────

function ParcelMap({ detail }: { detail: LandParcelDetail }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeStyle, setActiveStyle] = useState<MapStyleKey | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default style follows app theme on first mount
  const defaultStyle: MapStyleKey =
    resolvedTheme === "dark" ? "dark" : "light";
  const currentStyle = activeStyle ?? defaultStyle;

  // Derive initial view from polygon bbox or center point
  const initialView = (() => {
    if (detail.polygonGeoJson) {
      const center = turf.center(detail.polygonGeoJson);
      const bbox = turf.bbox(detail.polygonGeoJson);
      const [lng, lat] = center.geometry.coordinates;
      const lngSpan = bbox[2] - bbox[0];
      const zoom = lngSpan < 0.005 ? 15 : lngSpan < 0.02 ? 13 : 11;
      return { longitude: lng, latitude: lat, zoom };
    }
    if (detail.centerPointGeoJson) {
      const [lng, lat] = detail.centerPointGeoJson.coordinates;
      return { longitude: lng, latitude: lat, zoom: 14 };
    }
    return { longitude: 101.44, latitude: 0.53, zoom: 7 };
  })();

  const hasGeometry = !!(detail.polygonGeoJson || detail.centerPointGeoJson);

  // Polygon stroke is white on satellite for contrast, green on light/dark
  const strokeColor = currentStyle === "satellite" ? "#ffffff" : "#16a34a";
  const fillColor = currentStyle === "satellite" ? "#ffffff" : "#22c55e";

  if (!mounted) {
    return <Skeleton className="h-full w-full rounded-none" />;
  }

  return (
    <div className="relative h-full w-full">
      <Map
        initialViewState={initialView}
        mapStyle={MAP_STYLES[currentStyle].url}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Polygon fill + outline */}
        {detail.polygonGeoJson && (
          <Source
            id="parcel-polygon"
            type="geojson"
            data={{
              type: "Feature",
              geometry: detail.polygonGeoJson,
              properties: {},
            }}
          >
            <Layer
              id="parcel-fill"
              type="fill"
              paint={{ "fill-color": fillColor, "fill-opacity": 0.25 }}
            />
            <Layer
              id="parcel-outline"
              type="line"
              paint={{ "line-color": strokeColor, "line-width": 2 }}
            />
          </Source>
        )}

        {/* Center point fallback */}
        {!detail.polygonGeoJson && detail.centerPointGeoJson && (
          <Source
            id="parcel-center"
            type="geojson"
            data={{
              type: "Feature",
              geometry: detail.centerPointGeoJson,
              properties: {},
            }}
          >
            <Layer
              id="parcel-center-circle"
              type="circle"
              paint={{
                "circle-radius": 8,
                "circle-color": "#16a34a",
                "circle-opacity": 0.8,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
        )}
      </Map>

      {/* Style switcher — top-left */}
      <div className="absolute top-2 left-2 flex gap-1 z-10">
        {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveStyle(key)}
            className={`px-2.5 py-1 rounded text-xs font-semibold shadow border transition-colors ${
              currentStyle === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/90 text-foreground border-border hover:bg-accent"
            }`}
          >
            {MAP_STYLES[key].label}
          </button>
        ))}
      </div>

      {/* No geometry notice */}
      {!hasGeometry && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/60 backdrop-blur-sm">
          <MapPin className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-medium">
            Belum ada data geometri
          </p>
          <p className="text-xs text-muted-foreground">
            Polygon akan dikelola melalui GIS Tools (Fase 6)
          </p>
        </div>
      )}

      {/* Attribution */}
      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-medium border shadow-sm pointer-events-none">
        © CartoDB / MapTiler
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function ParcelViewModal({ parcel, onClose }: ParcelViewModalProps) {
  const [detail, setDetail] = useState<LandParcelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getLandParcelWithGeometry(parcel.id).then((result) => {
      if (result.success && result.data) {
        setDetail(result.data);
      } else {
        setError(!result.success ? result.error : "Gagal memuat data.");
      }
      setLoading(false);
    });
  }, [parcel.id]);

  const formatHa = (val: number | null) =>
    val != null
      ? `${val.toLocaleString("id-ID", { maximumFractionDigits: 4 })} ha`
      : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Detail Persil Lahan
            {parcel.parcelCode && (
              <span className="font-mono text-primary text-base">
                — {parcel.parcelCode}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 p-6 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-[300px] w-full mt-4" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-destructive p-6">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto">
            {/* Two-column layout: info left, map right */}
            <div className="flex flex-col sm:flex-row min-h-0">
              {/* Info panel */}
              <div className="sm:w-[300px] shrink-0 px-6 py-4 border-b sm:border-b-0 sm:border-r">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Informasi Persil
                </p>
                <div>
                  <DetailRow label="Petani" value={detail.farmer.name} />
                  <DetailRow
                    label="Kelompok Tani"
                    value={detail.farmer.farmerGroup.name}
                  />
                  <DetailRow
                    label="Komoditas"
                    value={
                      detail.commodity ? (
                        <Badge variant="outline">{detail.commodity.name}</Badge>
                      ) : null
                    }
                  />
                  <DetailRow label="Kode Persil" value={detail.parcelCode} />
                  <DetailRow label="WRI Parcel ID" value={detail.wriParcelId} />
                  <DetailRow
                    label="Luas Polygon"
                    value={formatHa(detail.polygonSizeHa)}
                  />
                  <DetailRow
                    label="Luas Legal"
                    value={formatHa(detail.legalSizeHa)}
                  />
                  <DetailRow label="ID Legal" value={detail.legalId} />
                  <DetailRow
                    label="Status"
                    value={
                      detail.status ? (
                        <Badge variant="secondary">{detail.status}</Badge>
                      ) : null
                    }
                  />
                  <DetailRow label="Revisi" value={detail.revision} />
                </div>

                {/* Geometry status */}
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Geometri
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${detail.polygonGeoJson ? "bg-green-500" : "bg-muted-foreground/40"}`}
                      />
                      <span className="text-muted-foreground">
                        Polygon:{" "}
                        {detail.polygonGeoJson ? (
                          <span className="text-green-600 font-medium">
                            Tersedia
                          </span>
                        ) : (
                          "Belum ada"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${detail.centerPointGeoJson ? "bg-green-500" : "bg-muted-foreground/40"}`}
                      />
                      <span className="text-muted-foreground">
                        Titik Pusat:{" "}
                        {detail.centerPointGeoJson ? (
                          <span className="text-green-600 font-medium">
                            Tersedia
                          </span>
                        ) : (
                          "Belum ada"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map panel */}
              <div className="flex-1 h-[340px] sm:h-auto min-h-[300px]">
                <ParcelMap detail={detail} />
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
