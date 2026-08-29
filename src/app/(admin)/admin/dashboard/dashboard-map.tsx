"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import Map, { Source, Layer, type MapRef, type LayerProps, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import { GeoJSONSource } from "maplibre-gl";
import type { Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Search, Check, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAP_STYLE_KEYS, MAP_STYLE_LABELS, type MapStyleKey } from "@/lib/map-style";
import { useVectorBasemap } from "@/hooks/use-vector-basemap";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { KTDetails } from "@/types/dashboard";


interface Props {
  kelompokTaniList: KTDetails[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DashboardMap({ kelompokTaniList, selectedId, onSelect }: Props) {
  const mapRef = useRef<MapRef>(null);

  // Default StreetMap untuk KEDUA tema (keputusan owner 2026-08-29) — peta
  // ikhtisar butuh nama kota/jalan sebagai orientasi, bukan latar yang menepi.
  // Sengaja TIDAK ikut tema aplikasi, beda dari Fire Alert / Peta Lahan / BMP.
  const [styleOverride, setStyleOverride] = useState<MapStyleKey | null>(null);
  const styleKey: MapStyleKey = styleOverride ?? "streetmap";

  const { mapStyle, labelFont, labelsReady, syncStyle, registerImageFallback } =
    useVectorBasemap(styleKey);

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
      <div className="h-full min-h-[360px] flex flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 text-center p-6">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground max-w-sm">
          Tidak ada data lokasi yang tersedia untuk ditampilkan di peta
        </p>
      </div>
    );
  }

  const clusterLayer: LayerProps = {
    id: "clusters",
    type: "circle",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#2563eb",
      "circle-opacity": 0.85,
      "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28],
    },
  };

  const clusterCountLayer: LayerProps = {
    id: "cluster-count",
    type: "symbol",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": [labelFont],
      "text-size": 12,
    },
    paint: { "text-color": "#ffffff" },
  };

  const pointLayer: LayerProps = {
    id: "unclustered-point",
    type: "circle",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["case", ["==", ["get", "id"], selectedId ?? ""], "#f59e0b", "#22c55e"],
      "circle-radius": 8,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  };

  // Label warna mengikuti basemap agar tetap terbaca (light/dark/satelit).
  const labelColors =
    styleKey === "dark"
      ? { text: "#f8fafc", halo: "#0f172a" }
      : styleKey === "hybrid"
        ? { text: "#ffffff", halo: "#000000" }
        : { text: "#1f2937", halo: "#ffffff" };

  const pointLabelLayer: LayerProps = {
    id: "unclustered-label",
    type: "symbol",
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "name"],
      "text-font": [labelFont],
      "text-size": 11,
      "text-anchor": "top",
      "text-offset": [0, 0.9],
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": labelColors.text,
      "text-halo-color": labelColors.halo,
      "text-halo-width": 1.5,
    },
  };

  const handleMouseMove = (e: MapLayerMouseEvent) => {
    e.target.getCanvas().style.cursor = e.features?.[0] ? "pointer" : "";
  };

  const handleClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const map = mapRef.current;

    if (feature.properties?.cluster) {
      const source = map?.getSource("kt-source");
      const clusterId = feature.properties.cluster_id;
      const count = feature.properties.point_count ?? 1000;
      // Fit to ALL points inside the cluster. maplibre-gl v5 returns a Promise
      // (the old callback form is gone), so Promise.resolve handles both.
      Promise.resolve(
        source instanceof GeoJSONSource ? source.getClusterLeaves(clusterId, count, 0) : []
      )
        .then((leaves) => {
          if (!leaves?.length) return;
          let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
          for (const leaf of leaves) {
            const [lng, lat] = (leaf.geometry as Point).coordinates;
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          }
          if (minLng === maxLng && minLat === maxLat) {
            map?.easeTo({ center: [minLng, minLat], zoom: 15, duration: 600 });
          } else {
            map?.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80, maxZoom: 16, duration: 600 });
          }
        })
        .catch(() => {});
      return;
    }
    if (feature.properties?.id) onSelect(feature.properties.id);
  };

  return (
    <div className="relative h-full min-h-[360px] w-full rounded-md overflow-hidden border">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 101.8, latitude: 0.6, zoom: 9 }}
        mapStyle={mapStyle}
        interactiveLayerIds={["clusters", "unclustered-point"]}
        onLoad={(e) => {
          registerImageFallback(e.target);
          syncStyle(e.target);
          fitAll();
        }}
        onStyleData={(e) => syncStyle(e.target)}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={(e) => {
          e.target.getCanvas().style.cursor = "";
        }}
      >
        <Source id="kt-source" type="geojson" data={geojson} cluster clusterMaxZoom={14} clusterRadius={50}>
          <Layer {...clusterLayer} />
          <Layer {...pointLayer} />
          {/* Layer berteks menunggu glyphs style aktif cocok — lihat useVectorBasemap. */}
          {labelsReady && <Layer {...clusterCountLayer} />}
          {labelsReady && <Layer {...pointLabelLayer} />}
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
                title="Cari Lembaga Petani"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs">Cari Lembaga Petani</span>
              </Button>
            }
          />
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Cari lembaga petani..." />
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
          title="Lihat semua Lembaga Petani"
          onClick={fitAll}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="text-xs">Lihat Semua</span>
        </Button>
      </div>

      {/* Basemap switcher */}
      <div className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm border rounded-md shadow-md p-1 flex gap-1">
        {MAP_STYLE_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setStyleOverride(key)}
            title={MAP_STYLE_LABELS[key].full}
            className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${
              styleKey === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {MAP_STYLE_LABELS[key].short}
          </button>
        ))}
      </div>
    </div>
  );
}
