"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, ChevronDown, SlidersHorizontal, Layers, List, Loader2, Flame, Minimize2, MapPinned, Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { MapData, MapSelectOption, MapGroupOption } from "@/types/map";
import { MAP_OVERLAYS, type OverlayDef, type OverlayState, type CustomLayer } from "./map-overlays";
import {
  HOTSPOT_CONF_COLORS,
  HOTSPOT_CONF_LABELS,
  HOTSPOT_DAY_RANGES,
  hotspotWindowLabel,
  type HotspotConfBucket,
  type HotspotState,
} from "./map-hotspot";
import { CustomGisSection } from "./map-custom-gis";

export type LayerVisibility = {
  kt: boolean;
  parcelPoints: boolean;
  parcelAreas: boolean;
};

/** Layer internal yang bisa dituju tombol zoom di panel (klik label). */
export type LayerZoomTarget = "kt" | "parcelPoints" | "parcelAreas" | "hotspot";

interface Props {
  provinces: MapSelectOption[];
  districts: MapSelectOption[];
  farmerGroups: MapGroupOption[];
  provinceId: string | null;
  districtId: string | null;
  farmerGroupId: string | null;
  onProvinceChange: (val: string | null) => void;
  onDistrictChange: (val: string | null) => void;
  onFarmerGroupChange: (val: string | null) => void;
  onLoad: () => void;
  isLoading: boolean;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  counts: MapData["counts"] | null;
  layers: LayerVisibility;
  onLayersChange: (layers: LayerVisibility) => void;
  onZoomLayer: (target: LayerZoomTarget) => void;
  overlays: OverlayState;
  onOverlaysChange: (overlays: OverlayState) => void;
  customLayers: CustomLayer[];
  onAddCustomLayer: (layer: CustomLayer) => void;
  onRemoveCustomLayer: (id: string) => void;
  onToggleCustomLayer: (id: string, visible: boolean) => void;
  onZoomCustomLayer: (id: string) => void;
  onCustomLayerSymbology: (id: string, attribute: string | null) => void;
  hotspot: HotspotState;
  onHotspotChange: (hotspot: HotspotState) => void;
  hotspotLoading: boolean;
  hotspotCounts: Record<HotspotConfBucket, number>;
  onHotspotDownloadShp: () => void;
  onHotspotPrintPdf: () => void;
  /** Kalkulasi jarak lembaga terdekat masih berjalan → tombol PDF menunggu. */
  hotspotPdfCalculating: boolean;
  /** Buka ulang modal ringkasan titik api (auto-terbuka saat kalkulasi selesai). */
  onHotspotShowSummary: () => void;
  /** EXPORT menu Peta Lahan — gate tombol "Unduh SHP" titik api. */
  canExport: boolean;
  /** PRINT menu Peta Lahan — gate tombol "Cetak PDF" titik api. */
  canPrint: boolean;
  helpSlot?: React.ReactNode;
}

interface ComboboxProps {
  label: string;
  required?: boolean;
  placeholder: string;
  emptyText: string;
  options: { id: string; name: string }[];
  value: string | null;
  onChange: (val: string) => void;
  disabled?: boolean;
}

function FilterCombobox({ label, required, placeholder, emptyText, options, value, onChange, disabled }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="w-full justify-between h-9 font-normal text-left"
            >
              {selected ? (
                <span className="truncate">{selected.name}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[var(--anchor-width)] min-w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    onSelect={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === o.id ? "opacity-100" : "opacity-0")} />
                    {o.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface LegendRowProps {
  color: string;
  label: string;
  count: number;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  /** Klik label = zoom ke sebaran data layer (checkbox tetap toggle visibilitas). */
  onZoomTo: () => void;
  variant?: "dot" | "area";
}

function LegendRow({ color, label, count, checked, onToggle, onZoomTo, variant = "dot" }: LegendRowProps) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <Checkbox checked={checked} onCheckedChange={(v) => onToggle(!!v)} aria-label={label} />
      <span
        className={cn("inline-block h-3 w-3 shrink-0", variant === "area" ? "rounded-sm border-2" : "rounded-full")}
        style={
          variant === "area"
            ? { backgroundColor: `${color}33`, borderColor: color }
            : { backgroundColor: color }
        }
      />
      <button
        type="button"
        onClick={onZoomTo}
        disabled={count === 0}
        title="Zoom ke sebaran data layer"
        className="flex-1 text-left text-sm hover:underline disabled:cursor-default disabled:no-underline"
      >
        {label}
      </button>
      <span className="text-xs font-mono text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
}

function OverlayRow({
  def,
  checked,
  onToggle,
}: {
  def: OverlayDef;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="py-1.5">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <Checkbox checked={checked} onCheckedChange={(v) => onToggle(!!v)} className="mt-0.5" />
        <span
          className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border-2"
          style={{ backgroundColor: `${def.color}33`, borderColor: def.color }}
        />
        <span className="min-w-0">
          <span className="block text-sm leading-tight">{def.label}</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">{def.description}</span>
        </span>
      </label>
      {checked && (
        <div className="ml-[42px] mt-1.5 space-y-1">
          {def.legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] border border-border"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11px] leading-tight text-muted-foreground">{item.label}</span>
            </div>
          ))}
          <p className="text-[10px] leading-snug text-muted-foreground/80">Sumber: {def.source}.</p>
        </div>
      )}
    </div>
  );
}

export function MapControlPanel(props: Props) {
  const {
    provinces, districts, farmerGroups,
    provinceId, districtId, farmerGroupId,
    onProvinceChange, onDistrictChange, onFarmerGroupChange,
    onLoad, isLoading, filterOpen, onFilterOpenChange,
    counts, layers, onLayersChange, onZoomLayer,
    overlays, onOverlaysChange,
    customLayers, onAddCustomLayer, onRemoveCustomLayer, onToggleCustomLayer, onZoomCustomLayer, onCustomLayerSymbology,
    hotspot, onHotspotChange, hotspotLoading, hotspotCounts,
    onHotspotDownloadShp, onHotspotPrintPdf, hotspotPdfCalculating, onHotspotShowSummary,
    canExport, canPrint,
    helpSlot,
  } = props;

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [hotspotOpen, setHotspotOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const anyOverlayOn = Object.values(overlays.visible).some(Boolean);
  const hotspotTotal = hotspotCounts.high + hotspotCounts.nominal + hotspotCounts.low;
  // Titik api baru bisa dinyalakan setelah data lahan dimuat (perlu titik
  // Lembaga Petani untuk kalkulasi jarak di laporan PDF). Saat sudah nyala,
  // checkbox tetap bisa dipakai untuk mematikan.
  const hotspotDisabled = counts === null && !hotspot.visible;
  const hotspotExportDisabled = !hotspot.visible || hotspotLoading || hotspotTotal === 0;

  // Minimized → just a floating icon button (same pattern as Peta BMP).
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        title="Buka panel filter"
        aria-label="Buka panel filter"
        className="absolute top-4 left-4 z-10 flex h-9 w-9 items-center justify-center rounded-md border bg-primary text-primary-foreground shadow-md backdrop-blur-sm"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Card className="absolute top-4 left-4 z-10 w-80 max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-y-auto shadow-lg gap-0 py-0">
      {/* Sticky header with minimize button */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <MapPinned className="h-4 w-4" />
          Peta Lahan
        </span>
        <span className="flex items-center gap-1.5">
          {helpSlot}
          <button
            onClick={() => setMinimized(true)}
            title="Minimalkan"
            aria-label="Minimalkan"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {/* Filter section */}
      <Collapsible open={filterOpen} onOpenChange={onFilterOpenChange}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center justify-between px-4 py-3 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4" />
                Filter
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", filterOpen ? "rotate-180" : "")} />
            </button>
          }
        />
        <CollapsibleContent>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <FilterCombobox
              label="Provinsi"
              placeholder="Pilih Provinsi"
              emptyText="Provinsi tidak ditemukan."
              options={provinces}
              value={provinceId}
              onChange={onProvinceChange}
            />
            <FilterCombobox
              label="Distrik"
              required
              placeholder="Pilih Distrik"
              emptyText="Distrik tidak ditemukan."
              options={districts}
              value={districtId}
              onChange={onDistrictChange}
            />
            <FilterCombobox
              label="Lembaga Petani"
              placeholder="Pilih Lembaga Petani"
              emptyText="Lembaga Petani tidak ditemukan."
              options={farmerGroups}
              value={farmerGroupId}
              onChange={onFarmerGroupChange}
              disabled={!districtId}
            />
            <Button onClick={onLoad} disabled={isLoading || !districtId} className="mt-1 w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Muat Data
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Legend section — only after data is loaded */}
      {counts && (
        <>
          <Separator />
          <Collapsible open={legendOpen} onOpenChange={setLegendOpen}>
            <CollapsibleTrigger
              render={
                <button className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <List className="h-4 w-4" />
                    Legenda
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", legendOpen ? "rotate-180" : "")} />
                </button>
              }
            />
            <CollapsibleContent>
              <div className="px-4 pb-4">
                {counts.kt + counts.parcelAreas === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">Tidak ada data untuk filter ini.</p>
                ) : (
                  <div>
                    <LegendRow
                      color="#22c55e"
                      label="Point Lembaga Petani"
                      count={counts.kt}
                      checked={layers.kt}
                      onToggle={(v) => onLayersChange({ ...layers, kt: v })}
                      onZoomTo={() => onZoomLayer("kt")}
                    />
                    <LegendRow
                      color="#3b82f6"
                      label="Point Lahan Petani"
                      count={counts.parcelPoints}
                      checked={layers.parcelPoints}
                      onToggle={(v) => onLayersChange({ ...layers, parcelPoints: v })}
                      onZoomTo={() => onZoomLayer("parcelPoints")}
                    />
                    <LegendRow
                      color="#16a34a"
                      label="Area Lahan Petani"
                      count={counts.parcelAreas}
                      checked={layers.parcelAreas}
                      onToggle={(v) => onLayersChange({ ...layers, parcelAreas: v })}
                      onZoomTo={() => onZoomLayer("parcelAreas")}
                      variant="area"
                    />
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* Peta Lainnya section — reference raster overlays (always available, bottom) */}
      <Separator />
      <Collapsible open={overlayOpen} onOpenChange={setOverlayOpen}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center justify-between px-4 py-3 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4" />
                Peta Lainnya
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", overlayOpen ? "rotate-180" : "")} />
            </button>
          }
        />
        <CollapsibleContent>
          <div className="px-4 pb-4">
            {MAP_OVERLAYS.map((o) => (
              <OverlayRow
                key={o.key}
                def={o}
                checked={!!overlays.visible[o.key]}
                onToggle={(v) =>
                  onOverlaysChange({ ...overlays, visible: { ...overlays.visible, [o.key]: v } })
                }
              />
            ))}
            {anyOverlayOn && (
              <div className="mt-3 flex items-center gap-2">
                <span className="shrink-0 text-xs text-muted-foreground">Transparansi</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={overlays.opacity}
                  onChange={(e) => onOverlaysChange({ ...overlays, opacity: Number(e.target.value) })}
                  className="h-1 flex-1 cursor-pointer accent-primary"
                  aria-label="Transparansi overlay"
                />
                <span className="w-8 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {Math.round(overlays.opacity * 100)}%
                </span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Titik Api (Hotspot) section — NASA FIRMS active-fire points */}
      <Separator />
      <Collapsible open={hotspotOpen} onOpenChange={setHotspotOpen}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center justify-between px-4 py-3 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Flame className="h-4 w-4" />
                Titik Api (Hotspot)
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", hotspotOpen ? "rotate-180" : "")} />
            </button>
          }
        />
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div
              className="flex items-center gap-2.5 py-1"
              title={hotspotDisabled ? "Muat data lahan dulu untuk menampilkan titik api" : undefined}
            >
              <Checkbox
                checked={hotspot.visible}
                disabled={hotspotDisabled}
                onCheckedChange={(v) => onHotspotChange({ ...hotspot, visible: !!v })}
                aria-label="Tampilkan titik api"
              />
              <Flame className={cn("h-4 w-4 shrink-0", hotspotDisabled ? "text-muted-foreground" : "text-red-500")} />
              <button
                type="button"
                onClick={() => onZoomLayer("hotspot")}
                disabled={!hotspot.visible || hotspotLoading}
                title="Zoom ke sebaran titik api"
                className="flex-1 text-left text-sm hover:underline disabled:cursor-default disabled:no-underline"
              >
                Tampilkan titik api
              </button>
              {hotspot.visible && hotspotLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                hotspot.visible && (
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {formatNumber(hotspotTotal)}
                  </span>
                )
              )}
            </div>

            {/* Time window selector */}
            <div className="mt-3 flex gap-1 rounded-md border p-0.5">
              {HOTSPOT_DAY_RANGES.map((d) => (
                <button
                  key={d}
                  disabled={hotspotDisabled}
                  onClick={() => onHotspotChange({ ...hotspot, dayRange: d })}
                  className={cn(
                    "flex-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-50",
                    hotspot.dayRange === d
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {hotspotWindowLabel(d)}
                </button>
              ))}
            </div>

            {/* Confidence legend + per-class counts */}
            <div className="mt-3 flex flex-col gap-1.5">
              <span className="text-xs font-medium">Keyakinan deteksi</span>
              {(["high", "nominal", "low"] as HotspotConfBucket[]).map((b) => (
                <span key={b} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: HOTSPOT_CONF_COLORS[b] }}
                  />
                  <span className="flex-1 text-muted-foreground">{HOTSPOT_CONF_LABELS[b]}</span>
                  {hotspot.visible && !hotspotLoading && (
                    <span className="font-mono text-muted-foreground tabular-nums">
                      {formatNumber(hotspotCounts[b])}
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Ringkasan (modal) + ekspor titik api: ZIP Shapefile + laporan PDF */}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-7 w-full text-xs"
              disabled={hotspotExportDisabled || hotspotPdfCalculating}
              onClick={onHotspotShowSummary}
              title={
                hotspotPdfCalculating
                  ? "Menghitung jarak ke Lembaga Petani…"
                  : "Lihat ringkasan & daftar titik api terdekat"
              }
            >
              {hotspotPdfCalculating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <List className="h-3.5 w-3.5" />
              )}
              Lihat Ringkasan
            </Button>
            {(canExport || canPrint) && (
              <div className="mt-2 flex gap-2">
                {canExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    disabled={hotspotExportDisabled}
                    onClick={onHotspotDownloadShp}
                    title="Unduh titik api sebagai ZIP Shapefile"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh SHP
                  </Button>
                )}
                {canPrint && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    disabled={hotspotExportDisabled || hotspotPdfCalculating}
                    onClick={onHotspotPrintPdf}
                    title={
                      hotspotPdfCalculating
                        ? "Menghitung jarak ke Lembaga Petani…"
                        : "Cetak daftar titik api sebagai PDF"
                    }
                  >
                    {hotspotPdfCalculating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Printer className="h-3.5 w-3.5" />
                    )}
                    Cetak PDF
                  </Button>
                )}
              </div>
            )}

            <p className="mt-3 text-[10px] leading-snug text-muted-foreground">
              Deteksi anomali panas VIIRS 375 m, bukan konfirmasi kebakaran. Sumber: NASA FIRMS · jeda ±3 jam.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Tambah GIS Lain section — user-added WMS / Shapefile / GeoJSON layers */}
      <Separator />
      <CustomGisSection
        layers={customLayers}
        onAdd={onAddCustomLayer}
        onRemove={onRemoveCustomLayer}
        onToggle={onToggleCustomLayer}
        onZoomTo={onZoomCustomLayer}
        onSymbologyChange={onCustomLayerSymbology}
      />
    </Card>
  );
}
