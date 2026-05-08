"use client";

import {
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ChevronsUpDown,
  Check,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useState } from "react";
import type { MapStyleKey } from "@/lib/map-utils";
import type { MapFarmerGroup } from "@/server/actions/map";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LayerState {
  farmerGroups: boolean;
  landParcels: boolean;
}

interface StatsData {
  groups: number;
  farmers: number;
  parcels: number;
}

interface MapLayerPanelProps {
  // Total stats (unfiltered)
  stats: {
    totalGroups: number;
    totalFarmers: number;
    totalParcels: number;
    groupsWithCoords: number;
    parcelsWithPolygon: number;
  };
  // Filtered stats (updates when filter changes)
  filteredStats: StatsData;
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  layers: LayerState;
  onLayerToggle: (layer: keyof LayerState) => void;
  onZoomToLayer: (layer: keyof LayerState) => void;
  activeStyle: MapStyleKey;
  onStyleChange: (style: MapStyleKey) => void;
  allGroups: MapFarmerGroup[];
  selectedGroupIds: Set<string>;
  onGroupFilterToggle: (groupId: string) => void;
  onGroupFilterClear: () => void;
}

const BASEMAP_OPTIONS: { key: MapStyleKey; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "satellite", label: "Satellite" },
  { key: "hybrid", label: "Hybrid" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function MapLayerPanel({
  stats,
  filteredStats,
  selectedDistrict,
  onDistrictChange,
  layers,
  onLayerToggle,
  onZoomToLayer,
  activeStyle,
  onStyleChange,
  allGroups,
  selectedGroupIds,
  onGroupFilterToggle,
  onGroupFilterClear,
}: MapLayerPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    filter: true,
    layer: true,
    basemap: true,
  });

  // Unique district list from allGroups
  const districts = Array.from(
    new Map(allGroups.map((g) => [g.districtName, g.districtName])).entries()
  )
    .map(([name]) => name)
    .sort();

  // Filter KT list by selected district
  const groupsForCombo =
    selectedDistrict === "all"
      ? allGroups
      : allGroups.filter((g) => g.districtName === selectedDistrict);

  const hasFilter = selectedGroupIds.size > 0;
  const hasDistrictFilter = selectedDistrict !== "all";

  const triggerLabel = hasFilter
    ? `${selectedGroupIds.size} KT dipilih`
    : "Semua Kelompok Tani";

  return (
    <div
      className={`absolute top-4 left-4 z-10 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg transition-all duration-200 ${
        collapsed ? "w-10" : "w-72"
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-4 h-6 w-6 rounded-full bg-card border border-border shadow flex items-center justify-center hover:bg-accent transition-colors z-20"
        aria-label={collapsed ? "Buka panel" : "Tutup panel"}
      >
        {collapsed ? (
          <ChevronRight className="size-3" />
        ) : (
          <ChevronLeft className="size-3" />
        )}
      </button>

      {collapsed ? (
        <div className="flex flex-col items-center py-3 gap-3">
          <Layers className="size-4 text-muted-foreground" />
        </div>
      ) : (
        <div className="p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold">Layer & Data</span>
          </div>

          {/* ── Filter (accordion) ───────────────────────────────────────── */}
          <Collapsible
            open={openSections.filter}
            onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, filter: open }))}
          >
            <CollapsibleTrigger render={<button className="w-full flex items-center justify-between py-1" />}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Filter
              </p>
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${openSections.filter ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-3">
              {/* District filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Kabupaten
                  </p>
                  {hasDistrictFilter && (
                    <button
                      onClick={() => onDistrictChange("all")}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <X className="size-3" />
                      Reset
                    </button>
                  )}
                </div>
                <Popover open={districtComboOpen} onOpenChange={setDistrictComboOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={districtComboOpen}
                        className="w-full justify-between h-8 text-xs font-normal"
                      />
                    }
                  >
                    <span className={hasDistrictFilter ? "text-foreground" : "text-muted-foreground"}>
                      {hasDistrictFilter ? selectedDistrict : "Semua Kabupaten"}
                    </span>
                    <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cari kabupaten..." />
                      <CommandList className="max-h-48">
                        <CommandEmpty>Kabupaten tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              onDistrictChange("all");
                              setDistrictComboOpen(false);
                            }}
                          >
                            <Check className={`size-4 shrink-0 ${selectedDistrict === "all" ? "opacity-100" : "opacity-0"}`} />
                            <span className="ml-2 text-sm">Semua Kabupaten</span>
                          </CommandItem>
                          {districts.map((district) => (
                            <CommandItem
                              key={district}
                              value={district}
                              onSelect={() => {
                                onDistrictChange(district);
                                setDistrictComboOpen(false);
                              }}
                            >
                              <Check className={`size-4 shrink-0 ${selectedDistrict === district ? "opacity-100" : "opacity-0"}`} />
                              <span className="ml-2 text-sm">{district}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Farmer group filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Kelompok Tani
                  </p>
                  {hasFilter && (
                    <button
                      onClick={onGroupFilterClear}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <X className="size-3" />
                      Reset
                    </button>
                  )}
                </div>

              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboOpen}
                      className="w-full justify-between h-8 text-xs font-normal"
                    />
                  }
                >
                  <span className={hasFilter ? "text-foreground" : "text-muted-foreground"}>
                    {triggerLabel}
                  </span>
                  <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari kelompok tani..." />
                    <CommandList className="max-h-56">
                      <CommandEmpty>Kelompok tani tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {groupsForCombo.map((group) => {
                          const isSelected = selectedGroupIds.has(group.id);
                          return (
                            <CommandItem
                              key={group.id}
                              value={`${group.name} ${group.code ?? ""} ${group.districtName}`}
                              onSelect={() => onGroupFilterToggle(group.id)}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Check
                                  className={`size-4 shrink-0 ${
                                    isSelected ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{group.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {group.code ? `${group.code} · ` : ""}
                                    {group.districtName}
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                                  {group.farmerCount}
                                </span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              </div>

              {/* Selected badges */}
              {hasFilter && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedGroupIds).map((id) => {
                    const group = allGroups.find((g) => g.id === id);
                    if (!group) return null;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="text-[10px] gap-1 pr-1 cursor-pointer max-w-[14rem]"
                        onClick={() => onGroupFilterToggle(id)}
                      >
                        <span className="truncate">{group.name}</span>
                        <X className="size-2.5" />
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Stats (dinamis mengikuti filter) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ringkasan Data
                  </p>
                  {(hasFilter || hasDistrictFilter) && (
                    <span className="text-[10px] text-muted-foreground">
                      dari {hasDistrictFilter ? groupsForCombo.length : stats.totalGroups} KT
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold tabular-nums">{filteredStats.groups}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Kelompok Tani</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold tabular-nums">{filteredStats.farmers}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Petani</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold tabular-nums">{filteredStats.parcels}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Lahan</p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Layer (accordion) ─────────────────────────────────────────── */}
          <Collapsible
            open={openSections.layer}
            onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, layer: open }))}
          >
            <CollapsibleTrigger render={<button className="w-full flex items-center justify-between py-1" />}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Layer
              </p>
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${openSections.layer ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {/* Farmer Groups */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                  <Checkbox
                    checked={layers.farmerGroups}
                    onCheckedChange={() => onLayerToggle("farmerGroups")}
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="size-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-sm truncate">Kelompok Tani</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {filteredStats.groups}
                  </Badge>
                </label>
                <button
                  onClick={() => onZoomToLayer("farmerGroups")}
                  title="Zoom ke layer ini"
                  className="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Maximize2 className="size-3" />
                </button>
              </div>

              {/* Land Parcels */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                  <Checkbox
                    checked={layers.landParcels}
                    onCheckedChange={() => onLayerToggle("landParcels")}
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="size-3 rounded bg-amber-400 shrink-0" />
                    <span className="text-sm truncate">Lahan Petani</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {filteredStats.parcels}
                  </Badge>
                </label>
                <button
                  onClick={() => onZoomToLayer("landParcels")}
                  title="Zoom ke layer ini"
                  className="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Maximize2 className="size-3" />
                </button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── Basemap (accordion) ───────────────────────────────────────── */}
          <Collapsible
            open={openSections.basemap}
            onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, basemap: open }))}
          >
            <CollapsibleTrigger render={<button className="w-full flex items-center justify-between py-1" />}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Basemap
              </p>
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${openSections.basemap ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                {BASEMAP_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => onStyleChange(key)}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      activeStyle === key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-accent text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Coverage note */}
          <p className="text-[10px] text-muted-foreground border-t pt-3">
            {stats.groupsWithCoords}/{stats.totalGroups} KT memiliki koordinat ·{" "}
            {stats.parcelsWithPolygon}/{stats.totalParcels} lahan memiliki polygon
          </p>
        </div>
      )}
    </div>
  );
}
