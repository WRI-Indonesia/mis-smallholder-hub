"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getFarmersByGroup, addParticipants } from "@/server/actions/training";
import { toast } from "sonner";
import { Loader2, Search, ArrowRight, ArrowLeft, Upload, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Excel from "exceljs";
import Papa from "papaparse";
import { cn } from "@/lib/utils";

interface Farmer {
  id: string;
  name: string;
  farmerId: string;
  nik: string | null;
  gender: string;
  trainingParticipants?: Array<{
    activity: {
      id: string;
      packageId: string;
      trainingDate: Date | string;
      package: {
        name: string;
      };
    };
  }>;
}

interface ParsedRow {
  farmerId: string;
  name: string;
  status: "VALID" | "WARNING" | "ERROR";
  errorReason: string;
  resolvedId?: string;
  preTestScore?: number | null;
  postTestScore?: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  activityId: string;
  packageId: string;
  farmerGroupId: string;
  currentParticipantFarmerIds: string[];
}

export function AddParticipantsModal({
  open,
  onClose,
  activityId,
  packageId,
  farmerGroupId,
  currentParticipantFarmerIds,
}: Props) {
  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual");
  const [isLoadingFarmers, setIsLoadingFarmers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [allFarmers, setAllFarmers] = useState<Farmer[]>([]);
  const [groupFarmers, setGroupFarmers] = useState<Farmer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function loadFarmers() {
      setIsLoadingFarmers(true);
      try {
        const farmers = await getFarmersByGroup(farmerGroupId);
        setGroupFarmers(farmers);
        // Exclude farmers already in the activity
        const candidates = farmers.filter((f) => !currentParticipantFarmerIds.includes(f.id));
        setAllFarmers(candidates);
      } catch {
        toast.error("Gagal memuat data petani");
      } finally {
        setIsLoadingFarmers(false);
      }
    }

    if (open) {
      loadFarmers();
    }
  }, [open, farmerGroupId, currentParticipantFarmerIds]);

  const filteredCandidates = allFarmers.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.farmerId.toLowerCase().includes(search.toLowerCase());
    const isAlreadySelected = selectedIds.includes(f.id);
    return matchSearch && !isAlreadySelected;
  });

  const selectedFarmers = allFarmers.filter((f) => selectedIds.includes(f.id));

  function selectFarmer(id: string) {
    setSelectedIds((prev) => [...prev, id]);
  }

  function deselectFarmer(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  function selectAll() {
    const idsToSelect = filteredCandidates.map((f) => f.id);
    setSelectedIds((prev) => [...prev, ...idsToSelect]);
  }

  function deselectAll() {
    setSelectedIds([]);
  }

  async function handleSave() {
    if (selectedIds.length === 0) {
      toast.error("Pilih minimal satu petani");
      return;
    }

    setIsSaving(true);
    const formattedParticipants = selectedIds.map((id) => ({ farmerId: id }));
    const result = await addParticipants(activityId, formattedParticipants);
    setIsSaving(false);

    if (result.success) {
      toast.success(`${selectedIds.length} peserta berhasil ditambahkan`);
      onClose();
      router.refresh();
    } else {
      toast.error(result.error || "Gagal menambahkan peserta");
    }
  }

  // File upload handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileType = selectedFile.name.split(".").pop()?.toLowerCase();
    if (fileType === "csv") {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            processParsedData(results.meta.fields, results.data as Record<string, unknown>[]);
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

        const rows: Record<string, unknown>[] = [];
        let sheetHeaders: string[] = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          const values = Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values);
          if (rowNumber === 1) {
            sheetHeaders = values.map((v) => (v == null ? "" : String(v).trim()));
          } else {
            const rowData: Record<string, unknown> = {};
            sheetHeaders.forEach((header, index) => {
              rowData[header] = values[index];
            });
            rows.push(rowData);
          }
        });

        processParsedData(sheetHeaders, rows);
      } catch (err) {
        console.error(err);
        toast.error("Gagal membaca file Excel (.xlsx)");
      }
    } else {
      toast.error("Hanya mendukung file Excel (.xlsx) atau CSV");
    }
  }

  // Common processing and validation logic for parsed rows
  function processParsedData(detectedHeaders: string[], dataRows: Record<string, unknown>[]) {
    const idKey = detectedHeaders.find((h) =>
      ["id petani", "farmer id", "id", "farmer_id", "kode petani", "kode_petani", "farmerid"].includes(h.toLowerCase().trim())
    ) || detectedHeaders[0];

    const preTestKey = detectedHeaders.find((h) =>
      ["nilai pre-test", "nilai pre test", "pre-test score", "pre-test", "pretest", "pretestscore", "nilai_pre_test"].includes(h.toLowerCase().trim())
    );

    const postTestKey = detectedHeaders.find((h) =>
      ["nilai post-test", "nilai post test", "post-test score", "post-test", "posttest", "posttestscore", "nilai_post_test"].includes(h.toLowerCase().trim())
    );

    if (!idKey) {
      toast.error("Kolom ID Petani tidak ditemukan di file");
      return;
    }

    const formatDateWarning = (dateVal: Date | string) => {
      const date = new Date(dateVal);
      if (isNaN(date.getTime())) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const month = months[date.getMonth()];
      return `${day} - ${month} - ${date.getFullYear()}`;
    };

    const processed: ParsedRow[] = [];
    const seen = new Set<string>();

    dataRows.forEach((row) => {
      const rawId = row[idKey] != null ? String(row[idKey]).trim() : "";
      if (!rawId) return;

      if (seen.has(rawId.toLowerCase())) return;
      seen.add(rawId.toLowerCase());

      const matchedGroupFarmer = groupFarmers.find(
        (f) => f.farmerId.toLowerCase() === rawId.toLowerCase()
      );

      let status: "VALID" | "WARNING" | "ERROR" = "VALID";
      let errorReason = "";
      let resolvedId = "";
      let name = "—";
      let preTestScore: number | null = null;
      let postTestScore: number | null = null;

      if (preTestKey) {
        const rawVal = row[preTestKey];
        if (rawVal !== undefined && rawVal !== null && rawVal.toString().trim() !== "") {
          const parsedVal = parseInt(rawVal.toString().trim(), 10);
          if (isNaN(parsedVal) || parsedVal < 0 || parsedVal > 100) {
            status = "ERROR";
            errorReason = "Nilai Pre-Test harus berupa angka 0-100";
          } else {
            preTestScore = parsedVal;
          }
        }
      }

      if (postTestKey) {
        const rawVal = row[postTestKey];
        if (rawVal !== undefined && rawVal !== null && rawVal.toString().trim() !== "") {
          const parsedVal = parseInt(rawVal.toString().trim(), 10);
          if (isNaN(parsedVal) || parsedVal < 0 || parsedVal > 100) {
            status = "ERROR";
            errorReason = (errorReason ? errorReason + "; " : "") + "Nilai Post-Test harus berupa angka 0-100";
          } else {
            postTestScore = parsedVal;
          }
        }
      }

      if (!matchedGroupFarmer) {
        status = "ERROR";
        errorReason = (errorReason ? errorReason + "; " : "") + "ID Petani tidak ditemukan di kelompok tani ini";
      } else {
        name = matchedGroupFarmer.name;
        resolvedId = matchedGroupFarmer.id;
        if (currentParticipantFarmerIds.includes(matchedGroupFarmer.id)) {
          status = "ERROR";
          errorReason = (errorReason ? errorReason + "; " : "") + "Petani sudah terdaftar sebagai peserta";
        } else {
          // Check if already attended the same package in a different activity
          const previousParticipation = matchedGroupFarmer.trainingParticipants?.find(
            (p) => p.activity.packageId === packageId && p.activity.id !== activityId
          );
          if (previousParticipation) {
            status = "WARNING";
            const formattedPrevDate = formatDateWarning(previousParticipation.activity.trainingDate);
            errorReason = (errorReason ? errorReason + "; " : "") + `Sudah pernah mengikuti training ${previousParticipation.activity.package.name} di tanggal : ${formattedPrevDate}`;
          }
        }
      }

      processed.push({
        farmerId: rawId,
        name,
        status,
        errorReason,
        resolvedId: resolvedId || undefined,
        preTestScore,
        postTestScore,
      });
    });

    setParsedRows(processed);
    toast.success(`Berhasil memproses ${processed.length} data dari file`);
  }

  // Save parsed list
  async function handleSaveUpload() {
    const validParticipants = parsedRows
      .filter((r) => (r.status === "VALID" || r.status === "WARNING") && r.resolvedId)
      .map((r) => ({
        farmerId: r.resolvedId!,
        preTestScore: r.preTestScore,
        postTestScore: r.postTestScore,
      }));

    if (validParticipants.length === 0) {
      toast.error("Tidak ada peserta valid untuk ditambahkan");
      return;
    }

    setIsSaving(true);
    const result = await addParticipants(activityId, validParticipants);
    setIsSaving(false);

    if (result.success) {
      toast.success(`${validParticipants.length} peserta berhasil ditambahkan`);
      onClose();
      router.refresh();
    } else {
      toast.error(result.error || "Gagal menambahkan peserta");
    }
  }

  // Template download helper
  async function downloadTemplate() {
    const exportWorkbook = new Excel.Workbook();
    const sheet = exportWorkbook.addWorksheet("Template Peserta");
    sheet.columns = [
      { header: "ID Petani", key: "farmerId", width: 25 },
      { header: "Nilai Pre-Test", key: "preTestScore", width: 15 },
      { header: "Nilai Post-Test", key: "postTestScore", width: 15 },
    ];
    sheet.addRow({ farmerId: "APSS.14.01.10.2012.0001", preTestScore: 80, postTestScore: 90 });

    const buffer = await exportWorkbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_peserta_pelatihan.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[850px] h-[620px] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>Tambah Peserta Pelatihan</DialogTitle>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex border-b mb-3">
          <button
            type="button"
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
              activeTab === "manual"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("manual")}
          >
            Pilih Manual
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
              activeTab === "upload"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("upload")}
          >
            Upload List Peserta
          </button>
        </div>

        {activeTab === "manual" ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-9 gap-4 my-1 overflow-hidden">
            {/* Panel Kiri: Kandidat */}
            <div className="md:col-span-4 flex flex-col border rounded-md p-3 overflow-hidden">
              <h3 className="font-semibold text-sm mb-2">Petani Tersedia ({filteredCandidates.length})</h3>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama / ID..."
                  className="pl-8 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {isLoadingFarmers ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-12">Tidak ada kandidat petani</p>
                ) : (
                  filteredCandidates.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => selectFarmer(f.id)}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer border text-xs"
                    >
                      <div>
                        <p className="font-medium">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{f.farmerId}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={filteredCandidates.length === 0}
                onClick={selectAll}
                className="mt-2 text-xs"
              >
                Pilih Semua Halaman Ini
              </Button>
            </div>

            {/* Panel Tengah */}
            <div className="hidden md:flex md:col-span-1 flex-col justify-center items-center gap-4">
              <Badge variant="secondary" className="px-2 py-1">
                {selectedIds.length} terpilih
              </Badge>
            </div>

            {/* Panel Kanan */}
            <div className="md:col-span-4 flex flex-col border rounded-md p-3 overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm">Petani Terpilih ({selectedFarmers.length})</h3>
                {selectedFarmers.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2">
                    Hapus Semua
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {selectedFarmers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-12">Belum ada petani dipilih</p>
                ) : (
                  selectedFarmers.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => deselectFarmer(f.id)}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer border text-xs bg-primary/5 border-primary/20"
                    >
                      <div>
                        <p className="font-medium">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{f.farmerId}</p>
                      </div>
                      <ArrowLeft className="h-3.5 w-3.5 text-primary" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4 overflow-hidden my-1">
            {/* Upload Zone */}
            <div className="border border-dashed rounded-lg p-5 flex flex-col items-center justify-center bg-muted/20 shrink-0">
              <Upload className="h-8 w-8 text-muted-foreground mb-1.5" />
              <p className="text-xs font-semibold mb-1">Unggah List Peserta Pelatihan</p>
              <p className="text-[10px] text-muted-foreground mb-3">Mendukung file Excel (.xlsx) atau CSV (.csv)</p>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileUpload}
                  className="max-w-[220px] h-8 text-xs cursor-pointer file:text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="h-8 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Template Excel
                </Button>
              </div>
            </div>

            {/* Validation Table & Summary */}
            {parsedRows.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2">
                <div className="flex items-center justify-between shrink-0">
                  <h4 className="text-xs font-semibold">Tinjauan Data ({parsedRows.length} baris)</h4>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                      {parsedRows.filter((r) => r.status === "VALID").length} Valid
                    </span>
                    <span className="text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                      {parsedRows.filter((r) => r.status === "WARNING").length} Warning
                    </span>
                    <span className="text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full font-medium">
                      {parsedRows.filter((r) => r.status === "ERROR").length} Error
                    </span>
                  </div>
                </div>

                <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-muted/60 border-b sticky top-0">
                          <th className="p-2 font-semibold">ID Petani</th>
                          <th className="p-2 font-semibold">Nama</th>
                          <th className="p-2 font-semibold">Pre-Test</th>
                          <th className="p-2 font-semibold">Post-Test</th>
                          <th className="p-2 font-semibold">Status</th>
                          <th className="p-2 font-semibold">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedRows.map((r, idx) => (
                          <tr
                            key={idx}
                            className={cn(
                              r.status === "ERROR" && "bg-destructive/5",
                              r.status === "WARNING" && "bg-amber-500/5"
                            )}
                          >
                            <td className="p-2 font-mono">{r.farmerId}</td>
                            <td className="p-2">{r.name}</td>
                            <td className="p-2">{r.preTestScore ?? "—"}</td>
                            <td className="p-2">{r.postTestScore ?? "—"}</td>
                            <td className="p-2">
                              <Badge
                                variant={r.status === "VALID" ? "default" : r.status === "WARNING" ? "secondary" : "destructive"}
                                className={cn(
                                  "text-[9px] py-0 px-1",
                                  r.status === "WARNING" && "bg-amber-500 text-white hover:bg-amber-600 border-none"
                                )}
                              >
                                {r.status}
                              </Badge>
                            </td>
                            <td
                              className={cn(
                                "p-2 font-medium",
                                r.status === "ERROR" ? "text-destructive" : r.status === "WARNING" ? "text-amber-600" : ""
                              )}
                            >
                              {r.errorReason || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-2 shrink-0 border-t mt-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          {activeTab === "manual" ? (
            <Button onClick={handleSave} disabled={selectedIds.length === 0 || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tambahkan Peserta
            </Button>
          ) : (
            <Button
              onClick={handleSaveUpload}
              disabled={
                parsedRows.filter((r) => r.status === "VALID" || r.status === "WARNING").length === 0 ||
                isSaving
              }
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tambahkan {parsedRows.filter((r) => r.status === "VALID" || r.status === "WARNING").length} Peserta
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
