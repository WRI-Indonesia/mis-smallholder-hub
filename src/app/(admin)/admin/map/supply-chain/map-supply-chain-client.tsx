"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Map, { Layer, Popup, Source, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import { BarChart3, Building2, Factory, FlaskConical, Maximize, PanelLeftClose, PanelLeftOpen, Sprout, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAP_POPUP_PROPS, MapPopupDragHandle, MapPopupHeader, MapPopupHighlight, MapPopupRows, useMapPopupAutoPan, useMapPopupDrag } from "@/components/shared/map-popup";
import { MAP_STYLE_KEYS, MAP_STYLE_LABELS, type MapStyleKey } from "@/lib/map-style";
import { useVectorBasemap } from "@/hooks/use-vector-basemap";
import { formatNumber, formatPct } from "@/lib/format";
import {
  CHANNEL_LABEL,
  CHANNEL_ORDER,
  OFFTAKER_TYPE_LABEL,
  buildFlowSegments,
  flowSegmentKey,
  millDistrict,
  millLabel,
  recordChannel,
  type SankeyMode,
  type ScRecord,
  type SupplyChainMapView,
} from "@/lib/supply-chain-flow";
import { channelColor, useChartDark } from "../../dashboard/supply-chain/supply-chain-sankey";
import { ModeToggle } from "../../dashboard/supply-chain/supply-chain-dashboard-client";
import { SupplyChainFilterBar } from "../../dashboard/supply-chain/supply-chain-filter-bar";
import { useSupplyChainFilters } from "../../dashboard/supply-chain/use-supply-chain-filters";

const fmtTon = (n: number) => `${formatNumber(Math.round(n))} t`;
const PANEL_W = 340;

type Selected = { lng: number; lat: number; kind: string; id: string } | null;

// ---------------------------------------------------------------------------
// Ikon kanvas (pola Fire Alert): pabrik untuk Mill, panah arah di garis alir.
// Tak bergantung tema — tepi putih membuatnya terbaca di basemap terang & gelap.
// ---------------------------------------------------------------------------
const FACTORY_PATH = "M2 22V12l6-4v4l6-4v4l8-4v14Z M4 10.5V3h3.5v5.2";
const ARROW_PATH = "M5 5L19 12L5 19L8 12Z";
const MILL_UL_COLOR = "#0284c7";
const MILL_COLOR = "#374151";

function iconImage(path: string, fill: string, size = 28): ImageData | null {
  const px = size * 2;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale((px - 6) / 24, (px - 6) / 24);
  ctx.translate(1.2, 1.2);
  const p = new Path2D(path);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.6;
  ctx.stroke(p);
  ctx.fillStyle = fill;
  ctx.fill(p);
  return ctx.getImageData(0, 0, px, px);
}

const ICONS: Record<string, () => ImageData | null> = {
  "sc-mill-ul": () => iconImage(FACTORY_PATH, MILL_UL_COLOR),
  "sc-mill": () => iconImage(FACTORY_PATH, MILL_COLOR),
  "sc-arrow": () => iconImage(ARROW_PATH, "#ffffff", 16),
};
const provideIcon = (id: string) => ICONS[id]?.() ?? null;
/** Pasang ikon di style aktif — `styleimagemissing` saja bisa terlambat (lihat ensureFlameImages). */
function ensureIcons(map: { hasImage: (id: string) => boolean; addImage: (id: string, img: ImageData, o: { pixelRatio: number }) => void }) {
  for (const id of Object.keys(ICONS)) {
    if (map.hasImage(id)) continue;
    const img = ICONS[id]();
    if (img) map.addImage(id, img, { pixelRatio: 2 });
  }
}

/**
 * Peta Rantai Pasok (prototipe #379). **Ringkas**: garis lurus Lembaga → Mill.
 * **Detail**: singgah di titik agen/RAMP yang berkoordinat + titik lahan (Siak).
 * Tebal garis ∝ tonase, warna = jalur pertama, panah = arah TBS. Klik Lembaga,
 * offtaker, atau Mill menyorot jaringannya dan meredupkan sisanya. Filter
 * dibagi dengan Dashboard lewat URL.
 */
export function MapSupplyChainClient({ view, helpSlot }: { view: SupplyChainMapView; helpSlot?: React.ReactNode }) {
  const dark = useChartDark();
  const [styleOverride, setStyleOverride] = useState<MapStyleKey | null>(null);
  const styleKey: MapStyleKey = styleOverride ?? (dark ? "dark" : "light");
  const { mapStyle, labelFont, labelsReady, syncStyle, registerImageFallback } = useVectorBasemap(styleKey, { provideImage: provideIcon });
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);

  const f = useSupplyChainFilters(view);
  const { records, offtakers: offById, millsById: millById } = f;
  const [mode, setMode] = useState<SankeyMode>("RINGKAS");
  const detail = mode === "RINCI";
  const [panelOpen, setPanelOpen] = useState(true);
  const [showParcels, setShowParcels] = useState(true);
  const [showParcelLines, setShowParcelLines] = useState(false);
  const [selected, setSelected] = useState<Selected>(null);
  // Popup standar peta (#222): auto-pan agar kartu utuh di viewport + bisa digeser.
  const popupKey = selected ? `${selected.kind}:${selected.id}:${selected.lng},${selected.lat}` : null;
  useMapPopupAutoPan(mapRef, popupKey);
  const popupDrag = useMapPopupDrag(popupKey);

  const groupByCode = useMemo(() => new globalThis.Map(view.data.groups.map((g) => [g.code, g])), [view.data.groups]);
  const { segments, undrawn } = useMemo(() => buildFlowSegments(view.data, records, { viaOfftakers: detail }), [view.data, records, detail]);

  // Jaringan entitas terpilih: segmen dari record yang melewati entitas itu.
  const focus = useMemo(() => {
    if (!selected || !["lembaga", "offtaker", "mill"].includes(selected.kind)) return null;
    const id = selected.id;
    const rs = records.filter((r) =>
      selected.kind === "lembaga" ? r.groupCode === id : selected.kind === "mill" ? r.millId === id : r.offtakerId === id || r.nextOfftakerId === id,
    );
    const seg = buildFlowSegments(view.data, rs, { viaOfftakers: detail }).segments;
    const nodes = new Set(seg.flatMap((s) => [s.from.key, s.to.key]));
    return { segments: new Set(seg.map(flowSegmentKey)), nodes, surveys: new Set(rs.map((r) => r.surveyId).filter(Boolean)) };
  }, [selected, records, view.data, detail]);

  // ---- GeoJSON ----------------------------------------------------------
  const flowFc = useMemo<FeatureCollection<LineString>>(() => {
    const max = Math.max(1, ...segments.map((s) => s.ton));
    return {
      type: "FeatureCollection",
      features: segments.map((s) => ({
        type: "Feature",
        properties: {
          // Kunci stabil (bukan indeks larik) — popup garis tetap benar setelah filter berubah.
          kind: "flow", id: flowSegmentKey(s), ton: s.ton, color: channelColor(s.channel, dark),
          w: 1.5 + Math.sqrt(s.ton / max) * 12, on: !focus || focus.segments.has(flowSegmentKey(s)),
        },
        geometry: { type: "LineString", coordinates: [[s.from.lon, s.from.lat], [s.to.lon, s.to.lat]] },
      })),
    };
  }, [segments, dark, focus]);

  const nodeFc = useMemo<FeatureCollection<Point>>(() => {
    const feats: Feature<Point>[] = [];
    const tonBy = new globalThis.Map<string, number>();
    const add = (k: string, t: number) => tonBy.set(k, (tonBy.get(k) ?? 0) + t);
    for (const r of records) {
      const t = r.supplyTon ?? 0;
      add(`L:${r.groupCode}`, t);
      if (detail && r.offtakerId) add(`O:${r.offtakerId}`, t);
      if (detail && r.nextOfftakerId) add(`O:${r.nextOfftakerId}`, t);
      if (r.millId) add(`M:${r.millId}`, t);
    }
    for (const [k, ton] of tonBy) {
      const id = k.slice(2);
      const on = !focus || focus.nodes.has(k);
      if (k.startsWith("L:")) {
        const g = groupByCode.get(id);
        if (g?.lat != null && g.lon != null) feats.push({ type: "Feature", properties: { kind: "lembaga", id, label: g.abrv, ton, on }, geometry: { type: "Point", coordinates: [g.lon, g.lat] } });
      } else if (k.startsWith("O:")) {
        const o = offById.get(id);
        // Koperasi = Lembaga → titiknya sudah tergambar sebagai Lembaga; gambar sendiri
        // hanya bila Lembaga pemiliknya tak ada di peta (agar garis tak berbelok di titik kosong).
        if (o?.lat != null && o.lon != null && !(o.farmerGroupCode && tonBy.has(`L:${o.farmerGroupCode}`)))
          feats.push({ type: "Feature", properties: { kind: "offtaker", id, label: o.name, ton, on }, geometry: { type: "Point", coordinates: [o.lon, o.lat] } });
      } else {
        const m = millById.get(id);
        if (m?.lat != null && m.lon != null)
          feats.push({
            type: "Feature",
            properties: { kind: "mill", id, label: millLabel(m), ton, on, icon: m.buyerPrograms.includes("UL") ? "sc-mill-ul" : "sc-mill" },
            geometry: { type: "Point", coordinates: [m.lon, m.lat] },
          });
      }
    }
    return { type: "FeatureCollection", features: feats };
  }, [records, groupByCode, offById, millById, detail, focus]);

  const recordsBySurvey = useMemo(() => {
    const m = new globalThis.Map<string, ScRecord[]>();
    for (const r of records) if (r.surveyId) m.set(r.surveyId, [...(m.get(r.surveyId) ?? []), r]);
    return m;
  }, [records]);

  const parcelFc = useMemo<FeatureCollection<Point>>(() => ({
    type: "FeatureCollection",
    features: !detail
      ? []
      : view.parcels
          .filter((p) => recordsBySurvey.has(p.surveyId))
          .map((p) => {
            const main = [...(recordsBySurvey.get(p.surveyId) ?? [])].sort((a, b) => (b.supplyTon ?? 0) - (a.supplyTon ?? 0))[0];
            return {
              type: "Feature",
              properties: {
                kind: "parcel", id: p.surveyId, survey: p.pointSource === "SURVEI",
                color: main ? channelColor(recordChannel(main, offById), dark) : "#9ca3af", on: !focus || focus.surveys.has(p.surveyId),
              },
              geometry: { type: "Point", coordinates: [p.lon, p.lat] },
            };
          }),
  }), [detail, view.parcels, recordsBySurvey, offById, dark, focus]);

  const parcelLineFc = useMemo<FeatureCollection<LineString>>(() => {
    if (!detail || !showParcelLines) return { type: "FeatureCollection", features: [] };
    const feats: Feature<LineString>[] = [];
    for (const p of view.parcels) {
      for (const r of recordsBySurvey.get(p.surveyId) ?? []) {
        const m = r.millId ? millById.get(r.millId) : undefined;
        if (m?.lat == null || m.lon == null) continue;
        feats.push({ type: "Feature", properties: { color: channelColor(recordChannel(r, offById), dark) }, geometry: { type: "LineString", coordinates: [[p.lon, p.lat], [m.lon, m.lat]] } });
      }
    }
    return { type: "FeatureCollection", features: feats };
  }, [detail, showParcelLines, view.parcels, recordsBySurvey, millById, offById, dark]);

  const fitAll = useCallback(() => {
    const map = mapRef.current;
    const coords = nodeFc.features.map((ft) => ft.geometry.coordinates);
    if (!map || coords.length === 0) return;
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], {
      padding: { top: 70, bottom: 70, left: (panelOpen ? PANEL_W : 0) + 70, right: 70 },
      maxZoom: 12,
      duration: 700,
    });
  }, [nodeFc, panelOpen]);

  // Auto-paskan saat filter berubah (dan sekali setelah peta siap) — bukan saat menyorot.
  const lastFitQuery = useRef<string | null>(null);
  useEffect(() => {
    if (!loaded || lastFitQuery.current === f.query) return;
    lastFitQuery.current = f.query;
    fitAll();
  }, [loaded, f.query, fitAll]);

  const onClick = (e: MapLayerMouseEvent) => {
    // Titik menang atas garis yang tertumpuk di bawahnya.
    const rank = (k: unknown) => (k === "mill" || k === "lembaga" || k === "offtaker" ? 0 : k === "parcel" ? 1 : 2);
    const ft = [...(e.features ?? [])].sort((a, b) => rank(a.properties?.kind) - rank(b.properties?.kind))[0];
    if (!ft) return setSelected(null);
    const p = ft.properties as { kind: string; id: string };
    setSelected({ lng: e.lngLat.lng, lat: e.lngLat.lat, kind: p.kind, id: String(p.id) });
  };

  const totalTon = records.reduce((a, r) => a + (r.supplyTon ?? 0), 0);
  const drawnTon = totalTon - undrawn.unknownMillTon - undrawn.millWithoutPointTon - undrawn.groupWithoutPointTon;
  const dimOpacity = (on: number, off: number) => ["case", ["get", "on"], on, off] as unknown as number;
  const textPaint = { "text-color": dark ? "#f3f4f6" : "#111827", "text-halo-color": dark ? "#111827" : "#ffffff", "text-halo-width": 1.5 };

  return (
    <div className="relative -m-6 h-[calc(100vh-3.5rem)] w-auto overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 101.3, latitude: 0.7, zoom: 8 }}
        mapStyle={mapStyle}
        interactiveLayerIds={["sc-flow", "sc-parcel", "sc-node-lembaga", "sc-node-offtaker", "sc-node-mill"]}
        onLoad={(e) => {
          registerImageFallback(e.target);
          ensureIcons(e.target);
          syncStyle(e.target);
          e.target.once("idle", () => setLoaded(true));
        }}
        onStyleData={(e) => {
          ensureIcons(e.target);
          syncStyle(e.target);
        }}
        onClick={onClick}
        onError={(e) => console.warn("Map source error:", e.error?.message ?? e.error)}
        onMouseMove={(e) => {
          e.target.getCanvas().style.cursor = e.features && e.features.length > 0 ? "pointer" : "";
        }}
      >
        <Source id="sc-parcel-lines" type="geojson" data={parcelLineFc}>
          <Layer id="sc-parcel-line" type="line" paint={{ "line-color": ["get", "color"], "line-width": 0.6, "line-opacity": 0.25 }} />
        </Source>
        <Source id="sc-flows" type="geojson" data={flowFc}>
          <Layer
            id="sc-flow"
            type="line"
            layout={{ "line-cap": "round" }}
            paint={{ "line-color": ["get", "color"], "line-width": ["get", "w"], "line-opacity": dimOpacity(0.7, 0.08) }}
          />
          <Layer
            id="sc-flow-arrow"
            type="symbol"
            filter={["get", "on"]}
            layout={{
              "symbol-placement": "line",
              "symbol-spacing": 110,
              "icon-image": "sc-arrow",
              "icon-size": ["interpolate", ["linear"], ["get", "w"], 1.5, 0.45, 13.5, 0.9],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "icon-rotation-alignment": "map",
            }}
            paint={{ "icon-opacity": 0.9 }}
          />
        </Source>
        <Source id="sc-parcels" type="geojson" data={parcelFc}>
          <Layer
            id="sc-parcel"
            type="circle"
            layout={{ visibility: showParcels ? "visible" : "none" }}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 1.6, 13, 5],
              "circle-color": ["get", "color"],
              "circle-opacity": dimOpacity(0.85, 0.12),
              "circle-stroke-width": ["case", ["get", "survey"], 1, 0],
              "circle-stroke-color": dark ? "#f9fafb" : "#111827",
            }}
          />
        </Source>
        <Source id="sc-nodes" type="geojson" data={nodeFc}>
          <Layer
            id="sc-node-offtaker"
            type="circle"
            filter={["==", ["get", "kind"], "offtaker"]}
            paint={{ "circle-radius": 6, "circle-color": "#d97706", "circle-stroke-width": 2, "circle-stroke-color": "#ffffff", "circle-opacity": dimOpacity(1, 0.2), "circle-stroke-opacity": dimOpacity(1, 0.2) }}
          />
          <Layer
            id="sc-node-lembaga"
            type="circle"
            filter={["==", ["get", "kind"], "lembaga"]}
            paint={{ "circle-radius": 8, "circle-color": "#059669", "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff", "circle-opacity": dimOpacity(1, 0.2), "circle-stroke-opacity": dimOpacity(1, 0.2) }}
          />
          <Layer
            id="sc-node-mill"
            type="symbol"
            filter={["==", ["get", "kind"], "mill"]}
            layout={{
              "icon-image": ["get", "icon"],
              "icon-size": ["interpolate", ["linear"], ["get", "ton"], 0, 0.75, 25000, 1.35],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            }}
            paint={{ "icon-opacity": dimOpacity(1, 0.25) }}
          />
          {labelsReady && (
            <Layer
              id="sc-node-label"
              type="symbol"
              filter={["all", ["in", ["get", "kind"], ["literal", ["lembaga", "mill"]]], ["get", "on"]]}
              layout={{ "text-field": ["get", "label"], "text-font": [labelFont], "text-size": 11, "text-offset": [0, 1.5], "text-anchor": "top", "text-optional": true }}
              paint={textPaint}
            />
          )}
        </Source>

        {selected && (
          <Popup key={popupKey} {...MAP_POPUP_PROPS} offset={popupDrag.offset} longitude={selected.lng} latitude={selected.lat} onClose={() => setSelected(null)}>
            <MapPopupDragHandle {...popupDrag.handleProps} />
            <SelectedCard selected={selected} view={view} records={records} segments={segments} />
          </Popup>
        )}
      </Map>

      {panelOpen ? (
        <div className="absolute left-3 top-3 bottom-3 flex flex-col overflow-hidden rounded-lg border bg-card/95 shadow-lg backdrop-blur" style={{ width: PANEL_W }}>
          <div className="space-y-2 border-b p-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold">Peta Rantai Pasok</h1>
              <Badge variant="outline" className="gap-1"><FlaskConical className="h-3 w-3" /> Prototipe</Badge>
              {helpSlot}
              <button type="button" onClick={() => setPanelOpen(false)} className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Lipat panel">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Garis lurus menurut data pengakuan {f.year ?? ""} — bukan rute angkut.{" "}
              <Link href={`/admin/dashboard/supply-chain${f.query ? `?${f.query}` : ""}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <BarChart3 className="h-3 w-3" /> Dashboard
              </Link>
            </p>
            <div className="flex items-center justify-between">
              <ModeToggle mode={mode} onChange={(m) => { setMode(m); setSelected(null); }} />
              <button type="button" onClick={fitAll} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Maximize className="h-3 w-3" /> Paskan
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {detail ? "Detail: singgah di titik agen/RAMP yang berkoordinat + titik lahan Siak." : "Ringkas: garis langsung Lembaga → Mill."}
            </p>
          </div>

          <Tabs defaultValue="filter" className="min-h-0 flex-1 gap-0">
            <TabsList className="mx-3 mt-2 w-[calc(100%-1.5rem)]">
              <TabsTrigger value="filter">Filter</TabsTrigger>
              <TabsTrigger value="legenda">Legenda</TabsTrigger>
              <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
            </TabsList>
            <TabsContent value="filter" className="min-h-0 flex-1 overflow-y-auto p-3">
              <SupplyChainFilterBar f={f} years={view.years} vertical />
            </TabsContent>
            <TabsContent value="legenda" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-xs">
              <div className="space-y-1.5">
                <div className="font-medium">Jalur TBS (warna garis)</div>
                {CHANNEL_ORDER.map((c) => (
                  <div key={c} className="flex items-center gap-2 text-muted-foreground">
                    <span className="inline-block h-1.5 w-6 rounded" style={{ background: channelColor(c, dark) }} /> {CHANNEL_LABEL[c]}
                  </div>
                ))}
                <div className="text-muted-foreground">Tebal garis ∝ tonase · panah = arah TBS</div>
              </div>
              <div className="space-y-1.5 border-t pt-2">
                <div className="font-medium">Titik</div>
                <div className="flex items-center gap-2 text-muted-foreground"><span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-emerald-600" /> Lembaga</div>
                {detail && <div className="flex items-center gap-2 text-muted-foreground"><span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-amber-600" /> Agen / RAMP / KUD berkoordinat</div>}
                <div className="flex items-center gap-2 text-muted-foreground"><Factory className="h-4 w-4" style={{ color: MILL_UL_COLOR }} /> Mill pemasok UL</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Factory className="h-4 w-4" style={{ color: MILL_COLOR }} /> Mill lain (ukuran ∝ tonase)</div>
                {detail && <div className="flex items-center gap-2 text-muted-foreground"><span className="inline-block h-2.5 w-2.5 rounded-full border border-foreground bg-muted" /> Titik lahan dari koordinat survei</div>}
              </div>
              {detail && (
                <div className="space-y-2 border-t pt-2">
                  <div className="font-medium">Lapisan</div>
                  <ToggleRow label="Titik lahan (Siak)" checked={showParcels} onChange={setShowParcels} />
                  <ToggleRow label="Garis lahan → Mill" checked={showParcelLines} onChange={setShowParcelLines} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="ringkasan" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-xs">
              <Row label="TBS" value={fmtTon(totalTon)} />
              <Row label="Tergambar sampai Mill" value={`${fmtTon(drawnTon)} (${totalTon > 0 ? formatPct((drawnTon / totalTon) * 100) : "—"}%)`} />
              <div className="pt-2 font-medium">Tidak tergambar</div>
              <Row label="Mill tidak diketahui" value={fmtTon(undrawn.unknownMillTon)} />
              <Row label="Mill tanpa koordinat (tak ada di UML)" value={fmtTon(undrawn.millWithoutPointTon)} />
              {undrawn.groupWithoutPointTon > 0 && <Row label="Lembaga tanpa titik lokasi" value={fmtTon(undrawn.groupWithoutPointTon)} />}
              {detail && (
                <>
                  <Row label={`Lewat ${undrawn.offtakersWithoutPoint} offtaker tanpa titik*`} value={fmtTon(undrawn.skippedOfftakerTon)} />
                  <p className="text-muted-foreground">* garis dilompatkan ke titik berikutnya; survei berikutnya perlu mencatat koordinat agen/RAMP.</p>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-md border bg-card/95 px-3 py-2 text-sm font-medium shadow-lg"
        >
          <PanelLeftOpen className="h-4 w-4" /> Rantai Pasok
          {f.hasFilter && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Filter aktif" />}
        </button>
      )}

      {focus && (
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full border bg-card/95 px-3 py-1.5 text-xs shadow"
        >
          Menyorot jaringan terpilih · klik untuk kembali
        </button>
      )}

      <div className="absolute bottom-6 right-3 flex gap-1 rounded-md border bg-card/95 p-1 shadow">
        {MAP_STYLE_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            title={MAP_STYLE_LABELS[k].full}
            onClick={() => setStyleOverride(k)}
            className={cn("rounded px-2 py-1 text-[10px] font-semibold", styleKey === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            {MAP_STYLE_LABELS[k].short}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span>{label}</span>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium text-right">{value}</span>
    </div>
  );
}

/** Seperti `MapPopupRows`, tapi label Mill pemasok UL diberi badge (sama dengan tabel Mill di Dashboard). */
function MillRows({ rows }: { rows: { id: string; label: string; isUl: boolean; value: string }[] }) {
  return (
    <dl className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-3">
          <dt className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate" title={r.label}>{r.label}</span>
            {r.isUl && <Badge className="h-4 shrink-0 px-1.5 text-[10px]">UL</Badge>}
          </dt>
          <dd className="shrink-0 text-right text-xs font-medium tabular-nums">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function topBy<T>(items: T[], key: (t: T) => string, val: (t: T) => number, n = 5) {
  const m = new globalThis.Map<string, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + val(it));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function SelectedCard({
  selected,
  view,
  records,
  segments,
}: {
  selected: NonNullable<Selected>;
  view: SupplyChainMapView;
  records: ScRecord[];
  segments: ReturnType<typeof buildFlowSegments>["segments"];
}) {
  const mills = new globalThis.Map(view.data.mills.map((m) => [m.id, m]));
  const offs = new globalThis.Map(view.data.offtakers.map((o) => [o.id, o]));
  const groups = new globalThis.Map(view.data.groups.map((g) => [g.code, g]));
  const millName = (id: string | null) => (id && mills.get(id) ? millLabel(mills.get(id)!) : "Mill tidak diketahui");
  const ton = (rs: ScRecord[]) => rs.reduce((a, r) => a + (r.supplyTon ?? 0), 0);
  const list = (rows: [string, number][]) => rows.map(([k, v]) => ({ label: k, value: fmtTon(v) }));
  // Mill tujuan dikelompokkan per id (bukan nama) agar badge UL bisa dibaca dari master Mill.
  const millRows = (rs: ScRecord[]) =>
    topBy(rs, (r) => r.millId ?? "", (r) => r.supplyTon ?? 0).map(([id, v]) => ({
      id,
      label: millName(id || null),
      isUl: !!mills.get(id)?.buyerPrograms.includes("UL"),
      value: fmtTon(v),
    }));

  let body: React.ReactNode = null;
  if (selected.kind === "mill") {
    const m = mills.get(selected.id);
    const rs = records.filter((r) => r.millId === selected.id);
    body = m && (
      <>
        <MapPopupHeader accent="blue" icon={<Factory className="h-5 w-5" />} title={millLabel(m)} badge={m.buyerPrograms.includes("UL") && <Badge className="h-4 px-1.5 text-[10px]">UL</Badge>} rows={[{ label: "UML ID", value: m.umlId ?? "— (manual)", mono: true }, { label: "Distrik", value: millDistrict(m) ?? "—" }]} />
        <MapPopupHighlight label="TBS" value={fmtTon(ton(rs))} />
        <div className="space-y-2 px-3.5 py-2.5">
          <MapPopupRows rows={[
            { label: "Program buyer", value: m.buyerPrograms.length ? m.buyerPrograms.join(", ") : "—" },
            { label: "RSPO", value: m.rspoStatus },
          ]} />
          <div className="text-[11px] font-medium text-muted-foreground">Lembaga pemasok teratas</div>
          <MapPopupRows rows={list(topBy(rs, (r) => groups.get(r.groupCode)?.abrv ?? r.groupCode, (r) => r.supplyTon ?? 0))} />
        </div>
      </>
    );
  } else if (selected.kind === "lembaga") {
    const g = groups.get(selected.id);
    const rs = records.filter((r) => r.groupCode === selected.id);
    body = g && (
      <>
        <MapPopupHeader accent="emerald" icon={<Building2 className="h-5 w-5" />} title={g.name} rows={[{ label: "Kode", value: g.code, mono: true }, { label: "Distrik", value: g.districtName }]} />
        <MapPopupHighlight label="TBS" value={fmtTon(ton(rs))} />
        <div className="space-y-2 px-3.5 py-2.5">
          <div className="text-[11px] font-medium text-muted-foreground">Mill tujuan teratas</div>
          <MillRows rows={millRows(rs)} />
        </div>
      </>
    );
  } else if (selected.kind === "offtaker") {
    const o = offs.get(selected.id);
    const rs = records.filter((r) => r.offtakerId === selected.id || r.nextOfftakerId === selected.id);
    body = o && (
      <>
        <MapPopupHeader accent="amber" icon={<Truck className="h-5 w-5" />} title={o.name} rows={[{ label: "Kode", value: o.id, mono: true }, { label: "Tipe", value: OFFTAKER_TYPE_LABEL[o.type] }]} />
        <MapPopupHighlight label="TBS melewati" value={fmtTon(ton(rs))} />
        <div className="space-y-2 px-3.5 py-2.5">
          <div className="text-[11px] font-medium text-muted-foreground">Mill tujuan</div>
          <MillRows rows={millRows(rs)} />
        </div>
      </>
    );
  } else if (selected.kind === "parcel") {
    const p = view.parcels.find((x) => x.surveyId === selected.id);
    const rs = records.filter((r) => r.surveyId === selected.id);
    body = p && (
      <>
        <MapPopupHeader accent="emerald" icon={<Sprout className="h-5 w-5" />} title={p.farmerName ?? "Lahan"} rows={[{ label: "Parcel ID", value: p.parcelId ?? "—", mono: true }, { label: "Lembaga", value: groups.get(p.groupCode)?.abrv ?? p.groupCode }]} />
        <MapPopupHighlight label="Produksi TBS (survei)" value={p.ffbTon == null ? "—" : fmtTon(p.ffbTon)} />
        <div className="space-y-2 px-3.5 py-2.5">
          <MapPopupRows rows={rs.map((r) => ({ label: `${r.offtakerId ? offs.get(r.offtakerId)?.name ?? r.offtakerId : "Langsung"} → ${millName(r.millId)}`, value: r.supplyTon == null ? "—" : fmtTon(r.supplyTon) }))} />
          <p className="text-[11px] text-muted-foreground">Titik: {p.pointSource === "POLIGON" ? "titik dalam poligon lahan MIS" : "koordinat survei (lahan tak cocok/tanpa poligon di MIS)"}</p>
        </div>
      </>
    );
  } else if (selected.kind === "flow") {
    const s = segments.find((x) => flowSegmentKey(x) === selected.id);
    const label = (k: string) => {
      const id = k.slice(2);
      return k.startsWith("L:") ? (groups.get(id)?.abrv ?? id) : k.startsWith("O:") ? (offs.get(id)?.name ?? id) : millName(id);
    };
    body = s && (
      <div className="space-y-2 px-3.5 py-3 pr-8">
        <p className="text-sm font-semibold">{label(s.from.key)} → {label(s.to.key)}</p>
        <MapPopupRows rows={[{ label: "Jalur", value: CHANNEL_LABEL[s.channel] }, { label: "Tonase", value: fmtTon(s.ton) }]} />
      </div>
    );
  }
  return <div className="w-[300px] overflow-hidden rounded-md">{body ?? <div className="p-3 text-xs text-muted-foreground">Data tidak ditemukan pada filter ini.</div>}</div>;
}
