"use client";

import { useMemo, useState } from "react";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  availabilityTotals,
  filterAvailabilityGroups,
} from "@/lib/data-availability-aggregation";
import { AvailabilityScoreCards } from "./availability-score-cards";
import { AvailabilityMatrix } from "./availability-matrix";
import { AvailabilityGroupChart } from "./availability-group-chart";
import { AvailabilityAnomalyPanel } from "./availability-anomaly-panel";
import type { BmpFarmerGroupCategory, DataAvailabilityView } from "@/types/dashboard";

const CATEGORY_LABELS: Record<BmpFarmerGroupCategory, string> = {
  EX_PLASMA: "Ex-Plasma",
  SWADAYA: "Swadaya",
};

const formatGeneratedAt = (iso: string) => {
  const d = new Date(iso);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function DataAvailabilityClient({ view, helpSlot }: { view: DataAvailabilityView; helpSlot?: React.ReactNode }) {
  // Filter disimpan di query string (TD-021) agar tampilan bisa di-bookmark &
  // dikirim ke rekan, dan bertahan saat halaman dimuat ulang.
  const { get, setMany } = useUrlFilters();
  const allGroups = view.data.groups;

  // Nilai dari URL divalidasi terhadap data yang benar-benar ada — tautan bisa
  // basi atau diketik sembarang (pola Dashboard Pelatihan).
  const districtParam = get("distrik");
  const districtId = allGroups.some((g) => g.districtId === districtParam) ? districtParam : null;

  const categoryParam = get("kategori");
  const category =
    categoryParam === "EX_PLASMA" || categoryParam === "SWADAYA"
      ? (categoryParam as BmpFarmerGroupCategory)
      : null;

  const setDistrictId = (v: string | null) => setMany({ distrik: v });
  const setCategory = (v: BmpFarmerGroupCategory | null) => setMany({ kategori: v });

  const [districtOpen, setDistrictOpen] = useState(false);

  const districtOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of allGroups) map.set(g.districtId, g.districtName);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allGroups]);

  // Satu irisan dipakai bersama oleh seluruh panel di bawah.
  const groups = useMemo(
    () => filterAvailabilityGroups(view.data, { districtId, category }),
    [view.data, districtId, category],
  );

  const totals = useMemo(() => availabilityTotals(groups), [groups]);

  const selectedDistrict = districtOptions.find((d) => d.id === districtId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Dashboard Ketersediaan Data</h1>
            {helpSlot}
          </div>
          <p className="text-muted-foreground">
            Kelengkapan data 5 domain lintas Lembaga Petani — data per{" "}
            <span className="font-medium text-foreground">
              {formatGeneratedAt(view.generatedAt)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Kategori Lembaga */}
          <Select
            value={category ?? "all"}
            onValueChange={(v) => {
              setCategory(v === "all" ? null : (v as BmpFarmerGroupCategory));
            }}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue>
                {(value) =>
                  value === "all"
                    ? "Semua Kategori"
                    : CATEGORY_LABELS[value as BmpFarmerGroupCategory]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="EX_PLASMA">Ex-Plasma</SelectItem>
              <SelectItem value="SWADAYA">Swadaya</SelectItem>
            </SelectContent>
          </Select>

          {/* Distrik */}
          <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[180px] justify-between h-9 font-normal"
                >
                  <span className={cn("truncate", !districtId && "text-muted-foreground")}>
                    {selectedDistrict?.name ?? "Semua Distrik"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              }
            />
            <PopoverContent className="w-[220px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Cari distrik..." />
                <CommandList>
                  <CommandEmpty>Distrik tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="Semua Distrik"
                      onSelect={() => {
                        setDistrictId(null);
                        setDistrictOpen(false);
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", !districtId ? "opacity-100" : "opacity-0")}
                      />
                      Semua Distrik
                    </CommandItem>
                    {districtOptions.map((d) => (
                      <CommandItem
                        key={d.id}
                        value={d.name}
                        onSelect={() => {
                          setDistrictId(d.id);
                          setDistrictOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            districtId === d.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {d.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <AvailabilityScoreCards totals={totals} />

      <AvailabilityMatrix rows={groups} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AvailabilityGroupChart groups={groups} />
        </div>
        <AvailabilityAnomalyPanel groups={groups} />
      </div>
    </div>
  );
}
