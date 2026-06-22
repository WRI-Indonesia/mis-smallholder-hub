export interface LandParcelFarmer {
  id: string;
  name: string;
  farmerId: string;
  farmerGroup: {
    name: string;
    district: {
      name: string;
    };
  };
}

export interface LandParcel {
  id: string;
  farmerId: string;
  farmer: LandParcelFarmer;
  parcelId: string;
  geometry: any;
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
