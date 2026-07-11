"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, FileText, Download, Users, Layers, Sprout, CalendarRange, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getFarmerGroupsForProductionReport, getProductionReport } from "@/server/actions/report";
import type { ProductionReportResult } from "@/types/report";
import { formatPeriodLabel, enumeratePeriods, PRODUCTION_REPORT_MAX_MONTHS } from "@/lib/report-production";
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

export function ProductionReportClient({ districts }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFarmerGroup, setSelectedFarmerGroup] = useState<string | null>(null);
  const [farmerGroups, setFarmerGroups] = useState<FarmerGroup[]>([]);

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [groupComboOpen, setGroupComboOpen] = useState(false);

  const [reportData, setReportData] = useState<ProductionReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch groups when district selection changes
  useEffect(() => {
    async function updateGroups() {
      if (!selectedDistrict) {
        setFarmerGroups([]);
        return;
      }
      try {
        const groups = await getFarmerGroupsForProductionReport(selectedDistrict);
        setFarmerGroups(groups);
      } catch {
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

  const canLoad = !!selectedDistrict && !!selectedFarmerGroup && !!periodStart && !!periodEnd;

  const handleLoadReport = () => {
    if (!canLoad) {
      toast.error("Silakan lengkapi Distrik, Kelompok Tani, dan rentang periode");
      return;
    }

    // Client-side range guard (server re-validates)
    const periods = enumeratePeriods(periodStart, periodEnd);
    if (periods.length === 0) {
      toast.error("Periode Akhir harus sama dengan atau setelah Periode Awal");
      return;
    }
    if (periods.length > PRODUCTION_REPORT_MAX_MONTHS) {
      toast.error(`Rentang periode maksimal ${PRODUCTION_REPORT_MAX_MONTHS} bulan`);
      return;
    }

    startTransition(async () => {
      try {
        const data = await getProductionReport({
          districtId: selectedDistrict!,
          farmerGroupId: selectedFarmerGroup!,
          periodStart,
          periodEnd,
        });
        setReportData(data);
        toast.success("Laporan berhasil dimuat");
      } catch (err: any) {
        toast.error(err.message || "Gagal memuat laporan");
      }
    });
  };

  const selectedDistrictObj = districts.find((d) => d.id === selectedDistrict);
  const selectedGroupObj = farmerGroups.find((g) => g.id === selectedFarmerGroup);

  const formatNumber = (num: number) => new Intl.NumberFormat("id-ID").format(num);

  const formatCell = (num: number | undefined) => {
    if (num == null) return "";
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(num);
  };

  const formatArea = (num: number | null | undefined) => {
    if (num == null) return "-";
    return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const totalArea = reportData
    ? reportData.rows.reduce((sum, row) => sum + (row.parcelArea ?? 0), 0)
    : 0;

  const handleExportExcel = async () => {
    if (!reportData) return;
    const { exportToExcel } = await import("@/lib/xlsx");

    const columns = [
      { header: "No", key: "no" },
      { header: "Nama Petani", key: "name" },
      { header: "Id Petani", key: "farmerCode" },
      { header: "Id Lahan", key: "parcelCode" },
      { header: "Luas (Ha)", key: "parcelArea" },
      ...reportData.periods.map((p) => ({ header: formatPeriodLabel(p), key: p })),
      { header: "Total", key: "total" },
    ];

    const data: Record<string, string | number>[] = reportData.rows.map((row, idx) => {
      const rec: Record<string, string | number> = {
        no: idx + 1,
        name: row.name,
        farmerCode: row.farmerCode,
        parcelCode: row.parcelCode ?? "-",
        parcelArea: row.parcelArea != null ? row.parcelArea : "",
      };
      reportData.periods.forEach((p) => {
        rec[p] = row.values[p] != null ? row.values[p] : "";
      });
      rec.total = row.total;
      return rec;
    });

    // Column totals row
    const totalRow: Record<string, string | number> = {
      no: "",
      name: "Total per Bulan",
      farmerCode: "",
      parcelCode: "",
      parcelArea: parseFloat(totalArea.toFixed(2)),
    };
    reportData.periods.forEach((p) => {
      totalRow[p] = reportData.columnTotals[p] ?? 0;
    });
    totalRow.total = reportData.grandTotal;
    data.push(totalRow);

    await exportToExcel({
      filename: `Laporan_Produksi_${selectedGroupObj?.name.replace(/\s+/g, "_") ?? "KT"}_${periodStart}_sd_${periodEnd}`,
      sheetName: "Produksi",
      columns,
      data,
    });
  };

  const handleExportPDF = () => {
    if (!reportData) return;

    const columns = [
      { header: "No", key: "no" },
      { header: "Nama Petani", key: "name" },
      { header: "Id Petani", key: "farmerCode" },
      { header: "Id Lahan", key: "parcelCode" },
      { header: "Luas (Ha)", key: "parcelArea" },
      ...reportData.periods.map((p) => ({ header: formatPeriodLabel(p), key: p })),
      { header: "Total", key: "total" },
    ];

    // Cells formatted with id-ID separators; empty months stay blank (not 0).
    const data: Record<string, string | number>[] = reportData.rows.map((row, idx) => {
      const rec: Record<string, string | number> = {
        no: idx + 1,
        name: row.name,
        farmerCode: row.farmerCode,
        parcelCode: row.parcelCode ?? "-",
        parcelArea: formatArea(row.parcelArea),
      };
      reportData.periods.forEach((p) => {
        rec[p] = formatCell(row.values[p]);
      });
      rec.total = formatCell(row.total);
      return rec;
    });

    const totalRow: Record<string, string | number> = {
      no: "",
      name: "Total per Bulan",
      farmerCode: "",
      parcelCode: "",
      parcelArea: formatArea(totalArea),
    };
    reportData.periods.forEach((p) => {
      totalRow[p] = formatCell(reportData.columnTotals[p]);
    });
    totalRow.total = formatCell(reportData.grandTotal);
    data.push(totalRow);

    // Fixed widths for the identity columns so the remaining space goes to the
    // numeric columns — keeps numbers/headers on one line. Denser font when the
    // range is wide (many month columns).
    const monthCount = reportData.periods.length;
    const firstMonthIdx = 5; // after No, Nama, Id Petani, Id Lahan, Luas
    const totalIdx = firstMonthIdx + monthCount;
    const columnStyles: Record<number, Record<string, string | number>> = {
      0: { cellWidth: 7, halign: "right" }, // No
      1: { cellWidth: 25 }, // Nama Petani
      2: { cellWidth: 31, fontSize: 6 }, // Id Petani (smaller font keeps long codes on one line)
      3: { cellWidth: 33, fontSize: 6 }, // Id Lahan
      4: { cellWidth: 12, halign: "right" }, // Luas (Ha)
      [totalIdx]: { cellWidth: 15, halign: "right", fontStyle: "bold" }, // Total
    };
    for (let i = firstMonthIdx; i < totalIdx; i++) {
      columnStyles[i] = { halign: "right" }; // month columns
    }

    exportToPDF({
      filename: `Laporan_Produksi_${selectedGroupObj?.name.replace(/\s+/g, "_") ?? "KT"}_${periodStart}_sd_${periodEnd}`,
      title: "CATATAN PRODUKSI PETANI",
      subtitle: "Smallholder HUB Management Information System",
      orientation: "landscape",
      headFontSize: 7,
      bodyFontSize: monthCount > 12 ? 6 : 7,
      cellPadding: 1.5,
      columnStyles,
      metadata: [
        { label: "Distrik", value: selectedDistrictObj?.name ?? "—" },
        { label: "Kelompok Tani", value: selectedGroupObj?.name ?? "—" },
        { label: "Periode", value: `${formatPeriodLabel(periodStart)} s/d ${formatPeriodLabel(periodEnd)}` },
      ],
      columns,
      data,
    });
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

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Periode Awal <span className="text-red-500">*</span></label>
              <Input
                type="month"
                value={periodStart}
                max={periodEnd || undefined}
                onChange={(e) => {
                  setPeriodStart(e.target.value);
                  setReportData(null);
                }}
                className="w-[160px] h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Periode Akhir <span className="text-red-500">*</span></label>
              <Input
                type="month"
                value={periodEnd}
                min={periodStart || undefined}
                onChange={(e) => {
                  setPeriodEnd(e.target.value);
                  setReportData(null);
                }}
                className="w-[160px] h-9"
              />
            </div>

            <Button
              onClick={handleLoadReport}
              disabled={isPending || !canLoad}
              className="h-9 px-5"
            >
              Tampilkan Laporan
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Pilih Kelompok Tani dan rentang bulan (maksimal {PRODUCTION_REPORT_MAX_MONTHS} bulan) untuk menampilkan matriks produksi.
          </p>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4 print:hidden">
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
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Baris Lahan</CardTitle>
                <Layers className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(reportData.summary.totalLahan)}</div>
                <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700 border-blue-200">
                  Baris
                </Badge>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Produksi</CardTitle>
                <Sprout className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(reportData.summary.totalProduksi)}</div>
                <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-200">
                  kg
                </Badge>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah Bulan</CardTitle>
                <CalendarRange className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(reportData.summary.totalBulan)}</div>
                <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-700 border-purple-200">
                  Bulan
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Export toolbar */}
          <div className="flex items-center justify-end gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 gap-2">
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 gap-2">
              <Printer className="h-4 w-4" />
              PDF
            </Button>
          </div>

          {/* Matrix Table */}
          {reportData.rows.length === 0 ? (
            <Card className="border-dashed py-12">
              <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 bg-muted rounded-full text-muted-foreground">
                  <FileText className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">Tidak Ada Data Produksi</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Tidak ada catatan produksi untuk Kelompok Tani dan rentang periode yang dipilih.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border bg-card overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/70 border-b-2 border-border">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/70 z-10">No</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Nama Petani</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Id Petani</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Id Lahan</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">Luas (Ha)</th>
                    {reportData.periods.map((p) => (
                      <th key={p} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatPeriodLabel(p)}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-foreground whitespace-nowrap tabular-nums">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.map((row, idx) => (
                    <tr key={row.key} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground tabular-nums sticky left-0 bg-card z-10">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{row.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{row.farmerCode}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{row.parcelCode ?? "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-muted-foreground">{formatArea(row.parcelArea)}</td>
                      {reportData.periods.map((p) => (
                        <td key={p} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {formatCell(row.values[p])}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap">{formatCell(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                    <td className="px-3 py-2 sticky left-0 bg-muted/50 z-10" />
                    <td className="px-3 py-2 whitespace-nowrap" colSpan={3}>Total per Bulan</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatArea(totalArea)}</td>
                    {reportData.periods.map((p) => (
                      <td key={p} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {formatCell(reportData.columnTotals[p])}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatCell(reportData.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
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
                Silakan pilih Distrik, Kelompok Tani, dan rentang periode untuk memuat matriks produksi bulanan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
