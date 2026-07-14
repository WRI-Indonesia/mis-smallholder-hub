"use client";

import { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Search, Building, Users, Layers, Trees } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { getFarmerGroupsForAnalyst, getFarmerSummary, getFarmersWithoutParcels } from "@/server/actions/data-analyst";
import type { FarmerDetailRow, FarmerSummaryResult, FarmerNoParcelsRow, FarmersWithoutParcelsResult } from "@/types/data-analyst";

interface District {
  id: string;
  name: string;
}

interface FarmerGroup {
  id: string;
  name: string;
  code: string | null;
}

interface Props {
  districts: District[];
  initialFarmerGroups: FarmerGroup[];
}

export function FarmerSummaryClient({ districts, initialFarmerGroups }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFarmerGroup, setSelectedFarmerGroup] = useState<string | null>(null);
  const [farmerGroups, setFarmerGroups] = useState<FarmerGroup[]>(initialFarmerGroups);

  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [groupComboOpen, setGroupComboOpen] = useState(false);

  const [summaryData, setSummaryData] = useState<FarmerSummaryResult | null>(null);
  const [noParcelsData, setNoParcelsData] = useState<FarmersWithoutParcelsResult | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Cascading filter: fetch groups when selected district changes
  useEffect(() => {
    async function updateGroups() {
      try {
        const groups = await getFarmerGroupsForAnalyst(selectedDistrict);
        setFarmerGroups(groups);
      } catch {
        toast.error("Gagal memuat Lembaga Petani");
      }
    }
    updateGroups();
  }, [selectedDistrict]);

  const handleDistrictSelect = (val: string | null) => {
    setSelectedDistrict(val);
    setSelectedFarmerGroup(null);
    setDistrictComboOpen(false);
  };

  const handleAnalyze = () => {
    startTransition(async () => {
      try {
        const [summary, noParcels] = await Promise.all([
          getFarmerSummary({ districtId: selectedDistrict, farmerGroupId: selectedFarmerGroup }),
          getFarmersWithoutParcels({ districtId: selectedDistrict, farmerGroupId: selectedFarmerGroup }),
        ]);
        setSummaryData(summary);
        setNoParcelsData(noParcels);
        setHasAnalyzed(true);
        toast.success("Analisis data berhasil dimuat");
      } catch (err) {
        toast.error((err instanceof Error && err.message) || "Gagal memuat analisis data");
      }
    });
  };

  const selectedDistrictObj = districts.find((d) => d.id === selectedDistrict);
  const selectedGroupObj = farmerGroups.find((g) => g.id === selectedFarmerGroup);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
  };

  const formatArea = (num: number) => {
    return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + " ha";
  };

  const formatPercent = (num: number) => {
    return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num) + "%";
  };

  const columnsTab1: DataTableColumn<FarmerDetailRow>[] = [
    {
      key: "farmerGroupName",
      label: "Nama Lembaga Petani",
      sortable: true,
      cellClassName: "text-sm font-medium",
    },
    {
      key: "farmerId",
      label: "ID Petani",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
    },
    {
      key: "farmerName",
      label: "Nama Petani",
      sortable: true,
      cellClassName: "text-sm font-medium",
    },
    {
      key: "totalParcels",
      label: "Total Persil",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right md:text-left pr-4 md:pr-0",
      render: (row) => formatNumber(row.totalParcels),
    },
  ];

  type Tab2Row = FarmerNoParcelsRow & { statusLahan: string };
  const columnsTab2: DataTableColumn<Tab2Row>[] = [
    {
      key: "farmerGroupName",
      label: "Nama Lembaga Petani",
      sortable: true,
      cellClassName: "text-sm font-medium",
    },
    {
      key: "farmerId",
      label: "ID Petani",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
    },
    {
      key: "farmerName",
      label: "Nama Petani",
      sortable: true,
      cellClassName: "text-sm font-medium",
    },
    {
      key: "statusLahan",
      label: "Status Lahan",
      sortable: false,
      render: () => <Badge variant="secondary">Belum ada lahan</Badge>,
    },
  ];

  const currentDateStr = format(new Date(), "yyyyMMdd");

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* District Filter */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distrik</span>
              <Popover open={districtComboOpen} onOpenChange={setDistrictComboOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={districtComboOpen}
                      className="w-[200px] justify-between h-9 font-normal text-left"
                    >
                      {selectedDistrict === null ? (
                        <span>Semua Distrik</span>
                      ) : (
                        <span>{selectedDistrictObj?.name}</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari distrik..." />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>Distrik tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => handleDistrictSelect(null)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedDistrict === null ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Semua Distrik
                        </CommandItem>
                        {districts.map((d) => (
                          <CommandItem
                            key={d.id}
                            value={d.name}
                            onSelect={() => handleDistrictSelect(d.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDistrict === d.id ? "opacity-100" : "opacity-0"
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

            {/* ICS / Farmer Group Filter */}
            <div className="flex flex-col gap-1.5 min-w-[250px]">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lembaga Petani (ICS)</span>
              <Popover open={groupComboOpen} onOpenChange={setGroupComboOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={groupComboOpen}
                      className="w-[250px] justify-between h-9 font-normal text-left"
                    >
                      {selectedFarmerGroup === null ? (
                        <span>Semua ICS</span>
                      ) : (
                        <span>{selectedGroupObj?.name}</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari lembaga petani..." />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>Lembaga Petani tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedFarmerGroup(null);
                            setGroupComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedFarmerGroup === null ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Semua ICS
                        </CommandItem>
                        {farmerGroups.map((g) => (
                          <CommandItem
                            key={g.id}
                            value={g.name}
                            onSelect={() => {
                              setSelectedFarmerGroup(g.id);
                              setGroupComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedFarmerGroup === g.id ? "opacity-100" : "opacity-0"
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
            </div>

            {/* Analyze Button */}
            <div className="flex flex-col gap-1.5 pt-5">
              <Button
                onClick={handleAnalyze}
                disabled={isPending}
                className="h-9"
              >
                <Search className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
                {isPending ? "Menganalisa..." : "Analisa"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {!hasAnalyzed ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <Building className="h-12 w-12 text-muted-foreground opacity-40 mb-4" />
          <p className="text-muted-foreground font-medium">Klik tombol Analisa untuk memulai</p>
        </Card>
      ) : (
        <Tabs defaultValue="detail-petani" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
            <TabsTrigger value="detail-petani">Detail Petani</TabsTrigger>
            <TabsTrigger value="petani-tanpa-lahan">Petani Tanpa Lahan</TabsTrigger>
          </TabsList>

          {/* Tab 1: Detail Petani */}
          <TabsContent value="detail-petani" className="space-y-6">
            {summaryData && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Card className="flex flex-row items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Lembaga Petani</span>
                      <span className="text-2xl font-bold">{formatNumber(summaryData.summary.totalKT)} Lembaga Petani</span>
                    </div>
                  </Card>

                  <Card className="flex flex-row items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Petani</span>
                      <span className="text-2xl font-bold">{formatNumber(summaryData.summary.totalPetani)} petani</span>
                    </div>
                  </Card>

                  <Card className="flex flex-row items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Persil</span>
                      <span className="text-2xl font-bold">{formatNumber(summaryData.summary.totalPersil)} persil</span>
                    </div>
                  </Card>

                  <Card className="flex flex-row items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Trees className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Luas Lahan</span>
                      <span className="text-2xl font-bold">{formatArea(summaryData.summary.totalLuasLahan)}</span>
                    </div>
                  </Card>
                </div>

                {/* Data Table */}
                <Card className="p-4">
                  <DataTable
                    columns={columnsTab1}
                    data={summaryData.rows}
                    rowKey={(row) => row.farmerId}
                    searchKey="farmerName"
                    searchPlaceholder="Cari petani..."
                    defaultPageSize={25}
                    exportFilename={`detail-petani-${currentDateStr}`}
                    getExportRow={(row) => ({
                      farmerGroupName: row.farmerGroupName,
                      farmerId: row.farmerId,
                      farmerName: row.farmerName,
                      totalParcels: row.totalParcels,
                    })}
                  />
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab 2: Petani Tanpa Lahan */}
          <TabsContent value="petani-tanpa-lahan" className="space-y-6">
            {noParcelsData && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card className="flex flex-row items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Lembaga Petani</span>
                      <span className="text-2xl font-bold">{formatNumber(noParcelsData.summary.totalKT)} Lembaga Petani</span>
                    </div>
                  </Card>

                  <Card className="flex flex-row items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Petani Tanpa Lahan</span>
                      <span className="text-2xl font-bold">{formatNumber(noParcelsData.summary.totalFarmersWithoutParcels)} petani</span>
                    </div>
                  </Card>

                  <Card className="flex flex-row items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">% dari Total Petani</span>
                      <span className="text-2xl font-bold">{formatPercent(noParcelsData.summary.percentageFromTotal)}</span>
                    </div>
                  </Card>
                </div>

                {/* Data Table */}
                <Card className="p-4">
                  <DataTable
                    columns={columnsTab2}
                    data={noParcelsData.rows.map((r) => ({ ...r, statusLahan: "Belum ada lahan" }))}
                    rowKey={(row) => row.farmerId}
                    searchKey="farmerName"
                    searchPlaceholder="Cari petani..."
                    defaultPageSize={25}
                    exportFilename={`petani-tanpa-lahan-${currentDateStr}`}
                    getExportRow={(row) => ({
                      farmerGroupName: row.farmerGroupName,
                      farmerId: row.farmerId,
                      farmerName: row.farmerName,
                      statusLahan: row.statusLahan,
                    })}
                  />
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
