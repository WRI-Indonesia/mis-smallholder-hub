import type { BmpFarmerGroupCategory } from "@/types/dashboard";

/**
 * Tipe Ketersediaan Data › Produksi (#416, epic #415): kalender cakupan
 * produksi Lembaga × bulan yang bisa dibuka menjadi petani → lahan.
 * Angka per sel adalah agregat SATU periode (YYYY-MM) untuk satu baris pohon.
 */

/** Agregat record produksi satu periode pada satu baris (Lembaga / petani). */
export interface ProductionCellStats {
  /** YYYY-MM. */
  period: string;
  /** Lahan aktif non-PSR berbeda yang punya ≥1 record pada periode ini (pembilang K3). */
  parcelsReporting: number;
  /** Semua record aktif periode ini (termasuk tanpa persil & lahan PSR). */
  records: number;
  /** Record ber-persil (pembagi "bulan ber-data" penyetahunan — `dataMonthsPerYear.linked`). */
  linkedRecords: number;
  /** Σ hasil (kg) semua record periode ini. */
  kg: number;
  /** Record 0 kg (penanda K5-b). */
  zeroRecords: number;
  /** Record tanpa ID Lahan (penanda K5-c) — tidak masuk `parcelsReporting`. */
  noParcelRecords: number;
}

/** Satu baris Lembaga: identitas + penyebut + sel SEMUA periode (rentang penuh). */
export interface ProductionAvailabilityGroupRow {
  id: string;
  name: string;
  code: string | null;
  abrv: string | null;
  category: BmpFarmerGroupCategory;
  districtId: string;
  districtName: string;
  /** Petani aktif Lembaga. */
  totalFarmers: number;
  /** Lahan aktif Lembaga (termasuk PSR). */
  totalParcels: number;
  /** Lahan aktif non-PSR — penyebut % cakupan (K3). */
  nonPsrParcels: number;
  cells: ProductionCellStats[];
}

/** Payload halaman: semua Lembaga dalam scope, dihitung saat halaman dibuka (K7). */
export interface ProductionAvailabilityView {
  generatedAt: string;
  /** Periode acuan kebaruan (bulan berjalan, YYYY-MM). */
  referencePeriod: string;
  groups: ProductionAvailabilityGroupRow[];
}

/** Baris petani (anak Lembaga, dimuat saat dibuka) — sel hanya tahun yang diminta. */
export interface ProductionAvailabilityFarmerRow {
  id: string;
  name: string;
  /** Kode petani (`Farmer.farmerId`). */
  farmerCode: string;
  totalParcels: number;
  nonPsrParcels: number;
  cells: ProductionCellStats[];
}

/** Agregat record satu lahan pada satu periode. */
export interface ProductionParcelCell {
  period: string;
  records: number;
  kg: number;
  zeroRecords: number;
}

/** Baris lahan (anak petani). */
export interface ProductionAvailabilityParcelRow {
  id: string;
  /** Kode lahan (`LandParcel.parcelId`). */
  parcelCode: string;
  isPsr: boolean;
  area: number | null;
  /** `false` = lahan aktif petani lain / revisi lama yang ditunjuk record petani ini. */
  isOwn: boolean;
  cells: ProductionParcelCell[];
}

/** Baris lahan untuk Sheet 2 ekspor (seluruh Lembaga): lahan + pemiliknya. */
export interface ProductionAvailabilityGroupParcelRow extends ProductionAvailabilityParcelRow {
  farmerName: string;
  farmerCode: string;
}

/** Hasil pemuatan anak petani: lahan-lahannya + record tanpa persil per periode. */
export interface ProductionAvailabilityParcelsResult {
  parcels: ProductionAvailabilityParcelRow[];
  /** Record petani ini yang tidak ber-ID Lahan, per periode (baris semu "Tanpa persil"). */
  noParcel: ProductionParcelCell[];
}
