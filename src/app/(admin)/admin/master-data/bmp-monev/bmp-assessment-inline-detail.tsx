"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { BmpScoreChip } from "@/components/shared/bmp-score-chip";
import { formatScore } from "@/lib/bmp-assessment";
import { bmpScoreLabel } from "@/lib/bmp-survey-form";
import { getBmpAssessmentDetailView, type BmpAssessmentDetailView } from "@/server/actions/bmp-assessment-detail";
import { BmpActivityRadarSvg } from "@/components/shared/bmp-activity-radar-svg";
import { bmpActivityMaxScore } from "@/lib/bmp-survey-form";

/**
 * Rincian ringkas satu penilaian untuk tab Monev BMP di Detail Petani (#346):
 * radar 5 kegiatan di kiri (SVG yang sama dengan dashboard & halaman detail)
 * dan di kanan daftar indikator individu yang **dilipat per kegiatan** — kepala
 * = skor kegiatan /3 + jumlah terisi (owner 2026-09-20: "spider, kanannya
 * info, collapse per aspek"). Dimuat malas saat baris dibuka supaya halaman
 * petani tetap ringan.
 */
export function BmpAssessmentInlineDetail({ assessmentId }: { assessmentId: string }) {
  const [view, setView] = useState<BmpAssessmentDetailView | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getBmpAssessmentDetailView(assessmentId)
      .then((v) => {
        if (!cancelled) setView(v);
      })
      .catch(() => {
        if (!cancelled) setView(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  if (view === undefined) {
    return (
      <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat rincian…
      </p>
    );
  }
  if (view === null) return <p className="py-2 text-xs text-muted-foreground">Rincian tidak tersedia.</p>;

  const { recomputed, indicators, details, groupAssessment, assessment } = view;
  const byInd = new Map(details.map((d) => [d.indicatorId, d]));
  const individu = indicators.filter((i) => i.level === "INDIVIDU");
  const mismatch = recomputed != null && Math.abs(recomputed.total - assessment.score) > 0.011;

  if (!recomputed) {
    return (
      <p className="py-2 text-xs text-muted-foreground">
        Belum ada rincian indikator untuk tahun ini — hanya skor akhir.{" "}
        <Link href={`/admin/master-data/bmp-monev/${assessmentId}`} className="text-primary hover:underline">
          Buka detail penilaian
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {mismatch && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" /> Hitung ulang rincian {formatScore(recomputed.total)} ≠ skor tersimpan {formatScore(assessment.score)}.
        </p>
      )}
      {/* Radar kecil (tanpa legenda pita) supaya tingginya sebanding dengan lima kepala kegiatan saat semua terlipat. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:items-center">
        <BmpActivityRadarSvg
          rowsA={recomputed.activities.map((a) => ({ code: a.activityCode, name: a.activityName, value: a.indicatorScore, max: bmpActivityMaxScore(indicators, a.activityCode) }))}
          labelA="Petani"
          showLegend={false}
          className="max-w-[300px]"
        />
        <div className="space-y-1.5">
          {recomputed.activities.map((a) => {
            const rows = individu.filter((i) => i.activityCode === a.activityCode);
            const filled = rows.filter((i) => byInd.get(i.id)?.score != null).length;
            return (
              <ActivityFold key={a.activityCode} title={`${a.activityCode} ${a.activityName}`} score={a.indicatorScore} filled={filled} total={rows.length}>
                {rows.map((i) => {
                  const d = byInd.get(i.id);
                  return (
                    <div key={i.id} className="flex items-start gap-2 text-xs">
                      <BmpScoreChip score={d?.score ?? null} className="mt-0.5 shrink-0" title={bmpScoreLabel(i, d?.score ?? null) ?? undefined} />
                      <span className={i.inFinalScore ? "" : "text-muted-foreground"}>
                        <span className="font-mono text-muted-foreground">{i.code}</span> {i.name}
                        {!i.inFinalScore && <span className="text-muted-foreground"> (informatif)</span>}
                        {d?.notes && <span className="text-muted-foreground"> — {d.notes}</span>}
                      </span>
                    </div>
                  );
                })}
              </ActivityFold>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Indikator Lembaga {groupAssessment ? <Badge variant="secondary" className="text-[10px]">terisi {groupAssessment.details.filter((d) => d.score != null).length}/{indicators.filter((i) => i.level === "LEMBAGA").length}</Badge> : <Badge variant="outline" className="text-[10px]">belum ada</Badge>} ·{" "}
        <Link href={`/admin/master-data/bmp-monev/${assessmentId}`} className="text-primary hover:underline">
          Buka detail penilaian lengkap
        </Link>
      </p>
    </div>
  );
}

/** Satu kegiatan yang bisa dilipat: kepala memuat skor kegiatan /3 dan jumlah indikator individu terisi. */
function ActivityFold({ title, score, filled, total, children }: { title: string; score: number; filled: number; total: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-muted/40">
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="flex-1 truncate font-medium">{title}</span>
        <span className="tabular-nums text-muted-foreground">
          {filled}/{total} terisi
        </span>
        <span className="w-14 text-right tabular-nums font-semibold">{formatScore(score)} / 3</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 border-t px-2.5 py-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
