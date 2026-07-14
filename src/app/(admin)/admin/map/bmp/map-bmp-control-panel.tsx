"use client";

import { useState } from "react";
import {
  Check,
  ChevronsUpDown,
  ChevronDown,
  SlidersHorizontal,
  List,
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
import type {
  BmpMapData,
  MapSelectOption,
  MapGroupOption,
  ProductionAvailabilityCategory,
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
    counts, layers, onLayersChange, onPrint, printing, onExport, exporting,
  } = props;

  const [legendOpen, setLegendOpen] = useState(true);
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
              label="Lembaga Tani"
              required
              placeholder="Pilih Lembaga Tani"
              emptyText="Lembaga Tani tidak ditemukan."
              options={farmerGroups}
              value={farmerGroupId}
              onChange={onFarmerGroupChange}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Lembaga Tani wajib dipilih. Provinsi &amp; Distrik hanya menyaring
              daftar Lembaga Tani.
            </p>
            <Button onClick={onLoad} disabled={isLoading || !farmerGroupId} className="mt-1 w-full">
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
                    Ketersediaan Data Produksi
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", legendOpen ? "rotate-180" : "")} />
                </button>
              }
            />
            <CollapsibleContent>
              <div className="px-4 pb-4">
                {totalParcels === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">Tidak ada lahan untuk filter ini.</p>
                ) : (
                  <>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 h-8 w-full gap-2"
                      onClick={onPrint}
                      disabled={printing || totalParcels === 0}
                    >
                      {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                      {printing ? "Menyiapkan..." : "Cetak Peta dan Matriks Ketersediaan Data"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-8 w-full gap-2"
                      onClick={onExport}
                      disabled={exporting || totalParcels === 0}
                    >
                      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                      {exporting ? "Menyiapkan..." : "Download Ketersediaan Data (Excel)"}
                    </Button>
                  </>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* Empty helper before first load */}
      {!counts && (
        <>
          <Separator />
          <div className="flex items-start gap-2 px-4 py-3 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Pilih Lembaga Tani lalu klik Muat Data untuk menampilkan peta.</span>
          </div>
        </>
      )}
    </Card>
  );
}
