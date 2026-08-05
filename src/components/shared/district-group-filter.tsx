"use client";

import { FilterCombobox } from "./filter-combobox";

export interface DistrictFilterOption {
  id: string;
  name: string;
}

export interface GroupFilterOption {
  id: string;
  name: string;
  code?: string | null;
  districtId: string;
}

interface Props {
  districts: DistrictFilterOption[];
  farmerGroups: GroupFilterOption[];
  districtFilter: string;
  groupFilter: string;
  onDistrictFilterChange: (value: string) => void;
  onGroupFilterChange: (value: string) => void;
}

/**
 * Pasangan filter Distrik + Lembaga Petani (combobox) yang dipakai seragam di
 * halaman Master Data (Petani, Pelatihan, Lahan, Produksi). Cascade: memilih
 * distrik menyaring daftar lembaga; lembaga terpilih yang bukan bagian dari
 * distrik baru di-reset ke "Semua" agar tidak terjadi kombinasi kontradiktif
 * (tabel kosong tanpa penjelasan). Nilai memakai sentinel `"all"` (bukan
 * `null`) mengikuti konvensi state filter Master Data.
 */
export function DistrictGroupFilter({
  districts,
  farmerGroups,
  districtFilter,
  groupFilter,
  onDistrictFilterChange,
  onGroupFilterChange,
}: Props) {
  const visibleGroups =
    districtFilter === "all"
      ? farmerGroups
      : farmerGroups.filter((g) => g.districtId === districtFilter);

  const selectedGroup = farmerGroups.find((g) => g.id === groupFilter);

  // Bila state diinisialisasi dari luar (mis. URL) ke lembaga di luar distrik
  // terpilih, tetap sertakan agar label trigger tidak diam-diam jadi "Semua".
  const comboGroups =
    selectedGroup && !visibleGroups.some((g) => g.id === selectedGroup.id)
      ? [selectedGroup, ...visibleGroups]
      : visibleGroups;

  function handleDistrictSelect(districtId: string | null) {
    onDistrictFilterChange(districtId ?? "all");
    // Lembaga terpilih tidak berada di distrik baru → reset ke "Semua".
    if (districtId !== null && selectedGroup && selectedGroup.districtId !== districtId) {
      onGroupFilterChange("all");
    }
  }

  return (
    <>
      <FilterCombobox
        options={districts}
        value={districtFilter === "all" ? null : districtFilter}
        onSelect={handleDistrictSelect}
        allLabel="Semua Distrik"
        searchPlaceholder="Cari distrik..."
        emptyLabel="Distrik tidak ditemukan."
        widthClass="w-[200px]"
      />
      <FilterCombobox
        options={comboGroups}
        value={groupFilter === "all" ? null : groupFilter}
        onSelect={(id) => onGroupFilterChange(id ?? "all")}
        allLabel="Semua Lembaga Petani"
        searchPlaceholder="Cari lembaga petani..."
        emptyLabel="Lembaga Petani tidak ditemukan."
        widthClass="w-[330px]"
      />
    </>
  );
}
