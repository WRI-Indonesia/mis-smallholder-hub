"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, FileText, Download, Network, Layers, Users, Sprout, MapPin, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getFarmerGroupsForKtReport, getKelompokTaniDetailReport } from "@/server/actions/report";
import type { KelompokTaniDetailReportResult } from "@/types/report";
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

const UNKNOWN = "(tidak diketahui)";

export function KelompokTaniDetailReportClient({ districts }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFarmerGroup, setSelectedFarmerGroup] = useState<string | null>(null);
  const [farmerGroups, setFarmerGroups] = useState<FarmerGroup[]>([]);

  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [groupComboOpen, setGroupComboOpen] = useState(false);

  const [reportData, setReportData] = useState<KelompokTaniDetailReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Refresh daftar Lembaga saat Distrik berubah.
  useEffect(() => {
    async function updateGroups() {
      try {
        const groups = await getFarmerGroupsForKtReport(selectedDistrict);
        setFarmerGroups(groups);
      } catch {
        toast.error("Gagal memuat Lembaga Petani");
      }
    }
    updateGroups();
  }, [selectedDistrict]);

  const loadReport = (farmerGroupId: string) => {
    startTransition(async () => {
      try {
        const data = await getKelompokTaniDetailReport(farmerGroupId);
        setReportData(data);
      } catch (err) {
        toast.error((err instanceof Error && err.message) || "Gagal memuat laporan");
      }
    });
  };

  const handleDistrictSelect = (val: string | null) => {
    setSelectedDistrict(val);
    setSelectedFarmerGroup(null);
    setReportData(null);
    setDistrictComboOpen(false);
  };

  const handleFarmerGroupSelect = (val: string) => {
    setSelectedFarmerGroup(val);
    setGroupComboOpen(false);
    loadReport(val);
  };

  const selectedDistrictObj = districts.find((d) => d.id === selectedDistrict);
  const selectedGroupObj = farmerGroups.find((g) => g.id === selectedFarmerGroup);

  const formatNumber = (num: number) => new Intl.NumberFormat("id-ID").format(num);
  const formatLuas = (num: number) =>
    new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  const displayOrUnknown = (v: string | null) => v ?? UNKNOWN;

  const summaryCards = reportData
    ? [
        { label: "Gapoktan/KUD", value: formatNumber(reportData.summary.totalGapoktan), icon: Network, badge: "Gapoktan/KUD", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
        { label: "Kelompok Tani", value: formatNumber(reportData.summary.totalKelompokTani), icon: Layers, badge: "KT", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
        { label: "Total Petani", value: formatNumber(reportData.summary.totalPetani), icon: Users, badge: "Petani", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
        { label: "Total Lahan", value: formatNumber(reportData.summary.totalLahan), icon: Sprout, badge: "Lahan", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
        { label: "Total Luas", value: formatLuas(reportData.summary.totalLuas), icon: MapPin, badge: "Ha", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      ]
    : [];

  // Ratakan roster jadi baris petani untuk export (Excel/PDF).
  const buildExportColumns = () => [
    { header: "No", key: "no" },
    { header: "Gapoktan/KUD", key: "gapoktan" },
    { header: "Kelompok Tani", key: "kelompokTani" },
    { header: "Nama Petani", key: "name" },
    { header: "ID Petani", key: "farmerCode" },
    { header: "Jml Lahan", key: "totalLahan" },
    { header: "Luas (Ha)", key: "totalLuas" },
  ];

  const flattenRows = (numeric: boolean): Record<string, string | number>[] => {
    if (!reportData) return [];
    const rows: Record<string, string | number>[] = [];
    let no = 0;
    for (const g of reportData.gapoktanList) {
      for (const kt of g.kelompokTaniList) {
        for (const p of kt.petani) {
          no += 1;
          rows.push({
            no,
            gapoktan: displayOrUnknown(g.gapoktan),
            kelompokTani: displayOrUnknown(kt.kelompokTani),
            name: p.name,
            farmerCode: p.farmerCode,
            totalLahan: numeric ? p.totalLahan : formatNumber(p.totalLahan),
            totalLuas: numeric ? Number(p.totalLuas.toFixed(2)) : formatLuas(p.totalLuas),
          });
        }
      }
    }
    return rows;
  };

  const scopeLabel = () => selectedGroupObj?.name.replace(/\s+/g, "_") ?? "Lembaga";

  const handleExportExcel = async () => {
    if (!reportData) return;
    const { exportToExcel } = await import("@/lib/xlsx");
    const data = flattenRows(true);
    data.push({
      no: "",
      gapoktan: "",
      kelompokTani: "",
      name: "Total",
      farmerCode: "",
      totalLahan: reportData.summary.totalLahan,
      totalLuas: Number(reportData.summary.totalLuas.toFixed(2)),
    });
    await exportToExcel({
      filename: `Laporan_Kelompok_Tani_Detail_${scopeLabel()}`,
      sheetName: "Detail KT",
      columns: buildExportColumns(),
      data,
    });
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    const data = flattenRows(false);
    data.push({
      no: "",
      gapoktan: "",
      kelompokTani: "",
      name: "Total",
      farmerCode: "",
      totalLahan: formatNumber(reportData.summary.totalLahan),
      totalLuas: formatLuas(reportData.summary.totalLuas),
    });
    exportToPDF({
      filename: `Laporan_Kelompok_Tani_Detail_${scopeLabel()}`,
      title: "LAPORAN KELOMPOK TANI (DETAIL)",
      subtitle: "Smallholder HUB Management Information System",
      metadata: [
        { label: "Lembaga Petani", value: reportData.lembagaTani },
        { label: "Distrik", value: selectedDistrictObj?.name ?? "—" },
      ],
      columns: buildExportColumns(),
      columnStyles: {
        0: { cellWidth: 10, halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
      },
      data,
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Distrik</label>
              <Popover open={districtComboOpen} onOpenChange={setDistrictComboOpen}>
                <PopoverTrigger
                  render={
                    <Button variant="outline" role="combobox" aria-expanded={districtComboOpen} className="w-[220px] justify-between h-9 font-normal text-left">
                      {selectedDistrict ? <span>{selectedDistrictObj?.name}</span> : <span className="text-muted-foreground">Semua Distrik</span>}
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
                        <CommandItem value="__all__" onSelect={() => handleDistrictSelect(null)}>
                          <Check className={cn("mr-2 h-4 w-4", selectedDistrict === null ? "opacity-100" : "opacity-0")} />
                          Semua Distrik
                        </CommandItem>
                        {districts.map((d) => (
                          <CommandItem key={d.id} value={d.name} onSelect={() => handleDistrictSelect(d.id)}>
                            <Check className={cn("mr-2 h-4 w-4", selectedDistrict === d.id ? "opacity-100" : "opacity-0")} />
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
                    <Button variant="outline" role="combobox" aria-expanded={groupComboOpen} className="w-[260px] justify-between h-9 font-normal text-left">
                      {selectedFarmerGroup ? <span>{selectedGroupObj?.name}</span> : <span className="text-muted-foreground">Pilih Lembaga Petani</span>}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[260px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari lembaga petani..." />
                    <CommandList>
                      <CommandEmpty>Lembaga petani tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {farmerGroups.map((g) => (
                          <CommandItem key={g.id} value={g.name} onSelect={() => handleFarmerGroupSelect(g.id)}>
                            <Check className={cn("mr-2 h-4 w-4", selectedFarmerGroup === g.id ? "opacity-100" : "opacity-0")} />
                            {g.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Pilih satu Lembaga Petani untuk menampilkan roster rinci. Filter Distrik opsional (mempersempit daftar Lembaga).
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
          {summaryCards.map((c) => (
            <Card key={c.label} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</CardTitle>
                <c.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
                <Badge variant="outline" className={cn("mt-1", c.badgeClass)}>{c.badge}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Export toolbar */}
      {reportData && reportData.gapoktanList.length > 0 && (
        <div className="flex items-center justify-between gap-2 print:hidden">
          <p className="text-sm text-muted-foreground">
            Lembaga Petani: <span className="font-medium text-foreground">{reportData.lembagaTani}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 gap-2">
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 gap-2">
              <Printer className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      )}

      {/* Roster */}
      {!reportData ? (
        <Card className="border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-muted rounded-full text-muted-foreground">
              <FileText className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{isPending ? "Memuat laporan..." : "Pilih Lembaga Petani"}</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Pilih satu Lembaga Petani untuk menampilkan rincian Gapoktan/KUD, Kelompok Tani, dan daftar Petani.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : reportData.gapoktanList.length === 0 ? (
        <Card className="border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-muted rounded-full text-muted-foreground">
              <FileText className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Tidak Ada Data</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Lembaga Petani ini belum memiliki lahan aktif dengan data Gapoktan/KUD atau Kelompok Tani.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {reportData.gapoktanList.map((g, gi) => (
            <div key={`${g.gapoktan ?? "null"}-${gi}`} className="rounded-md border bg-card overflow-hidden">
              {/* Gapoktan header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/60 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" />
                  <span className={cn("font-semibold", g.gapoktan == null && "italic text-muted-foreground")}>
                    {displayOrUnknown(g.gapoktan)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatNumber(g.totalKelompokTani)} KT</span>
                  <span>{formatNumber(g.totalPetani)} Petani</span>
                  <span>{formatNumber(g.totalLahan)} Lahan</span>
                  <span>{formatLuas(g.totalLuas)} Ha</span>
                </div>
              </div>

              {/* Kelompok Tani sections */}
              <div className="divide-y">
                {g.kelompokTaniList.map((kt, ki) => (
                  <div key={`${kt.kelompokTani ?? "null"}-${ki}`} className="px-4 py-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={cn("text-sm font-medium", kt.kelompokTani == null && "italic text-muted-foreground")}>
                          {displayOrUnknown(kt.kelompokTani)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatNumber(kt.totalPetani)} Petani</span>
                        <span>{formatNumber(kt.totalLahan)} Lahan</span>
                        <span>{formatLuas(kt.totalLuas)} Ha</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded border">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted/40 border-b">
                            <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">No</th>
                            <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Nama Petani</th>
                            <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">ID Petani</th>
                            <th className="px-3 py-1.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">Jml Lahan</th>
                            <th className="px-3 py-1.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">Luas (Ha)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kt.petani.map((p, pi) => (
                            <tr key={p.farmerId} className="border-b last:border-b-0 hover:bg-muted/20">
                              <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{pi + 1}</td>
                              <td className="px-3 py-1.5 font-medium whitespace-nowrap">{p.name}</td>
                              <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.farmerCode}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{formatNumber(p.totalLahan)}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{formatLuas(p.totalLuas)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
