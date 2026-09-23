"use client";

import { useState, useCallback, useEffect, useMemo, useTransition, type ReactNode, type ReactElement } from "react";
import { toast } from "sonner";
import { FileText, Download, Users, Layers, Sprout, Printer, SlidersHorizontal, MapPin, Grid3x3, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterCombobox } from "@/components/shared/filter-combobox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFarmerGroupsForLandParcelReport,
  getLandParcelReport,
  getLandParcelReportGeometries,
  getNktReportData,
} from "@/server/actions/report";
import type { LandParcelLegalFilters, LandParcelReportResult } from "@/types/report";
import { LAND_DOCUMENT_TYPES, LAND_DOCUMENT_TYPE_LABELS } from "@/lib/land-parcel-detail-import";
import {
  AREA_DIFF_THRESHOLD_HA,
  LAND_STDB_STAGES,
  LAND_STDB_STAGE_LABELS, LAND_NKT_STATUS_OPTIONS, LAND_NKT_STATUS_LABELS } from "@/lib/land-parcel-satellite-format";
import {
  buildLandParcelMapLayout,
  splitParcelsIntoGrid,
  fitLabelToBox,
  pickScaleBar,
  resolveLabelCollisions,
  describeLegalFilters,
  describeLegalSummary,
  landParcelExportColumns,
  landParcelExportRow,
  groupLandParcelRows,
  LAND_PARCEL_SHEET_SPLIT_LABELS,
  type LandParcelSheetSplit,
  type LandParcelOptionalCol as ColKey,
  type LpGeoJson,
  type LpMapLayout,
  type LpGridSplit,
  type LpGridCell,
} from "@/lib/report-land-parcel";
import { exportLandParcelReportExcel, type LpExcelImage } from "@/lib/report-land-parcel-xlsx";
import {
  composeReportBasemap,
  expandFrameToBox,
  basemapCacheKey,
  isTileBasemap,
  BASEMAP_DEFAULT_DIM,
  BASEMAP_MAX_CELLS,
  REPORT_BASEMAP_ATTRIBUTION,
  REPORT_BASEMAP_KEYS,
  REPORT_BASEMAP_LABELS,
  type ReportBasemapKey,
} from "@/lib/report-basemap";
import { formatNumber } from "@/lib/format";
import { formatParcelNodes } from "@/lib/parcel-node-coords";

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
  canExport: boolean;
  canPrint: boolean;
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
// Blok, Komoditas, Species, PSR opsional via selektor kolom.
// Kolom legalitas (#296): Surat, Nama di Surat, Luas Tertera, STDB — opsional, default mati.
// Kolom legalitas #305/TD-035: UL Parcel Code & Program — juga default mati,
// supaya lebar roster harian tidak berubah. Tipe kunci (`ColKey` =
// `LandParcelOptionalCol`) dan kolom ekspor ada di `lib/report-land-parcel.ts`.
const TOGGLEABLE: { key: ColKey; label: string }[] = [
  { key: "kelompokTani", label: "Kelompok Tani" },
  { key: "blok", label: "Blok" },
  { key: "komoditas", label: "Komoditas" },
  { key: "species", label: "Species" },
  { key: "psr", label: "PSR" },
  { key: "tahunTanam", label: "Tahun Tanam" },
  { key: "luas", label: "Luas (Ha)" },
  { key: "surat", label: "Surat Kepemilikan" },
  { key: "namaDiSurat", label: "Nama di Surat" },
  { key: "luasTertera", label: "Luas Tertera (Ha)" },
  { key: "stdb", label: "STDB" },
  { key: "ulParcelCode", label: "UL Parcel Code" },
  { key: "program", label: "Program" },
  // NKT (#328) — status asesmen; default mati seperti kolom legalitas lain.
  { key: "nkt", label: "NKT" },
  { key: "luasNkt", label: "Luas NKT (Ha)" },
  // Patok (#331) — jumlah + ringkasan kondisi; default mati.
  { key: "patok", label: "Patok" },
  // Koordinat node poligon (#370) — HANYA di Excel (tabel layar & PDF tidak
  // punya kolom ini); default nyala.
  { key: "koordinat", label: "Koordinat (Excel)" },
];

/** Kolom yang menyala saat halaman dibuka — dipakai juga tombol "Bawaan". */
const DEFAULT_COLS: ColKey[] = ["kelompokTani", "tahunTanam", "luas", "koordinat"];

export function LandParcelReportClient({ districts, canExport, canPrint }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFarmerGroup, setSelectedFarmerGroup] = useState<string | null>(null);
  const [farmerGroups, setFarmerGroups] = useState<FarmerGroup[]>([]);

  // Grid index (#179): pecah peta jadi baris × kolom (fleksibel, input user).
  const [gridRows, setGridRows] = useState(1);
  // Pecah sheet Excel (#371): per sel grid (bawaan), per Kelompok Tani, atau per Blok.
  const [sheetSplit, setSheetSplit] = useState<LandParcelSheetSplit>("grid");
  const [gridCols, setGridCols] = useState(1);
  // Ceklis isi label poligon di peta (minimal satu).
  const [labelParts, setLabelParts] = useState<Set<LabelKey>>(new Set<LabelKey>(["no"]));
  // Latar peta cetak: "none" = perilaku lama, jadi ekspor yang sudah berjalan
  // tidak berubah sampai user memilih sendiri.
  const [basemap, setBasemap] = useState<ReportBasemapKey>("none");
  // `basemapDim` = KEPEKATAN latar (100% = citra penuh, 0% = putih polos),
  // sesuai `composeReportBasemap` yang memakai alpha `1 - dim/100`. Sempat
  // dilabeli "Redam Latar" — terbalik dari yang dilakukannya, dan menyeret ke
  // 0% justru menghasilkan peta putih polos yang tetap mencetak atribusi.
  const [basemapDim, setBasemapDim] = useState(BASEMAP_DEFAULT_DIM);
  /** Nilai slider selagi diseret; disalin ke `basemapDim` saat dilepas. */
  const [dimDraft, setDimDraft] = useState(BASEMAP_DEFAULT_DIM);
  /** Latar per halaman peta: "" = penuh/ikhtisar, sisanya label sel grid. */
  const [basemapImages, setBasemapImages] = useState<Map<string, string>>(new Map());
  /** Ekspor sedang menunggu latar selesai dijahit — tombol dikunci selama itu. */
  const [preparingMaps, setPreparingMaps] = useState(false);
  // Geometri lahan (id → GeoJSON) — dimuat saat Lembaga dipilih, untuk preview & PDF.
  const [geoms, setGeoms] = useState<Map<string, LpGeoJson | null> | null>(null);

  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_COLS));
  const selectAllCols = () => setVisibleCols(new Set(TOGGLEABLE.map((c) => c.key)));
  // "Kosongkan" menyisakan 5 kolom identitas (No/Lembaga/Petani/ID Petani/ID
  // Lahan) yang memang selalu tampil — tabelnya tidak pernah jadi kosong.
  const clearCols = () => setVisibleCols(new Set());
  const resetCols = () => setVisibleCols(new Set(DEFAULT_COLS));
  const show = (k: ColKey) => visibleCols.has(k);
  const toggleCol = (k: ColKey) =>
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  // ── Filter legalitas (#305) — yang mengubah laporan dari roster jadi worklist.
  // Cakupan bawaan "Semua lahan" (owner 2026-09-02): bawaan "Sudah didata"
  // diam-diam menyembunyikan lahan yang belum punya UL Parcel Code, sehingga
  // laporan terbaca seperti roster lengkap padahal tersaring.
  const [coverage, setCoverage] = useState<"all" | "mapped">("all");
  const [documentStatus, setDocumentStatus] = useState<"all" | "with" | "without">("all");
  const [documentTypes, setDocumentTypes] = useState<Set<string>>(new Set());
  const [stdbStatus, setStdbStatus] = useState<string>("all");
  const [areaDiff, setAreaDiff] = useState<"all" | "gte">("all");
  const [nktStatus, setNktStatus] = useState<string>("all");
  const [marker, setMarker] = useState<string>("all");

  const legalFilters: LandParcelLegalFilters = useMemo(
    () => ({
      coverage,
      documentStatus,
      documentTypes: [...documentTypes],
      stdbStatus,
      areaDiff,
      nktStatus,
      marker,
    }),
    [coverage, documentStatus, documentTypes, stdbStatus, areaDiff, nktStatus, marker],
  );
  const legalFilterActive =
    documentStatus !== "all" || documentTypes.size > 0 || stdbStatus !== "all" || areaDiff !== "all" || nktStatus !== "all" || marker !== "all";

  const toggleDocumentType = (t: string) =>
    setDocumentTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const resetLegalFilters = () => {
    setDocumentStatus("all");
    setDocumentTypes(new Set());
    setStdbStatus("all");
    setAreaDiff("all");
    setNktStatus("all");
    setMarker("all");
  };

  const [reportData, setReportData] = useState<LandParcelReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Lembaga wajib (#179): laporan & cetakan selalu per 1 Lembaga. Filter
  // legalitas (#305) ikut dependensi — hasilnya dihitung ulang di server, bukan
  // disaring di klien.
  useEffect(() => {
    if (!selectedFarmerGroup) {
      setReportData(null);
      return;
    }
    startTransition(async () => {
      try {
        const data = await getLandParcelReport({
          districtId: selectedDistrict,
          farmerGroupId: selectedFarmerGroup,
          ...legalFilters,
        });
        setReportData(data);
      } catch (err) {
        toast.error((err instanceof Error && err.message) || "Gagal memuat laporan");
      }
    });
  }, [selectedDistrict, selectedFarmerGroup, legalFilters]);

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
  };

  const handleFarmerGroupSelect = (val: string | null) => {
    setSelectedFarmerGroup(val);
  };

  const selectedDistrictObj = districts.find((d) => d.id === selectedDistrict);
  const selectedGroupObj = farmerGroups.find((g) => g.id === selectedFarmerGroup);

  const formatDecimal = (num: number, digits: number) =>
    new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(num);
  const formatLuas = (num: number) => formatDecimal(num, 2);
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

  // ── Latar peta cetak ──
  // Di atas BASEMAP_MAX_CELLS sel, latar dikunci mati: tiap sel = satu halaman
  // = satu JPEG + ±35 permintaan tile, dan PDF-nya jadi belasan MB.
  const basemapLocked = gridRows * gridCols > BASEMAP_MAX_CELLS;
  const activeBasemap: ReportBasemapKey = basemapLocked ? "none" : basemap;
  const basemapAttribution = REPORT_BASEMAP_ATTRIBUTION[activeBasemap];

  // Geometri saja, tanpa `labelLines`: bbox peta tidak berubah ketika ceklis
  // Label Poligon diubah, jadi memisahkannya di sini mencegah seluruh mosaik
  // dijahit ulang tiap centang.
  const geomParcels = useMemo(
    () => reportRows.map((row, idx) => ({ no: idx + 1, geometry: geoms?.get(row.id) ?? null })),
    [reportRows, geoms],
  );

  /**
   * Satu bbox per halaman peta: "" untuk halaman penuh/ikhtisar, label sel
   * untuk halaman atlas. `frame` sebuah layout hanya bergantung pada lahannya,
   * bukan pada kotak gambar — jadi satu mosaik per halaman melayani preview,
   * PDF, dan Excel sekaligus meski ketiganya memakai kotak berbeda.
   */
  const basemapTargets = useMemo(() => {
    if (geomParcels.length === 0) return [];
    const full = buildLandParcelMapLayout(geomParcels, PREVIEW_BOX);
    if (!full.frame) return [];
    const targets: { key: string; frame: NonNullable<LpMapLayout["frame"]> }[] = [
      { key: "", frame: full.frame },
    ];
    const split =
      gridRows * gridCols > 1 ? splitParcelsIntoGrid(geomParcels, gridRows, gridCols) : null;
    for (const cell of split?.cells ?? []) {
      const cellFrame = buildLandParcelMapLayout(cell.parcels, PREVIEW_BOX).frame;
      if (cellFrame) targets.push({ key: cell.label, frame: cellFrame });
    }
    return targets;
  }, [geomParcels, gridRows, gridCols]);

  /**
   * Jahit semua latar yang belum ada, kembalikan set LENGKAP.
   *
   * Dipakai dua pihak: efek pratinjau (melaporkan kemajuan lewat `onProgress`)
   * dan kedua tombol ekspor. Ekspor WAJIB menunggu promise ini — versi pertama
   * memakai state `basemapImages` apa adanya, sehingga menekan Unduh sebelum
   * penjahitan selesai menghasilkan PDF yang sebagian halamannya polos tanpa
   * peringatan apa pun. Karena hasilnya di-cache, menunggu di sini gratis bila
   * pratinjau memang sudah selesai.
   */
  const ensureBasemaps = useCallback(
    async (opts: {
      onProgress?: (partial: Map<string, string>) => void;
      /** Hentikan lebih awal bila hasilnya sudah tak dipakai (lihat efek di bawah). */
      isCancelled?: () => boolean;
    } = {}) => {
      const done = new Map<string, string>();
      if (!isTileBasemap(activeBasemap)) return done;
      // Berurutan, bukan Promise.all: 30 sel × puluhan tile sekaligus akan
      // menghantam proxy (dan penyedia hulu) dalam satu ledakan.
      for (const target of basemapTargets) {
        // Dicek TIAP putaran, bukan hanya sebelum setState: satu putaran
        // mengalokasikan canvas ±1600×1030 lalu memanggil `toDataURL` yang
        // sinkron. Run yang sudah tersalip harus benar-benar berhenti, bukan
        // sekadar berhenti melapor.
        if (opts.isCancelled?.()) return done;
        const image = await composeForBox(activeBasemap, target.frame, PREVIEW_BOX, basemapDim);
        if (image) {
          done.set(target.key, image);
          opts.onProgress?.(new Map(done));
        }
      }
      return done;
    },
    [activeBasemap, basemapDim, basemapTargets],
  );

  useEffect(() => {
    if (!isTileBasemap(activeBasemap)) {
      setBasemapImages(new Map());
      return;
    }
    let cancelled = false;
    const isCancelled = () => cancelled;
    ensureBasemaps({
      isCancelled,
      onProgress: (partial) => {
        if (!cancelled) setBasemapImages(partial);
      },
    }).then((all) => {
      if (!cancelled) setBasemapImages(all);
    });
    return () => {
      cancelled = true;
    };
  }, [activeBasemap, ensureBasemaps]);

  /** Semua halaman peta sudah punya latar — penanda "aman diunduh". */
  const basemapReady = !isTileBasemap(activeBasemap) || basemapImages.size >= basemapTargets.length;

  const reportTotalLuas = useMemo(
    () => reportRows.reduce((sum, r) => sum + (r.luas ?? 0), 0),
    [reportRows],
  );

  // Kolom SEBELUM Luas (untuk colSpan sel "Total" di footer; Tahun Tanam ikut
  // grup ini). Kolom legalitas/NKT terletak SESUDAH Luas di header & body —
  // sebelumnya ikut dihitung sehingga footer bergeser begitu salah satunya
  // dinyalakan (bug lama, diperbaiki bersama #328).
  const textColCount =
    4 +
    (show("kelompokTani") ? 1 : 0) +
    (show("blok") ? 1 : 0) +
    (show("komoditas") ? 1 : 0) +
    (show("species") ? 1 : 0) +
    (show("psr") ? 1 : 0) +
    (show("tahunTanam") ? 1 : 0);

  // Kolom & baris ekspor dari satu definisi di lib (kolom Patok sempat kosong
  // di Excel/PDF karena baris ditulis terpisah dari kolom — review 09-15).
  // Kolom `excelOnly` (Koordinat, #370) hanya ikut bila `excel`.
  const buildExportColumns = (opts?: { excel?: boolean }) => landParcelExportColumns(show, opts);

  const scopeLabel = () =>
    selectedGroupObj?.name.replace(/\s+/g, "_") ??
    selectedDistrictObj?.name.replace(/\s+/g, "_") ??
    "Semua";

  // Baris export Excel (sheet penuh + subset per sel): desimal sebagai Number.
  // Node poligon (#370) dari geometri yang sudah termuat — handler menolak jalan bila belum.
  // `rows` = subset per KT/Blok (#371) → No mulai 1 lagi per sheet.
  const buildExportRows = (rows = reportRows): Record<string, string | number>[] =>
    rows.map((row, idx) =>
      landParcelExportRow(row, idx, (n, digits) => Number(n.toFixed(digits)), EMPTY, formatParcelNodes(geoms?.get(row.id))),
    );

  const totalRow = (totalLuas = reportTotalLuas): Record<string, string | number> => ({
    no: "",
    lembagaTani: "Total",
    namaPetani: "",
    idPetani: "",
    idLahan: "",
    kelompokTani: "",
    blok: "",
    komoditas: "",
    species: "",
    psr: "",
    surat: "",
    namaDiSurat: "",
    luasTertera: "",
    stdb: "",
    ulParcelCode: "",
    program: "",
    tahunTanam: "",
    luas: Number(totalLuas.toFixed(2)),
    koordinat: "",
    jumlahNode: "",
  });

  // Excel (#179): sheet "Lahan" penuh + gambar peta index; grid aktif → tambah
  // satu sheet per sel grid berisi subset baris sel + gambar peta selnya.
  const handleExportExcel = async () => {
    if (!reportData || !selectedFarmerGroup) return;
    if (!geoms) {
      toast.error("Geometri lahan masih dimuat — coba lagi sebentar.");
      return;
    }

    const cols = buildExportColumns({ excel: true });
    const rows = buildExportRows();
    const fullData = show("luas") ? [...rows, totalRow()] : rows;

    // Tunggu SEMUA latar selesai dijahit. Memakai state `basemapImages` apa
    // adanya akan menghasilkan berkas yang sebagian gambar petanya polos —
    // diam-diam, tanpa penanda apa pun bagi pembacanya.
    let mapImages: Map<string, string>;
    try {
      setPreparingMaps(true);
      mapImages = await ensureBasemaps();
    } catch (err) {
      // Tanpa `finally`, satu kegagalan penjahitan mengunci KEDUA tombol
      // ekspor selamanya (state `preparingMaps` tak pernah turun) tanpa pesan
      // apa pun — kegagalan diam yang lebih buruk daripada ekspornya sendiri.
      toast.error((err instanceof Error && err.message) || "Gagal menyiapkan latar peta");
      return;
    } finally {
      setPreparingMaps(false);
    }

    // Render SVG (komponen preview yang sama) → PNG untuk ditempel di sheet.
    const { renderToStaticMarkup } = await import("react-dom/server");
    const toPng = (el: ReactElement) => svgToPng(renderToStaticMarkup(el));

    const fullLayout = buildLandParcelMapLayout(mapParcels, PREVIEW_BOX);
    const linesByNo = new Map(mapParcels.map((p) => [p.no, p.labelLines]));
    const split = gridRows * gridCols > 1 ? splitParcelsIntoGrid(mapParcels, gridRows, gridCols) : null;
    // Sheet per sel grid hanya di mode "Grid peta"; mode KT/Blok (#371) diganti sheet grup tanpa gambar.
    const useGrid = sheetSplit === "grid" && split !== null && split.cells.length > 0 && !!fullLayout.frame;
    const groups = sheetSplit === "grid" ? [] : groupLandParcelRows(reportRows, sheetSplit);
    // Peta per KT/Blok (owner 2026-09-23): lahan grup saja, label No mengikuti
    // No sheet (mulai 1 lagi). Latar ikut batas grid (BASEMAP_MAX_CELLS) — di
    // atasnya poligon tetap digambar tanpa latar.
    const rowIdx = new Map(reportRows.map((r, i) => [r.id, i]));
    const groupMaps = groups.map((g) => {
      const parcels = g.rows.map((row, i) => {
        const base = mapParcels[rowIdx.get(row.id)!];
        const labelLines = labelParts.has("no") ? [String(i + 1), ...base.labelLines.slice(1)] : base.labelLines;
        return { no: i + 1, geometry: base.geometry, labelLines };
      });
      return {
        layout: buildLandParcelMapLayout(parcels, PREVIEW_BOX),
        linesByNo: new Map(parcels.map((p) => [p.no, p.labelLines])),
      };
    });
    const groupBasemap = isTileBasemap(activeBasemap) && groups.length <= BASEMAP_MAX_CELLS;
    if (isTileBasemap(activeBasemap) && !groupBasemap) {
      toast.info(`Latar peta tidak dipasang di ${groups.length} sheet ${LAND_PARCEL_SHEET_SPLIT_LABELS[sheetSplit]} (maks. ${BASEMAP_MAX_CELLS}) — poligon tetap tergambar.`);
    }
    const groupBasemaps: (string | undefined)[] = [];
    if (groupBasemap) {
      setPreparingMaps(true);
      try {
        // Berurutan (pola ensureBasemaps) — tak menghantam proxy tile sekaligus.
        for (const m of groupMaps) {
          groupBasemaps.push(m.layout.frame ? await composeForBox(activeBasemap, m.layout.frame, PREVIEW_BOX, basemapDim) : undefined);
        }
      } catch (err) {
        toast.error((err instanceof Error && err.message) || "Gagal menyiapkan latar peta");
        return;
      } finally {
        setPreparingMaps(false);
      }
    }

    try {
      const groupSheets = await Promise.all(
        groups.map(async (g, gi) => {
          const data = buildExportRows(g.rows);
          const { layout, linesByNo: groupLines } = groupMaps[gi];
          return {
            label: g.label,
            data: show("luas") ? [...data, totalRow(g.rows.reduce((sum, r) => sum + (r.luas ?? 0), 0))] : data,
            image: layout.polygons.length > 0
              ? await toPng(
                  <LayoutSvg
                    layout={layout}
                    linesByNo={groupLines}
                    basemapUrl={groupBasemaps[gi]}
                    attribution={groupBasemap ? basemapAttribution : undefined}
                  />,
                )
              : null,
          };
        }),
      );

      let overviewImage: LpExcelImage | null = null;
      if (fullLayout.polygons.length > 0) {
        overviewImage = useGrid
          ? await toPng(
              <LayoutSvg
                layout={fullLayout}
                linesByNo={null}
                overlay={gridOverlay(fullLayout, split!)}
                basemapUrl={mapImages.get("")}
                attribution={basemapAttribution}
              />,
            )
          : await toPng(
              <LayoutSvg
                layout={fullLayout}
                linesByNo={linesByNo}
                basemapUrl={mapImages.get("")}
                attribution={basemapAttribution}
              />,
            );
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
                <LayoutSvg
                  layout={buildLandParcelMapLayout(cell.parcels, PREVIEW_BOX)}
                  linesByNo={linesByNo}
                  basemapUrl={mapImages.get(cell.label)}
                  attribution={basemapAttribution}
                />,
              ),
            })),
          )
        : [];

      await exportLandParcelReportExcel({
        filename: `Laporan_Lahan_${scopeLabel()}${sheetSplit === "kelompokTani" ? "_per_KT" : sheetSplit === "blok" ? "_per_Blok" : ""}`,
        columns: cols,
        fullData,
        overviewImage,
        cellSheets,
        groupSheets,
        // Sheet "Ringkasan" tersendiri, bukan baris di atas tabel: sheet data
        // harus tetap mulai di baris 1 agar AutoFilter/pivot Excel jalan.
        infoSheet: [
          ...describeLegalFilters(legalFilters).map((f) => ({
            section: "Filter Legalitas",
            label: f.label,
            value: f.value,
          })),
          ...legalCards.map((c) => ({
            section: "Ringkasan Legalitas",
            label: c.label,
            value: c.value,
            note: c.note,
          })),
          // Berkas yang beredar harus menjelaskan dirinya (#371); mode Grid tak menambah baris.
          ...(sheetSplit === "grid"
            ? []
            : [{
                section: "Berkas",
                label: "Pecah sheet",
                value: `${LAND_PARCEL_SHEET_SPLIT_LABELS[sheetSplit]} (${groups.length} sheet)`,
                note: "Satu sheet per grup + peta lahan grup (No = No sheet); sheet Lahan tetap berisi seluruh baris",
              }]),
        ],
      });
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Gagal membuat Excel ber-gambar peta");
    }
  };

  /**
   * Laporan NKT per Lembaga (#332): PDF landscape terpisah dari laporan legal —
   * seluruh lahan aktif Lembaga (bukan hasil filter), lahan NKT merah bernomor.
   */
  const [printingNkt, setPrintingNkt] = useState(false);
  const handlePrintNkt = async () => {
    if (!selectedFarmerGroup || printingNkt) return;
    setPrintingNkt(true);
    try {
      const res = await getNktReportData(selectedFarmerGroup);
      if (!res.success || !res.data) {
        toast.error(res.success ? "Data laporan NKT kosong" : res.error);
        return;
      }
      const { buildNktReportDoc, nktReportFilename } = await import("@/lib/nkt-report");
      buildNktReportDoc(res.data).save(nktReportFilename(res.data));
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Gagal membuat Laporan NKT");
    } finally {
      setPrintingNkt(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData || !selectedFarmerGroup) return;
    if (!geoms) {
      toast.error("Geometri lahan masih dimuat — coba lagi sebentar.");
      return;
    }

    // Baris PDF: desimal sebagai string lokal id-ID (kolom sama dengan Excel).
    const data: Record<string, string | number>[] = reportRows.map((row, idx) =>
      landParcelExportRow(row, idx, formatDecimal, EMPTY),
    );

    if (show("luas")) {
      data.push({
        no: "",
        lembagaTani: "Total",
        namaPetani: "",
        idPetani: "",
        idLahan: "",
        kelompokTani: "",
        blok: "",
        komoditas: "",
        species: "",
        psr: "",
        surat: "",
        namaDiSurat: "",
        luasTertera: "",
        stdb: "",
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

    const { exportLandParcelReportPDF, collectLandParcelMapBoxes } = await import(
      "@/lib/report-land-parcel-pdf"
    );
    const pdfInput = {
      metadata: [
        { label: "Distrik", value: selectedDistrictObj?.name ?? "Semua Distrik" },
        { label: "Lembaga Petani", value: selectedGroupObj?.name ?? "-" },
      ],
      // Filter & ringkasan wajib tercetak (#305): tanpa filter, PDF hasil
      // saringan "tanpa surat" terbaca seperti roster lengkap; tanpa ringkasan,
      // pembaca hanya dapat daftar tanpa tahu proporsinya. Keduanya di blok
      // penuh-lebar, bukan di grid metadata yang cuma 90 mm per kolom.
      sections: [
        { title: "Filter Legalitas", lines: describeLegalFilters(legalFilters).map((f) => `${f.label}: ${f.value}`) },
        { title: "Ringkasan Legalitas", lines: legalSummaryLines() },
      ],
      columns: cols,
      columnStyles,
      data,
      mapParcels,
      grid: { rows: gridRows, cols: gridCols },
    };

    // Latar PDF dijahit untuk kotak halaman PDF, BUKAN untuk kotak pratinjau:
    // rasio keduanya berbeda (A4 lanskap vs kartu pratinjau), dan memakai
    // gambar pratinjau di sini akan menggeser citra terhadap poligon sampai
    // ratusan meter di tepi. Kotaknya diambil dari modul PDF sendiri supaya
    // tak ada perhitungan tata letak yang tersalin ke sini.
    const basemaps = new Map<string, string>();
    if (isTileBasemap(activeBasemap)) {
      setPreparingMaps(true);
      try {
        for (const page of collectLandParcelMapBoxes(pdfInput)) {
          const image = await composeForBox(activeBasemap, page.frame, page.box, basemapDim);
          if (image) basemaps.set(page.key, image);
        }
      } finally {
        setPreparingMaps(false);
      }
    }

    exportLandParcelReportPDF({
      filename: `Laporan_Lahan_${scopeLabel()}`,
      ...pdfInput,
      basemaps,
      basemapAttribution,
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

  /**
   * Ringkasan legalitas (#305) — mengikuti filter aktif, dan persennya SELALU
   * berlabel penyebutnya. Persen polos akan dibaca sebagai cakupan legalitas
   * seluruh lembaga, padahal penyebutnya hanya lahan yang sudah melalui import
   * Detail Lahan.
   */
  // Kartu layar dan cetakan memakai helper yang SAMA (#305) — kalau dihitung
  // dua kali, layar dan PDF akan bercerita beda tanpa ada yang tahu.
  const legalCards = reportData ? describeLegalSummary(reportData.summary, legalFilters) : [];

  /** Baris teks ringkasan legalitas untuk PDF & Excel. */
  const legalSummaryLines = () => legalCards.map((c) => `${c.label}: ${c.value} (${c.note})`);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Distrik</label>
              <FilterCombobox
                options={districts}
                value={selectedDistrict}
                onSelect={handleDistrictSelect}
                allLabel="Semua Distrik"
                searchPlaceholder="Cari distrik..."
                emptyLabel="Distrik tidak ditemukan."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Lembaga Petani</label>
              <FilterCombobox
                options={farmerGroups}
                value={selectedFarmerGroup}
                onSelect={handleFarmerGroupSelect}
                allLabel="Semua Lembaga Petani"
                searchPlaceholder="Cari lembaga petani..."
                emptyLabel="Lembaga Petani tidak ditemukan."
              />
            </div>

          </div>

          {/* ── Filter legalitas (#305) ── */}
          <div className="mt-5 border-t pt-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="lp-coverage">Cakupan Pendataan</label>
                <select
                  id="lp-coverage"
                  value={coverage}
                  onChange={(e) => setCoverage(e.target.value as "all" | "mapped")}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="mapped">Sudah didata</option>
                  <option value="all">Semua lahan</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="lp-doc-status">Status Surat</label>
                <select
                  id="lp-doc-status"
                  value={documentStatus}
                  onChange={(e) => setDocumentStatus(e.target.value as "all" | "with" | "without")}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">Semua</option>
                  <option value="with">Ada surat</option>
                  <option value="without">Tanpa surat</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">Jenis Surat</span>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 px-3 h-9 text-sm border rounded-md bg-background hover:bg-accent hover:text-accent-foreground outline-none transition-colors">
                    <SlidersHorizontal className="h-4 w-4" />
                    {documentTypes.size === 0 ? "Semua jenis" : `${documentTypes.size} jenis dipilih`}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                    <DropdownMenuLabel>Punya minimal satu jenis ini</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {LAND_DOCUMENT_TYPES.map((t) => (
                        <DropdownMenuCheckboxItem
                          key={t}
                          checked={documentTypes.has(t)}
                          onCheckedChange={() => toggleDocumentType(t)}
                          onSelect={(e) => e.preventDefault()}
                        >
                          {LAND_DOCUMENT_TYPE_LABELS[t]}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="lp-stdb">Status STDB</label>
                <select
                  id="lp-stdb"
                  value={stdbStatus}
                  onChange={(e) => setStdbStatus(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">Semua</option>
                  <option value="with">Ada STDB</option>
                  <option value="without">Tanpa STDB</option>
                  {LAND_STDB_STAGES.map((st) => (
                    <option key={st} value={st}>{`Tahap: ${LAND_STDB_STAGE_LABELS[st]}`}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="lp-nkt">NKT</label>
                <select
                  id="lp-nkt"
                  value={nktStatus}
                  onChange={(e) => setNktStatus(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">Semua</option>
                  {LAND_NKT_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st === "AFFECTED" ? "affected" : st}>{LAND_NKT_STATUS_LABELS[st]}</option>
                  ))}
                  <option value="assessed">Sudah dinilai</option>
                  <option value="unassessed">Belum dinilai</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="lp-marker">Patok</label>
                <select
                  id="lp-marker"
                  value={marker}
                  onChange={(e) => setMarker(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">Semua</option>
                  <option value="with">Sudah ada patok</option>
                  <option value="without">Belum ada patok</option>
                  <option value="installed">Semua patok terpasang (Ada)</option>
                  <option value="problem">Ada patok hilang/rusak/belum dipasang</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="lp-area-diff">Selisih Luas</label>
                <select
                  id="lp-area-diff"
                  value={areaDiff}
                  onChange={(e) => setAreaDiff(e.target.value as "all" | "gte")}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">Semua</option>
                  <option value="gte">{`≥ ${formatLuas(AREA_DIFF_THRESHOLD_HA)} Ha`}</option>
                </select>
              </div>

              {legalFilterActive && (
                <Button variant="ghost" size="sm" className="h-9" onClick={resetLegalFilters}>
                  Reset filter legalitas
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              <span className="font-medium">Cakupan &quot;Sudah didata&quot;</span> = lahan yang sudah melalui import Detail Lahan (ditandai adanya UL Parcel Code). Ini penting dibaca apa adanya: lahan yang belum diimport tampil &quot;tanpa surat&quot; hanya karena berkasnya belum masuk, bukan karena petaninya tak punya surat.
              {" "}<span className="font-medium">&quot;Tanpa surat&quot;</span> berarti tidak ada satu pun surat tercatat — lahan yang hanya punya catatan penguasaan (&quot;surat di bank&quot;, &quot;lahan sudah dijual&quot;) tetap dihitung <span className="font-medium">punya</span> surat.
              {" "}Memilih beberapa jenis surat berarti <span className="font-medium">punya minimal satu</span> di antaranya, jadi satu lahan bisa muncul di lebih dari satu jenis.
            </p>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Roster real-time dari data lahan aktif (1 baris = 1 lahan). <span className="font-medium">Pilih Lembaga Petani (wajib)</span> — laporan &amp; cetakan selalu per Lembaga; filter Distrik membantu mempersempit daftar. PDF &amp; Excel menyertakan peta lahan — atur latar, pecahan grid, dan isi label poligon di panel <span className="font-medium">Peta Cetak</span>.
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

      {/* Ringkasan legalitas (#305) — ikut filter aktif */}
      {/* Enam kartu sejak #331 (Patok) — 3 kolom di layar lebar agar dua baris rata. */}
      {reportData && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:hidden">
          {legalCards.map((c) => (
            <Card key={c.label} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{c.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
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
              Peta Cetak — Latar, Grid &amp; Label
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
                <label className="text-sm font-medium text-muted-foreground" htmlFor="basemap-select">
                  Latar Peta
                </label>
                <Select
                  value={basemap}
                  onValueChange={(v) => setBasemap(v as ReportBasemapKey)}
                  disabled={basemapLocked}
                >
                  <SelectTrigger id="basemap-select" className="w-60 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_BASEMAP_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {REPORT_BASEMAP_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isTileBasemap(activeBasemap) && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="basemap-dim">
                    Kepekatan Latar — {dimDraft}%
                  </label>
                  <div className="flex items-center h-9">
                    <input
                      id="basemap-dim"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={dimDraft}
                      // Nilai diambil saat geseran DILEPAS, bukan tiap langkah:
                      // satu perubahan `basemapDim` menjahit ulang seluruh
                      // halaman peta, dan menyeret slider melintasi rentangnya
                      // memicu sampai 21 kali — cukup untuk membekukan tab.
                      onChange={(e) => setDimDraft(e.target.valueAsNumber)}
                      onPointerUp={() => setBasemapDim(dimDraft)}
                      onKeyUp={() => setBasemapDim(dimDraft)}
                      onBlur={() => setBasemapDim(dimDraft)}
                      className="w-40 accent-primary"
                    />
                  </div>
                </div>
              )}
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
            {!basemapReady && (
              <p className="text-xs text-muted-foreground">
                Menyiapkan latar peta… {basemapImages.size}/{basemapTargets.length} halaman. Ekspor
                tetap bisa ditekan — berkasnya menunggu sampai semua latar siap.
              </p>
            )}
            {basemapLocked && basemap !== "none" && (
              <p className="text-xs text-amber-700 dark:text-amber-500">
                Latar peta dimatikan di atas {BASEMAP_MAX_CELLS} sel grid ({gridRows} × {gridCols} ={" "}
                {gridRows * gridCols} sel): tiap sel menambah satu gambar latar ke PDF. Kecilkan grid
                untuk memakainya kembali.
              </p>
            )}
            {!geoms ? (
              <div className="flex items-center justify-center h-40 border border-dashed rounded-md text-sm text-muted-foreground">
                Memuat geometri lahan...
              </div>
            ) : (
              <LandParcelMapPreview
                mapParcels={mapParcels}
                rows={gridRows}
                cols={gridCols}
                basemapImages={basemapImages}
                attribution={basemapAttribution}
              />
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
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center justify-between gap-2">
                  <span>Tampilkan Kolom</span>
                  <span className="text-xs font-normal tabular-nums text-muted-foreground">
                    {visibleCols.size}/{TOGGLEABLE.length}
                  </span>
                </DropdownMenuLabel>
                <div className="flex items-center gap-1 px-2 pb-1.5">
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={selectAllCols}>
                    Pilih semua
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={clearCols}>
                    Kosongkan
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetCols} title="Kembali ke kolom bawaan">
                    Bawaan
                  </Button>
                </div>
                <DropdownMenuSeparator />
                {TOGGLEABLE.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={show(col.key)}
                    onCheckedChange={() => toggleCol(col.key)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {canExport && (
            <select
              aria-label="Pecah sheet Excel per"
              title="Pecah sheet Excel per — hanya berlaku untuk unduhan Excel"
              value={sheetSplit}
              onChange={(e) => setSheetSplit(e.target.value as LandParcelSheetSplit)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {(Object.keys(LAND_PARCEL_SHEET_SPLIT_LABELS) as LandParcelSheetSplit[]).map((k) => (
                <option key={k} value={k}>Sheet per {LAND_PARCEL_SHEET_SPLIT_LABELS[k]}</option>
              ))}
            </select>
          )}
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={preparingMaps}
              className="h-9 gap-2"
            >
              <Download className="h-4 w-4" />
              {preparingMaps ? "Menyiapkan peta…" : "Excel"}
            </Button>
          )}
          {canPrint && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={preparingMaps}
              className="h-9 gap-2"
            >
              <Printer className="h-4 w-4" />
              {preparingMaps ? "Menyiapkan peta…" : "PDF"}
            </Button>
          )}
          {canPrint && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintNkt}
              disabled={printingNkt}
              className="h-9 gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900 dark:text-red-400"
              title="Laporan NKT Lembaga ini (seluruh lahan aktif, tidak mengikuti filter)"
            >
              <ShieldAlert className="h-4 w-4" />
              {printingNkt ? "Menyusun…" : "Laporan NKT"}
            </Button>
          )}
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
                {show("blok") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Blok</th>}
                {show("komoditas") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Komoditas</th>}
                {show("species") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Species</th>}
                {show("psr") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">PSR</th>}
                {show("tahunTanam") && <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">Tahun Tanam</th>}
                {show("luas") && <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">Luas (Ha)</th>}
                {show("surat") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Surat Kepemilikan</th>}
                {show("namaDiSurat") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Nama di Surat</th>}
                {show("luasTertera") && <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap tabular-nums">Luas Tertera (Ha)</th>}
                {show("stdb") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">STDB</th>}
                {show("ulParcelCode") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">UL Parcel Code</th>}
                {show("program") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Program</th>}
                {show("nkt") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">NKT</th>}
                {show("luasNkt") && <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Luas NKT (Ha)</th>}
                {show("patok") && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Patok</th>}
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
                    {show("surat") && (
                      <td className={cn("px-3 py-2 font-mono text-xs", row.surat == null && "font-sans text-sm text-muted-foreground")}>
                        {displayOrEmpty(row.surat)}
                      </td>
                    )}
                    {show("namaDiSurat") && (
                      <td className={cn("px-3 py-2", row.namaDiSurat == null && "text-muted-foreground")}>
                        {displayOrEmpty(row.namaDiSurat)}
                      </td>
                    )}
                    {show("luasTertera") && (
                      <td className={cn("px-3 py-2 text-right tabular-nums whitespace-nowrap", row.luasTertera == null && "text-muted-foreground")}>
                        {row.luasTertera != null ? formatLuas(row.luasTertera) : EMPTY}
                      </td>
                    )}
                    {show("stdb") && (
                      <td className={cn("px-3 py-2 font-mono text-xs", row.stdb == null && "font-sans text-sm text-muted-foreground")}>
                        {displayOrEmpty(row.stdb)}
                      </td>
                    )}
                    {show("ulParcelCode") && (
                      <td className={cn("px-3 py-2 font-mono text-xs", row.ulParcelCode == null && "font-sans text-sm text-muted-foreground")}>
                        {displayOrEmpty(row.ulParcelCode)}
                      </td>
                    )}
                    {show("program") && (
                      <td className={cn("px-3 py-2 whitespace-nowrap", row.program == null && "text-muted-foreground")}>
                        {displayOrEmpty(row.program)}
                      </td>
                    )}
                    {show("nkt") && (
                      <td className={cn("px-3 py-2 whitespace-nowrap", row.nktStatus == null && "text-muted-foreground", (row.nktStatus === "INCLUDED" || row.nktStatus === "AFFECTED") && "text-red-600")}>
                        {row.nkt ?? "Belum dinilai"}
                      </td>
                    )}
                    {show("luasNkt") && (
                      <td className={cn("px-3 py-2 text-right tabular-nums whitespace-nowrap", row.luasNkt == null && "text-muted-foreground")}>
                        {row.luasNkt != null ? formatLuas(row.luasNkt) : EMPTY}
                      </td>
                    )}
                    {show("patok") && (
                      <td className={cn("px-3 py-2 whitespace-nowrap", row.patok === 0 && "text-muted-foreground")}>
                        {row.patok > 0 ? `${row.patok} · ${row.patokKondisi}` : "Belum ada"}
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

/**
 * Mosaik latar untuk satu halaman peta, seukuran KOTAKNYA. Cache dipegang di
 * modul (bukan state) supaya bertahan lintas render dan dipakai bersama jalur
 * pratinjau maupun ekspor PDF — keduanya menjahit bbox yang berbeda sedikit
 * (kotak pratinjau vs kotak halaman PDF), tapi tile-nya hampir seluruhnya sama
 * sehingga pass kedua nyaris seluruhnya kena cache HTTP proxy.
 */
const basemapMosaicCache = new Map<string, string>();

/**
 * Batas entri cache. Kuncinya memuat kepekatan DAN bbox, jadi tiap langkah
 * slider serta tiap bentuk kotak (pratinjau vs halaman PDF vs tiap sel atlas)
 * melahirkan entri baru — masing-masing data URL JPEG ratusan KB. Tanpa batas,
 * satu sesi yang menggeser slider di atas grid 30 sel menahan ratusan MB
 * string sepanjang umur SPA. 24 entri ≈ satu grid penuh pada satu setelan,
 * cukup untuk bolak-balik antar pilihan tanpa menjahit ulang.
 */
const BASEMAP_CACHE_MAX = 24;

/** Baca + segarkan urutan pemakaian (Map menjaga urutan sisip). */
function readMosaicCache(key: string): string | undefined {
  const hit = basemapMosaicCache.get(key);
  if (hit === undefined) return undefined;
  basemapMosaicCache.delete(key);
  basemapMosaicCache.set(key, hit);
  return hit;
}

function writeMosaicCache(key: string, url: string) {
  basemapMosaicCache.set(key, url);
  while (basemapMosaicCache.size > BASEMAP_CACHE_MAX) {
    const oldest = basemapMosaicCache.keys().next().value;
    if (oldest === undefined) break;
    basemapMosaicCache.delete(oldest);
  }
}

async function composeForBox(
  key: ReportBasemapKey,
  frame: NonNullable<LpMapLayout["frame"]>,
  box: { x: number; y: number; w: number; h: number },
  dim: number,
): Promise<string | undefined> {
  const expanded = expandFrameToBox(frame, box);
  const cacheKey = basemapCacheKey(key, expanded, dim);
  const cached = readMosaicCache(cacheKey);
  if (cached) return cached;
  const image = await composeReportBasemap(key, expanded, dim);
  if (image) writeMosaicCache(cacheKey, image);
  return image ?? undefined;
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

/** Skala batang + panah utara (paritas dekorasi PDF, #180) + atribusi latar. */
function MapDecorations({ layout, attribution }: { layout: LpMapLayout; attribution?: string | null }) {
  if (!layout.frame) return null;
  const bar = pickScaleBar(layout.frame.scale);
  const nx = PREVIEW_BOX.w - 6;
  const ny = 4;
  return (
    <g>
      {attribution && (
        <text x={PREVIEW_BOX.w - 3} y={PREVIEW_BOX.h - 2.5} fontSize={2.2} fill="#334155" textAnchor="end">
          {attribution}
        </text>
      )}
      <polygon points={`${nx},${ny} ${nx + 1.8},${ny + 5} ${nx - 1.8},${ny + 5}`} fill="#1e293b" transform={`rotate(180 ${nx} ${ny + 2.5})`} />
      <text x={nx} y={ny + 8.5} fontSize={3} fontWeight={700} fill="#1e293b" textAnchor="middle">U</text>
      {bar && (
        <g>
          <rect x={2.5} y={PREVIEW_BOX.h - 9} width={bar.mm + 3 + bar.label.length * 1.6 + 3} height={7} rx={0.8} fill="#fff" stroke="#e2e8f0" strokeWidth={0.2} />
          <line x1={4} y1={PREVIEW_BOX.h - 4} x2={4 + bar.mm} y2={PREVIEW_BOX.h - 4} stroke="#1e293b" strokeWidth={0.7} />
          <line x1={4} y1={PREVIEW_BOX.h - 5.5} x2={4} y2={PREVIEW_BOX.h - 4} stroke="#1e293b" strokeWidth={0.3} />
          <line x1={4 + bar.mm} y1={PREVIEW_BOX.h - 5.5} x2={4 + bar.mm} y2={PREVIEW_BOX.h - 4} stroke="#1e293b" strokeWidth={0.3} />
          <text x={4 + bar.mm + 2} y={PREVIEW_BOX.h - 4.5} fontSize={2.6} fill="#1e293b">{bar.label}</text>
        </g>
      )}
    </g>
  );
}

/** Mini-ikhtisar posisi sel aktif dalam grid (kanan-atas kartu sel, #180). */
function MiniIndexSvg({ split, active }: { split: LpGridSplit; active: LpGridCell }) {
  const cellSize = Math.min(20 / split.cols, 9 / split.rows);
  const w = cellSize * split.cols;
  const h = cellSize * split.rows;
  const x = PREVIEW_BOX.w - w - 12;
  const y = 3;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#fff" stroke="#94a3b8" strokeWidth={0.2} />
      <rect x={x + active.col * cellSize} y={y + active.row * cellSize} width={cellSize} height={cellSize} fill="#10b981" />
      {Array.from({ length: split.cols - 1 }, (_, i) => (
        <line key={`v${i}`} x1={x + (i + 1) * cellSize} y1={y} x2={x + (i + 1) * cellSize} y2={y + h} stroke="#94a3b8" strokeWidth={0.2} />
      ))}
      {Array.from({ length: split.rows - 1 }, (_, j) => (
        <line key={`h${j}`} x1={x} y1={y + (j + 1) * cellSize} x2={x + w} y2={y + (j + 1) * cellSize} stroke="#94a3b8" strokeWidth={0.2} />
      ))}
    </g>
  );
}

function LayoutSvg({
  layout,
  linesByNo,
  overlay,
  basemapUrl,
  attribution,
}: {
  layout: LpMapLayout;
  /** null = tanpa label poligon (mode ikhtisar). */
  linesByNo: Map<number, string[]> | null;
  overlay?: ReactNode;
  /** JPEG data URL hasil `composeReportBasemap`, menutupi persis bbox layout. */
  basemapUrl?: string;
  attribution?: string | null;
}) {
  const LINE_H = 2.6;

  // Pass 1: dimensi blok label per poligon (sebagaimana digambar) → resolusi
  // tabrakan (#180) dengan helper yang sama seperti renderer PDF.
  const jobs = linesByNo
    ? layout.polygons.map((poly) => {
        const lines = linesByNo.get(poly.no) ?? [String(poly.no)];
        const isNoOnly = lines.length === 1 && lines[0] === String(poly.no);
        if (isNoOnly) {
          const scale = Math.max(0.6, Math.min(1, Math.min(poly.bboxW, poly.bboxH) / (2 * 2.4 + 1)));
          const d = 2 * 2.4 * scale;
          return { poly, lines, isNoOnly, scale, fit: null, rect: { x: poly.labelX, y: poly.labelY, w: d, h: d } };
        }
        const baseW = Math.max(...lines.map((l) => l.length)) * 1.5 + 2;
        const baseH = lines.length * LINE_H + 1.2;
        const fit = fitLabelToBox(baseW, baseH, poly.bboxW - 0.8, poly.bboxH - 0.8);
        const w = baseW * fit.scale;
        const h = baseH * fit.scale;
        return {
          poly,
          lines,
          isNoOnly,
          scale: fit.scale,
          fit,
          rect: fit.vertical ? { x: poly.labelX, y: poly.labelY, w: h, h: w } : { x: poly.labelX, y: poly.labelY, w, h },
        };
      })
    : [];
  const positions = resolveLabelCollisions(
    jobs.map((j) => j.rect),
    { y1: 0, y2: PREVIEW_BOX.h },
  );

  return (
    <svg
      viewBox={`0 0 ${PREVIEW_BOX.w} ${PREVIEW_BOX.h}`}
      className="w-full h-auto rounded border bg-white"
    >
      {basemapUrl && (
        // Menutupi seluruh kotak: mosaik memang dijahit untuk bbox kotak ini
        // (`expandFrameToBox`), bukan untuk bbox lahan — jadi tak ada pita
        // putih di sisi yang tak terpakai sebaran lahan.
        //
        // Data URL, bukan URL jaringan: SVG ini juga dirender jadi PNG untuk
        // Excel (`svgToPng`), dan gambar eksternal diblokir di mode itu.
        <image
          href={basemapUrl}
          x={0}
          y={0}
          width={PREVIEW_BOX.w}
          height={PREVIEW_BOX.h}
          preserveAspectRatio="none"
        />
      )}
      {layout.polygons.map((poly) =>
        poly.rings.map((ring, ri) => (
          <polygon
            key={`${poly.no}-${ri}`}
            points={ring.map(([x, y]) => `${x},${y}`).join(" ")}
            // Di atas latar, fill hijau menutupi justru citra di dalam lahan —
            // bagian yang ingin dilihat. Garis dipertebal sebagai gantinya
            // (paritas `drawLayoutPolygons` di jalur PDF).
            fill={basemapUrl ? "none" : "#d1f0e0"}
            stroke="#10b981"
            strokeWidth={basemapUrl ? 0.6 : 0.4}
          />
        )),
      )}
      {jobs.map((job, idx) => {
        const cx = positions[idx].x;
        const cy = positions[idx].y;
        const { lines } = job;
        if (job.isNoOnly) {
          return (
            <g key={job.poly.no}>
              <circle cx={cx} cy={cy} r={2.4 * job.scale} fill="#fff" stroke="#10b981" strokeWidth={0.25} />
              <text x={cx} y={cy} fontSize={2.6 * job.scale} fontWeight={700} fill="#1e293b" textAnchor="middle" dominantBaseline="central">
                {lines[0]}
              </text>
            </g>
          );
        }
        const fit = job.fit!;
        const w = fit.vertical ? job.rect.h : job.rect.w;
        const h = fit.vertical ? job.rect.w : job.rect.h;
        const lineH = LINE_H * fit.scale;
        return (
          <g key={job.poly.no} transform={fit.vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
            <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={0.8} fill="#fff" stroke="#10b981" strokeWidth={0.25} />
            {lines.map((line, i) => (
              <text
                key={i}
                x={cx}
                y={cy - h / 2 + 0.6 * fit.scale + lineH * (i + 0.5)}
                fontSize={2.4 * fit.scale}
                fontWeight={700}
                fill="#1e293b"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
      {overlay}
      <MapDecorations layout={layout} attribution={attribution} />
    </svg>
  );
}

function LandParcelMapPreview({
  mapParcels,
  rows,
  cols,
  basemapImages,
  attribution,
}: {
  mapParcels: PreviewParcel[];
  rows: number;
  cols: number;
  /** "" = halaman penuh/ikhtisar, sisanya label sel grid. */
  basemapImages: Map<string, string>;
  attribution: string | null;
}) {
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
          <LayoutSvg
            layout={fullLayout}
            linesByNo={linesByNo}
            basemapUrl={basemapImages.get("")}
            attribution={attribution}
          />
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
          <LayoutSvg
            layout={fullLayout}
            linesByNo={null}
            overlay={overlay}
            basemapUrl={basemapImages.get("")}
            attribution={attribution}
          />
        </div>
        {split!.cells.map((cell) => (
          <div key={cell.label}>
            <p className="text-xs text-muted-foreground mb-1">
              Peta {cell.label} — {cell.parcels.length} lahan
            </p>
            <LayoutSvg
              layout={buildLandParcelMapLayout(cell.parcels, PREVIEW_BOX)}
              linesByNo={linesByNo}
              overlay={<MiniIndexSvg split={split!} active={cell} />}
              basemapUrl={basemapImages.get(cell.label)}
              attribution={attribution}
            />
          </div>
        ))}
      </div>
      {skippedNote && <p className="text-xs text-muted-foreground">{skippedNote}</p>}
    </div>
  );
}
