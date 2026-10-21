/**
 * Label badge "Ringkasan Akses" di modal Akses Data pengguna
 * (`settings/users/user-data-access-modal.tsx`). Urutan: provinsi → distrik →
 * Lembaga, sesuai urutan assignment dari `getUserDataAccess`. Daftar kosong =
 * belum dibatasi (modal menampilkan "akses semua data").
 */

export type AccessSummaryKind = "province" | "district" | "farmerGroup";

export interface AccessSummaryInput {
  provinces: { provinceId: string; province: { name: string } }[];
  districts: { districtId: string; district: { name: string } }[];
  farmerGroups: { farmerGroupId: string; farmerGroup: { name: string; abrv: string | null } }[];
}

export interface AccessSummaryLabel {
  /** Kunci unik lintas jenis (id provinsi/distrik/Lembaga bisa saja sama). */
  key: string;
  kind: AccessSummaryKind;
  label: string;
}

export function accessSummaryLabels(access: AccessSummaryInput): AccessSummaryLabel[] {
  return [
    ...access.provinces.map((p) => ({
      key: `province-${p.provinceId}`,
      kind: "province" as const,
      label: `Semua district di ${p.province.name}`,
    })),
    ...access.districts.map((d) => ({
      key: `district-${d.districtId}`,
      kind: "district" as const,
      label: d.district.name,
    })),
    // Singkatan Lembaga bila ada, selain itu nama lengkap.
    ...access.farmerGroups.map((f) => ({
      key: `farmerGroup-${f.farmerGroupId}`,
      kind: "farmerGroup" as const,
      label: f.farmerGroup.abrv ?? f.farmerGroup.name,
    })),
  ];
}
