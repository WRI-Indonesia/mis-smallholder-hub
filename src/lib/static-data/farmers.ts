export type Farmer = {
  id: string;
  name: string;
  nik: string;
  group: string;
  region: string;
};

export const mockFarmers: Farmer[] = [
  { id: "PET-001", name: "Budi Santoso", nik: "320101...", group: "Tani Maju", region: "Desa Suka Makmur" },
  { id: "PET-002", name: "Siti Aminah", nik: "320102...", group: "Tani Sejahtera", region: "Desa Suka Makmur" },
  { id: "PET-003", name: "Asep Sunandar", nik: "320103...", group: "Tani Harapan", region: "Desa Cibinong" },
  { id: "PET-004", name: "Joko Widodo", nik: "320104...", group: "Tani Maju", region: "Desa Suka Makmur" },
  { id: "PET-005", name: "Rina Marlina", nik: "320105...", group: "Tani Sejahtera", region: "Desa Cibinong" },
];
