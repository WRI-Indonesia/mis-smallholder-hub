"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ChevronsUpDown, MapPin, Users, Map as MapIcon, Ruler, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardSummaryCards } from "./summary-cards";
import { getLatestDashboardSnapshot } from "@/server/actions/dashboard";
import { sumKelompokTaniStats } from "@/lib/dashboard-aggregation";
import type { DashboardFilterOptions, DashboardSnapshotView, KTDetails } from "@/types/dashboard";

const DashboardMap = dynamic(() => import("./dashboard-map").then((m) => m.DashboardMap), {
  ssr: false,
  loading: () => <div className="h-full min-h-[420px] rounded-md border bg-muted/30 animate-pulse" />,
});

interface Props {
  initialView: DashboardSnapshotView | null;
  filterOptions: DashboardFilterOptions;
}

const PACKAGE_LABELS: { key: keyof KTDetails["trainingCoverage"]; label: string }[] = [
  { key: "PAKET_1_BMP_PC_RSPO_NKT", label: "Paket 1 - BMP" },
  { key: "PAKET_2_MK", label: "Paket 2 - MK" },
  { key: "PAKET_2_K3", label: "Paket 2 - HSE" },
  { key: "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV", label: "Paket 3 & 4" },
];

const formatArea = (n: number) =>
  `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ha`;

// dd-MMM-yy HH:mm
const formatGeneratedAt = (iso: string) => {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function DashboardClient({ initialView, filterOptions }: Props) {
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [joinedYear, setJoinedYear] = useState<number | null>(null);
  const [view, setView] = useState<DashboardSnapshotView | null>(initialView);
  const [selectedKtId, setSelectedKtId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [districtOpen, setDistrictOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const kts = view?.data.kelompokTaniList ?? [];
  const selectedKt = kts.find((kt) => kt.id === selectedKtId) ?? null;
  const displayedStats = selectedKt ? sumKelompokTaniStats([selectedKt]) : view?.data ?? null;

  const selectedDistrict = filterOptions.districts.find((d) => d.id === districtId);

  const reload = (nextDistrict: string | null, nextYear: number | null) => {
    startTransition(async () => {
      try {
        const fresh = await getLatestDashboardSnapshot({ districtId: nextDistrict, joinedYear: nextYear });
        setView(fresh);
        setSelectedKtId(null);
      } catch (err: any) {
        toast.error(err?.message || "Gagal memuat snapshot dashboard");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header: title + generate note (left), snapshot filters (right) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Main Dashboard</h1>
          {view ? (
            <p className="text-muted-foreground">
              Nilai di bawah di-generate pada{" "}
              <span className="font-medium text-foreground">{formatGeneratedAt(view.snapshotDate)}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">Belum ada snapshot untuk filter ini</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPending && <span className="text-sm text-muted-foreground">Memuat…</span>}

          {/* District snapshot selector */}
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
                        setDistrictOpen(false);
                        reload(null, joinedYear);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", !districtId ? "opacity-100" : "opacity-0")} />
                      Semua Distrik
                    </CommandItem>
                    {filterOptions.districts.map((d) => (
                      <CommandItem
                        key={d.id}
                        value={d.name}
                        onSelect={() => {
                          setDistrictId(d.id);
                          setDistrictOpen(false);
                          reload(d.id, joinedYear);
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

          {/* Kelompok Tani focus filter (within the loaded snapshot) */}
          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[200px] justify-between h-9 font-normal"
                  disabled={!view}
                >
                  <span className={cn("truncate", !selectedKtId && "text-muted-foreground")}>
                    {selectedKt?.name ?? "Semua Kelompok Tani"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              }
            />
            <PopoverContent className="w-[240px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Cari kelompok tani..." />
                <CommandList>
                  <CommandEmpty>Kelompok tani tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="Semua Kelompok Tani"
                      onSelect={() => {
                        setSelectedKtId(null);
                        setGroupOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", !selectedKtId ? "opacity-100" : "opacity-0")} />
                      Semua Kelompok Tani
                    </CommandItem>
                    {kts.map((kt) => (
                      <CommandItem
                        key={kt.id}
                        value={kt.name}
                        onSelect={() => {
                          setSelectedKtId(kt.id);
                          setGroupOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedKtId === kt.id ? "opacity-100" : "opacity-0")} />
                        {kt.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Year snapshot selector */}
          <Select
            value={joinedYear ? String(joinedYear) : "all"}
            onValueChange={(v) => {
              const y = v === "all" ? null : Number(v);
              setJoinedYear(y);
              reload(districtId, y);
            }}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {filterOptions.joinedYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {view && displayedStats ? (
        <>
          {/* Summary cards */}
          <DashboardSummaryCards stats={displayedStats} />

          {/* Map + info panel */}
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-3">
              <DashboardMap kelompokTaniList={kts} selectedId={selectedKtId} onSelect={setSelectedKtId} />
            </div>
            <div className="lg:col-span-1">
              <Card className="h-full border border-border/60 shadow-sm">
                {selectedKt ? (
                  <>
                    <CardHeader>
                      <CardTitle className="text-base font-bold">{selectedKt.name}</CardTitle>
                      {selectedKt.code && (
                        <p className="text-xs font-mono text-muted-foreground">{selectedKt.code}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[360px] overflow-y-auto">
                      <div className="space-y-2">
                        <StatRow icon={Users} label="Total Petani" value={String(selectedKt.totalFarmers)} />
                        <StatRow icon={MapIcon} label="Total Persil" value={String(selectedKt.totalParcels)} />
                        <StatRow icon={Ruler} label="Luas Lahan" value={formatArea(selectedKt.totalArea)} />
                      </div>
                      <div className="border-t pt-3 space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Cakupan Pelatihan
                        </p>
                        {PACKAGE_LABELS.map((p) => (
                          <div key={p.key} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{p.label}</span>
                            <span className="tabular-nums font-medium">
                              {selectedKt.trainingCoverage[p.key]}/{selectedKt.totalFarmers}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex flex-col items-center justify-center text-center h-full min-h-[360px] gap-3 py-10">
                    <div className="p-3 bg-muted rounded-full text-muted-foreground">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold">Pilih Kelompok Tani</h3>
                      <p className="text-sm text-muted-foreground">
                        Klik marker di peta untuk melihat detail informasi Kelompok Tani dan statistik petani.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
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
                Dashboard menampilkan data dari snapshot terakhir. Buat snapshot terlebih dahulu melalui menu Tools.
              </p>
            </div>
            <Link href="/admin/tools/snapshot" className={cn(buttonVariants(), "gap-2")}>
              <Camera className="h-4 w-4" /> Ke Dashboard Snapshot
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="tabular-nums font-semibold">{value}</span>
    </div>
  );
}
