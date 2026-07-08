"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, ChevronDown, SlidersHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { MapData, MapSelectOption, MapGroupOption } from "@/types/map";

export type LayerVisibility = {
  kt: boolean;
  parcelPoints: boolean;
  parcelAreas: boolean;
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
  counts: MapData["counts"] | null;
  layers: LayerVisibility;
  onLayersChange: (layers: LayerVisibility) => void;
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

function LegendRow({ color, label, count, checked, onToggle, variant = "dot" }: LegendRowProps) {
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

export function MapControlPanel(props: Props) {
  const {
    provinces, districts, farmerGroups,
    provinceId, districtId, farmerGroupId,
    onProvinceChange, onDistrictChange, onFarmerGroupChange,
    onLoad, isLoading, filterOpen, onFilterOpenChange,
    counts, layers, onLayersChange,
  } = props;

  return (
    <Card className="absolute top-4 left-4 z-10 w-80 max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-y-auto shadow-lg gap-0 py-0">
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
              label="Kelompok Tani"
              placeholder="Pilih Kelompok Tani"
              emptyText="Kelompok Tani tidak ditemukan."
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
          <div className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Legenda
            </p>
            {counts.kt + counts.parcelAreas === 0 ? (
              <p className="text-sm text-muted-foreground py-1">Tidak ada data untuk filter ini.</p>
            ) : (
              <div>
                <LegendRow
                  color="#22c55e"
                  label="Point Kelompok Tani"
                  count={counts.kt}
                  checked={layers.kt}
                  onToggle={(v) => onLayersChange({ ...layers, kt: v })}
                />
                <LegendRow
                  color="#3b82f6"
                  label="Point Lahan Petani"
                  count={counts.parcelPoints}
                  checked={layers.parcelPoints}
                  onToggle={(v) => onLayersChange({ ...layers, parcelPoints: v })}
                />
                <LegendRow
                  color="#16a34a"
                  label="Area Lahan Petani"
                  count={counts.parcelAreas}
                  checked={layers.parcelAreas}
                  onToggle={(v) => onLayersChange({ ...layers, parcelAreas: v })}
                  variant="area"
                />
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
