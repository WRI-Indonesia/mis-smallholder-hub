"use client";

// Matriks produksi bulanan berwarna (#239) — dua section collapsible:
// (1) Produksi Bulanan: Jan–Des (Lembaga: Ton; Petani: Kg), gradasi hijau
//     relatif terhadap sel tertinggi + kolom Total & Produktivitas (Ton/Ha);
// (2) Ketersediaan Data Bulanan: lahan pelapor + % per bulan dengan warna
//     threshold selaras palet BMP + ringkasan tahunan Record/Lahan/Luas Terdata.
// Filter All vs Exclude (tanpa PSR & tanaman <3 thn) berlaku untuk keduanya.
// Bila `parcelBreakdown` diberikan (detail Petani — jumlah lahan kecil):
// - matriks produksi mendapat kolom Luas (Ha) + Umur/PSR;
// - switch grouping Tahun › Lahan (baris tahun → expand per lahan) atau
//   Lahan › Tahun (baris lahan → expand per tahun) di kedua matriks.
// Mesin baris (main/sub, expand, dua mode grouping) disatukan di `MatrixBody`
// (TD-033) — tiap tabel hanya menyuplai callback isi selnya.
// Dipakai tab Produksi detail Lembaga Petani (#171) dan detail Petani (#172).

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  ParcelYearBreakdownRow,
  ProductionMatrixVariant,
  ProductionMonthRow,
  ProductionYearRow,
} from "@/lib/production-stats";
import { formatNumber } from "@/lib/format";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// Instance formatter di-cache di level modul — jangan konstruksi per sel per render.
const DEC2_FMT = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const tonFmtCache = new Map<number, Intl.NumberFormat>();
const tonFmt = (digits: number) => {
  let f = tonFmtCache.get(digits);
  if (!f) {
    f = new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits });
    tonFmtCache.set(digits, f);
  }
  return f;
};
const formatDecimal = (n: number) => DEC2_FMT.format(n);
// Persen sel bulanan: bulat, tapi 0<pct<0,5 jangan tampil "0%" (legenda 0% = abu).
const formatCellPct = (pct: number) => {
  const rounded = Math.round(pct);
  return rounded === 0 && pct > 0 ? "<1%" : `${rounded}%`;
};

// Gradasi hijau relatif terhadap sel tertinggi — makin gelap makin tinggi.
const productionCellClass = (ratio: number) => {
  if (ratio > 0.8) return "bg-green-400 text-green-950";
  if (ratio > 0.6) return "bg-green-300 text-green-950";
  if (ratio > 0.4) return "bg-green-200 text-green-900";
  if (ratio > 0.2) return "bg-green-100 text-green-900";
  return "bg-green-50 text-green-900";
};

// Threshold % lahan pelapor — selaras palet kartu kategori BMP.
const availabilityCellClass = (pct: number | null) => {
  if (pct === null || pct === 0) return "bg-slate-100 text-slate-600";
  if (pct >= 80) return "bg-green-100 text-green-800";
  if (pct >= 50) return "bg-lime-100 text-lime-800";
  return "bg-amber-100 text-amber-800";
};

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between text-left"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {open ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

// Sel ringkasan tahunan: angka di atas, persen di baris bawah (konsisten sel bulanan).
function SummaryCell({ value, pct }: { value: string; pct?: number | null }) {
  return (
    <td className="py-1.5 pl-3 text-right tabular-nums align-middle">
      <div className="text-sm font-medium">{value}</div>
      {pct != null && (
        <div className="text-[10px] text-muted-foreground">{formatDecimal(pct)}%</div>
      )}
    </td>
  );
}

// Sel pertama baris utama, ber-chevron bila bisa di-expand.
function ExpandCell({
  label,
  expandable,
  expanded,
}: {
  label: string;
  expandable: boolean;
  expanded: boolean;
}) {
  return (
    <td className="py-1.5 pr-3 text-sm font-medium tabular-nums whitespace-nowrap">
      <span className="inline-flex items-center gap-1">
        {expandable &&
          (expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ))}
        {label}
      </span>
    </td>
  );
}

/** Agregat satu lahan lintas tahun — baris utama mode Lahan › Tahun. */
interface ParcelAgg {
  parcelKey: string;
  label: string;
  area: number | null;
  isPsr: boolean;
  plantingYear: number | null;
  /** Per tahun, terbaru dulu. */
  years: ParcelYearBreakdownRow[];
  totalKg: number;
  recordCount: number;
  /** Rata-rata tahunan: Σ Ton ÷ luas ÷ jumlah tahun ber-data; 0 bila luas tak diketahui. */
  avgTonHa: number;
}

type YearRowEntry = { year: number; data: ProductionYearRow | undefined };

// ── Mesin baris bersama (TD-033) ──
// Satu implementasi untuk 2 tabel × 2 mode grouping: baris utama (tahun atau
// lahan, expandable) + sub-baris (lahan atau tahun). Isi sel disuplai callback;
// struktur baris, wiring expand, dan styling baris hidup di satu tempat.
interface MatrixBodyProps {
  byParcel: boolean;
  yearRows: YearRowEntry[];
  parcelAggs: ParcelAgg[];
  breakdownByYear: Map<number, ParcelYearBreakdownRow[]>;
  monthsByYear: Map<number, Map<number, ProductionMonthRow>>;
  expandedKeys: Set<string>;
  onToggleKey: (key: string) => void;
  /** Sel identitas ekstra setelah kolom pertama (matriks produksi: Luas/Umur). */
  yearIdentityCells?: (y: ProductionYearRow | undefined) => React.ReactNode;
  parcelIdentityCells?: (agg: ParcelAgg) => React.ReactNode;
  subIdentityCells?: (row: ParcelYearBreakdownRow, mode: "year" | "parcel") => React.ReactNode;
  /** Sel bulanan + ringkasan baris utama & sub-baris. */
  yearDataCells: (
    y: ProductionYearRow | undefined,
    byMonth: Map<number, ProductionMonthRow> | undefined,
  ) => React.ReactNode;
  parcelDataCells: (agg: ParcelAgg) => React.ReactNode;
  subDataCells: (row: ParcelYearBreakdownRow) => React.ReactNode;
}

function MatrixBody({
  byParcel,
  yearRows,
  parcelAggs,
  breakdownByYear,
  monthsByYear,
  expandedKeys,
  onToggleKey,
  yearIdentityCells,
  parcelIdentityCells,
  subIdentityCells,
  yearDataCells,
  parcelDataCells,
  subDataCells,
}: MatrixBodyProps) {
  const subRow = (
    key: string,
    lead: React.ReactNode,
    row: ParcelYearBreakdownRow,
    mode: "year" | "parcel",
  ) => (
    <tr key={key} className="border-b last:border-0 bg-muted/30 text-muted-foreground">
      {lead}
      {subIdentityCells?.(row, mode)}
      {subDataCells(row)}
    </tr>
  );

  if (byParcel) {
    return (
      <>
        {parcelAggs.map((agg) => {
          const expanded = expandedKeys.has(agg.parcelKey);
          return [
            <tr
              key={agg.parcelKey}
              className="border-b last:border-0 cursor-pointer hover:bg-muted/40"
              onClick={() => onToggleKey(agg.parcelKey)}
            >
              <ExpandCell label={agg.label} expandable expanded={expanded} />
              {parcelIdentityCells?.(agg)}
              {parcelDataCells(agg)}
            </tr>,
            ...(expanded
              ? agg.years.map((row) =>
                  subRow(
                    `${agg.parcelKey}-${row.year}`,
                    <td className="py-1 pr-3 pl-5 tabular-nums">{row.year}</td>,
                    row,
                    "parcel",
                  ),
                )
              : []),
          ];
        })}
      </>
    );
  }
  return (
    <>
      {yearRows.map(({ year, data: y }) => {
        const breakdown = y ? breakdownByYear.get(year) : undefined;
        const expandable = (breakdown?.length ?? 0) > 0;
        const expanded = expandable && expandedKeys.has(String(year));
        return [
          <tr
            key={year}
            className={`border-b last:border-0 ${expandable ? "cursor-pointer hover:bg-muted/40" : ""}`}
            onClick={expandable ? () => onToggleKey(String(year)) : undefined}
          >
            <ExpandCell label={String(year)} expandable={expandable} expanded={expanded} />
            {yearIdentityCells?.(y)}
            {yearDataCells(y, monthsByYear.get(year))}
          </tr>,
          ...(expanded && breakdown
            ? breakdown.map((row) =>
                subRow(
                  `${year}-${row.parcelKey}`,
                  <td className="py-1 pr-3 pl-5 whitespace-nowrap">{row.label}</td>,
                  row,
                  "year",
                ),
              )
            : []),
        ];
      })}
    </>
  );
}

interface ProductionMonthlyMatrixProps {
  /** Varian tanpa filter (seluruh lahan aktif). */
  all: ProductionMatrixVariant;
  /** Varian Exclude: tanpa lahan PSR & tanaman berumur <3 tahun. */
  exclude: ProductionMatrixVariant;
  /** Penutup kalimat footnote: "total persil/luas {scopeLabel}" — mis. "Lembaga" / "milik petani". */
  scopeLabel: string;
  emptyMessage: string;
  /** Satuan sel bulanan & Total: "ton" (Lembaga) atau "kg" (Petani). Produktivitas selalu Ton/Ha. */
  weightUnit?: "ton" | "kg";
  /** Desimal sel bulanan & Total pada satuan ton (Lembaga: 0). Satuan kg selalu bulat. */
  tonDecimals?: number;
  /** Rincian per lahan per tahun — mengaktifkan expand + switch grouping (detail Petani). */
  parcelBreakdown?: ParcelYearBreakdownRow[];
  /**
   * Tahun berjalan dari server (basis flag excluded & umur di data) — supaya label
   * umur/rentang baris tahun tidak berbeda jam dengan servernya. Fallback jam client.
   */
  currentYear?: number;
}

export function ProductionMonthlyMatrix({
  all,
  exclude,
  scopeLabel,
  emptyMessage,
  weightUnit = "ton",
  tonDecimals = 0,
  parcelBreakdown,
  currentYear: currentYearProp,
}: ProductionMonthlyMatrixProps) {
  const [openProduksi, setOpenProduksi] = useState(true);
  const [openKetersediaan, setOpenKetersediaan] = useState(true);
  const [filter, setFilter] = useState<"all" | "exclude">("all");
  const [grouping, setGrouping] = useState<"year" | "parcel">("year");
  // Kunci baris ter-expand per section (String(tahun) atau parcelKey, sesuai grouping).
  const [expandedProd, setExpandedProd] = useState<Set<string>>(new Set());
  const [expandedAvail, setExpandedAvail] = useState<Set<string>>(new Set());

  const toggleKey = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const formatWeight = (kg: number) => {
    // Kg tampil maks 2 desimal (bukan dibulatkan ke bulat) agar total matriks
    // tetap rekonsiliasi dengan laporan produksi yang memakai 2 desimal.
    if (weightUnit === "kg") return tonFmt(2).format(kg);
    const ton = kg / 1000;
    // Ton kecil (<1) jangan dibulatkan jadi "0" pada sel ber-data — pakai 2 desimal.
    const digits = ton !== 0 && Math.abs(ton) < 1 ? 2 : tonDecimals;
    return tonFmt(digits).format(ton);
  };
  const weightLabel = weightUnit === "kg" ? "Kg" : "Ton";

  const active = filter === "all" ? all : exclude;
  const excludedCount = all.totalParcels - exclude.totalParcels;
  const hasBreakdown = (parcelBreakdown?.length ?? 0) > 0;
  const byParcel = hasBreakdown && grouping === "parcel";
  const currentYear = currentYearProp ?? new Date().getFullYear();

  // Rincian per lahan per tahun mengikuti filter aktif.
  const { breakdownByYear, maxBreakdownMonthKg, parcelAggs } = useMemo(() => {
    const filtered = (parcelBreakdown ?? []).filter(
      (row) => filter === "all" || !row.excluded,
    );
    const byYear = new Map<number, ParcelYearBreakdownRow[]>();
    for (const row of filtered) {
      const list = byYear.get(row.year) ?? [];
      list.push(row);
      byYear.set(row.year, list);
    }
    // Skala gradasi sub-baris/mode per lahan: sel bulanan per lahan tertinggi.
    const maxKg = Math.max(
      ...filtered.flatMap((r) => Object.values(r.months).map((m) => m.totalKg)),
      0,
    );
    // Agregat per lahan (mode Lahan › Tahun), urut kode lahan.
    const aggMap = new Map<string, ParcelAgg>();
    for (const row of filtered) {
      const agg =
        aggMap.get(row.parcelKey) ??
        {
          parcelKey: row.parcelKey,
          label: row.label,
          area: row.area,
          isPsr: row.isPsr,
          plantingYear: row.plantingYear,
          years: [],
          totalKg: 0,
          recordCount: 0,
          avgTonHa: 0,
        };
      agg.years.push(row);
      agg.totalKg += row.totalKg;
      agg.recordCount += row.recordCount;
      aggMap.set(row.parcelKey, agg);
    }
    const aggs = [...aggMap.values()]
      .map((agg) => ({
        ...agg,
        years: [...agg.years].sort((a, b) => b.year - a.year),
        avgTonHa:
          agg.area != null && agg.area > 0 && agg.years.length > 0
            ? agg.totalKg / 1000 / agg.area / agg.years.length
            : 0,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "id"));
    return {
      breakdownByYear: byYear,
      maxBreakdownMonthKg: maxKg,
      parcelAggs: aggs,
    };
  }, [parcelBreakdown, filter]);

  // Lookup bulan (1–12) per tahun; basis gradasi = sel tertinggi varian aktif.
  // Baris tahun kontinu sampai tahun berjalan — tahun tanpa data tetap tampil
  // sebagai baris "—" agar kekosongan pelaporan langsung terlihat.
  const { monthsByYear, maxMonthKg, yearRows } = useMemo(() => {
    const byYear = new Map<number, Map<number, ProductionMonthRow>>(
      active.perYear.map((y) => [
        y.year,
        new Map(y.months.map((m) => [parseInt(m.period.slice(5, 7), 10), m])),
      ]),
    );
    const maxKg = Math.max(...active.perYear.flatMap((y) => y.months.map((m) => m.totalKg)), 0);
    const dataByYear = new Map(active.perYear.map((y) => [y.year, y]));
    // Jendela baris diangkur ke tahun berjalan, BUKAN ke tahun data terbesar:
    // satu periode ber-tahun typo masa depan (mis. "2107-05", lolos regex
    // YYYY-MM) tidak boleh menggeser jendela dan menyembunyikan semua tahun
    // riil (temuan review 2026-08-10). Tahun typo — masa depan maupun lampau
    // jauh ("1025-06") — jatuh di luar jendela dan tidak dirender.
    const realYears = active.perYear.map((y) => y.year).filter((y) => y <= currentYear);
    const maxYear = currentYear;
    // Clamp 20 baris — tanpa clamp, typo lampau merender ribuan baris kosong.
    const minYear = Math.max(
      realYears.length > 0 ? Math.min(...realYears) : currentYear,
      maxYear - 19,
    );
    const rows: YearRowEntry[] = [];
    for (let yr = maxYear; yr >= minYear; yr--)
      rows.push({ year: yr, data: dataByYear.get(yr) });
    return { monthsByYear: byYear, maxMonthKg: maxKg, yearRows: rows };
  }, [active, currentYear]);

  if (all.perYear.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Produksi Bulanan
        </h2>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
  }

  const pctOrNull = (part: number, total: number) => (total > 0 ? (part / total) * 100 : null);

  const umurLabel = (p: { isPsr: boolean; plantingYear: number | null }) => {
    if (p.isPsr) return "PSR";
    if (p.plantingYear != null) return `${currentYear - p.plantingYear} thn`;
    return "—";
  };

  const emptyCell = (
    <div className="rounded px-1.5 py-1 text-center text-muted-foreground/60 bg-muted/40">—</div>
  );
  const emptyMonthCells = MONTH_LABELS.map((_, i) => (
    <td key={i} className="px-0.5 py-1 min-w-12">
      {emptyCell}
    </td>
  ));

  const noDataForFilter = (
    <p className="text-sm text-muted-foreground mt-3">
      Tidak ada data produksi untuk filter ini.
    </p>
  );

  const monthHeaders = MONTH_LABELS.map((l) => (
    <th key={l} className="px-1 py-2 text-center">
      {l}
    </th>
  ));

  // Sel bulanan produksi sub-baris/mode per lahan (gradasi skala per-lahan).
  const breakdownMonthCells = (row: ParcelYearBreakdownRow) =>
    MONTH_LABELS.map((_, i) => {
      const b = row.months[i + 1];
      return (
        <td key={i} className="px-0.5 py-0.5 min-w-12">
          {b ? (
            <div
              className={`rounded px-1.5 py-0.5 text-center tabular-nums ${productionCellClass(maxBreakdownMonthKg > 0 ? b.totalKg / maxBreakdownMonthKg : 0)}`}
            >
              {formatWeight(b.totalKg)}
            </div>
          ) : (
            <div className="text-center text-muted-foreground/60">—</div>
          )}
        </td>
      );
    });

  // Sel bulanan ketersediaan sub-baris/mode per lahan (jumlah record; hijau bila ada).
  const breakdownRecordCells = (row: ParcelYearBreakdownRow) =>
    MONTH_LABELS.map((_, i) => {
      const b = row.months[i + 1];
      return (
        <td key={i} className="px-0.5 py-0.5 min-w-12">
          {b ? (
            <div className="rounded px-1.5 py-0.5 text-center tabular-nums bg-green-100 text-green-800">
              {formatNumber(b.recordCount)}
            </div>
          ) : (
            <div className="text-center text-muted-foreground/60">—</div>
          )}
        </td>
      );
    });

  return (
    <>
      {/* Filter varian + switch grouping — berlaku untuk kedua matriks di bawah. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          Semua Lahan
        </Button>
        <Button
          size="sm"
          variant={filter === "exclude" ? "default" : "outline"}
          onClick={() => setFilter("exclude")}
        >
          Exclude (PSR &amp; tanaman &lt;3 thn)
        </Button>
        {filter === "exclude" && (
          <span className="text-xs text-muted-foreground">
            {formatNumber(excludedCount)} lahan dikecualikan · {formatNumber(exclude.totalParcels)}{" "}
            lahan · {formatDecimal(exclude.totalArea)} Ha
          </span>
        )}
        {hasBreakdown && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant={grouping === "year" ? "default" : "outline"}
              onClick={() => setGrouping("year")}
            >
              Tahun › Lahan
            </Button>
            <Button
              size="sm"
              variant={grouping === "parcel" ? "default" : "outline"}
              onClick={() => setGrouping("parcel")}
            >
              Lahan › Tahun
            </Button>
          </div>
        )}
      </div>

      <Card className="p-6">
        <SectionHeader
          title={`Produksi Bulanan (${weightLabel})`}
          open={openProduksi}
          onToggle={() => setOpenProduksi((v) => !v)}
        />
        {openProduksi &&
          (active.perYear.length === 0 ? (
            noDataForFilter
          ) : (
            <>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-3">{byParcel ? "Lahan" : "Tahun"}</th>
                      {hasBreakdown && (
                        <>
                          <th className="py-2 pr-3 text-right">Luas (Ha)</th>
                          <th className="py-2 pr-3 text-center">Umur/PSR</th>
                        </>
                      )}
                      {monthHeaders}
                      <th className="py-2 pl-3 text-right">Total</th>
                      <th
                        className="py-2 pl-3 text-right whitespace-nowrap"
                        title="Produktivitas (Ton/Ha)"
                      >
                        Ton/Ha
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <MatrixBody
                      byParcel={byParcel}
                      yearRows={yearRows}
                      parcelAggs={parcelAggs}
                      breakdownByYear={breakdownByYear}
                      monthsByYear={monthsByYear}
                      expandedKeys={expandedProd}
                      onToggleKey={(k) => toggleKey(setExpandedProd, k)}
                      yearIdentityCells={
                        hasBreakdown
                          ? (y) => (
                              <>
                                {/* Baris tahun ≠ baris lahan: nilainya luas TERDATA
                                    (lahan yang melapor tahun itu), bukan luas milik —
                                    beri title agar tak terbaca sebagai luas lahan. */}
                                <td
                                  className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground"
                                  title="Luas Terdata (Ha) — total luas lahan yang melapor tahun ini"
                                >
                                  {y ? formatDecimal(y.areaReporting) : "—"}
                                </td>
                                <td className="py-1.5 pr-3 text-center text-muted-foreground">
                                  —
                                </td>
                              </>
                            )
                          : undefined
                      }
                      parcelIdentityCells={(agg) => (
                        <>
                          <td className="py-1.5 pr-3 text-right tabular-nums">
                            {agg.area != null ? formatDecimal(agg.area) : "—"}
                          </td>
                          <td className="py-1.5 pr-3 text-center whitespace-nowrap">
                            {umurLabel(agg)}
                          </td>
                        </>
                      )}
                      subIdentityCells={
                        hasBreakdown
                          ? (row, mode) =>
                              mode === "parcel" ? (
                                <>
                                  <td className="py-1 pr-3 text-right">—</td>
                                  <td className="py-1 pr-3 text-center">—</td>
                                </>
                              ) : (
                                <>
                                  <td className="py-1 pr-3 text-right tabular-nums">
                                    {row.area != null ? formatDecimal(row.area) : "—"}
                                  </td>
                                  <td className="py-1 pr-3 text-center whitespace-nowrap">
                                    {umurLabel(row)}
                                  </td>
                                </>
                              )
                          : undefined
                      }
                      yearDataCells={(y, byMonth) => (
                        <>
                          {MONTH_LABELS.map((_, i) => {
                            const m = byMonth?.get(i + 1);
                            return (
                              <td key={i} className="px-0.5 py-1 min-w-12">
                                {m ? (
                                  <div
                                    className={`rounded px-1.5 py-1 text-center tabular-nums ${productionCellClass(maxMonthKg > 0 ? m.totalKg / maxMonthKg : 0)}`}
                                  >
                                    {formatWeight(m.totalKg)}
                                  </div>
                                ) : (
                                  emptyCell
                                )}
                              </td>
                            );
                          })}
                          <td className="py-1.5 pl-3 text-right text-sm font-semibold tabular-nums">
                            {y ? formatWeight(y.totalKg) : "—"}
                          </td>
                          <td className="py-1.5 pl-3 text-right text-sm font-semibold tabular-nums">
                            {y ? formatDecimal(y.productivityTonHa) : "—"}
                          </td>
                        </>
                      )}
                      parcelDataCells={(agg) => (
                        <>
                          {emptyMonthCells}
                          <td className="py-1.5 pl-3 text-right text-sm font-semibold tabular-nums">
                            {formatWeight(agg.totalKg)}
                          </td>
                          <td className="py-1.5 pl-3 text-right text-sm font-semibold tabular-nums">
                            {agg.avgTonHa > 0 ? formatDecimal(agg.avgTonHa) : "—"}
                          </td>
                        </>
                      )}
                      subDataCells={(row) => (
                        <>
                          {breakdownMonthCells(row)}
                          <td className="py-1 pl-3 text-right tabular-nums">
                            {formatWeight(row.totalKg)}
                          </td>
                          <td className="py-1 pl-3 text-right tabular-nums">
                            {row.area != null && row.area > 0
                              ? formatDecimal(row.productivityTonHa)
                              : "—"}
                          </td>
                        </>
                      )}
                    />
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {hasBreakdown &&
                  (byParcel
                    ? "Klik baris lahan untuk rincian per tahun; Produktivitas baris lahan = rata-rata tahunan (Σ produksi ÷ luas ÷ jumlah tahun ber-data). "
                    : "Klik baris tahun untuk rincian per lahan. ")}
                Warna makin gelap = produksi bulan tsb makin tinggi (relatif terhadap bulan
                tertinggi); &ldquo;—&rdquo; = tidak ada data. Produktivitas = Σ produksi tahun tsb
                ÷ Σ luas lahan yang terdata pada tahun tsb (Ton/Ha). Record tanpa lahan masuk
                total produksi, tidak menambah luas terdata.
              </p>
            </>
          ))}
      </Card>

      <Card className="p-6">
        <SectionHeader
          title="Ketersediaan Data Bulanan"
          open={openKetersediaan}
          onToggle={() => setOpenKetersediaan((v) => !v)}
        />
        {openKetersediaan &&
          (active.perYear.length === 0 ? (
            noDataForFilter
          ) : (
            <>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-3">{byParcel ? "Lahan" : "Tahun"}</th>
                      {monthHeaders}
                      <th className="py-2 pl-3 text-right">Record</th>
                      <th className="py-2 pl-3 text-right whitespace-nowrap" title="Lahan Terdata">
                        Lahan
                      </th>
                      <th
                        className="py-2 pl-3 text-right whitespace-nowrap"
                        title="Luas Terdata (Ha)"
                      >
                        Luas (Ha)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <MatrixBody
                      byParcel={byParcel}
                      yearRows={yearRows}
                      parcelAggs={parcelAggs}
                      breakdownByYear={breakdownByYear}
                      monthsByYear={monthsByYear}
                      expandedKeys={expandedAvail}
                      onToggleKey={(k) => toggleKey(setExpandedAvail, k)}
                      yearDataCells={(y, byMonth) => (
                        <>
                          {MONTH_LABELS.map((_, i) => {
                            const m = byMonth?.get(i + 1);
                            const pct = m
                              ? pctOrNull(m.parcelsReporting, active.totalParcels)
                              : null;
                            return (
                              <td key={i} className="px-0.5 py-1 min-w-12">
                                {m ? (
                                  <div
                                    className={`rounded px-1.5 py-0.5 text-center tabular-nums ${availabilityCellClass(pct)}`}
                                  >
                                    <div className="font-medium">
                                      {formatNumber(m.parcelsReporting)}
                                    </div>
                                    <div className="text-[10px]">
                                      {pct === null ? "—" : formatCellPct(pct)}
                                    </div>
                                  </div>
                                ) : (
                                  emptyCell
                                )}
                              </td>
                            );
                          })}
                          {y ? (
                            <>
                              <SummaryCell
                                value={formatNumber(y.recordCount)}
                                pct={pctOrNull(y.reportedParcelMonths, active.totalParcels * 12)}
                              />
                              <SummaryCell
                                value={formatNumber(y.parcelsReporting)}
                                pct={pctOrNull(y.parcelsReporting, active.totalParcels)}
                              />
                              <SummaryCell
                                value={formatDecimal(y.areaReporting)}
                                pct={pctOrNull(y.areaReporting, active.totalArea)}
                              />
                            </>
                          ) : (
                            <>
                              <SummaryCell value="—" />
                              <SummaryCell value="—" />
                              <SummaryCell value="—" />
                            </>
                          )}
                        </>
                      )}
                      parcelDataCells={(agg) => (
                        <>
                          {emptyMonthCells}
                          <SummaryCell value={formatNumber(agg.recordCount)} />
                          <SummaryCell value="—" />
                          <SummaryCell
                            value={agg.area != null ? formatDecimal(agg.area) : "—"}
                          />
                        </>
                      )}
                      subDataCells={(row) => (
                        <>
                          {breakdownRecordCells(row)}
                          <td className="py-1 pl-3 text-right tabular-nums">
                            {formatNumber(row.recordCount)}
                          </td>
                          <td className="py-1 pl-3 text-right">—</td>
                          <td className="py-1 pl-3 text-right tabular-nums">
                            {row.area != null ? formatDecimal(row.area) : "—"}
                          </td>
                        </>
                      )}
                    />
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
                <span className="rounded bg-green-100 text-green-800 px-1.5 py-0.5">≥80%</span>
                <span className="rounded bg-lime-100 text-lime-800 px-1.5 py-0.5">50–79%</span>
                <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5">1–49%</span>
                <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.5">
                  0% / tanpa data
                </span>
                <span className="text-muted-foreground">
                  — lahan yang melapor pada bulan tsb (% terhadap total persil)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {hasBreakdown &&
                  (byParcel
                    ? "Klik baris lahan untuk rincian per tahun (angka sub-baris = jumlah record bulan tsb). "
                    : "Klik baris tahun untuk rincian per lahan (angka sub-baris = jumlah record bulan tsb). ")}
                Persentase Record = kelengkapan data bulanan (pasangan lahan×bulan yang terdata ÷
                total persil × 12 bulan — pelaporan wajib min. 1 panen per bulan per lahan);
                Lahan/Luas Terdata terhadap total persil/luas {scopeLabel}. Filter Exclude
                membuang lahan PSR &amp; tanaman berumur &lt;3 tahun beserta record-nya —
                termasuk record dari lahan yang sudah nonaktif/revisi lama (penyebut ikut
                varian filter); record tanpa lahan tetap dihitung.
              </p>
            </>
          ))}
      </Card>
    </>
  );
}
