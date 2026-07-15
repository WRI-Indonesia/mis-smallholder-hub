"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filterBmpGroups, sumBmpGroups } from "@/lib/bmp-dashboard-aggregation";
import { BmpScoreCards } from "./bmp-score-cards";
import { BmpTrendChart } from "./bmp-trend-chart";
import { BmpAvailabilityPanel } from "./bmp-availability-panel";
import type { BmpDataMode, BmpFarmerGroupCategory, BmpSnapshotView } from "@/types/dashboard";

interface Props {
  initialView: BmpSnapshotView | null;
}

const CATEGORY_LABELS: Record<BmpFarmerGroupCategory, string> = {
  EX_PLASMA: "Ex-Plasma",
  SWADAYA: "Swadaya",
};

const formatGeneratedAt = (iso: string) => {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function BmpDashboardClient({ initialView }: Props) {
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [category, setCategory] = useState<BmpFarmerGroupCategory | null>(null);
  // Default "Rataan" (rata-rata per tahun) — keputusan owner, bukan kumulatif semua tahun.
  const [year, setYear] = useState<number | "average">("average");
  // "full" = hanya lahan dengan data 12 bulan penuh Jan–Des pada tahun ybs (anti bias data bolong).
  const [dataMode, setDataMode] = useState<BmpDataMode>("all");

  const [districtOpen, setDistrictOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const view = initialView;
  const allGroups = useMemo(() => view?.data.groups ?? [], [view]);

  // Tahun tersedia dari snapshot (byYear per Lembaga).
  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    for (const g of allGroups) {
      for (const key of Object.keys(g.byYear ?? {})) {
        const y = Number(key);
        if (!Number.isNaN(y)) set.add(y);
      }
    }
    return [...set].sort((a, b) => b - a);
  }, [allGroups]);

  // Filter options derived from the snapshot itself (pola Main Dashboard).
  const districtOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of allGroups) {
      if (g.districtId) map.set(g.districtId, g.districtName ?? g.districtId);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allGroups]);

  const groupOptions = useMemo(
    () =>
      allGroups.filter(
        (g) =>
          (!districtId || g.districtId === districtId) && (!category || g.category === category)
      ),
    [allGroups, districtId, category]
  );

  // Client-side slicing dari satu snapshot org-wide (termasuk filter Tahun + kelengkapan data).
  const sliced = useMemo(
    () =>
      sumBmpGroups(
        filterBmpGroups({ groups: allGroups }, { districtId, groupId, category }),
        year,
        dataMode
      ),
    [allGroups, districtId, groupId, category, year, dataMode]
  );

  const selectedDistrict = districtOptions.find((d) => d.id === districtId);
  const selectedGroup = allGroups.find((g) => g.id === groupId);

  return (
    <div className="space-y-6">
      {/* Header: title + generate note (left), filters (right) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">BMP Dashboard (Produksi)</h1>
          {view ? (
            <p className="text-muted-foreground">
              Nilai di bawah di-generate pada{" "}
              <span className="font-medium text-foreground">{formatGeneratedAt(view.snapshotDate)}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">Belum ada snapshot</p>
          )}
        </div>

        {view && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Kategori Lembaga */}
            <Select
              value={category ?? "all"}
              onValueChange={(v) => {
                setCategory(v === "all" ? null : (v as BmpFarmerGroupCategory));
                setGroupId(null);
              }}
            >
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue>
                  {(value) => (value === "all" ? "Semua Kategori" : CATEGORY_LABELS[value as BmpFarmerGroupCategory])}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="EX_PLASMA">Ex-Plasma</SelectItem>
                <SelectItem value="SWADAYA">Swadaya</SelectItem>
              </SelectContent>
            </Select>

            {/* District */}
            <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
              <PopoverTrigger
                render={
                  <Button variant="outline" role="combobox" className="w-[180px] justify-between h-9 font-normal">
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
                          setGroupId(null);
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
                            setGroupId(null);
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

            {/* Lembaga Petani */}
            <Popover open={groupOpen} onOpenChange={setGroupOpen}>
              <PopoverTrigger
                render={
                  <Button variant="outline" role="combobox" className="w-[200px] justify-between h-9 font-normal">
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
                      <CommandItem value="Semua Lembaga Petani" onSelect={() => { setGroupId(null); setGroupOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", !groupId ? "opacity-100" : "opacity-0")} />
                        Semua Lembaga Petani
                      </CommandItem>
                      {groupOptions.map((g) => (
                        <CommandItem key={g.id} value={g.name} onSelect={() => { setGroupId(g.id); setGroupOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", groupId === g.id ? "opacity-100" : "opacity-0")} />
                          {g.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Tahun (global — memfilter cards + chart; default Rataan = rata-rata per tahun) */}
            <Select
              value={year === "average" ? "average" : String(year)}
              onValueChange={(v) => setYear(v === "average" || v == null ? "average" : Number(v))}
            >
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue>{(value) => (value === "average" ? "Rataan" : value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="average">Rataan</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Kelengkapan data (revisi owner): All vs hanya lahan full 1 tahun per periodenya */}
            <Select
              value={dataMode}
              onValueChange={(v) => setDataMode(v === "full" ? "full" : "all")}
            >
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue>
                  {(value) => (value === "full" ? "Data Full 1 Tahun" : "Semua Data")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Data</SelectItem>
                <SelectItem value="full">Data Full 1 Tahun</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {view ? (
        <>
          <BmpScoreCards
            totals={sliced.totals}
            produktivitas={sliced.produktivitasTonHa}
            yearLabel={`${year === "average" ? "rata-rata per tahun" : `tahun ${year}`}${
              dataMode === "full" ? " · lahan full 1 tahun" : ""
            }`}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <BmpTrendChart
                monthly={sliced.monthly}
                totalLahan={sliced.totals.totalLahan}
                year={year === "average" ? null : year}
              />
            </div>
            <div className="lg:col-span-1">
              <BmpAvailabilityPanel availability={sliced.availability} totalLahan={sliced.totals.totalLahan} />
            </div>
          </div>
        </>
      ) : (
        <Card className="border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-muted rounded-full text-muted-foreground">
              <Camera className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Belum ada snapshot</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Dashboard BMP menampilkan data dari snapshot terakhir (Semua Data). Buat snapshot
                terlebih dahulu melalui menu Tools.
              </p>
            </div>
            <Link href="/admin/tools/snapshot-bmp" className={cn(buttonVariants(), "gap-2")}>
              <Camera className="h-4 w-4" /> Ke Dashboard Snapshot BMP
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
