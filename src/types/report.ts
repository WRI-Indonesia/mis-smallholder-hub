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

export interface TrainingReportFilters {
  districtId: string;
  farmerGroupId: string;
}

export interface TrainingReportSummary {
  totalPetani: number;
  totalKegiatan: number;
  totalPeserta: number;
  totalPesertaUnik: number;
  totalUnikPaket1: number;
  pctPaket1: number;
  totalUnikPaket2MK: number;
  pctPaket2MK: number;
  totalUnikPaket2K3: number;
  pctPaket2K3: number;
  totalUnikPaket34: number;
  pctPaket34: number;
}

export interface TrainingActivityParticipant {
  farmerId: string;
  farmerIdCode: string;
  name: string;
  preTestScore: number | null;
  postTestScore: number | null;
}

export interface TrainingActivityReportRow {
  id: string;
  packageName: string;
  packageCode: string;
  trainingDate: string;
  location: string | null;
  totalParticipants: number;
  participants: TrainingActivityParticipant[];
}

export interface TrainingFarmerReportRow {
  id: string;
  farmerId: string;
  name: string;
  gender: "M" | "F";
  paket1Date: string | null;
  paket2MKDate: string | null;
  paket2K3Date: string | null;
  paket34Date: string | null;
}

export interface TrainingReportResult {
  summary: TrainingReportSummary;
  activities: TrainingActivityReportRow[];
  farmers: TrainingFarmerReportRow[];
}
