// BMP Dashboard — static CSV data layer
import Papa from "papaparse";
import bmpScoreCsvRaw from "./bmp-score.csv";
import bmpProductionMonthlyCsvRaw from "./bmp-production-monthly.csv";
import bmpMonevCsvRaw from "./bmp-monev.csv";

// ── Types ──

export type BMPScoreData = {
  totalFarmers: number;
  totalParcels: number;
  totalProductionKg: number;
  totalAreaHa: number;
  productivity: number; // Ton/Ha/Thn — derived
};

export type BMPMonthlyProduction = {
  month: string;
  productionTon: number;
  productivityTonPerHa: number;
};

export type BMPMonevData = {
  teladan: number;
  praktisi: number;
  pemula: number;
  belumImplementasi: number;
};

export type BMPKelompokTani = {
  name: string;
  distrik: string;
};

// ── Raw row types ──

type ScoreRow = {
  distrik: string;
  kelompokTani: string;
  totalFarmers: string;
  totalParcels: string;
  totalProductionKg: string;
  totalAreaHa: string;
};

type ProductionRow = {
  distrik: string;
  kelompokTani: string;
  month: string;
  productionKg: string;
  areaHa: string;
};

type MonevRow = {
  distrik: string;
  kelompokTani: string;
  teladan: string;
  praktisi: string;
  pemula: string;
  belumImplementasi: string;
};

// ── Parse CSV ──

const scoreRows: ScoreRow[] = Papa.parse(bmpScoreCsvRaw, {
  header: true,
  skipEmptyLines: true,
}).data as ScoreRow[];

const productionRows: ProductionRow[] = Papa.parse(bmpProductionMonthlyCsvRaw, {
  header: true,
  skipEmptyLines: true,
}).data as ProductionRow[];

const monevRows: MonevRow[] = Papa.parse(bmpMonevCsvRaw, {
  header: true,
  skipEmptyLines: true,
}).data as MonevRow[];

// ── Filter helper ──

function matchFilter(row: { distrik: string; kelompokTani: string }, distrik?: string, kelompokTani?: string): boolean {
  const matchD = !distrik || distrik === "All" || row.distrik === distrik;
  const matchKT = !kelompokTani || kelompokTani === "All" || row.kelompokTani === kelompokTani;
  return matchD && matchKT;
}

// ── Public API ──

/** Get list of unique districts */
export function getBMPDistricts(): string[] {
  return [...new Set(scoreRows.map((r) => r.distrik))];
}

/** Get list of kelompok tani, optionally filtered by distrik */
export function getBMPKelompokTani(distrik?: string): BMPKelompokTani[] {
  const filtered = distrik && distrik !== "All"
    ? scoreRows.filter((r) => r.distrik === distrik)
    : scoreRows;
  return filtered.map((r) => ({ name: r.kelompokTani, distrik: r.distrik }));
}

/** Aggregate BMP score data */
export function getBMPScoreData(distrik?: string, kelompokTani?: string): BMPScoreData {
  const filtered = scoreRows.filter((r) => matchFilter(r, distrik, kelompokTani));

  const totalFarmers = filtered.reduce((s, r) => s + parseInt(r.totalFarmers, 10), 0);
  const totalParcels = filtered.reduce((s, r) => s + parseInt(r.totalParcels, 10), 0);
  const totalProductionKg = filtered.reduce((s, r) => s + parseFloat(r.totalProductionKg), 0);
  const totalAreaHa = filtered.reduce((s, r) => s + parseFloat(r.totalAreaHa), 0);
  const productivity = totalAreaHa > 0 ? (totalProductionKg / 1000) / totalAreaHa : 0;

  return { totalFarmers, totalParcels, totalProductionKg, totalAreaHa, productivity };
}

/** Get monthly production + productivity trend */
export function getBMPMonthlyProduction(distrik?: string, kelompokTani?: string): BMPMonthlyProduction[] {
  const filtered = productionRows.filter((r) => matchFilter(r, distrik, kelompokTani));

  const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthMap = new Map<string, { productionKg: number; areaHa: number }>();

  for (const row of filtered) {
    const current = monthMap.get(row.month) || { productionKg: 0, areaHa: 0 };
    current.productionKg += parseFloat(row.productionKg);
    current.areaHa += parseFloat(row.areaHa);
    monthMap.set(row.month, current);
  }

  return monthOrder
    .filter((m) => monthMap.has(m))
    .map((m) => {
      const d = monthMap.get(m)!;
      return {
        month: m,
        productionTon: +(d.productionKg / 1000).toFixed(2),
        productivityTonPerHa: d.areaHa > 0 ? +((d.productionKg / 1000) / d.areaHa).toFixed(3) : 0,
      };
    });
}

/** Get BMP monev distribution */
export function getBMPMonevData(distrik?: string, kelompokTani?: string): BMPMonevData {
  const filtered = monevRows.filter((r) => matchFilter(r, distrik, kelompokTani));

  return {
    teladan: filtered.reduce((s, r) => s + parseInt(r.teladan, 10), 0),
    praktisi: filtered.reduce((s, r) => s + parseInt(r.praktisi, 10), 0),
    pemula: filtered.reduce((s, r) => s + parseInt(r.pemula, 10), 0),
    belumImplementasi: filtered.reduce((s, r) => s + parseInt(r.belumImplementasi, 10), 0),
  };
}
