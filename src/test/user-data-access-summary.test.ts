import { describe, it, expect } from "vitest";
import { accessSummaryLabels, type AccessSummaryInput } from "@/lib/user-data-access-summary";

/**
 * Badge "Ringkasan Akses" di modal Akses Data pengguna — fungsi murni yang
 * dirender modal apa adanya (#413: dulu disalin ke dalam test).
 */

const empty: AccessSummaryInput = { provinces: [], districts: [], farmerGroups: [] };
const province = (id: string, name: string) => ({ provinceId: id, province: { name } });
const district = (id: string, name: string) => ({ districtId: id, district: { name } });
const group = (id: string, name: string, abrv: string | null) => ({ farmerGroupId: id, farmerGroup: { name, abrv } });

describe("accessSummaryLabels", () => {
  it("tanpa assignment → daftar kosong (modal: belum dibatasi)", () => {
    expect(accessSummaryLabels(empty)).toEqual([]);
  });

  it("provinsi → 'Semua district di <provinsi>'", () => {
    expect(accessSummaryLabels({ ...empty, provinces: [province("14", "Riau")] })).toEqual([
      { key: "province-14", kind: "province", label: "Semua district di Riau" },
    ]);
  });

  it("distrik → nama distrik apa adanya", () => {
    expect(accessSummaryLabels({ ...empty, districts: [district("1408", "Siak")] })).toEqual([
      { key: "district-1408", kind: "district", label: "Siak" },
    ]);
  });

  it("Lembaga → singkatan bila ada", () => {
    expect(accessSummaryLabels({ ...empty, farmerGroups: [group("g1", "Koperasi Tani Makmur", "KTM")] })[0].label).toBe("KTM");
  });

  it("Lembaga tanpa singkatan → nama lengkap", () => {
    expect(accessSummaryLabels({ ...empty, farmerGroups: [group("g2", "Kelompok Makmur", null)] })[0].label).toBe("Kelompok Makmur");
  });

  it("gabungan → urutan provinsi, distrik, Lembaga; kunci unik walau id sama lintas jenis", () => {
    const labels = accessSummaryLabels({
      provinces: [province("x", "Riau")],
      districts: [district("x", "Kampar")],
      farmerGroups: [group("x", "Koperasi Tani Makmur", "KTM")],
    });
    expect(labels.map((l) => [l.kind, l.label])).toEqual([
      ["province", "Semua district di Riau"],
      ["district", "Kampar"],
      ["farmerGroup", "KTM"],
    ]);
    expect(new Set(labels.map((l) => l.key)).size).toBe(3);
  });
});
