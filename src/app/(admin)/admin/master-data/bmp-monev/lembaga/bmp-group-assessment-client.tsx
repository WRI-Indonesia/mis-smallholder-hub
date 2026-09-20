"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronsUpDown, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { formatUtcDate, fromUtcDay, isOutOfRubric, toUtcDay } from "@/lib/bmp-assessment";
import { bmpScoreLabel, type BmpIndicatorRef } from "@/lib/bmp-survey-form";
import { BmpScoreChip, bmpScoreColor } from "@/components/shared/bmp-score-chip";
import { upsertBmpGroupAssessment, type BmpGroupAssessmentItem } from "@/server/actions/bmp-assessment-detail";


interface Props {
  rows: BmpGroupAssessmentItem[];
  indicators: BmpIndicatorRef[];
  farmerGroups: { id: string; name: string }[];
  permissions: string[];
}

export function BmpGroupAssessmentClient({ rows, indicators, farmerGroups, permissions }: Props) {
  const [editing, setEditing] = useState<{ open: boolean; row: BmpGroupAssessmentItem | null }>({ open: false, row: null });
  const [sort, setSort] = useState<"avg" | "name">("avg");
  const canEdit = permissions.includes("EDIT");
  // Rerata sederhana indikator terisi — alat baca/urut (permintaan owner), bukan skor kelembagaan resmi.
  const avgOf = (r: BmpGroupAssessmentItem) => {
    const vals = r.details.map((d) => d.score).filter((v): v is number => v != null);
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : null;
  };
  const sorted = [...rows].sort((a, b) => b.surveyYear - a.surveyYear || (sort === "avg" ? (avgOf(b) ?? -1) - (avgOf(a) ?? -1) || a.farmerGroupName.localeCompare(b.farmerGroupName) : a.farmerGroupName.localeCompare(b.farmerGroupName)));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/master-data/bmp-monev" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Monev BMP
        </Link>
        {canEdit && (
          <Button size="sm" onClick={() => setEditing({ open: true, row: null })}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Penilaian Lembaga
          </Button>
        )}
      </div>

      <Card className="p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada penilaian Lembaga. Import form survei per petani otomatis mengisinya, atau tambahkan manual.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">
                    <button type="button" className="hover:underline" onClick={() => setSort("name")}>Lembaga Petani{sort === "name" ? " ↓" : ""}</button>
                  </th>
                  <th className="py-2 pr-3">Tahun</th>
                  <th className="py-2 pr-3">Tgl Survei</th>
                  <th className="py-2 pr-3 text-right">
                    <button type="button" className="hover:underline" onClick={() => setSort("avg")}>Rerata{sort === "avg" ? " ↓" : ""}</button>
                  </th>
                  {indicators.map((i) => (
                    <th key={i.id} className="py-2 px-1 text-center" title={`${i.code} ${i.name}${i.weight != null ? ` · bobot ${i.weight}` : " · informatif"}`}>
                      <span className="font-mono">{i.code}</span>
                    </th>
                  ))}
                  <th className="py-2 pl-3">Penilai</th>
                  {canEdit && <th className="py-2 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const byInd = new Map(r.details.map((d) => [d.indicatorId, d]));
                  const avg = avgOf(r);
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{r.farmerGroupName}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.surveyYear}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{formatUtcDate(r.surveyDate)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums font-semibold">{avg == null ? "—" : avg.toFixed(2).replace(".", ",")}</td>
                      {indicators.map((i) => {
                        const d = byInd.get(i.id);
                        return (
                          <td key={i.id} className="py-2 px-1 text-center">
                            <BmpScoreChip score={d?.score ?? null} title={`${i.code} ${i.name}: ${d?.score ?? "tidak dinilai"}${bmpScoreLabel(i, d?.score ?? null) ? ` — ${bmpScoreLabel(i, d?.score ?? null)}` : ""}`} />
                          </td>
                        );
                      })}
                      <td className="py-2 pl-3 text-muted-foreground">{r.assessor ?? "—"}</td>
                      {canEdit && (
                        <td className="py-2 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ open: true, row: r })}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Ubah
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {formatNumber(rows.length)} penilaian · Rerata = rata-rata sederhana indikator terisi (alat baca, bukan skor resmi) · arahkan kursor ke kode kolom untuk nama indikator; ke chip untuk arti skornya.
            </p>
          </div>
        )}
      </Card>

      {canEdit && (
        <BmpGroupAssessmentModal
          key={editing.row?.id ?? `new-${editing.open}`}
          open={editing.open}
          onClose={() => setEditing({ open: false, row: null })}
          row={editing.row}
          indicators={indicators}
          farmerGroups={farmerGroups}
        />
      )}
    </>
  );
}

function BmpGroupAssessmentModal({
  open,
  onClose,
  row,
  indicators,
  farmerGroups,
}: {
  open: boolean;
  onClose: () => void;
  row: BmpGroupAssessmentItem | null;
  indicators: BmpIndicatorRef[];
  farmerGroups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const isEdit = !!row;
  const [farmerGroupId, setFarmerGroupId] = useState(row?.farmerGroupId ?? "");
  const [groupOpen, setGroupOpen] = useState(false);
  const [surveyYear, setSurveyYear] = useState(String(row?.surveyYear ?? new Date().getFullYear()));
  const [surveyDate, setSurveyDate] = useState<Date | null>(row?.surveyDate ? new Date(row.surveyDate) : null);
  const [assessor, setAssessor] = useState(row?.assessor ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [scores, setScores] = useState<Record<string, { score: number | null; notes: string }>>(() => {
    const byInd = new Map((row?.details ?? []).map((d) => [d.indicatorId, d]));
    const init: Record<string, { score: number | null; notes: string }> = {};
    for (const i of indicators) init[i.id] = { score: byInd.get(i.id)?.score ?? null, notes: byInd.get(i.id)?.notes ?? "" };
    return init;
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!farmerGroupId) {
      toast.error("Pilih Lembaga Petani");
      return;
    }
    setSaving(true);
    try {
      // Skor di luar rubrik (4 hasil import) yang tidak diubah tidak dikirim: form
      // manual dibatasi 0–3, dan baris yang tak dikirim tidak disentuh server.
      const original = new Map((row?.details ?? []).map((d) => [d.indicatorId, d]));
      const res = await upsertBmpGroupAssessment({
        id: row?.id,
        farmerGroupId,
        surveyYear: Number(surveyYear),
        surveyDate,
        assessor: assessor || null,
        notes: notes || null,
        rows: indicators
          .filter((i) => !(isOutOfRubric(scores[i.id].score) && scores[i.id].score === original.get(i.id)?.score && (scores[i.id].notes || null) === (original.get(i.id)?.notes ?? null)))
          .map((i) => ({ indicatorId: i.id, score: scores[i.id].score, notes: scores[i.id].notes || null })),
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Penilaian Lembaga tersimpan");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan penilaian Lembaga");
    } finally {
      setSaving(false);
    }
  }

  const selectedGroup = farmerGroups.find((g) => g.id === farmerGroupId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Penilaian Lembaga" : "Tambah Penilaian Lembaga"}</DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 flex flex-col">
              <Label>Lembaga Petani</Label>
              {isEdit ? (
                <Input value={row.farmerGroupName} readOnly className="bg-muted/40" />
              ) : (
                <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" role="combobox" className="w-full justify-between h-10 font-normal text-left">
                        <span className={cn("truncate", !farmerGroupId && "text-muted-foreground")}>{selectedGroup?.name ?? "Pilih Lembaga"}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cari lembaga..." />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty>Lembaga tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {farmerGroups.map((g) => (
                            <CommandItem
                              key={g.id}
                              value={g.name}
                              onSelect={() => {
                                setFarmerGroupId(g.id);
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
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tahun Survei</Label>
              <Input type="number" min={2020} max={new Date().getFullYear() + 1} value={surveyYear} onChange={(e) => setSurveyYear(e.target.value)} readOnly={isEdit} className={isEdit ? "bg-muted/40" : undefined} />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label>Tanggal Survei</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button type="button" variant="outline" className="w-full justify-start text-left font-normal h-10 border-input bg-transparent">
                      <span className={cn("flex-1 truncate", !surveyDate && "text-muted-foreground")}>{surveyDate ? formatUtcDate(surveyDate) : "Opsional"}</span>
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={surveyDate ? fromUtcDay(surveyDate) : undefined} onSelect={(d) => d && setSurveyDate(toUtcDay(d))} locale={localeId} disabled={{ after: new Date() }} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Penilai</Label>
              <Input value={assessor} onChange={(e) => setAssessor(e.target.value)} maxLength={120} placeholder="Opsional" />
            </div>
          </div>

          <div className="space-y-2">
            {indicators.map((i) => {
              const cur = scores[i.id];
              return (
                <div key={i.id} className="grid grid-cols-1 gap-2 rounded-md border p-2.5 md:grid-cols-[1fr_auto_220px] md:items-center">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{i.code}</span> {i.name}
                      {!i.inFinalScore ? <span className="ml-1 text-[11px] text-muted-foreground">(informatif)</span> : <span className="ml-1 text-[11px] text-muted-foreground">· bobot {i.weight} — masuk skor petani</span>}
                    </p>
                    {cur.score != null && bmpScoreLabel(i, cur.score) && <p className="text-[11px] text-muted-foreground">{cur.score} = {bmpScoreLabel(i, cur.score)}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3].map((s) => {
                      const active = cur.score === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          title={bmpScoreLabel(i, s) ?? `Skor ${s}`}
                          onClick={() => setScores((prev) => ({ ...prev, [i.id]: { ...prev[i.id], score: active ? null : s } }))}
                          className={cn("h-8 w-9 rounded-md border text-sm font-semibold tabular-nums transition-colors", active ? "text-white border-transparent" : "bg-background hover:bg-muted")}
                          style={active ? { backgroundColor: bmpScoreColor(s) ?? undefined } : undefined}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <Input value={cur.notes} onChange={(e) => setScores((prev) => ({ ...prev, [i.id]: { ...prev[i.id], notes: e.target.value } }))} placeholder="Catatan" maxLength={500} className="h-8 text-xs" />
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label>Catatan penilaian Lembaga</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Opsional" />
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
