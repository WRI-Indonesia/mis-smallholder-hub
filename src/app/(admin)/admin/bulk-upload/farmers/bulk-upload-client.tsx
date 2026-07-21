"use client";

import { useRef, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Database,
  ArrowRight,
  RefreshCw,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { bulkCreateFarmers, getExistingFarmerIds } from "@/server/actions/bulk-upload";

interface FarmerGroup {
  id: string;
  name: string;
  code: string | null;
}

interface Props {
  farmerGroups: FarmerGroup[];
  permissions: string[];
}

type RawRow = Record<string, Excel.CellValue>;

interface FarmerValidatedRow {
  _rowNum: number;
  _original: Record<string, string | number | null | undefined>;
  _isValid: boolean;
  _errors: string[];
  _farmerGroupName?: string;
  name: string;
  farmerId: string;
  gender?: string;
  nik: string | null;
  farmerGroupId?: string;
  address: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  joinedYear?: number | null;
}

const TARGET_FIELDS = [
  { key: "farmerId", label: "ID Petani", required: true, desc: "Minimal 2 karakter" },
  { key: "name", label: "Nama Petani", required: true, desc: "Minimal 2 karakter" },
  { key: "gender", label: "Jenis Kelamin", required: true, desc: "L/P atau Laki-laki/Perempuan" },
  { key: "nik", label: "NIK", required: false, desc: "16 digit angka (opsional)" },
  { key: "birthPlace", label: "Tempat Lahir", required: false, desc: "Opsional" },
  { key: "birthDate", label: "Tanggal Lahir", required: false, desc: "Format tanggal (opsional)" },
  { key: "address", label: "Alamat", required: false, desc: "Opsional" },
  {
    key: "joinedYear",
    label: "Tahun Bergabung",
    required: false,
    desc: "Tahun 1900-2100 (opsional)",
  },
];

const AUTO_MATCH_RULES: Record<string, string[]> = {
  farmerId: ["id petani", "farmer id", "id", "farmer_id", "kode petani", "kode_petani"],
  name: ["nama", "name", "nama petani", "farmer name", "fullname", "nama_petani"],
  gender: ["jenis kelamin", "gender", "sex", "lp", "l/p", "jk", "kelamin"],
  nik: ["nik", "no. ktp", "ktp", "national id", "no_ktp"],
  birthPlace: ["tempat lahir", "birth place", "birthplace", "tempat_lahir"],
  birthDate: [
    "tanggal lahir",
    "birth date",
    "birthdate",
    "tanggal_lahir",
    "tgl lahir",
    "tgl_lahir",
  ],
  address: ["alamat", "address", "domisili"],
  joinedYear: [
    "tahun bergabung",
    "joined year",
    "joinedyear",
    "tahun_bergabung",
    "thn bergabung",
    "thn_bergabung",
  ],
};

export function BulkUploadClient({ farmerGroups, permissions }: Props) {
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  // ID yang sudah dipakai **di lembaga terpilih** — keunikan berlaku per Lembaga
  // (TD-024), jadi daftar ini diambil ulang tiap kali lembaganya berganti.
  const [existingFarmerIds, setExistingFarmerIds] = useState<string[]>([]);
  // Validasi memakai daftar di atas untuk menandai duplikat. Selama masih
  // dimuat, tombol Validasi dikunci — kalau tidak, berkas divalidasi terhadap
  // daftar KOSONG sehingga setiap baris duplikat lolos sebagai "valid", dan
  // kegagalannya baru muncul sebagai galat constraint saat disimpan.
  const [loadingExistingIds, setLoadingExistingIds] = useState(false);
  // Penjaga urutan: memilih lembaga A lalu cepat pindah ke B bisa membuat
  // jawaban A tiba belakangan dan menimpa daftar milik B.
  const existingIdsRequest = useRef(0);
  const [comboOpen, setComboOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validatedData, setValidatedData] = useState<FarmerValidatedRow[]>([]);
  const [filter, setFilter] = useState<"all" | "valid" | "error">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Parse Excel Date
  function parseExcelDate(val: Excel.CellValue): Date | null {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === "number") {
      // Excel serial date format
      const utc_days = Math.floor(val - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
    }
    if (typeof val === "string") {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return new Date(parsed);
      // Try common formats like DD/MM/YYYY
      const parts = val.split(/[-/]/);
      if (parts.length === 3) {
        // Assume DD/MM/YYYY
        if (parts[0].length <= 2 && parts[2].length === 4) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          return new Date(y, m, d);
        }
        // Assume YYYY/MM/DD
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

  // Smart validation and normalization
  function validateRow(
    row: RawRow,
    index: number,
    duplicatesInFile: Set<string>,
  ): { data: FarmerValidatedRow; errors: string[] } {
    const errors: string[] = [];
    const normalized: FarmerValidatedRow = {
      _rowNum: index + 2, // Excel rows are 1-based, plus header is 2
      _original: {},
      _isValid: false,
      _errors: [],
      name: "",
      farmerId: "",
      nik: null,
      address: null,
      birthPlace: null,
      birthDate: null,
    };

    // Original values kept for download
    for (const f of TARGET_FIELDS) {
      const mappedCol = mapping[f.key];
      normalized._original[f.key] = (mappedCol ? row[mappedCol] : "") as
        string | number | null | undefined;
    }

    // 1. Name
    const rawName = row[mapping["name"]]?.toString().trim();
    if (!rawName) {
      errors.push("Nama Petani wajib diisi");
    } else if (rawName.length < 2) {
      errors.push("Nama Petani minimal 2 karakter");
    }
    normalized.name = rawName || "";

    // 2. Farmer ID
    const rawFarmerId = row[mapping["farmerId"]]?.toString().trim();
    if (!rawFarmerId) {
      errors.push("ID Petani wajib diisi");
    } else if (rawFarmerId.length < 2) {
      errors.push("ID Petani minimal 2 karakter");
    } else {
      if (duplicatesInFile.has(rawFarmerId)) {
        errors.push(`ID Petani duplikat di dalam file: "${rawFarmerId}"`);
      }
      if (existingFarmerIds.includes(rawFarmerId)) {
        errors.push(`ID Petani "${rawFarmerId}" sudah terdaftar di database`);
      }
    }
    normalized.farmerId = rawFarmerId || "";

    // 3. Gender
    const rawGender = row[mapping["gender"]]?.toString().trim();
    if (!rawGender) {
      errors.push("Jenis Kelamin wajib diisi");
    } else {
      const gLower = rawGender.toLowerCase();
      if (["l", "m", "laki", "laki-laki", "pria", "male"].includes(gLower)) {
        normalized.gender = "M";
      } else if (["p", "f", "perempuan", "wanita", "female"].includes(gLower)) {
        normalized.gender = "F";
      } else {
        errors.push(
          `Jenis kelamin tidak valid: "${rawGender}" (Gunakan L/P atau Laki-laki/Perempuan)`,
        );
      }
    }

    // 4. NIK
    const rawNik = row[mapping["nik"]]?.toString().trim();
    if (rawNik) {
      // Clean non-digits
      const cleanNik = rawNik.replace(/\D/g, "");
      if (cleanNik.length !== 16) {
        errors.push(`NIK harus 16 digit angka (Terdeteksi ${cleanNik.length} digit)`);
      }
      normalized.nik = cleanNik;
    } else {
      normalized.nik = null;
    }

    // 5. Farmer Group (from global dropdown)
    const group = farmerGroups.find((g) => g.id === selectedGroupId);
    if (!group) {
      errors.push("Lembaga Petani wajib dipilih");
    } else {
      normalized.farmerGroupId = group.id;
      normalized._farmerGroupName = group.name;
    }

    // 6. Address
    normalized.address = row[mapping["address"]]?.toString().trim() || null;

    // 7. Birth Place
    normalized.birthPlace = row[mapping["birthPlace"]]?.toString().trim() || null;

    // 8. Birth Date
    const rawBirthDate = row[mapping["birthDate"]];
    if (rawBirthDate) {
      const parsedDate = parseExcelDate(rawBirthDate);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        normalized.birthDate = parsedDate;
      } else {
        errors.push(`Format Tanggal Lahir tidak valid: "${rawBirthDate}"`);
      }
    } else {
      normalized.birthDate = null;
    }

    // 9. Joined Year
    const rawJoinedYear = row[mapping["joinedYear"]];
    if (rawJoinedYear !== undefined && rawJoinedYear !== null && rawJoinedYear !== "") {
      const parsedYear = parseInt(rawJoinedYear.toString().trim(), 10);
      if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
        errors.push(
          `Tahun bergabung tidak valid: "${rawJoinedYear}" (Gunakan tahun antara 1900-2100)`,
        );
      } else {
        normalized.joinedYear = parsedYear;
      }
    } else {
      normalized.joinedYear = null;
    }

    normalized._isValid = errors.length === 0;
    normalized._errors = errors;
    return { data: normalized, errors };
  }

  // Handle File Input
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
          toast.error("Sheet kosong");
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
      toast.error("Hanya mendukung file Excel (.xlsx) atau CSV");
    }
  }

  // Automatic column mapping logic
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

  // Trigger Validation
  function handleValidate() {
    // Ensure all required fields are mapped
    const missing = TARGET_FIELDS.filter((f) => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      toast.error(`Kolom wajib berikut belum dipetakan: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    // Find duplicates in file
    const seenInFile = new Set<string>();
    const duplicatesInFile = new Set<string>();
    rawRows.forEach((row) => {
      const rawFarmerId = row[mapping["farmerId"]]?.toString().trim();
      if (rawFarmerId) {
        if (seenInFile.has(rawFarmerId)) {
          duplicatesInFile.add(rawFarmerId);
        }
        seenInFile.add(rawFarmerId);
      }
    });

    setIsProcessing(true);
    const results = rawRows.map((row, idx) => validateRow(row, idx, duplicatesInFile).data);
    setValidatedData(results);
    setIsProcessing(false);
    toast.success("Validasi selesai");
  }

  // Download logic (Full vs Errors only)
  async function handleDownload(mode: "all" | "errors") {
    const exportWorkbook = new Excel.Workbook();
    const sheet = exportWorkbook.addWorksheet("Data Petani");

    // Columns configuration
    const cols = [
      { header: "Baris Asal", key: "rowNum", width: 12 },
      { header: "ID Petani", key: "farmerId", width: 20 },
      { header: "Nama Petani", key: "name", width: 25 },
      { header: "Jenis Kelamin", key: "gender", width: 15 },
      { header: "NIK", key: "nik", width: 22 },
      { header: "Lembaga Petani", key: "farmerGroup", width: 25 },
      { header: "Tempat Lahir", key: "birthPlace", width: 20 },
      { header: "Tanggal Lahir", key: "birthDate", width: 18 },
      { header: "Tahun Bergabung", key: "joinedYear", width: 18 },
      { header: "Alamat", key: "address", width: 30 },
      { header: "Status", key: "status", width: 12 },
      { header: "Keterangan / Detail Error", key: "keterangan", width: 45 },
    ];

    sheet.columns = cols;

    // Apply header style
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const targetList = mode === "errors" ? validatedData.filter((d) => !d._isValid) : validatedData;

    targetList.forEach((row) => {
      const birthDateStr = row.birthDate
        ? new Date(row.birthDate).toLocaleDateString("id-ID")
        : row._original.birthDate || "";

      sheet.addRow({
        rowNum: row._rowNum,
        farmerId: row.farmerId || row._original.farmerId || "",
        name: row.name || row._original.name || "",
        gender: row.gender || row._original.gender || "",
        nik: row.nik || row._original.nik || "",
        farmerGroup: row._farmerGroupName || "",
        birthPlace: row.birthPlace || row._original.birthPlace || "",
        birthDate: birthDateStr,
        joinedYear: row.joinedYear || row._original.joinedYear || "",
        address: row.address || row._original.address || "",
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
    link.download = `bulk_upload_petani_${mode === "errors" ? "error_only" : "full"}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Save to DB
  async function handleSave() {
    const validRows = validatedData.filter((d) => d._isValid);
    if (validRows.length === 0) {
      toast.error("Tidak ada data valid yang dapat disimpan");
      return;
    }

    setIsSaving(true);
    // Prepare exact Prisma fields
    const toSave = validRows.map((d) => ({
      farmerGroupId: d.farmerGroupId,
      gender: d.gender,
      name: d.name,
      farmerId: d.farmerId,
      nik: d.nik,
      address: d.address,
      birthPlace: d.birthPlace,
      birthDate: d.birthDate,
      joinedYear: d.joinedYear,
    }));

    const result = await bulkCreateFarmers(toSave);
    setIsSaving(false);

    if (result.success) {
      toast.success(`Berhasil menyimpan ${result.data?.count} data petani`);
      router.push("/admin/master-data/farmers");
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

  const selectedGroup = farmerGroups.find((g) => g.id === selectedGroupId);

  return (
    <div className="space-y-6">
      {/* Step 1: Select Lembaga Petani (Farmer Group) with search */}
      <Card className="p-6">
        <div className="flex flex-col gap-2 max-w-md">
          <Label className="text-base font-semibold">1. Pilih Lembaga Petani</Label>
          <p className="text-xs text-muted-foreground">
            Pilih Lembaga Petani tujuan terlebih dahulu sebelum mengunggah data.
          </p>

          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between h-10 mt-1 font-normal text-left"
                >
                  {selectedGroupId ? (
                    <span>
                      {selectedGroup?.name} {selectedGroup?.code ? `(${selectedGroup.code})` : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Pilih Lembaga Petani...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              }
            />
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cari Lembaga Petani berdasarkan nama atau kode..." />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty>Lembaga Petani tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    {farmerGroups.map((g) => (
                      <CommandItem
                        key={g.id}
                        value={`${g.name} ${g.code || ""}`}
                        onSelect={() => {
                          setSelectedGroupId(g.id);
                          // Daftar ID existing lembaga ini — dipakai menandai
                          // baris duplikat saat validasi berkas.
                          setExistingFarmerIds([]);
                          setLoadingExistingIds(true);
                          const reqId = ++existingIdsRequest.current;
                          getExistingFarmerIds(g.id)
                            .then((ids) => {
                              if (reqId === existingIdsRequest.current) setExistingFarmerIds(ids);
                            })
                            .catch(() => {
                              if (reqId === existingIdsRequest.current)
                                toast.error("Gagal memuat daftar ID petani lembaga ini");
                            })
                            .finally(() => {
                              if (reqId === existingIdsRequest.current)
                                setLoadingExistingIds(false);
                            });
                          setFile(null);
                          setHeaders([]);
                          setRawRows([]);
                          setValidatedData([]);
                          setComboOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedGroupId === g.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span>
                          {g.name} {g.code ? `(${g.code})` : ""}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </Card>

      {/* Step 2: Upload File */}
      <Card className="p-6">
        <div className="flex flex-col gap-2">
          <Label className="text-base font-semibold">2. Pilih File Data Petani</Label>
          <div className="flex items-center gap-4 mt-2">
            <Input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileChange}
              disabled={!selectedGroupId}
              className="max-w-md"
            />
            {file ? (
              <span className="text-sm text-muted-foreground">
                Tipe file terdeteksi: <strong>{file.name.split(".").pop()?.toUpperCase()}</strong> (
                {rawRows.length} baris data)
              </span>
            ) : (
              !selectedGroupId && (
                <span className="text-sm text-destructive font-medium">
                  * Harap pilih Lembaga Petani di atas terlebih dahulu.
                </span>
              )
            )}
          </div>
        </div>
      </Card>

      {/* Step 3: Mapping columns */}
      {headers.length > 0 && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Petakan Kolom Data</h3>
            <p className="text-sm text-muted-foreground">
              Cocokkan kolom dari file unggahan Anda dengan data target sistem.
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
              disabled={isProcessing || rawRows.length === 0 || loadingExistingIds}
              className="h-10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Validasi Data
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Validated Data & Review */}
      {validatedData.length > 0 && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Hasil Validasi & Tinjauan</h3>
              <p className="text-sm text-muted-foreground">
                Tinjau kembali data sebelum menyimpannya ke database.
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

            {/* Filter buttons */}
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

          {/* Action Tools */}
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

          {/* Data Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b-2">
                  <TableHead className="w-[80px]">Baris</TableHead>
                  <TableHead>ID Petani</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-[80px]">L/P</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Lembaga Petani</TableHead>
                  <TableHead>Tahun Bergabung</TableHead>
                  <TableHead>Tanggal Lahir</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[200px]">Keterangan / Detail Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                        {row.farmerId || row._original.farmerId || "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.name || row._original.name || "—"}
                      </TableCell>
                      <TableCell>
                        {row.gender ? (
                          <Badge variant="secondary">{row.gender === "M" ? "L" : "P"}</Badge>
                        ) : (
                          row._original.gender || "—"
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {row.nik || row._original.nik || "—"}
                      </TableCell>
                      <TableCell>{row._farmerGroupName || "—"}</TableCell>
                      <TableCell className="font-mono">
                        {row.joinedYear || row._original.joinedYear || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.birthDate
                          ? new Date(row.birthDate).toLocaleDateString("id-ID")
                          : row._original.birthDate || "—"}
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
