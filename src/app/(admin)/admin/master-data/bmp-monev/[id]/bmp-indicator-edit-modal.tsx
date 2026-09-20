"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatScore } from "@/lib/bmp-assessment";
import { bmpScoreLabel, type BmpIndicatorRef } from "@/lib/bmp-survey-form";
import { saveBmpAssessmentDetails, type BmpIndicatorScoreItem } from "@/server/actions/bmp-assessment-detail";
import { bmpScoreColor } from "@/components/shared/bmp-score-chip";
import { cn } from "@/lib/utils";

/**
 * Grid skor indikator INDIVIDU (#346): satu baris per indikator, pilihan 0–3
 * (atau kosong) sebagai tombol berlabel rubrik, catatan singkat. Menimpa skor
 * tersimpan hanya bila dicentang eksplisit.
 */
export function BmpIndicatorEditModal({
  open,
  onClose,
  assessmentId,
  storedScore,
  indicators,
  details,
}: {
  open: boolean;
  onClose: () => void;
  assessmentId: string;
  storedScore: number;
  indicators: BmpIndicatorRef[];
  details: BmpIndicatorScoreItem[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, { score: number | null; notes: string }>>(() => {
    const init: Record<string, { score: number | null; notes: string }> = {};
    const byId = new Map(details.map((d) => [d.indicatorId, d]));
    for (const ind of indicators) init[ind.id] = { score: byId.get(ind.id)?.score ?? null, notes: byId.get(ind.id)?.notes ?? "" };
    return init;
  });
  const [apply, setApply] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await saveBmpAssessmentDetails({
        assessmentId,
        applyRecomputedScore: apply,
        rows: indicators.map((ind) => ({ indicatorId: ind.id, score: rows[ind.id].score, notes: rows[ind.id].notes || null })),
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const rc = res.data?.recomputedScore;
      toast.success(`Rincian tersimpan${rc != null ? ` · hitung ulang ${formatScore(rc)}${apply ? " (skor tersimpan ditimpa)" : ""}` : ""}`);
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // Kelompokkan per kegiatan agar grid mudah dipindai.
  const groups: { code: string; name: string; rows: BmpIndicatorRef[] }[] = [];
  for (const ind of indicators) {
    let g = groups.find((x) => x.code === ind.activityCode);
    if (!g) {
      g = { code: ind.activityCode, name: ind.activityName, rows: [] };
      groups.push(g);
    }
    g.rows.push(ind);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Skor Indikator Individu</DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-5">
          <p className="text-xs text-muted-foreground">
            Klik angka 0–3 sesuai rubrik (arahkan kursor untuk arti tiap skor); klik lagi untuk mengosongkan (tidak dinilai). Indikator level Lembaga diubah lewat
            Penilaian Lembaga.
          </p>
          {groups.map((g) => (
            <div key={g.code} className="space-y-2">
              <h3 className="text-sm font-semibold">
                {g.code} {g.name}
              </h3>
              {g.rows.map((ind) => {
                const cur = rows[ind.id];
                return (
                  <div key={ind.id} className="grid grid-cols-1 gap-2 rounded-md border p-2.5 md:grid-cols-[1fr_auto_220px] md:items-center">
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-mono text-xs text-muted-foreground">{ind.code}</span> {ind.name}
                        {!ind.inFinalScore && <span className="ml-1 text-[11px] text-muted-foreground">(informatif)</span>}
                        {ind.weight != null && <span className="ml-1 text-[11px] text-muted-foreground">· bobot {ind.weight}</span>}
                      </p>
                      {cur.score != null && bmpScoreLabel(ind, cur.score) && <p className="text-[11px] text-muted-foreground">{cur.score} = {bmpScoreLabel(ind, cur.score)}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map((s) => {
                        const active = cur.score === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            title={bmpScoreLabel(ind, s) ?? `Skor ${s}`}
                            onClick={() => setRows((prev) => ({ ...prev, [ind.id]: { ...prev[ind.id], score: active ? null : s } }))}
                            className={cn(
                              "h-8 w-9 rounded-md border text-sm font-semibold tabular-nums transition-colors",
                              active ? "text-white border-transparent" : "bg-background hover:bg-muted",
                            )}
                            style={active ? { backgroundColor: bmpScoreColor(s) ?? undefined } : undefined}
                          >
                            {s}
                          </button>
                        );
                      })}
                      {cur.score != null && cur.score > 3 && <span className="ml-1 text-xs text-amber-700">saat ini {cur.score}</span>}
                    </div>
                    <Input
                      value={cur.notes}
                      onChange={(e) => setRows((prev) => ({ ...prev, [ind.id]: { ...prev[ind.id], notes: e.target.value } }))}
                      placeholder="Catatan"
                      maxLength={500}
                      className="h-8 text-xs"
                    />
                  </div>
                );
              })}
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={apply} onCheckedChange={(v) => setApply(v === true)} />
              Timpa skor tersimpan ({formatScore(storedScore)}) dengan hasil hitung ulang
            </Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Batal
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
