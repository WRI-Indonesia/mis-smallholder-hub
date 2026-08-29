"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import Map, { Source, Layer, Popup, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Flame, Maximize } from "lucide-react";
import type { FeatureCollection } from "geojson";
import {
  HOTSPOT_CONF_COLORS,
  HOTSPOT_CONF_LABELS,
  RIAU_BBOX,
  confidenceLabel,
  formatWib,
  satelliteLabel,
  type HotspotConfBucket,
} from "@/app/(admin)/admin/map/parcel/map-hotspot";
import { combinedBbox, multiPolygonBbox, type FireBoundaryIndexed } from "@/lib/fire-alert";
import { encodeMapCapture, type MapCapture } from "@/lib/map-capture";
// Basemap sama dengan Peta Lahan/BMP. Hybrid (Google) men-taint canvas —
// capture cetak akan gagal di sana; pengguna diarahkan ke Light/Dark.
import { MAP_STYLES } from "@/lib/map-style";
import type { AdminBoundaryLine } from "@/server/actions/fire-boundary";

// Antique Violet — pilihan owner (2026-08-19); kontras terhadap titik api
// (merah/oranye/kuning), garis abu batas administrasi, dan basemap Light/Dark.
export const BOUNDARY_COLOR = "#660099";

// Warna titik = confidence (sama dengan Peta Lahan); dalam vs luar boundary
// dibedakan BENTUK (ikon api vs lingkaran), bukan warna, agar legenda
// confidence tetap satu sumber kebenaran.
const HOTSPOT_COLOR_EXPR: ExpressionSpecification = [
  "match",
  ["get", "confBucket"],
  "high",
  HOTSPOT_CONF_COLORS.high,
  "low",
  HOTSPOT_CONF_COLORS.low,
  HOTSPOT_CONF_COLORS.nominal,
];
const IN_FILTER: ExpressionSpecification = ["==", ["get", "inBoundary"], "in"];
const OUT_FILTER: ExpressionSpecification = ["!=", ["get", "inBoundary"], "in"];

// Siluet api (path lucide "Flame", viewBox 24) di-render ke canvas per warna
// confidence — MapLibre tidak bisa mewarnai PNG biasa secara dinamis, jadi
// satu image per bucket, dirujuk via ["concat","flame-",confBucket].
const FLAME_PATH_D =
  "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";

function flameImageData(color: string): ImageData | null {
  const size = 56; // 28 CSS px × pixelRatio 2
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(2, 2);
  ctx.translate(2, 2); // ruang untuk halo putih di tepi viewBox
  const path = new Path2D(FLAME_PATH_D);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke(path);
  ctx.fillStyle = color;
  ctx.fill(path);
  return ctx.getImageData(0, 0, size, size);
}

export type FireMapCapture = MapCapture;

/**
 * Snapshot peta; `bbox` (WSEN) opsional untuk auto-zoom scope cetak dulu.
 * `focusGroupId` = mode fokus capture per-lembaga (PDF): lembaga subjek
 * ditonjolkan, boundary lain dipudarkan + labelnya disembunyikan.
 */
export type FireMapCaptureFn = (
  bbox: [number, number, number, number] | null,
  focusGroupId?: string | null
) => Promise<FireMapCapture | null>;

type SelectedHotspot = {
  longitude: number;
  latitude: number;
  props: Record<string, unknown>;
};

/** Zoom peta ke sebuah bbox [w,s,e,n] — dipakai klik baris tabel panel. */
export type FireMapZoomFn = (bbox: [number, number, number, number]) => void;

interface Props {
  boundaries: FireBoundaryIndexed[];
  /** Garis batas kabupaten (BIG) — konteks statis di bawah layer lembaga. */
  adminBoundaries: AdminBoundaryLine[];
  /** Titik api ter-klasifikasi (properti inBoundary/groupIds/groupName/confBucket). */
  hotspots: FeatureCollection | null;
  /** Jumlah titik dalam boundary per lembaga — untuk popup boundary. */
  countsByGroup: Record<string, number>;
  registerCapture?: (fn: FireMapCaptureFn | null) => void;
  registerZoomTo?: (fn: FireMapZoomFn | null) => void;
  /** Lembaga terpilih (klik baris tabel / klik poligon) — di-highlight. */
  selectedGroupId: string | null;
  onSelectGroup?: (farmerGroupId: string | null) => void;
}

export function FireMapCanvas({
  boundaries,
  adminBoundaries,
  hotspots,
  countsByGroup,
  registerCapture,
  registerZoomTo,
  selectedGroupId,
  onSelectGroup,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const { resolvedTheme } = useTheme();

  const [styleOverride, setStyleOverride] = useState<keyof typeof MAP_STYLES | null>(null);
  const styleKey: keyof typeof MAP_STYLES = styleOverride ?? (resolvedTheme === "dark" ? "dark" : "light");

  const [selected, setSelected] = useState<SelectedHotspot | null>(null);
  // Fokus capture per-lembaga (hanya selama cetak PDF) — menimpa gaya seleksi.
  const [focusGroupId, setFocusGroupId] = useState<string | null>(null);

  const boundaryGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: boundaries.map((b) => ({
        type: "Feature",
        geometry: b.geometry,
        properties: {
          farmerGroupId: b.farmerGroupId,
          name: b.name,
          districtName: b.districtName,
        },
      })),
    }),
    [boundaries]
  );

  // Batas administrasi kabupaten: garis putus-putus abu + label nama, selalu
  // tampil sebagai konteks di bawah layer lembaga (keputusan owner).
  const adminGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: adminBoundaries.map((b) => ({
        type: "Feature",
        geometry: b.geometry,
        properties: { name: b.name },
      })),
    }),
    [adminBoundaries]
  );

  const adminLabelGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: adminBoundaries.map((b) => {
        const box = multiPolygonBbox(b.geometry);
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] },
          properties: { name: b.name.toUpperCase() },
        };
      }),
    }),
    [adminBoundaries]
  );

  // Label nama lembaga di tengah bbox boundary — cukup akurat untuk poligon ICS.
  const boundaryLabelGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: boundaries.map((b) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [(b.bbox[0] + b.bbox[2]) / 2, (b.bbox[1] + b.bbox[3]) / 2],
        },
        properties: { name: b.name, farmerGroupId: b.farmerGroupId },
      })),
    }),
    [boundaries]
  );

  const labelColors =
    styleKey === "dark"
      ? { text: "#d8b4fe", halo: "#0f172a" }
      : styleKey === "hybrid"
        ? { text: "#ffffff", halo: "#000000" }
        : { text: BOUNDARY_COLOR, halo: "#ffffff" };

  const fitAll = useMemo(
    () => () => {
      const map = mapRef.current;
      if (!map) return;
      // Tampilan awal (dan tombol ⛶) = SATU Provinsi Riau — gabungan bbox 12
      // poligon kabupaten BIG, bukan klaster boundary lembaga (keputusan owner
      // 2026-08-19); bukan RIAU_BBOX mentah karena bbox persegi itu ikut memuat
      // wilayah tetangga. Fallback berjenjang bila batas belum ter-seed.
      let box: [number, number, number, number] | null = null;
      for (const b of adminBoundaries) {
        const [w, s, e, n] = multiPolygonBbox(b.geometry);
        box = box
          ? [Math.min(box[0], w), Math.min(box[1], s), Math.max(box[2], e), Math.max(box[3], n)]
          : [w, s, e, n];
      }
      box = box ?? combinedBbox(boundaries) ?? RIAU_BBOX;
      map.fitBounds([[box[0], box[1]], [box[2], box[3]]], { padding: 48, duration: 600 });
    },
    [adminBoundaries, boundaries]
  );

  // Capture untuk cetak PDF: (opsional) set fokus lembaga + zoom ke bbox →
  // tunggu "idle" (tile termuat) → encodeMapCapture. Pola timeout/taint mengikuti
  // map-bmp-canvas.
  useEffect(() => {
    if (!registerCapture) return;
    const capture: FireMapCaptureFn = (bbox, focus = null) =>
      new Promise((resolve) => {
        const ref = mapRef.current;
        if (!ref) {
          resolve(null);
          return;
        }
        const map = ref.getMap();
        setFocusGroupId(focus);
        const snap = () => {
          try {
            resolve(encodeMapCapture(map.getCanvas()));
          } catch (err) {
            // Basemap cross-origin (Hybrid) men-taint canvas — gagal rapi.
            console.warn("Map capture failed:", err);
            resolve(null);
          } finally {
            setFocusGroupId(null);
          }
        };
        // Jeda 1 frame+ agar gaya fokus (state React → paint MapLibre) sudah
        // ter-commit sebelum menunggu "idle".
        setTimeout(() => {
          // Timeout menjamin promise selesai walau "idle" tak kunjung datang
          // (tile lambat) — ambil apa adanya daripada tombol macet.
          const timeout = setTimeout(() => {
            map.off("idle", onIdle);
            snap();
          }, 8000);
          const onIdle = () => {
            clearTimeout(timeout);
            snap();
          };
          map.once("idle", onIdle);
          if (bbox) map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 48, duration: 0 });
          // Selalu paksa satu siklus render: bila peta sudah tepat di bbox
          // target (cetak ulang scope sama), fitBounds tak menggerakkan kamera
          // sehingga "idle" tidak pernah terpancar dan tombol menunggu timeout.
          map.triggerRepaint();
        }, 120);
      });
    registerCapture(capture);
    return () => registerCapture(null);
  }, [registerCapture]);

  // Zoom eksternal (klik baris tabel panel → boundary lembaganya).
  useEffect(() => {
    if (!registerZoomTo) return;
    registerZoomTo((bbox) => {
      mapRef.current?.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
        padding: 64,
        duration: 600,
      });
    });
    return () => registerZoomTo(null);
  }, [registerZoomTo]);

  const handleClick = (e: MapLayerMouseEvent) => {
    // Prioritas titik api; klik boundary menampilkan ringkasan lembaganya.
    const hotspot = e.features?.find(
      (f) => f.layer?.id === "fire-hotspot-in" || f.layer?.id === "fire-hotspot-out"
    );
    if (hotspot) {
      setSelected({ longitude: e.lngLat.lng, latitude: e.lngLat.lat, props: hotspot.properties ?? {} });
      return;
    }
    const boundary = e.features?.find((f) => f.layer?.id === "fire-boundary-fill");
    if (boundary) {
      setSelected({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        props: { kind: "boundary", ...(boundary.properties ?? {}) },
      });
      onSelectGroup?.((boundary.properties?.farmerGroupId as string) ?? null);
      return;
    }
    setSelected(null);
    onSelectGroup?.(null);
  };

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 101.4, latitude: 0.5, zoom: 7 }}
        mapStyle={MAP_STYLES[styleKey]}
        canvasContextAttributes={{ preserveDrawingBuffer: true }}
        interactiveLayerIds={["fire-hotspot-in", "fire-hotspot-out", "fire-boundary-fill"]}
        onLoad={(e) => {
          // Ikon flame per bucket disediakan lazily: setStyle (ganti basemap)
          // membuang images, dan styleimagemissing terpancar lagi — listener
          // ini hidup di objek Map sehingga sekali pasang cukup.
          e.target.on("styleimagemissing", ({ id }: { id: string }) => {
            const m = /^flame-(high|nominal|low)$/.exec(id);
            if (!m || e.target.hasImage(id)) return;
            const img = flameImageData(HOTSPOT_CONF_COLORS[m[1] as keyof typeof HOTSPOT_CONF_COLORS]);
            if (img) e.target.addImage(id, img, { pixelRatio: 2 });
          });
          fitAll();
        }}
        onClick={handleClick}
        onMouseMove={(e) => {
          e.target.getCanvas().style.cursor = e.features && e.features.length > 0 ? "pointer" : "";
        }}
        onError={(e) => {
          console.warn("Map source error:", e.error?.message ?? e.error);
        }}
      >
        {/* Konteks: batas administrasi kabupaten (di bawah layer lembaga). */}
        <Source id="fire-admin-source" type="geojson" data={adminGeojson}>
          <Layer
            id="fire-admin-line"
            type="line"
            paint={{
              "line-color": styleKey === "dark" ? "#6b7280" : "#9ca3af",
              "line-width": 1,
              "line-dasharray": [3, 2],
            }}
          />
        </Source>
        <Source id="fire-admin-label-source" type="geojson" data={adminLabelGeojson}>
          <Layer
            id="fire-admin-label"
            type="symbol"
            layout={{
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Regular"],
              "text-size": 10,
              "text-letter-spacing": 0.1,
              "text-optional": true,
            }}
            paint={{
              "text-color": styleKey === "dark" ? "#9ca3af" : "#6b7280",
              "text-halo-color": styleKey === "dark" ? "#0f172a" : "#ffffff",
              "text-halo-width": 1.2,
            }}
          />
        </Source>

        {/* Lembaga terpilih di-highlight: fill lebih pekat + outline tebal.
            Mode fokus capture (PDF per lembaga): subjek menonjol, sisanya
            dipudarkan agar tidak semrawut saat boundary bertumpuk. */}
        <Source id="fire-boundary-source" type="geojson" data={boundaryGeojson}>
          <Layer
            id="fire-boundary-fill"
            type="fill"
            paint={{
              "fill-color": BOUNDARY_COLOR,
              "fill-opacity": focusGroupId
                ? ["case", ["==", ["get", "farmerGroupId"], focusGroupId], 0.24, 0.03]
                : ["case", ["==", ["get", "farmerGroupId"], selectedGroupId ?? ""], 0.28, 0.08],
            }}
          />
          <Layer
            id="fire-boundary-outline"
            type="line"
            paint={{
              "line-color": BOUNDARY_COLOR,
              "line-width": focusGroupId
                ? ["case", ["==", ["get", "farmerGroupId"], focusGroupId], 3, 0.7]
                : ["case", ["==", ["get", "farmerGroupId"], selectedGroupId ?? ""], 3.5, 1.5],
              "line-opacity": focusGroupId
                ? ["case", ["==", ["get", "farmerGroupId"], focusGroupId], 1, 0.35]
                : 1,
            }}
          />
        </Source>

        <Source id="fire-boundary-label-source" type="geojson" data={boundaryLabelGeojson}>
          <Layer
            id="fire-boundary-label"
            type="symbol"
            // Mode fokus: hanya label lembaga subjek yang tampil.
            filter={
              focusGroupId
                ? (["==", ["get", "farmerGroupId"], focusGroupId] as unknown as FilterSpecification)
                : undefined
            }
            layout={{
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Regular"],
              "text-size": 11,
              "text-max-width": 8,
              "text-optional": true,
            }}
            paint={{
              "text-color": labelColors.text,
              "text-halo-color": labelColors.halo,
              "text-halo-width": 1.5,
            }}
          />
        </Source>

        {hotspots && (
          <Source id="fire-hotspot-source" type="geojson" data={hotspots}>
            {/* Luar boundary: lingkaran kecil; dalam: ikon api. Warna keduanya
                murni dari confidence. */}
            <Layer
              id="fire-hotspot-out"
              type="circle"
              filter={OUT_FILTER}
              paint={{
                "circle-color": HOTSPOT_COLOR_EXPR,
                "circle-radius": 4,
                "circle-opacity": 0.85,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 0.75,
              }}
            />
            <Layer
              id="fire-hotspot-in"
              type="symbol"
              filter={IN_FILTER}
              layout={{
                "icon-image": ["concat", "flame-", ["get", "confBucket"]],
                "icon-size": 0.8,
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
              }}
            />
          </Source>
        )}

        {selected && (
          <Popup
            longitude={selected.longitude}
            latitude={selected.latitude}
            anchor="bottom"
            offset={12}
            onClose={() => setSelected(null)}
            closeOnClick={false}
            maxWidth="none"
            className="map-parcel-popup"
          >
            {selected.props.kind === "boundary" ? (
              <BoundaryPopupBody props={selected.props} countsByGroup={countsByGroup} />
            ) : (
              <HotspotPopupBody props={selected.props} />
            )}
          </Popup>
        )}
      </Map>

      {/* Legenda kiri-bawah: warna = confidence; bentuk = dalam/luar boundary. */}
      <div className="absolute bottom-4 left-4 z-10 space-y-1.5 rounded-md border bg-background/90 p-3 text-[11px] shadow-md backdrop-blur-sm">
        <p className="font-semibold">Legenda</p>
        {(Object.keys(HOTSPOT_CONF_COLORS) as HotspotConfBucket[]).map((b) => (
          <p key={b} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: HOTSPOT_CONF_COLORS[b] }}
            />
            {HOTSPOT_CONF_LABELS[b]}
          </p>
        ))}
        <p className="flex items-center gap-2">
          <Flame
            className="h-4 w-4 text-muted-foreground"
            fill="currentColor"
            strokeWidth={1}
          />
          Dalam boundary lembaga
        </p>
        <p className="flex items-center gap-2">
          <span className="mx-0.5 inline-block h-3 w-3 rounded-full border border-white bg-muted-foreground shadow-sm" />
          <span className="-ml-0.5">Luar boundary</span>
        </p>
        <p className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-[3px] border-2"
            style={{ borderColor: BOUNDARY_COLOR, backgroundColor: `${BOUNDARY_COLOR}14` }}
          />
          Boundary lembaga
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-block w-3 border-t-2 border-dashed border-gray-400" />
          Batas kabupaten
        </p>
      </div>

      {/* Kontrol kanan-bawah: zoom-semua + pilihan basemap (pola peta lain). */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
        <button
          onClick={() => {
            // Sekalian bersihkan pilihan — satu klik kembali ke tampilan awal
            // (pengganti tombol "reset" terpisah, keputusan review 2026-08-19).
            onSelectGroup?.(null);
            setSelected(null);
            fitAll();
          }}
          title="Zoom ke satu Riau"
          aria-label="Zoom ke satu Riau"
          className="flex h-9 w-9 items-center justify-center rounded-md border bg-background/90 text-muted-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <Maximize className="h-4 w-4" />
        </button>
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
    </div>
  );
}

function HotspotPopupBody({ props }: { props: Record<string, unknown> }) {
  const inBoundary = props.inBoundary === "in";
  const groupName = props.groupName ? String(props.groupName) : null;
  return (
    <div className="w-[260px]">
      <div className="flex items-center gap-3 bg-red-500/10 px-3.5 py-3 pr-8">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted">
          <Flame className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Titik Api</p>
          <p className="text-[11px] text-muted-foreground">
            {inBoundary && groupName ? groupName : "Di luar boundary lembaga"}
          </p>
        </div>
      </div>
      <dl className="space-y-1.5 px-3.5 py-3 text-xs">
        <Row label="Waktu deteksi" value={formatWib(props.acqDatetime as string | undefined)} />
        <Row label="Confidence" value={confidenceLabel(props.confidence)} />
        <Row label="Satelit" value={satelliteLabel(props.satellite)} />
        <Row
          label="FRP"
          value={typeof props.frp === "number" && Number.isFinite(props.frp) ? `${props.frp} MW` : "—"}
        />
      </dl>
    </div>
  );
}

function BoundaryPopupBody({
  props,
  countsByGroup,
}: {
  props: Record<string, unknown>;
  countsByGroup: Record<string, number>;
}) {
  const count = countsByGroup[String(props.farmerGroupId ?? "")] ?? 0;
  return (
    <div className="w-[260px]">
      <div className="bg-purple-500/10 px-3.5 py-3 pr-8">
        <p className="text-sm font-semibold leading-tight">{String(props.name ?? "—")}</p>
        <p className="text-[11px] text-muted-foreground">Distrik {String(props.districtName ?? "—")}</p>
      </div>
      <dl className="space-y-1.5 px-3.5 py-3 text-xs">
        <Row
          label="Titik api dalam boundary"
          value={
            <span className={count > 0 ? "font-semibold text-red-600 dark:text-red-400" : undefined}>
              {count}
            </span>
          }
        />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
