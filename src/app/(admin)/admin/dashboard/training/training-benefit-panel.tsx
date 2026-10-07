"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  trainingBenefitPerYear,
  type TrainingBenefitRow,
  type TrainingBenefitYear,
} from "@/lib/training-dashboard-aggregation";
import type { TrainingGroupEntry } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";
import {
  buildProgramTargetGrid,
  programContractRows,
  type ContractCell,
  type ContractRow,
  type ProgramTargetRecord,
} from "@/lib/program-target";

const yearLabel = (y: TrainingBenefitYear) => (y.upTo ? `≤ ${y.year}` : String(y.year));
const segmentLabel = (y: TrainingBenefitYear) => (y.upTo ? `s.d. ${y.year}` : `baru ${y.year}`);

/** Segmen per kolom tahun: tua → muda (≤ t−2 · baru t−1 · baru t). */
const SEGMENT_CLASS = [
  "bg-emerald-800 text-white dark:bg-emerald-700",
  "bg-emerald-500 text-white",
  "bg-emerald-300 text-emerald-950 dark:bg-emerald-300",
];
/** Angka ditulis di dalam segmen bila segmen ≥ porsi ini dari lebar trek (sisanya di tooltip). */
const MIN_LABEL_SHARE = 0.09;

/** Satu bar bertumpuk tampilan Grafis: panjang = kumulatif t, segmen = kapan petani pertama dilatih. */
function BenefitBar({ r, years, max, strong = false }: { r: TrainingBenefitRow; years: TrainingBenefitYear[]; max: number; strong?: boolean }) {
  const lastIdx = years.length - 1;
  const total = r.cells[lastIdx].cumulative;
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,20rem)_1fr] sm:items-center sm:gap-4">
      <div className={`truncate text-sm ${strong ? "font-semibold" : "font-medium"}`} title={r.label}>
        {r.label}
      </div>
      <div className="flex items-center gap-2">
        {/* Trek abu netral — bg-muted tema berwarna hijau muda, tak terbedakan dari segmen terang. */}
        <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
          <div className="flex h-full" style={{ width: `${(total / max) * 100}%` }}>
            {r.cells.map((c, i) =>
              c.actual > 0 ? (
                <div
                  key={years[i].year}
                  className={`flex h-full items-center justify-center overflow-hidden text-[11px] font-semibold tabular-nums ${SEGMENT_CLASS[i]}`}
                  style={{ width: `${(c.actual / total) * 100}%` }}
                  title={`${formatNumber(c.actual)} petani ${segmentLabel(years[i])}`}
                >
                  {c.actual / max >= MIN_LABEL_SHARE && (i === 0 ? formatNumber(c.actual) : `+${formatNumber(c.actual)}`)}
                </div>
              ) : null,
            )}
          </div>
        </div>
        <span className={`w-14 shrink-0 text-right tabular-nums ${strong ? "font-bold" : "font-semibold"}`}>{formatNumber(total)}</span>
      </div>
    </div>
  );
}

function ContractCellView({ c }: { c: ContractCell }) {
  const pct = c.pct;
  const bar = pct == null ? 0 : Math.min(pct, 100);
  const tone = pct == null ? "bg-muted-foreground/30" : pct >= 100 ? "bg-emerald-600" : pct >= 50 ? "bg-emerald-400" : "bg-amber-400";
  return (
    <div className="min-w-[7.5rem] space-y-1 text-right">
      <div className="tabular-nums">
        <span className="font-semibold">{formatNumber(c.actual)}</span>
        <span className="text-muted-foreground"> / {c.target == null ? "—" : formatNumber(c.target)}</span>
      </div>
      <div className="flex items-center justify-end gap-1.5">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${bar}%` }} />
        </div>
        <span className="w-12 text-xs tabular-nums text-muted-foreground">{pct == null ? "—" : `${pct.toLocaleString("id-ID", { maximumFractionDigits: 0 })}%`}</span>
      </div>
    </div>
  );
}

/**
 * Tampilan vs Kontrak (#403): target kontrak (seluruh program) vs realisasi penerima manfaat
 * baru — baris 1 ↔ Paket 1, baris 2 ↔ Paket 3 & 4; Start ↔ kumulatif s.d. tahun baseline;
 * hanya tahun bertarget. Realisasi ikut filter Distrik/Lembaga → catatan bila filter aktif.
 */
function ContractView({ targets, groups, filterActive }: { targets: ProgramTargetRecord[] | null; groups: TrainingGroupEntry[]; filterActive: boolean }) {
  const grid = useMemo(() => (targets ? buildProgramTargetGrid(targets) : null), [targets]);
  const rows: ContractRow[] = useMemo(() => (grid ? programContractRows(grid, groups) : []), [grid, groups]);
  if (targets == null) {
    return <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Target kontrak gagal dimuat. Muat ulang halaman.</div>;
  }
  if (!grid || (grid.years.length === 0 && grid.baselineYear == null)) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Belum ada target kontrak. Isi lewat menu <b>Master Data › Target Program</b>.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {filterActive && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Filter Distrik/Lembaga aktif: <b>realisasi</b> hanya untuk wilayah terpilih, sedangkan <b>target</b> berlaku untuk seluruh program — % capaian
          di sini bukan capaian program.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-4 text-left">Kontrak</th>
              {grid.baselineYear != null && (
                <th className="px-2 py-2 text-right" title={`Start of the Program — kumulatif s.d. ${grid.baselineYear}`}>
                  Start · s.d. {grid.baselineYear}
                </th>
              )}
              {grid.years.map((y) => (
                <th key={y} className="px-2 py-2 text-right">
                  {y}
                </th>
              ))}
            </tr>
            <tr className="text-[10px] text-muted-foreground">
              <th />
              {grid.baselineYear != null && <th className="px-2 pb-2 text-right font-normal">realisasi / target</th>}
              {grid.years.map((y) => (
                <th key={y} className="px-2 pb-2 text-right font-normal">
                  baru / target
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.key === "TOTAL" ? "border-t-2 border-border font-semibold" : "border-b border-border/40"}>
                <td className={`max-w-[22rem] py-2.5 pr-4 ${r.key === "TOTAL" ? "italic" : "font-medium"}`}>{r.label}</td>
                {grid.baselineYear != null && <td className="px-2 py-2.5">{r.start ? <ContractCellView c={r.start} /> : null}</td>}
                {r.years.map((c, i) => (
                  <td key={grid.years[i]} className="px-2 py-2.5">
                    <ContractCellView c={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Realisasi = penerima manfaat baru (pertama kali dilatih paket itu) — baris pertama dari Paket 1, baris kedua dari Paket 3 &amp; 4;
        Start = kumulatif s.d. tahun baseline. Baris total menjumlahkan kedua baris, sama seperti target kontrak.
      </p>
    </div>
  );
}

/**
 * Tampilan Grafis (#402, pilihan owner 2026-10-07: toggle Tabel | Grafis dalam satu kartu) —
 * paket yang tumbuh pesat tahun ini terlihat dari lebar segmen terangnya.
 */
function BenefitChart({ years, rows, any }: { years: TrainingBenefitYear[]; rows: TrainingBenefitRow[]; any: TrainingBenefitRow }) {
  const lastIdx = years.length - 1;
  const max = Math.max(1, ...[...rows, any].map((r) => r.cells[lastIdx].cumulative));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {years.map((y, i) => (
          <span key={y.year} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${SEGMENT_CLASS[i]}`} />
            {segmentLabel(y)}
          </span>
        ))}
        <span className="ml-auto">Angka di ujung = kumulatif s.d. {years[lastIdx].year}</span>
      </div>
      {rows.map((r) => (
        <BenefitBar key={r.code} r={r} years={years} max={max} />
      ))}
      <div className="border-t pt-3">
        <BenefitBar r={any} years={years} max={max} strong />
      </div>
    </div>
  );
}

/**
 * Card full-row "Training Benefit per year" (#402): per paket, penerima manfaat baru
 * (Actual) dan kumulatif per tahun — kolom ≤ (t−2) · t−1 · t bergeser otomatis.
 * Ikut filter Distrik/Lembaga; filter Tahun diabaikan (kartu sudah per tahun).
 */
export function TrainingBenefitPanel({
  groups,
  canExport,
  scopeLabel,
  programTargets,
  filterActive,
}: {
  /** Lembaga hasil filter Distrik/Lembaga — TANPA saring tahun. */
  groups: TrainingGroupEntry[];
  canExport: boolean;
  /** Nama Distrik/Lembaga aktif untuk nama berkas ekspor (null = semua). */
  scopeLabel: string | null;
  /** Target kontrak (#403); null = gagal dimuat. */
  programTargets: ProgramTargetRecord[] | null;
  filterActive: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [view, setView] = useState<"tabel" | "grafis" | "kontrak">("tabel");
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
          {open && (
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex rounded-md border bg-muted/40 p-0.5" role="group" aria-label="Tampilan">
                {(["tabel", "grafis", "kontrak"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                      view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v === "tabel" ? "Tabel" : v === "grafis" ? "Grafis" : "vs Kontrak"}
                  </button>
                ))}
              </div>
              {canExport && (
                <Button variant="outline" size="sm" className="h-8 gap-2" onClick={exportExcel} title="Unduh dalam format tabel donor">
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
              )}
            </div>
          )}
        </div>
        <CollapsibleContent>
          <CardContent className="border-t pt-4">
            {view === "kontrak" ? (
              <ContractView targets={programTargets} groups={groups} filterActive={filterActive} />
            ) : view === "grafis" ? (
              <BenefitChart years={years} rows={rows} any={any} />
            ) : (
              <div className="overflow-x-auto">
                {/* Format tabel donor; header netral (owner 2026-10-07: fokus pada capaian, bukan
                    tahun — pita tahun berwarna terlalu mencolok): kolom proporsional, rata tengah. */}
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[34%]" />
                    {years.flatMap((y) => [<col key={`${y.year}-a`} />, <col key={`${y.year}-k`} />])}
                  </colgroup>
                  <thead>
                    <tr>
                      <th
                        rowSpan={2}
                        className="border-b border-border px-3 py-2 text-left align-bottom text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Package
                      </th>
                      {years.map((y) => (
                        <th
                          key={y.year}
                          colSpan={2}
                          className="border-l border-border/60 px-2 pt-2 pb-1 text-center text-xs font-semibold tabular-nums text-foreground"
                          title={y.upTo ? `Tahun ${y.year} dan sebelumnya` : undefined}
                        >
                          {yearLabel(y)}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {years.flatMap((y) => [
                        <th key={`${y.year}-a`} className="border-l border-border/60 px-2 py-1.5 text-center" title="Penerima manfaat baru pada tahun tsb">
                          Actual
                        </th>,
                        <th key={`${y.year}-k`} className="px-2 py-1.5 text-center" title="Total s.d. akhir tahun tsb">
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
                        <td className={`truncate px-3 py-2.5 ${r.code === "ANY" ? "font-semibold" : "font-medium"}`} title={r.label}>
                          {r.label}
                        </td>
                        {r.cells.flatMap((c, i) => [
                          <td key={`${i}-a`} className="border-l border-border/60 px-2 py-2.5 text-center tabular-nums">
                            {c.actual > 0 ? <span className="font-semibold text-emerald-700 dark:text-emerald-400">+{formatNumber(c.actual)}</span> : <span className="text-muted-foreground">0</span>}
                          </td>,
                          <td key={`${i}-k`} className="px-2 py-2.5 text-center font-semibold tabular-nums">
                            {formatNumber(c.cumulative)}
                          </td>,
                        ])}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
