// report-production.ts — pure helpers for the Production Report (RPT-03)
// Kept framework-free so they are unit-testable and reusable by the server action.

import type { ProductionReportRow, ProductionReportResult } from "@/types/report";

export const PRODUCTION_REPORT_MAX_MONTHS = 24;

const MONTH_ABBR_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** Round to 2 decimals to avoid floating-point noise when summing yields. */
function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}

/** True when `value` matches the `YYYY-MM` period format. */
export function isValidPeriod(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value) && Number(value.slice(5, 7)) >= 1 && Number(value.slice(5, 7)) <= 12;
}

/**
 * Enumerate `YYYY-MM` period strings inclusive from `start` to `end`.
 * Returns `[]` when the range is invalid (end before start or malformed input).
 */
export function enumeratePeriods(start: string, end: string): string[] {
  if (!isValidPeriod(start) || !isValidPeriod(end)) return [];

  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);

  if (ey < sy || (ey === sy && em < sm)) return [];

  const periods: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    periods.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return periods;
}

/** Format a `YYYY-MM` period as a compact `MMM-YY` label (e.g. `2024-03` → `Mar-24`). */
export function formatPeriodLabel(period: string): string {
  if (!isValidPeriod(period)) return period;
  const [y, m] = period.split("-").map(Number);
  return `${MONTH_ABBR_ID[m - 1]}-${String(y).slice(-2)}`;
}

/** Minimal shape the matrix builder needs from each production record. */
export interface ProductionMatrixRecord {
  farmerDbId: string;
  farmerCode: string;
  farmerName: string;
  parcelDbId: string | null;
  parcelCode: string | null;
  parcelArea: number | null;
  period: string;
  yieldKg: number;
}

/**
 * Pivot production records into a per-farmer/parcel × month matrix.
 * Multiple harvests in the same month are summed. Rows are ordered by farmer
 * name, then parcel code. Column totals and grand total are computed alongside.
 */
export function buildProductionMatrix(
  records: ProductionMatrixRecord[],
  periods: string[],
): ProductionReportResult {
  const periodSet = new Set(periods);
  const rowMap = new Map<string, ProductionReportRow>();

  for (const rec of records) {
    if (!periodSet.has(rec.period)) continue;

    const key = `${rec.farmerDbId}::${rec.parcelDbId ?? "none"}`;
    let row = rowMap.get(key);
    if (!row) {
      row = {
        key,
        farmerId: rec.farmerDbId,
        farmerCode: rec.farmerCode,
        name: rec.farmerName,
        parcelId: rec.parcelDbId,
        parcelCode: rec.parcelCode,
        parcelArea: rec.parcelArea,
        values: {},
        total: 0,
      };
      rowMap.set(key, row);
    }
    row.values[rec.period] = round2((row.values[rec.period] ?? 0) + rec.yieldKg);
    row.total = round2(row.total + rec.yieldKg);
  }

  const rows = [...rowMap.values()].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, "id");
    if (byName !== 0) return byName;
    return (a.parcelCode ?? "").localeCompare(b.parcelCode ?? "", "id");
  });

  const columnTotals: Record<string, number> = {};
  periods.forEach((p) => (columnTotals[p] = 0));
  let grandTotal = 0;

  for (const row of rows) {
    for (const p of periods) {
      const v = row.values[p];
      if (v != null) columnTotals[p] = round2(columnTotals[p] + v);
    }
    grandTotal = round2(grandTotal + row.total);
  }

  const uniqueFarmers = new Set(rows.map((r) => r.farmerId));

  return {
    periods,
    rows,
    columnTotals,
    grandTotal,
    summary: {
      totalPetani: uniqueFarmers.size,
      totalLahan: rows.length,
      totalProduksi: grandTotal,
      totalBulan: periods.length,
    },
  };
}
