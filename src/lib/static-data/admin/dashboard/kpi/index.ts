// KPI Dashboard data - score cards & farmer group KPI for map
import Papa from "papaparse";
import kpiCsvRaw from "./kpi.csv";
import kpiMetaCsvRaw from "./kpi-meta.csv";
import groupKpiCsvRaw from "./group-kpi.csv";

// KPI Metadata from kpi-meta.csv
export type KpiMeta = {
  label: string;
  icon: string;
  group: "base" | "training";
  suffix: string;
};

export type KpiDataRow = {
  program: string;
  distrik: string;
  label: string;
  value: string;
};

export type KpiStat = KpiMeta & {
  value: string;
};

const kpiMeta: KpiMeta[] = Papa.parse(kpiMetaCsvRaw, {
  header: true,
  skipEmptyLines: true,
}).data as KpiMeta[];

const kpiData: KpiDataRow[] = Papa.parse(kpiCsvRaw, {
  header: true,
  skipEmptyLines: true,
}).data as KpiDataRow[];

/** Filter and aggregate KPI stats by program and distrik */
export function getKpiStats(program: string, distrik: string): KpiStat[] {
  return kpiMeta.map(meta => {
    // Filter rows matching program and distrik, summing them up
    const filteredRows = kpiData.filter(row => {
      const matchProgram = program === "All" || row.program === program;
      const matchDistrik = distrik === "All" || row.distrik === distrik;
      return matchProgram && matchDistrik && row.label === meta.label;
    });

    const sum = filteredRows.reduce((acc, row) => {
      const val = parseFloat(row.value.replace(/,/g, ""));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    // Format value: add commas and suffix
    let formattedValue = sum.toLocaleString("id-ID");
    if (meta.suffix) {
      formattedValue += meta.suffix;
    }

    return {
      ...meta,
      value: formattedValue,
    };
  });
}

// Farmer group KPI for map
export type GroupKPI = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  totalPetani: number;
  petaniLaki: number;
  petaniPerempuan: number;
  totalPersil: number;
  totalLuasan: string;
  trainingPaket1: number;
  trainingPaket2MK: number;
  trainingPaket2HSE: number;
  trainingPaket34: number;
};

const rawGroups = Papa.parse(groupKpiCsvRaw, {
  header: true,
  skipEmptyLines: true,
}).data as Record<string, string>[];

export const farmerGroupKPI: GroupKPI[] = rawGroups.map((row) => ({
  id: row.id,
  name: row.name,
  region: row.region,
  lat: parseFloat(row.lat),
  lng: parseFloat(row.lng),
  totalPetani: parseInt(row.totalPetani, 10),
  petaniLaki: parseInt(row.petaniLaki, 10),
  petaniPerempuan: parseInt(row.petaniPerempuan, 10),
  totalPersil: parseInt(row.totalPersil, 10),
  totalLuasan: row.totalLuasan,
  trainingPaket1: parseInt(row.trainingPaket1, 10),
  trainingPaket2MK: parseInt(row.trainingPaket2MK, 10),
  trainingPaket2HSE: parseInt(row.trainingPaket2HSE, 10),
  trainingPaket34: parseInt(row.trainingPaket34, 10),
}));
