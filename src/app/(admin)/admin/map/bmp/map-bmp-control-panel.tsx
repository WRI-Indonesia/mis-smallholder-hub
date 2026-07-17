"use client";

import { useState, type ReactNode } from "react";
import {
  Check,
  ChevronsUpDown,
  ChevronDown,
  SlidersHorizontal,
  Loader2,
  MapPin,
  Printer,
  Minimize2,
  Sprout,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BMP_PRODUCTIVITY_CLASSES } from "@/lib/map-data";
import type {
  BmpMapData,
  BmpProductivityView,
  MapSelectOption,
  MapGroupOption,
  ProductionAvailabilityCategory,
  ProductivityClass,
} from "@/types/map";

/**
 * Category display metadata shared by the panel legend and the canvas fill/line
 * coloring. Order = legend order (best → worst).
 */
export const BMP_CATEGORIES: {
  key: ProductionAvailabilityCategory;
  color: string;
  label: string;
}[] = [
  { key: "BAIK", color: "#22c55e", label: "Baik (> 2 tahun)" },
  { key: "CUKUP", color: "#eab308", label: "Cukup (min. 1 tahun)" },
  { key: "KURANG", color: "#f97316", label: "Kurang (< 1 tahun)" },
  { key: "NONE", color: "#9ca3af", label: "Tidak ada data" },
];

export type BmpLayerVisibility = {
  BAIK: boolean;
  CUKUP: boolean;
  KURANG: boolean;
  NONE: boolean;
};

export const DEFAULT_BMP_VISIBILITY: BmpLayerVisibility = {
  BAIK: true,
  CUKUP: true,
  KURANG: true,
  NONE: true,
};

/** Which thematic coloring drives the parcel fill (MAP-03). */
export type BmpColorMode = "AVAILABILITY" | "PRODUCTIVITY";

export type BmpProductivityVisibility = Record<ProductivityClass, boolean>;

export const DEFAULT_BMP_PRODUCTIVITY_VISIBILITY: BmpProductivityVisibility = {
  TINGGI: true,
  SEDANG: true,
  RENDAH: true,
  SANGAT_RENDAH: true,
  NO_DATA: true,
};

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
  counts: BmpMapData["counts"] | null;
  layers: BmpLayerVisibility;
  onLayersChange: (layers: BmpLayerVisibility) => void;
  colorMode: BmpColorMode;
  onColorModeChange: (mode: BmpColorMode) => void;
  productivity: BmpProductivityView | null;
  prodView: string;
  onProdViewChange: (view: string) => void;
  prodLayers: BmpProductivityVisibility;
  onProdLayersChange: (layers: BmpProductivityVisibility) => void;
  onPrint: () => void;
  printing: boolean;
  onExport: () => void;
  exporting: boolean;
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
  variant?: "dot" | "area";
}

/**
 * One thematic layer entry (MAP-03): a radio to make it the active coloring of
 * the parcel polygons + a collapsible body holding its controls and legend.
 */
function LayerSection({
  title,
  active,
  onActivate,
  children,
}: {
  title: string;
  active: boolean;
  onActivate: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2.5 px-4 py-3">
        <button
          role="radio"
          aria-checked={active}
          title="Aktifkan layer ini"
          aria-label={`Aktifkan ${title}`}
          onClick={onActivate}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            active ? "border-primary" : "border-muted-foreground/50 hover:border-primary"
          )}
        >
          {active && <span className="h-2 w-2 rounded-full bg-primary" />}
        </button>
        <CollapsibleTrigger
          render={
            <button className="flex flex-1 items-center justify-between text-left">
              <span className={cn("text-sm font-semibold", !active && "text-muted-foreground")}>
                {title}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
            </button>
          }
        />
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function LegendRow({ color, label, count, checked, onToggle, variant = "area" }: LegendRowProps) {
  return (
    <label className="flex items-center gap-2.5 py-1 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onToggle(!!v)} />
      <span
        className={cn("inline-block h-3 w-3 shrink-0", variant === "area" ? "rounded-sm border-2" : "rounded-full")}
        style={
          variant === "area"
            ? { backgroundColor: `${color}33`, borderColor: color }
            : { backgroundColor: color }
        }
      />
      <span className="text-sm flex-1">{label}</span>
      <span className="text-xs font-mono text-muted-foreground tabular-nums">{count}</span>
    </label>
  );
}

export function MapBmpControlPanel(props: Props) {
  const {
    provinces, districts, farmerGroups,
    provinceId, districtId, farmerGroupId,
    onProvinceChange, onDistrictChange, onFarmerGroupChange,
    onLoad, isLoading, filterOpen, onFilterOpenChange,
    counts, layers, onLayersChange,
    colorMode, onColorModeChange, productivity, prodView, onProdViewChange,
    prodLayers, onProdLayersChange,
    onPrint, printing, onExport, exporting,
  } = props;

  const [minimized, setMinimized] = useState(false);

  const countFor = (key: ProductionAvailabilityCategory, c: BmpMapData["counts"]) =>
    key === "BAIK" ? c.baik : key === "CUKUP" ? c.cukup : key === "KURANG" ? c.kurang : c.none;
  const totalParcels = counts ? counts.baik + counts.cukup + counts.kurang + counts.none : 0;

  // Minimized → just a floating icon button (Peta Lahan pattern).
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
          <Sprout className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Peta BMP
        </span>
        <button
          onClick={() => setMinimized(true)}
          title="Minimalkan"
          aria-label="Minimalkan"
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
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
              placeholder="Pilih Provinsi (opsional)"
              emptyText="Provinsi tidak ditemukan."
              options={provinces}
              value={provinceId}
              onChange={onProvinceChange}
            />
            <FilterCombobox
              label="Distrik"
              placeholder="Pilih Distrik (opsional)"
              emptyText="Distrik tidak ditemukan."
              options={districts}
              value={districtId}
              onChange={onDistrictChange}
            />
            <FilterCombobox
              label="Lembaga Petani"
              required
              placeholder="Pilih Lembaga Petani"
              emptyText="Lembaga Petani tidak ditemukan."
              options={farmerGroups}
              value={farmerGroupId}
              onChange={onFarmerGroupChange}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Lembaga Petani wajib dipilih. Provinsi &amp; Distrik hanya menyaring
              daftar Lembaga Petani.
            </p>
            <Button onClick={onLoad} disabled={isLoading || !farmerGroupId} className="mt-1 w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Muat Data
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Layer sections — only after data is loaded. The two layers color the
          same polygons, so exactly one is active at a time (radio). */}
      {counts && totalParcels === 0 && (
        <>
          <Separator />
          <p className="px-4 py-3 text-sm text-muted-foreground">Tidak ada lahan untuk filter ini.</p>
        </>
      )}
      {counts && totalParcels > 0 && (
        <>
          <Separator />
          <LayerSection
            title="Ketersediaan Data Produksi"
            active={colorMode === "AVAILABILITY"}
            onActivate={() => onColorModeChange("AVAILABILITY")}
          >
            <div>
              {BMP_CATEGORIES.map((cat) => (
                <LegendRow
                  key={cat.key}
                  color={cat.color}
                  label={cat.label}
                  count={countFor(cat.key, counts)}
                  checked={layers[cat.key]}
                  onToggle={(v) => onLayersChange({ ...layers, [cat.key]: v })}
                />
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              Kategori dihitung dari run bulan berturut-turut produksi yang
              tertaut ke lahan.
            </p>
          </LayerSection>

          <Separator />
          <LayerSection
            title="Produktivitas (Ton/Ha)"
            active={colorMode === "PRODUCTIVITY"}
            onActivate={() => onColorModeChange("PRODUCTIVITY")}
          >
            {productivity && (
              <>
                <div className="mb-2 flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Tahun</span>
                  <Select value={prodView} onValueChange={(v) => onProdViewChange(v ?? "AVG")}>
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVG">Rata-rata</SelectItem>
                      {productivity.years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  {BMP_PRODUCTIVITY_CLASSES.map((c) => (
                    <LegendRow
                      key={c.key}
                      color={c.color}
                      label={c.label}
                      count={productivity.counts[c.key]}
                      checked={prodLayers[c.key]}
                      onToggle={(v) => onProdLayersChange({ ...prodLayers, [c.key]: v })}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  Produktivitas = produksi tahun terpilih ÷ luas persil (Rata-rata =
                  rata-rata antar tahun melapor). Produksi tanpa tautan lahan tidak
                  dihitung.
                </p>
              </>
            )}
          </LayerSection>

          <Separator />
          <div className="px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full gap-2"
              onClick={onPrint}
              disabled={printing}
            >
              {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
              {printing
                ? "Menyiapkan..."
                : colorMode === "PRODUCTIVITY"
                  ? "Cetak Peta dan Tabel Produktivitas"
                  : "Cetak Peta dan Matriks Ketersediaan Data"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-8 w-full gap-2"
              onClick={onExport}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
              {exporting
                ? "Menyiapkan..."
                : colorMode === "PRODUCTIVITY"
                  ? "Download Produktivitas (Excel)"
                  : "Download Ketersediaan Data (Excel)"}
            </Button>
          </div>
        </>
      )}

      {/* Empty helper before first load */}
      {!counts && (
        <>
          <Separator />
          <div className="flex items-start gap-2 px-4 py-3 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Pilih Lembaga Petani lalu klik Muat Data untuk menampilkan peta.</span>
          </div>
        </>
      )}
    </Card>
  );
}
