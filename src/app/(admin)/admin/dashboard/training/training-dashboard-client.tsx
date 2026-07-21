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
  filterTrainingGroups,
  trainingActivePackages,
  trainingAvailableYears,
  trainingCoverageMatrix,
  trainingQualityStats,
  trainingScoreRows,
  trainingTotals,
  trainingTrendSeries,
} from "@/lib/training-dashboard-aggregation";
import { TrainingScoreCards } from "./training-score-cards";
import { TrainingCoverageMatrix } from "./training-coverage-matrix";
import { TrainingTrendChart } from "./training-trend-chart";
import { TrainingEffectivenessPanel } from "./training-effectiveness-panel";
import { TrainingQualityPanel } from "./training-quality-panel";
import type { BmpFarmerGroupCategory, TrainingDashboardView } from "@/types/dashboard";

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

export function TrainingDashboardClient({ view }: { view: TrainingDashboardView }) {
  // Filter disimpan di query string (TD-021) agar tampilan bisa di-bookmark &
  // dikirim ke rekan, dan bertahan saat halaman dimuat ulang.
  const { get, setMany } = useUrlFilters();
  const districtId = get("distrik");
  const groupId = get("lembaga");
  const category = (get("kategori") as BmpFarmerGroupCategory | null) ?? null;
  // Default "semua tahun" — cakupan program bersifat kumulatif, bukan per tahun.
  const yearParam = get("tahun");
  const year = yearParam != null && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;

  const setDistrictId = (v: string | null) => setMany({ distrik: v, lembaga: null });
  const setGroupId = (v: string | null) => setMany({ lembaga: v });
  const setCategory = (v: BmpFarmerGroupCategory | null) => setMany({ kategori: v, lembaga: null });
  const setYear = (v: number | null) => setMany({ tahun: v == null ? null : String(v) });

  const [districtOpen, setDistrictOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const allGroups = view.data.groups;

  const districtOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of allGroups) map.set(g.districtId, g.districtName);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allGroups]);

  const groupOptions = useMemo(
    () =>
      allGroups.filter(
        (g) =>
          (!districtId || g.districtId === districtId) && (!category || g.category === category),
      ),
    [allGroups, districtId, category],
  );

  const yearOptions = useMemo(() => trainingAvailableYears(allGroups), [allGroups]);

  // Satu irisan dipakai bersama oleh seluruh panel di bawah.
  const groups = useMemo(
    () => filterTrainingGroups(view.data, { districtId, groupId, category }),
    [view.data, districtId, groupId, category],
  );

  const totals = useMemo(() => trainingTotals(groups, year), [groups, year]);
  const coverage = useMemo(() => trainingCoverageMatrix(groups, year), [groups, year]);
  const packages = useMemo(() => trainingActivePackages(groups, year), [groups, year]);
  const trend = useMemo(() => trainingTrendSeries(groups, year), [groups, year]);
  const scores = useMemo(() => trainingScoreRows(groups, year), [groups, year]);
  const quality = useMemo(() => trainingQualityStats(groups, year), [groups, year]);

  const yearLabel = year == null ? "semua tahun" : String(year);
  const selectedDistrict = districtOptions.find((d) => d.id === districtId);
  const selectedGroup = allGroups.find((g) => g.id === groupId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Pelatihan</h1>
          <p className="text-muted-foreground">
            Cakupan &amp; efektivitas program pelatihan petani — data per{" "}
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

          {/* Lembaga Petani */}
          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[200px] justify-between h-9 font-normal"
                >
                  <span className={cn("truncate", !groupId && "text-muted-foreground")}>
                    {selectedGroup?.name ?? "Semua Lembaga Petani"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              }
            />
            <PopoverContent className="w-[240px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Cari lembaga petani..." />
                <CommandList>
                  <CommandEmpty>Lembaga petani tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="Semua Lembaga Petani"
                      onSelect={() => {
                        setGroupId(null);
                        setGroupOpen(false);
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", !groupId ? "opacity-100" : "opacity-0")}
                      />
                      Semua Lembaga Petani
                    </CommandItem>
                    {groupOptions.map((g) => (
                      <CommandItem
                        key={g.id}
                        value={g.name}
                        onSelect={() => {
                          setGroupId(g.id);
                          setGroupOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            groupId === g.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {g.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Tahun — "Semua Tahun" membuat chart tren beralih ke bucket per tahun. */}
          <Select
            value={year == null ? "all" : String(year)}
            onValueChange={(v) => setYear(v === "all" || v == null ? null : Number(v))}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue>{(value) => (value === "all" ? "Semua Tahun" : value)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TrainingScoreCards totals={totals} yearLabel={yearLabel} />

      <TrainingCoverageMatrix rows={coverage} packages={packages} year={year} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrainingTrendChart buckets={trend} packages={packages} yearLabel={yearLabel} />
        </div>
        <TrainingEffectivenessPanel rows={scores} />
      </div>

      <TrainingQualityPanel stats={quality} />
    </div>
  );
}
