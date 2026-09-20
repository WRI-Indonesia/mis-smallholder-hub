"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BmpScoreChip } from "@/components/shared/bmp-score-chip";
import { formatScore } from "@/lib/bmp-assessment";
import { bmpScoreLabel } from "@/lib/bmp-survey-form";
import { getBmpAssessmentDetailView, type BmpAssessmentDetailView } from "@/server/actions/bmp-assessment-detail";

/**
 * Rincian ringkas satu penilaian untuk tab Monev BMP di Detail Petani (#346):
 * raport 5 kegiatan (mini bar) + indikator individu berskor & catatan. Dimuat
 * malas saat baris dibuka supaya halaman petani tetap ringan.
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
      <div className="grid gap-2 sm:grid-cols-5">
        {recomputed.activities.map((a) => (
          <div key={a.activityCode} className="rounded-md border p-2">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" title={a.activityName}>
              {a.activityName}
            </p>
            <p className="text-sm font-bold tabular-nums">
              {formatScore(a.indicatorScore)} <span className="text-[10px] font-normal text-muted-foreground">/ 3</span>
            </p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min((a.indicatorScore / 3) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      {mismatch && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" /> Hitung ulang rincian {formatScore(recomputed.total)} ≠ skor tersimpan {formatScore(assessment.score)}.
        </p>
      )}
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {individu.map((i) => {
          const d = byInd.get(i.id);
          return (
            <div key={i.id} className="flex items-start gap-2 text-xs">
              <BmpScoreChip score={d?.score ?? null} className="mt-0.5 shrink-0" title={bmpScoreLabel(i, d?.score ?? null) ?? undefined} />
              <span className={i.inFinalScore ? "" : "text-muted-foreground"}>
                <span className="font-mono text-muted-foreground">{i.code}</span> {i.name}
                {d?.notes && <span className="text-muted-foreground"> — {d.notes}</span>}
              </span>
            </div>
          );
        })}
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
