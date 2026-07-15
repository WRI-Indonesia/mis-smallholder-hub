import { describe, it, expect } from "vitest";
import { deriveFarmerSubGroups } from "@/lib/farmer-sub-groups";

describe("deriveFarmerSubGroups (#152)", () => {
  it("mengembalikan list kosong bila petani tidak punya lahan", () => {
    expect(deriveFarmerSubGroups([])).toEqual({ gapoktan: [], kelompokTani: [] });
  });

  it("mengabaikan subGroup null/kosong/whitespace", () => {
    const result = deriveFarmerSubGroups([
      { subGroupLv1: null, subGroupLv2: null },
      { subGroupLv1: "", subGroupLv2: "   " },
    ]);
    expect(result).toEqual({ gapoktan: [], kelompokTani: [] });
  });

  it("distinct sederhana dari beberapa lahan", () => {
    const result = deriveFarmerSubGroups([
      { subGroupLv1: "Gapoktan Maju", subGroupLv2: "KT Melati" },
      { subGroupLv1: "Gapoktan Maju", subGroupLv2: "KT Melati" },
    ]);
    expect(result.gapoktan).toEqual(["Gapoktan Maju"]);
    expect(result.kelompokTani).toEqual(["KT Melati"]);
  });

  it("petani multi-KT/Gapoktan: semua varian muncul, urut alfabetis", () => {
    const result = deriveFarmerSubGroups([
      { subGroupLv1: "KUD Sejahtera", subGroupLv2: "KT Mawar" },
      { subGroupLv1: "Gapoktan Maju", subGroupLv2: "KT Anggrek" },
      { subGroupLv1: null, subGroupLv2: "KT Mawar" },
    ]);
    expect(result.gapoktan).toEqual(["Gapoktan Maju", "KUD Sejahtera"]);
    expect(result.kelompokTani).toEqual(["KT Anggrek", "KT Mawar"]);
  });

  it("dedup ternormalisasi: trim + case-insensitive, label = varian pertama (trimmed)", () => {
    const result = deriveFarmerSubGroups([
      { subGroupLv1: "  Gapoktan Maju ", subGroupLv2: "KT Melati" },
      { subGroupLv1: "gapoktan maju", subGroupLv2: "kt melati  " },
    ]);
    expect(result.gapoktan).toEqual(["Gapoktan Maju"]);
    expect(result.kelompokTani).toEqual(["KT Melati"]);
  });

  it("Lv1 dan Lv2 dideduplikasi terpisah (nama sama boleh muncul di keduanya)", () => {
    const result = deriveFarmerSubGroups([
      { subGroupLv1: "Blok A", subGroupLv2: "Blok A" },
    ]);
    expect(result.gapoktan).toEqual(["Blok A"]);
    expect(result.kelompokTani).toEqual(["Blok A"]);
  });
});
