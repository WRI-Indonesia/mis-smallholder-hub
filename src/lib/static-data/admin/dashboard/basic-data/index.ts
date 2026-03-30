// Basic Data Dashboard - score cards & farmer group data for map
import Papa from "papaparse";
import basicDataCsvRaw from "./basic-data.csv";
import basicDataMetaCsvRaw from "./basic-data-meta.csv";
import groupBasicDataCsvRaw from "./group-basic-data.csv";

// Basic Data Metadata from basic-data-meta.csv
export type BasicDataMeta = {
  label: string;
  icon: string;
  group: "base" | "training";
  suffix: string;
};

export type BasicDataRow = {
  program: string;
  distrik: string;
  label: string;
  value: string;
};

export type BasicDataStat = BasicDataMeta & {
  value: string;
};

const basicDataMeta: BasicDataMeta[] = Papa.parse(basicDataMetaCsvRaw, {
  header: true,
  skipEmptyLines: true,
}).data as BasicDataMeta[];

const basicDataRows: BasicDataRow[] = Papa.parse(basicDataCsvRaw, {
  header: true,
  skipEmptyLines: true,
}).data as BasicDataRow[];

/** Filter and aggregate Basic Data stats by program and distrik */
export function getBasicDataStats(program: string, distrik: string): BasicDataStat[] {
  return basicDataMeta.map(meta => {
    // Filter rows matching program and distrik, summing them up
    const filteredRows = basicDataRows.filter(row => {
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

// Farmer group data for map
export type FarmerGroupData = {
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

const rawGroups = Papa.parse(groupBasicDataCsvRaw, {
  header: true,
  skipEmptyLines: true,
}).data as Record<string, string>[];

export const farmerGroupData: FarmerGroupData[] = rawGroups.map((row) => ({
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
