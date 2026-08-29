"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Map, { Source, Layer, Popup, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Sprout, Info, BarChart3, Maximize } from "lucide-react";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import { cn } from "@/lib/utils";
import { formatArea } from "@/lib/format";
import { MAP_STYLES } from "@/lib/map-style";
import { ParcelPopupActions } from "@/app/(admin)/admin/master-data/parcels/components/parcel-popup-actions";
import { ParcelEditModalHost } from "@/app/(admin)/admin/master-data/parcels/components/parcel-edit-modal-host";
import { MapPopupSection, MapPopupRows, useMapPopupAutoPan } from "@/components/shared/map-popup";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BMP_PRODUCTIVITY_CLASSES, productivityViewLabel, summarizeProduction } from "@/lib/map-data";
import type {
  BmpMapData,
  BmpParcelFeature,
  BmpParcelProductivity,
  BmpProductivityView,
  ProductionAvailabilityCategory,
  ProductionSummary,
  ProductivityClass,
} from "@/types/map";
import { geomBounds, parcelLabelFit, quantizeZoom, PARCEL_LABEL_FONT_PX } from "../parcel/map-geo";
import {
  BMP_CATEGORIES,
  type BmpColorMode,
  type BmpLayerVisibility,
  type BmpProductivityVisibility,
} from "./map-bmp-control-panel";
import { MapBmpDataPanel } from "./map-bmp-data-panel";
import { encodeMapCapture, type MapCapture } from "@/lib/map-capture";

// Data-driven fill/line color by the feature's `category` property. NONE is the
// fallback so any unexpected value degrades to the neutral gray.
const CATEGORY_COLOR_EXPR: ExpressionSpecification = [
  "match",
  ["get", "category"],
  "BAIK",
  "#22c55e",
  "CUKUP",
  "#eab308",
  "KURANG",
  "#f97316",
  "#9ca3af",
];

// NONE parcels are outline-only (base): no fill. Categories with data get a
// translucent fill on top of their outline.
const CATEGORY_FILL_OPACITY_EXPR: ExpressionSpecification = [
  "match",
  ["get", "category"],
  "NONE",
  0,
  0.4,
];

const CATEGORY_META: Record<ProductionAvailabilityCategory, { color: string; short: string }> = {
  BAIK: { color: "#22c55e", short: "Baik" },
  CUKUP: { color: "#eab308", short: "Cukup" },
  KURANG: { color: "#f97316", short: "Kurang" },
  NONE: { color: "#9ca3af", short: "Tidak ada data" },
};

// Productivity mode (MAP-03): fill/line color by the parcel's productivity
// class, dibaca dari FEATURE-STATE (bukan property) — audit performa peta:
// ganti tahun/mode hanya setFeatureState + repaint, source geometri tidak
// pernah di-setData ulang. NO_DATA doubles as fallback dan outline-only.
const NO_DATA_COLOR = BMP_PRODUCTIVITY_CLASSES.find((c) => c.key === "NO_DATA")?.color ?? "#9ca3af";

/** Kelas produktivitas fitur; sebelum state ter-set (source baru dimuat) → NO_DATA. */
const PROD_STATE_CLS = [
  "coalesce",
  ["feature-state", "productivityClass"],
  "NO_DATA",
] as unknown as ExpressionSpecification;

const PRODUCTIVITY_COLOR_EXPR: ExpressionSpecification = [
  "match",
  PROD_STATE_CLS,
  ...BMP_PRODUCTIVITY_CLASSES.filter((c) => c.key !== "NO_DATA").flatMap((c) => [c.key, c.color]),
  NO_DATA_COLOR,
] as unknown as ExpressionSpecification;

const PRODUCTIVITY_META: Record<ProductivityClass, { color: string; short: string }> =
  Object.fromEntries(
    BMP_PRODUCTIVITY_CLASSES.map((c) => [c.key, { color: c.color, short: c.short }])
  ) as Record<ProductivityClass, { color: string; short: string }>;

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const formatPeriod = (p: string | null | undefined) => {
  if (!p) return "—";
  const year = p.slice(0, 4);
  const month = Number.parseInt(p.slice(5, 7), 10) - 1;
  return month >= 0 && month < 12 ? `${MONTHS_ID[month]} ${year}` : p;
};

const formatAreaHa = (n: number | null | undefined) => (n == null ? "—" : `${formatArea(n)} ha`);

type SelectedFeature = {
  longitude: number;
  latitude: number;
  props: Record<string, unknown>;
};

/** Snapshot of the rendered map for the print/PDF flow. */
export type BmpMapCapture = MapCapture;

interface Props {
  data: BmpMapData | null;
  layers: BmpLayerVisibility;
  colorMode: BmpColorMode;
  productivity: BmpProductivityView | null;
  prodLayers: BmpProductivityVisibility;
  /**
   * Lets the parent grab a snapshot of the current map (JPEG, downscaled for
   * print — see `encodeMapCapture`). The canvas registers its capture fn on
   * mount and clears it on unmount.
   */
  registerCapture?: (fn: (() => Promise<BmpMapCapture | null>) | null) => void;
  canViewParcel: boolean;
  canEditParcel: boolean;
  /** Dipanggil setelah Edit Lahan berhasil — refetch GeoJSON (data di-fetch di klien). */
  onParcelUpdated: () => void;
}

function parcelProps(
  p: BmpParcelFeature,
  prod?: BmpParcelProductivity,
  prodView?: number | "AVG",
  productionJson?: string
) {
  return {
    id: p.id,
    parcelId: p.parcelId,
    farmerCode: p.farmerCode,
    farmerName: p.farmerName,
    farmerGroupName: p.farmerGroupName,
    area: p.area,
    plantingYear: p.plantingYear,
    cropType: p.cropType,
    landStatus: p.landStatus,
    category: p.category,
    streakMonths: p.streakMonths,
    firstPeriod: p.firstPeriod,
    lastPeriod: p.lastPeriod,
    // Serialized here because MapLibre feature properties can't hold objects;
    // the popup parses it back to chart the monthly production without a fetch.
    production: productionJson ?? JSON.stringify(p.production),
    ...(prod && prodView !== undefined
      ? {
          productivityClass: prod.cls,
          productivityTonHa: prod.tonHa,
          productivityMonths: prod.monthsReported,
          productivityYears: prod.yearsReported,
          // Structured discriminator + label: the popup must not infer the
          // AVG mode from display copy.
          productivityIsAvg: prodView === "AVG",
          productivityViewLabel: productivityViewLabel(prodView),
        }
      : {}),
  };
}

export function MapBmpCanvas({ data, layers, colorMode, productivity, prodLayers, registerCapture, canViewParcel, canEditParcel, onParcelUpdated }: Props) {
  const mapRef = useRef<MapRef>(null);
  const { resolvedTheme } = useTheme();

  const [styleOverride, setStyleOverride] = useState<keyof typeof MAP_STYLES | null>(null);
  const styleKey: keyof typeof MAP_STYLES = styleOverride ?? (resolvedTheme === "dark" ? "dark" : "light");

  const [selected, setSelected] = useState<SelectedFeature | null>(null);
  const [editParcelId, setEditParcelId] = useState<string | null>(null);

  // Key memuat lngLat: klik ulang persil yang sama di titik lain harus me-remount
  // popup + memicu ulang auto-pan (review pasca-v0.21.0).
  const popupKey = selected
    ? `${selected.props.id ?? ""}:${selected.longitude},${selected.latitude}`
    : null;
  useMapPopupAutoPan(mapRef, popupKey);

  // Close any open popup when a new dataset loads (state-during-render pattern).
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setSelected(null);
  }

  // Per-parcel production JSON is stable per dataset — computed once so view
  // changes don't re-stringify hundreds of parcels. (Plain object: `Map` here
  // resolves to the react-map-gl component.)
  const productionJsonById = useMemo(() => {
    const json: Record<string, string> = {};
    for (const p of data?.parcels ?? []) json[p.id] = JSON.stringify(p.production);
    return json;
  }, [data]);

  // Lookup id→persil untuk hover/klik/refresh popup — `find` linear per fitur
  // ter-hover membebani onMouseMove di grup besar (#229). (Plain object:
  // `Map` di file ini ter-shadow komponen react-map-gl.)
  const parcelById = useMemo(
    () => Object.fromEntries((data?.parcels ?? []).map((p) => [p.id, p])),
    [data]
  );

  // Refresh (not just close) an open popup when the productivity view changes,
  // so its badge/values never contradict the polygon colors underneath.
  const [prevProductivity, setPrevProductivity] = useState(productivity);
  if (prevProductivity !== productivity) {
    setPrevProductivity(productivity);
    if (selected) {
      const p = parcelById[selected.props.id as string];
      setSelected(
        p
          ? {
              ...selected,
              props: parcelProps(
                p,
                productivity?.byParcel[p.id],
                productivity?.view,
                productionJsonById[p.id]
              ),
            }
          : null
      );
    }
  }

  // Source polygon STATIS per dataset (audit performa peta): tanpa properti
  // produktivitas per-view, sehingga ganti tahun/mode tidak men-setData ulang
  // (re-parse + re-tessellate) seluruh geometri di worker MapLibre.
  const parcelAreaGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: (data?.parcels ?? []).map((p) => ({
        type: "Feature",
        geometry: p.geometry as Polygon | MultiPolygon,
        properties: parcelProps(p, undefined, undefined, productionJsonById[p.id]),
      })),
    }),
    [data, productionJsonById]
  );

  // Dekorasi per-view: kelas produktivitas dioper via feature-state (repaint
  // saja). Diterapkan ulang saat source dibuat lagi (muat awal / ganti basemap
  // — setStyle membuang feature-state).
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !data) return;
    const apply = () => {
      if (!map.getSource("bmp-parcel-area-source")) return false;
      map.removeFeatureState({ source: "bmp-parcel-area-source" });
      for (const p of data.parcels) {
        map.setFeatureState(
          { source: "bmp-parcel-area-source", id: p.id },
          { productivityClass: productivity?.byParcel[p.id]?.cls ?? "NO_DATA" }
        );
      }
      return true;
    };
    let applied = apply();
    const onSourceData = () => {
      if (!applied) applied = apply();
    };
    const onStyleData = () => {
      // styledata juga terpancar oleh mutasi paint/filter (toggle checklist
      // legenda, ganti mode warna) — state masih utuh di sana. Reapply O(N)
      // hanya bila state benar-benar hilang (setStyle basemap): probe satu
      // fitur (#229).
      if (!map.getSource("bmp-parcel-area-source")) {
        applied = false;
        return;
      }
      const probe = data.parcels[0];
      const st = probe
        ? (map.getFeatureState({ source: "bmp-parcel-area-source", id: probe.id }) as
            | { productivityClass?: string }
            | undefined)
        : undefined;
      if (!st || st.productivityClass === undefined) applied = apply();
    };
    map.on("sourcedata", onSourceData);
    map.on("styledata", onStyleData);
    return () => {
      map.off("sourcedata", onSourceData);
      map.off("styledata", onStyleData);
    };
  }, [data, productivity]);

  // Visibility filter untuk layer LABEL (source label kecil dan tetap membawa
  // properti per-view). Layer fill/outline mode produktivitas memakai ekspresi
  // opacity feature-state di bawah — filter MapLibre tidak bisa membaca
  // feature-state.
  const categoryFilter = useMemo<FilterSpecification>(() => {
    if (colorMode === "PRODUCTIVITY") {
      const visible = BMP_PRODUCTIVITY_CLASSES.filter((c) => prodLayers[c.key]).map((c) => c.key);
      return ["in", ["get", "productivityClass"], ["literal", visible]] as unknown as FilterSpecification;
    }
    const visible = BMP_CATEGORIES.filter((c) => layers[c.key]).map((c) => c.key);
    return ["in", ["get", "category"], ["literal", visible]] as unknown as FilterSpecification;
  }, [layers, prodLayers, colorMode]);

  // Mode produktivitas: kelas tersembunyi (checklist legenda) → opacity 0;
  // NO_DATA tetap outline-only.
  const prodFillOpacityExpr = useMemo<ExpressionSpecification>(() => {
    const visible = BMP_PRODUCTIVITY_CLASSES.filter((c) => prodLayers[c.key] && c.key !== "NO_DATA").map((c) => c.key);
    return ["case", ["in", PROD_STATE_CLS, ["literal", visible]], 0.4, 0] as unknown as ExpressionSpecification;
  }, [prodLayers]);
  const prodLineOpacityExpr = useMemo<ExpressionSpecification>(() => {
    const visible = BMP_PRODUCTIVITY_CLASSES.filter((c) => prodLayers[c.key]).map((c) => c.key);
    return ["case", ["in", PROD_STATE_CLS, ["literal", visible]], 1, 0] as unknown as ExpressionSpecification;
  }, [prodLayers]);

  const isProductivity = colorMode === "PRODUCTIVITY";
  const fillColorExpr = isProductivity ? PRODUCTIVITY_COLOR_EXPR : CATEGORY_COLOR_EXPR;
  const fillOpacityExpr = isProductivity ? prodFillOpacityExpr : CATEGORY_FILL_OPACITY_EXPR;

  // Current zoom drives the "does the name fit inside the polygon" test.
  const [zoom, setZoom] = useState(9);

  // Bounds per named parcel — computed once per dataset (zoom-independent).
  const namedParcels = useMemo(
    () =>
      (data?.parcels ?? []).flatMap((p) => {
        const name = p.farmerName?.trim();
        const bounds = name ? geomBounds(p.geometry) : null;
        return name && bounds
          ? [{ id: p.id, name, bounds, centroid: p.centroid, category: p.category }]
          : [];
      }),
    [data]
  );

  // Farmer-name labels: only those whose (wrapped) name fits at the current
  // zoom. The (expensive) fit test only depends on names/bounds/zoom …
  const fittedLabels = useMemo(
    () =>
      namedParcels.flatMap((p) => {
        const fit = parcelLabelFit(p.name, p.bounds, zoom);
        return fit ? [{ ...p, maxWidthEms: fit.maxWidthEms }] : [];
      }),
    [namedParcels, zoom]
  );

  // … while the cheap per-view decoration (both mode properties, so the shared
  // visibility filter applies) re-runs on productivity changes alone.
  const parcelLabelGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: fittedLabels.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: p.centroid },
        properties: {
          farmerName: p.name,
          maxWidthEms: p.maxWidthEms,
          category: p.category,
          productivityClass: productivity?.byParcel[p.id]?.cls ?? "NO_DATA",
        },
      })),
    }),
    [fittedLabels, productivity]
  );

  // Label colors follow the basemap so they stay legible.
  const labelColors =
    styleKey === "dark"
      ? { text: "#f8fafc", halo: "#0f172a" }
      : styleKey === "hybrid"
        ? { text: "#ffffff", halo: "#000000" }
        : { text: "#1f2937", halo: "#ffffff" };

  const fitAll = useMemo(() => () => {
    const map = mapRef.current;
    if (!map || !data) return;
    const coords = data.parcels.map((p) => p.centroid);
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.easeTo({ center: coords[0], zoom: 14, duration: 600 });
      return;
    }
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80, maxZoom: 16, duration: 600 });
  }, [data]);

  useEffect(() => {
    fitAll();
  }, [fitAll]);

  // Expose a PNG snapshot of the current map to the parent (print → PDF). A
  // fresh frame is forced via triggerRepaint so the preserved buffer is current.
  useEffect(() => {
    if (!registerCapture) return;
    const capture = () =>
      new Promise<BmpMapCapture | null>((resolve) => {
        const ref = mapRef.current;
        if (!ref) {
          resolve(null);
          return;
        }
        const map = ref.getMap();
        // Peta bisa di-remove sebelum event "render" datang (navigasi saat
        // print) — timeout menjamin promise selesai agar tombol Cetak tidak
        // macet "Menyiapkan…" dan closure map-nya lepas.
        const timeout = setTimeout(() => {
          map.off("render", onRender);
          resolve(null);
        }, 3000);
        const onRender = () => {
          clearTimeout(timeout);
          try {
            resolve(encodeMapCapture(map.getCanvas()));
          } catch (err) {
            // Cross-origin basemap (e.g. Hybrid/Google) taints the canvas and
            // blocks toDataURL — fail gracefully instead of hanging.
            console.warn("Map capture failed:", err);
            resolve(null);
          }
        };
        map.once("render", onRender);
        map.triggerRepaint();
      });
    registerCapture(capture);
    return () => registerCapture(null);
  }, [registerCapture]);

  // Mode produktivitas menyembunyikan kelas via opacity (bukan filter), jadi
  // fitur transparan tetap ter-query — klik/hover harus MENEMBUS fitur
  // tersembunyi ke fitur terlihat di bawahnya (review pasca-v0.21.0).
  const firstVisibleParcel = (features: MapLayerMouseEvent["features"]) => {
    for (const f of features ?? []) {
      if (f.layer?.id !== "bmp-parcel-fill") continue;
      const id = f.properties?.id as string | undefined;
      const p = id ? parcelById[id] : undefined;
      if (!p) continue;
      const cls = productivity?.byParcel[p.id]?.cls ?? "NO_DATA";
      if (isProductivity && !prodLayers[cls]) continue;
      return p;
    }
    return undefined;
  };

  const handleClick = (e: MapLayerMouseEvent) => {
    const p = firstVisibleParcel(e.features);
    if (!p) {
      setSelected(null);
      return;
    }
    // Props popup dirakit dari state React (bukan feature.properties) karena
    // nilai produktivitas per-view tidak lagi tersimpan di source statis.
    setSelected({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      props: parcelProps(p, productivity?.byParcel[p.id], productivity?.view, productionJsonById[p.id]),
    });
  };

  // Zoom the map to a parcel's extent and open its popup (from the data panel).
  const zoomToParcel = (p: BmpParcelFeature) => {
    setSelected({
      longitude: p.centroid[0],
      latitude: p.centroid[1],
      props: parcelProps(
        p,
        productivity?.byParcel[p.id],
        productivity?.view,
        productionJsonById[p.id]
      ),
    });
    const map = mapRef.current;
    if (!map) return;
    const b = geomBounds(p.geometry);
    if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 80, maxZoom: 17, duration: 600 });
    else map.easeTo({ center: p.centroid, zoom: 16, duration: 600 });
  };

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 101.8, latitude: 0.6, zoom: 9 }}
        mapStyle={MAP_STYLES[styleKey]}
        canvasContextAttributes={{ preserveDrawingBuffer: true }}
        interactiveLayerIds={["bmp-parcel-fill"]}
        onLoad={(e) => {
          fitAll();
          setZoom(quantizeZoom(e.target.getZoom()));
        }}
        onZoomEnd={(e) => setZoom(quantizeZoom(e.viewState.zoom))}
        onClick={handleClick}
        onMouseMove={(e) => {
          e.target.getCanvas().style.cursor = firstVisibleParcel(e.features) ? "pointer" : "";
        }}
        onError={(e) => {
          console.warn("Map source error:", e.error?.message ?? e.error);
        }}
      >
        {/* Area lahan (polygon): outline as base + thematic fill per category
            (NONE = outline only, no fill). No centroid points. promoteId
            menjadikan properti id sebagai feature id untuk setFeatureState;
            mode produktivitas menyembunyikan kelas via opacity (bukan filter). */}
        <Source id="bmp-parcel-area-source" type="geojson" data={parcelAreaGeojson} promoteId="id">
          <Layer
            id="bmp-parcel-fill"
            type="fill"
            filter={isProductivity ? undefined : categoryFilter}
            paint={{ "fill-color": fillColorExpr, "fill-opacity": fillOpacityExpr }}
          />
          <Layer
            id="bmp-parcel-outline"
            type="line"
            filter={isProductivity ? undefined : categoryFilter}
            paint={{
              "line-color": fillColorExpr,
              "line-width": 1.5,
              "line-opacity": isProductivity ? prodLineOpacityExpr : 1,
            }}
          />
        </Source>

        {/* Farmer-name labels — only where the name fits inside the polygon */}
        <Source id="bmp-parcel-label-source" type="geojson" data={parcelLabelGeojson}>
          <Layer
            id="bmp-parcel-label"
            type="symbol"
            filter={categoryFilter}
            layout={{
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

        {selected && (
          <Popup
            key={popupKey}
            longitude={selected.longitude}
            latitude={selected.latitude}
            anchor="bottom"
            offset={16}
            onClose={() => setSelected(null)}
            closeOnClick={false}
            maxWidth="none"
            className="map-parcel-popup"
          >
            <BmpParcelPopupBody
              props={selected.props}
              canViewParcel={canViewParcel}
              canEditParcel={canEditParcel}
              onEdit={setEditParcelId}
            />
          </Popup>
        )}
      </Map>

      {/* Right-side floating data-availability panel (minimizable) */}
      <MapBmpDataPanel parcels={data?.parcels ?? []} onZoomTo={zoomToParcel} />

      {/* Bottom-right controls — kept off the data panel's top-right space */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
        {data && data.parcels.length > 0 && (
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

      {editParcelId && (
        <ParcelEditModalHost
          key={editParcelId}
          parcelId={editParcelId}
          onClose={() => setEditParcelId(null)}
          onSaved={onParcelUpdated}
        />
      )}
    </div>
  );
}


function CategoryBadge({ category }: { category: ProductionAvailabilityCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.short}
    </span>
  );
}

const formatTonHa = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** Class-only badge — the Ton/Ha value itself lives in the Detail Lahan rows. */
function ProductivityBadge({ cls }: { cls: ProductivityClass }) {
  const meta = PRODUCTIVITY_META[cls];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.short}
    </span>
  );
}

function BmpParcelPopupBody({
  props,
  canViewParcel,
  canEditParcel,
  onEdit,
}: {
  props: Record<string, unknown>;
  canViewParcel: boolean;
  canEditParcel: boolean;
  onEdit: (id: string) => void;
}) {
  const category = (props.category as ProductionAvailabilityCategory) ?? "NONE";
  const streak = Number(props.streakMonths ?? 0);
  const first = props.firstPeriod as string | null;
  const last = props.lastPeriod as string | null;

  // Productivity (MAP-03) props are only present when a view has been computed.
  const prodCls = (props.productivityClass as ProductivityClass | undefined) ?? null;
  const prodTonHa = typeof props.productivityTonHa === "number" ? props.productivityTonHa : null;
  const prodLabel = String(props.productivityViewLabel ?? "");
  const prodIsAvg = props.productivityIsAvg === true || props.productivityIsAvg === "true";
  const prodMonths = Number(props.productivityMonths ?? 0);
  const prodYears = Number(props.productivityYears ?? 0);

  // Chart the monthly production from the embedded per-period kg (no fetch).
  const summary = useMemo<ProductionSummary>(() => {
    let production: Record<string, number> = {};
    try {
      production = JSON.parse(String(props.production ?? "{}")) as Record<string, number>;
    } catch {
      production = {};
    }
    const records = Object.entries(production).map(([period, yieldKg]) => ({ period, yieldKg }));
    return summarizeProduction(records);
  }, [props.production]);

  return (
    <div className="w-[340px]">
      <div className="flex items-center gap-3 bg-emerald-500/10 px-3.5 py-3 pr-8">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-muted">
          <Sprout className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-semibold leading-tight">{String(props.farmerName ?? "—")}</p>
          <div className="space-y-0.5 text-[11px] text-muted-foreground">
            <p>
              <span>ID Petani: </span>
              <span className="font-mono text-foreground/80 break-all">{String(props.farmerCode ?? "—")}</span>
            </p>
            <p>
              <span>ID Lahan: </span>
              <span className="font-mono text-foreground/80 break-all">{String(props.parcelId ?? "—")}</span>
            </p>
            <p>
              <span>Lembaga Petani: </span>
              <span className="text-foreground/80">{String(props.farmerGroupName ?? "—")}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-y bg-muted/40 px-3.5 py-2">
        <span className="text-xs text-muted-foreground">Ketersediaan Data</span>
        <CategoryBadge category={category} />
      </div>
      {prodCls && (
        <div className="flex items-center justify-between border-b bg-muted/40 px-3.5 py-2">
          <span className="text-xs text-muted-foreground">Produktivitas {prodLabel && `(${prodLabel})`}</span>
          <ProductivityBadge cls={prodCls} />
        </div>
      )}

      <div className="divide-y">
        <MapPopupSection icon={<Info className="h-3.5 w-3.5" />} title="Detail Lahan" defaultOpen>
          <MapPopupRows
            rows={[
              { label: "Luas", value: formatAreaHa(props.area as number | null) },
              { label: "Tahun Tanam", value: props.plantingYear },
              { label: "Komoditas", value: props.cropType },
              { label: "Status Lahan", value: props.landStatus },
              { label: "Run Bulan Berturut", value: streak > 0 ? `${streak} bulan` : "—" },
              { label: "Periode Awal", value: formatPeriod(first) },
              { label: "Periode Akhir", value: formatPeriod(last) },
              ...(prodCls
                ? [
                    {
                      label: `Produktivitas${prodLabel ? ` (${prodLabel})` : ""}`,
                      value: prodTonHa != null ? `${formatTonHa(prodTonHa)} Ton/Ha` : "—",
                    },
                    prodIsAvg
                      ? { label: "Tahun Terdata", value: prodYears > 0 ? `${prodYears} tahun` : "—" }
                      : { label: "Bulan Terdata", value: `${prodMonths}/12` },
                  ]
                : []),
            ]}
          />
        </MapPopupSection>
        <MapPopupSection icon={<BarChart3 className="h-3.5 w-3.5" />} title="Produksi Bulanan">
          <BmpProductionSection summary={summary} />
        </MapPopupSection>
      </div>

      <p className="border-t px-3.5 py-2 text-[10px] leading-snug text-muted-foreground">
        Kategori dari run bulan berturut-turut produksi yang tertaut ke lahan.
      </p>
      {(canViewParcel || canEditParcel) && (
        <ParcelPopupActions
          parcelId={String(props.id)}
          canView={canViewParcel}
          canEdit={canEditParcel}
          onEdit={() => onEdit(String(props.id))}
        />
      )}
    </div>
  );
}

const MONTHS_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const fmtKg = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
/** Round up to the nearest 100 for a tidy chart ceiling. */
const niceCeil = (max: number) => (max <= 0 ? 100 : Math.ceil(max / 100) * 100);

/** Monthly production chart with an Average/year selector (from embedded data). */
function BmpProductionSection({ summary }: { summary: ProductionSummary }) {
  const [view, setView] = useState("average");
  if (summary.recordCount === 0) {
    return <p className="py-1 text-xs text-muted-foreground">Belum ada data produksi.</p>;
  }
  const selectedYear = view === "average" ? null : summary.byYear.find((y) => String(y.year) === view);
  const monthly = view === "average" ? summary.monthly : selectedYear?.monthly;
  if (!monthly) return null;
  return (
    <div>
      <Select value={view} onValueChange={(v) => setView(v ?? "average")}>
        <SelectTrigger className="mb-2 h-7 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="average">Rata-rata</SelectItem>
          {summary.byYear.map((y) => (
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
  );
}

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
                  "flex-1 rounded-t-sm bg-emerald-500/80 transition-colors hover:bg-emerald-500",
                  hover === i && "bg-emerald-500"
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
