export interface FarmerGroup {
  id: string;
  name: string;
  type: "Koperasi" | "Asosiasi";
  region: string;
  established: string;
  members: number;
  description: string;
  contact: string;
  lat: number;
  lng: number;
  village: string;
  commodities: string;
  image_url: string;
  // Tahap 1 - Detail Page Fields
  chairman_name: string;
  whatsapp: string;
  total_land_ha: number;
  annual_production_ton: number;
  certifications: string;
}

import Papa from "papaparse";
import csvRaw from "./data.csv";

const parsed = Papa.parse(csvRaw, {
  header: true,
  skipEmptyLines: true,
});

export const farmerGroups: FarmerGroup[] = parsed.data.map((row: any) => ({
  id: row.id,
  name: row.name,
  type: row.type as "Koperasi" | "Asosiasi",
  region: row.region,
  established: row.established,
  members: parseInt(row.members, 10),
  description: row.description,
  contact: row.contact,
  lat: parseFloat(row.lat),
  lng: parseFloat(row.lng),
  village: row.village,
  commodities: row.commodities,
  image_url: row.image_url,
  chairman_name: row.chairman_name,
  whatsapp: row.whatsapp,
  total_land_ha: parseFloat(row.total_land_ha),
  annual_production_ton: parseFloat(row.annual_production_ton),
  certifications: row.certifications,
}));
