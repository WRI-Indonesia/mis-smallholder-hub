"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, FileText, Download, Building2, Users, Layers, Sprout, Network, Printer, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getFarmerGroupsForKtReport, getKelompokTaniReport } from "@/server/actions/report";
import type { KelompokTaniReportResult } from "@/types/report";
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

export function KelompokTaniReportClient({ districts }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFarmerGroup, setSelectedFarmerGroup] = useState<string | null>(null);
  const [farmerGroups, setFarmerGroups] = useState<FarmerGroup[]>([]);

  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [groupComboOpen, setGroupComboOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [reportData, setReportData] = useState<KelompokTaniReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadReport = (districtId: string | null, farmerGroupId: string | null) => {
    startTransition(async () => {
      try {
        const data = await getKelompokTaniReport({ districtId, farmerGroupId });
        setReportData(data);
      } catch (err) {
        toast.error((err instanceof Error && err.message) || "Gagal memuat laporan");
      }
    });
  };

  // Real-time report: muat penuh saat mount, muat ulang saat filter berubah.
  useEffect(() => {
    loadReport(selectedDistrict, selectedFarmerGroup);
  }, [selectedDistrict, selectedFarmerGroup]);

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

  const handleDistrictSelect = (val: string | null) => {
    setSelectedDistrict(val);
    setSelectedFarmerGroup(null);
    setDistrictComboOpen(false);
  };

  const handleFarmerGroupSelect = (val: string | null) => {
    setSelectedFarmerGroup(val);
    setGroupComboOpen(false);
  };

  const selectedDistrictObj = districts.find((d) => d.id === selectedDistrict);
  const selectedGroupObj = farmerGroups.find((g) => g.id === selectedFarmerGroup);

  const formatNumber = (num: number) => new Intl.NumberFormat("id-ID").format(num);
  const displayOrUnknown = (v: string | null) => v ?? UNKNOWN;

  const filteredRows = useMemo(() => {
    if (!reportData) return [];
    const q = search.trim().toLowerCase();
    if (!q) return reportData.rows;
    return reportData.rows.filter((r) =>
      [r.lembagaTani, r.gapoktan ?? UNKNOWN, r.kelompokTani ?? UNKNOWN]
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [reportData, search]);

  const filteredTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.totalPetani += r.totalPetani;
        acc.totalLahan += r.totalLahan;
        return acc;
      },
      { totalPetani: 0, totalLahan: 0 },
    );
  }, [filteredRows]);

  const buildExportColumns = () => [
    { header: "No", key: "no" },
    { header: "Lembaga Petani", key: "lembagaTani" },
    { header: "Gapoktan/KUD", key: "gapoktan" },
    { header: "Kelompok Tani", key: "kelompokTani" },
    { header: "Total Petani", key: "totalPetani" },
    { header: "Total Lahan", key: "totalLahan" },
  ];

  const scopeLabel = () =>
    selectedGroupObj?.name.replace(/\s+/g, "_") ??
    selectedDistrictObj?.name.replace(/\s+/g, "_") ??
    "Semua";

  const handleExportExcel = async () => {
    if (!reportData) return;
    const { exportToExcel } = await import("@/lib/xlsx");

    const data: Record<string, string | number>[] = filteredRows.map((row, idx) => ({
      no: idx + 1,
      lembagaTani: row.lembagaTani,
      gapoktan: displayOrUnknown(row.gapoktan),
      kelompokTani: displayOrUnknown(row.kelompokTani),
      totalPetani: row.totalPetani,
      totalLahan: row.totalLahan,
    }));

    data.push({
      no: "",
      lembagaTani: "Total",
      gapoktan: "",
      kelompokTani: "",
      totalPetani: filteredTotals.totalPetani,
      totalLahan: filteredTotals.totalLahan,
    });

    await exportToExcel({
      filename: `Laporan_Kelompok_Tani_${scopeLabel()}`,
      sheetName: "Kelompok Tani",
      columns: buildExportColumns(),
      data,
    });
  };

  const handleExportPDF = () => {
    if (!reportData) return;

    const data: Record<string, string | number>[] = filteredRows.map((row, idx) => ({
      no: idx + 1,
      lembagaTani: row.lembagaTani,
      gapoktan: displayOrUnknown(row.gapoktan),
      kelompokTani: displayOrUnknown(row.kelompokTani),
      totalPetani: formatNumber(row.totalPetani),
      totalLahan: formatNumber(row.totalLahan),
    }));

    data.push({
      no: "",
      lembagaTani: "Total",
      gapoktan: "",
      kelompokTani: "",
      totalPetani: formatNumber(filteredTotals.totalPetani),
      totalLahan: formatNumber(filteredTotals.totalLahan),
    });

    exportToPDF({
      filename: `Laporan_Kelompok_Tani_${scopeLabel()}`,
      title: "LAPORAN KELOMPOK TANI",
      subtitle: "Smallholder HUB Management Information System",
      metadata: [
        { label: "Distrik", value: selectedDistrictObj?.name ?? "Semua Distrik" },
        { label: "Lembaga Petani", value: selectedGroupObj?.name ?? "Semua Lembaga Petani" },
      ],
      columns: buildExportColumns(),
      columnStyles: {
        0: { cellWidth: 12, halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      data,
    });
  };

  const summaryCards = reportData
    ? [
        { label: "Lembaga Petani", value: reportData.summary.totalLembagaTani, icon: Building2, badge: "Lembaga", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        { label: "Gapoktan/KUD", value: reportData.summary.totalGapoktan, icon: Network, badge: "Gapoktan/KUD", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
        { label: "Kelompok Tani", value: reportData.summary.totalKelompokTani, icon: Layers, badge: "KT", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
        { label: "Total Petani", value: reportData.summary.totalPetani, icon: Users, badge: "Petani", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
        { label: "Total Lahan", value: reportData.summary.totalLahan, icon: Sprout, badge: "Lahan", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
      ]
    : [];

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
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={districtComboOpen}
                      className="w-[220px] justify-between h-9 font-normal text-left"
                    >
                      {selectedDistrict ? (
                        <span>{selectedDistrictObj?.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Semua Distrik</span>
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
              <label className="text-sm font-medium text-muted-foreground">Lembaga Petani</label>
              <Popover open={groupComboOpen} onOpenChange={setGroupComboOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={groupComboOpen}
                      className="w-[220px] justify-between h-9 font-normal text-left"
                    >
                      {selectedFarmerGroup ? (
                        <span>{selectedGroupObj?.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Semua Lembaga Petani</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari lembaga petani..." />
                    <CommandList>
                      <CommandEmpty>Lembaga petani tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="__all__" onSelect={() => handleFarmerGroupSelect(null)}>
                          <Check className={cn("mr-2 h-4 w-4", selectedFarmerGroup === null ? "opacity-100" : "opacity-0")} />
                          Semua Lembaga Petani
                        </CommandItem>
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

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Cari</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Lembaga / Gapoktan/KUD / KT..."
                  className="w-[240px] h-9 pl-8"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Rekap real-time turunan dari data lahan aktif. Filter Distrik/Lembaga bersifat opsional.
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
                <div className="text-2xl font-bold">{formatNumber(c.value)}</div>
                <Badge variant="outline" className={cn("mt-1", c.badgeClass)}>{c.badge}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Export toolbar */}
      {reportData && reportData.rows.length > 0 && (
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
      )}

      {/* Table */}
      {!reportData ? (
        <Card className="border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-muted rounded-full text-muted-foreground">
              <FileText className="h-8 w-8" />
            </div>
            <p className="text-sm text-muted-foreground">{isPending ? "Memuat laporan..." : "Belum ada data."}</p>
          </CardContent>
        </Card>
      ) : reportData.rows.length === 0 ? (
        <Card className="border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-muted rounded-full text-muted-foreground">
              <FileText className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Tidak Ada Data Kelompok Tani</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Belum ada lahan aktif dengan data Gapoktan/KUD atau Kelompok Tani untuk cakupan yang dipilih.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/70 border-b-2 border-border">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">No</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Lembaga Petani</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Gapoktan/KUD</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Kelompok Tani</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">Total Petani</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">Total Lahan</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Tidak ada baris yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.key} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{row.lembagaTani}</td>
                    <td className={cn("px-3 py-2 whitespace-nowrap", row.gapoktan == null && "italic text-muted-foreground")}>
                      {displayOrUnknown(row.gapoktan)}
                    </td>
                    <td className={cn("px-3 py-2 whitespace-nowrap", row.kelompokTani == null && "italic text-muted-foreground")}>
                      {displayOrUnknown(row.kelompokTani)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatNumber(row.totalPetani)}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatNumber(row.totalLahan)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 whitespace-nowrap" colSpan={3}>Total</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatNumber(filteredTotals.totalPetani)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatNumber(filteredTotals.totalLahan)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
