"use client";

import { Radar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatScore } from "@/lib/bmp-assessment";
import { bmpActivityMaxScore, type BmpActivityScore, type BmpIndicatorRef } from "@/lib/bmp-survey-form";
import { BMP_RADAR_SERIES_COLORS, BmpActivityRadarSvg } from "@/components/shared/bmp-activity-radar-svg";

/**
 * Raport 5 kegiatan satu penilaian (#346, revisi owner 2026-09-20: "spider
 * seperti di dashboard — kiri grafik, kanan tabel"): radar skala 0–3 berpita
 * kategori (komponen bersama dengan Dashboard Monev BMP) + tabel skor
 * kegiatan, bobot, kontribusi, dan indikator kosong. Skor kegiatan = Σ bobot
 * indikator × skor (kriteria alternatif dihitung sekali), maks 3,00.
 */
export function BmpActivityRaport({ activities, total, indicators }: { activities: BmpActivityScore[]; total: number; indicators: BmpIndicatorRef[] }) {
  const rows = activities.map((a) => ({ code: a.activityCode, name: a.activityName, value: a.indicatorScore, max: bmpActivityMaxScore(indicators, a.activityCode) }));
  const missing = activities.reduce((s, a) => s + a.missingWeighted, 0);
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Radar className="h-4 w-4 text-primary" /> Raport 5 Kegiatan BMP
        </CardTitle>
        <p className="text-xs text-muted-foreground">Skor tiap kegiatan pada skala 0–3 dengan pita kategori sebagai latar; skor akhir = Σ (skor kegiatan × bobot kegiatan).</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
          <BmpActivityRadarSvg rowsA={rows} labelA="Petani" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-1.5 pr-2">Kegiatan</th>
                  <th className="py-1.5 pr-2 text-right">Bobot</th>
                  <th className="py-1.5 pr-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: BMP_RADAR_SERIES_COLORS.a }} />
                      Skor / 3
                    </span>
                  </th>
                  <th className="py-1.5 pr-2 text-right">Kontribusi</th>
                  <th className="py-1.5 text-right">Kosong</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.activityCode} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">
                      {a.activityCode} {a.activityName}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">{a.activityWeight}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-medium">{formatScore(a.indicatorScore)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{formatScore(a.contribution)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${a.missingWeighted > 0 ? "text-amber-700" : "text-muted-foreground"}`}>{a.missingWeighted > 0 ? a.missingWeighted : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td className="py-1.5 pr-2 font-semibold" colSpan={3}>
                    Skor akhir = Σ kontribusi
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">{formatScore(total)}</td>
                  <td className={`py-1.5 text-right tabular-nums ${missing > 0 ? "text-amber-700" : "text-muted-foreground"}`}>{missing > 0 ? missing : "—"}</td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Kontribusi = skor kegiatan × bobot kegiatan. Indikator berbobot yang kosong dihitung 0 (rumus form); Identifikasi Gulma cukup salah satu — petani atau pekerja.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
