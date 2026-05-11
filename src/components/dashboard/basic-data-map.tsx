import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import MapGL, { MapRef, Source, Layer } from "react-map-gl/maplibre"
import { Search, Locate, Leaf, Compass, Layers } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { REGION_COORDINATES, type MapStyleKey } from "@/lib/map-utils"

interface FarmerGroupData {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  totalPetani: number;
  maleFarmers: number;
  femaleFarmers: number;
  totalParcels: number;
  totalArea: string;
  trainingPackage1: number;
  trainingPackage2MK: number;
  trainingPackage2HSE: number;
  trainingPackage34: number;
}

interface BasicDataMapProps {
  groups: FarmerGroupData[]
  distrik: string
  selectedGroup: FarmerGroupData | null
  setSelectedGroup: (group: FarmerGroupData | null) => void
  mapSearch: string
  setMapSearch: (search: string) => void
}

export function BasicDataMap({ groups, distrik, selectedGroup, setSelectedGroup, mapSearch, setMapSearch }: BasicDataMapProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const mapRef = useRef<MapRef>(null)
  const [iconsReady, setIconsReady] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [activeStyle, setActiveStyle] = useState<MapStyleKey | null>(null)
  const [showBasemapMenu, setShowBasemapMenu] = useState(false)
  const [hasManuallySelectedStyle, setHasManuallySelectedStyle] = useState(false)

  useEffect(() => setMounted(true), [])

  // Close basemap menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBasemapMenu) {
        setShowBasemapMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showBasemapMenu])

  const renderableGroups = groups.filter((g) =>
    Number.isFinite(g.lat) &&
    Number.isFinite(g.lng) &&
    Math.abs(g.lat) <= 90 &&
    Math.abs(g.lng) <= 180
  )

  const geojson = {
    type: "FeatureCollection",
    features: renderableGroups.map((g) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [g.lng, g.lat] },
      properties: { id: g.id, name: g.name },
    })),
  } as const

  // Precompute a simple "isolation score" so labels for sparse points win collisions.
  // Higher score => show first when there is a collision.
  const geojsonWithPriority = (() => {
    const R = 6371; // km
    const toRad = (v: number) => (v * Math.PI) / 180;
    const distKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const dLat = toRad(bLat - aLat);
      const dLng = toRad(bLng - aLng);
      const sa = Math.sin(dLat / 2);
      const sb = Math.sin(dLng / 2);
      const x = sa * sa + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sb * sb;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
    };

    const pts = renderableGroups.map((g) => ({ id: g.id, lat: g.lat, lng: g.lng }));
    const nearest: Record<string, number> = {};
    for (let i = 0; i < pts.length; i += 1) {
      let best = Number.POSITIVE_INFINITY;
      for (let j = 0; j < pts.length; j += 1) {
        if (i === j) continue;
        const d = distKm(pts[i].lat, pts[i].lng, pts[j].lat, pts[j].lng);
        if (d < best) best = d;
      }
      nearest[pts[i].id] = Number.isFinite(best) ? best : 9999;
    }

    return {
      type: "FeatureCollection",
      features: renderableGroups.map((g) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [g.lng, g.lat] },
        properties: {
          id: g.id,
          name: g.name,
          // cap to keep sort-key bounded; still monotonic.
          isolationScore: Math.min(100, Math.round(nearest[g.id] * 10) / 10),
        },
      })),
    } as const;
  })();

  const ensureIcons = () => {
    const map = mapRef.current?.getMap?.()
    if (!map) return
    if (map.hasImage("farmer-group") && map.hasImage("farmer-group-active")) {
      setIconsReady(true)
      return
    }

    const loadPng = (name: string, url: string) =>
      new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          try {
            if (!map.hasImage(name)) map.addImage(name, img, { pixelRatio: 2 })
            resolve()
          } catch (e) {
            reject(e)
          }
        }
        img.onerror = () => reject(new Error(`Failed to load ${url}`))
        img.src = url
      })

    Promise.all([
      map.hasImage("farmer-group") ? Promise.resolve() : loadPng("farmer-group", "/markers/farmer-group.png"),
      map.hasImage("farmer-group-active")
        ? Promise.resolve()
        : loadPng("farmer-group-active", "/markers/farmer-group-active.png"),
    ])
      .then(() => setIconsReady(true))
      .catch(() => {
        // ignore; we'll retry on next onLoad/onStyleData
      })
  }

  // Basemap configuration
  const GOOGLE_SATELLITE_TILES = [
    "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
  ];
  const GOOGLE_HYBRID_TILES = [
    "https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  ];

  function buildRasterStyle(tiles: string[]) {
    return {
      version: 8,
      sources: {
        "raster-tiles": { type: "raster", tiles, tileSize: 256, attribution: "© Google" },
      },
      layers: [{ id: "raster-layer", type: "raster", source: "raster-tiles", minzoom: 0, maxzoom: 22 }],
    };
  }

  const MAP_STYLES: Record<MapStyleKey, { label: string; style: string | any; isRaster: boolean }> = {
    light: { label: "Light", style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json", isRaster: false },
    dark: { label: "Dark", style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json", isRaster: false },
    satellite: { label: "Satellite", style: buildRasterStyle(GOOGLE_SATELLITE_TILES), isRaster: true },
    hybrid: { label: "Hybrid", style: buildRasterStyle(GOOGLE_HYBRID_TILES), isRaster: true },
  };

  const getCurrentStyleLabel = () => {
    if (!hasManuallySelectedStyle) {
      return `Auto (${resolvedTheme === "dark" ? "Dark" : "Light"})`;
    }
    return MAP_STYLES[currentStyle].label;
  };

  const defaultStyle: MapStyleKey = resolvedTheme === "dark" ? "dark" : "light";
  const currentStyle = activeStyle ?? defaultStyle;
  const mapStyle = MAP_STYLES[currentStyle].style;
  const isRaster = MAP_STYLES[currentStyle].isRaster;

  useEffect(() => {
    if (mapRef.current && REGION_COORDINATES[distrik]) {
      const t = REGION_COORDINATES[distrik]
      mapRef.current.flyTo({ center: [t.longitude, t.latitude], zoom: t.zoom, duration: 1200, essential: true })
    }
  }, [distrik])

  // Auto-switch basemap when theme changes (only if user hasn't manually selected a style)
  useEffect(() => {
    if (!hasManuallySelectedStyle) {
      // Only auto-switch if user hasn't manually selected a basemap
      const themeBasedStyle: MapStyleKey = resolvedTheme === "dark" ? "dark" : "light";
      setActiveStyle(themeBasedStyle);
    }
  }, [resolvedTheme, hasManuallySelectedStyle])

  const resetNorthAndTilt = () => {
    if (mapRef.current) {
      mapRef.current.resetNorthPitch({ duration: 800 });
    }
  };

  const zoomToAll = () => {
    setSelectedGroup(null)
    setMapSearch("")
    const t = REGION_COORDINATES["All"]
    mapRef.current?.flyTo({ center: [t.longitude, t.latitude], zoom: t.zoom, duration: 1200, essential: true })
  }

  const handleMarkerClick = (group: FarmerGroupData) => {
    setSelectedGroup(group)
    mapRef.current?.flyTo({ center: [group.lng, group.lat], zoom: 11, duration: 1000, essential: true })
  }

  return (
    <div className="w-[60%] relative bg-muted shrink-0">
      {mounted ? (
        <MapGL
          ref={mapRef}
          initialViewState={REGION_COORDINATES["All"]}
          mapStyle={mapStyle}
          interactive={true}
          attributionControl={false}
          interactiveLayerIds={["group-points"]}
          onLoad={ensureIcons}
          onStyleData={ensureIcons}
          onMouseMove={(e) => {
            const f = e.features?.[0];
            const id = f?.properties?.id ? String(f.properties.id) : null;
            setHoveredId(id);
          }}
          onMouseLeave={() => setHoveredId(null)}
          onClick={(e) => {
            const f = e.features?.[0];
            if (!f?.properties?.id) {
              setSelectedGroup(null);
              return;
            }
            const id = String(f.properties.id);
            const found = renderableGroups.find((g) => g.id === id);
            if (found) handleMarkerClick(found);
          }}
          cursor={hoveredId ? "pointer" : "grab"}
          style={{ width: "100%", height: "100%" }}
        >
          <Source id="groups" type="geojson" data={geojsonWithPriority}>
            <Layer
              id="group-points"
              type="symbol"
              layout={{
                "icon-image": [
                  "case",
                  [
                    "any",
                    ["==", ["get", "id"], selectedGroup?.id ?? ""],
                    ["==", ["get", "id"], hoveredId ?? ""],
                  ],
                  "farmer-group-active",
                  "farmer-group",
                ],
                "icon-size": [
                  "case",
                  ["==", ["get", "id"], selectedGroup?.id ?? ""],
                  1.05,
                  ["==", ["get", "id"], hoveredId ?? ""],
                  1.05,
                  0.7,
                ],
                "icon-anchor": "bottom",
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
              }}
            />

            {/* Non-selected labels: only show when zoomed in and let MapLibre hide colliding labels */}
            <Layer
              id="group-labels"
              type="symbol"
              minzoom={7.5}
              filter={selectedGroup?.id ? ["!=", ["get", "id"], selectedGroup.id] : undefined}
              layout={{
                "text-field": [
                  "let",
                  "n",
                  ["get", "name"],
                  [
                    "case",
                    [">", ["length", ["var", "n"]], 22],
                    ["concat", ["slice", ["var", "n"], 0, 21], "…"],
                    ["var", "n"],
                  ],
                ],
                "text-size": 11,
                "text-font": ["Open Sans Semibold", "Arial Unicode MS Regular"],
                "text-variable-anchor": ["top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right"],
                "text-radial-offset": 0.6,
                "text-justify": "auto",
                "text-padding": 2,
                "text-max-width": 12,
                // Prefer labels for more isolated points so "lonely" markers show up.
                "symbol-sort-key": ["*", -1, ["get", "isolationScore"]],
                "text-allow-overlap": false,
                "text-ignore-placement": false,
                "text-optional": true,
              }}
              paint={{
                "text-color": isRaster ? "#f3f4f6" : (resolvedTheme === "dark" ? "#e5e7eb" : "#111827"),
                "text-halo-color": isRaster ? "rgba(0,0,0,0.85)" : (resolvedTheme === "dark" ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)"),
                "text-halo-width": 1.6,
              }}
            />

            {/* Hover label: always show and highlight in blue */}
            <Layer
              id="group-label-hover"
              type="symbol"
              filter={
                hoveredId
                  ? ["all", ["==", ["get", "id"], hoveredId], ["!=", ["get", "id"], selectedGroup?.id ?? "___none___"]]
                  : ["==", ["get", "id"], "___none___"]
              }
              layout={{
                "text-field": ["get", "name"],
                "text-size": 12,
                "text-font": ["Open Sans Bold", "Arial Unicode MS Regular"],
                "text-anchor": "top",
                "text-offset": [0, 0.6],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-max-width": 14,
              }}
              paint={{
                "text-color": isRaster ? "#ffffff" : "#3b82f6",
                "text-halo-color": isRaster ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.9)",
                "text-halo-width": 2,
              }}
            />

            {/* Selected label: always show on top */}
            <Layer
              id="group-label-selected"
              type="symbol"
              filter={selectedGroup?.id ? ["==", ["get", "id"], selectedGroup.id] : ["==", ["get", "id"], "___none___"]}
              layout={{
                "text-field": ["get", "name"],
                "text-size": 12,
                "text-font": ["Open Sans Bold", "Arial Unicode MS Regular"],
                "text-anchor": "top",
                "text-offset": [0, 0.6],
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-max-width": 14,
              }}
              paint={{
                "text-color": isRaster ? "#ffffff" : "#3b82f6",
                "text-halo-color": isRaster ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.9)",
                "text-halo-width": 2,
              }}
            />
          </Source>

          {!iconsReady && process.env.NODE_ENV !== "production" ? (
            <div className="absolute top-12 left-3 text-[10px] px-2 py-1 rounded bg-background/80 backdrop-blur border shadow-sm">
              loading marker icons…
            </div>
          ) : null}
        </MapGL>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <Leaf className="w-8 h-8 text-primary/20" />
        </div>
      )}

      {/* Floating controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs bg-background/90 backdrop-blur-sm border-border/80 shadow-sm rounded-md"
            placeholder="Cari kelompok tani..."
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-1">
          {/* Basemap selector */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs font-semibold bg-background/90 backdrop-blur-sm border border-border/80 rounded-md shadow-sm hover:bg-accent transition-colors flex items-center gap-1.5"
              onClick={() => setShowBasemapMenu(!showBasemapMenu)}
            >
              <Layers className="h-3.5 w-3.5" />
              {getCurrentStyleLabel()}
            </Button>
            
            {showBasemapMenu && (
              <div className="absolute top-full right-0 mt-1 bg-background/95 backdrop-blur-sm border border-border/80 rounded-md shadow-lg z-50 min-w-[120px]">
                {/* Auto Theme Option */}
                <button
                  className={`w-full px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors first:rounded-t-md ${
                    !hasManuallySelectedStyle ? 'bg-accent font-medium' : ''
                  }`}
                  onClick={() => {
                    setHasManuallySelectedStyle(false);
                    setActiveStyle(null);
                    setShowBasemapMenu(false);
                  }}
                >
                  Auto (Theme)
                </button>
                
                {/* Divider */}
                <div className="h-px bg-border my-1" />
                
                {Object.entries(MAP_STYLES).map(([key, config]) => (
                  <button
                    key={key}
                    className={`w-full px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors last:rounded-b-md ${
                      hasManuallySelectedStyle && currentStyle === key ? 'bg-accent font-medium' : ''
                    }`}
                    onClick={() => {
                      setActiveStyle(key as MapStyleKey);
                      setHasManuallySelectedStyle(true);
                      setShowBasemapMenu(false);
                    }}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Reset North button */}
          <Button
            size="sm"
            variant="outline"
            onClick={resetNorthAndTilt}
            className="h-8 px-3 text-xs font-semibold bg-background/90 backdrop-blur-sm border border-border/80 rounded-md shadow-sm hover:bg-accent transition-colors flex items-center gap-1.5"
          >
            <Compass className="h-3.5 w-3.5" />
            Reset North
          </Button>
          
          {/* Zoom to All button */}
          <Button
            size="sm"
            variant="outline"
            onClick={zoomToAll}
            className="h-8 px-3 text-xs font-semibold bg-background/90 backdrop-blur-sm border border-border/80 rounded-md shadow-sm hover:bg-accent transition-colors flex items-center gap-1.5"
          >
            <Locate className="h-3.5 w-3.5" />
            Lihat Semua
          </Button>
        </div>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-2 left-2 text-[10px] px-2 py-1 rounded bg-background/80 backdrop-blur border shadow-sm">
        {isRaster ? "© Google" : "© CartoDB · © OpenStreetMap"}
      </div>

      {mounted && process.env.NODE_ENV !== "production" ? (
        <div className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded bg-background/80 backdrop-blur border shadow-sm">
          <div>markers: {renderableGroups.length}/{groups.length}</div>
          {renderableGroups[0] ? (
            <div className="opacity-80">
              first: {renderableGroups[0].name} ({renderableGroups[0].lat.toFixed(4)},{renderableGroups[0].lng.toFixed(4)})
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
