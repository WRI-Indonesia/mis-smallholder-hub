export type Farmer = {
  id: string;
  name: string;
  nik: string;
  group: string;
  region: string;
};

import Papa from "papaparse";
import csvRaw from "./data.csv";

export const mockFarmers: Farmer[] = Papa.parse(csvRaw, { header: true }).data as Farmer[];
