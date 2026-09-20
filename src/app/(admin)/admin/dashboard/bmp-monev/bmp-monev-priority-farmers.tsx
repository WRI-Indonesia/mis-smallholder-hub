"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Loader2, UserRoundSearch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatScore } from "@/lib/bmp-assessment";
import { BmpCategoryBadge } from "@/components/shared/bmp-category-badge";
import { getBmpMonevPriorityFarmers, type BmpMonevFarmerRankOrder, type BmpMonevPriorityFarmer } from "@/server/actions/dashboard-bmp-monev";

const LIMIT = 10;

/**
 * Daftar petani berperingkat (#346, revisi UX): `order="lowest"` = 10 petani
 * prioritas pendampingan (skor terendah, sebut kegiatan terlemah); `order=
 * "highest"` = 10 petani teladan (skor tertinggi, sebut kegiatan terkuat —
 * permintaan owner 2026-09-20 "ada 10 petani terbaik juga"). Dimuat on-demand
 * (nama tidak ikut payload dashboard); tiap baris menaut ke detail penilaian.
 */
export function BmpMonevPriorityFarmers({ districtId, groupId, year, order = "lowest" }: { districtId: string | null; groupId: string | null; year: number; order?: BmpMonevFarmerRankOrder }) {
  // State disimpan bersama kunci filternya: saat filter berubah, data lama
  // otomatis dianggap basi (loading) tanpa setState sinkron di badan effect.
  const key = `${districtId ?? ""}|${groupId ?? ""}|${year}|${order}`;
  const [state, setState] = useState<{ key: string; rows: BmpMonevPriorityFarmer[] | null; error: string | null }>({ key: "", rows: null, error: null });
  const rows = state.key === key ? state.rows : null;
  const error = state.key === key ? state.error : null;

  useEffect(() => {
    let cancelled = false;
    getBmpMonevPriorityFarmers({ districtId, groupId, year }, LIMIT, order)
      .then((r) => {
        if (!cancelled) setState({ key, rows: r, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ key, rows: null, error: e instanceof Error ? e.message : "Gagal memuat" });
      });
    return () => {
      cancelled = true;
    };
  }, [districtId, groupId, year, order, key]);

  const lowest = order === "lowest";

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          {lowest ? <UserRoundSearch className="h-4 w-4 text-primary" /> : <Award className="h-4 w-4 text-primary" />}
          {lowest ? "Petani Prioritas Pendampingan" : "Petani Teladan"} ({year})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {lowest ? "Sepuluh skor terendah" : "Sepuluh skor tertinggi"} pada filter aktif; klik nama untuk membuka rincian indikatornya.
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rows === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </p>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">Belum ada penilaian pada filter ini.</div>
        ) : (
          <ol className="divide-y">
            {rows.map((r, i) => {
              const activity = lowest ? r.weakestActivity : r.strongestActivity;
              return (
                <li key={r.assessmentId} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/master-data/bmp-monev/${r.assessmentId}`} className="truncate font-medium text-primary hover:underline">
                      {r.farmerName}
                    </Link>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {r.farmerGroupName}
                      {activity && <> · {lowest ? "terlemah" : "terkuat"}: {activity}</>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatScore(r.score)}</span>
                  <BmpCategoryBadge score={r.score} className="text-[10px] px-1.5" />
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
