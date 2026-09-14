"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Download, Database, ArrowRight, RefreshCw } from "lucide-react";
import { readSpreadsheetFile } from "@/lib/excel-sheet-reader";
import { exportToExcel } from "@/lib/xlsx";
import {
  PARCEL_DETAIL_TARGET_FIELDS,
  LAND_DOCUMENT_TYPE_LABELS,
  autoMatchParcelDetailColumns,
  validateParcelDetailRows,
  type ParcelDetailFieldKey,
  type ParcelDetailValidatedRow,
  type ParcelRef,
  type NktFileDefaults,
  type NktStatusCode,
} from "@/lib/land-parcel-detail-import";
import {
  PARCEL_MAPPERS,
  DEFAULT_PARCEL_MAPPER,
  LAND_NKT_STATUSES,
  LAND_NKT_STATUS_LABELS,
  NKT_CATEGORIES,
  nktCategoryShort,
  landNktStatusLabel,
  summarizeNktCategories,
} from "@/lib/land-parcel-satellite-format";
import {
  getParcelsForDetailMapping,
  bulkSaveLandParcelDetails,
} from "@/server/actions/bulk-upload-parcel-detail";

/** Nilai sentinel selektor Pemeta — bukan nilai yang disimpan ke DB. */
const OTHER_MAPPER = "__other";

/**
 * Tab "Detail Lahan (Excel)" di halaman Upload Massal Lahan (#296): surat
 * kepemilikan, STDB, dan UL Parcel Code per ID Lahan. Mengikuti alur 3 langkah
 * upload produksi (pilih berkas → petakan kolom → validasi & simpan).
 * Daftar lahan dimuat MALAS saat tab dibuka — ±13 ribu baris di prod, jangan
 * dibebankan ke halaman utama yang mayoritas dipakai untuk shapefile.
 */

interface Props {
  permissions: string[];
}

type RawRow = Record<string, unknown>;
type Mapping = Partial<Record<ParcelDetailFieldKey, string>>;

export function ParcelDetailUploadClient({ permissions }: Props) {
  const router = useRouter();
  const [parcels, setParcels] = useState<ParcelRef[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  /** Nomor baris FISIK tiap baris data (#301) — dasar penomoran "Baris Asal". */
  const [rowNumbers, setRowNumbers] = useState<number[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [validated, setValidated] = useState<ParcelDetailValidatedRow[]>([]);
  const [filter, setFilter] = useState<"all" | "valid" | "error">("all");
  const [isSaving, setIsSaving] = useState(false);
  // Pemeta berlaku untuk seluruh berkas → `LandParcelExternalId.source`
  // (keputusan owner 2026-08-28: kolom itu berarti SIAPA yang memetakan).
  const [mapper, setMapper] = useState<string>(DEFAULT_PARCEL_MAPPER);
  const [customMapper, setCustomMapper] = useState("");
  // NKT (#328): bawaan per berkas untuk daftar "terdampak NKT" (Lampiran HJP) yang tak punya
  // kolom status/kategori — bila status dipilih, SEMUA baris valid mendapat NKT.
  const EMPTY_NKT_DEFAULTS: NktFileDefaults = { status: null, categories: [], assessedAt: null, assessor: null };
  const [nktDefaults, setNktDefaultsState] = useState<NktFileDefaults>(EMPTY_NKT_DEFAULTS);
  // Mengubah bawaan SETELAH validasi harus membatalkan hasil validasi — pratinjau
  // & baris yang dikirim Simpan dihitung dari bawaan saat Validasi diklik.
  const setNktDefaults = (upd: (d: NktFileDefaults) => NktFileDefaults) => {
    setNktDefaultsState(upd);
    setValidated([]);
  };

  useEffect(() => {
    let cancelled = false;
    getParcelsForDetailMapping()
      .then((rows) => {
        if (!cancelled) setParcels(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setParcels([]);
          toast.error("Gagal memuat daftar lahan untuk pencocokan");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const validCount = useMemo(() => validated.filter((r) => r._isValid).length, [validated]);
  const invalidCount = validated.length - validCount;
  const filtered = useMemo(
    () =>
      filter === "all"
        ? validated
        : validated.filter((r) => (filter === "valid" ? r._isValid : !r._isValid)),
    [validated, filter],
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setValidated([]);
    // Bawaan NKT terikat pada SATU berkas: kalau dibawa ke berkas berikutnya
    // (mis. data surat/STDB biasa), seluruh barisnya ikut ditandai NKT.
    setNktDefaultsState(EMPTY_NKT_DEFAULTS);
    setRowNumbers([]);

    try {
      const sheet = await readSpreadsheetFile(selected, {
        isHeaderCandidate: (labels) => Object.keys(autoMatchParcelDetailColumns(labels)).length > 0,
      });
      if (sheet.headers.length === 0) {
        toast.error("Tidak menemukan baris header pada berkas ini");
        return;
      }
      if (sheet.headerRowNumber > 1) {
        toast.info(`Header ditemukan di baris ${sheet.headerRowNumber}`);
      }
      setHeaders(sheet.headers);
      setRawRows(sheet.rows);
      setRowNumbers(sheet.rowNumbers);
      setMapping(autoMatchParcelDetailColumns(sheet.headers));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Gagal membaca berkas");
    }
  }

  function handleValidate() {
    if (!parcels) {
      toast.error("Daftar lahan masih dimuat, coba lagi sebentar");
      return;
    }
    const missing = PARCEL_DETAIL_TARGET_FIELDS.filter((f) => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      toast.error(`Kolom wajib belum dipetakan: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    setValidated(validateParcelDetailRows(rawRows, mapping, parcels, rowNumbers, nktDefaults));
    toast.success("Validasi selesai");
    // Peringatan eksplisit, bukan lewat diam-diam (#305): "punya UL Parcel
    // Code" dipakai Laporan Lahan sebagai penanda "lahan sudah didata". Begitu
    // ada berkas kabupaten tanpa kolom `parcel_code`, penyebut laporan itu
    // salah tanpa satu pun gejala.
    if (!mapping.externalCode) {
      toast.warning(
        "Berkas ini tidak punya kolom UL Parcel Code (parcel_code). Lahannya tetap tersimpan, " +
          "tetapi tidak akan terhitung sebagai \"sudah didata\" di Laporan Lahan — persentase legalitas di sana jadi lebih rendah dari kenyataan.",
        { duration: 12000 },
      );
    }
  }

  async function handleSave() {
    const rows = validated.filter((r) => r._isValid && r.data).map((r) => r.data!);
    if (rows.length === 0) return;
    const source = mapper === OTHER_MAPPER ? customMapper.trim() : mapper;
    if (!source) {
      toast.error("Isi nama pemeta terlebih dahulu");
      return;
    }
    setIsSaving(true);
    const result = await bulkSaveLandParcelDetails(rows, source);
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const s = result.data!;
    toast.success(
      `${s.rows} baris tersimpan — surat ${s.documentsCreated} baru / ${s.documentsUpdated} diperbarui${s.documentsUnchanged ? ` / ${s.documentsUnchanged} tanpa perubahan` : ""} · STDB ${s.stdbsCreated} baru${s.stdbsPendingCreated ? ` (${s.stdbsPendingCreated} belum bernomor)` : ""}, ${s.stdbLinksCreated} tautan${s.stdbsPendingSkipped ? ` / ${s.stdbsPendingSkipped} petani "belum ada" dilewati (sudah punya STDB)` : ""} · UL Parcel Code ${s.externalIdsCreated} baru / ${s.externalIdsUpdated} diperbarui${s.externalIdsUnchanged ? ` / ${s.externalIdsUnchanged} tanpa perubahan` : ""}${s.externalIdsSkipped ? ` / ${s.externalIdsSkipped} dilewati (kode aktif di lahan lain)` : ""} · kelompok tani terisi ${s.subGroupsFilled} · sepadan ${s.bordersCreated} baru / ${s.bordersUpdated} diperbarui${s.bordersUnchanged ? ` / ${s.bordersUnchanged} tanpa perubahan` : ""} · blok terisi ${s.bloksFilled} · NKT ${s.nktCreated} baru / ${s.nktUpdated} diperbarui${s.nktUnchanged ? ` / ${s.nktUnchanged} tanpa perubahan` : ""}`,
      { duration: 8000 },
    );
    setValidated([]);
    setRawRows([]);
    setHeaders([]);
    setFile(null);
    setNktDefaultsState(EMPTY_NKT_DEFAULTS);
    router.refresh();
  }

  async function handleDownload(mode: "all" | "errors") {
    const rows = mode === "all" ? validated : validated.filter((r) => !r._isValid);
    await exportToExcel({
      filename: mode === "all" ? "detail_lahan_semua" : "detail_lahan_error",
      columns: [
        { header: "Baris", key: "row", width: 8 },
        ...PARCEL_DETAIL_TARGET_FIELDS.map((f) => ({ header: f.label, key: f.key, width: 24 })),
        { header: "Status", key: "status", width: 10 },
        { header: "Detail Error", key: "errors", width: 60 },
      ],
      data: rows.map((r) => ({
        row: r._rowNum,
        ...r._raw,
        status: r._isValid ? "Valid" : "Error",
        errors: r._errors.join("; "),
      })),
    });
  }

  async function handleDownloadTemplate() {
    await exportToExcel({
      filename: "template_detail_lahan",
      columns: PARCEL_DETAIL_TARGET_FIELDS.map((f) => ({ header: f.label, key: f.key, width: 26 })),
      data: [
        {
          parcelId: "APSS.0001.A.14.01.10.2012",
          farmerId: "APSS.14.01.10.2012.0001",
          documentType: "SHM (Sertifikat Hak Milik)",
          documentNumber: "727",
          holderName: "Abdul Rohman",
          statedArea: 0.25,
          stdbNumber: "1637/53/1401/6/2025",
          externalCode: "ID080d781b4",
          subGroupLv2: "Kelompok Tani Karya Maju",
          borderNorth: "Lahan Pak Budi",
          borderEast: "Jalan desa",
          borderSouth: "Sungai",
          borderWest: "Lahan Pak Ahmad",
          blok: "17 L",
          nktStatus: "terdampak",
          nktCategories: "4",
          nktAreaHa: 0.088,
          nktLengthM: 176.026,
          nktAssessedAt: "2025-03-12",
          nktAssessor: "Laporan NKT HJP 2025",
        },
        {
          parcelId: "APSS.0001.B.14.01.10.2012",
          farmerId: "APSS.14.01.10.2012.0001",
          documentType: "SKT (Surat Keterangan Tanah)",
          documentNumber: "592.11/SKT/PEMT/BJ/140/2024",
          holderName: "Nurhaya",
          statedArea: 1.34,
          stdbNumber: "1637/53/1401/6/2025",
          externalCode: "",
          subGroupLv2: "",
          borderNorth: "",
          borderEast: "",
          borderSouth: "",
          borderWest: "",
          blok: "",
          nktStatus: "",
          nktCategories: "",
          nktAreaHa: "",
          nktLengthM: "",
          nktAssessedAt: "",
          nktAssessor: "",
        },
      ],
    });
  }

  /**
   * Template NKT tersendiri (#328) — mengikuti Lampiran daftar petak terdampak
   * NKT dari asesmen (HJP): Nama · ID Petani · ID Lahan · Kelompok Tani · Blok ·
   * Luas NKT Area (ha) · Panjang (m) + kolom status/kategori/tanggal/asesor
   * (boleh kosong → dipenuhi bawaan berkas). Importer yang sama; kolom lain
   * yang tidak ada = tidak disentuh. Kelompok Tani DAN Blok keduanya ada:
   * Lembaga plasma memakai Blok, Lembaga swadaya memakai Kelompok Tani.
   */
  async function handleDownloadNktTemplate() {
    // Urutan kolom mengikuti `keys` (urutan Lampiran), bukan urutan definisi field.
    const pick = (keys: ParcelDetailFieldKey[]) =>
      keys.map((k) => PARCEL_DETAIL_TARGET_FIELDS.find((f) => f.key === k)!).map((f) => ({ header: f.label, key: f.key, width: 24 }));
    await exportToExcel({
      filename: "template_nkt_lahan",
      columns: [
        { header: "Nama", key: "nama", width: 22 },
        ...pick(["farmerId", "parcelId", "subGroupLv2", "blok", "nktAreaHa", "nktLengthM", "nktStatus", "nktCategories", "nktAssessedAt", "nktAssessor"]),
      ],
      data: [
        { nama: "Abdul Halim", farmerId: "HJP.14.01.10.2011.0001", parcelId: "HJP.0001.A.14.01.10.2002", subGroupLv2: "", blok: "17 L", nktAreaHa: 0.088, nktLengthM: 176.026, nktStatus: "terdampak", nktCategories: "4", nktAssessedAt: "2025-03-12", nktAssessor: "Laporan NKT HJP 2025" },
        { nama: "Agus Setyobudi", farmerId: "HJP.14.01.10.2014.0009", parcelId: "HJP.0009.D.14.01.10.2002", subGroupLv2: "KT Karya Maju", blok: "", nktAreaHa: 0.02, nktLengthM: 39.132, nktStatus: "", nktCategories: "", nktAssessedAt: "", nktAssessor: "" },
      ],
    });
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">1. Pilih File Detail Lahan</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="text-xs h-8 gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Unduh Template Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadNktTemplate} className="text-xs h-8 gap-1.5" title="Daftar lahan terdampak NKT (pola Lampiran asesmen)">
                <Download className="h-3.5 w-3.5" />
                Template NKT
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Surat kepemilikan (SHM/SKT/SKGR/…), nomor STDB, UL Parcel Code, Nama Kelompok Tani & Blok (hanya
            mengisi yang masih kosong), Sepadan Utara/Timur/Selatan/Barat (sel terisi menimpa, sel kosong
            dibiarkan), dan status <strong>NKT</strong> (termasuk/terdampak/tidak, kategori 1–6, luas, tanggal asesmen) per{" "}
            <strong>ID Lahan</strong> yang sudah terdaftar. Poligon lahan tetap diunggah lewat tab Shapefile.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Input type="file" accept=".xlsx,.csv" onChange={handleFileChange} className="max-w-md" />
            {file && (
              <span className="text-sm text-muted-foreground">
                {rawRows.length} baris terdeteksi
                {parcels === null && " · memuat daftar lahan…"}
                {parcels !== null && ` · ${parcels.length.toLocaleString("id-ID")} lahan aktif dalam akses Anda`}
              </span>
            )}
          </div>
        </div>
      </Card>

      {headers.length > 0 && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">2. Petakan Atribut Kolom</h3>
            <p className="text-sm text-muted-foreground">
              Kolom berkas sumber (<code>MIS_&lt;KAB&gt;_data-lahan.xlsx</code>) dikenali otomatis; periksa lalu validasi.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PARCEL_DETAIL_TARGET_FIELDS.map((f) => (
              <div key={f.key} className="space-y-2 border p-3 rounded-lg bg-card/50">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Badge variant={f.required ? "default" : "outline"} className="text-[10px]">
                    {f.required ? "Wajib" : "Opsional"}
                  </Badge>
                </div>
                <Select
                  value={mapping[f.key] || ""}
                  onValueChange={(val) => {
                    setMapping((prev) => ({ ...prev, [f.key]: val === "_empty" ? "" : val }));
                    // Pemetaan berubah = hasil validasi lama tidak berlaku lagi.
                    setValidated([]);
                  }}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih kolom..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_empty">-- Kosongkan --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground block">{f.desc}</span>
              </div>
            ))}
          </div>
          {/* Bawaan NKT per berkas (#328): daftar "petak terdampak NKT" dari asesmen biasanya hanya
              memuat ID + luas tanpa kolom status/kategori — nilainya ditetapkan sekali untuk seluruh berkas. */}
          <div className="rounded-md border border-dashed p-3 space-y-2">
            <p className="text-sm font-medium">Bawaan NKT untuk berkas ini <span className="text-xs font-normal text-muted-foreground">(opsional — untuk daftar lahan terdampak NKT yang tak punya kolom status/kategori)</span></p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status untuk semua baris</Label>
                <Select value={nktDefaults.status ?? "_none"} onValueChange={(v) => setNktDefaults((d) => ({ ...d, status: v && v !== "_none" ? (v as NktStatusCode) : null }))}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue>{(value: string) => (value === "_none" ? "— tidak menetapkan —" : LAND_NKT_STATUS_LABELS[value as NktStatusCode] ?? value)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— tidak menetapkan —</SelectItem>
                    {LAND_NKT_STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>{LAND_NKT_STATUS_LABELS[st]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kategori bawaan</Label>
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5">
                  {NKT_CATEGORIES.map((c) => (
                    <label key={c} className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-primary"
                        checked={nktDefaults.categories.includes(c)}
                        onChange={(e) => setNktDefaults((d) => ({ ...d, categories: e.target.checked ? [...d.categories, c] : d.categories.filter((x) => x !== c) }))}
                      />
                      {nktCategoryShort(c)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tanggal asesmen bawaan</Label>
                <Input type="date" className="h-9" value={nktDefaults.assessedAt ?? ""} onChange={(e) => setNktDefaults((d) => ({ ...d, assessedAt: e.target.value || null }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Asesor / sumber bawaan</Label>
                <Input className="h-9" placeholder="mis. Laporan NKT HJP 2025" value={nktDefaults.assessor ?? ""} onChange={(e) => setNktDefaults((d) => ({ ...d, assessor: e.target.value || null }))} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Sel di berkas menang atas bawaan. Status/kategori bawaan hanya dipakai bila kolomnya kosong atau tidak dipetakan.</p>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleValidate} disabled={rawRows.length === 0 || parcels === null} className="h-10">
              Validasi Detail Lahan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {validated.length > 0 && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">3. Hasil Validasi & Tinjauan</h3>
              <p className="text-sm text-muted-foreground">
                Baris error tidak ikut tersimpan. Baris dengan ID Lahan ganda atau STDB lintas petani ditandai error di
                semua kemunculannya — perbaiki di berkas sumber, jangan pilih salah satu.
              </p>
              <div className="flex items-center gap-4 mt-2 pt-1 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                  {validCount} Baris Valid
                </span>
                <span className="flex items-center gap-1.5 text-destructive font-semibold bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  {invalidCount} Baris Error
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
                Semua ({validated.length})
              </Button>
              <Button
                variant={filter === "valid" ? "default" : "outline"}
                size="sm"
                className="bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 border-emerald-600/20"
                onClick={() => setFilter("valid")}
              >
                Valid ({validCount})
              </Button>
              <Button
                variant={filter === "error" ? "default" : "outline"}
                size="sm"
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
                onClick={() => setFilter("error")}
              >
                Error ({invalidCount})
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownload("all")} className="h-9">
                <Download className="mr-2 h-4 w-4" />
                Download Semua Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("errors")}
                className="h-9 text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Data Error Saja
              </Button>
            </div>
            {permissions.includes("CREATE") && (
              <div className="flex items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mapper" className="text-xs text-muted-foreground">Pemeta (sumber UL Parcel Code)</Label>
                  <Select value={mapper} onValueChange={(v) => setMapper(v ?? DEFAULT_PARCEL_MAPPER)}>
                    <SelectTrigger id="mapper" className="h-9 w-[280px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARCEL_MAPPERS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                      <SelectItem value={OTHER_MAPPER}>Lainnya…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {mapper === OTHER_MAPPER && (
                  <Input
                    value={customMapper}
                    onChange={(e) => setCustomMapper(e.target.value)}
                    placeholder="Nama pemeta"
                    className="h-9 w-[200px]"
                  />
                )}
              </div>
            )}
            {permissions.includes("CREATE") && (
              <Button onClick={handleSave} disabled={validCount === 0 || isSaving} className="h-9 bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                Simpan {validCount} Baris Valid
              </Button>
            )}
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b-2">
                  <TableHead className="w-[70px]">No</TableHead>
                  <TableHead>ID Lahan</TableHead>
                  <TableHead>ID Petani</TableHead>
                  <TableHead>Nama Petani (DB)</TableHead>
                  <TableHead>Jenis Surat</TableHead>
                  <TableHead>Nomor Surat</TableHead>
                  <TableHead>Nama di Surat</TableHead>
                  <TableHead className="text-right">Luas Surat (ha)</TableHead>
                  <TableHead>STDB</TableHead>
                  <TableHead>UL Parcel Code</TableHead>
                  <TableHead>Kelompok Tani</TableHead>
                  <TableHead>Blok</TableHead>
                  <TableHead>Sepadan (U · T · S · B)</TableHead>
                  <TableHead>NKT</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[220px]">Detail Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                      Tidak ada data untuk filter ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.slice(0, 100).map((r) => (
                    <TableRow key={r._rowNum} className={r._isValid ? "" : "bg-destructive/5"}>
                      <TableCell className="font-mono text-muted-foreground">{r._rowNum}</TableCell>
                      <TableCell className="font-mono">{r._raw.parcelId || "—"}</TableCell>
                      <TableCell className="font-mono">{r._raw.farmerId || "—"}</TableCell>
                      <TableCell className="font-medium">{r._farmerName || "—"}</TableCell>
                      <TableCell>
                        {r.data?.document
                          ? LAND_DOCUMENT_TYPE_LABELS[r.data.document.type]
                          : r.data?.custodyNote
                            ? <span className="italic text-muted-foreground">{r.data.custodyNote}</span>
                            : r._raw.documentType || "—"}
                      </TableCell>
                      <TableCell className="font-mono">{r._raw.documentNumber || "—"}</TableCell>
                      <TableCell>{r._raw.holderName || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r._raw.statedArea || "—"}</TableCell>
                      <TableCell className="font-mono">{r._raw.stdbNumber || "—"}</TableCell>
                      <TableCell className="font-mono">{r._raw.externalCode || "—"}</TableCell>
                      <TableCell>
                        {r._raw.subGroupLv2
                          ? r._dbSubGroupLv2
                            ? <span className="text-muted-foreground" title={`Sudah terisi di sistem: ${r._dbSubGroupLv2}`}>{r._raw.subGroupLv2} <em>(sudah ada)</em></span>
                            : r._raw.subGroupLv2
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {r._raw.blok
                          ? r._dbBlok
                            ? <span className="text-muted-foreground" title={`Sudah terisi di sistem: ${r._dbBlok}`}>{r._raw.blok} <em>(sudah ada)</em></span>
                            : r._raw.blok
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.data?.border || r._raw.borderNorth || r._raw.borderEast || r._raw.borderSouth || r._raw.borderWest
                          ? [r._raw.borderNorth, r._raw.borderEast, r._raw.borderSouth, r._raw.borderWest].map((v) => v || "·").join(" · ")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {r.data?.nkt
                          ? `${landNktStatusLabel(r.data.nkt.status, true)}${r.data.nkt.categories?.length ? ` — ${summarizeNktCategories(r.data.nkt.categories)}` : ""}${r.data.nkt.affectedAreaHa != null ? ` · ${r.data.nkt.affectedAreaHa} ha` : ""}`
                          : r._raw.nktStatus || r._raw.nktAreaHa
                            ? <span className="text-muted-foreground">{r._raw.nktStatus || r._raw.nktAreaHa}</span>
                            : "—"}
                      </TableCell>
                      <TableCell>
                        {r._isValid ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-destructive font-medium">{r._errors.join("; ") || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filtered.length > 100 && (
              <div className="p-4 text-center border-t text-sm text-muted-foreground">
                Menampilkan 100 baris pertama dari total {filtered.length} baris.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
