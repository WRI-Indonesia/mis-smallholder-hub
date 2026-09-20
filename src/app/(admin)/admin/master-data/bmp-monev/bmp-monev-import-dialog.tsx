"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AlertCircle, Check, CheckCircle2, ChevronsUpDown, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { readXlsxWorkbookRaw, type RawSheetRow } from "@/lib/excel-sheet-reader";
import { exportToExcel } from "@/lib/xlsx";
import {
  formatScore,
  parseBmpImportRows,
  resolveBmpImportRows,
  type BmpImportParseResult,
  type BmpImportResolvedRow,
  formatUtcDate,
} from "@/lib/bmp-assessment";
import { BmpCategoryBadge } from "@/components/shared/bmp-category-badge";
import { getBmpImportRefs, importBmpAssessments, type BmpImportSummary } from "@/server/actions/bmp-assessment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BmpSurveyImportPanel } from "./bmp-survey-import-panel";

/**
 * Import Excel format rekap Monev BMP (#344): satu berkas/sheet = satu Lembaga
 * (ID Petani hanya unik per Lembaga, jadi Lembaga dipilih — bukan ditebak dari
 * prefix). Alur: pilih Lembaga → pilih berkas & sheet → pratinjau (resolusi
 * petani/lahan/tahun di klien dari referensi server) → simpan (server
 * meresolusi ulang, upsert per petani-tahun).
 */
interface Props {
  open: boolean;
  onClose: () => void;
  farmerGroups: { id: string; name: string }[];
}

export function BmpMonevImportDialog({ open, onClose, farmerGroups }: Props) {
  const router = useRouter();
  const [farmerGroupId, setFarmerGroupId] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [assessor, setAssessor] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<{ name: string; rows: RawSheetRow[] }[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [parsed, setParsed] = useState<BmpImportParseResult | null>(null);
  const [resolved, setResolved] = useState<BmpImportResolvedRow[] | null>(null);
  const [reading, setReading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<BmpImportSummary | null>(null);

  const selectedGroup = farmerGroups.find((g) => g.id === farmerGroupId);
  const valid = useMemo(() => (resolved ?? []).filter((r) => r.status !== "UNKNOWN_FARMER"), [resolved]);
  const unknown = (resolved?.length ?? 0) - valid.length;
  const withWarnings = useMemo(() => valid.filter((r) => r.warnings.length > 0).length, [valid]);

  function reset() {
    setFileName(null);
    setSheets([]);
    setSheetName("");
    setParsed(null);
    setResolved(null);
    setResult(null);
  }

  function close() {
    reset();
    setFarmerGroupId("");
    setAssessor("");
    onClose();
  }

  function parseSheet(list: { name: string; rows: RawSheetRow[] }[], name: string) {
    const sheet = list.find((s) => s.name === name);
    if (!sheet) return;
    const out = parseBmpImportRows(sheet.rows);
    setParsed(out);
    setResolved(null);
    setResult(null);
    if (out.rows.length === 0) {
      toast.error(
        out.headerRowNumber === 0
          ? "Header tahun / kolom Skor tidak ditemukan di sheet ini"
          : "Tidak ada baris ber-ID Petani dengan skor di sheet ini",
      );
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    reset();
    setFileName(file.name);
    setReading(true);
    try {
      const list = await readXlsxWorkbookRaw(file);
      setSheets(list);
      // Sheet pertama yang menghasilkan baris; kalau tak ada, sheet pertama
      // (pengguna bisa mengganti lewat pilihan sheet).
      const first = list.find((s) => parseBmpImportRows(s.rows).rows.length > 0) ?? list[0];
      setSheetName(first.name);
      parseSheet(list, first.name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membaca berkas");
    } finally {
      setReading(false);
    }
  }

  async function handleValidate() {
    if (!farmerGroupId) {
      toast.error("Pilih Lembaga Petani dulu");
      return;
    }
    if (!parsed || parsed.rows.length === 0) return;
    setValidating(true);
    try {
      const refs = await getBmpImportRefs(farmerGroupId);
      const rows = resolveBmpImportRows(parsed.rows, refs);
      setResolved(rows);
      const ok = rows.filter((r) => r.status !== "UNKNOWN_FARMER").length;
      if (ok === 0) toast.error("Tidak ada ID Petani yang dikenal di Lembaga ini — periksa pilihan Lembaga");
      else toast.success(`${formatNumber(ok)} baris siap disimpan${rows.length - ok ? `, ${formatNumber(rows.length - ok)} petani tak dikenal` : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memvalidasi");
    } finally {
      setValidating(false);
    }
  }

  async function handleSave() {
    if (valid.length === 0 || !farmerGroupId) return;
    setSaving(true);
    try {
      const res = await importBmpAssessments({
        farmerGroupId,
        assessor: assessor || null,
        rows: valid.map((r) => ({
          rowNumber: r.rowNumber,
          farmerCode: r.farmerCode,
          parcelId: r.parcelUid ? r.parcelId : null,
          surveyYear: r.surveyYear,
          surveyDate: r.surveyDateToSave,
          score: r.score,
        })),
      });
      if (!res.success || !res.data) {
        toast.error(res.success ? "Gagal menyimpan" : res.error);
        return;
      }
      setResult(res.data);
      setResolved(null);
      toast.success(`Monev BMP tersimpan: ${formatNumber(res.data.created)} baru · ${formatNumber(res.data.updated)} diperbarui`);
      router.refresh();
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Gagal menyimpan — periksa koneksi lalu coba lagi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadTemplate() {
    // Template satu tahun: kolom identitas + blok tahun berjalan. Header dua
    // baris format rekap tidak bisa ditulis exportToExcel (satu header), jadi
    // tahun ditaruh sebagai KOLOM sendiri berjudul "2026" tepat sebelum
    // "Tgl Survey" / "Skor" — parser membaca blok tahun dari sel tahun di
    // baris header (satu baris pun dikenali, lihat parseBmpImportRows).
    const year = new Date().getFullYear();
    await exportToExcel({
      filename: "Template_Import_Monev_BMP",
      sheetName: "Data",
      columns: [
        { header: "No", key: "no", width: 6 },
        { header: "Nama Petani", key: "name", width: 28 },
        { header: "Id Petani", key: "farmerCode", width: 30 },
        { header: "Lokasi Kebun", key: "parcelId", width: 30 },
        { header: String(year), key: "year", width: 14 },
        { header: "Tgl Survey", key: "date", width: 14 },
        { header: "Skor", key: "score", width: 8 },
      ],
      data: [
        { no: 1, name: "Nama sesuai MIS", farmerCode: "SKPE.14.06.09.2001.0022", parcelId: "SKPE.0022.A.14.06.09.2001", year: "", date: `26 Juni ${year}`, score: 1.83 },
      ],
    });
  }

  const summaryCreate = valid.filter((r) => r.status === "CREATE").length;
  const summaryUpdate = valid.filter((r) => r.status === "UPDATE").length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Excel Monev BMP</DialogTitle>
        </DialogHeader>

        {/* `min-w-0`: DialogContent adalah grid; tanpa ini anak grid ber-min-width
            auto ikut selebar tabel pratinjau dan menjebol lebar dialog. */}
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 flex flex-col">
              <Label>Lembaga Petani *</Label>
              <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                <PopoverTrigger
                  render={
                    <Button variant="outline" role="combobox" className="w-full justify-between h-10 font-normal text-left" disabled={saving}>
                      <span className={cn("truncate", !farmerGroupId && "text-muted-foreground")}>
                        {selectedGroup?.name ?? "Pilih Lembaga Petani"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari lembaga petani..." />
                    <CommandList className="max-h-[250px]">
                      <CommandEmpty>Lembaga Petani tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {farmerGroups.map((g) => (
                          <CommandItem
                            key={g.id}
                            value={g.name}
                            onSelect={() => {
                              setFarmerGroupId(g.id);
                              setResolved(null);
                              setResult(null);
                              setGroupOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", farmerGroupId === g.id ? "opacity-100" : "opacity-0")} />
                            {g.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="import-assessor">Penilai / Fasilitator (opsional, berlaku semua baris)</Label>
              <Input id="import-assessor" value={assessor} onChange={(e) => setAssessor(e.target.value)} maxLength={120} placeholder="Nama penilai" disabled={saving} />
            </div>
          </div>

          {/* Dua sumber (#344 rekap skor, #346 form survei per petani) — satu Lembaga per putaran untuk keduanya. */}
          <Tabs defaultValue="rekap">
            <TabsList>
              <TabsTrigger value="rekap">Rekap skor (satu sheet)</TabsTrigger>
              <TabsTrigger value="survei">Form survei per petani (banyak berkas)</TabsTrigger>
            </TabsList>
            <TabsContent value="survei" className="pt-3">
              {/* key = Lembaga: ganti Lembaga → panel di-remount, daftar petani & pratinjau lama tidak terbawa (temuan review). */}
              <BmpSurveyImportPanel key={farmerGroupId} farmerGroupId={farmerGroupId} farmerGroupName={selectedGroup?.name ?? null} assessor={assessor} />
            </TabsContent>
            <TabsContent value="rekap" className="pt-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="import-file">Berkas Excel rekap (.xlsx) *</Label>
            <Input id="import-file" type="file" accept=".xlsx" onChange={handleFileChange} disabled={reading || saving} className="max-w-md" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              Format rekap: kolom <span className="font-mono">Id Petani</span>, <span className="font-mono">Lokasi Kebun</span> (opsional), lalu blok per tahun{" "}
              <span className="font-mono">Tgl Survey · Skor</span>. Baris tanpa Id Petani dilewati; kolom Kriteria/Blok/Luas diabaikan.
              Petani yang sudah punya skor tahun itu akan <strong>diperbarui</strong>, bukan digandakan.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="text-xs h-8 gap-1.5">
              <Download className="h-3.5 w-3.5" /> Unduh Template
            </Button>
          </div>

          {reading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Membaca berkas…
            </p>
          )}

          {parsed && (
            <div className="rounded-md border p-3 space-y-3 bg-card/50">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">{fileName}</span>
                {sheets.length > 1 && (
                  <Select
                    value={sheetName}
                    onValueChange={(v) => {
                      if (!v) return;
                      setSheetName(v);
                      parseSheet(sheets, v);
                    }}
                  >
                    <SelectTrigger className="w-[240px] h-8 text-xs">
                      <SelectValue>{(v: string) => `Sheet: ${v}`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sheets.map((s) => (
                        <SelectItem key={s.name} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatNumber(parsed.rows.length)} penilaian terbaca · tahun {parsed.years.join(", ") || "—"}
                  {parsed.skipped.length > 0 && ` · ${formatNumber(parsed.skipped.length)} baris dilewati`}
                </span>
                <div className="ml-auto">
                  <Button size="sm" onClick={handleValidate} disabled={validating || saving || parsed.rows.length === 0 || !farmerGroupId}>
                    {validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Validasi ke {selectedGroup?.name ?? "Lembaga"}
                  </Button>
                </div>
              </div>
              {parsed.skipped.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Baris dilewati ({formatNumber(parsed.skipped.length)})
                  </summary>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5 max-h-32 overflow-auto">
                    {parsed.skipped.map((s, i) => (
                      <li key={i}>
                        Baris {s.rowNumber}: {s.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {resolved && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Pratinjau — {formatNumber(summaryCreate)} baru · {formatNumber(summaryUpdate)} diperbarui
                  {unknown > 0 && <span className="text-destructive normal-case font-normal"> · {formatNumber(unknown)} petani tak dikenal (dilewati)</span>}
                  {withWarnings > 0 && <span className="text-amber-600 normal-case font-normal"> · {formatNumber(withWarnings)} dengan peringatan</span>}
                </h3>
                <Button size="sm" onClick={handleSave} disabled={saving || valid.length === 0}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Simpan {formatNumber(valid.length)} penilaian
                </Button>
              </div>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-14">Baris</TableHead>
                      <TableHead>ID Petani</TableHead>
                      <TableHead>Petani (MIS)</TableHead>
                      <TableHead className="text-right">Tahun</TableHead>
                      <TableHead>Tgl Survei</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Lahan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolved.map((r, i) => (
                      <TableRow key={`${r.rowNumber}-${r.surveyYear}-${i}`} className={r.status === "UNKNOWN_FARMER" ? "bg-destructive/5" : r.warnings.length ? "bg-amber-50/60 dark:bg-amber-950/20" : undefined}>
                        <TableCell className="text-muted-foreground tabular-nums">{r.rowNumber}</TableCell>
                        <TableCell className="font-mono text-xs">{r.farmerCode}</TableCell>
                        <TableCell className="text-xs">
                          {r.dbFarmerName ?? <span className="text-muted-foreground">{r.farmerName ?? "—"}</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.surveyYear}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatUtcDate(r.surveyDateToSave)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatScore(r.score)}</TableCell>
                        <TableCell>
                          <BmpCategoryBadge score={r.score} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.parcelUid ? r.parcelId : <span className="font-sans text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-xs whitespace-normal min-w-[240px]">
                          {r.status === "UNKNOWN_FARMER" ? (
                            <span className="text-destructive">ID Petani tidak dikenal di Lembaga ini</span>
                          ) : (
                            <div className="space-y-0.5">
                              <Badge variant={r.status === "UPDATE" ? "secondary" : "default"}>{r.status === "UPDATE" ? "Perbarui" : "Baru"}</Badge>
                              {r.warnings.map((w, j) => (
                                <p key={j} className="text-amber-700 dark:text-amber-400">
                                  {w}
                                </p>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-md border p-3 space-y-1 text-sm">
              <p className="font-medium">Hasil simpan</p>
              <p>
                {formatNumber(result.created)} penilaian baru · {formatNumber(result.updated)} diperbarui
                {result.rejected.length > 0 && <span className="text-destructive"> · {formatNumber(result.rejected.length)} ditolak server</span>}
              </p>
              {result.rejected.length > 0 && (
                <ul className="text-xs text-destructive list-disc pl-5 space-y-0.5 max-h-40 overflow-auto">
                  {result.rejected.map((x, i) => (
                    <li key={i}>
                      Baris {x.rowNumber} <span className="font-mono">{x.farmerCode}</span> — {x.reason}
                    </li>
                  ))}
                </ul>
              )}
              <div className="pt-2 flex justify-end">
                <Button size="sm" variant="outline" onClick={close}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
