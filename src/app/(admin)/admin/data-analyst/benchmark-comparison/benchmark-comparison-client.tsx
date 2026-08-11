"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { BENCHMARK_METRICS } from "@/lib/benchmark-comparison";
import type {
  BenchmarkComparisonRow,
  BenchmarkComparisonView,
  BenchmarkDistrictSection,
  BenchmarkMetricKey,
} from "@/types/benchmark-comparison";
import { Download, Pencil, Search, StickyNote } from "lucide-react";
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

/** % capaian MIS terhadap acuan (bisa >100 bila MIS melebihi acuan). */
function pctDone(reference: number | null | undefined, mis: number): number | null {
  if (reference == null || reference <= 0) return null;
  return Math.round((mis / reference) * 100);
}

/** Band gap relatif untuk sel matriks ringkas: warna sel, chip tooltip, dan bar capaian. */
type GapBand = "empty" | "match" | "small" | "medium" | "large";

function gapBand(diff: number | null, reference: number | null | undefined): GapBand {
  if (diff === null || reference == null) return "empty";
  if (diff === 0) return "match";
  const rel = Math.abs(diff) / Math.max(Math.abs(reference), 1);
  if (rel <= 0.05) return "small";
  if (rel <= 0.2) return "medium";
  return "large";
}

const GAP_CELL: Record<GapBand, string> = {
  empty: "text-muted-foreground/60",
  match: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  small: "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200",
  medium: "bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100 font-medium",
  large: "bg-red-200 text-red-950 dark:bg-red-950/80 dark:text-red-200 font-semibold",
};

const GAP_CHIP: Record<GapBand, string> = {
  empty: "bg-slate-400",
  match: "bg-emerald-400",
  small: "bg-amber-300",
  medium: "bg-amber-500",
  large: "bg-red-500",
};

function diffCellClass(diff: number | null): string {
  if (diff === null) return "text-muted-foreground";
  if (diff === 0) return "text-emerald-700 dark:text-emerald-400";
  return "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-semibold";
}

/** Skor untuk urutan "paling bermasalah": banyak metrik selisih dulu, lalu gap relatif terbesar. */
function problemScore(row: BenchmarkComparisonRow): [number, number] {
  let maxRel = 0;
  for (const m of BENCHMARK_METRICS) {
    const diff = row.diff[m.key];
    const ref = row.reference?.[m.key];
    if (diff != null && diff !== 0 && ref != null && ref > 0) {
      maxRel = Math.max(maxRel, Math.abs(diff) / ref);
    }
  }
  return [row.diffSummary.length, maxRel];
}

export function BenchmarkComparisonClient({ view, canEdit }: Props) {
  const { get, setMany } = useUrlFilters();
  const [editing, setEditing] = useState<BenchmarkComparisonRow | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const mode = get("mode") === "detail" ? "detail" : "ringkas";
  const districtFilter = get("distrik") ?? "all";
  const onlyDiff = get("selisih") === "1";
  const sortBy = get("urut") === "masalah" ? "masalah" : "kode";
  const [search, setSearch] = useState(get("q") ?? "");

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return view.sections
      .filter((s) => districtFilter === "all" || s.districtId === districtFilter)
      .map((section) => {
        let rows = section.rows;
        if (onlyDiff) rows = rows.filter((r) => r.diffSummary.length > 0);
        if (q) {
          rows = rows.filter((r) =>
            [r.name, r.code ?? "", r.abrv ?? ""].some((t) => t.toLowerCase().includes(q))
          );
        }
        if (sortBy === "masalah") {
          rows = [...rows].sort((a, b) => {
            const [aCount, aRel] = problemScore(a);
            const [bCount, bRel] = problemScore(b);
            return bCount - aCount || bRel - aRel || (a.code ?? "").localeCompare(b.code ?? "");
          });
        }
        return { ...section, rows };
      })
      .filter((s) => s.rows.length > 0);
  }, [view.sections, districtFilter, onlyDiff, search, sortBy]);

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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Tabs value={mode} onValueChange={(v) => setMany({ mode: v === "detail" ? "detail" : null })}>
          <TabsList>
            <TabsTrigger value="ringkas">Ringkas</TabsTrigger>
            <TabsTrigger value="detail">Detail</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={districtFilter}
          onValueChange={(v) => setMany({ distrik: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua distrik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua distrik</SelectItem>
            {view.sections.map((s) => (
              <SelectItem key={s.districtId} value={s.districtId}>
                {s.districtName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setMany({ urut: v === "masalah" ? "masalah" : null })}>
          <SelectTrigger className="w-[210px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kode">Urut kode lembaga</SelectItem>
            <SelectItem value="masalah">Urut paling bermasalah</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="only-diff"
            checked={onlyDiff}
            onChange={(e) => setMany({ selisih: e.target.checked ? "1" : null })}
          />
          <Label htmlFor="only-diff" className="text-sm font-normal">
            Hanya yang masih selisih
          </Label>
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setMany({ q: e.target.value.trim() || null });
            }}
            placeholder="Cari lembaga..."
            className="pl-8"
          />
        </div>
      </div>

      {mode === "ringkas" && (
        <p className="text-xs text-muted-foreground">
          Angka sel = selisih (acuan − MIS), persen = capaian MIS terhadap acuan. Warna:{" "}
          <span className="text-emerald-700 dark:text-emerald-400 font-medium">hijau</span> cocok ·{" "}
          <span className="text-amber-700 dark:text-amber-300 font-medium">kuning</span> gap ≤20% ·{" "}
          <span className="text-red-700 dark:text-red-300 font-medium">merah</span> gap &gt;20% ·
          abu-abu = acuan belum diisi. Arahkan kursor ke sel untuk rincian.
        </p>
      )}

      {filteredSections.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada lembaga yang cocok dengan filter — longgarkan pencarian atau matikan
            &ldquo;Hanya yang masih selisih&rdquo;.
          </CardContent>
        </Card>
      )}

      {filteredSections.map((section) =>
        mode === "ringkas" ? (
          <CompactSection
            key={section.districtId}
            section={section}
            canEdit={canEdit}
            onEdit={setEditing}
          />
        ) : (
          <DetailSection
            key={section.districtId}
            section={section}
            canEdit={canEdit}
            onEdit={setEditing}
          />
        )
      )}

      <BenchmarkFormModal open={!!editing} onClose={() => setEditing(null)} row={editing} />
    </div>
  );
}

// ── Mode ringkas: matriks Δ (satu sel per metrik) ────────────────────────────

function CompactSection({
  section,
  canEdit,
  onEdit,
}: {
  section: BenchmarkDistrictSection;
  canEdit: boolean;
  onEdit: (row: BenchmarkComparisonRow) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <h2 className="font-semibold">{section.districtName}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="sticky left-0 bg-muted text-left p-2 min-w-[220px] z-10">
                  Lembaga Petani
                </th>
                {BENCHMARK_METRICS.map((m) => (
                  <th key={m.key} className="p-2 text-center border-l font-medium min-w-[86px]">
                    {m.label.replace("Training ", "")}
                  </th>
                ))}
                {canEdit && <th className="p-2 w-12" />}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr key={row.farmerGroupId} className="border-b hover:bg-muted/30">
                  <td className="sticky left-0 bg-background p-2 z-10">
                    <RowLabel row={row} />
                  </td>
                  {BENCHMARK_METRICS.map((m) => (
                    <CompactCell key={m.key} row={row} metric={m} />
                  ))}
                  {canEdit && (
                    <td className="p-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit acuan ${row.name}`}
                        onClick={() => onEdit(row)}
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
                  const pct = pctDone(ref, mis);
                  return (
                    <td key={m.key} className="p-1 text-center border-l tabular-nums">
                      <Tooltip>
                        <TooltipTrigger
                          render={<div className="w-full rounded-md px-1.5 py-0.5 cursor-default" />}
                        >
                          <span className="block">{formatValue(delta, m.decimal)}</span>
                          {pct !== null && (
                            <span className="block text-[11px] font-normal text-muted-foreground">
                              {pct}%
                            </span>
                          )}
                        </TooltipTrigger>
                        <StatTooltipContent
                          title={`${m.label} — total`}
                          subtitle={`${section.districtName} · acuan dijumlah hanya dari lembaga yang terisi`}
                        >
                          <StatTooltipRow chip="bg-slate-400" label="Acuan" value={formatValue(ref, m.decimal)} />
                          <StatTooltipRow chip="bg-sky-400" label="MIS" value={formatValue(mis, m.decimal)} />
                          <StatTooltipRow
                            chip={GAP_CHIP[gapBand(delta === 0 ? 0 : delta, ref)]}
                            label="Selisih"
                            value={formatValue(delta, m.decimal)}
                          />
                          {pct !== null && <CapaianBar pct={pct} band={gapBand(delta === 0 ? 0 : delta, ref)} />}
                        </StatTooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactCell({
  row,
  metric,
}: {
  row: BenchmarkComparisonRow;
  metric: (typeof BENCHMARK_METRICS)[number];
}) {
  const diff = row.diff[metric.key];
  const ref = row.reference?.[metric.key];
  const mis = row.mis[metric.key];
  const pct = pctDone(ref, mis);
  const band = gapBand(diff, ref);

  return (
    <td className="p-1 border-l">
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              className={`w-full rounded-md px-1.5 py-1 text-center tabular-nums cursor-default ${GAP_CELL[band]}`}
            />
          }
        >
          {diff === null ? (
            <span>—</span>
          ) : diff === 0 ? (
            <span>✓</span>
          ) : (
            <>
              <span className="block">{formatValue(diff, metric.decimal)}</span>
              {pct !== null && (
                <span className="block text-[11px] font-normal opacity-80">{pct}%</span>
              )}
            </>
          )}
        </TooltipTrigger>
        <StatTooltipContent
          title={metric.label}
          subtitle={row.name}
          footer={
            ref == null
              ? "Acuan belum diisi — isi lewat tombol pensil di ujung baris"
              : diff === 0
                ? "Cocok — MIS sudah sesuai acuan"
                : diff !== null && diff < 0
                  ? "MIS melebihi acuan — cek apakah acuannya perlu diperbarui"
                  : `Masih kurang ${formatValue(diff, metric.decimal)} untuk mengejar acuan`
          }
        >
          <StatTooltipRow
            chip="bg-slate-400"
            label="Acuan"
            value={ref == null ? "—" : formatValue(ref, metric.decimal)}
          />
          <StatTooltipRow chip="bg-sky-400" label="MIS (live)" value={formatValue(mis, metric.decimal)} />
          {diff !== null && (
            <StatTooltipRow
              chip={GAP_CHIP[band]}
              label="Selisih"
              value={formatValue(diff, metric.decimal)}
            />
          )}
          {pct !== null && <CapaianBar pct={pct} band={band} />}
        </StatTooltipContent>
      </Tooltip>
    </td>
  );
}

const GAP_BAR: Record<GapBand, string> = {
  empty: "bg-slate-400",
  match: "bg-emerald-400",
  small: "bg-amber-400",
  medium: "bg-amber-500",
  large: "bg-red-500",
};

/** Bar capaian MIS terhadap acuan di dalam tooltip (maks tampilan 100%). */
function CapaianBar({ pct, band }: { pct: number; band: GapBand }) {
  return (
    <div className="mt-1 w-44">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/25">
        <div
          className={`h-full rounded-full ${GAP_BAR[band]}`}
          style={{ width: `${Math.max(2, Math.min(pct, 100))}%` }}
        />
      </div>
      <p className="mt-0.5 text-[11px] text-background/70">Capaian {pct}% dari acuan</p>
    </div>
  );
}

function RowLabel({ row }: { row: BenchmarkComparisonRow }) {
  return (
    <>
      <p className="font-medium">{row.name}</p>
      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
        {row.code && <span className="text-xs text-muted-foreground">{row.code}</span>}
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
    </>
  );
}

// ── Mode detail: blok Acuan | MIS | Δ per metrik ─────────────────────────────

function DetailSection({
  section,
  canEdit,
  onEdit,
}: {
  section: BenchmarkDistrictSection;
  canEdit: boolean;
  onEdit: (row: BenchmarkComparisonRow) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <h2 className="font-semibold">{section.districtName}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th rowSpan={2} className="sticky left-0 bg-muted text-left p-2 min-w-[220px] z-10">
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
                    <RowLabel row={row} />
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
                        onClick={() => onEdit(row)}
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
