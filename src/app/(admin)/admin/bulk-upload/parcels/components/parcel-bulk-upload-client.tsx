"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Excel from "exceljs";
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
import { parseShapefile, bulkCreateLandParcels } from "@/server/actions/bulk-upload-parcel";
import {
  PARCEL_AUTO_MATCH_RULES,
  autoMatchColumns,
  normalizeAttr,
} from "@/lib/parcel-bulk-mapping";
import { ParcelBulkUploadMap } from "./parcel-bulk-upload-map";

interface FarmerMapping {
  id: string;
  name: string;
  farmerId: string;
}

interface ExistingParcel {
  farmerId: string;
  parcelId: string;
  geometry: unknown;
  revision: number;
}

type ParcelGeometry = { type?: string; coordinates?: unknown } | null;

interface ParcelFeature {
  index: number;
  properties: Record<string, Excel.CellValue>;
  geometry: ParcelGeometry;
}

interface ParcelValidatedRow {
  _rowNum: number;
  geometry: ParcelGeometry;
  _original: Record<string, string | number | null | undefined>;
  _isValid: boolean;
  _errors: string[];
  _farmerName: string;
  _farmerIdRaw: string;
  farmerId: string;
  parcelId: string;
  revision?: number;
  _isNewRevision?: boolean;
  area: number | null;
  landStatus: string | null;
  cropType: string | null;
  plantingYear?: number | null;
  notes: string | null;
  subGroupLv2: string | null;
  blok: string | null;
}

function isGeometryEqual(g1: unknown, g2: unknown) {
  if (!g1 || !g2) return false;
  try {
    const obj1 = (typeof g1 === "string" ? JSON.parse(g1) : g1) as { coordinates?: unknown };
    const obj2 = (typeof g2 === "string" ? JSON.parse(g2) : g2) as { coordinates?: unknown };
    const c1 = obj1.coordinates;
    const c2 = obj2.coordinates;
    return JSON.stringify(c1) === JSON.stringify(c2);
  } catch {
    return false;
  }
}

interface Props {
  farmers: FarmerMapping[];
  existingParcels: ExistingParcel[];
  permissions: string[];
}

const TARGET_FIELDS = [
  { key: "parcelId", label: "ID Lahan", required: true, desc: "ID unik Lahan per petani" },
  { key: "farmerId", label: "ID Petani", required: true, desc: "ID Petani WRI (e.g. FARMER-001)" },
  { key: "area", label: "Luas (ha)", required: false, desc: "Angka desimal luas hektar" },
  {
    key: "landStatus",
    label: "Status Kepemilikan",
    required: false,
    desc: "e.g. Owned, Leased, Shared",
  },
  { key: "cropType", label: "Komoditas", required: false, desc: "e.g. Kelapa Sawit, Karet" },
  { key: "plantingYear", label: "Tahun Tanam", required: false, desc: "Tahun 1900-2100" },
  { key: "subGroupLv2", label: "Kelompok Tani", required: false, desc: "Nama Kelompok Tani" },
  { key: "blok", label: "Blok", required: false, desc: "Blok kebun" },
  { key: "revision", label: "Revisi", required: false, desc: "Angka revisi (default 0)" },
  { key: "notes", label: "Catatan", required: false, desc: "Catatan tambahan" },
];

// Aturan auto-match + normalisasi dipisah ke `@/lib/parcel-bulk-mapping` (teruji).
const AUTO_MATCH_RULES = PARCEL_AUTO_MATCH_RULES;

export function ParcelBulkUploadClient({ farmers, existingParcels, permissions }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [features, setFeatures] = useState<ParcelFeature[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validatedData, setValidatedData] = useState<ParcelValidatedRow[]>([]);
  const [filter, setFilter] = useState<"all" | "valid" | "error">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Handle ZIP Shapefile Input
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".zip")) {
      toast.error("Hanya mendukung berkas ZIP Shapefile (.zip)");
      return;
    }

    setFile(selectedFile);
    setHeaders([]);
    setFeatures([]);
    setMapping({});
    setValidatedData([]);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const res = await parseShapefile(base64);
        setIsProcessing(false);

        if (res.success && res.features) {
          setFeatures(res.features);
          // Extract headers from first feature properties keys
          if (res.features.length > 0) {
            const detectedHeaders = Object.keys(res.features[0].properties);
            setHeaders(detectedHeaders);
            autoMatch(detectedHeaders);
            toast.success(
              `Berhasil mengurai shapefile: ${res.features.length} geometri lahan terdeteksi`,
            );
          } else {
            toast.error("Shapefile tidak mengandung data geometri/fitur");
          }
        } else {
          toast.error(res.error || "Gagal mengurai file shapefile");
        }
      } catch (err) {
        setIsProcessing(false);
        toast.error((err instanceof Error && err.message) || "Gagal membaca berkas ZIP");
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      toast.error("Gagal membaca berkas");
    };
  }

  function autoMatch(detectedHeaders: string[]) {
    setMapping(
      autoMatchColumns(
        detectedHeaders,
        TARGET_FIELDS.map((f) => f.key),
        AUTO_MATCH_RULES,
      ),
    );
  }

  function validateRow(
    feat: ParcelFeature,
    idx: number,
    duplicatesInFile: Set<string>,
  ): { data: ParcelValidatedRow; errors: string[] } {
    const errors: string[] = [];
    const props = feat.properties;
    const normalized: ParcelValidatedRow = {
      _rowNum: idx + 1,
      geometry: feat.geometry,
      _original: {},
      _isValid: false,
      _errors: [],
      farmerId: "",
      _farmerName: "",
      _farmerIdRaw: "",
      parcelId: "",
      area: null,
      landStatus: null,
      cropType: null,
      notes: null,
      subGroupLv2: null,
      blok: null,
    };

    // Original values kept for download
    for (const f of TARGET_FIELDS) {
      const mappedCol = mapping[f.key];
      normalized._original[f.key] = (mappedCol ? props[mappedCol] : "") as
        string | number | null | undefined;
    }

    // 1. Farmer ID Mapping
    const rawFarmerId = props[mapping["farmerId"]]?.toString().trim();
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
        errors.push(`ID Petani "${rawFarmerId}" tidak terdaftar di database`);
      }
    }
    normalized.farmerId = mappedFarmerDbId;
    normalized._farmerName = mappedFarmerName;
    normalized._farmerIdRaw = rawFarmerId || "";

    // 2. Parcel ID
    const rawParcelId = props[mapping["parcelId"]]?.toString().trim();
    if (!rawParcelId) {
      errors.push("ID Lahan wajib diisi");
    } else {
      // Check duplicate in file (unique per farmer)
      const fileDupKey = `${mappedFarmerDbId || rawFarmerId}::${rawParcelId.toLowerCase()}`;
      if (duplicatesInFile.has(fileDupKey)) {
        errors.push(`ID Lahan duplikat di dalam file: "${rawParcelId}" untuk petani ini`);
      }

      // Check duplicate in database
      if (mappedFarmerDbId) {
        const dbDup = existingParcels.find(
          (ep) =>
            ep.farmerId === mappedFarmerDbId &&
            ep.parcelId.toLowerCase() === rawParcelId.toLowerCase(),
        );
        if (dbDup) {
          if (isGeometryEqual(dbDup.geometry, feat.geometry)) {
            errors.push(
              `ID Lahan "${rawParcelId}" sudah terdaftar dengan polygon yang sama di database`,
            );
          } else {
            normalized.revision = dbDup.revision + 1;
            normalized._isNewRevision = true;
          }
        }
      }
    }
    normalized.parcelId = rawParcelId || "";

    // 3. Area
    const rawArea = props[mapping["area"]];
    if (rawArea !== undefined && rawArea !== null && rawArea !== "") {
      const parsedArea = parseFloat(rawArea as string);
      if (isNaN(parsedArea) || parsedArea <= 0) {
        errors.push(`Luas lahan tidak valid: "${rawArea}" (Luas harus berupa angka lebih dari 0)`);
      } else {
        normalized.area = parsedArea;
      }
    } else {
      normalized.area = null;
    }

    // 4. Land Status
    normalized.landStatus = props[mapping["landStatus"]]?.toString().trim() || null;

    // 5. Crop Type
    normalized.cropType = props[mapping["cropType"]]?.toString().trim() || null;

    // 6. Planting Year
    const rawYear = props[mapping["plantingYear"]];
    if (rawYear !== undefined && rawYear !== null && rawYear !== "") {
      const parsedYear = parseInt(rawYear.toString().trim(), 10);
      if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
        errors.push(`Tahun tanam tidak valid: "${rawYear}" (Gunakan tahun antara 1900-2100)`);
      } else {
        normalized.plantingYear = parsedYear;
      }
    } else {
      normalized.plantingYear = null;
    }

    // 7. Revision
    if (normalized._isNewRevision) {
      // Keep computed revision from dbDup.revision + 1
    } else {
      const rawRev = props[mapping["revision"]];
      if (rawRev !== undefined && rawRev !== null && rawRev !== "") {
        const parsedRev = parseInt(rawRev.toString().trim(), 10);
        if (isNaN(parsedRev) || parsedRev < 0) {
          errors.push(`Revisi tidak valid: "${rawRev}" (Gunakan angka non-negatif)`);
        } else {
          normalized.revision = parsedRev;
        }
      } else {
        normalized.revision = 0;
      }
    }

    // 8. Notes
    normalized.notes = props[mapping["notes"]]?.toString().trim() || null;

    // 8b. Sub-kelompok interim + blok (#150) — opsional, trim, kosong → null.
    normalized.subGroupLv2 = normalizeAttr(
      mapping["subGroupLv2"] ? props[mapping["subGroupLv2"]] : null,
    );
    normalized.blok = normalizeAttr(mapping["blok"] ? props[mapping["blok"]] : null);

    // 9. Geometry validation
    if (
      !feat.geometry ||
      (feat.geometry.type !== "Polygon" && feat.geometry.type !== "MultiPolygon")
    ) {
      errors.push("Geometri tidak valid (Harus bertipe Polygon atau MultiPolygon)");
    }

    normalized._isValid = errors.length === 0;
    normalized._errors = errors;
    return { data: normalized, errors };
  }

  function handleValidate() {
    const missing = TARGET_FIELDS.filter((f) => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      toast.error(`Kolom wajib berikut belum dipetakan: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setIsProcessing(true);

    // Find duplicates within the file (unique combo farmerId + parcelId)
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    features.forEach((feat) => {
      const rawFarmerId = feat.properties[mapping["farmerId"]]?.toString().trim();
      const rawParcelId = feat.properties[mapping["parcelId"]]?.toString().trim();
      if (rawFarmerId && rawParcelId) {
        // Find matching farmer DB ID if possible
        const matchFarmer = farmers.find(
          (f) => f.farmerId.toLowerCase() === rawFarmerId.toLowerCase(),
        );
        const farmerKey = matchFarmer ? matchFarmer.id : rawFarmerId;
        const key = `${farmerKey}::${rawParcelId.toLowerCase()}`;
        if (seen.has(key)) {
          duplicates.add(key);
        }
        seen.add(key);
      }
    });

    const results = features.map((feat, idx) => validateRow(feat, idx, duplicates).data);
    setValidatedData(results);
    setIsProcessing(false);
    toast.success("Validasi selesai");
  }

  async function handleDownload(mode: "all" | "errors") {
    const exportWorkbook = new Excel.Workbook();
    const sheet = exportWorkbook.addWorksheet("Data Lahan");

    const cols = [
      { header: "Baris Asal", key: "rowNum", width: 12 },
      { header: "ID Lahan", key: "parcelId", width: 15 },
      { header: "ID Petani Asal", key: "farmerIdRaw", width: 15 },
      { header: "Nama Petani", key: "farmerName", width: 25 },
      { header: "Luas (ha)", key: "area", width: 12 },
      { header: "Status Kepemilikan", key: "landStatus", width: 20 },
      { header: "Komoditas", key: "cropType", width: 15 },
      { header: "Tahun Tanam", key: "plantingYear", width: 15 },
      { header: "Kelompok Tani", key: "subGroupLv2", width: 20 },
      { header: "Blok", key: "blok", width: 12 },
      { header: "Revisi", key: "revision", width: 12 },
      { header: "Catatan", key: "notes", width: 25 },
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
      sheet.addRow({
        rowNum: row._rowNum,
        parcelId: row.parcelId || row._original.parcelId || "",
        farmerIdRaw: row._farmerIdRaw || "",
        farmerName: row._farmerName || "",
        area: row.area !== null ? row.area : row._original.area || "",
        landStatus: row.landStatus || row._original.landStatus || "",
        cropType: row.cropType || row._original.cropType || "",
        plantingYear: row.plantingYear || row._original.plantingYear || "",
        subGroupLv2: row.subGroupLv2 || row._original.subGroupLv2 || "",
        blok: row.blok || row._original.blok || "",
        revision: row.revision !== undefined ? row.revision : row._original.revision || 0,
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
    link.download = `bulk_upload_lahan_${mode === "errors" ? "error_only" : "full"}.xlsx`;
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
      parcelId: d.parcelId,
      geometry: d.geometry,
      area: d.area,
      landStatus: d.landStatus,
      cropType: d.cropType,
      plantingYear: d.plantingYear,
      revision: d.revision,
      notes: d.notes,
      subGroupLv2: d.subGroupLv2,
      blok: d.blok,
    }));

    const result = await bulkCreateLandParcels(toSave);
    setIsSaving(false);

    if (result.success) {
      toast.success(`Berhasil menyimpan ${result.data?.count} data lahan`);
      router.push("/admin/master-data/parcels");
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

  return (
    <div className="space-y-6">
      {/* Step 1: Upload File */}
      <Card className="p-6">
        <div className="flex flex-col gap-2">
          <Label className="text-base font-semibold">1. Pilih ZIP Shapefile</Label>
          <p className="text-xs text-muted-foreground">
            Unggah arsip ZIP (.zip) yang berisi berkas .shp, .dbf, .shx, dan .prj dari shapefile
            lahan.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="max-w-md"
            />
            {file && (
              <span className="text-sm text-muted-foreground">
                Shapefile: <strong>{file.name}</strong> ({features.length} fitur/baris terdeteksi)
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Step 2: Mapping columns */}
      {headers.length > 0 && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">2. Petakan Atribut Kolom</h3>
            <p className="text-sm text-muted-foreground">
              Cocokkan kolom dari tabel atribut DBF shapefile dengan data target sistem.
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
              disabled={isProcessing || features.length === 0}
              className="h-10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Validasi Data Shapefile
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
                Tinjau kembali hasil pemetaan dan validasi spasial/atribut sebelum menyimpannya ke
                database.
              </p>
              <div className="flex items-center gap-4 mt-2 pt-1 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                  {validCount} Lahan Valid
                </span>
                <span className="flex items-center gap-1.5 text-destructive font-semibold bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  {invalidCount} Lahan Error
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
                Simpan {validCount} Lahan Valid
              </Button>
            )}
          </div>

          <ParcelBulkUploadMap data={filteredData} />

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b-2">
                  <TableHead className="w-[80px]">No</TableHead>
                  <TableHead>ID Lahan</TableHead>
                  <TableHead>ID Petani (Asal)</TableHead>
                  <TableHead>Nama Petani (DB)</TableHead>
                  <TableHead>Luas (ha)</TableHead>
                  <TableHead>Status Kepemilikan</TableHead>
                  <TableHead>Komoditas</TableHead>
                  <TableHead>Tahun Tanam</TableHead>
                  <TableHead>Kelompok Tani</TableHead>
                  <TableHead>Blok</TableHead>
                  <TableHead>Revisi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[200px]">Detail Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                      Tidak ada data untuk filter ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.slice(0, 100).map((row, idx) => (
                    <TableRow key={idx} className={row._isValid ? "" : "bg-destructive/5"}>
                      <TableCell className="font-mono text-muted-foreground">
                        {row._rowNum}
                      </TableCell>
                      <TableCell className="font-mono">
                        {row.parcelId || row._original.parcelId || "—"}
                      </TableCell>
                      <TableCell className="font-mono">{row._farmerIdRaw || "—"}</TableCell>
                      <TableCell className="font-medium">{row._farmerName || "—"}</TableCell>
                      <TableCell className="font-mono text-right">
                        {row.area !== null ? row.area.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell>{row.landStatus || row._original.landStatus || "—"}</TableCell>
                      <TableCell>{row.cropType || row._original.cropType || "—"}</TableCell>
                      <TableCell className="font-mono">
                        {row.plantingYear || row._original.plantingYear || "—"}
                      </TableCell>
                      <TableCell>{row.subGroupLv2 || "—"}</TableCell>
                      <TableCell>{row.blok || "—"}</TableCell>
                      <TableCell className="font-mono">{row.revision}</TableCell>
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
