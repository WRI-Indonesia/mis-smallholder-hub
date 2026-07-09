"use client";

import { useRef, useMemo, useEffect, useState, useCallback, type ReactNode } from "react";
import { useTheme } from "next-themes";
import Map, { Source, Layer, Popup, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, GraduationCap, BarChart3, Info, ChevronDown, Check, Loader2, User, Printer } from "lucide-react";
import { toast } from "sonner";
import type { FeatureCollection } from "geojson";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getFarmerTraining, getParcelPassport } from "@/server/actions/map";
import type { MapData, ParcelFeature, FarmerTrainingItem } from "@/types/map";
import type { LayerVisibility } from "./map-control-panel";
import { MAP_OVERLAYS, overlayTileUrl, type OverlayState } from "./map-overlays";

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

type SelectedFeature = {
  longitude: number;
  latitude: number;
  kind: "kt" | "parcel";
  props: Record<string, unknown>;
};

interface Props {
  data: MapData | null;
  layers: LayerVisibility;
  overlays: OverlayState;
}

export function MapCanvas({ data, layers, overlays }: Props) {
  const mapRef = useRef<MapRef>(null);
  const { resolvedTheme } = useTheme();

  const [styleKey, setStyleKey] = useState<keyof typeof MAP_STYLES>("light");
  const userPickedStyle = useRef(false);
  useEffect(() => {
    if (!userPickedStyle.current) {
      setStyleKey(resolvedTheme === "dark" ? "dark" : "light");
    }
  }, [resolvedTheme]);

  const [selected, setSelected] = useState<SelectedFeature | null>(null);

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
    setSelected(null);
    fitAll();
  }, [fitAll]);

  const vis = (on: boolean) => ({ visibility: (on ? "visible" : "none") as "visible" | "none" });

  const handleClick = (e: any) => {
    const feature = e.features?.[0];
    if (!feature) {
      setSelected(null);
      return;
    }
    const layerId = feature.layer?.id;
    if (layerId === "kt-point") {
      const [longitude, latitude] = feature.geometry.coordinates;
      setSelected({ longitude, latitude, kind: "kt", props: feature.properties ?? {} });
    } else if (layerId === "parcel-point") {
      const [longitude, latitude] = feature.geometry.coordinates;
      setSelected({ longitude, latitude, kind: "parcel", props: feature.properties ?? {} });
    } else if (layerId === "parcel-fill") {
      setSelected({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        kind: "parcel",
        props: feature.properties ?? {},
      });
    }
  };

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 101.8, latitude: 0.6, zoom: 9 }}
        mapStyle={MAP_STYLES[styleKey] as any}
        interactiveLayerIds={["kt-point", "parcel-point", "parcel-fill"]}
        onLoad={() => fitAll()}
        onClick={handleClick}
        onMouseMove={(e) => {
          e.target.getCanvas().style.cursor = e.features?.length ? "pointer" : "";
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

        {/* Point Kelompok Tani — top */}
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
        </Source>

        {selected && (
          <Popup
            longitude={selected.longitude}
            latitude={selected.latitude}
            anchor="bottom"
            offset={16}
            onClose={() => setSelected(null)}
            closeOnClick={false}
            maxWidth="none"
            className="map-parcel-popup"
          >
            {selected.kind === "kt" ? (
              <div className="w-[252px]">
                <PopupHeader accent="emerald" icon={<MapPin className="h-4 w-4" />} title={String(selected.props.name ?? "—")} subtitle="Kelompok Tani" />
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
              <div className="w-[340px]">
                <ParcelHeader
                  name={String(selected.props.farmerName ?? "—")}
                  farmerCode={String(selected.props.farmerCode ?? "—")}
                  parcelId={String(selected.props.parcelId ?? "—")}
                  groupName={String(selected.props.farmerGroupName ?? "—")}
                />
                <PopupHighlight label="Luas Lahan" value={formatArea(selected.props.area as number | null)} />
                <div className="divide-y">
                  <PopupSection icon={<Info className="h-3.5 w-3.5" />} title="Detail Lahan" defaultOpen>
                    <AttrRows
                      rows={[
                        { label: "Tahun Tanam", value: selected.props.plantingYear },
                        { label: "Komoditas", value: selected.props.cropType },
                        { label: "Status Lahan", value: selected.props.landStatus },
                      ]}
                    />
                  </PopupSection>
                  {selected.props.farmerId ? (
                    <ParcelTrainingSection farmerId={String(selected.props.farmerId)} />
                  ) : null}
                  <ParcelProductionSection />
                </div>
                <ParcelFooter landParcelId={String(selected.props.id)} />
              </div>
            )}
          </Popup>
        )}
      </Map>

      {/* Basemap switcher */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-1 flex gap-1">
        {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((key) => (
          <button
            key={key}
            onClick={() => {
              userPickedStyle.current = true;
              setStyleKey(key);
            }}
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

const ACCENTS = {
  emerald: { bar: "bg-emerald-500", tint: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  blue: { bar: "bg-blue-500", tint: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
};

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
            <span>KT: </span>
            <span className="text-foreground/80">{groupName}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Parcel popup footer: download the Farm Passport PDF for the parcel owner. */
function ParcelFooter({ landParcelId }: { landParcelId: string }) {
  const [generating, setGenerating] = useState(false);

  const handlePrint = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await getParcelPassport(landParcelId);
      if (!res.success || !res.data) {
        toast.error(res.success ? "Data tidak ditemukan" : res.error);
        return;
      }
      const { generateFarmPassportPdf } = await import("@/lib/farm-passport");
      generateFarmPassportPdf(res.data);
    } catch {
      toast.error("Gagal membuat PDF profil petani");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border-t px-3.5 py-2.5">
      <Button variant="outline" size="sm" className="h-8 w-full gap-2" onClick={handlePrint} disabled={generating}>
        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
        {generating ? "Menyiapkan..." : "Print Profil Petani"}
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

// SCAFFOLDING: dummy monthly average production (Jan–Des). Replace with a real
// server action + chart (Recharts) when production data wiring is defined.
const PRODUCTION_DUMMY = [12, 18, 22, 30, 28, 35, 40, 33, 26, 20, 15, 10];
const MONTHS_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function ParcelProductionSection() {
  return (
    <PopupSection icon={<BarChart3 className="h-3.5 w-3.5" />} title="Produksi">
      <ProductionChart />
    </PopupSection>
  );
}

function ProductionChart() {
  const max = Math.max(...PRODUCTION_DUMMY, 1);
  return (
    <div>
      <div className="flex h-20 items-end gap-[3px]">
        {PRODUCTION_DUMMY.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-blue-500/80 transition-colors hover:bg-blue-500"
            style={{ height: `${(v / max) * 100}%` }}
            title={`${MONTHS_ID[i]}: ${v} ton`}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {MONTHS_SHORT.map((m, i) => (
          <span key={i} className="flex-1 text-center text-[8px] text-muted-foreground">
            {m}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] italic text-muted-foreground">Rata-rata bulanan (ton) · data dummy (scaffolding)</p>
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
