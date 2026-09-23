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
  /** Status NKT (#328) dari satelit — hanya diisi list (filter/badge); null = belum dinilai. */
  nktStatus?: string | null;
  /** Jumlah patok aktif (#329) — hanya diisi list. */
  markerCount?: number;
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

/** Sepadan U/T/S/B (#326) — satelit 1:1; null bila belum pernah diisi. */
export interface LandParcelBorderItem {
  id: string;
  north: string | null;
  east: string | null;
  south: string | null;
  west: string | null;
  notes: string | null;
  modifiedAt: Date;
}

/** Status NKT (#328) — satelit 1:1; null = belum dinilai. */
export interface LandParcelNktItem {
  id: string;
  status: "INCLUDED" | "AFFECTED" | "NOT_AFFECTED";
  categories: string[];
  affectedAreaHa: number | null;
  affectedLengthM: number | null;
  assessedAt: Date | null;
  assessor: string | null;
  source: string | null;
  notes: string | null;
  modifiedAt: Date;
}

export interface LandParcelSatellites {
  parcelUid: string;
  documents: LandParcelDocumentItem[];
  stdbs: LandStdbItem[];
  /** `otherParcels` = lahan lain yang juga memegang kode ini (klaim ganda, keputusan owner 2026-09-23) — untuk cek silang. */
  externalIds: (LandParcelExternalIdItem & { otherParcels: { parcelId: string; id: string | null }[] })[];
  programs: LandParcelProgramItem[];
  border: LandParcelBorderItem | null;
  nkt: LandParcelNktItem | null;
}

// --- Patok batas (#329) — satu patok fisik dipakai bersama lahan berdampingan ---

export interface LandMarkerItem {
  /** LandParcelMarker.id (tautan lahan ini). */
  linkId: string;
  /** LandMarker.id. */
  id: string;
  /** Kode patok fisik `HJP-PTK-000123` (#331). */
  code: string;
  sequenceNo: number;
  sourceRevision: number | null;
  longitude: number;
  latitude: number;
  source: "POLYGON_VERTEX" | "GPS" | "MANUAL";
  condition: "PRESENT" | "MISSING" | "DAMAGED" | "NOT_INSTALLED";
  type: "CONCRETE" | "WOOD" | "PIPE" | "NATURAL" | "OTHER" | null;
  installedAt: Date | null;
  installedBy: string | null;
  photoKey: string | null;
  photoName: string | null;
  /** Presigned 1 jam; null bila tak ada foto. */
  photoUrl: string | null;
  notes: string | null;
  modifiedAt: Date;
  /** Lahan lain yang memakai patok yang sama (identitas selalu lengkap, pola #327); `landParcelId` null bila di luar scope. */
  sharedWith: { parcelId: string; landParcelId: string | null; farmerName: string; groupName: string }[];
}

export interface LandParcelMarkers {
  parcelUid: string;
  revision: number;
  hasGeometry: boolean;
  /** Ada tautan dari revisi poligon yang lebih lama — tawarkan "jalankan ulang". */
  polygonChangedSince: boolean;
  markers: LandMarkerItem[];
}
