"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Check, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { readXlsxWorkbookRaw } from "@/lib/excel-sheet-reader";
import { BMP_SCORE_MAX, formatScore, formatUtcDate } from "@/lib/bmp-assessment";
import { SURVEY_DATE_FUTURE_TOLERANCE_MS } from "@/validations/bmp-assessment.schema";
import { bmpWeightedSlotKey, matchFarmerName, parseBmpSurveyForm, recomputeBmpScore, type BmpIndicatorRef, type BmpNameMatchConfidence, type BmpSurveyFormParsed } from "@/lib/bmp-survey-form";
import { BmpCategoryBadge } from "@/components/shared/bmp-category-badge";
import { getBmpImportRefs, type BmpImportFarmerRef } from "@/server/actions/bmp-assessment";
import { getBmpIndicators, importBmpSurveyForms, type BmpSurveyImportSummary } from "@/server/actions/bmp-assessment-detail";

/**
 * Tab "Form survei per petani" (#346): banyak berkas `.xlsx` sekaligus untuk
 * SATU Lembaga. Identitas = nama berkas (header form tak dipercaya); yang
 * ragu/tak ditemukan/konflik dipilih dari dropdown petani Lembaga sebelum simpan.
 */
interface Props {
  farmerGroupId: string;
  farmerGroupName: string | null;
  assessor: string;
  disabled?: boolean;
}

interface FormRow {
  parsed: BmpSurveyFormParsed;
  farmerId: string | null;
  confidence: BmpNameMatchConfidence;
  headerConflict: boolean;
  surveyYear: number;
  /** Skor yang akan disimpan = hitung ulang sistem; total form hanya bila tak ada rincian. */
  score: number | null;
  /** Total raport di form (bobot template) — pembanding saja. */
  formScore: number | null;
  recomputed: number | null;
  filledWeighted: number;
  status: "CREATE" | "UPDATE";
  outOfRange: number;
}

const MAX_FILES = 300;
const confidenceLabel: Record<BmpNameMatchConfidence, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  EXACT: { label: "Yakin", variant: "default" },
  FUZZY: { label: "Ragu", variant: "secondary" },
  AMBIGUOUS: { label: "Ganda", variant: "outline" },
  NONE: { label: "Tak ditemukan", variant: "destructive" },
};

/**
 * Tahun dari nama berkas bila Periode kosong (80/192 berkas Rohul): utamakan
 * token di antara pemisah " - " (`… - 2026 - Nama.xlsx`), kalau tidak ada pakai
 * token 20xx TERAKHIR — ID petani seperti `SKPE.14.06.09.2001.0022` mendahului
 * tahun dan token pertamanya bukan tahun survei (temuan review #347).
 */
function yearFromFileName(fileName: string): number | null {
  const sep = fileName.match(/\s-\s(20\d{2})\s-\s/);
  if (sep) return Number(sep[1]);
  const all = [...fileName.matchAll(/\b(20\d{2})\b/g)];
  return all.length ? Number(all[all.length - 1][1]) : null;
}

export function BmpSurveyImportPanel({ farmerGroupId, farmerGroupName, assessor, disabled }: Props) {
  const router = useRouter();
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [refs, setRefs] = useState<BmpImportFarmerRef[] | null>(null);
  const [indicators, setIndicators] = useState<BmpIndicatorRef[] | null>(null);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [unreadable, setUnreadable] = useState<{ fileName: string; reason: string }[]>([]);
  const [result, setResult] = useState<BmpSurveyImportSummary | null>(null);

  // Kriteria alternatif (petani ATAU pekerja) dihitung satu slot: 15, bukan 16.
  const weightedIndividuCount = useMemo(() => new Set((indicators ?? []).filter((i) => i.level === "INDIVIDU" && i.inFinalScore).map(bmpWeightedSlotKey)).size, [indicators]);
  const farmerOptions = useMemo(() => (refs ?? []).map((r) => ({ farmerDbId: r.farmerDbId, name: r.farmerName, farmerCode: r.farmerCode, assessedYears: r.assessedYears })), [refs]);
  const usedTwice = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows) if (r.farmerId) seen.set(`${r.farmerId}:${r.surveyYear}`, (seen.get(`${r.farmerId}:${r.surveyYear}`) ?? 0) + 1);
    return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [rows]);
  const ready = rows.filter((r) => r.farmerId && r.score != null && !usedTwice.has(`${r.farmerId}:${r.surveyYear}`));

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (!farmerGroupId) {
      toast.error("Pilih Lembaga Petani dulu");
      return;
    }
    if (files.length > MAX_FILES) {
      toast.error(`Maksimal ${MAX_FILES} berkas per putaran`);
      return;
    }
    setReading(true);
    setResult(null);
    try {
      const [refList, indList] = await Promise.all([refs ?? getBmpImportRefs(farmerGroupId), indicators ?? getBmpIndicators()]);
      setRefs(refList);
      setIndicators(indList);
      const candidates = refList.map((r) => ({ farmerDbId: r.farmerDbId, name: r.farmerName, farmerCode: r.farmerCode }));
      const out: FormRow[] = [];
      // exceljs di browser ±3–5 dtk per form (sheet berformat 1.000 baris) —
      // dibaca beberapa sekaligus dengan progres agar 30 berkas tidak terasa macet.
      setProgress({ done: 0, total: files.length });
      const parsedAll = new Array<{ file: File; sheets: Awaited<ReturnType<typeof readXlsxWorkbookRaw>> } | null>(files.length).fill(null);
      // Berkas yang gagal dibaca (bukan .xlsx, rusak, tanpa sheet) dicatat per nama —
      // tidak menggugurkan berkas lain yang sudah terbaca (temuan review #347).
      const unreadable: { fileName: string; reason: string }[] = [];
      let next = 0;
      let done = 0;
      const worker = async () => {
        while (next < files.length) {
          const i = next++;
          try {
            parsedAll[i] = { file: files[i], sheets: await readXlsxWorkbookRaw(files[i]) };
          } catch (err) {
            unreadable.push({ fileName: files[i].name, reason: err instanceof Error ? err.message : "Gagal membaca berkas" });
          }
          done++;
          setProgress({ done, total: files.length });
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
      setUnreadable((prev) => [...prev, ...unreadable]);
      for (const entry of parsedAll) {
        if (!entry) continue;
        const { file, sheets } = entry;
        const parsed = parseBmpSurveyForm(file.name, sheets, indList);
        // Periode di masa depan (salah ketik tahun) dikosongkan + peringatan — sama
        // dengan jalur rekap; kalau dibiarkan, server menolak SELURUH batch.
        if (parsed.surveyDate && parsed.surveyDate.getTime() > Date.now() + SURVEY_DATE_FUTURE_TOLERANCE_MS) {
          parsed.warnings.push(`Periode ${formatUtcDate(parsed.surveyDate)} di masa depan — tanggal dikosongkan`);
          parsed.surveyDate = null;
        }
        const surveyYear = parsed.surveyDate?.getUTCFullYear() ?? yearFromFileName(file.name) ?? new Date().getUTCFullYear();
        // Nama kembar: prioritaskan petani yang sudah punya skor tahun itu dari rekap (#344).
        const preferIds = new Set(refList.filter((r) => r.assessedYears.includes(surveyYear)).map((r) => r.farmerDbId));
        const match = matchFarmerName(parsed.fileFarmerName, candidates, { preferIds });
        const headerConflict = Boolean(parsed.fileFarmerName && parsed.headerFarmerName && parsed.warnings.some((w) => w.startsWith("Nama di header")));
        const rc = recomputeBmpScore(indList, new Map(parsed.individu.map((x) => [x.code, x.score])), new Map(parsed.lembaga.map((x) => [x.code, x.score])));
        const ref = refList.find((r) => r.farmerDbId === match.farmerDbId);
        out.push({
          parsed,
          farmerId: match.farmerDbId,
          confidence: match.confidence,
          headerConflict,
          surveyYear,
          score: parsed.individu.length + parsed.lembaga.length > 0 ? rc.total : parsed.totalScore,
          formScore: parsed.totalScore,
          recomputed: parsed.individu.length + parsed.lembaga.length > 0 ? rc.total : null,
          filledWeighted: new Set(
            parsed.individu
              .map((x) => ({ x, ind: indList.find((i) => i.id === x.indicatorId) }))
              .filter(({ x, ind }) => x.score != null && ind?.inFinalScore)
              .map(({ ind }) => bmpWeightedSlotKey(ind!)),
          ).size,
          status: ref?.assessedYears.includes(surveyYear) ? "UPDATE" : "CREATE",
          outOfRange: [...parsed.individu, ...parsed.lembaga].filter((x) => x.score != null && (x.score < 0 || x.score > 3)).length,
        });
      }
      out.sort((a, b) => (a.parsed.fileFarmerName ?? "").localeCompare(b.parsed.fileFarmerName ?? ""));
      setRows((prev) => [...prev, ...out]);
      const sure = out.filter((r) => r.confidence === "EXACT").length;
      toast.success(`${formatNumber(out.length)} form terbaca · ${formatNumber(sure)} cocok yakin · ${formatNumber(out.length - sure)} perlu diperiksa${unreadable.length ? ` · ${formatNumber(unreadable.length)} berkas gagal dibaca` : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membaca berkas");
    } finally {
      setReading(false);
      setProgress(null);
    }
  }

  function setFarmer(idx: number, farmerId: string) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const ref = farmerOptions.find((f) => f.farmerDbId === farmerId);
        return { ...r, farmerId: farmerId || null, confidence: farmerId ? "EXACT" : "NONE", status: ref?.assessedYears.includes(r.surveyYear) ? "UPDATE" : "CREATE" };
      }),
    );
  }

  async function handleSave() {
    if (ready.length === 0) return;
    setSaving(true);
    try {
      const res = await importBmpSurveyForms({
        farmerGroupId,
        assessor: assessor || null,
        forms: ready.map((r) => ({
          fileName: r.parsed.fileName,
          farmerId: r.farmerId!,
          surveyYear: r.surveyYear,
          surveyDate: r.parsed.surveyDate && r.parsed.surveyDate.getUTCFullYear() === r.surveyYear ? r.parsed.surveyDate : null,
          score: r.score!,
          individu: r.parsed.individu.map((x) => ({ indicatorId: x.indicatorId, score: x.score, notes: x.notes })),
          lembaga: r.parsed.lembaga.map((x) => ({ indicatorId: x.indicatorId, score: x.score, notes: x.notes })),
        })),
      });
      if (!res.success || !res.data) {
        toast.error(res.success ? "Gagal menyimpan" : res.error);
        return;
      }
      setResult(res.data);
      setRows([]);
      setUnreadable([]);
      setRefs(null);
      toast.success(`Form tersimpan: ${formatNumber(res.data.assessmentsCreated)} penilaian baru · ${formatNumber(res.data.assessmentsUpdated)} diperbarui · ${formatNumber(res.data.detailRows)} skor indikator`);
      router.refresh();
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Gagal menyimpan — periksa koneksi lalu coba lagi");
    } finally {
      setSaving(false);
    }
  }

  const needReview = rows.filter((r) => r.confidence !== "EXACT" || r.headerConflict).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="survey-files">Berkas form survei (.xlsx, boleh banyak sekaligus) — untuk {farmerGroupName ?? "Lembaga terpilih"} *</Label>
          <Input id="survey-files" type="file" accept=".xlsx" multiple onChange={handleFiles} disabled={disabled || reading || saving || !farmerGroupId} />
        </div>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => { setRows([]); setUnreadable([]); setResult(null); }} disabled={saving}>
            Kosongkan daftar
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Tiap berkas = satu petani (sheet Gabungan, Survey Lembaga, Survey Individu). Nama petani diambil dari <strong>nama berkas</strong> — header di dalam
        form sering tertinggal dari petani lain. Yang berstatus Ragu/Ganda/Tak ditemukan pilih petaninya di dropdown; skor akhir = <strong>hitung ulang</strong> dari
        rincian (total raport form hanya pembanding — rumus form menjumlahkan petani <em>dan</em> pekerja pada Identifikasi Gulma, sistem memakai salah satu); penilaian Lembaga
        tahun itu diisi dari berkas pertama. Skor di luar 0–3 diterima dan ditandai.
      </p>

      {unreadable.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">{formatNumber(unreadable.length)} berkas gagal dibaca dan dilewati:</p>
          <ul className="mt-1 list-disc pl-4">
            {unreadable.map((u, i) => (
              <li key={`${u.fileName}-${i}`}>
                <span className="font-mono">{u.fileName}</span> — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {reading && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Membaca berkas{progress ? ` ${formatNumber(progress.done)}/${formatNumber(progress.total)}` : ""}…
          </p>
          {progress && progress.total > 1 && (
            <div className="h-1.5 w-full max-w-md rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Pratinjau — {formatNumber(ready.length)} siap dari {formatNumber(rows.length)} form
              {needReview > 0 && <span className="normal-case font-normal text-amber-600"> · {formatNumber(needReview)} perlu diperiksa</span>}
              {usedTwice.size > 0 && <span className="normal-case font-normal text-destructive"> · {formatNumber(usedTwice.size)} petani dipakai dua form</span>}
            </h3>
            <Button size="sm" onClick={handleSave} disabled={saving || ready.length === 0}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Simpan {formatNumber(ready.length)} form
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Berkas → nama</TableHead>
                  <TableHead>Petani (MIS)</TableHead>
                  <TableHead>Cocok</TableHead>
                  <TableHead className="text-right">Tahun</TableHead>
                  <TableHead className="text-right">Skor</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Indikator</TableHead>
                  <TableHead>Status / peringatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => {
                  const dup = r.farmerId ? usedTwice.has(`${r.farmerId}:${r.surveyYear}`) : false;
                  const mismatch = r.formScore != null && r.recomputed != null && Math.abs(r.formScore - r.recomputed) > 0.011;
                  return (
                    <TableRow key={`${r.parsed.fileName}-${idx}`} className={dup || !r.farmerId ? "bg-destructive/5" : r.confidence !== "EXACT" || r.headerConflict ? "bg-amber-50/60 dark:bg-amber-950/20" : undefined}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{r.parsed.fileFarmerName ?? "—"}</div>
                        <div className="truncate max-w-[220px] text-muted-foreground" title={r.parsed.fileName}>{r.parsed.fileName}</div>
                        {r.headerConflict && <div className="text-amber-700">header: {r.parsed.headerFarmerName}</div>}
                      </TableCell>
                      <TableCell>
                        <select
                          className="h-8 w-[220px] rounded-md border bg-background px-2 text-xs"
                          value={r.farmerId ?? ""}
                          onChange={(e) => setFarmer(idx, e.target.value)}
                          disabled={saving}
                        >
                          <option value="">— pilih petani —</option>
                          {farmerOptions.map((f) => (
                            <option key={f.farmerDbId} value={f.farmerDbId}>
                              {f.name} ({f.farmerCode})
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={confidenceLabel[r.confidence].variant} className="text-[10px]">
                          {r.confidence === "EXACT" ? <Check className="mr-0.5 h-3 w-3" /> : <AlertCircle className="mr-0.5 h-3 w-3" />}
                          {confidenceLabel[r.confidence].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.surveyYear}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.score == null ? "—" : formatScore(r.score)}</TableCell>
                      <TableCell>{r.score == null ? "—" : <BmpCategoryBadge score={r.score} />}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {r.filledWeighted}/{weightedIndividuCount}
                      </TableCell>
                      <TableCell className="text-xs whitespace-normal min-w-[220px]">
                        <div className="space-y-0.5">
                          {dup ? (
                            <span className="text-destructive">Petani ini dipakai form lain untuk tahun {r.surveyYear}</span>
                          ) : (
                            <Badge variant={r.status === "UPDATE" ? "secondary" : "default"}>{r.status === "UPDATE" ? "Perbarui" : "Baru"}</Badge>
                          )}
                          {mismatch && <p className="text-muted-foreground">Total di form {formatScore(r.formScore!)} — disimpan hasil hitung ulang</p>}
                          {r.outOfRange > 0 && <p className="text-amber-700">{r.outOfRange} skor di luar 0–3</p>}
                          {r.score != null && r.score > BMP_SCORE_MAX && <p className="text-amber-700">Skor akhir {formatScore(r.score)} melebihi 3,00 karena skor di luar rubrik — tetap disimpan apa adanya</p>}
                          {r.parsed.warnings.filter((w) => !w.startsWith("Nama di header") && !w.startsWith("Skor ")).map((w, j) => (
                            <p key={j} className="text-amber-700">{w}</p>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-md border p-3 text-sm space-y-1">
          <p className="font-medium">Hasil simpan</p>
          <p>
            {formatNumber(result.assessmentsCreated)} penilaian baru · {formatNumber(result.assessmentsUpdated)} diperbarui · {formatNumber(result.detailRows)} skor indikator
            {result.groupAssessmentId && " · penilaian Lembaga tersimpan"}
            {result.rejected.length > 0 && <span className="text-destructive"> · {formatNumber(result.rejected.length)} ditolak</span>}
          </p>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700">{w}</p>
          ))}
          {result.rejected.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-destructive">
              {result.rejected.map((x, i) => (
                <li key={i}>{x.fileName} — {x.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
