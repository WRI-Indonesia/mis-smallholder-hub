"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  bmpMonevAvailableYears,
  bmpMonevGroupRows,
  bmpMonevScoreHistogram,
  bmpMonevTotals,
  bmpMonevTrend,
  filterBmpMonevGroups,
  type BmpMonevDashboardView,
} from "@/lib/bmp-monev-dashboard-aggregation";
import { BmpMonevScoreCards } from "./bmp-monev-score-cards";
import { BmpMonevCategoryOverview } from "./bmp-monev-category-overview";
import { BmpMonevScoreHistogram } from "./bmp-monev-score-histogram";
import { BmpMonevDistributionChart } from "./bmp-monev-distribution-chart";
import { BmpMonevRankingChart } from "./bmp-monev-ranking-chart";
import { BmpMonevTrendChart } from "./bmp-monev-trend-chart";
import { BmpMonevGroupTable } from "./bmp-monev-group-table";

const formatGeneratedAt = (iso: string) => {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function BmpMonevDashboardClient({
  view,
  helpSlot,
  canExport,
}: {
  view: BmpMonevDashboardView;
  helpSlot?: React.ReactNode;
  canExport: boolean;
}) {
  // Filter di query string (TD-021) — pola Dashboard Pelatihan.
  const { get, setMany } = useUrlFilters();
  const allGroups = view.data.groups;

  const districtParam = get("distrik");
  const districtId = allGroups.some((g) => g.districtId === districtParam) ? districtParam : null;
  const groupParam = get("lembaga");
  const groupId = allGroups.some((g) => g.id === groupParam) ? groupParam : null;

  const yearOptions = useMemo(() => bmpMonevAvailableYears(allGroups), [allGroups]);
  // Default = tahun terbaru ber-data (penilaian bersifat per tahun, bukan kumulatif).
  const yearParam = get("tahun");
  const year =
    yearParam != null && /^\d{4}$/.test(yearParam) && yearOptions.includes(Number(yearParam))
      ? Number(yearParam)
      : (yearOptions[0] ?? null);

  const setDistrictId = (v: string | null) => setMany({ distrik: v, lembaga: null });
  const setGroupId = (v: string | null) => setMany({ lembaga: v });
  const setYear = (v: number | null) => setMany({ tahun: v == null ? null : String(v) });

  const [districtOpen, setDistrictOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const districtOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of allGroups) map.set(g.districtId, g.districtName);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allGroups]);
  const groupOptions = useMemo(() => allGroups.filter((g) => !districtId || g.districtId === districtId), [allGroups, districtId]);

  const groups = useMemo(() => filterBmpMonevGroups(allGroups, { districtId, groupId }), [allGroups, districtId, groupId]);
  const totals = useMemo(() => (year == null ? null : bmpMonevTotals(groups, year)), [groups, year]);
  const rows = useMemo(() => (year == null ? [] : bmpMonevGroupRows(groups, year)), [groups, year]);
  const trend = useMemo(() => bmpMonevTrend(groups), [groups]);
  const histogram = useMemo(() => (year == null ? [] : bmpMonevScoreHistogram(groups, year)), [groups, year]);

  const yearLabel = year == null ? "—" : String(year);
  const selectedDistrict = districtOptions.find((d) => d.id === districtId);
  const selectedGroup = allGroups.find((g) => g.id === groupId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Dashboard Monev BMP</h1>
            {helpSlot}
          </div>
          <p className="text-muted-foreground">
            Hasil Monitoring &amp; Evaluasi praktik BMP per petani — data per{" "}
            <span className="font-medium text-foreground">{formatGeneratedAt(view.generatedAt)}</span>. Produksi &amp; produktivitas ada di{" "}
            <Link href="/admin/dashboard/bmp" className="text-primary hover:underline">
              BMP Dashboard (Produksi)
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" role="combobox" className="w-[180px] justify-between h-9 font-normal">
                  <span className={cn("truncate", !districtId && "text-muted-foreground")}>{selectedDistrict?.name ?? "Semua Distrik"}</span>
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
                      <Check className={cn("mr-2 h-4 w-4", !districtId ? "opacity-100" : "opacity-0")} />
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
                        <Check className={cn("mr-2 h-4 w-4", districtId === d.id ? "opacity-100" : "opacity-0")} />
                        {d.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" role="combobox" className="w-[200px] justify-between h-9 font-normal">
                  <span className={cn("truncate", !groupId && "text-muted-foreground")}>{selectedGroup?.name ?? "Semua Lembaga Petani"}</span>
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
                      <Check className={cn("mr-2 h-4 w-4", !groupId ? "opacity-100" : "opacity-0")} />
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
                        <Check className={cn("mr-2 h-4 w-4", groupId === g.id ? "opacity-100" : "opacity-0")} />
                        {g.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Select value={year == null ? "" : String(year)} onValueChange={(v) => setYear(v ? Number(v) : null)} disabled={yearOptions.length === 0}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Tahun">{(v: string) => (v ? `Survei ${v}` : "Tahun")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {totals == null ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          Belum ada penilaian Monev BMP. Input atau import skor lewat{" "}
          <Link href="/admin/master-data/bmp-monev" className="text-primary hover:underline">
            Master Data › Monev BMP
          </Link>
          .
        </div>
      ) : (
        <>
          {/* Urutan baca (revisi owner 2026-09-19): angka besar → sebaran kategori
              (jawaban utama Monev) → per Lembaga → bentuk sebaran & tren → tabel
              terlipat di paling bawah supaya tidak terasa seperti Master Data. */}
          <BmpMonevScoreCards totals={totals} yearLabel={yearLabel} />

          <BmpMonevCategoryOverview totals={totals} yearLabel={yearLabel} />

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <BmpMonevDistributionChart rows={rows} yearLabel={yearLabel} />
            </div>
            <div className="lg:col-span-2">
              <BmpMonevRankingChart rows={rows} yearLabel={yearLabel} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BmpMonevScoreHistogram bins={histogram} avgScore={totals.avgScore} yearLabel={yearLabel} />
            <BmpMonevTrendChart buckets={trend} activeYear={year} />
          </div>

          <BmpMonevGroupTable rows={rows} year={year} canExport={canExport} />
        </>
      )}
    </div>
  );
}
