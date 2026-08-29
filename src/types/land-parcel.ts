import type { Geometry } from "geojson";

export interface LandParcelFarmer {
  id: string;
  name: string;
  farmerId: string;
  farmerGroup: {
    id: string;
    name: string;
    district: {
      id: string;
      name: string;
    };
  };
}

export interface FarmerGroupSelect {
  id: string;
  name: string;
  code: string | null;
  districtId: string;
}

export interface LandParcel {
  id: string;
  farmerId: string;
  farmer: LandParcelFarmer;
  parcelId: string;
  blok: string | null;
  // Column-key placeholder untuk kolom "Lembaga Petani" (dirender dari
  // farmer.farmerGroup.name); tidak diisi pada row-nya sendiri.
  farmerGroupName?: string;
  // Hanya diisi oleh fetch detail (getLandParcelById); payload list tidak
  // membawa geometry agar ringan (#163).
  geometry?: Geometry | null;
  area: number | null;
  landStatus: string | null;
  cropType: string | null;
  species: string | null;
  isPsr: boolean;
  plantingYear: number | null;
  subGroupLv2: string | null; // Kelompok Tani
  revision: number;
  isActive: boolean;
  notes?: string | null;
  // Audit — hanya diisi oleh fetch detail (getLandParcelById), tidak oleh list.
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface FarmerSelect {
  id: string;
  name: string;
  farmerId: string;
}

// --- Satelit lahan (#296) — menempel ke parcelUid, dibaca via getLandParcelSatellites ---

import type { LandDocumentTypeCode } from "@/lib/land-parcel-detail-import";
export type { LandDocumentTypeCode };

export interface LandParcelDocumentItem {
  id: string;
  type: LandDocumentTypeCode;
  typeRaw: string | null;
  number: string | null;
  holderName: string | null;
  statedArea: number | null;
  issuedYear: number | null;
  custodyNote: string | null;
  fileUrl: string | null;
  notes: string | null;
}

export interface LandStdbItem {
  id: string;
  /** null selama tahap pra-terbit (#306) — nomor baru keluar saat TERBIT. */
  number: string | null;
  stage: string;
  stageChangedAt: Date | null;
  stageNote: string | null;
  submittedTo: string | null;
  preparedAt: Date | null;
  submittedAt: Date | null;
  issuedAt: Date | null;
  holderName: string | null;
  statedArea: number | null;
  issuedYear: number | null;
  notes: string | null;
  /** Lahan lain (aktif) yang ditutup STDB yang sama; `id` = baris lahan aktif untuk tautan. */
  otherParcels: { parcelId: string; id: string | null }[];
}

export interface LandParcelExternalIdItem {
  id: string;
  source: string;
  code: string;
  mappedAt: Date | null;
  notes: string | null;
}

export interface LandParcelProgramItem {
  id: string;
  programType: "DEMPLOT_PBU";
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
}

export interface LandParcelSatellites {
  parcelUid: string;
  documents: LandParcelDocumentItem[];
  stdbs: LandStdbItem[];
  externalIds: LandParcelExternalIdItem[];
  programs: LandParcelProgramItem[];
}
