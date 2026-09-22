import type { Polygon, MultiPolygon } from "geojson";
import type { ParcelPassport } from "@/types/map";
import type { FarmerDetailData } from "@/lib/farmer-detail";

/**
 * Satu baris tabel "Daftar Lahan" di Profil Petani (#343). Nomor peta sebaran =
 * nomor lampiran = urutan baris ber-geometri (dihitung di PDF, bukan di sini).
 */
export type FarmerProfileParcel = {
  /** LandParcel.id (db). */
  id: string;
  parcelId: string;
  subGroupLv2: string | null;
  blok: string | null;
  /** Ringkasan surat kepemilikan (`summarizeDocuments`), null bila belum ada. */
  surat: string | null;
  /** Ringkasan STDB (`summarizeStdb`), null bila belum ada. */
  stdb: string | null;
  /** Status NKT; null = belum dinilai. */
  nktStatus: string | null;
  area: number | null;
  plantingYear: number | null;
  isPsr: boolean;
  revision: number;
  /** Hitungan via groupBy (pola #335) — bukan dari memuat titik. */
  treeCount: number;
  markerCount: number;
  /**
   * Geometri aktif (null = belum dipetakan: tetap tercantum di tabel dengan
   * catatan, tidak mendapat nomor peta/lampiran). Geometri yang centroid-nya
   * gagal dihitung diperlakukan sama dengan null.
   */
  geometry: Polygon | MultiPolygon | null;
  /** Centroid [lon, lat] — penanda bernomor di peta sebaran; null bila tanpa geometri. */
  centroid: [number, number] | null;
};

export type FarmerProfileTrainingHistoryItem = {
  id: string;
  packageCode: string;
  packageName: string;
  /** ISO. */
  trainingDate: string;
  location: string | null;
  preTestScore: number | null;
  postTestScore: number | null;
};

/** Skor satu kegiatan BMP pada satu penilaian (cermin kepala lipatan tab Monev BMP). */
export type FarmerProfileBmpActivity = {
  code: string;
  name: string;
  /** Σ bobot indikator × skor (skala 0–3). */
  score: number;
  /** Skor maksimum kegiatan (biasanya 3; `bmpActivityMaxScore`). */
  max: number;
  /** Indikator individu terisi / total pada kegiatan ini. */
  filled: number;
  total: number;
};

export type FarmerProfileBmpAssessment = {
  id: string;
  surveyYear: number;
  /** ISO (UTC tengah malam) — format dengan `formatUtcDate`. */
  surveyDate: string | null;
  score: number;
  parcelId: string | null;
  assessor: string | null;
  notes: string | null;
  /** Kosong bila penilaian hanya skor rekap tanpa rincian indikator. */
  activities: FarmerProfileBmpActivity[];
  /** Indikator Lembaga terisi; null bila penilaian Lembaga tahun itu belum ada. */
  groupFilled: number | null;
  groupTotal: number;
};

/**
 * Seluruh data PDF "Profil Petani" (#343): Bagian A ringkasan petani (angka
 * = Detail Petani, dari `buildFarmerDetail`) + Bagian B lampiran Profil Lahan
 * per lahan ber-geometri (`fetchParcelPassport`, urut sama dengan `parcels`).
 */
export type FarmerProfilePassport = {
  farmer: {
    name: string;
    code: string;
    gender: string;
    nik: string | null;
    birthPlace: string | null;
    /** ISO. */
    birthDate: string | null;
    address: string | null;
    joinedYear: number | null;
    isActive: boolean;
    /** ISO. */
    createdAt: string;
    /** ISO. */
    modifiedAt: string;
  };
  group: {
    name: string;
    code: string | null;
    districtName: string;
    provinceName: string;
  };
  /** Distinct Kelompok Tani turunan lahan aktif (badge header Detail Petani). */
  subGroups: FarmerDetailData["subGroups"];
  /** Lima kartu ringkasan — identik dengan layar. */
  summary: FarmerDetailData["summary"];
  /** Urut `parcelId` ASC (sama dengan tabel Daftar Lahan di layar). */
  parcels: FarmerProfileParcel[];
  training: {
    checklist: FarmerDetailData["pelatihan"]["checklist"];
    /** Terbaru dulu; termasuk paket OTHER. */
    history: FarmerProfileTrainingHistoryItem[];
  };
  production: {
    all: FarmerDetailData["produksi"]["all"];
    parcelBreakdown: FarmerDetailData["produksi"]["parcelBreakdown"];
    currentYear: number;
  };
  /**
   * Lampiran Profil Lahan — satu per lahan ber-geometri, urut `parcels`.
   * Kosong bila `includeParcels: false` ("Ringkasan saja") ATAU tak ada lahan
   * ber-geometri; bedakan lewat `includeParcels`.
   */
  parcelPassports: ParcelPassport[];
  includeParcels: boolean;
  /**
   * Monev BMP (owner 2026-09-22) — terbaru dulu. **null = pengguna tanpa izin
   * VIEW menu Monev BMP** (section & badge kategori tidak dicetak — aturan yang
   * sama dengan tab di layar); [] = punya izin tapi belum ada penilaian.
   */
  bmp: { assessments: FarmerProfileBmpAssessment[] } | null;
};
