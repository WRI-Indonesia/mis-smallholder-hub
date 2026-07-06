"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, FileText, Download, GraduationCap, Users, UserCheck, Calendar, BookOpen, BarChart3, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFarmerGroupsForTrainingReport, getTrainingReport } from "@/server/actions/report";
import type { TrainingReportResult, TrainingActivityReportRow, TrainingFarmerReportRow } from "@/types/report";
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

export const TRAINING_CATEGORY_LABELS: Record<string, string> = {
  PAKET_1_BMP_PC_RSPO_NKT: "Paket 1 - BMP + P&C RSPO + NKT",
  PAKET_2_MK: "Paket 2 - MK (Manajemen Kebun)",
  PAKET_2_K3: "Paket 2 - K3 (Keselamatan & Kesehatan Kerja)",
  PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: "Paket 3&4",
  OTHER: "Lainnya",
};

export function TrainingReportClient({ districts }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFarmerGroup, setSelectedFarmerGroup] = useState<string | null>(null);
  const [farmerGroups, setFarmerGroups] = useState<FarmerGroup[]>([]);

  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [groupComboOpen, setGroupComboOpen] = useState(false);

  const [reportData, setReportData] = useState<TrainingReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Tab 2 specific training filter for PDF / display
  const [selectedTrainingActivityId, setSelectedTrainingActivityId] = useState<string>("all");
  const [trainingComboOpen, setTrainingComboOpen] = useState(false);

  // Fetch groups when district selection changes
  useEffect(() => {
    async function updateGroups() {
      if (!selectedDistrict) {
        setFarmerGroups([]);
        return;
      }
      try {
        const groups = await getFarmerGroupsForTrainingReport(selectedDistrict);
        setFarmerGroups(groups);
      } catch (err) {
        toast.error("Gagal memuat Kelompok Tani");
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
      toast.error("Silakan pilih Distrik dan Kelompok Tani terlebih dahulu");
      return;
    }

    startTransition(async () => {
      try {
        const data = await getTrainingReport({
          districtId: selectedDistrict,
          farmerGroupId: selectedFarmerGroup,
        });
        setReportData(data);
        setSelectedTrainingActivityId("all"); // Reset training filter
        toast.success("Laporan berhasil dimuat");
      } catch (err: any) {
        toast.error(err.message || "Gagal memuat laporan");
      }
    });
  };

  const selectedDistrictObj = districts.find((d) => d.id === selectedDistrict);
  const selectedGroupObj = farmerGroups.find((g) => g.id === selectedFarmerGroup);

  const formatDateDMY = (dateInput: string | Date | null, fallback = "-belum-") => {
    if (!dateInput) return fallback;
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return fallback;
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Tab 1: Activities DataTable config
  const activityColumns: DataTableColumn<TrainingActivityReportRow>[] = [
    {
      key: "packageName",
      label: "Paket Pelatihan",
      sortable: true,
      cellClassName: "text-sm font-medium",
      render: (row) => TRAINING_CATEGORY_LABELS[row.packageCode] || row.packageName,
    },
    {
      key: "trainingDate",
      label: "Tanggal Pelatihan",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      render: (row) => formatDateDMY(row.trainingDate, "—"),
    },
    {
      key: "location",
      label: "Lokasi",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.location ?? "—",
    },
    {
      key: "totalParticipants",
      label: "Total Peserta",
      sortable: true,
      cellClassName: "text-sm text-right pr-4 tabular-nums",
      render: (row) => `${row.totalParticipants} Peserta`,
    },
  ];

  const getActivityExportRow = (row: TrainingActivityReportRow) => {
    return {
      packageName: TRAINING_CATEGORY_LABELS[row.packageCode] || row.packageName,
      trainingDate: formatDateDMY(row.trainingDate, "—"),
      location: row.location ?? "—",
      totalParticipants: `${row.totalParticipants} Peserta`,
    };
  };

  const formatCellDate = (dateStr: string | null) => {
    const formatted = formatDateDMY(dateStr);
    if (formatted === "-belum-") {
      return <span className="text-muted-foreground">-belum-</span>;
    }
    return formatted;
  };

  // Tab 2: Coverage Grid Columns
  const coverageColumns: DataTableColumn<TrainingFarmerReportRow>[] = [
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
      key: "paket1Date",
      label: "Paket 1",
      sortable: true,
      render: (row) => formatCellDate(row.paket1Date),
    },
    {
      key: "paket2MKDate",
      label: "Paket 2 - MK",
      sortable: true,
      render: (row) => formatCellDate(row.paket2MKDate),
    },
    {
      key: "paket2K3Date",
      label: "Paket 2 - K3",
      sortable: true,
      render: (row) => formatCellDate(row.paket2K3Date),
    },
    {
      key: "paket34Date",
      label: "Paket 3 & 4",
      sortable: true,
      render: (row) => formatCellDate(row.paket34Date),
    },
  ];

  const getCoverageExportRow = (row: TrainingFarmerReportRow) => {
    return {
      farmerId: row.farmerId,
      name: row.name,
      gender: row.gender === "M" ? "Laki-laki" : "Perempuan",
      hasPaket1: formatDateDMY(row.paket1Date),
      hasPaket2MK: formatDateDMY(row.paket2MKDate),
      hasPaket2K3: formatDateDMY(row.paket2K3Date),
      hasPaket34: formatDateDMY(row.paket34Date),
    };
  };

  // Tab 2: Specific Training participant list
  const selectedTraining = reportData?.activities.find((a) => a.id === selectedTrainingActivityId);
  const selectedTrainingDate = selectedTraining
    ? formatDateDMY(selectedTraining.trainingDate, "—")
    : "";

  const specificTrainingColumns: DataTableColumn<any>[] = [
    {
      key: "no",
      label: "NO",
      sortable: false,
    },
    {
      key: "name",
      label: "Nama Petani",
      sortable: true,
      cellClassName: "text-sm font-medium",
    },
    {
      key: "farmerIdCode",
      label: "Farmer ID",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
    },
    {
      key: "trainingDate",
      label: "Tanggal",
      sortable: false,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      render: () => selectedTrainingDate,
    },
    {
      key: "preTestScore",
      label: "Pre-Test",
      sortable: true,
      cellClassName: "text-sm tabular-nums",
      render: (row) => row.preTestScore ?? "—",
    },
    {
      key: "postTestScore",
      label: "Post-Test",
      sortable: true,
      cellClassName: "text-sm tabular-nums",
      render: (row) => row.postTestScore ?? "—",
    },
  ];

  const getSpecificTrainingExportRow = (row: any, idx?: number) => {
    return {
      no: idx !== undefined ? idx + 1 : "",
      name: row.name,
      farmerIdCode: row.farmerIdCode,
      trainingDate: selectedTrainingDate,
      preTestScore: row.preTestScore ?? "—",
      postTestScore: row.postTestScore ?? "—",
    };
  };

  // Multiple Sheet Excel Export trigger
  const handleExportExcel = async () => {
    if (!reportData) return;

    const { exportMultiSheetToExcel } = await import("@/lib/xlsx");

    const activityExportData = reportData.activities.map(getActivityExportRow);
    const coverageExportData = reportData.farmers.map(getCoverageExportRow);

    await exportMultiSheetToExcel({
      filename: `Laporan_Pelatihan_${selectedDistrictObj?.name.replace(/\s+/g, "_")}_${selectedGroupObj?.name.replace(/\s+/g, "_")}`,
      sheets: [
        {
          name: "Kegiatan Pelatihan",
          columns: [
            { header: "Paket Pelatihan", key: "packageName" },
            { header: "Tanggal Pelatihan", key: "trainingDate" },
            { header: "Lokasi", key: "location" },
            { header: "Total Peserta", key: "totalParticipants" },
          ],
          data: activityExportData,
        },
        {
          name: "Cakupan per Petani",
          columns: [
            { header: "Farmer ID", key: "farmerId" },
            { header: "Nama Petani", key: "name" },
            { header: "Gender", key: "gender" },
            { header: "Paket 1 (BMP+RSPO)", key: "hasPaket1" },
            { header: "Paket 2 - MK", key: "hasPaket2MK" },
            { header: "Paket 2 - K3", key: "hasPaket2K3" },
            { header: "Paket 3 & 4", key: "hasPaket34" },
          ],
          data: coverageExportData,
        },
      ],
    });
  };

  // PDF Export trigger (specific training activity or overall coverage depending on filters)
  const handleExportPDF = () => {
    if (!reportData) return;

    if (selectedTrainingActivityId !== "all" && selectedTraining) {
      // Export single training participant list: NO, Nama Petani, Farmer ID, Tanggal, Pre-Test, Post-Test
      exportToPDF({
        filename: `Laporan_Pelatihan_Kegiatan_${selectedTraining.packageName.replace(/\s+/g, "_")}`,
        title: "LAPORAN KEGIATAN PELATIHAN",
        subtitle: "Smallholder HUB Management Information System",
        metadata: [
          { label: "Distrik", value: selectedDistrictObj?.name ?? "—" },
          { label: "Kelompok Tani", value: selectedGroupObj?.name ?? "—" },
          { label: "Jenis Pelatihan", value: TRAINING_CATEGORY_LABELS[selectedTraining.packageCode] || selectedTraining.packageName },
          { label: "Tanggal", value: selectedTrainingDate },
          { label: "Lokasi", value: selectedTraining.location ?? "—" },
        ],
        columns: [
          { header: "NO", key: "no" },
          { header: "Nama Petani", key: "name" },
          { header: "Farmer ID", key: "farmerIdCode" },
          { header: "Tanggal", key: "trainingDate" },
          { header: "Pre-Test", key: "preTestScore" },
          { header: "Post-Test", key: "postTestScore" },
        ],
        data: selectedTraining.participants.map((p, idx) => getSpecificTrainingExportRow(p, idx)),
      });
    } else {
      // Export overall coverage report
      exportToPDF({
        filename: `Laporan_Cakupan_Pelatihan_${selectedDistrictObj?.name.replace(/\s+/g, "_")}_${selectedGroupObj?.name.replace(/\s+/g, "_")}`,
        title: "LAPORAN CAKUPAN PELATIHAN PETANI",
        subtitle: "Smallholder HUB Management Information System",
        metadata: [
          { label: "Distrik", value: selectedDistrictObj?.name ?? "—" },
          { label: "Kelompok Tani", value: selectedGroupObj?.name ?? "—" },
        ],
        columns: [
          { header: "Farmer ID", key: "farmerId" },
          { header: "Nama Petani", key: "name" },
          { header: "Gender", key: "gender" },
          { header: "Paket 1", key: "hasPaket1" },
          { header: "Paket 2 - MK", key: "hasPaket2MK" },
          { header: "Paket 2 - K3", key: "hasPaket2K3" },
          { header: "Paket 3 & 4", key: "hasPaket34" },
        ],
        data: reportData.farmers.map(getCoverageExportRow),
      });
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
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
              <label className="text-sm font-medium text-muted-foreground">Kelompok Tani <span className="text-red-500">*</span></label>
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
                        <span className="text-muted-foreground">Pilih Kelompok Tani</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari kelompok tani..." />
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
          <h1 className="text-3xl font-extrabold tracking-tight">LAPORAN RINGKASAN PELATIHAN</h1>
          <p className="text-sm text-muted-foreground mt-1">Smallholder HUB Management Information System</p>
          <div className="flex justify-center gap-6 mt-3 text-sm font-medium">
            <p><strong>Distrik:</strong> {selectedDistrictObj?.name}</p>
            <p><strong>Kelompok Tani (KT):</strong> {selectedGroupObj?.name}</p>
          </div>
        </div>
      )}

      {/* Report Content */}
      {reportData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="shadow-sm border border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Kegiatan</CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatNumber(reportData.summary.totalKegiatan)}</div>
                  <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700 border-blue-100">
                    Kegiatan
                  </Badge>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Peserta</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatNumber(reportData.summary.totalPeserta)}</div>
                  <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-100">
                    Peserta
                  </Badge>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Unik</CardTitle>
                  <UserCheck className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatNumber(reportData.summary.totalPesertaUnik)}</div>
                  <Badge variant="outline" className="mt-1 bg-emerald-50 text-emerald-700 border-emerald-100">
                    Petani
                  </Badge>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card className="shadow-sm border border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cakupan Paket 1</CardTitle>
                  <BookOpen className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{reportData.summary.pctPaket1}%</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{reportData.summary.totalUnikPaket1} dari {reportData.summary.totalPetani}</div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cakupan Paket 2 - MK</CardTitle>
                  <BookOpen className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{reportData.summary.pctPaket2MK}%</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{reportData.summary.totalUnikPaket2MK} dari {reportData.summary.totalPetani}</div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cakupan Paket 2 - HSE (K3)</CardTitle>
                  <BookOpen className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{reportData.summary.pctPaket2K3}%</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{reportData.summary.totalUnikPaket2K3} dari {reportData.summary.totalPetani}</div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cakupan P3 & 4</CardTitle>
                  <BookOpen className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{reportData.summary.pctPaket34}%</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{reportData.summary.totalUnikPaket34} dari {reportData.summary.totalPetani}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabs Container */}
          <Tabs defaultValue="activities" className="w-full">
            <div className="flex items-center justify-between border-b pb-1 print:hidden">
              <TabsList className="bg-transparent gap-6 h-auto p-0 border-b-0">
                <TabsTrigger
                  value="activities"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 pt-1 text-sm font-semibold shadow-none"
                >
                  Kegiatan Pelatihan
                </TabsTrigger>
                <TabsTrigger
                  value="farmers"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 pt-1 text-sm font-semibold shadow-none"
                >
                  Cakupan per Petani
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="h-9 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Excel (2-Sheet)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  className="h-9 gap-2"
                >
                  <Printer className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>

            <TabsContent value="activities" className="mt-6">
              <DataTable
                columns={activityColumns}
                data={reportData.activities}
                rowKey={(row) => row.id}
                searchKey="packageName"
                searchPlaceholder="Cari paket pelatihan..."
              />
            </TabsContent>

            <TabsContent value="farmers" className="mt-6 space-y-6">
              {/* Tab 2 specific training dropdown filter */}
              <div className="flex flex-wrap items-center gap-4 bg-muted/40 p-4 rounded-lg border print:hidden">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" /> Filter Jenis Pelatihan:
                  </span>
                  <Popover open={trainingComboOpen} onOpenChange={setTrainingComboOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={trainingComboOpen}
                          className="w-[300px] justify-between h-9 font-normal text-left bg-background"
                        >
                          {selectedTrainingActivityId === "all" ? (
                            <span>Semua Pelatihan (Cakupan per Petani)</span>
                          ) : (
                            <span className="truncate">
                              {TRAINING_CATEGORY_LABELS[selectedTraining?.packageCode ?? ""] || selectedTraining?.packageName}
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      }
                    />
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cari kegiatan..." />
                        <CommandList>
                          <CommandEmpty>Kegiatan tidak ditemukan.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setSelectedTrainingActivityId("all");
                                setTrainingComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTrainingActivityId === "all" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Semua Pelatihan (Cakupan per Petani)
                            </CommandItem>
                            {reportData.activities.map((act) => (
                              <CommandItem
                                key={act.id}
                                value={TRAINING_CATEGORY_LABELS[act.packageCode] || act.packageName}
                                onSelect={() => {
                                  setSelectedTrainingActivityId(act.id);
                                  setTrainingComboOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedTrainingActivityId === act.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="truncate">
                                  {TRAINING_CATEGORY_LABELS[act.packageCode] || act.packageName} ({formatDateDMY(act.trainingDate, "—")})
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {selectedTrainingActivityId === "all" ? (
                <DataTable
                  columns={coverageColumns}
                  data={reportData.farmers}
                  rowKey={(row) => row.id}
                  searchKey="name"
                  searchPlaceholder="Cari nama petani..."
                  exportFilename={`Laporan_Cakupan_Pelatihan_${selectedDistrictObj?.name.replace(/\s+/g, "_")}_${selectedGroupObj?.name.replace(/\s+/g, "_")}`}
                  getExportRow={getCoverageExportRow}
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
              ) : (
                <div className="space-y-4">
                  <div className="hidden print:block border-t pt-4">
                    <h2 className="text-xl font-bold">DAFTAR PESERTA PELATIHAN</h2>
                    <table className="w-full text-sm mt-2 border-collapse">
                      <tbody>
                        <tr>
                          <td className="w-1/4 font-semibold pb-1">Jenis Pelatihan</td>
                          <td className="pb-1">: {TRAINING_CATEGORY_LABELS[selectedTraining?.packageCode ?? ""] || selectedTraining?.packageName}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold pb-1">Tanggal</td>
                          <td className="pb-1">: {selectedTrainingDate}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold">Lokasi</td>
                          <td>: {selectedTraining?.location ?? "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <DataTable
                    columns={specificTrainingColumns}
                    data={(selectedTraining?.participants ?? []).map((p, idx) => ({ ...p, no: idx + 1 }))}
                    rowKey={(row) => row.farmerId}
                    searchKey="name"
                    searchPlaceholder="Cari nama peserta..."
                    exportFilename={`Laporan_Pelatihan_Kegiatan_${selectedTraining?.packageName.replace(/\s+/g, "_")}`}
                    getExportRow={getSpecificTrainingExportRow}
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
              )}
            </TabsContent>
          </Tabs>
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
                Silakan pilih Distrik dan Kelompok Tani untuk memuat ringkasan, kegiatan pelatihan, dan cakupan data laporan pelatihan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
