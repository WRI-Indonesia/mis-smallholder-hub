"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BENCHMARK_METRICS } from "@/lib/benchmark-comparison";
import type {
  BenchmarkComparisonRow,
  BenchmarkComparisonView,
  BenchmarkMetricKey,
} from "@/types/benchmark-comparison";
import { Download, Pencil, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { BenchmarkFormModal } from "./benchmark-form-modal";

interface Props {
  view: BenchmarkComparisonView;
  canEdit: boolean;
}

function formatValue(value: number | null | undefined, decimal: boolean): string {
  if (value == null) return "—";
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimal ? 2 : 0,
  });
}

function diffCellClass(diff: number | null): string {
  if (diff === null) return "text-muted-foreground";
  if (diff === 0) return "text-emerald-700 dark:text-emerald-400";
  return "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-semibold";
}

export function BenchmarkComparisonClient({ view, canEdit }: Props) {
  const [editing, setEditing] = useState<BenchmarkComparisonRow | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function onExport() {
    setIsExporting(true);
    try {
      const { exportToExcel } = await import("@/lib/xlsx");
      const columns = [
        { header: "Distrik", key: "district" },
        { header: "Kode", key: "code" },
        { header: "Lembaga Petani", key: "name" },
        ...BENCHMARK_METRICS.flatMap((m) => [
          { header: `${m.label} — Acuan`, key: `${m.key}_ref` },
          { header: `${m.label} — MIS`, key: `${m.key}_mis` },
          { header: `${m.label} — Selisih`, key: `${m.key}_diff` },
        ]),
        { header: "Metrik Masih Selisih", key: "diffSummary", width: 40 },
        { header: "Catatan", key: "notes", width: 40 },
      ];
      const data = view.sections.flatMap((section) =>
        section.rows.map((row) => ({
          district: section.districtName,
          code: row.code ?? "",
          name: row.name,
          ...Object.fromEntries(
            BENCHMARK_METRICS.flatMap((m) => [
              [`${m.key}_ref`, row.reference?.[m.key] ?? ""],
              [`${m.key}_mis`, row.mis[m.key]],
              [`${m.key}_diff`, row.diff[m.key] ?? ""],
            ])
          ),
          diffSummary: row.diffSummary.join("; "),
          notes: row.notes ?? "",
        }))
      );
      await exportToExcel({
        filename: `komparasi-data-acuan-${format(new Date(), "yyyyMMdd")}`,
        sheetName: "Komparasi",
        columns,
        data,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Lembaga Petani</p>
            <p className="text-xl font-bold">{view.totalGroups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Masih ada selisih</p>
            <p className="text-xl font-bold text-amber-600">{view.groupsWithDiff}</p>
          </CardContent>
        </Card>
        <div className="ml-auto">
          <Button variant="outline" onClick={onExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Menyiapkan..." : "Ekspor Excel"}
          </Button>
        </div>
      </div>

      {view.sections.map((section) => (
        <Card key={section.districtId}>
          <CardContent className="pt-4 space-y-3">
            <h2 className="font-semibold">{section.districtName}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th
                      rowSpan={2}
                      className="sticky left-0 bg-muted text-left p-2 min-w-[220px] z-10"
                    >
                      Lembaga Petani
                    </th>
                    {BENCHMARK_METRICS.map((m) => (
                      <th key={m.key} colSpan={3} className="p-2 text-center border-l whitespace-nowrap">
                        {m.label}
                      </th>
                    ))}
                    {canEdit && <th rowSpan={2} className="p-2 w-12" />}
                  </tr>
                  <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                    {BENCHMARK_METRICS.map((m) => (
                      <MetricSubHeader key={m.key} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.farmerGroupId} className="border-b hover:bg-muted/30">
                      <td className="sticky left-0 bg-background p-2 z-10">
                        <p className="font-medium">{row.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {row.code && (
                            <span className="text-xs text-muted-foreground">{row.code}</span>
                          )}
                          {!row.reference && (
                            <Badge variant="outline" className="text-xs">
                              acuan belum diisi
                            </Badge>
                          )}
                          {row.reference && row.diffSummary.length === 0 && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs">
                              cocok
                            </Badge>
                          )}
                        </div>
                        {row.notes && (
                          <p
                            className="text-xs text-muted-foreground mt-1 flex items-start gap-1 max-w-[260px]"
                            title={row.notes}
                          >
                            <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2 whitespace-pre-line">{row.notes}</span>
                          </p>
                        )}
                      </td>
                      {BENCHMARK_METRICS.map((m) => (
                        <MetricCells key={m.key} row={row} metricKey={m.key} decimal={m.decimal} />
                      ))}
                      {canEdit && (
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit acuan ${row.name}`}
                            onClick={() => setEditing(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td className="sticky left-0 bg-muted p-2 z-10">TOTAL {section.districtName}</td>
                    {BENCHMARK_METRICS.map((m) => {
                      const ref = section.totals.reference[m.key];
                      const mis = section.totals.mis[m.key];
                      const delta = Math.round((ref - mis) * 100) / 100;
                      return (
                        <MetricTotalsCells
                          key={m.key}
                          reference={ref}
                          mis={mis}
                          diff={delta}
                          decimal={m.decimal}
                        />
                      );
                    })}
                    {canEdit && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      <BenchmarkFormModal open={!!editing} onClose={() => setEditing(null)} row={editing} />
    </div>
  );
}

function MetricSubHeader() {
  return (
    <>
      <th className="p-1.5 text-right border-l font-normal">Acuan</th>
      <th className="p-1.5 text-right font-normal">MIS</th>
      <th className="p-1.5 text-right font-normal">Δ</th>
    </>
  );
}

function MetricCells({
  row,
  metricKey,
  decimal,
}: {
  row: BenchmarkComparisonRow;
  metricKey: BenchmarkMetricKey;
  decimal: boolean;
}) {
  const diff = row.diff[metricKey];
  return (
    <>
      <td className="p-1.5 text-right border-l tabular-nums">
        {formatValue(row.reference?.[metricKey], decimal)}
      </td>
      <td className="p-1.5 text-right tabular-nums">{formatValue(row.mis[metricKey], decimal)}</td>
      <td className={`p-1.5 text-right tabular-nums ${diffCellClass(diff)}`}>
        {diff === null ? "—" : formatValue(diff, decimal)}
      </td>
    </>
  );
}

function MetricTotalsCells({
  reference,
  mis,
  diff,
  decimal,
}: {
  reference: number;
  mis: number;
  diff: number;
  decimal: boolean;
}) {
  return (
    <>
      <td className="p-1.5 text-right border-l tabular-nums">{formatValue(reference, decimal)}</td>
      <td className="p-1.5 text-right tabular-nums">{formatValue(mis, decimal)}</td>
      <td className={`p-1.5 text-right tabular-nums ${diffCellClass(diff)}`}>
        {formatValue(diff, decimal)}
      </td>
    </>
  );
}
