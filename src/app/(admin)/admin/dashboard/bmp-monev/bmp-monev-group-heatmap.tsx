"use client";

import { ArrowDownAZ, ArrowDownWideNarrow, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BmpScoreChip } from "@/components/shared/bmp-score-chip";
import { formatScore } from "@/lib/bmp-assessment";
import { bmpMonevGroupIndicatorAverages, type BmpMonevGroupProfileRow, type BmpMonevGroupProfileSort, type BmpMonevIndicator } from "@/lib/bmp-monev-dashboard-aggregation";

/**
 * Profil kelembagaan (#346): Lembaga × indikator level LEMBAGA (14 di master saat ini) sebagai
 * chip skor 0–3 (ramp satu hue — magnitudo, bukan kategori). Lembaga tanpa
 * penilaian tahun itu tetap tampil bertanda supaya cakupan kelembagaan terbaca.
 */
export function BmpMonevGroupHeatmap({
  rows,
  indicators,
  yearLabel,
  sort,
  onSortChange,
}: {
  rows: BmpMonevGroupProfileRow[];
  indicators: BmpMonevIndicator[];
  yearLabel: string;
  sort: BmpMonevGroupProfileSort;
  onSortChange: (s: BmpMonevGroupProfileSort) => void;
}) {
  const cols = indicators.filter((i) => i.level === "LEMBAGA").sort((a, b) => a.sortOrder - b.sortOrder);
  // Hanya Lembaga ber-profil yang digambar — 24 baris "belum dinilai" akan
  // menenggelamkan 8 baris berdata (pelajaran tabel rekap #344); jumlahnya tetap disebut.
  const withProfile = rows.filter((r) => r.hasProfile);
  const withoutProfile = rows.length - withProfile.length;
  const colAvg = bmpMonevGroupIndicatorAverages(rows, cols.map((c) => c.id));
  const allAvg = withProfile.map((r) => r.avg).filter((v): v is number => v != null);
  const grandAvg = allAvg.length ? Math.round((allAvg.reduce((s, v) => s + v, 0) / allAvg.length) * 100) / 100 : null;
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Profil Kelembagaan — {cols.length} indikator Lembaga ({yearLabel})
          </CardTitle>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Urutkan:</span>
            <Button size="sm" variant={sort === "avg" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => onSortChange("avg")}>
              <ArrowDownWideNarrow className="mr-1 h-3.5 w-3.5" /> Rerata
            </Button>
            <Button size="sm" variant={sort === "name" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => onSortChange("name")}>
              <ArrowDownAZ className="mr-1 h-3.5 w-3.5" /> Abjad
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Skor 0–3 per indikator Lembaga (unit manajemen, LSU/SSU, infrastruktur panen, OER, single DO, taksasi, catatan produksi, …). Kolom ber-★ ikut menentukan skor
          setiap petani Lembaga itu. <strong>Rerata</strong> = rata-rata sederhana indikator yang terisi (alat baca, bukan skor resmi). Arahkan kursor ke kode untuk nama indikator.
        </p>
      </CardHeader>
      <CardContent>
        {withProfile.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">Belum ada penilaian Lembaga pada filter ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">
                    <button type="button" className="hover:underline" onClick={() => onSortChange("name")}>Lembaga Petani</button>
                  </th>
                  <th className="py-2 px-2 text-right">
                    <button type="button" className="hover:underline" onClick={() => onSortChange("avg")}>Rerata</button>
                  </th>
                  {cols.map((c) => (
                    <th key={c.id} className="py-2 px-1 text-center font-mono normal-case text-[10px]" title={`${c.code} ${c.name}${c.weight != null ? ` · bobot ${c.weight} (masuk skor petani)` : " · informatif"}`}>
                      {c.code}
                      {c.inFinalScore ? "★" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withProfile.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{r.name}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-semibold" title={`rata-rata ${r.filled} indikator terisi`}>
                      {r.avg == null ? "—" : formatScore(r.avg)}
                    </td>
                    {cols.map((c) => (
                      <td key={c.id} className="py-1.5 px-1 text-center">
                        <BmpScoreChip score={r.scores[c.id] ?? null} title={`${r.name} · ${c.name}: ${r.scores[c.id] ?? "tidak dinilai"}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {withProfile.length > 1 && (
                <tfoot>
                  <tr className="border-t bg-muted/30 text-xs">
                    <td className="py-1.5 pr-3 font-medium">Rerata kolom</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-semibold">{grandAvg == null ? "—" : formatScore(grandAvg)}</td>
                    {cols.map((c) => (
                      <td key={c.id} className="py-1.5 px-1 text-center tabular-nums" title={`${c.name}: rerata antar Lembaga`}>
                        {colAvg[c.id] == null ? "—" : formatScore(colAvg[c.id]!)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
            {withoutProfile > 0 && <p className="mt-2 text-[11px] text-muted-foreground">{withoutProfile} Lembaga lain belum punya penilaian Lembaga tahun ini. Rerata kolom terendah = indikator kelembagaan yang paling perlu dibenahi lintas Lembaga.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
