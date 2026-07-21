"use client";

import { useState } from "react";
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
import { bulkCreateProductionRecords } from "@/server/actions/bulk-upload-production";

interface FarmerMapping {
  id: string;
  name: string;
  farmerId: string;
}

interface ExistingRecord {
  farmerId: string;
  period: string;
  harvestNumber: number;
  parcelId: string | null;
  parcel?: { parcelId: string } | null;
}

interface Props {
  farmers: FarmerMapping[];
  existingRecords: ExistingRecord[];
  permissions: string[];
}

type RawRow = Record<string, Excel.CellValue>;

interface ProductionValidatedRow {
  _rowNum: number;
  _original: Record<string, string | number | null | undefined>;
  _isValid: boolean;
  _errors: string[];
  _farmerName: string;
  _farmerIdRaw: string;
  farmerId: string;
  period?: string;
  harvestDate?: Date;
  harvestNumber?: number;
  yieldKg?: number;
  parcelId: string | null;
  notes: string | null;
}

const TARGET_FIELDS = [
  {
    key: "farmerId",
    label: "ID Petani",
    required: true,
    desc: "ID Petani WRI (contoh: FARMER-001)",
  },
  { key: "period", label: "Periode", required: true, desc: "Format YYYY-MM (contoh: 2026-06)" },
  {
    key: "harvestDate",
    label: "Tanggal Panen",
    required: true,
    desc: "Format tanggal (harus sesuai bulan periode)",
  },
  { key: "harvestNumber", label: "Panen Ke-", required: true, desc: "Angka bulat 1 s/d 4" },
  {
    key: "yieldKg",
    label: "Hasil Panen (kg)",
    required: true,
    desc: "Angka desimal/bulat lebih dari 0",
  },
  {
    key: "parcelId",
    label: "ID Lahan",
    required: false,
    desc: "ID Lahan opsional (CUID dari sistem)",
  },
  { key: "notes", label: "Catatan", required: false, desc: "Catatan tambahan (maks 500 karakter)" },
];

const AUTO_MATCH_RULES: Record<string, string[]> = {
  farmerId: [
    "farmer_id",
    "farmerid",
    "petani_id",
    "id petani",
    "id_petani",
    "farmer_code",
    "kode_petani",
    "wri_id",
    "farmer",
    "kode petani",
  ],
  period: ["period", "periode", "bulan", "month", "period_id"],
  harvestDate: [
    "harvest_date",
    "harvestdate",
    "tanggal_panen",
    "tgl_panen",
    "tanggal panen",
    "tgl panen",
    "tanggal",
    "date",
  ],
  harvestNumber: [
    "harvest_number",
    "harvestnumber",
    "panen_ke",
    "panen ke",
    "no_panen",
    "panen ke-",
    "panen ke_",
  ],
  yieldKg: ["yield_kg", "yieldkg", "yield", "hasil", "hasil_panen", "hasil panen", "kg", "berat"],
  parcelId: [
    "parcel_id",
    "parcelid",
    "lahan_id",
    "id lahan",
    "id_lahan",
    "kode_lahan",
    "kode lahan",
    "parcel",
  ],
  notes: ["notes", "note", "keterangan", "ket", "catatan", "notes_info"],
};

export function BulkUploadProductionClient({ farmers, existingRecords, permissions }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validatedData, setValidatedData] = useState<ProductionValidatedRow[]>([]);
  const [filter, setFilter] = useState<"all" | "valid" | "error">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Parse Excel Date
  function parseExcelDate(val: Excel.CellValue): Date | null {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === "number") {
      const utc_days = Math.floor(val - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
    }
    if (typeof val === "string") {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return new Date(parsed);
      const parts = val.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length <= 2 && parts[2].length === 4) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          return new Date(y, m, d);
        }
        if (parts[0].length === 4) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          return new Date(y, m, d);
        }
      }
    }
    return null;
  }

  function validateRow(
    row: RawRow,
    index: number,
    duplicatesInFile: Set<string>,
  ): { data: ProductionValidatedRow; errors: string[] } {
    const errors: string[] = [];
    const normalized: ProductionValidatedRow = {
      _rowNum: index + 2,
      _original: {},
      _isValid: false,
      _errors: [],
      farmerId: "",
      _farmerName: "",
      _farmerIdRaw: "",
      parcelId: null,
      notes: null,
    };

    for (const f of TARGET_FIELDS) {
      const mappedCol = mapping[f.key];
      normalized._original[f.key] = (mappedCol ? row[mappedCol] : "") as
        string | number | null | undefined;
    }

    // 1. Farmer ID mapping lookup
    const rawFarmerId = row[mapping["farmerId"]]?.toString().trim();
    let mappedFarmerDbId = "";
    let mappedFarmerName = "";

    if (!rawFarmerId) {
      errors.push("ID Petani wajib diisi");
    } else {
      const matchFarmer = farmers.find(
        (f) => f.farmerId.toLowerCase() === rawFarmerId.toLowerCase(),
      );
      if (matchFarmer) {
        mappedFarmerDbId = matchFarmer.id;
        mappedFarmerName = matchFarmer.name;
      } else {
        errors.push(`ID Petani "${rawFarmerId}" tidak ditemukan dalam database atau akses Anda`);
      }
    }
    normalized.farmerId = mappedFarmerDbId;
    normalized._farmerName = mappedFarmerName;
    normalized._farmerIdRaw = rawFarmerId || "";

    // 2. Period validation (YYYY-MM)
    const rawPeriod = row[mapping["period"]]?.toString().trim();
    let isPeriodFormatValid = false;
    if (!rawPeriod) {
      errors.push("Periode wajib diisi");
    } else if (!/^\d{4}-\d{2}$/.test(rawPeriod)) {
      errors.push(`Format periode tidak valid: "${rawPeriod}" (Gunakan YYYY-MM)`);
    } else {
      normalized.period = rawPeriod;
      isPeriodFormatValid = true;
    }

    // 3. Harvest Date validation
    const rawHarvestDate = row[mapping["harvestDate"]];
    let parsedHarvestDate: Date | null = null;
    if (!rawHarvestDate) {
      errors.push("Tanggal Panen wajib diisi");
    } else {
      parsedHarvestDate = parseExcelDate(rawHarvestDate);
      if (parsedHarvestDate && !isNaN(parsedHarvestDate.getTime())) {
        normalized.harvestDate = parsedHarvestDate;
      } else {
        errors.push(`Format tanggal tidak valid: "${rawHarvestDate}"`);
      }
    }

    // Cross validation: harvestDate must be within period
    if (isPeriodFormatValid && parsedHarvestDate && rawPeriod) {
      const [year, month] = rawPeriod.split("-").map(Number);
      const harvestMonth = parsedHarvestDate.getMonth() + 1;
      const harvestYear = parsedHarvestDate.getFullYear();
      if (harvestYear !== year || harvestMonth !== month) {
        errors.push(
          `Tanggal panen (${parsedHarvestDate.toLocaleDateString(
            "id-ID",
          )}) tidak sesuai dengan periode ${rawPeriod}`,
        );
      }
    }

    // 4. Harvest Number validation (1 - 4)
    const rawHarvestNumber = row[mapping["harvestNumber"]];
    let harvestNumber: number | null = null;
    if (rawHarvestNumber === undefined || rawHarvestNumber === null || rawHarvestNumber === "") {
      errors.push("Panen Ke- wajib diisi");
    } else {
      const parsedNum = parseInt(rawHarvestNumber.toString().trim(), 10);
      if (isNaN(parsedNum) || parsedNum < 1 || parsedNum > 4) {
        errors.push(`Panen Ke- tidak valid: "${rawHarvestNumber}" (Harus angka bulat 1 s/d 4)`);
      } else {
        harvestNumber = parsedNum;
        normalized.harvestNumber = parsedNum;
      }
    }

    // 5. Yield validation
    const rawYield = row[mapping["yieldKg"]];
    if (rawYield === undefined || rawYield === null || rawYield === "") {
      errors.push("Hasil Panen wajib diisi");
    } else {
      const parsedYield = parseFloat(rawYield.toString().trim().replace(/,/g, "."));
      if (isNaN(parsedYield) || parsedYield <= 0) {
        errors.push(`Hasil panen tidak valid: "${rawYield}" (Harus berupa angka > 0)`);
      } else if (parsedYield > 999999) {
        errors.push(`Hasil panen terlalu besar: "${rawYield}" (Maks 999.999 kg)`);
      } else {
        normalized.yieldKg = parsedYield;
      }
    }

    // 6. Parcel ID (optional)
    const rawParcelId = row[mapping["parcelId"]]?.toString().trim();
    normalized.parcelId = rawParcelId || null;

    // 7. Notes (optional, max 500 chars)
    const rawNotes = row[mapping["notes"]]?.toString().trim();
    if (rawNotes && rawNotes.length > 500) {
      errors.push("Catatan maksimal 500 karakter");
    }
    normalized.notes = rawNotes || null;

    // Duplicate checks
    if (mappedFarmerDbId && isPeriodFormatValid && harvestNumber !== null) {
      // Duplicates within this file
      const dupKey = `${mappedFarmerDbId}::${normalized.parcelId || ""}::${rawPeriod}::${harvestNumber}`;
      if (duplicatesInFile.has(dupKey)) {
        errors.push(
          `Data panen ke-${harvestNumber} periode ${rawPeriod} terdeteksi ganda di dalam file`,
        );
      }

      // Duplicates in DB
      const dbDup = existingRecords.find(
        (er) =>
          er.farmerId === mappedFarmerDbId &&
          er.period === rawPeriod &&
          er.harvestNumber === harvestNumber &&
          (er.parcel?.parcelId === normalized.parcelId || (!er.parcelId && !normalized.parcelId)),
      );
      if (dbDup) {
        errors.push(
          `Data panen ke-${harvestNumber} periode ${rawPeriod} sudah terdaftar di database`,
        );
      }
    }

    normalized._isValid = errors.length === 0;
    normalized._errors = errors;
    return { data: normalized, errors };
  }

  // Handle File Upload
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setValidatedData([]);

    const fileType = selectedFile.name.split(".").pop()?.toLowerCase();

    if (fileType === "csv") {
      Papa.parse<RawRow>(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
            setRawRows(results.data as RawRow[]);
            autoMatch(results.meta.fields);
          } else {
            toast.error("Gagal membaca header file CSV");
          }
        },
        error: () => {
          toast.error("Gagal membaca file CSV");
        },
      });
    } else if (fileType === "xlsx") {
      try {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = new Excel.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
          toast.error("Sheet pertama kosong");
          return;
        }

        const rows: RawRow[] = [];
        let sheetHeaders: string[] = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          const values = Array.isArray(row.values)
            ? row.values.slice(1)
            : Object.values(row.values);
          if (rowNumber === 1) {
            sheetHeaders = values.map((v) => v?.toString().trim() || "");
          } else {
            const rowData: RawRow = {};
            sheetHeaders.forEach((header, index) => {
              rowData[header] = values[index];
            });
            rows.push(rowData);
          }
        });

        setHeaders(sheetHeaders);
        setRawRows(rows);
        autoMatch(sheetHeaders);
      } catch (err) {
        console.error(err);
        toast.error("Gagal membaca file Excel (.xlsx)");
      }
    } else {
      toast.error("Hanya mendukung berkas Excel (.xlsx) atau CSV");
    }
  }

  function autoMatch(detectedHeaders: string[]) {
    const matched: Record<string, string> = {};
    for (const f of TARGET_FIELDS) {
      const rules = AUTO_MATCH_RULES[f.key] || [];
      const bestMatch = detectedHeaders.find((h) => rules.includes(h.toLowerCase().trim()));
      if (bestMatch) {
        matched[f.key] = bestMatch;
      }
    }
    setMapping(matched);
  }

  function handleValidate() {
    const missing = TARGET_FIELDS.filter((f) => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      toast.error(`Kolom wajib berikut belum dipetakan: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setIsProcessing(true);

    // Find duplicates inside file (combination of farmerId + period + harvestNumber)
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    rawRows.forEach((row) => {
      const rawFarmerId = row[mapping["farmerId"]]?.toString().trim();
      const rawPeriod = row[mapping["period"]]?.toString().trim();
      const rawHarvestNumber = row[mapping["harvestNumber"]]?.toString().trim();
      const rawParcelId = row[mapping["parcelId"]]?.toString().trim() || "";

      if (rawFarmerId && rawPeriod && rawHarvestNumber) {
        const matchFarmer = farmers.find(
          (f) => f.farmerId.toLowerCase() === rawFarmerId.toLowerCase(),
        );
        const farmerDbId = matchFarmer ? matchFarmer.id : rawFarmerId;
        const key = `${farmerDbId}::${rawParcelId}::${rawPeriod}::${rawHarvestNumber}`;
        if (seen.has(key)) {
          duplicates.add(key);
        }
        seen.add(key);
      }
    });

    const results = rawRows.map((row, idx) => validateRow(row, idx, duplicates).data);
    setValidatedData(results);
    setIsProcessing(false);
    toast.success("Validasi selesai");
  }

  async function handleDownload(mode: "all" | "errors") {
    const exportWorkbook = new Excel.Workbook();
    const sheet = exportWorkbook.addWorksheet("Data Produksi");

    const cols = [
      { header: "Baris Asal", key: "rowNum", width: 12 },
      { header: "ID Petani", key: "farmerId", width: 15 },
      { header: "Nama Petani", key: "farmerName", width: 25 },
      { header: "Periode", key: "period", width: 12 },
      { header: "Tanggal Panen", key: "harvestDate", width: 15 },
      { header: "Panen Ke-", key: "harvestNumber", width: 12 },
      { header: "Hasil Panen (kg)", key: "yieldKg", width: 18 },
      { header: "ID Lahan", key: "parcelId", width: 18 },
      { header: "Catatan", key: "notes", width: 30 },
      { header: "Status Validasi", key: "status", width: 15 },
      { header: "Detail Error", key: "keterangan", width: 45 },
    ];

    sheet.columns = cols;
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const targetList = mode === "errors" ? validatedData.filter((d) => !d._isValid) : validatedData;

    targetList.forEach((row) => {
      const dateStr = row.harvestDate
        ? new Date(row.harvestDate).toLocaleDateString("id-ID")
        : row._original.harvestDate || "";

      sheet.addRow({
        rowNum: row._rowNum,
        farmerId: row._farmerIdRaw || "",
        farmerName: row._farmerName || "",
        period: row.period || row._original.period || "",
        harvestDate: dateStr,
        harvestNumber: row.harvestNumber || row._original.harvestNumber || "",
        yieldKg: row.yieldKg !== undefined ? row.yieldKg : row._original.yieldKg || "",
        parcelId: row.parcelId || row._original.parcelId || "",
        notes: row.notes || row._original.notes || "",
        status: row._isValid ? "VALID" : "ERROR",
        keterangan: row._errors.join("; "),
      });
    });

    const buffer = await exportWorkbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bulk_upload_produksi_${mode === "errors" ? "error_only" : "full"}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleSave() {
    const validRows = validatedData.filter((d) => d._isValid);
    if (validRows.length === 0) {
      toast.error("Tidak ada data valid yang dapat disimpan");
      return;
    }

    setIsSaving(true);
    const toSave = validRows.map((d) => ({
      farmerId: d.farmerId,
      period: d.period,
      harvestDate: d.harvestDate,
      harvestNumber: d.harvestNumber,
      yieldKg: d.yieldKg,
      parcelId: d.parcelId,
      notes: d.notes,
    }));

    const result = await bulkCreateProductionRecords(toSave);
    setIsSaving(false);

    if (result.success) {
      toast.success(`Berhasil menyimpan ${result.data?.count} data produksi`);
      router.push("/admin/master-data/production");
      router.refresh();
    } else {
      toast.error(result.error || "Gagal menyimpan data");
    }
  }

  const validCount = validatedData.filter((d) => d._isValid).length;
  const invalidCount = validatedData.length - validCount;

  const filteredData = validatedData.filter((d) => {
    if (filter === "valid") return d._isValid;
    if (filter === "error") return !d._isValid;
    return true;
  });

  async function handleDownloadTemplate() {
    const templateWorkbook = new Excel.Workbook();
    const sheet = templateWorkbook.addWorksheet("Template Produksi");

    sheet.columns = [
      { header: "ID Petani", key: "farmerId", width: 20 },
      { header: "Periode (YYYY-MM)", key: "period", width: 22 },
      { header: "Tanggal Panen (DD/MM/YYYY)", key: "harvestDate", width: 25 },
      { header: "Panen Ke- (1-4)", key: "harvestNumber", width: 18 },
      { header: "Hasil Panen (kg)", key: "yieldKg", width: 18 },
      { header: "ID Lahan (Opsional)", key: "parcelId", width: 22 },
      { header: "Catatan (Opsional)", key: "notes", width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add example rows
    sheet.addRow({
      farmerId: "FARMER-001",
      period: "2026-06",
      harvestDate: "15/06/2026",
      harvestNumber: 1,
      yieldKg: 350.5,
      parcelId: "",
      notes: "Panen pertama bulan ini",
    });

    sheet.addRow({
      farmerId: "FARMER-002",
      period: "2026-06",
      harvestDate: "18/06/2026",
      harvestNumber: 2,
      yieldKg: 420,
      parcelId: "cld3abc123xyz...",
      notes: "Panen ke-2 dari lahan samping",
    });

    const buffer = await templateWorkbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_bulk_upload_produksi.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Upload File */}
      <Card className="p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">1. Pilih File Data Produksi</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs h-8 gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh Template Excel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Unggah file Excel (.xlsx) atau CSV yang berisi data transaksi panen / produksi petani.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="max-w-md"
            />
            {file && (
              <span className="text-sm text-muted-foreground">
                Tipe File: <strong>{file.name.split(".").pop()?.toUpperCase()}</strong> (
                {rawRows.length} baris terdeteksi)
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Step 2: Mapping Columns */}
      {headers.length > 0 && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">2. Petakan Atribut Kolom</h3>
            <p className="text-sm text-muted-foreground">
              Cocokkan kolom dari berkas yang diunggah dengan data target sistem produksi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TARGET_FIELDS.map((f) => (
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
                  onValueChange={(val) => setMapping((prev) => ({ ...prev, [f.key]: val || "" }))}
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

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={handleValidate}
              disabled={isProcessing || rawRows.length === 0}
              className="h-10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Validasi Data Produksi
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Validated Data & Review */}
      {validatedData.length > 0 && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">3. Hasil Validasi & Tinjauan</h3>
              <p className="text-sm text-muted-foreground">
                Tinjau kembali hasil pemetaan dan kecocokan data sebelum menyimpan ke database.
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
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Semua ({validatedData.length})
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("all")}
                className="h-9"
              >
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
              <Button
                onClick={handleSave}
                disabled={validCount === 0 || isSaving}
                className="h-9 bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Simpan {validCount} Data Valid
              </Button>
            )}
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b-2">
                  <TableHead className="w-[80px]">No</TableHead>
                  <TableHead>ID Petani (Asal)</TableHead>
                  <TableHead>Nama Petani (DB)</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Tanggal Panen</TableHead>
                  <TableHead>Panen Ke-</TableHead>
                  <TableHead className="text-right">Hasil (kg)</TableHead>
                  <TableHead>ID Lahan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[200px]">Detail Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Tidak ada data untuk filter ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.slice(0, 100).map((row, idx) => (
                    <TableRow key={idx} className={row._isValid ? "" : "bg-destructive/5"}>
                      <TableCell className="font-mono text-muted-foreground">
                        {row._rowNum}
                      </TableCell>
                      <TableCell className="font-mono">{row._farmerIdRaw || "—"}</TableCell>
                      <TableCell className="font-medium">{row._farmerName || "—"}</TableCell>
                      <TableCell className="font-mono">
                        {row.period || row._original.period || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.harvestDate
                          ? new Date(row.harvestDate).toLocaleDateString("id-ID")
                          : row._original.harvestDate || "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {row.harvestNumber || row._original.harvestNumber || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {row.yieldKg !== undefined ? row.yieldKg.toLocaleString("id-ID") : "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {row.parcelId || row._original.parcelId || "—"}
                      </TableCell>
                      <TableCell>
                        {row._isValid ? (
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
                      <TableCell className="text-sm text-destructive font-medium">
                        {row._errors.join("; ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredData.length > 100 && (
              <div className="p-4 text-center border-t text-sm text-muted-foreground">
                Menampilkan 100 baris pertama dari total {filteredData.length} baris data.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
