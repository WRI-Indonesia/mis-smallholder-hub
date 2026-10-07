"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { trainingBenefitPerYear, type TrainingBenefitYear } from "@/lib/training-dashboard-aggregation";
import type { TrainingGroupEntry } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";

const yearLabel = (y: TrainingBenefitYear) => (y.upTo ? `≤ ${y.year}` : String(y.year));

/**
 * Card full-row "Training Benefit per year" (#402): per paket, penerima manfaat baru
 * (Actual) dan kumulatif per tahun — kolom ≤ (t−2) · t−1 · t bergeser otomatis.
 * Ikut filter Distrik/Lembaga; filter Tahun diabaikan (kartu sudah per tahun).
 */
export function TrainingBenefitPanel({
  groups,
  canExport,
  scopeLabel,
}: {
  /** Lembaga hasil filter Distrik/Lembaga — TANPA saring tahun. */
  groups: TrainingGroupEntry[];
  canExport: boolean;
  /** Nama Distrik/Lembaga aktif untuk nama berkas ekspor (null = semua). */
  scopeLabel: string | null;
}) {
  const [open, setOpen] = useState(true);
  const currentYear = new Date().getFullYear();
  const { years, rows, any } = useMemo(() => trainingBenefitPerYear(groups, currentYear), [groups, currentYear]);
  const lastIdx = years.length - 1;
  const totalCumulative = any.cells[lastIdx].cumulative;
  const totalNew = any.cells[lastIdx].actual;

  const exportExcel = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Training Benefit");
    ws.addRow(["Package", ...years.flatMap((y) => [yearLabel(y), ""])]);
    ws.addRow(["", ...years.flatMap(() => ["Actual", "Kumulative"])]);
    ws.mergeCells(1, 1, 2, 1);
    years.forEach((_, i) => ws.mergeCells(1, 2 + i * 2, 1, 3 + i * 2));
    for (const r of [...rows, any]) ws.addRow([r.label, ...r.cells.flatMap((c) => [c.actual, c.cumulative])]);
    ws.getRow(ws.rowCount).font = { bold: true };
    const last = 1 + years.length * 2;
    for (let rowNo = 1; rowNo <= 2; rowNo++) {
      const row = ws.getRow(rowNo);
      row.font = { bold: true };
      row.alignment = { horizontal: "center", vertical: "middle" };
    }
    ws.eachRow((row) => {
      for (let c = 1; c <= last; c++) {
        row.getCell(c).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      }
    });
    ws.getColumn(1).width = 52;
    for (let c = 2; c <= last; c++) ws.getColumn(c).width = 13;
    const buffer = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-benefit-per-year_${scopeLabel ?? "semua"}_${currentYear}.xlsx`.replace(/\s+/g, "-");
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border border-border/60 shadow-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between gap-3 px-6 py-4">
          <CollapsibleTrigger
            render={
              <button type="button" className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" /> Training Benefit per year
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {open
                      ? "Petani unik per paket. Actual = penerima manfaat baru (pertama kali dilatih paket itu) pada tahun tersebut; Kumulative = total s.d. akhir tahun."
                      : `${formatNumber(totalNew)} petani baru dilatih ${currentYear} · ${formatNumber(totalCumulative)} petani mengikuti ≥ 1 pelatihan`}
                  </span>
                </span>
                <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
            }
          />
          {canExport && open && (
            <Button variant="outline" size="sm" className="h-8 shrink-0 gap-2" onClick={exportExcel}>
              <Download className="h-4 w-4" />
              Excel
            </Button>
          )}
        </div>
        <CollapsibleContent>
          <CardContent className="border-t pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th rowSpan={2} className="py-2 pr-4 text-left align-bottom font-semibold">
                      Package
                    </th>
                    {years.map((y, i) => (
                      <th
                        key={y.year}
                        colSpan={2}
                        className={`px-2 pt-2 text-center font-semibold ${i < lastIdx ? "border-r border-border/60" : ""}`}
                        title={y.upTo ? `Tahun ${y.year} dan sebelumnya` : undefined}
                      >
                        {yearLabel(y)}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b text-[11px] font-medium text-muted-foreground">
                    {years.flatMap((y, i) => [
                      <th key={`${y.year}-a`} className="px-2 pb-2 text-right font-medium">
                        Actual
                      </th>,
                      <th key={`${y.year}-k`} className={`px-2 pb-2 text-right font-medium ${i < lastIdx ? "border-r border-border/60" : ""}`}>
                        Kumulative
                      </th>,
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {[...rows, any].map((r) => (
                    <tr
                      key={r.code}
                      className={
                        r.code === "ANY"
                          ? "border-t-2 border-border bg-emerald-50/60 font-semibold dark:bg-emerald-950/20"
                          : "border-b border-border/40"
                      }
                      title={r.code === "ANY" ? "Petani yang mengikuti minimal satu pelatihan (paket apa pun, termasuk Lainnya) — sama dengan baris Pernah Ikut Pelatihan di Capaian Paket per Distrik" : undefined}
                    >
                      <td className={`py-2.5 pr-4 ${r.code === "ANY" ? "font-semibold" : "font-medium"}`}>{r.label}</td>
                      {r.cells.flatMap((c, i) => [
                        <td key={`${i}-a`} className="px-2 py-2.5 text-right tabular-nums">
                          {c.actual > 0 ? <span className="font-semibold text-emerald-700 dark:text-emerald-400">+{formatNumber(c.actual)}</span> : <span className="text-muted-foreground">0</span>}
                        </td>,
                        <td key={`${i}-k`} className={`px-2 py-2.5 text-right font-semibold tabular-nums ${i < lastIdx ? "border-r border-border/60" : ""}`}>
                          {formatNumber(c.cumulative)}
                        </td>,
                      ])}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Satu petani dihitung sekali per paket; baris terakhir menghitung petani yang mengikuti minimal satu pelatihan
              (paket apa pun, termasuk Lainnya) pada tahun pertama ia ikut. Kumulative tahun {currentYear} sama dengan jumlah
              petani sudah dilatih di kartu Capaian Paket per Distrik (tanpa filter tahun). Mengikuti filter Distrik & Lembaga; filter Tahun tidak
              berlaku untuk kartu ini.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
