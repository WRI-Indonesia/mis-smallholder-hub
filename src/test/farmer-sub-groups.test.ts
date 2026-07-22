import { describe, it, expect } from "vitest";
import { deriveFarmerSubGroups } from "@/lib/farmer-sub-groups";

describe("deriveFarmerSubGroups (#152)", () => {
  it("mengembalikan list kosong bila petani tidak punya lahan", () => {
    expect(deriveFarmerSubGroups([])).toEqual({ kelompokTani: [] });
  });

  it("mengabaikan subGroup null/kosong/whitespace", () => {
    const result = deriveFarmerSubGroups([
      { subGroupLv2: null },
      { subGroupLv2: "   " },
    ]);
    expect(result).toEqual({ kelompokTani: [] });
  });

  it("distinct sederhana dari beberapa lahan", () => {
    const result = deriveFarmerSubGroups([
      { subGroupLv2: "KT Melati" },
      { subGroupLv2: "KT Melati" },
    ]);
    expect(result.kelompokTani).toEqual(["KT Melati"]);
  });

  it("petani multi-KT: semua varian muncul, urut alfabetis", () => {
    const result = deriveFarmerSubGroups([
      { subGroupLv2: "KT Mawar" },
      { subGroupLv2: "KT Anggrek" },
      { subGroupLv2: "KT Mawar" },
    ]);
    expect(result.kelompokTani).toEqual(["KT Anggrek", "KT Mawar"]);
  });

  it("dedup ternormalisasi: trim + case-insensitive, label = varian pertama (trimmed)", () => {
    const result = deriveFarmerSubGroups([
      { subGroupLv2: "KT Melati" },
      { subGroupLv2: "kt melati  " },
    ]);
    expect(result.kelompokTani).toEqual(["KT Melati"]);
  });
});
