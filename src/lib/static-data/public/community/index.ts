export type FarmerGroup = {
  id: string;
  name: string;
  type: "Koperasi" | "Asosiasi";
  region: "Kampar" | "Siak" | "Pelalawan" | "Rokan Hulu";
  established: number;
  members: number;
  description: string;
  contact: string;
};

import Papa from "papaparse";
import csvRaw from "./data.csv";

export const farmerGroups: FarmerGroup[] = Papa.parse(csvRaw, { header: true, dynamicTyping: true }).data as FarmerGroup[];
