import { describe, it, expect } from "vitest";
import { buildKelompokTaniReport, type KtRawParcel } from "@/lib/report-kelompok-tani";

const P = (o: Partial<KtRawParcel> & { farmerId: string; farmerGroupId: string }): KtRawParcel => ({
  lembagaTani: "Lembaga A",
  area: 1,
  subGroupLv1: null,
  subGroupLv2: null,
  ...o,
});

describe("buildKelompokTaniReport", () => {
  it("mengelompokkan per (Lembaga × Gapoktan × KT) dengan distinct petani & jumlah lahan", () => {
    const r = buildKelompokTaniReport([
      P({ farmerId: "f1", farmerGroupId: "lg1", subGroupLv1: "Gapoktan 1", subGroupLv2: "KT A" }),
      P({ farmerId: "f1", farmerGroupId: "lg1", subGroupLv1: "Gapoktan 1", subGroupLv2: "KT A" }), // f1 lahan ke-2
      P({ farmerId: "f2", farmerGroupId: "lg1", subGroupLv1: "Gapoktan 1", subGroupLv2: "KT A" }),
      P({ farmerId: "f3", farmerGroupId: "lg1", subGroupLv1: "Gapoktan 1", subGroupLv2: "KT B" }),
    ]);
    expect(r.rows).toHaveLength(2);
    const ktA = r.rows.find((x) => x.kelompokTani === "KT A")!;
    expect(ktA.totalPetani).toBe(2); // f1, f2 (distinct, meski f1 punya 2 lahan)
    expect(ktA.totalLahan).toBe(3);
    expect(ktA.totalLuas).toBeCloseTo(3); // 3 lahan × 1 Ha (default helper)
    const ktB = r.rows.find((x) => x.kelompokTani === "KT B")!;
    expect(ktB.totalPetani).toBe(1);
    expect(ktB.totalLahan).toBe(1);
  });

  it("normalisasi trim/case → typo spasi/kapital tak memecah baris", () => {
    const r = buildKelompokTaniReport([
      P({ farmerId: "f1", farmerGroupId: "lg1", subGroupLv2: "KT Maju" }),
      P({ farmerId: "f2", farmerGroupId: "lg1", subGroupLv2: "  kt maju " }),
    ]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].totalPetani).toBe(2);
    expect(r.rows[0].kelompokTani).toBe("KT Maju"); // varian pertama (trimmed)
  });

  it("KT/Gapoktan null tetap muncul sebagai baris tersendiri", () => {
    const r = buildKelompokTaniReport([
      P({ farmerId: "f1", farmerGroupId: "lg1", subGroupLv1: null, subGroupLv2: null }),
      P({ farmerId: "f2", farmerGroupId: "lg1", subGroupLv1: "Gapoktan X", subGroupLv2: "KT Y" }),
    ]);
    expect(r.rows).toHaveLength(2);
    const nullRow = r.rows.find((x) => x.kelompokTani === null)!;
    expect(nullRow.totalLahan).toBe(1);
    expect(r.summary.totalKelompokTani).toBe(1); // hanya KT non-null
    expect(r.summary.totalGapoktan).toBe(1);
  });

  it("summary: distinct Lembaga/Gapoktan/KT/petani + total lahan", () => {
    const r = buildKelompokTaniReport([
      P({ farmerId: "f1", farmerGroupId: "lg1", lembagaTani: "L1", subGroupLv1: "G1", subGroupLv2: "KT1" }),
      P({ farmerId: "f2", farmerGroupId: "lg1", lembagaTani: "L1", subGroupLv1: "G1", subGroupLv2: "KT2" }),
      P({ farmerId: "f3", farmerGroupId: "lg2", lembagaTani: "L2", subGroupLv1: "G2", subGroupLv2: "KT3" }),
      P({ farmerId: "f1", farmerGroupId: "lg1", lembagaTani: "L1", subGroupLv1: "G1", subGroupLv2: "KT1" }), // f1 lagi
    ]);
    expect(r.summary.totalLembagaTani).toBe(2);
    expect(r.summary.totalGapoktan).toBe(2); // (lg1,G1) & (lg2,G2)
    expect(r.summary.totalKelompokTani).toBe(3);
    expect(r.summary.totalPetani).toBe(3); // f1,f2,f3 distinct
    expect(r.summary.totalLahan).toBe(4);
    expect(r.summary.totalLuas).toBeCloseTo(4); // 4 lahan × 1 Ha
  });

  it("total luas menjumlahkan area (null → 0)", () => {
    const r = buildKelompokTaniReport([
      P({ farmerId: "f1", farmerGroupId: "lg1", subGroupLv2: "KT A", area: 2.5 }),
      P({ farmerId: "f2", farmerGroupId: "lg1", subGroupLv2: "KT A", area: null }),
      P({ farmerId: "f3", farmerGroupId: "lg1", subGroupLv2: "KT B", area: 1.5 }),
    ]);
    expect(r.summary.totalLuas).toBeCloseTo(4);
    expect(r.rows.find((x) => x.kelompokTani === "KT A")!.totalLuas).toBeCloseTo(2.5);
  });

  it("Gapoktan sama-nama di Lembaga berbeda dihitung terpisah", () => {
    const r = buildKelompokTaniReport([
      P({ farmerId: "f1", farmerGroupId: "lg1", subGroupLv1: "Gapoktan 1" }),
      P({ farmerId: "f2", farmerGroupId: "lg2", subGroupLv1: "Gapoktan 1" }),
    ]);
    expect(r.summary.totalGapoktan).toBe(2);
  });

  it("input kosong → hasil kosong", () => {
    const r = buildKelompokTaniReport([]);
    expect(r.rows).toHaveLength(0);
    expect(r.summary).toEqual({
      totalKelompokTani: 0,
      totalGapoktan: 0,
      totalLembagaTani: 0,
      totalPetani: 0,
      totalLahan: 0,
      totalLuas: 0,
    });
  });
});
