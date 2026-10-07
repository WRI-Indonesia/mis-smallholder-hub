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

interface TrajectoryPoint {
  label: string;
  target: number;
  actual: number | null; // null = tahun belum berjalan
}

/** Titik kumulatif target & realisasi: Start lalu tiap tahun bertarget; realisasi berhenti di tahun berjalan. */
function trajectory(row: ContractRow, baselineYear: number | null, years: number[], currentYear: number): TrajectoryPoint[] {
  const pts: TrajectoryPoint[] = [];
  let t = row.start?.target ?? 0;
  let a = row.start?.actual ?? 0;
  if (baselineYear != null) pts.push({ label: `s.d. ${baselineYear}`, target: t, actual: a });
  years.forEach((y, i) => {
    t += row.years[i].target ?? 0;
    a += row.years[i].actual;
    pts.push({ label: String(y), target: t, actual: y <= currentYear ? a : null });
  });
  return pts;
}

const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}k` : String(n));

/**
 * Grafik trayektori satu baris kontrak (#403, pilihan owner 2026-10-07): garis putus-putus =
 * target kumulatif kontrak, garis tegas = realisasi kumulatif s.d. tahun berjalan. Jarak
 * keduanya di tahun berjalan diberi label tertinggal / di atas target.
 */
function TrajectoryChart({ points, currentLabel }: { points: TrajectoryPoint[]; currentLabel: string }) {
  const W = 380, H = 190, L = 44, R = 16, T = 16, B = 28;
  const max = Math.max(1, ...points.map((p) => Math.max(p.target, p.actual ?? 0))) * 1.08;
  const x = (i: number) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const path = (vals: (number | null)[]) =>
    vals.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(" ");
  const real = points.map((p) => p.actual);
  const lastReal = real.reduce<number>((acc, v, i) => (v != null ? i : acc), -1);
  const curIdx = points.findIndex((p) => p.label === currentLabel);
  const gapIdx = curIdx >= 0 && points[curIdx].actual != null ? curIdx : lastReal;
  const gap = gapIdx >= 0 ? (points[gapIdx].actual ?? 0) - points[gapIdx].target : 0;
  const ticks = [0, 0.5, 1].map((f) => Math.round((max / 1.08) * f));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Trayektori target kontrak vs realisasi">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-border" strokeDasharray="2 3" />
          <text x={L - 6} y={y(v) + 3} textAnchor="end" className="fill-muted-foreground text-[9px] tabular-nums">
            {fmtK(v)}
          </text>
        </g>
      ))}
      {curIdx >= 0 && <rect x={x(curIdx) - 14} y={T} width={28} height={H - T - B} className="fill-emerald-500/10" rx={4} />}
      {points.map((p, i) => (
        <text key={p.label} x={x(i)} y={H - 10} textAnchor="middle" className={`text-[9.5px] ${i === curIdx ? "fill-foreground font-semibold" : "fill-muted-foreground"}`}>
          {p.label}
        </text>
      ))}
      <polyline points={path(points.map((p) => p.target))} fill="none" className="stroke-slate-400" strokeWidth={2} strokeDasharray="5 4" />
      {points.map((p, i) => (
        <circle key={`t${i}`} cx={x(i)} cy={y(p.target)} r={3.5} className="fill-background stroke-slate-400" strokeWidth={1.5}>
          <title>{`Target kumulatif ${p.label}: ${formatNumber(p.target)}`}</title>
        </circle>
      ))}
      <polyline points={path(real)} fill="none" className="stroke-emerald-600" strokeWidth={2.75} />
      {points.map((p, i) =>
        p.actual == null ? null : (
          <circle key={`a${i}`} cx={x(i)} cy={y(p.actual)} r={4} className="fill-emerald-600">
            <title>{`Realisasi kumulatif ${p.label}: ${formatNumber(p.actual)}`}</title>
          </circle>
        ),
      )}
      {gapIdx >= 0 && gap !== 0 && (
        <text
          x={Math.min(x(gapIdx) + 8, W - R)}
          y={(y(points[gapIdx].target) + y(points[gapIdx].actual ?? 0)) / 2 + 3}
          textAnchor={x(gapIdx) + 8 > W - R - 60 ? "end" : "start"}
          className={`text-[10px] font-semibold ${gap < 0 ? "fill-amber-600" : "fill-emerald-700"}`}
        >
          {gap < 0 ? `tertinggal ${formatNumber(-gap)}` : `+${formatNumber(gap)} di atas target`}
        </text>
      )}
    </svg>
  );
}

/**
 * Tampilan vs Kontrak (#403): satu grafik trayektori per baris kontrak (target seluruh program)
 * + capaian terhadap total kontrak. Baris 1 ↔ Paket 1, baris 2 ↔ Paket 3 & 4. Realisasi ikut
 * filter Distrik/Lembaga → catatan bila filter aktif.
 */
function ContractView({ targets, groups, filterActive }: { targets: ProgramTargetRecord[] | null; groups: TrainingGroupEntry[]; filterActive: boolean }) {
  const grid = useMemo(() => (targets ? buildProgramTargetGrid(targets) : null), [targets]);
  const rows: ContractRow[] = useMemo(() => (grid ? programContractRows(grid, groups) : []), [grid, groups]);
  const currentYear = new Date().getFullYear();
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
  const contractRows = rows.filter((r) => r.key !== "TOTAL");
  const totalRow = rows.find((r) => r.key === "TOTAL");
  const curIdx = grid.years.indexOf(currentYear);
  const totalNow = totalRow && curIdx >= 0 ? totalRow.years[curIdx] : null;
  return (
    <div className="space-y-4">
      {filterActive && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Filter Distrik/Lembaga aktif: <b>realisasi</b> hanya untuk wilayah terpilih, sedangkan <b>target</b> berlaku untuk seluruh program.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {contractRows.map((r) => {
          const pts = trajectory(r, grid.baselineYear, grid.years, currentYear);
          const total = pts.at(-1)?.target ?? 0;
          const realized = [...pts].reverse().find((p) => p.actual != null)?.actual ?? 0;
          const pct = total > 0 ? Math.round((realized / total) * 100) : null;
          return (
            <div key={r.key} className="rounded-lg border p-4">
              {/* Judul kecil, angka capaian besar (owner 2026-10-07). */}
              <div className="text-xs font-medium leading-snug text-muted-foreground" title={r.label}>
                {r.label}
              </div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-3xl font-bold tabular-nums leading-none">{formatNumber(realized)}</span>
                  <span className="ml-1.5 text-sm text-muted-foreground">
                    dari <span className="font-semibold tabular-nums text-foreground">{formatNumber(total)}</span> petani · total kontrak
                  </span>
                </div>
                {pct != null && <div className="shrink-0 text-4xl font-bold tabular-nums leading-none text-emerald-700 dark:text-emerald-400">{pct}%</div>}
              </div>
              <div className="mt-2">
                <TrajectoryChart points={pts} currentLabel={String(currentYear)} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-emerald-600" /> realisasi kumulatif
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dashed border-slate-400" /> target kontrak kumulatif
        </span>
        {totalNow && totalNow.target != null && (
          <span className="ml-auto">
            {totalRow!.label} {currentYear}:{" "}
            <b className="text-foreground tabular-nums">{formatNumber(totalNow.actual)}</b> / {formatNumber(totalNow.target)}
            {totalNow.pct != null && ` (${Math.round(totalNow.pct)}%)`}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * SEMENTARA (owner 2026-10-07, untuk dibandingkan dengan trayektori): progres menuju TOTAL
 * kontrak — bar kumulatif realisasi vs total, penanda target s.d. tahun berjalan, chip status
 * per periode (tahun mendatang = "belum mulai", bukan 0%). Hapus salah satu setelah owner memilih.
 */
function ContractProgressView({ targets, groups, filterActive }: { targets: ProgramTargetRecord[] | null; groups: TrainingGroupEntry[]; filterActive: boolean }) {
  const grid = useMemo(() => (targets ? buildProgramTargetGrid(targets) : null), [targets]);
  const rows: ContractRow[] = useMemo(() => (grid ? programContractRows(grid, groups) : []), [grid, groups]);
  const currentYear = new Date().getFullYear();
  if (!grid || targets == null || (grid.years.length === 0 && grid.baselineYear == null)) {
    return <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada target kontrak.</div>;
  }
  const totalRow = rows.find((r) => r.key === "TOTAL");
  const curIdx = grid.years.indexOf(currentYear);
  return (
    <div className="space-y-5">
      {filterActive && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Filter Distrik/Lembaga aktif: <b>realisasi</b> hanya untuk wilayah terpilih, sedangkan <b>target</b> berlaku untuk seluruh program.
        </p>
      )}
      {rows
        .filter((r) => r.key !== "TOTAL")
        .map((r) => {
          const pts = trajectory(r, grid.baselineYear, grid.years, currentYear);
          const total = pts.at(-1)?.target ?? 0;
          const realized = [...pts].reverse().find((p) => p.actual != null)?.actual ?? 0;
          const toDate = [...pts].reverse().find((p) => p.actual != null)?.target ?? 0;
          const pct = total > 0 ? Math.round((realized / total) * 100) : 0;
          const gap = realized - toDate;
          const chips = [
            ...(r.start && grid.baselineYear != null ? [{ label: `Start s.d. ${grid.baselineYear}`, c: r.start, future: false }] : []),
            ...grid.years.map((y, i) => ({ label: String(y), c: r.years[i], future: y > currentYear })),
          ];
          return (
            <div key={r.key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0 text-sm font-semibold">{r.label}</div>
                <div className="shrink-0 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{pct}%</div>
              </div>
              <div className="relative h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, total > 0 ? (realized / total) * 100 : 0)}%` }} />
                {total > 0 && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-slate-700 dark:bg-slate-200"
                    style={{ left: `${Math.min(100, (toDate / total) * 100)}%` }}
                    title={`Target s.d. ${currentYear}: ${formatNumber(toDate)}`}
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  <b className="text-foreground tabular-nums">{formatNumber(realized)}</b> dari {formatNumber(total)} petani (total kontrak) · ▏target s.d. {currentYear}:{" "}
                  {formatNumber(toDate)}
                </span>
                {gap < 0 ? (
                  <span className="font-semibold text-amber-600">⚠ tertinggal {formatNumber(-gap)}</span>
                ) : (
                  <span className="font-semibold text-emerald-700">✓ sesuai target</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {chips.map(({ label, c, future }) => {
                  const ok = c.pct != null && c.pct >= 100;
                  return (
                    <span
                      key={label}
                      className={`rounded-md border px-2 py-1 text-xs tabular-nums ${
                        future ? "border-dashed text-muted-foreground" : ok ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                      }`}
                    >
                      <span className="font-semibold">{label}</span>{" "}
                      {future ? (
                        <>— target {c.target == null ? "—" : formatNumber(c.target)}, belum mulai</>
                      ) : (
                        <>
                          {ok ? "✓" : "▲"} {formatNumber(c.actual)} / {c.target == null ? "—" : formatNumber(c.target)}
                          {c.pct != null && ` (${Math.round(c.pct)}%)`}
                        </>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      {totalRow && curIdx >= 0 && totalRow.years[curIdx].target != null && (
        <p className="border-t pt-3 text-xs text-muted-foreground">
          {totalRow.label} {currentYear}: <b className="text-foreground tabular-nums">{formatNumber(totalRow.years[curIdx].actual)}</b> /{" "}
          {formatNumber(totalRow.years[curIdx].target!)} ({Math.round(totalRow.years[curIdx].pct ?? 0)}%)
        </p>
      )}
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
  const [view, setView] = useState<"tabel" | "grafis" | "kontrak" | "progres">("tabel");
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
                {(["tabel", "grafis", "kontrak", "progres"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                      view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v === "tabel" ? "Tabel" : v === "grafis" ? "Grafis" : v === "kontrak" ? "vs Kontrak" : "Progres (uji)"}
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
            {view === "progres" ? (
              <ContractProgressView targets={programTargets} groups={groups} filterActive={filterActive} />
            ) : view === "kontrak" ? (
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
            {view !== "kontrak" && view !== "progres" && (
              <p className="mt-3 text-xs text-muted-foreground">
              Satu petani dihitung sekali per paket; baris terakhir menghitung petani yang mengikuti minimal satu pelatihan
              (paket apa pun, termasuk Lainnya) pada tahun pertama ia ikut. Kumulative tahun {currentYear} sama dengan jumlah
              petani sudah dilatih di kartu Capaian Paket per Distrik (tanpa filter tahun). Mengikuti filter Distrik & Lembaga; filter Tahun tidak
              berlaku untuk kartu ini.
            </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
