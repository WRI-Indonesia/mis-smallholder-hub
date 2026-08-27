"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Excel from "exceljs";
import Papa from "papaparse";
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
import { cellValueToPrimitive } from "@/lib/excel-cell";
import {
  PARCEL_DETAIL_TARGET_FIELDS,
  LAND_DOCUMENT_TYPE_LABELS,
  autoMatchParcelDetailColumns,
  validateParcelDetailRows,
  type ParcelDetailFieldKey,
  type ParcelDetailValidatedRow,
  type ParcelRef,
} from "@/lib/land-parcel-detail-import";
import {
  getParcelsForDetailMapping,
  bulkSaveLandParcelDetails,
} from "@/server/actions/bulk-upload-parcel-detail";

/**
 * Tab "Detail Lahan (Excel)" di halaman Upload Massal Lahan (#296): surat
 * kepemilikan, STDB, dan kode vendor per ID Lahan. Mengikuti alur 3 langkah
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
  const [mapping, setMapping] = useState<Mapping>({});
  const [validated, setValidated] = useState<ParcelDetailValidatedRow[]>([]);
  const [filter, setFilter] = useState<"all" | "valid" | "error">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse<RawRow>(selected, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.meta.fields) {
            toast.error("Gagal membaca header file CSV");
            return;
          }
          setHeaders(results.meta.fields);
          setRawRows(results.data);
          setMapping(autoMatchParcelDetailColumns(results.meta.fields));
        },
        error: () => toast.error("Gagal membaca file CSV"),
      });
      return;
    }
    if (ext !== "xlsx") {
      toast.error("Hanya mendukung berkas Excel (.xlsx) atau CSV");
      return;
    }
    try {
      const workbook = new Excel.Workbook();
      await workbook.xlsx.load(await selected.arrayBuffer());
      // Berkas sumber kadang punya sheet pertama kosong ("Sheet1") dan data di
      // sheet "Data" — pilih sheet pertama yang berisi header.
      const worksheet =
        workbook.worksheets.find((ws) => ws.name.toLowerCase() === "data" && ws.rowCount > 1) ??
        workbook.worksheets.find((ws) => ws.rowCount > 1);
      if (!worksheet) {
        toast.error("Tidak ada sheet berisi data");
        return;
      }
      const rows: RawRow[] = [];
      let sheetHeaders: string[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values = (Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values)).map(
          cellValueToPrimitive,
        );
        if (rowNumber === 1) {
          sheetHeaders = values.map((v) => v?.toString().trim() || "");
          return;
        }
        const data: RawRow = {};
        sheetHeaders.forEach((h, i) => {
          if (h) data[h] = values[i];
        });
        rows.push(data);
      });
      const cleanHeaders = sheetHeaders.filter(Boolean);
      setHeaders(cleanHeaders);
      setRawRows(rows);
      setMapping(autoMatchParcelDetailColumns(cleanHeaders));
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file Excel (.xlsx)");
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
    setIsProcessing(true);
    setValidated(validateParcelDetailRows(rawRows, mapping, parcels));
    setIsProcessing(false);
    toast.success("Validasi selesai");
  }

  async function handleSave() {
    const rows = validated.filter((r) => r._isValid && r.data).map((r) => r.data!);
    if (rows.length === 0) return;
    setIsSaving(true);
    const result = await bulkSaveLandParcelDetails(rows);
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const s = result.data!;
    toast.success(
      `${s.rows} baris tersimpan — surat ${s.documentsCreated} baru / ${s.documentsUpdated} diperbarui · STDB ${s.stdbsCreated} baru, ${s.stdbLinksCreated} tautan · kode vendor ${s.externalIdsCreated} baru / ${s.externalIdsUpdated} diperbarui`,
      { duration: 8000 },
    );
    setValidated([]);
    setRawRows([]);
    setHeaders([]);
    setFile(null);
    router.refresh();
  }

  async function handleDownload(mode: "all" | "errors") {
    const rows = mode === "all" ? validated : validated.filter((r) => !r._isValid);
    const wb = new Excel.Workbook();
    const sheet = wb.addWorksheet("Data");
    sheet.columns = [
      { header: "Baris", key: "row", width: 8 },
      ...PARCEL_DETAIL_TARGET_FIELDS.map((f) => ({ header: f.label, key: f.key, width: 24 })),
      { header: "Status", key: "status", width: 10 },
      { header: "Detail Error", key: "errors", width: 60 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const r of rows) {
      sheet.addRow({ row: r._rowNum, ...r._raw, status: r._isValid ? "Valid" : "Error", errors: r._errors.join("; ") });
    }
    const buffer = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer]));
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "all" ? "detail_lahan_semua.xlsx" : "detail_lahan_error.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadTemplate() {
    const wb = new Excel.Workbook();
    const sheet = wb.addWorksheet("Data");
    sheet.columns = PARCEL_DETAIL_TARGET_FIELDS.map((f) => ({ header: f.label, key: f.key, width: 26 }));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
    sheet.addRow({
      parcelId: "APSS.0001.A.14.01.10.2012",
      farmerId: "APSS.14.01.10.2012.0001",
      documentType: "SHM (Sertifikat Hak Milik)",
      documentNumber: "727",
      holderName: "Abdul Rohman",
      statedArea: 0.25,
      stdbNumber: "1637/53/1401/6/2025",
      externalCode: "ID080d781b4",
    });
    sheet.addRow({
      parcelId: "APSS.0001.B.14.01.10.2012",
      farmerId: "APSS.14.01.10.2012.0001",
      documentType: "SKT (Surat Keterangan Tanah)",
      documentNumber: "592.11/SKT/PEMT/BJ/140/2024",
      holderName: "Nurhaya",
      statedArea: 1.34,
      stdbNumber: "1637/53/1401/6/2025",
      externalCode: "",
    });
    const buffer = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_detail_lahan.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">1. Pilih File Detail Lahan</Label>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="text-xs h-8 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Unduh Template Excel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Surat kepemilikan (SHM/SKT/SKGR/…), nomor STDB, dan kode pemetaan vendor per <strong>ID Lahan</strong>{" "}
            yang sudah terdaftar. Poligon lahan tetap diunggah lewat tab Shapefile.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Input type="file" accept=".xlsx,.csv" onChange={handleFileChange} disabled={isProcessing} className="max-w-md" />
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
                  onValueChange={(val) =>
                    setMapping((prev) => ({ ...prev, [f.key]: val === "_empty" ? "" : val }))
                  }
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
          <div className="flex justify-end pt-2">
            <Button onClick={handleValidate} disabled={isProcessing || rawRows.length === 0 || parcels === null} className="h-10">
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Validasi Detail Lahan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
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
                  <TableHead>Kode Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[220px]">Detail Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
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
