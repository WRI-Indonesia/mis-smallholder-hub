import type { Geometry } from "geojson";

export interface LandParcelFarmer {
  id: string;
  name: string;
  farmerId: string;
  farmerGroup: {
    id: string;
    name: string;
    district: {
      name: string;
    };
  };
}

export interface FarmerGroupSelect {
  id: string;
  name: string;
  code: string | null;
}

export interface LandParcel {
  id: string;
  farmerId: string;
  farmer: LandParcelFarmer;
  parcelId: string;
  // Column-key placeholder untuk kolom "Kelompok Tani" (dirender dari
  // farmer.farmerGroup.name); tidak diisi pada row-nya sendiri.
  farmerGroupName?: string;
  geometry: Geometry;
  area: number | null;
  landStatus: string | null;
  cropType: string | null;
  plantingYear: number | null;
  revision: number;
  isActive: boolean;
  notes?: string | null;
}

export interface FarmerSelect {
  id: string;
  name: string;
  farmerId: string;
}
