"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, FileText, Building, Users, Layers, Trees, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { getFarmerGroupsForReport, getFarmerReport } from "@/server/actions/report";
import type { FarmerReportRow, FarmerReportResult } from "@/types/report";
import { exportToPDF } from "@/lib/pdf";

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
}

export function FarmerReportClient({ districts }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFarmerGroup, setSelectedFarmerGroup] = useState<string | null>(null);
  const [farmerGroups, setFarmerGroups] = useState<FarmerGroup[]>([]);

  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [groupComboOpen, setGroupComboOpen] = useState(false);

  const [reportData, setReportData] = useState<FarmerReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch groups when district selection changes
  useEffect(() => {
    async function updateGroups() {
      if (!selectedDistrict) {
        setFarmerGroups([]);
        return;
      }
      try {
        const groups = await getFarmerGroupsForReport(selectedDistrict);
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
    setReportData(null);
  };

  const handleFarmerGroupSelect = (val: string | null) => {
    setSelectedFarmerGroup(val);
    setGroupComboOpen(false);
    setReportData(null);
  };

  const handleLoadReport = () => {
    if (!selectedDistrict || !selectedFarmerGroup) {
      toast.error("Silakan pilih Distrik dan Lembaga Petani terlebih dahulu");
      return;
    }

    startTransition(async () => {
      try {
        const data = await getFarmerReport({
          districtId: selectedDistrict,
          farmerGroupId: selectedFarmerGroup,
        });
        setReportData(data);
        toast.success("Laporan berhasil dimuat");
      } catch (err) {
        toast.error((err instanceof Error && err.message) || "Gagal memuat laporan");
      }
    });
  };

  const selectedDistrictObj = districts.find((d) => d.id === selectedDistrict);
  const selectedGroupObj = farmerGroups.find((g) => g.id === selectedFarmerGroup);

  const handleExportPDF = () => {
    if (!reportData) return;
    
    exportToPDF({
      filename: `Laporan_Petani_${selectedDistrictObj?.name.replace(/\s+/g, "_")}_${selectedGroupObj?.name.replace(/\s+/g, "_")}`,
      title: "LAPORAN RINGKASAN DATA PETANI",
      subtitle: "Smallholder HUB Management Information System",
      metadata: [
        { label: "Distrik", value: selectedDistrictObj?.name ?? "—" },
        { label: "Lembaga Petani", value: selectedGroupObj?.name ?? "—" },
      ],
      columns: [
        { header: "ID Petani", key: "farmerId" },
        { header: "Nama Petani", key: "name" },
        { header: "Gender", key: "gender" },
        { header: "NIK", key: "nik" },
        { header: "Tahun Bergabung", key: "joinedYear" },
        { header: "Lahan (Persil)", key: "totalParcels" },
        { header: "Total Luas (Ha)", key: "totalArea" },
      ],
      data: reportData.rows.map(getExportRow),
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
  };

  const formatArea = (num: number) => {
    return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + " Ha";
  };

  const columns: DataTableColumn<FarmerReportRow>[] = [
    {
      key: "farmerId",
      label: "ID Petani",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
    },
    {
      key: "name",
      label: "Nama Petani",
      sortable: true,
      cellClassName: "text-sm font-medium",
    },
    {
      key: "gender",
      label: "L/P",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary">
          {row.gender === "M" ? "Laki-laki" : "Perempuan"}
        </Badge>
      ),
    },
    {
      key: "nik",
      label: "NIK",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
      render: (row) => row.nik ?? "—",
    },
    {
      key: "joinedYear",
      label: "Tahun Bergabung",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      render: (row) => row.joinedYear ?? "—",
    },
    {
      key: "totalParcels",
      label: "Jumlah Lahan (Persil)",
      sortable: true,
      cellClassName: "text-sm text-right md:text-left pr-4 md:pr-0 tabular-nums",
      render: (row) => formatNumber(row.totalParcels),
    },
    {
      key: "totalArea",
      label: "Total Luas (Ha)",
      sortable: true,
      cellClassName: "text-sm text-right md:text-left pr-4 md:pr-0 tabular-nums",
      render: (row) => formatArea(row.totalArea),
    },
  ];

  const getExportRow = (row: FarmerReportRow) => {
    return {
      farmerId: row.farmerId,
      name: row.name,
      gender: row.gender === "M" ? "Laki-laki" : "Perempuan",
      nik: row.nik ?? "—",
      joinedYear: row.joinedYear ?? "—",
      totalParcels: row.totalParcels,
      totalArea: row.totalArea,
    };
  };



  return (
    <div className="space-y-6">
      {/* Filters Area */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Distrik <span className="text-red-500">*</span></label>
              <Popover open={districtComboOpen} onOpenChange={setDistrictComboOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={districtComboOpen}
                      className="w-[220px] justify-between h-9 font-normal text-left"
                    >
                      {selectedDistrict ? (
                        <span>{selectedDistrictObj?.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Pilih Distrik</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari distrik..." />
                    <CommandList>
                      <CommandEmpty>Distrik tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
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

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Lembaga Petani <span className="text-red-500">*</span></label>
              <Popover open={groupComboOpen} onOpenChange={setGroupComboOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={groupComboOpen}
                      className="w-[220px] justify-between h-9 font-normal text-left"
                      disabled={!selectedDistrict}
                    >
                      {selectedFarmerGroup ? (
                        <span>{selectedGroupObj?.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Pilih Lembaga Petani</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari lembaga petani..." />
                    <CommandList>
                      <CommandEmpty>Kelompok tani tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {farmerGroups.map((g) => (
                          <CommandItem
                            key={g.id}
                            value={g.name}
                            onSelect={() => handleFarmerGroupSelect(g.id)}
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

            <Button
              onClick={handleLoadReport}
              disabled={isPending || !selectedDistrict || !selectedFarmerGroup}
              className="h-9 px-5"
            >
              Tampilkan Laporan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Print Document Header */}
      {reportData && (
        <div className="hidden print:block text-center border-b pb-4 mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">LAPORAN RINGKASAN PETANI</h1>
          <p className="text-sm text-muted-foreground mt-1">Smallholder HUB Management Information System</p>
          <div className="flex justify-center gap-6 mt-3 text-sm font-medium">
            <p><strong>Distrik:</strong> {selectedDistrictObj?.name}</p>
            <p><strong>Lembaga Petani:</strong> {selectedGroupObj?.name}</p>
          </div>
        </div>
      )}

      {/* Report Content */}
      {reportData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Petani</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(reportData.summary.totalPetani)}</div>
                <Badge variant="outline" className="mt-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                  Petani
                </Badge>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Lahan</CardTitle>
                <Layers className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(reportData.summary.totalPersil)}</div>
                <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700 border-blue-200">
                  Persil
                </Badge>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Luas Lahan</CardTitle>
                <Trees className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(reportData.summary.totalLuasLahan)}</div>
                <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-200">
                  Ha
                </Badge>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rata-rata Luas</CardTitle>
                <Building className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(reportData.summary.avgLuasLahan)}</div>
                <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-700 border-purple-200">
                  Ha / Petani
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Table Container */}
          <div>
            <DataTable
              columns={columns}
              data={reportData.rows}
              rowKey={(row) => row.id}
              searchKey="name"
              searchPlaceholder="Cari nama petani..."
              exportFilename={`Laporan_Petani_${selectedDistrictObj?.name.replace(/\s+/g, "_")}_${selectedGroupObj?.name.replace(/\s+/g, "_")}`}
              getExportRow={getExportRow}
              toolbarRight={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  className="h-9 gap-2 print:hidden"
                >
                  <Printer className="h-4 w-4" />
                  PDF
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <Card className="border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-muted rounded-full text-muted-foreground">
              <FileText className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Filter Wajib Belum Lengkap</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Silakan pilih Distrik dan Lembaga Petani untuk memuat ringkasan dan rincian data laporan petani.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
