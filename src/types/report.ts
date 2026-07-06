export interface FarmerReportFilters {
  districtId: string;
  farmerGroupId: string;
}

export interface FarmerReportSummary {
  totalPetani: number;
  totalPersil: number;
  totalLuasLahan: number;
  avgLuasLahan: number;
}

export interface FarmerReportRow {
  id: string;
  farmerId: string;
  name: string;
  gender: "M" | "F";
  nik: string | null;
  joinedYear: number | null;
  totalParcels: number;
  totalArea: number;
}

export interface FarmerReportResult {
  summary: FarmerReportSummary;
  rows: FarmerReportRow[];
}
