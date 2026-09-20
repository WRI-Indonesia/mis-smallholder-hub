"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Building2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BreadcrumbOverride } from "@/components/layout/admin/breadcrumb-override";
import { BmpCategoryBadge } from "@/components/shared/bmp-category-badge";
import { BmpScoreChip } from "@/components/shared/bmp-score-chip";
import { formatNumber } from "@/lib/format";
import { formatScore, formatUtcDate } from "@/lib/bmp-assessment";
import { BMP_EXCLUSIVE_CRITERIA, bmpScoreLabel, bmpWeightedSlotKey, type BmpIndicatorRef } from "@/lib/bmp-survey-form";
import type { BmpAssessmentDetailView } from "@/server/actions/bmp-assessment-detail";
import { BmpIndicatorEditModal } from "./bmp-indicator-edit-modal";
import { BmpActivityRaport } from "./bmp-activity-raport";

/**
 * Halaman detail penilaian (#346). Skor tersimpan = angka resmi; hitung ulang
 * dari rincian ditampilkan sebagai pembanding dengan peringatan bila berbeda
 * (13 form Rohul total raportnya basi terhadap sheet indikator).
 */
export function BmpAssessmentDetailClient({ view, permissions }: { view: BmpAssessmentDetailView; permissions: string[] }) {
  const { assessment: a, indicators, details, groupAssessment, recomputed, outOfRange } = view;
  const [editOpen, setEditOpen] = useState(false);
  const canEdit = permissions.includes("EDIT");

  const detailByInd = new Map(details.map((d) => [d.indicatorId, d]));
  const groupByInd = new Map((groupAssessment?.details ?? []).map((d) => [d.indicatorId, d]));
  const scoreOf = (ind: BmpIndicatorRef) => (ind.level === "LEMBAGA" ? groupByInd.get(ind.id) : detailByInd.get(ind.id));
  const hasIndividuDetails = details.length > 0;
  // Slot individu berbobot (kriteria alternatif petani/pekerja = satu slot): 15, terisi = slot yang minimal satu skornya ada.
  const weightedIndividu = indicators.filter((i) => i.level === "INDIVIDU" && i.inFinalScore);
  const weightedSlots = new Set(weightedIndividu.map(bmpWeightedSlotKey)).size;
  const filledSlots = new Set(weightedIndividu.filter((i) => detailByInd.get(i.id)?.score != null).map(bmpWeightedSlotKey)).size;
  const mismatch = recomputed != null && Math.abs(recomputed.total - a.score) > 0.011;

  // Kelompokkan per kegiatan, urut master.
  const activities: { code: string; name: string; weight: number; rows: BmpIndicatorRef[] }[] = [];
  for (const ind of indicators) {
    let act = activities.find((x) => x.code === ind.activityCode);
    if (!act) {
      act = { code: ind.activityCode, name: ind.activityName, weight: ind.activityWeight, rows: [] };
      activities.push(act);
    }
    act.rows.push(ind);
  }

  return (
    <>
      <BreadcrumbOverride label={`${a.farmerName} · ${a.surveyYear}`} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/admin/master-data/bmp-monev">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              Monev BMP {a.surveyYear} —{" "}
              <Link href={`/admin/master-data/farmers/${a.farmerId}`} className="text-primary hover:underline">
                {a.farmerName}
              </Link>
            </h1>
            <p className="text-muted-foreground font-mono text-sm">{a.farmerCode}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="default">{a.farmerGroupName}</Badge>
              <BmpCategoryBadge score={a.score} />
              {!a.isActive && <Badge variant="outline">Nonaktif</Badge>}
              {outOfRange.length > 0 && (
                <Badge variant="outline" className="border-amber-500 text-amber-700">
                  <AlertTriangle className="mr-1 h-3 w-3" /> {outOfRange.length} skor di luar 0–3 ({outOfRange.join(", ")})
                </Badge>
              )}
            </div>
          </div>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> {hasIndividuDetails ? "Ubah skor indikator" : "Isi skor indikator"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Skor tersimpan" value={formatScore(a.score)} sub="angka resmi" />
        <Stat
          label="Hitung ulang"
          value={recomputed ? formatScore(recomputed.total) : "—"}
          sub={recomputed ? (mismatch ? "≠ skor tersimpan" : "= skor tersimpan") : "belum ada rincian"}
          warn={mismatch}
        />
        <Stat label="Tgl survei" value={formatUtcDate(a.surveyDate)} />
        <Stat label="Lahan dikunjungi" value={a.parcelId ?? "—"} mono />
        <Stat label="Penilai" value={a.assessor ?? "—"} />
        <Stat label="Indikator terisi" value={`${formatNumber(filledSlots)}/${formatNumber(weightedSlots)}`} sub="individu berbobot" />
      </div>

      {mismatch && recomputed && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Skor tersimpan <strong>{formatScore(a.score)}</strong> berbeda dari hasil hitung ulang rincian <strong>{formatScore(recomputed.total)}</strong>. Biasanya total raport
            di form belum dihitung ulang setelah sheet indikator diedit. Skor tersimpan tetap dipakai dashboard; gunakan tombol ubah skor indikator lalu centang
            &ldquo;timpa skor tersimpan&rdquo; bila rincianlah yang benar.
          </p>
        </div>
      )}

      {recomputed && <BmpActivityRaport activities={recomputed.activities} total={recomputed.total} indicators={indicators} />}

      <Card className="p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Skor per Indikator</h2>
          <p className="text-xs text-muted-foreground">
            Skor 0–3 · bobot indikator × skor = kontribusi ke kegiatan · indikator tanpa bobot bersifat informatif. Level <strong>Lembaga</strong> dibaca dari
            penilaian Lembaga {a.surveyYear}
            {groupAssessment ? "" : " (belum ada)"}.
          </p>
        </div>
        {!hasIndividuDetails && !groupAssessment ? (
          <p className="text-sm text-muted-foreground">Belum ada rincian indikator untuk penilaian ini — hanya skor akhir yang tercatat.</p>
        ) : (
          <div className="space-y-5">
            {activities.map((act) => {
              const ra = recomputed?.activities.find((x) => x.activityCode === act.code);
              return (
                <div key={act.code}>
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      {act.code} {act.name} <span className="font-normal text-muted-foreground">· bobot kegiatan {act.weight}</span>
                    </h3>
                    {ra && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        skor kegiatan {formatScore(ra.indicatorScore)} × {act.weight} = <strong className="text-foreground">{formatScore(ra.contribution)}</strong>
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    {/* table-fixed + colgroup sama untuk kelima kegiatan supaya kolom sejajar antar tabel (revisi owner 2026-09-20). */}
                    <table className="w-full min-w-[56rem] table-fixed text-sm">
                      <colgroup>
                        <col className="w-[5.25rem]" />
                        <col className="w-[5.5rem]" />
                        <col />
                        <col className="w-[4rem]" />
                        <col className="w-[3.75rem]" />
                        <col className="w-[13rem]" />
                        <col className="w-[9rem]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-3 py-2">Kode</th>
                          <th className="px-3 py-2">Level</th>
                          <th className="px-3 py-2">Indikator</th>
                          <th className="px-3 py-2 text-right">Bobot</th>
                          <th className="px-3 py-2 text-center">Skor</th>
                          <th className="px-3 py-2">Arti skor</th>
                          <th className="px-3 py-2">Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {act.rows.map((ind) => {
                          const d = scoreOf(ind);
                          const score = d?.score ?? null;
                          const label = bmpScoreLabel(ind, score);
                          return (
                            <tr key={ind.id} className={`border-b last:border-0 align-top ${!ind.inFinalScore ? "text-muted-foreground" : ""}`}>
                              <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{ind.code}</td>
                              <td className="px-3 py-2">
                                <Badge variant={ind.level === "LEMBAGA" ? "secondary" : "outline"} className="text-[10px]">
                                  {ind.level === "LEMBAGA" ? "Lembaga" : "Individu"}
                                </Badge>
                              </td>
                              <td className="px-3 py-2">
                                {ind.name}
                                {!ind.inFinalScore && <span className="ml-1 text-[11px]">(informatif)</span>}
                                {ind.inFinalScore && BMP_EXCLUSIVE_CRITERIA.has(ind.criteriaCode) && <span className="ml-1 text-[11px] text-muted-foreground">(salah satu — petani atau pekerja)</span>}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{ind.weight ?? "—"}</td>
                              <td className="px-3 py-2 text-center">
                                <BmpScoreChip score={score} />
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground break-words">{label ?? (score != null && (score < 0 || score > 3) ? "di luar rubrik" : "—")}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground break-words">{d?.notes ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Penilaian Lembaga <strong>{a.farmerGroupName}</strong> tahun {a.surveyYear}:{" "}
            {groupAssessment ? (
              <>
                {formatNumber(groupAssessment.details.filter((d) => d.score != null).length)} dari 14 indikator terisi · survei {formatUtcDate(groupAssessment.surveyDate)}
              </>
            ) : (
              <span className="text-muted-foreground">belum ada — indikator Lembaga dihitung 0</span>
            )}
          </span>
          <Link href="/admin/master-data/bmp-monev/lembaga" className="text-primary hover:underline">
            Kelola penilaian Lembaga →
          </Link>
        </div>
      </Card>

      {canEdit && (
        <BmpIndicatorEditModal
          key={`${a.id}-${editOpen}`}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          assessmentId={a.id}
          storedScore={a.score}
          indicators={indicators.filter((i) => i.level === "INDIVIDU")}
          details={details}
        />
      )}
    </>
  );
}

function Stat({ label, value, sub, mono, warn }: { label: string; value: string; sub?: string; mono?: boolean; warn?: boolean }) {
  return (
    <Card className={warn ? "border-amber-400" : undefined}>
      <CardContent className="p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`mt-1 text-lg font-bold tabular-nums ${mono ? "font-mono text-sm" : ""} ${warn ? "text-amber-700" : ""}`}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
