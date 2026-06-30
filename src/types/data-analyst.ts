// Filter yang dikirim ke server action
export type AnalystFilters = {
  districtId?:    string | null;
  farmerGroupId?: string | null;
};

// Baris tabel Tab 1
export type FarmerDetailRow = {
  farmerGroupName: string;
  farmerId:        string;
  farmerName:      string;
  totalParcels:    number;
};

// Summary cards Tab 1
export type FarmerSummaryStats = {
  totalKT:        number;
  totalPetani:    number;
  totalPersil:    number;
  totalLuasLahan: number; // dalam hektar (ha)
};

// Return type getFarmerSummary
export type FarmerSummaryResult = {
  summary: FarmerSummaryStats;
  rows:    FarmerDetailRow[];
};

// Baris tabel Tab 2
export type FarmerNoParcelsRow = {
  farmerGroupName: string;
  farmerId:        string;
  farmerName:      string;
};

// Summary cards Tab 2
export type FarmersWithoutParcelsStats = {
  totalKT:                    number;
  totalFarmersWithoutParcels: number;
  percentageFromTotal:        number; // 0-100, 2 desimal
};

// Return type getFarmersWithoutParcels
export type FarmersWithoutParcelsResult = {
  summary: FarmersWithoutParcelsStats;
  rows:    FarmerNoParcelsRow[];
};
