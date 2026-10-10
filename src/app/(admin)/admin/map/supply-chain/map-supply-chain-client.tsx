"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Map, { Layer, Popup, Source, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ExpressionSpecification, FilterSpecification, SymbolLayerSpecification } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import { BarChart3, Building2, ChevronDown, Factory, Filter as FilterIcon, FlaskConical, Layers, ListTree, Map as MapIcon, Maximize, Minus, PanelLeftClose, PanelLeftOpen, Plus, Sprout, Truck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MAP_POPUP_PROPS, MapPopupDragHandle, MapPopupHeader, MapPopupHighlight, MapPopupRows, useMapPopupAutoPan, useMapPopupDrag } from "@/components/shared/map-popup";
import { MAP_STYLE_KEYS, MAP_STYLE_LABELS, type MapStyleKey } from "@/lib/map-style";
import { useVectorBasemap } from "@/hooks/use-vector-basemap";
import { fmtKm, fmtTon, pctOf } from "@/lib/supply-chain-format";
import {
  CHANNEL_LABEL,
  CHANNEL_ORDER,
  MILL_STATUS_LABEL,
  OFFTAKER_TYPE_LABEL,
  buildFlowSegments,
  flowSegmentKey,
  isUlMill,
  millDistrict,
  millLabel,
  millVolumes,
  recordChannel,
  type MillStatus,
  type SankeyMode,
  type ScRecord,
  type SupplyChainMapView,
} from "@/lib/supply-chain-flow";
import { distanceStats, groupVolumes, millKey as millKeyOf } from "@/lib/supply-chain-insights";
import { arcCoordinates, flowLineWidth, offtakerFilterPatch, undrawnEntities, widthScaleSamples } from "@/lib/supply-chain-map";
import { channelColor, useChartDark } from "../../dashboard/supply-chain/supply-chain-sankey";
import { useStoredChoice } from "../../dashboard/supply-chain/collapsible-card";
import { ModeToggle } from "../../dashboard/supply-chain/segment-toggle";
import { SupplyChainFilterBar } from "../../dashboard/supply-chain/supply-chain-filter-bar";
import { notifyFilter } from "../../dashboard/supply-chain/supply-chain-filter-chips";
import { UlBadge } from "../../dashboard/supply-chain/ul-badge";
import { useSupplyChainFilters, type ScFilterParam } from "../../dashboard/supply-chain/use-supply-chain-filters";

const PANEL_W = 340;
/** Label Mill/Lembaga yang selalu tampil (peringkat tonase); sisanya baru pada zoom ≥ LABEL_REST_ZOOM. */
const TOP_LABELS = 8;
const LABEL_REST_ZOOM = 10;
const UNDRAWN_LIST_MAX = 8;

type Selected = { lng: number; lat: number; kind: string; id: string } | null;
type Hover = { key: string; lng: number; lat: number; title: string; sub: string } | null;
type FeatureRef = { source: string; id: string };

// ---------------------------------------------------------------------------
// Ikon kanvas (pola Fire Alert): pabrik untuk Mill, panah arah di garis alir.
// Tak bergantung tema — tepi putih membuatnya terbaca di basemap terang & gelap.
// ---------------------------------------------------------------------------
const FACTORY_PATH = "M2 22V12l6-4v4l6-4v4l8-4v14Z M4 10.5V3h3.5v5.2";
const ARROW_PATH = "M5 5L19 12L5 19L8 12Z";
const MILL_UL_COLOR = "#0284c7";
const MILL_COLOR = "#374151";
const MILL_UNCERTAIN_COLOR = "#9ca3af";

function iconImage(path: string, fill: string, size = 28, dashed = false): ImageData | null {
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
  if (dashed) {
    // PKS belum pasti: tepi putus-putus gelap di atas isi abu.
    ctx.setLineDash([1.6, 1.4]);
    ctx.strokeStyle = MILL_COLOR;
    ctx.lineWidth = 1.1;
    ctx.stroke(p);
  }
  return ctx.getImageData(0, 0, px, px);
}

const ICONS: Record<string, () => ImageData | null> = {
  "sc-mill-ul": () => iconImage(FACTORY_PATH, MILL_UL_COLOR),
  "sc-mill": () => iconImage(FACTORY_PATH, MILL_COLOR),
  "sc-mill-uncertain": () => iconImage(FACTORY_PATH, MILL_UNCERTAIN_COLOR, 28, true),
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

/** Urutan dasharray animasi "titik bergerak" (contoh resmi MapLibre); satu langkah tiap ANIM_STEP_MS. */
const DASH_SEQUENCE: number[][] = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
];
const ANIM_STEP_MS = 55;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (cb: () => void) => {
  const mq = window.matchMedia?.(REDUCED_MOTION);
  mq?.addEventListener("change", cb);
  return () => mq?.removeEventListener("change", cb);
};
/**
 * Preferensi "kurangi gerak" OS, aman hydration: render server & render awal klien
 * selalu `false`, lalu menyesuaikan setelah mount (dulu dibaca saat render → HTML
 * server ≠ klien bagi pengguna reduce-motion; review 2026-10-10).
 */
function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, () => !!window.matchMedia?.(REDUCED_MOTION).matches, () => false);
}

const BOOL_STATES = ["on", "off"] as const;
/** Saklar lapisan yang diingat per browser (kunci `sc-dashboard:map:*`). */
function useLayerSwitch(key: string, initial: boolean) {
  const [v, set] = useStoredChoice(`map:${key}`, initial ? "on" : "off", BOOL_STATES);
  return [v === "on", (b: boolean) => set(b ? "on" : "off")] as const;
}

/**
 * Peta Rantai Pasok (prototipe #379). **Ringkas**: garis Lembaga → Mill.
 * **Detail**: singgah di titik agen/RAMP yang berkoordinat + titik lahan (Siak).
 * Garis melengkung ringan (aliran ke Mill yang sama tak saling tindih), tebal ∝
 * tonase, warna = jalur pertama, titik bergerak = arah TBS (atau panah bila
 * animasi mati). Hover = tooltip + garis menyala; klik = sorot jaringan + popup
 * beraksi (Jadikan filter · Lihat di Dashboard). Filter dibagi dengan Dashboard
 * lewat URL. Panel kiri setinggi isinya: bagian lipat Filter (terbuka) · Lapisan ·
 * Legenda · Ringkasan (terlipat, judul memuat ringkasan); legenda mini selalu di peta
 * (owner 2026-10-10).
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
  const [showFlows, setShowFlows] = useLayerSwitch("flows", true);
  const [showLabels, setShowLabels] = useLayerSwitch("labels", true);
  const [showParcels, setShowParcels] = useLayerSwitch("parcels", true);
  const [showParcelLines, setShowParcelLines] = useLayerSwitch("parcel-lines", false);
  // Animasi bawaan nyala, kecuali OS meminta gerak dikurangi; pilihan pengguna diingat.
  const reducedMotion = useReducedMotion();
  const [animateStored, setAnimateStored] = useLayerSwitch("animate", true);
  const animate = animateStored && !reducedMotion;
  const [legendStored, setLegendStored] = useLayerSwitch("legend-strip", true);
  const [selected, setSelected] = useState<Selected>(null);
  const [hover, setHover] = useState<Hover>(null);
  const hoverRef = useRef<FeatureRef | null>(null);

  // Popup standar peta (#222): auto-pan agar kartu utuh di viewport (di kanan panel
  // melayang) + bisa digeser. Titik memakai koordinat fiturnya (lihat onClick), jadi
  // klik ulang entitas yang sama tidak me-reset geseran; garis tetap berjangkar di
  // titik klik sehingga klik di bagian lain garis memicu auto-pan lagi.
  const popupKey = selected ? `${selected.kind}:${selected.id}:${selected.lng},${selected.lat}` : null;
  useMapPopupAutoPan(mapRef, popupKey, panelOpen ? PANEL_W + 12 : 0);

  const groupByCode = useMemo(() => new globalThis.Map(view.data.groups.map((g) => [g.code, g])), [view.data.groups]);
  const { segments, undrawn } = useMemo(() => buildFlowSegments(view.data, records, { viaOfftakers: detail }), [view.data, records, detail]);
  const undrawnNames = useMemo(() => undrawnEntities(view.data, records, { viaOfftakers: detail }), [view.data, records, detail]);

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

  // Nama entitas yang sedang disorot — chip di panel (menggantikan pil tengah atas).
  const focusLabel = !focus || !selected ? null
    : selected.kind === "lembaga" ? (groupByCode.get(selected.id)?.abrv ?? selected.id)
    : selected.kind === "mill" ? (millById.get(selected.id) ? millLabel(millById.get(selected.id)!) : selected.id)
    : (offById.get(selected.id)?.name ?? selected.id);

  const maxSegTon = Math.max(1, ...segments.map((s) => s.ton));

  // ---- GeoJSON ----------------------------------------------------------
  const flowFc = useMemo<FeatureCollection<LineString>>(() => ({
    type: "FeatureCollection",
    features: segments.map((s) => ({
      type: "Feature",
      properties: {
        // Kunci stabil (bukan indeks larik) — popup garis & feature-state hover tetap benar setelah filter berubah.
        kind: "flow", id: flowSegmentKey(s), ton: s.ton, color: channelColor(s.channel, dark),
        w: flowLineWidth(s.ton, maxSegTon), on: !focus || focus.segments.has(flowSegmentKey(s)),
      },
      geometry: { type: "LineString", coordinates: arcCoordinates([s.from.lon, s.from.lat], [s.to.lon, s.to.lat]) },
    })),
  }), [segments, dark, focus, maxSegTon]);

  const nodeFc = useMemo<FeatureCollection<Point>>(() => {
    const feats: Feature<Point>[] = [];
    const tonBy = new globalThis.Map<string, number>();
    const millStatus = new globalThis.Map<string, MillStatus>();
    const add = (k: string, t: number) => tonBy.set(k, (tonBy.get(k) ?? 0) + t);
    for (const r of records) {
      const t = r.supplyTon ?? 0;
      add(`L:${r.groupCode}`, t);
      if (detail && r.offtakerId) add(`O:${r.offtakerId}`, t);
      if (detail && r.nextOfftakerId) add(`O:${r.nextOfftakerId}`, t);
      if (r.millId) {
        add(`M:${r.millId}`, t);
        // Satu PKS bisa "pasti" di satu baris dan "belum pasti" di baris lain → yang terkuat (pola millVolumes).
        if (r.millStatus === "PKS_PASTI" || !millStatus.has(r.millId)) millStatus.set(r.millId, r.millStatus);
      }
    }
    // Peringkat tonase per jenis → label selektif pada zoom jauh.
    const rankOf = (prefix: string) => {
      const ids = [...tonBy].filter(([k]) => k.startsWith(prefix)).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return new globalThis.Map(ids.map((k, i) => [k, i + 1]));
    };
    const rankL = rankOf("L:");
    const rankM = rankOf("M:");
    for (const [k, ton] of tonBy) {
      const id = k.slice(2);
      const on = !focus || focus.nodes.has(k);
      if (k.startsWith("L:")) {
        const g = groupByCode.get(id);
        if (g?.lat != null && g.lon != null)
          feats.push({ type: "Feature", properties: { kind: "lembaga", fid: k, id, label: g.abrv, ton, on, rank: rankL.get(k) ?? 99 }, geometry: { type: "Point", coordinates: [g.lon, g.lat] } });
      } else if (k.startsWith("O:")) {
        const o = offById.get(id);
        // Koperasi = Lembaga → titiknya sudah tergambar sebagai Lembaga; gambar sendiri
        // hanya bila Lembaga pemiliknya tak ada di peta (agar garis tak berbelok di titik kosong).
        if (o?.lat != null && o.lon != null && !(o.farmerGroupCode && tonBy.has(`L:${o.farmerGroupCode}`)))
          feats.push({ type: "Feature", properties: { kind: "offtaker", fid: k, id, label: o.name, ton, on, rank: 99 }, geometry: { type: "Point", coordinates: [o.lon, o.lat] } });
      } else {
        const m = millById.get(id);
        if (m?.lat != null && m.lon != null) {
          const uncertain = millStatus.get(id) === "PKS_BELUM_PASTI";
          feats.push({
            type: "Feature",
            properties: {
              kind: "mill", fid: k, id, label: millLabel(m), ton, on, rank: rankM.get(k) ?? 99,
              ul: isUlMill(m), icon: uncertain ? "sc-mill-uncertain" : isUlMill(m) ? "sc-mill-ul" : "sc-mill",
            },
            geometry: { type: "Point", coordinates: [m.lon, m.lat] },
          });
        }
      }
    }
    return { type: "FeatureCollection", features: feats };
  }, [records, groupByCode, offById, millById, detail, focus]);
  const maxMillTon = useMemo(() => Math.max(1, ...nodeFc.features.filter((x) => x.properties?.kind === "mill").map((x) => Number(x.properties?.ton ?? 0))), [nodeFc]);

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

  // Animasi titik bergerak: putar dasharray lapisan sc-flow-anim (aman terhadap ganti basemap: dicek getLayer tiap langkah).
  useEffect(() => {
    if (!loaded || !animate || !showFlows) return;
    let step = 0;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last >= ANIM_STEP_MS) {
        last = t;
        const map = mapRef.current?.getMap();
        if (map?.getLayer("sc-flow-anim")) {
          step = (step + 1) % DASH_SEQUENCE.length;
          map.setPaintProperty("sc-flow-anim", "line-dasharray", DASH_SEQUENCE[step]);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loaded, animate, showFlows]);

  // ---- Hover (feature-state) ----------------------------------------------
  const setHoverFeature = useCallback((next: FeatureRef | null) => {
    const map = mapRef.current?.getMap();
    const prev = hoverRef.current;
    if (prev && (!next || prev.source !== next.source || prev.id !== next.id)) {
      if (map?.getSource(prev.source)) map.setFeatureState(prev, { hover: false });
      hoverRef.current = null;
    }
    if (next && (!prev || prev.source !== next.source || prev.id !== next.id)) {
      if (map?.getSource(next.source)) map.setFeatureState(next, { hover: true });
      hoverRef.current = next;
    }
  }, []);
  // Data berganti (filter/mode) → feature-state lama bisa menempel di id yang sama; bersihkan
  // (hanya state peta — tooltip React diperbarui oleh gerakan kursor berikutnya).
  useEffect(() => {
    setHoverFeature(null);
  }, [flowFc, nodeFc, setHoverFeature]);

  const flowLabel = useCallback(
    (k: string) => {
      const id = k.slice(2);
      return k.startsWith("L:") ? (groupByCode.get(id)?.abrv ?? id) : k.startsWith("O:") ? (offById.get(id)?.name ?? id) : millById.get(id) ? millLabel(millById.get(id)!) : id;
    },
    [groupByCode, offById, millById],
  );
  // Lookup O(1) untuk tooltip (dulu `find` linear tiap mousemove — review 2026-10-10).
  const segmentByKey = useMemo(() => new globalThis.Map(segments.map((x) => [flowSegmentKey(x), x])), [segments]);
  const parcelById = useMemo(() => new globalThis.Map(view.parcels.map((x) => [x.surveyId, x])), [view.parcels]);
  const rankFeature = (k: unknown) => (k === "mill" || k === "lembaga" || k === "offtaker" ? 0 : k === "parcel" ? 1 : 2);
  const topFeature = (e: MapLayerMouseEvent) => [...(e.features ?? [])].sort((a, b) => rankFeature(a.properties?.kind) - rankFeature(b.properties?.kind))[0];

  const onMouseMove = (e: MapLayerMouseEvent) => {
    const ft = topFeature(e);
    e.target.getCanvas().style.cursor = ft ? "pointer" : "";
    if (!ft) {
      setHoverFeature(null);
      if (!selected) setHover((h) => (h ? null : h));
      return;
    }
    const p = ft.properties as { kind: string; id: string; fid?: string; label?: string; ton?: number };
    const ref: FeatureRef = p.kind === "flow" ? { source: "sc-flows", id: p.id } : p.kind === "parcel" ? { source: "sc-parcels", id: p.id } : { source: "sc-nodes", id: p.fid ?? p.id };
    setHoverFeature(ref);
    let title = p.label ?? "";
    let sub = p.ton != null ? fmtTon(Number(p.ton)) : "";
    if (p.kind === "flow") {
      const s = segmentByKey.get(p.id);
      if (s) {
        title = `${flowLabel(s.from.key)} → ${flowLabel(s.to.key)}`;
        sub = `${fmtTon(s.ton)} · ${CHANNEL_LABEL[s.channel]}`;
      }
    } else if (p.kind === "parcel") {
      const pc = parcelById.get(p.id);
      title = pc?.farmerName ?? "Lahan";
      sub = pc?.ffbTon == null ? "produksi —" : `produksi ${fmtTon(pc.ffbTon)}`;
    } else if (p.kind === "mill") sub = `Mill · ${sub}`;
    else if (p.kind === "lembaga") sub = `Lembaga · ${sub}`;
    else if (p.kind === "offtaker") sub = `${OFFTAKER_TYPE_LABEL[offById.get(p.id)?.type ?? "AGEN"]} · ${sub}`;
    // Popup terbuka → tooltip disembunyikan; jangan ubah state (render ulang menghitung ulang isi popup).
    if (selected) return;
    const [lng, lat] = ft.geometry.type === "Point" ? (ft.geometry.coordinates as [number, number]) : [e.lngLat.lng, e.lngLat.lat];
    // Jangkar tetap selama kursor di fitur yang sama (garis juga) → state tak berubah tiap gerak, peta tak di-render ulang.
    const key = `${ref.source}:${ref.id}`;
    setHover((h) => (h && h.key === key ? h : { key, lng, lat, title, sub }));
  };

  const onClick = (e: MapLayerMouseEvent) => {
    const ft = topFeature(e);
    if (!ft) return setSelected(null);
    const p = ft.properties as { kind: string; id: string };
    const [lng, lat] = ft.geometry.type === "Point" ? (ft.geometry.coordinates as [number, number]) : [e.lngLat.lng, e.lngLat.lat];
    setSelected({ lng, lat, kind: p.kind, id: String(p.id) });
    setHover(null);
  };

  // ---- Aksi popup: filter & tautan Dashboard ---------------------------------
  const dashboardHref = useCallback(
    (patch: Partial<Record<ScFilterParam, string>> = {}) => {
      const p = new URLSearchParams(f.query);
      for (const [k, v] of Object.entries(patch)) p.set(k, v);
      const q = p.toString();
      return `/admin/dashboard/supply-chain${q ? `?${q}` : ""}`;
    },
    [f.query],
  );
  const applyFilter = (patch: Partial<Record<ScFilterParam, string>>, label: string) => {
    f.update(patch);
    setSelected(null);
    notifyFilter(label, "Peta dan Dashboard ikut tersaring. Lepas lewat bagian Filter di panel (Reset).");
  };

  const totalTon = records.reduce((a, r) => a + (r.supplyTon ?? 0), 0);
  const drawnTon = totalTon - undrawn.unknownMillTon - undrawn.millWithoutPointTon - undrawn.groupWithoutPointTon;
  const drawnPct = pctOf(drawnTon, totalTon);
  const undrawnTon = totalTon - drawnTon;
  const dimOpacity = (on: number, off: number) => ["case", ["get", "on"], on, off] as unknown as number;
  const hovered: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];
  const textPaint = { "text-color": dark ? "#f3f4f6" : "#111827", "text-halo-color": dark ? "#111827" : "#ffffff", "text-halo-width": 1.5 };
  const labelLayout: SymbolLayerSpecification["layout"] = { "text-field": ["get", "label"], "text-font": [labelFont], "text-size": 11, "text-offset": [0, 1.6], "text-anchor": "top", "text-optional": true, "symbol-sort-key": ["get", "rank"] };
  const labelKinds: FilterSpecification = ["all", ["in", ["get", "kind"], ["literal", ["lembaga", "mill"]]], ["get", "on"]];
  const scale = widthScaleSamples(maxSegTon);

  // Saklar lapisan — dipakai di bagian panel dan di popover tombol Lapisan kanan atas.
  const layerToggles = (
    <div className="space-y-2">
      <ToggleRow label="Garis alir" checked={showFlows} onChange={setShowFlows} />
      <ToggleRow label="Animasi arah TBS" hint={reducedMotion ? "Dimatikan: sistem meminta gerak dikurangi" : "Mati = panah arah"} checked={animate} onChange={setAnimateStored} disabled={reducedMotion || !showFlows} />
      <ToggleRow label="Label nama" hint={`Zoom jauh: ${TOP_LABELS} terbesar per jenis`} checked={showLabels} onChange={setShowLabels} />
      <ToggleRow label="Legenda di peta" checked={legendStored} onChange={setLegendStored} />
      {detail && <ToggleRow label="Titik lahan (Siak)" checked={showParcels} onChange={setShowParcels} />}
      {detail && <ToggleRow label="Garis lahan → Mill" checked={showParcelLines} onChange={setShowParcelLines} />}
    </div>
  );

  return (
    <div className="relative -m-6 h-[calc(100vh-3.5rem)] w-auto overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 101.3, latitude: 0.7, zoom: 8 }}
        mapStyle={mapStyle}
        interactiveLayerIds={["sc-flow", "sc-parcel", "sc-node-lembaga", "sc-node-offtaker", "sc-node-mill", "sc-mill-halo"]}
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
        onMouseMove={onMouseMove}
        onMouseOut={() => {
          setHoverFeature(null);
          setHover(null);
        }}
        onError={(e) => console.warn("Map source error:", e.error?.message ?? e.error)}
      >
        <Source id="sc-parcel-lines" type="geojson" data={parcelLineFc}>
          <Layer id="sc-parcel-line" type="line" paint={{ "line-color": ["get", "color"], "line-width": 0.6, "line-opacity": 0.25 }} />
        </Source>
        <Source id="sc-flows" type="geojson" data={flowFc} promoteId="id">
          <Layer
            id="sc-flow"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round", visibility: showFlows ? "visible" : "none" }}
            paint={{
              "line-color": ["get", "color"],
              "line-width": ["*", ["get", "w"], ["case", hovered, 1.35, 1]],
              "line-opacity": ["case", hovered, 0.95, dimOpacity(0.7, 0.08)],
            }}
          />
          {/* Titik bergerak searah TBS: dash putih tipis di atas garis, dasharray diputar oleh efek animasi. */}
          <Layer
            id="sc-flow-anim"
            type="line"
            filter={["get", "on"]}
            layout={{ "line-cap": "round", "line-join": "round", visibility: showFlows && animate ? "visible" : "none" }}
            paint={{ "line-color": "#ffffff", "line-width": ["*", ["get", "w"], 0.45], "line-opacity": 0.85, "line-dasharray": DASH_SEQUENCE[0] }}
          />
          <Layer
            id="sc-flow-arrow"
            type="symbol"
            filter={["get", "on"]}
            layout={{
              visibility: showFlows && !animate ? "visible" : "none",
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
        <Source id="sc-parcels" type="geojson" data={parcelFc} promoteId="id">
          <Layer
            id="sc-parcel"
            type="circle"
            layout={{ visibility: showParcels ? "visible" : "none" }}
            paint={{
              // "zoom" hanya boleh di interpolate tingkat atas → hover dibedakan di tiap stop.
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, ["case", hovered, 4, 1.6], 13, ["case", hovered, 8, 5]],
              "circle-color": ["get", "color"],
              "circle-opacity": dimOpacity(0.85, 0.12),
              "circle-stroke-width": ["case", hovered, 1.5, ["case", ["get", "survey"], 1, 0]],
              "circle-stroke-color": dark ? "#f9fafb" : "#111827",
            }}
          />
        </Source>
        <Source id="sc-nodes" type="geojson" data={nodeFc} promoteId="fid">
          {/* Lingkaran proporsional tonase di bawah ikon pabrik (ikon seragam) — biru = pemasok UL. */}
          <Layer
            id="sc-mill-halo"
            type="circle"
            filter={["==", ["get", "kind"], "mill"]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "ton"]], 0, 8, Math.sqrt(maxMillTon), 26],
              "circle-color": ["case", ["get", "ul"], MILL_UL_COLOR, MILL_COLOR],
              "circle-opacity": ["case", hovered, 0.3, dimOpacity(0.16, 0.04)],
              "circle-stroke-width": ["case", hovered, 2, 1],
              "circle-stroke-color": ["case", ["get", "ul"], MILL_UL_COLOR, MILL_COLOR],
              "circle-stroke-opacity": dimOpacity(0.45, 0.1),
            }}
          />
          <Layer
            id="sc-node-offtaker"
            type="circle"
            filter={["==", ["get", "kind"], "offtaker"]}
            paint={{ "circle-radius": ["case", hovered, 8, 6], "circle-color": "#d97706", "circle-stroke-width": 2, "circle-stroke-color": "#ffffff", "circle-opacity": dimOpacity(1, 0.2), "circle-stroke-opacity": dimOpacity(1, 0.2) }}
          />
          <Layer
            id="sc-node-lembaga"
            type="circle"
            filter={["==", ["get", "kind"], "lembaga"]}
            paint={{ "circle-radius": ["case", hovered, 10, 8], "circle-color": "#059669", "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff", "circle-opacity": dimOpacity(1, 0.2), "circle-stroke-opacity": dimOpacity(1, 0.2) }}
          />
          <Layer
            id="sc-node-mill"
            type="symbol"
            filter={["==", ["get", "kind"], "mill"]}
            layout={{ "icon-image": ["get", "icon"], "icon-size": 1, "icon-allow-overlap": true, "icon-ignore-placement": true }}
            paint={{ "icon-opacity": dimOpacity(1, 0.25) }}
          />
          {/* Label selektif: Mill/Lembaga terbesar selalu, sisanya saat zoom dekat — mengurangi tumpukan di sekitar
              Pekanbaru. Dua <Layer> langsung di bawah <Source> (bukan fragment) agar prop `source` tersuntik. */}
          {labelsReady && showLabels && <Layer id="sc-node-label-top" type="symbol" filter={["all", labelKinds, ["<=", ["get", "rank"], TOP_LABELS]]} layout={labelLayout} paint={textPaint} />}
          {labelsReady && showLabels && <Layer id="sc-node-label-rest" type="symbol" minzoom={LABEL_REST_ZOOM} filter={["all", labelKinds, [">", ["get", "rank"], TOP_LABELS]]} layout={labelLayout} paint={textPaint} />}
        </Source>

        {hover && !selected && (
          <Popup longitude={hover.lng} latitude={hover.lat} anchor="bottom" offset={14} closeButton={false} closeOnClick={false} maxWidth="none" className="sc-hover-tip">
            <div className="pointer-events-none px-2.5 py-1.5 text-xs">
              <div className="font-semibold">{hover.title}</div>
              <div className="text-muted-foreground">{hover.sub}</div>
            </div>
          </Popup>
        )}

        {selected && (
          <SelectedPopup key={popupKey} popupKey={popupKey!} selected={selected} onClose={() => setSelected(null)}>
            <SelectedCard selected={selected} view={view} records={records} segments={segments} totalTon={totalTon} onFilter={applyFilter} dashboardHref={dashboardHref} />
          </SelectedPopup>
        )}
      </Map>

      {panelOpen ? (
        <div className="absolute left-3 top-3 flex max-h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-lg border bg-card/95 shadow-lg backdrop-blur" style={{ width: PANEL_W }}>
          <div className="space-y-2 border-b p-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold">Peta Rantai Pasok</h1>
              <Badge variant="outline" className="gap-1"><FlaskConical className="h-3 w-3" /> Prototipe</Badge>
              {helpSlot}
              <button type="button" onClick={() => setPanelOpen(false)} className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Lipat panel">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-semibold tabular-nums">{fmtTon(totalTon)}</span>
              <span className="text-muted-foreground" title="Tonase yang garisnya sampai ke Mill berkoordinat">{drawnPct} tergambar</span>
              <Link href={dashboardHref()} className="inline-flex items-center gap-1 text-primary hover:underline">
                <BarChart3 className="h-3 w-3" /> Dashboard
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ModeToggle mode={mode} onChange={(m) => { setMode(m); setSelected(null); }} />
              {focusLabel && <FocusChip label={focusLabel} onClear={() => setSelected(null)} />}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {detail ? "Detail: garis singgah di agen/RAMP yang berkoordinat, plus titik lahan Siak." : "Ringkas: satu garis per Lembaga → Mill, tanpa singgah di offtaker."}{" "}
              Garis lurus menurut pengakuan survei {f.year ?? ""}, bukan rute angkut.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <PanelSection id="filter" icon={<FilterIcon className="h-3.5 w-3.5" />} title="Filter" aside={f.hasFilter && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Filter aktif" />}>
              <SupplyChainFilterBar f={f} years={view.years} vertical />
            </PanelSection>

            <PanelSection
              id="layers"
              icon={<Layers className="h-3.5 w-3.5" />}
              title="Lapisan"
              defaultOpen={false}
              closedAside={<span className="text-[11px] text-muted-foreground">{[showFlows && "garis", animate && showFlows && "animasi", showLabels && "label", detail && showParcels && "lahan"].filter(Boolean).join(" · ") || "semua mati"}</span>}
            >
              {layerToggles}
            </PanelSection>

            <PanelSection
              id="legend"
              icon={<ListTree className="h-3.5 w-3.5" />}
              title="Legenda"
              defaultOpen={false}
              closedAside={
                <span className="inline-flex items-center gap-1" aria-hidden>
                  {CHANNEL_ORDER.map((c) => (
                    <span key={c} className="inline-block h-1.5 w-4 rounded" style={{ background: channelColor(c, dark) }} />
                  ))}
                </span>
              }
            >
              <Legend dark={dark} detail={detail} scale={scale} animate={animate} />
            </PanelSection>

            <PanelSection id="summary" icon={<BarChart3 className="h-3.5 w-3.5" />} title="Ringkasan" aside={undrawnTon > 0 && <span className="text-[11px] text-muted-foreground">tidak tergambar {fmtTon(undrawnTon)}</span>} defaultOpen={false}>
              <div className="space-y-1 text-xs">
                <Row label="TBS" value={fmtTon(totalTon)} />
                <Row label="Tergambar sampai Mill" value={`${fmtTon(drawnTon)} (${drawnPct})`} />
                <div className="pt-2 font-medium">Tidak tergambar</div>
                <Row label="Mill tidak diketahui" value={fmtTon(undrawn.unknownMillTon)} />
                <UndrawnList label="Mill tanpa koordinat (tak ada di UML)" ton={undrawn.millWithoutPointTon} items={undrawnNames.mills.map((m) => ({ key: m.id, name: m.name, ton: m.ton }))} />
                {undrawn.groupWithoutPointTon > 0 && <UndrawnList label="Lembaga tanpa titik lokasi" ton={undrawn.groupWithoutPointTon} items={undrawnNames.groups.map((g) => ({ key: g.code, name: g.abrv, ton: g.ton }))} />}
                {detail && (
                  <>
                    <UndrawnList label={`Lewat ${undrawn.offtakersWithoutPoint} offtaker tanpa titik*`} ton={undrawn.skippedOfftakerTon} items={undrawnNames.offtakers.map((o) => ({ key: o.id, name: `${o.name} · ${OFFTAKER_TYPE_LABEL[o.type]}`, ton: o.ton }))} />
                    <p className="text-muted-foreground">* garis dilompatkan ke titik berikutnya; survei berikutnya perlu mencatat koordinat agen/RAMP.</p>
                  </>
                )}
              </div>
            </PanelSection>
          </div>
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
      {!panelOpen && focusLabel && (
        <div className="absolute left-3 top-14">
          <FocusChip label={focusLabel} onClear={() => setSelected(null)} />
        </div>
      )}

      {/* Tumpukan kontrol kanan atas (pola peta lain): zoom · Paskan · Lapisan · basemap. */}
      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        <div className="flex flex-col overflow-hidden rounded-md border bg-card/95 shadow backdrop-blur">
          <MapButton title="Perbesar" onClick={() => mapRef.current?.zoomIn()}><Plus className="h-4 w-4" /></MapButton>
          <MapButton title="Perkecil" onClick={() => mapRef.current?.zoomOut()} className="border-t"><Minus className="h-4 w-4" /></MapButton>
        </div>
        <MapButton title="Paskan ke semua data" onClick={fitAll} className="rounded-md border bg-card/95 shadow backdrop-blur"><Maximize className="h-4 w-4" /></MapButton>
        <Popover>
          <PopoverTrigger render={<MapButton title="Lapisan peta" className="rounded-md border bg-card/95 shadow backdrop-blur"><Layers className="h-4 w-4" /></MapButton>} />
          <PopoverContent align="end" className="w-64 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lapisan</div>
            {layerToggles}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger render={<MapButton title={`Basemap: ${MAP_STYLE_LABELS[styleKey].full}`} className="rounded-md border bg-card/95 shadow backdrop-blur"><MapIcon className="h-4 w-4" /></MapButton>} />
          <PopoverContent align="end" className="w-60 gap-0.5 p-1.5">
            {MAP_STYLE_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setStyleOverride(k)}
                className={cn("flex w-full flex-col items-start rounded px-2 py-1.5 text-left text-xs", styleKey === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              >
                <span className="font-semibold uppercase tracking-wider">{MAP_STYLE_LABELS[k].short}</span>
                <span className={cn("text-[11px]", styleKey === k ? "opacity-85" : "text-muted-foreground")}>{MAP_STYLE_LABELS[k].full}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Strip legenda mendatar di bawah tengah area peta yang bebas panel (owner 2026-10-10). Pembungkus membentang
          dari tepi panel sampai tepi kanan dan memusatkan strip — dulu titik tengah + translate(-50%) membatasi lebar
          strip ke jarak titik itu sampai tepi kanan, sehingga legenda terlipat 2–3 baris (QA lokal v1.6.0). */}
      <div className="pointer-events-none absolute bottom-6 right-3 z-10 flex justify-center" style={{ left: panelOpen ? PANEL_W + 24 : 12 }}>
        {legendStored ? (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border bg-card/95 py-1.5 pl-4 pr-2 text-xs shadow backdrop-blur">
            {CHANNEL_ORDER.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block h-1.5 w-5 rounded" style={{ background: channelColor(c, dark) }} /> {CHANNEL_LABEL[c].replace("Lewat ", "").replace("Langsung ke ", "→ ")}
              </span>
            ))}
            <span className="h-4 w-px bg-border" aria-hidden />
            <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-emerald-600" /> Lembaga</span>
            {detail && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-amber-600" /> Offtaker</span>}
            <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Factory className="h-3.5 w-3.5" style={{ color: MILL_UL_COLOR }} /> Mill UL</span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Factory className="h-3.5 w-3.5" style={{ color: MILL_COLOR }} /> Mill lain</span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Factory className="h-3.5 w-3.5" style={{ color: MILL_UNCERTAIN_COLOR }} /> Belum pasti</span>
            <button type="button" onClick={() => setLegendStored(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Sembunyikan legenda" title="Sembunyikan legenda">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setLegendStored(true)} className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border bg-card/95 px-3 py-1.5 text-xs shadow backdrop-blur hover:bg-muted">
            <ListTree className="h-3.5 w-3.5" /> Legenda
          </button>
        )}
      </div>
      <style>{`.sc-hover-tip{z-index:15;pointer-events:none}.sc-hover-tip .maplibregl-popup-content{box-shadow:0 6px 16px -6px rgb(0 0 0 / .35)!important;border-radius:var(--radius-md)!important}`}</style>
    </div>
  );
}

const SECTION_STATES = ["open", "closed"] as const;

/** Bagian panel yang bisa dilipat; posisi lipat diingat per browser. */
function PanelSection({
  id,
  icon,
  title,
  aside,
  closedAside,
  defaultOpen = true,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  /** Selalu tampil di kanan judul. */
  aside?: React.ReactNode;
  /** Ringkasan isi, hanya saat bagian terlipat (owner 2026-10-10: judul terlipat tetap informatif). */
  closedAside?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useStoredChoice(`map:section:${id}`, defaultOpen ? "open" : "closed", SECTION_STATES);
  const open = state === "open";
  return (
    <section className="border-b last:border-0">
      <button
        type="button"
        onClick={() => setState(open ? "closed" : "open")}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", !open && "-rotate-90")} />
        {icon}
        {title}
        <span className="ml-auto inline-flex items-center gap-2 normal-case tracking-normal">
          {!open && closedAside}
          {aside}
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}

/** Legenda lengkap di bagian Legenda panel (strip ringkas di peta digambar terpisah). */
function Legend({ dark, detail, scale, animate }: { dark: boolean; detail: boolean; scale: { ton: number; width: number }[]; animate: boolean }) {
  return (
    <div className="space-y-3 text-xs">
      <div className="space-y-1.5">
        <div className="font-medium">Jalur TBS (warna garis)</div>
        {CHANNEL_ORDER.map((c) => (
          <div key={c} className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-block h-1.5 w-6 rounded" style={{ background: channelColor(c, dark) }} /> {CHANNEL_LABEL[c]}
          </div>
        ))}
        <div className="text-muted-foreground">{animate ? "titik bergerak" : "panah"} = arah TBS</div>
      </div>
      {scale.length > 0 && (
        <div className="space-y-1.5 border-t pt-2">
          <div className="font-medium">Tebal garis = tonase</div>
          <div className="flex items-end gap-4">
            {scale.map((s) => (
              <div key={s.ton} className="flex flex-col items-center gap-1 text-muted-foreground">
                <span className="block w-8 rounded-full bg-foreground/60" style={{ height: s.width }} />
                <span className="tabular-nums">{fmtTon(s.ton)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1.5 border-t pt-2">
        <div className="font-medium">Titik</div>
        <div className="flex items-center gap-2 text-muted-foreground"><span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-emerald-600" /> Lembaga</div>
        {detail && <div className="flex items-center gap-2 text-muted-foreground"><span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-amber-600" /> Agen / RAMP / KUD berkoordinat</div>}
        <div className="flex items-center gap-2 text-muted-foreground"><Factory className="h-4 w-4" style={{ color: MILL_UL_COLOR }} /> Mill pemasok UL</div>
        <div className="flex items-center gap-2 text-muted-foreground"><Factory className="h-4 w-4" style={{ color: MILL_COLOR }} /> Mill lain</div>
        <div className="flex items-center gap-2 text-muted-foreground"><Factory className="h-4 w-4" style={{ color: MILL_UNCERTAIN_COLOR }} /> {MILL_STATUS_LABEL.PKS_BELUM_PASTI}</div>
        <div className="text-muted-foreground">Lingkaran di bawah ikon ∝ tonase Mill</div>
        {detail && <div className="flex items-center gap-2 text-muted-foreground"><span className="inline-block h-2.5 w-2.5 rounded-full border border-foreground bg-muted" /> Titik lahan dari koordinat survei</div>}
      </div>
    </div>
  );
}

/** Tombol ikon 36×36 untuk tumpukan kontrol peta. */
function MapButton({ title, onClick, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { title: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn("flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Chip status sorot jaringan (menggantikan pil tengah atas). */
function FocusChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-0.5 pl-2 pr-1 text-xs">
      <span className="truncate">Menyorot: <span className="font-medium">{label}</span></span>
      <button type="button" onClick={onClear} aria-label="Berhenti menyorot" className="rounded-full p-0.5 text-muted-foreground hover:bg-primary/20 hover:text-foreground">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function ToggleRow({ label, hint, checked, onChange, disabled = false }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-2 text-xs", disabled && "opacity-60")}>
      <span>
        {label}
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
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

/** Baris "tidak tergambar" dengan daftar nama yang bisa dibuka. */
function UndrawnList({ label, ton, items }: { label: string; ton: number; items: { key: string; name: string; ton: number }[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return <Row label={label} value={fmtTon(ton)} />;
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-left hover:text-foreground">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} /> {label} ({items.length})
        </span>
        <span className="tabular-nums font-medium">{fmtTon(ton)}</span>
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 pl-4 text-muted-foreground">
          {items.slice(0, UNDRAWN_LIST_MAX).map((it) => (
            <li key={it.key} className="flex justify-between gap-2"><span className="truncate">{it.name}</span><span className="shrink-0 tabular-nums">{fmtTon(it.ton)}</span></li>
          ))}
          {items.length > UNDRAWN_LIST_MAX && <li>+{items.length - UNDRAWN_LIST_MAX} lagi</li>}
        </ul>
      )}
    </div>
  );
}

/**
 * <Popup> + state geser dipisah ke komponen sendiri: tiap pointermove saat menggeser
 * hanya me-render popup ini, bukan seluruh peta. Isi kartu (`children`) dibuat induk,
 * jadi tidak dihitung ulang selama digeser.
 */
function SelectedPopup({ popupKey, selected, onClose, children }: { popupKey: string; selected: NonNullable<Selected>; onClose: () => void; children: React.ReactNode }) {
  const drag = useMapPopupDrag(popupKey);
  return (
    <Popup {...MAP_POPUP_PROPS} offset={drag.offset} longitude={selected.lng} latitude={selected.lat} onClose={onClose}>
      <MapPopupDragHandle {...drag.handleProps} />
      {children}
    </Popup>
  );
}

function topBy<T>(items: T[], key: (t: T) => string, val: (t: T) => number, n = 5) {
  const m = new globalThis.Map<string, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + val(it));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** Footer aksi popup: jadikan filter · lihat di Dashboard. */
function PopupActions({ onFilter, href }: { onFilter: () => void; href: string }) {
  return (
    <div className="flex items-center gap-2 border-t bg-muted/30 px-3.5 py-2 text-xs">
      <button type="button" onClick={onFilter} className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 font-medium hover:border-primary hover:text-primary">
        <FilterIcon className="h-3 w-3" /> Jadikan filter
      </button>
      <Link href={href} className="inline-flex items-center gap-1 text-primary hover:underline">
        <BarChart3 className="h-3 w-3" /> Lihat di Dashboard
      </Link>
    </div>
  );
}

/** Pengganti aksi bila entitas tak bisa diwakili filter (offtaker kedua non-RAMP). */
function PopupNoFilter() {
  return <p className="border-t bg-muted/30 px-3.5 py-2 text-[11px] text-muted-foreground">Offtaker ini hanya tercatat sebagai pembeli kedua (bukan RAMP), jadi belum bisa dijadikan filter Agen/RAMP.</p>;
}

function SelectedCard({
  selected,
  view,
  records,
  segments,
  totalTon,
  onFilter,
  dashboardHref,
}: {
  selected: NonNullable<Selected>;
  view: SupplyChainMapView;
  records: ScRecord[];
  segments: ReturnType<typeof buildFlowSegments>["segments"];
  totalTon: number;
  onFilter: (patch: Partial<Record<ScFilterParam, string>>, label: string) => void;
  dashboardHref: (patch?: Partial<Record<ScFilterParam, string>>) => string;
}) {
  const mills = new globalThis.Map(view.data.mills.map((m) => [m.id, m]));
  const offs = new globalThis.Map(view.data.offtakers.map((o) => [o.id, o]));
  const groups = new globalThis.Map(view.data.groups.map((g) => [g.code, g]));
  const millName = (id: string | null) => (id && mills.get(id) ? millLabel(mills.get(id)!) : "Mill tidak diketahui");
  const ton = (rs: ScRecord[]) => rs.reduce((a, r) => a + (r.supplyTon ?? 0), 0);
  const list = (rows: [string, number][]) => rows.map(([k, v]) => ({ label: k, value: fmtTon(v) }));
  // Mill tujuan = agregasi yang sama dengan tabel Volume per Mill (Mill tak diketahui satu baris).
  const millRows = (rs: ScRecord[]) =>
    millVolumes(rs, mills).slice(0, 5).map((m) => ({ id: m.millId ?? "?", label: m.name, value: fmtTon(m.ton), badge: m.isUl && <UlBadge /> }));
  const count = (xs: (string | null)[]) => new Set(xs.filter(Boolean)).size;

  let body: React.ReactNode = null;
  if (selected.kind === "mill") {
    const m = mills.get(selected.id);
    const rs = records.filter((r) => r.millId === selected.id);
    const otherPrograms = m ? m.buyerPrograms.filter((p) => p !== "UL") : [];
    const dist = distanceStats(rs, view.data, millKeyOf).get(selected.id);
    const status = rs.some((r) => r.millStatus === "PKS_PASTI") ? "PKS_PASTI" : (rs[0]?.millStatus ?? "PKS_PASTI");
    body = m && (
      <>
        <MapPopupHeader accent="blue" icon={<Factory className="h-5 w-5" />} title={millLabel(m)} badge={isUlMill(m) && <UlBadge />} rows={[{ label: "UML ID", value: m.umlId ?? "— (manual)", mono: true }, { label: "Distrik", value: millDistrict(m) ?? "—" }]} />
        <MapPopupHighlight label="TBS" value={`${fmtTon(ton(rs))} · ${pctOf(ton(rs), totalTon)}`} />
        <div className="space-y-2 px-3.5 py-2.5">
          {/* UL sudah diwakili badge di header; program buyer lain (bila kelak ada) tetap tampil. */}
          <MapPopupRows rows={[
            { label: "Status", value: MILL_STATUS_LABEL[status] },
            ...(otherPrograms.length ? [{ label: "Program buyer lain", value: otherPrograms.join(", ") }] : []),
            { label: "RSPO", value: m.rspoStatus },
            { label: "Lembaga · offtaker", value: `${count(rs.map((r) => r.groupCode))} · ${count(rs.flatMap((r) => [r.offtakerId, r.nextOfftakerId]))}` },
            { label: "Jarak rata-rata (garis lurus)", value: fmtKm(dist?.avgKm ?? null) },
          ]} />
          <div className="text-[11px] font-medium text-muted-foreground">Lembaga pemasok teratas</div>
          <MapPopupRows rows={list(topBy(rs, (r) => groups.get(r.groupCode)?.abrv ?? r.groupCode, (r) => r.supplyTon ?? 0))} />
        </div>
        <PopupActions onFilter={() => onFilter({ mill: m.id }, millLabel(m))} href={dashboardHref({ mill: m.id })} />
      </>
    );
  } else if (selected.kind === "lembaga") {
    const g = groups.get(selected.id);
    const rs = records.filter((r) => r.groupCode === selected.id);
    const gv = groupVolumes(rs, view.data)[0];
    body = g && (
      <>
        <MapPopupHeader accent="emerald" icon={<Building2 className="h-5 w-5" />} title={g.name} rows={[{ label: "Kode", value: g.code, mono: true }, { label: "Distrik", value: g.districtName }]} />
        <MapPopupHighlight label="TBS" value={`${fmtTon(ton(rs))} · ${pctOf(ton(rs), totalTon)}`} />
        <div className="space-y-2 px-3.5 py-2.5">
          {gv && (
            <MapPopupRows rows={[
              { label: "Ke Mill UL · PKS pasti", value: `${pctOf(gv.ulTon, gv.ton)} · ${pctOf(gv.pastiTon, gv.ton)}` },
              { label: "Offtaker utama", value: gv.mainOfftaker ? `${gv.mainOfftaker.name} (${pctOf(gv.mainOfftaker.ton, gv.ton)})` : "langsung ke Mill" },
              { label: "Jarak rata-rata (garis lurus)", value: fmtKm(gv.avgKm) },
            ]} />
          )}
          <div className="text-[11px] font-medium text-muted-foreground">Mill tujuan teratas</div>
          <MapPopupRows rows={millRows(rs)} />
        </div>
        <PopupActions onFilter={() => onFilter({ lembaga: g.code }, g.abrv)} href={dashboardHref({ lembaga: g.code })} />
      </>
    );
  } else if (selected.kind === "offtaker") {
    const o = offs.get(selected.id);
    const rs = records.filter((r) => r.offtakerId === selected.id || r.nextOfftakerId === selected.id);
    // Patch hanya bila filter Agen/RAMP benar-benar menangkap record offtaker ini (review 2026-10-10).
    const patch = offtakerFilterPatch(selected.id, rs, offs);
    body = o && (
      <>
        <MapPopupHeader accent="amber" icon={<Truck className="h-5 w-5" />} title={o.name} rows={[{ label: "Kode", value: o.id, mono: true }, { label: "Tipe", value: OFFTAKER_TYPE_LABEL[o.type] }]} />
        <MapPopupHighlight label="TBS melewati" value={`${fmtTon(ton(rs))} · ${pctOf(ton(rs), totalTon)}`} />
        <div className="space-y-2 px-3.5 py-2.5">
          <MapPopupRows rows={[{ label: "Lembaga pemasok", value: count(rs.map((r) => r.groupCode)) }]} />
          <div className="text-[11px] font-medium text-muted-foreground">Mill tujuan</div>
          <MapPopupRows rows={millRows(rs)} />
        </div>
        {patch ? <PopupActions onFilter={() => onFilter(patch, o.name)} href={dashboardHref(patch)} /> : <PopupNoFilter />}
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
          <MapPopupRows rows={rs.map((r) => ({ id: r.id, label: `${r.offtakerId ? offs.get(r.offtakerId)?.name ?? r.offtakerId : "Langsung"} → ${millName(r.millId)}`, value: r.supplyTon == null ? "—" : fmtTon(r.supplyTon) }))} />
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
        <MapPopupRows rows={[{ label: "Jalur", value: CHANNEL_LABEL[s.channel] }, { label: "Tonase", value: `${fmtTon(s.ton)} · ${pctOf(s.ton, totalTon)}` }]} />
      </div>
    );
  }
  return <div className="w-[300px] overflow-hidden rounded-md">{body ?? <div className="p-3 text-xs text-muted-foreground">Data tidak ditemukan pada filter ini.</div>}</div>;
}

