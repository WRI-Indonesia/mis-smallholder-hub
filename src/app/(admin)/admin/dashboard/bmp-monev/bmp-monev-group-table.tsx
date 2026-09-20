"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Download, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPct } from "@/lib/format";
import { formatScore } from "@/lib/bmp-assessment";
import { BMP_MONEV_STACK_ORDER, type BmpMonevGroupRow } from "@/lib/bmp-monev-dashboard-aggregation";
import { BmpCategoryBadge } from "@/components/shared/bmp-category-badge";
import { bmpAssessmentCategory } from "@/lib/bmp-assessment";

/**
 * Tabel per Lembaga — "table view" yang menopang grafik (aksesibilitas dataviz).
 * Bawaan hanya Lembaga ber-data dan bisa dilipat, supaya dashboard tidak
 * berubah jadi daftar 30 baris "Belum dinilai" (revisi owner 2026-09-19);
 * Lembaga tanpa penilaian tetap bisa ditampilkan lewat tombol agar kesenjangan
 * cakupan terlihat. Ekspor Excel (gate EXPORT) selalu memuat SEMUA baris.
 */
export function BmpMonevGroupTable({ rows, year, canExport }: { rows: BmpMonevGroupRow[]; year: number | null; canExport: boolean }) {
  const [open, setOpen] = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);
  const withData = rows.filter((r) => r.assessedFarmers > 0);
  const emptyCount = rows.length - withData.length;
  const visible = showEmpty ? rows : withData;

  async function handleExport() {
    const { exportToExcel } = await import("@/lib/xlsx");
    await exportToExcel({
      filename: `monev-bmp-per-lembaga${year ? `-${year}` : ""}`,
      sheetName: "Per Lembaga",
      columns: [
        { header: "Lembaga Petani", key: "name", width: 34 },
        { header: "Distrik", key: "district", width: 18 },
        { header: "Petani Aktif", key: "total", width: 12 },
        { header: "Dinilai", key: "assessed", width: 10 },
        { header: "Cakupan (%)", key: "coverage", width: 12 },
        { header: "Rerata Skor", key: "avg", width: 12 },
        { header: "Kategori Rerata", key: "avgCategory", width: 18 },
        ...BMP_MONEV_STACK_ORDER.map((c) => ({ header: c.label, key: c.key, width: 14 })),
      ],
      data: rows.map((r) => ({
        name: r.name,
        district: r.districtName,
        total: r.totalFarmers,
        assessed: r.assessedFarmers,
        coverage: r.totalFarmers > 0 ? Math.round((r.assessedFarmers / r.totalFarmers) * 1000) / 10 : null,
        avg: r.avgScore,
        avgCategory: r.avgScore == null ? "" : bmpAssessmentCategory(r.avgScore).label,
        ...r.byCategory,
      })),
    });
  }

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Table2 className="h-4 w-4 text-primary" /> Rekap per Lembaga Petani ({year ?? "—"})
            <span className="normal-case tracking-normal font-normal">
              — {formatNumber(withData.length)} ber-data{emptyCount > 0 && `, ${formatNumber(emptyCount)} belum dinilai`}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {emptyCount > 0 && open && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowEmpty((v) => !v)}>
                {showEmpty ? "Sembunyikan yang belum dinilai" : `Tampilkan ${formatNumber(emptyCount)} belum dinilai`}
              </Button>
            )}
            {canExport && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" /> Unduh Excel
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen((v) => !v)} title={open ? "Lipat" : "Buka"}>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {open && (
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Lembaga Petani</th>
                <th className="py-2 pr-4">Distrik</th>
                <th className="py-2 pr-4 text-right">Dinilai / Aktif</th>
                <th className="py-2 pr-4 text-right">Cakupan</th>
                <th className="py-2 pr-4 text-right">Rerata</th>
                <th className="py-2 pr-4">Kategori</th>
                {BMP_MONEV_STACK_ORDER.map((c) => (
                  <th key={c.key} className="py-2 pr-4 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className={`border-b last:border-0 ${r.assessedFarmers === 0 ? "text-muted-foreground" : ""}`}>
                  <td className="py-2 pr-4">
                    <Link href={`/admin/master-data/bmp-monev`} className="text-primary hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{r.districtName}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {formatNumber(r.assessedFarmers)} / {formatNumber(r.totalFarmers)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{r.totalFarmers > 0 ? `${formatPct((r.assessedFarmers / r.totalFarmers) * 100)}%` : "—"}</td>
                  <td className="py-2 pr-4 text-right tabular-nums font-medium">{r.avgScore == null ? "—" : formatScore(r.avgScore)}</td>
                  <td className="py-2 pr-4">{r.avgScore == null ? <span className="text-muted-foreground">Belum dinilai</span> : <BmpCategoryBadge score={r.avgScore} />}</td>
                  {BMP_MONEV_STACK_ORDER.map((c) => (
                    <td key={c.key} className="py-2 pr-4 text-right tabular-nums">
                      {r.assessedFarmers === 0 ? "—" : formatNumber(r.byCategory[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6 + BMP_MONEV_STACK_ORDER.length} className="py-6 text-center text-muted-foreground">
                    {rows.length === 0 ? "Tidak ada Lembaga pada filter ini." : "Belum ada Lembaga ber-data pada tahun ini."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      )}
    </Card>
  );
}
