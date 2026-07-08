"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import Map, { Source, Layer, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Search, Check, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { KTDetails } from "@/types/dashboard";

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

interface Props {
  kelompokTaniList: KTDetails[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DashboardMap({ kelompokTaniList, selectedId, onSelect }: Props) {
  const mapRef = useRef<MapRef>(null);
  const { resolvedTheme } = useTheme();

  // Basemap defaults to the app theme; user can still override via the switcher.
  const [styleKey, setStyleKey] = useState<keyof typeof MAP_STYLES>("light");
  const userPickedStyle = useRef(false);
  useEffect(() => {
    if (!userPickedStyle.current) {
      setStyleKey(resolvedTheme === "dark" ? "dark" : "light");
    }
  }, [resolvedTheme]);

  const [searchOpen, setSearchOpen] = useState(false);

  const mapped = useMemo(
    () => kelompokTaniList.filter((kt) => kt.locationLat != null && kt.locationLong != null),
    [kelompokTaniList]
  );

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: mapped.map((kt) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [kt.locationLong as number, kt.locationLat as number] },
        properties: { id: kt.id, name: kt.name },
      })),
    }),
    [mapped]
  );

  const fitAll = useCallback(() => {
    const map = mapRef.current;
    if (!map || mapped.length === 0) return;

    if (mapped.length === 1) {
      map.easeTo({ center: [mapped[0].locationLong as number, mapped[0].locationLat as number], zoom: 12 });
      return;
    }
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const kt of mapped) {
      minLng = Math.min(minLng, kt.locationLong as number);
      maxLng = Math.max(maxLng, kt.locationLong as number);
      minLat = Math.min(minLat, kt.locationLat as number);
      maxLat = Math.max(maxLat, kt.locationLat as number);
    }
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 13, duration: 600 });
  }, [mapped]);

  useEffect(() => {
    fitAll();
  }, [fitAll]);

  const flyToKt = (kt: KTDetails) => {
    mapRef.current?.easeTo({
      center: [kt.locationLong as number, kt.locationLat as number],
      zoom: 13,
      duration: 700,
    });
    onSelect(kt.id);
  };

  if (mapped.length === 0) {
    return (
      <div className="h-full min-h-[420px] flex flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 text-center p-6">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground max-w-sm">
          Tidak ada data lokasi yang tersedia untuk ditampilkan di peta
        </p>
      </div>
    );
  }

  const clusterLayer = {
    id: "clusters",
    type: "circle" as const,
    filter: ["has", "point_count"] as any,
    paint: {
      "circle-color": "#2563eb",
      "circle-opacity": 0.85,
      "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28] as any,
    },
  };

  const clusterCountLayer = {
    id: "cluster-count",
    type: "symbol" as const,
    filter: ["has", "point_count"] as any,
    layout: {
      "text-field": ["get", "point_count_abbreviated"] as any,
      "text-font": ["Open Sans Regular", "Noto Sans Regular"],
      "text-size": 12,
    },
    paint: { "text-color": "#ffffff" },
  };

  const pointLayer = {
    id: "unclustered-point",
    type: "circle" as const,
    filter: ["!", ["has", "point_count"]] as any,
    paint: {
      "circle-color": ["case", ["==", ["get", "id"], selectedId ?? ""], "#f59e0b", "#22c55e"] as any,
      "circle-radius": 8,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  };

  const handleClick = (e: any) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const map = mapRef.current;

    if (feature.properties?.cluster) {
      const source: any = map?.getSource("kt-source");
      const clusterId = feature.properties.cluster_id;
      source?.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;
        map?.easeTo({ center: feature.geometry.coordinates, zoom });
      });
      return;
    }
    if (feature.properties?.id) onSelect(feature.properties.id);
  };

  return (
    <div className="relative h-full min-h-[420px] w-full rounded-md overflow-hidden border">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 101.8, latitude: 0.6, zoom: 9 }}
        mapStyle={MAP_STYLES[styleKey] as any}
        interactiveLayerIds={["clusters", "unclustered-point"]}
        onClick={handleClick}
        onMouseEnter={(e) => (e.target.getCanvas().style.cursor = "pointer")}
        onMouseLeave={(e) => (e.target.getCanvas().style.cursor = "")}
      >
        <Source id="kt-source" type="geojson" data={geojson} cluster clusterMaxZoom={14} clusterRadius={50}>
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...pointLayer} />
        </Source>
      </Map>

      {/* Top-left controls: search KT + see all */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 bg-background/90 backdrop-blur-sm shadow-md"
                title="Cari Kelompok Tani"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs">Cari KT</span>
              </Button>
            }
          />
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Cari kelompok tani..." />
              <CommandList>
                <CommandEmpty>Kelompok tani tidak ditemukan.</CommandEmpty>
                <CommandGroup>
                  {mapped.map((kt) => (
                    <CommandItem
                      key={kt.id}
                      value={kt.name}
                      onSelect={() => {
                        flyToKt(kt);
                        setSearchOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedId === kt.id ? "opacity-100" : "opacity-0")} />
                      {kt.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 bg-background/90 backdrop-blur-sm shadow-md"
          title="Lihat semua Kelompok Tani"
          onClick={fitAll}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="text-xs">Lihat Semua</span>
        </Button>
      </div>

      {/* Basemap switcher */}
      <div className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-1 flex gap-1">
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
