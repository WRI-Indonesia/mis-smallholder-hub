"use client";

import { useState, useEffect, useMemo, useTransition, type ReactNode, type ReactElement } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, FileText, Download, Users, Layers, Sprout, Printer, SlidersHorizontal, MapPin, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  getFarmerGroupsForLandParcelReport,
  getLandParcelReport,
  getLandParcelReportGeometries,
} from "@/server/actions/report";
import type { LandParcelReportResult } from "@/types/report";
import {
  buildLandParcelMapLayout,
  splitParcelsIntoGrid,
  fitLabelToBox,
  type LpGeoJson,
  type LpMapLayout,
  type LpGridSplit,
} from "@/lib/report-land-parcel";
import { exportLandParcelReportExcel, type LpExcelImage } from "@/lib/report-land-parcel-xlsx";

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

const EMPTY = "-";

// Ceklis Label Peta: isi label yang dirender di tiap poligon.
type LabelKey = "no" | "nama" | "idPetani" | "idLahan" | "kelompokTani";
const LABEL_PARTS: { key: LabelKey; label: string }[] = [
  { key: "no", label: "No" },
  { key: "nama", label: "Nama" },
  { key: "idPetani", label: "ID Petani" },
  { key: "idLahan", label: "ID Lahan" },
  { key: "kelompokTani", label: "Kelompok Tani" },
];

// Batas input grid: baris maks. 26 (label huruf A–Z), kolom maks. 20.
const GRID_MAX_ROWS = 26;
const GRID_MAX_COLS = 20;
const clampGrid = (v: number, max: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(1, Math.round(v))) : 1;

// Kolom default: 5 kolom #177 + Tahun Tanam & Luas (revisi owner #179);
// Gapoktan/KUD, Blok, Komoditas, Species, PSR opsional via selektor kolom.
type ColKey = "kelompokTani" | "gapoktan" | "blok" | "komoditas" | "species" | "psr" | "tahunTanam" | "luas";
const TOGGLEABLE: { key: ColKey; label: string }[] = [
  { key: "kelompokTani", label: "Kelompok Tani" },
  { key: "gapoktan", label: "Gapoktan/KUD" },
  { key: "blok", label: "Blok" },
  { key: "komoditas", label: "Komoditas" },
  { key: "species", label: "Species" },
  { key: "psr", label: "PSR" },
  { key: "tahunTanam", label: "Tahun Tanam" },
  { key: "luas", label: "Luas (Ha)" },
];

export function LandParcelReportClient({ districts }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFarmerGroup, setSelectedFarmerGroup] = useState<string | null>(null);
  const [farmerGroups, setFarmerGroups] = useState<FarmerGroup[]>([]);

  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [groupComboOpen, setGroupComboOpen] = useState(false);
  // Grid index (#179): pecah peta jadi baris × kolom (fleksibel, input user).
  const [gridRows, setGridRows] = useState(1);
  const [gridCols, setGridCols] = useState(1);
  // Ceklis isi label poligon di peta (minimal satu).
  const [labelParts, setLabelParts] = useState<Set<LabelKey>>(new Set<LabelKey>(["no"]));
  // Geometri lahan (id → GeoJSON) — dimuat saat Lembaga dipilih, untuk preview & PDF.
  const [geoms, setGeoms] = useState<Map<string, LpGeoJson | null> | null>(null);

  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    new Set<ColKey>(["kelompokTani", "tahunTanam", "luas"]),
  );
  const show = (k: ColKey) => visibleCols.has(k);
  const toggleCol = (k: ColKey) =>
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const [reportData, setReportData] = useState<LandParcelReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadReport = (districtId: string | null, farmerGroupId: string) => {
    startTransition(async () => {
      try {
        const data = await getLandParcelReport({ districtId, farmerGroupId });
        setReportData(data);
      } catch (err) {
        toast.error((err instanceof Error && err.message) || "Gagal memuat laporan");
      }
    });
  };

  // Lembaga wajib (#179): laporan & cetakan selalu per 1 Lembaga.
  useEffect(() => {
    if (!selectedFarmerGroup) {
      setReportData(null);
      return;
    }
    loadReport(selectedDistrict, selectedFarmerGroup);
  }, [selectedDistrict, selectedFarmerGroup]);

  // Geometri untuk preview peta & PDF — dimuat sekali per Lembaga terpilih.
  useEffect(() => {
    if (!selectedFarmerGroup) {
      setGeoms(null);
      return;
    }
    let cancelled = false;
    getLandParcelReportGeometries(selectedFarmerGroup)
      .then((gs) => {
        if (!cancelled) setGeoms(new Map(gs.map((g) => [g.id, g.geometry as LpGeoJson | null])));
      })
      .catch((err) => {
        if (!cancelled) toast.error((err instanceof Error && err.message) || "Gagal memuat geometri lahan");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFarmerGroup]);

  // Refresh daftar Lembaga saat Distrik berubah.
  useEffect(() => {
    async function updateGroups() {
      try {
        const groups = await getFarmerGroupsForLandParcelReport(selectedDistrict);
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
  const formatLuas = (num: number) =>
    new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  const displayOrEmpty = (v: string | null) => v ?? EMPTY;

  const reportRows = useMemo(() => reportData?.rows ?? [], [reportData]);

  const toggleLabelPart = (k: LabelKey) =>
    setLabelParts((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size > 1) next.delete(k); // minimal satu isi label
      } else {
        next.add(k);
      }
      return next;
    });

  // Lahan + isi label untuk peta (preview & PDF), urut = kolom No tabel.
  const mapParcels = useMemo(
    () =>
      reportRows.map((row, idx) => {
        const lines: string[] = [];
        if (labelParts.has("no")) lines.push(String(idx + 1));
        if (labelParts.has("nama")) lines.push(row.namaPetani);
        if (labelParts.has("idPetani")) lines.push(row.idPetani);
        if (labelParts.has("idLahan")) lines.push(row.idLahan);
        if (labelParts.has("kelompokTani")) lines.push(row.kelompokTani ?? EMPTY);
        return {
          no: idx + 1,
          geometry: geoms?.get(row.id) ?? null,
          labelLines: lines.length ? lines : [String(idx + 1)],
        };
      }),
    [reportRows, geoms, labelParts],
  );

  const reportTotalLuas = useMemo(
    () => reportRows.reduce((sum, r) => sum + (r.luas ?? 0), 0),
    [reportRows],
  );

  // Kolom sebelum Luas (untuk colSpan footer; Tahun Tanam ikut grup ini).
  const textColCount =
    4 +
    (show("kelompokTani") ? 1 : 0) +
    (show("gapoktan") ? 1 : 0) +
    (show("blok") ? 1 : 0) +
    (show("komoditas") ? 1 : 0) +
    (show("species") ? 1 : 0) +
    (show("psr") ? 1 : 0) +
    (show("tahunTanam") ? 1 : 0);

  const buildExportColumns = () => [
    { header: "No", key: "no" },
    { header: "Lembaga Petani", key: "lembagaTani" },
    { header: "Nama Petani", key: "namaPetani" },
    { header: "ID Petani", key: "idPetani" },
    { header: "ID Lahan", key: "idLahan" },
    ...(show("kelompokTani") ? [{ header: "Kelompok Tani", key: "kelompokTani" }] : []),
    ...(show("gapoktan") ? [{ header: "Gapoktan/KUD", key: "gapoktan" }] : []),
    ...(show("blok") ? [{ header: "Blok", key: "blok" }] : []),
    ...(show("komoditas") ? [{ header: "Komoditas", key: "komoditas" }] : []),
    ...(show("species") ? [{ header: "Species", key: "species" }] : []),
    ...(show("psr") ? [{ header: "PSR", key: "psr" }] : []),
    ...(show("tahunTanam") ? [{ header: "Tahun Tanam", key: "tahunTanam" }] : []),
    ...(show("luas") ? [{ header: "Luas (Ha)", key: "luas" }] : []),
  ];

  const scopeLabel = () =>
    selectedGroupObj?.name.replace(/\s+/g, "_") ??
    selectedDistrictObj?.name.replace(/\s+/g, "_") ??
    "Semua";

  // Baris export (dipakai sheet penuh Excel, subset per sel, dan PDF).
  const buildExportRows = (): Record<string, string | number>[] =>
    reportRows.map((row, idx) => ({
      no: idx + 1,
      lembagaTani: row.lembagaTani,
      namaPetani: row.namaPetani,
      idPetani: row.idPetani,
      idLahan: row.idLahan,
      kelompokTani: displayOrEmpty(row.kelompokTani),
      gapoktan: displayOrEmpty(row.gapoktan),
      blok: displayOrEmpty(row.blok),
      komoditas: displayOrEmpty(row.komoditas),
      species: displayOrEmpty(row.species),
      psr: row.psr ? "PSR" : "Non-PSR",
      tahunTanam: row.tahunTanam ?? EMPTY,
      luas: row.luas != null ? Number(row.luas.toFixed(2)) : EMPTY,
    }));

  const totalRow = (): Record<string, string | number> => ({
    no: "",
    lembagaTani: "Total",
    namaPetani: "",
    idPetani: "",
    idLahan: "",
    kelompokTani: "",
    gapoktan: "",
    blok: "",
    komoditas: "",
    species: "",
    psr: "",
    tahunTanam: "",
    luas: Number(reportTotalLuas.toFixed(2)),
  });

  // Excel (#179): sheet "Lahan" penuh + gambar peta index; grid aktif → tambah
  // satu sheet per sel grid berisi subset baris sel + gambar peta selnya.
  const handleExportExcel = async () => {
    if (!reportData || !selectedFarmerGroup) return;
    if (!geoms) {
      toast.error("Geometri lahan masih dimuat — coba lagi sebentar.");
      return;
    }

    const cols = buildExportColumns();
    const rows = buildExportRows();
    const fullData = show("luas") ? [...rows, totalRow()] : rows;

    // Render SVG (komponen preview yang sama) → PNG untuk ditempel di sheet.
    const { renderToStaticMarkup } = await import("react-dom/server");
    const toPng = (el: ReactElement) => svgToPng(renderToStaticMarkup(el));

    const fullLayout = buildLandParcelMapLayout(mapParcels, PREVIEW_BOX);
    const linesByNo = new Map(mapParcels.map((p) => [p.no, p.labelLines]));
    const split = gridRows * gridCols > 1 ? splitParcelsIntoGrid(mapParcels, gridRows, gridCols) : null;
    const useGrid = split !== null && split.cells.length > 0 && !!fullLayout.frame;

    try {
      let overviewImage: LpExcelImage | null = null;
      if (fullLayout.polygons.length > 0) {
        overviewImage = useGrid
          ? await toPng(<LayoutSvg layout={fullLayout} linesByNo={null} overlay={gridOverlay(fullLayout, split!)} />)
          : await toPng(<LayoutSvg layout={fullLayout} linesByNo={linesByNo} />);
      }

      const rowByNo = new Map(rows.map((r) => [r.no as number, r]));
      const cellSheets = useGrid
        ? await Promise.all(
            split!.cells.map(async (cell) => ({
              label: cell.label,
              data: cell.parcels
                .map((p) => rowByNo.get(p.no))
                .filter((r): r is Record<string, string | number> => r !== undefined),
              image: await toPng(
                <LayoutSvg layout={buildLandParcelMapLayout(cell.parcels, PREVIEW_BOX)} linesByNo={linesByNo} />,
              ),
            })),
          )
        : [];

      await exportLandParcelReportExcel({
        filename: `Laporan_Lahan_${scopeLabel()}`,
        columns: cols,
        fullData,
        overviewImage,
        cellSheets,
      });
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Gagal membuat Excel ber-gambar peta");
    }
  };

  const handleExportPDF = async () => {
    if (!reportData || !selectedFarmerGroup) return;
    if (!geoms) {
      toast.error("Geometri lahan masih dimuat — coba lagi sebentar.");
      return;
    }

    const data: Record<string, string | number>[] = reportRows.map((row, idx) => ({
      no: idx + 1,
      lembagaTani: row.lembagaTani,
      namaPetani: row.namaPetani,
      idPetani: row.idPetani,
      idLahan: row.idLahan,
      kelompokTani: displayOrEmpty(row.kelompokTani),
      gapoktan: displayOrEmpty(row.gapoktan),
      blok: displayOrEmpty(row.blok),
      komoditas: displayOrEmpty(row.komoditas),
      species: displayOrEmpty(row.species),
      psr: row.psr ? "PSR" : "Non-PSR",
      tahunTanam: row.tahunTanam ?? EMPTY,
      luas: row.luas != null ? formatLuas(row.luas) : EMPTY,
    }));

    if (show("luas")) {
      data.push({
        no: "",
        lembagaTani: "Total",
        namaPetani: "",
        idPetani: "",
        idLahan: "",
        kelompokTani: "",
        gapoktan: "",
        blok: "",
        komoditas: "",
        species: "",
        psr: "",
        tahunTanam: "",
        luas: formatLuas(reportTotalLuas),
      });
    }

    // Rata kanan untuk No + Luas, dihitung dari posisi kolom aktual.
    const cols = buildExportColumns();
    const columnStyles: Record<number, Record<string, string | number>> = {};
    cols.forEach((c, i) => {
      if (c.key === "no" || c.key === "luas") {
        columnStyles[i] = { halign: "right" };
      }
    });

    const { exportLandParcelReportPDF } = await import("@/lib/report-land-parcel-pdf");
    exportLandParcelReportPDF({
      filename: `Laporan_Lahan_${scopeLabel()}`,
      metadata: [
        { label: "Distrik", value: selectedDistrictObj?.name ?? "Semua Distrik" },
        { label: "Lembaga Petani", value: selectedGroupObj?.name ?? "-" },
      ],
      columns: cols,
      columnStyles,
      data,
      mapParcels,
      grid: { rows: gridRows, cols: gridCols },
    });
  };

  // Card "Lembaga Petani" dihapus (#179): Lembaga wajib dipilih → selalu 1.
  const summaryCards = reportData
    ? [
        { label: "Total Petani", value: formatNumber(reportData.summary.totalPetani), icon: Users, badge: "Petani", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
        { label: "Kelompok Tani", value: formatNumber(reportData.summary.totalKelompokTani), icon: Layers, badge: "KT", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
        { label: "Total Lahan", value: formatNumber(reportData.summary.totalLahan), icon: Sprout, badge: "Lahan", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
        { label: "Total Luas", value: formatLuas(reportData.summary.totalLuas), icon: MapPin, badge: "Ha", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
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

          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Roster real-time dari data lahan aktif (1 baris = 1 lahan). <span className="font-medium">Pilih Lembaga Petani (wajib)</span> — laporan &amp; cetakan selalu per Lembaga; filter Distrik membantu mempersempit daftar. PDF &amp; Excel menyertakan peta lahan — atur pecahan grid dan isi label poligon di panel <span className="font-medium">Peta Cetak</span>.
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
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

      {/* Pengaturan cetak peta + preview */}
      {reportData && reportData.rows.length > 0 && (
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Grid3x3 className="h-4 w-4 text-primary" />
              Peta Cetak — Grid &amp; Label
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Grid Index (Baris × Kolom)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={GRID_MAX_ROWS}
                    value={gridRows}
                    onChange={(e) => setGridRows(clampGrid(e.target.valueAsNumber, GRID_MAX_ROWS))}
                    className="w-20 h-9 tabular-nums"
                    aria-label="Jumlah baris grid"
                  />
                  <span className="text-sm text-muted-foreground">×</span>
                  <Input
                    type="number"
                    min={1}
                    max={GRID_MAX_COLS}
                    value={gridCols}
                    onChange={(e) => setGridCols(clampGrid(e.target.valueAsNumber, GRID_MAX_COLS))}
                    className="w-20 h-9 tabular-nums"
                    aria-label="Jumlah kolom grid"
                  />
                  <span className="text-xs text-muted-foreground">
                    {gridRows * gridCols > 1 ? `maks. ${gridRows * gridCols} peta + ikhtisar` : "tanpa pecah"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">Label Poligon</span>
                <div className="flex items-center gap-4 h-9">
                  {LABEL_PARTS.map((part) => (
                    <label key={part.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={labelParts.has(part.key)}
                        onChange={() => toggleLabelPart(part.key)}
                        className="h-4 w-4 accent-primary"
                      />
                      {part.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {!geoms ? (
              <div className="flex items-center justify-center h-40 border border-dashed rounded-md text-sm text-muted-foreground">
                Memuat geometri lahan...
              </div>
            ) : (
              <LandParcelMapPreview mapParcels={mapParcels} rows={gridRows} cols={gridCols} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Toolbar: kolom + export */}
      {reportData && reportData.rows.length > 0 && (
        <div className="flex items-center justify-end gap-2 print:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-3 h-9 text-sm font-medium border rounded-md bg-background hover:bg-accent hover:text-accent-foreground outline-none transition-colors">
              <SlidersHorizontal className="h-4 w-4" />
              Kolom
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {TOGGLEABLE.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={show(col.key)}
                    onCheckedChange={() => toggleCol(col.key)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <p className="text-sm text-muted-foreground">
              {isPending ? "Memuat laporan..." : "Pilih Lembaga Petani untuk memuat laporan."}
            </p>
          </CardContent>
        </Card>
      ) : reportData.rows.length === 0 ? (
        <Card className="border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-muted rounded-full text-muted-foreground">
              <FileText className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Tidak Ada Data Lahan</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Belum ada lahan aktif untuk cakupan yang dipilih.
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
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Nama Petani</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">ID Petani</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">ID Lahan</th>
                {show("kelompokTani") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Kelompok Tani</th>}
                {show("gapoktan") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Gapoktan/KUD</th>}
                {show("blok") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Blok</th>}
                {show("komoditas") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Komoditas</th>}
                {show("species") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Species</th>}
                {show("psr") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">PSR</th>}
                {show("tahunTanam") && <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">Tahun Tanam</th>}
                {show("luas") && <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">Luas (Ha)</th>}
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row, idx) => (
                  <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{row.lembagaTani}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.namaPetani}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.idPetani}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.idLahan}</td>
                    {show("kelompokTani") && (
                      <td className={cn("px-3 py-2 whitespace-nowrap", row.kelompokTani == null && "text-muted-foreground")}>
                        {displayOrEmpty(row.kelompokTani)}
                      </td>
                    )}
                    {show("gapoktan") && (
                      <td className={cn("px-3 py-2 whitespace-nowrap", row.gapoktan == null && "text-muted-foreground")}>
                        {displayOrEmpty(row.gapoktan)}
                      </td>
                    )}
                    {show("blok") && (
                      <td className={cn("px-3 py-2 whitespace-nowrap", row.blok == null && "text-muted-foreground")}>
                        {displayOrEmpty(row.blok)}
                      </td>
                    )}
                    {show("komoditas") && (
                      <td className={cn("px-3 py-2 whitespace-nowrap", row.komoditas == null && "text-muted-foreground")}>
                        {displayOrEmpty(row.komoditas)}
                      </td>
                    )}
                    {show("species") && (
                      <td className={cn("px-3 py-2 whitespace-nowrap italic", row.species == null && "not-italic text-muted-foreground")}>
                        {displayOrEmpty(row.species)}
                      </td>
                    )}
                    {show("psr") && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.psr ? <Badge className="bg-amber-100 text-amber-800 border-amber-200">PSR</Badge> : <span className="text-muted-foreground">Non-PSR</span>}
                      </td>
                    )}
                    {show("tahunTanam") && (
                      <td className={cn("px-3 py-2 text-right tabular-nums whitespace-nowrap", row.tahunTanam == null && "text-muted-foreground")}>
                        {row.tahunTanam ?? EMPTY}
                      </td>
                    )}
                    {show("luas") && (
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {row.luas != null ? formatLuas(row.luas) : EMPTY}
                      </td>
                    )}
                  </tr>
              ))}
            </tbody>
            {reportRows.length > 0 && show("luas") && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 whitespace-nowrap" colSpan={textColCount}>Total</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatLuas(reportTotalLuas)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Preview peta cetak (#179) — SVG dari helper layout yang sama dengan PDF ───

interface PreviewParcel {
  no: number;
  geometry: LpGeoJson | null;
  labelLines: string[];
}

const PREVIEW_BOX = { x: 0, y: 0, w: 280, h: 180, pad: 6 };

// Rasterisasi PNG untuk Excel: 4× viewBox agar tajam, ditampilkan 2×.
const PNG_SCALE = 4;
const PNG_W = PREVIEW_BOX.w * PNG_SCALE;
const PNG_H = PREVIEW_BOX.h * PNG_SCALE;

/** Overlay garis grid + label sel (dipakai preview ikhtisar & gambar Excel). */
function gridOverlay(fullLayout: LpMapLayout, split: LpGridSplit): ReactNode {
  const f = fullLayout.frame;
  if (!f) return null;
  const gx = f.offX;
  const gy = f.offY;
  const gw = (f.maxLon - f.minLon || 1e-6) * f.scale;
  const gh = (f.maxLat - f.minLat || 1e-6) * f.scale;
  const { rows: gRows, cols: gCols } = split;
  return (
    <g>
      {Array.from({ length: gCols + 1 }, (_, i) => (
        <line key={`v${i}`} x1={gx + (gw / gCols) * i} y1={gy} x2={gx + (gw / gCols) * i} y2={gy + gh} stroke="#94a3b8" strokeWidth={0.3} />
      ))}
      {Array.from({ length: gRows + 1 }, (_, j) => (
        <line key={`h${j}`} x1={gx} y1={gy + (gh / gRows) * j} x2={gx + gw} y2={gy + (gh / gRows) * j} stroke="#94a3b8" strokeWidth={0.3} />
      ))}
      {split.cells.map((cell) => (
        <g key={cell.label}>
          <text x={gx + (gw / gCols) * (cell.col + 0.5)} y={gy + (gh / gRows) * (cell.row + 0.5)} fontSize={8} fontWeight={700} fill="#1e293b" textAnchor="middle" dominantBaseline="central" opacity={0.75}>
            {cell.label}
          </text>
          <text x={gx + (gw / gCols) * (cell.col + 0.5)} y={gy + (gh / gRows) * (cell.row + 0.5) + 7} fontSize={3} fill="#64748b" textAnchor="middle">
            {cell.parcels.length} lahan
          </text>
        </g>
      ))}
    </g>
  );
}

/** SVG markup → PNG (canvas) untuk ditempel ke sheet Excel. */
async function svgToPng(svgMarkup: string): Promise<LpExcelImage> {
  const svg = svgMarkup.replace(
    "<svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PNG_W}" height="${PNG_H}"`,
  );
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("Gagal merender peta ke gambar"));
      im.src = blobUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = PNG_W;
    canvas.height = PNG_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PNG_W, PNG_H);
    ctx.drawImage(img, 0, 0, PNG_W, PNG_H);
    return {
      base64: canvas.toDataURL("image/png").split(",")[1],
      widthPx: PNG_W / 2,
      heightPx: PNG_H / 2,
    };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function LayoutSvg({
  layout,
  linesByNo,
  overlay,
}: {
  layout: LpMapLayout;
  /** null = tanpa label poligon (mode ikhtisar). */
  linesByNo: Map<number, string[]> | null;
  overlay?: ReactNode;
}) {
  const LINE_H = 2.6;
  return (
    <svg
      viewBox={`0 0 ${PREVIEW_BOX.w} ${PREVIEW_BOX.h}`}
      className="w-full h-auto rounded border bg-white"
    >
      {layout.polygons.map((poly) =>
        poly.rings.map((ring, ri) => (
          <polygon
            key={`${poly.no}-${ri}`}
            points={ring.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="#d1f0e0"
            stroke="#10b981"
            strokeWidth={0.4}
          />
        )),
      )}
      {linesByNo &&
        layout.polygons.map((poly) => {
          const lines = linesByNo.get(poly.no) ?? [String(poly.no)];
          const isNoOnly = lines.length === 1 && lines[0] === String(poly.no);
          if (isNoOnly) {
            const scale = Math.max(0.6, Math.min(1, Math.min(poly.bboxW, poly.bboxH) / (2 * 2.4 + 1)));
            return (
              <g key={poly.no}>
                <circle cx={poly.labelX} cy={poly.labelY} r={2.4 * scale} fill="#fff" stroke="#10b981" strokeWidth={0.25} />
                <text x={poly.labelX} y={poly.labelY} fontSize={2.6 * scale} fontWeight={700} fill="#1e293b" textAnchor="middle" dominantBaseline="central">
                  {lines[0]}
                </text>
              </g>
            );
          }
          // Adaptif (#179): fit ke bbox poligon — sama dengan renderer PDF.
          const baseW = Math.max(...lines.map((l) => l.length)) * 1.5 + 2;
          const baseH = lines.length * LINE_H + 1.2;
          const fit = fitLabelToBox(baseW, baseH, poly.bboxW - 0.8, poly.bboxH - 0.8);
          const w = baseW * fit.scale;
          const h = baseH * fit.scale;
          const lineH = LINE_H * fit.scale;
          const body = (
            <>
              <rect x={poly.labelX - w / 2} y={poly.labelY - h / 2} width={w} height={h} rx={0.8} fill="#fff" stroke="#10b981" strokeWidth={0.25} />
              {lines.map((line, i) => (
                <text
                  key={i}
                  x={poly.labelX}
                  y={poly.labelY - h / 2 + 0.6 * fit.scale + lineH * (i + 0.5)}
                  fontSize={2.4 * fit.scale}
                  fontWeight={700}
                  fill="#1e293b"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {line}
                </text>
              ))}
            </>
          );
          return (
            <g key={poly.no} transform={fit.vertical ? `rotate(-90 ${poly.labelX} ${poly.labelY})` : undefined}>
              {body}
            </g>
          );
        })}
      {overlay}
    </svg>
  );
}

function LandParcelMapPreview({ mapParcels, rows, cols }: { mapParcels: PreviewParcel[]; rows: number; cols: number }) {
  const linesByNo = useMemo(() => new Map(mapParcels.map((p) => [p.no, p.labelLines])), [mapParcels]);
  const fullLayout = useMemo(() => buildLandParcelMapLayout(mapParcels, PREVIEW_BOX), [mapParcels]);
  const split = useMemo(
    () => (rows * cols > 1 ? splitParcelsIntoGrid(mapParcels, rows, cols) : null),
    [mapParcels, rows, cols],
  );
  const useGrid = split !== null && split.cells.length > 0 && !!fullLayout.frame;

  if (fullLayout.polygons.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 border border-dashed rounded-md text-sm text-muted-foreground">
        Tidak ada geometri lahan yang dapat digambar.
      </div>
    );
  }

  // Overlay garis grid + label sel untuk halaman ikhtisar (dipakai juga Excel).
  const overlay: ReactNode = useGrid ? gridOverlay(fullLayout, split!) : null;

  const skippedNote =
    fullLayout.skippedNos.length > 0
      ? `${fullLayout.skippedNos.length} lahan tanpa geometri tidak tergambar (No ${fullLayout.skippedNos.join(", ")}).`
      : null;

  if (!useGrid) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Preview — 1 halaman peta</p>
        <div className="max-w-xl">
          <LayoutSvg layout={fullLayout} linesByNo={linesByNo} />
        </div>
        {skippedNote && <p className="text-xs text-muted-foreground">{skippedNote}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Preview — 1 halaman ikhtisar + {split!.cells.length} halaman peta (sel kosong dilewati)
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Ikhtisar (grid index)</p>
          <LayoutSvg layout={fullLayout} linesByNo={null} overlay={overlay} />
        </div>
        {split!.cells.map((cell) => (
          <div key={cell.label}>
            <p className="text-xs text-muted-foreground mb-1">
              Peta {cell.label} — {cell.parcels.length} lahan
            </p>
            <LayoutSvg layout={buildLandParcelMapLayout(cell.parcels, PREVIEW_BOX)} linesByNo={linesByNo} />
          </div>
        ))}
      </div>
      {skippedNote && <p className="text-xs text-muted-foreground">{skippedNote}</p>}
    </div>
  );
}
