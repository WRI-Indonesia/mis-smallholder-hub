"use client";

import { useMemo, useRef, useState } from "react";
import MapGL, { Source, Layer, Popup, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import type { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { Target, User, Info } from "lucide-react";
import { MAP_STYLES } from "@/app/(admin)/admin/master-data/parcels/components/parcel-map-view";
import { geomBounds, parcelLabelFit, PARCEL_LABEL_FONT_PX } from "@/app/(admin)/admin/map/parcel/map-geo";
import { ParcelPopupActions } from "@/app/(admin)/admin/master-data/parcels/components/parcel-popup-actions";
import { ParcelEditModalHost } from "@/app/(admin)/admin/master-data/parcels/components/parcel-edit-modal-host";
import { MAP_POPUP_PROPS, MapPopupHeader, MapPopupHighlight, MapPopupSection, MapPopupRows } from "@/components/shared/map-popup";

export interface DistributionMapParcel {
  id: string;
  parcelId: string;
  farmerName: string;
  /** ID Petani (kode) & Lembaga Petani — untuk header popup (parity Peta Lahan). */
  farmerCode: string;
  farmerGroupName: string;
  /** Kelompok Tani (LandParcel.subGroupLv2) — basis warna poligon. */
  kelompokTani: string | null;
  blok: string | null;
  area: number | null;
  geometry: unknown;
}

interface Props {
  parcels: DistributionMapParcel[];
  /** Izin menu `master-data-parcels` — mengatur tombol popup Lihat Detail / Edit. */
  canViewParcel?: boolean;
  canEditParcel?: boolean;
}

/** Palet kategorikal per Kelompok Tani — berulang bila KT > 12; tanpa-KT = abu. */
const KT_COLORS = [
  "#16a34a", "#2563eb", "#ea580c", "#9333ea", "#0d9488",
  "#dc2626", "#ca8a04", "#db2777", "#4f46e5", "#65a30d",
  "#0891b2", "#b45309",
];
const NO_KT_COLOR = "#94a3b8";
const NO_KT_LABEL = "Tanpa Kelompok Tani";
const NO_KT_KEY = "__tanpa_kt__";

/** Kumpulkan semua [lng, lat] valid dari nested coordinates (Polygon/MultiPolygon). */
function collectPositions(coords: unknown, out: [number, number][]): void {
  if (!Array.isArray(coords)) return;
  if (coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number") {
    out.push([coords[0], coords[1]]);
    return;
  }
  for (const c of coords) collectPositions(c, out);
}

function parseGeometry(raw: unknown): Geometry | null {
  const g = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
  if (!g || typeof g !== "object") return null;
  const geom = g as Polygon | MultiPolygon;
  if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") return null;
  const positions: [number, number][] = [];
  collectPositions(geom.coordinates, positions);
  return positions.length > 0 ? geom : null;
}

const fillStyle: LayerProps = {
  id: "group-parcels-fill",
  type: "fill",
  paint: { "fill-color": ["get", "color"], "fill-opacity": 0.45 },
};

const lineStyle: LayerProps = {
  id: "group-parcels-border",
  type: "line",
  paint: { "line-color": ["get", "color"], "line-width": 1.5 },
};

interface SelectedParcel {
  lngLat: [number, number];
  id: string;
  parcelId: string;
  farmerName: string;
  farmerCode: string;
  farmerGroupName: string;
  kelompokTani: string | null;
  blok: string | null;
  area: number | null;
}

const formatArea = (n: number | null) =>
  n != null
    ? `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} Ha`
    : "—";

/** Peta sebaran lahan (poligon) satu Lembaga/Petani, diwarnai per Kelompok Tani (#171/#172). */
export function ParcelsDistributionMap({ parcels, canViewParcel = false, canEditParcel = false }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [styleKey, setStyleKey] = useState<keyof typeof MAP_STYLES>("hybrid");
  // KT yang disembunyikan via checklist legenda.
  const [hiddenKts, setHiddenKts] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(13);
  const [selected, setSelected] = useState<SelectedParcel | null>(null);
  const [editParcelId, setEditParcelId] = useState<string | null>(null);

  const { collection, bounds, validCount, legend, labelBase } = useMemo(() => {
    // KT → warna: distinct ternormalisasi (trim + case-insensitive, konsisten
    // #154), label = varian pertama, urut alfabetis agar penetapan warna stabil.
    const ktLabels = new Map<string, string>();
    for (const p of parcels) {
      const label = p.kelompokTani?.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (!ktLabels.has(key)) ktLabels.set(key, label);
    }
    const sortedKeys = [...ktLabels.keys()].sort((a, b) => a.localeCompare(b));
    const colorByKey = new Map<string, string>(
      sortedKeys.map((key, i) => [key, KT_COLORS[i % KT_COLORS.length]])
    );

    const features: Feature[] = [];
    const positions: [number, number][] = [];
    const countByKey = new Map<string, number>();
    const labels: { name: string; bounds: [number, number, number, number]; centroid: [number, number]; ktKey: string }[] = [];
    let noKtCount = 0;
    for (const p of parcels) {
      const geom = parseGeometry(p.geometry);
      if (!geom) continue;
      const label = p.kelompokTani?.trim();
      const key = label ? label.toLowerCase() : null;
      const color = key ? colorByKey.get(key) ?? NO_KT_COLOR : NO_KT_COLOR;
      if (key) countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
      else noKtCount += 1;
      const ktKey = key ?? NO_KT_KEY;
      features.push({
        type: "Feature",
        geometry: geom,
        properties: {
          id: p.id,
          parcelId: p.parcelId,
          color,
          ktKey,
          farmerName: p.farmerName,
          farmerCode: p.farmerCode,
          farmerGroupName: p.farmerGroupName,
          kelompokTani: p.kelompokTani,
          blok: p.blok,
          area: p.area,
        },
      });
      const featurePositions: [number, number][] = [];
      collectPositions((geom as Polygon | MultiPolygon).coordinates, featurePositions);
      positions.push(...featurePositions);
      // Label nama petani di dalam poligon (pola Peta Lahan: hanya bila muat).
      const b = geomBounds(geom);
      if (b && featurePositions.length > 0) {
        const centroid: [number, number] = [
          featurePositions.reduce((s, c) => s + c[0], 0) / featurePositions.length,
          featurePositions.reduce((s, c) => s + c[1], 0) / featurePositions.length,
        ];
        labels.push({ name: p.farmerName, bounds: b, centroid, ktKey });
      }
    }

    let b: [[number, number], [number, number]] | null = null;
    if (positions.length > 0) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (const [lng, lat] of positions) {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
      b = [[minLng, minLat], [maxLng, maxLat]];
    }

    const legendRows = sortedKeys
      .filter((key) => (countByKey.get(key) ?? 0) > 0)
      .map((key) => ({
        key,
        label: ktLabels.get(key)!,
        color: colorByKey.get(key)!,
        count: countByKey.get(key) ?? 0,
      }));
    if (noKtCount > 0)
      legendRows.push({ key: NO_KT_KEY, label: NO_KT_LABEL, color: NO_KT_COLOR, count: noKtCount });

    const fc: FeatureCollection = { type: "FeatureCollection", features };
    return { collection: fc, bounds: b, validCount: features.length, legend: legendRows, labelBase: labels };
  }, [parcels]);

  // Hanya render KT yang tercentang di legenda.
  const visibleCollection: FeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features: collection.features.filter((f) => !hiddenKts.has(String(f.properties?.ktKey))),
    }),
    [collection, hiddenKts]
  );

  // Label nama petani: hanya yang muat di poligon pada zoom sekarang (pola Peta Lahan).
  const labelGeojson = useMemo<FeatureCollection>(() => {
    const features = labelBase.flatMap((l) => {
      if (hiddenKts.has(l.ktKey)) return [];
      const fit = parcelLabelFit(l.name, l.bounds, zoom);
      return fit
        ? [
            {
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: l.centroid },
              properties: { farmerName: l.name, maxWidthEms: fit.maxWidthEms },
            },
          ]
        : [];
    });
    return { type: "FeatureCollection", features };
  }, [labelBase, hiddenKts, zoom]);

  if (validCount === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted/30 border rounded-md text-muted-foreground text-sm p-4 text-center">
        Belum ada lahan ber-geometri (poligon) untuk Lembaga ini.
      </div>
    );
  }

  const zoomToAll = () => {
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 40, duration: 600 });
  };

  const toggleKt = (key: string) => {
    setHiddenKts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showAll = () => setHiddenKts(new Set());
  const hideAll = () => setHiddenKts(new Set(legend.map((r) => r.key)));

  // Zoom ke poligon KT yang sedang tercentang saja.
  const zoomToVisible = () => {
    const positions: [number, number][] = [];
    for (const f of visibleCollection.features) {
      collectPositions((f.geometry as Polygon | MultiPolygon).coordinates, positions);
    }
    if (positions.length === 0) return;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of positions) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
    mapRef.current?.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 600 });
  };

  const onMapClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) {
      setSelected(null);
      return;
    }
    const props = f.properties as Record<string, unknown>;
    setSelected({
      lngLat: [e.lngLat.lng, e.lngLat.lat],
      id: String(props.id ?? ""),
      parcelId: String(props.parcelId ?? "—"),
      farmerName: String(props.farmerName ?? "—"),
      farmerCode: String(props.farmerCode ?? "—"),
      farmerGroupName: String(props.farmerGroupName ?? "—"),
      kelompokTani: (props.kelompokTani as string | null) ?? null,
      blok: (props.blok as string | null) ?? null,
      area: props.area != null ? Number(props.area) : null,
    });
  };

  return (
    <div className="relative h-[768px] w-full rounded-md overflow-hidden border">
      <MapGL
        ref={mapRef}
        initialViewState={bounds ? { bounds, fitBoundsOptions: { padding: 40 } } : { longitude: 101.8, latitude: 0.6, zoom: 9 }}
        mapStyle={MAP_STYLES[styleKey]}
        interactiveLayerIds={["group-parcels-fill"]}
        onClick={onMapClick}
        onMoveEnd={(e) => setZoom(e.viewState.zoom)}
        onMouseEnter={(e) => { e.target.getCanvas().style.cursor = "pointer"; }}
        onMouseLeave={(e) => { e.target.getCanvas().style.cursor = ""; }}
      >
        <Source type="geojson" data={visibleCollection}>
          <Layer {...fillStyle} />
          <Layer {...lineStyle} />
        </Source>

        {/* Label nama petani dalam poligon */}
        <Source type="geojson" data={labelGeojson}>
          <Layer
            id="group-parcels-label"
            type="symbol"
            layout={{
              "text-field": ["get", "farmerName"],
              "text-font": ["Open Sans Regular"],
              "text-size": PARCEL_LABEL_FONT_PX,
              "text-max-width": ["get", "maxWidthEms"],
              "text-optional": true,
            }}
            paint={{
              "text-color": "#111827",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.5,
            }}
          />
        </Source>

        {selected && (
          <Popup
            longitude={selected.lngLat[0]}
            latitude={selected.lngLat[1]}
            onClose={() => setSelected(null)}
            {...MAP_POPUP_PROPS}
          >
            {/* Lebar mengikuti isi (ID mono tak dipotong) — clamp agar tak terlalu lebar. */}
            <div className="w-max min-w-[300px] max-w-[440px]">
              <MapPopupHeader
                accent="blue"
                icon={<User className="h-5 w-5 text-muted-foreground" />}
                title={selected.farmerName}
                rows={[
                  { label: "ID Petani", value: selected.farmerCode, mono: true },
                  { label: "ID Lahan", value: selected.parcelId, mono: true },
                  { label: "Lembaga Petani", value: selected.farmerGroupName },
                ]}
              />
              <MapPopupHighlight label="Luas Lahan" value={formatArea(selected.area)} />
              <div className="divide-y">
                <MapPopupSection icon={<Info className="h-3.5 w-3.5" />} title="Detail Lahan" defaultOpen>
                  <MapPopupRows
                    rows={[
                      { label: "Kelompok Tani", value: selected.kelompokTani },
                      { label: "Blok", value: selected.blok },
                    ]}
                  />
                </MapPopupSection>
              </div>
              {selected.id && (canViewParcel || canEditParcel) && (
                <ParcelPopupActions
                  parcelId={selected.id}
                  canView={canViewParcel}
                  canEdit={canEditParcel}
                  onEdit={() => setEditParcelId(selected.id)}
                />
              )}
            </div>
          </Popup>
        )}
      </MapGL>

      {editParcelId && (
        <ParcelEditModalHost
          key={editParcelId}
          parcelId={editParcelId}
          onClose={() => setEditParcelId(null)}
          // Tutup popup sesudah simpan agar tak menampilkan data lama
          // (router.refresh dari form menyegar poligon dari server props).
          onSaved={() => setSelected(null)}
        />
      )}

      {/* Legenda + checklist show/hide per Kelompok Tani — kiri atas */}
      <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-2.5 max-h-[calc(100%-6rem)] w-52 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Legenda — Kelompok Tani
        </p>
        <ul className="space-y-1">
          {legend.map((row) => (
            <li key={row.key}>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-primary"
                  checked={!hiddenKts.has(row.key)}
                  onChange={() => toggleKt(row.key)}
                />
                <span
                  className="h-3 w-3 shrink-0 rounded-sm border border-foreground/20"
                  style={{ backgroundColor: row.color }}
                />
                <span className="flex-1 truncate" title={row.label}>{row.label}</span>
                <span className="tabular-nums text-muted-foreground">{row.count}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t pt-2 space-y-1.5">
          <div className="flex gap-1.5">
            <button
              onClick={showAll}
              className="flex-1 rounded border px-1.5 py-1 text-[10px] font-semibold hover:bg-muted transition-colors"
            >
              Tampilkan semua
            </button>
            <button
              onClick={hideAll}
              className="flex-1 rounded border px-1.5 py-1 text-[10px] font-semibold hover:bg-muted transition-colors"
            >
              Sembunyikan semua
            </button>
          </div>
          <button
            onClick={zoomToVisible}
            disabled={visibleCollection.features.length === 0}
            className="w-full rounded border px-1.5 py-1 text-[10px] font-semibold hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1"
          >
            <Target className="h-3 w-3 text-primary" />
            Zoom ke tercentang
          </button>
        </div>
      </div>

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

      <button
        onClick={zoomToAll}
        className="absolute bottom-3 right-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-2 flex items-center gap-1.5 text-xs font-semibold hover:bg-muted text-foreground transition-colors"
        title="Zoom ke semua lahan"
      >
        <Target className="h-3.5 w-3.5 text-primary" />
        <span>Zoom ke semua</span>
      </button>

      <div className="absolute bottom-3 left-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md px-2 py-1 text-xs text-muted-foreground">
        {visibleCollection.features.length}/{validCount} lahan ditampilkan
      </div>
    </div>
  );
}
