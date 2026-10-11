import { describe, expect, it } from "vitest";
import { formOptionalFloat, formOptionalInt } from "@/lib/form-number";

/** TD-008 (#412): field angka opsional form Lembaga — spasi/kosong → null, bukan NaN. */
describe("formOptionalInt / formOptionalFloat", () => {
  it.each([
    [null, null],
    ["", null],
    ["   ", null],
    ["2024", 2024],
    [" 2024 ", 2024],
    [" 2024\n", 2024],
  ])("int %j → %j", (input, expected) => {
    expect(formOptionalInt(input)).toBe(expected);
  });

  it("teks bukan angka utuh tetap NaN agar ditolak validasi server (tidak diam-diam jadi kosong / terpotong)", () => {
    for (const v of ["abc", "20x24", "2024,5", "1.5e", "2024.9"]) expect(Number.isNaN(formOptionalInt(v)), v).toBe(true);
    for (const v of ["x", "-1.2.3", "0,52"]) expect(Number.isNaN(formOptionalFloat(v)), v).toBe(true);
  });

  it("float: spasi → null, desimal dipertahankan, File → null", () => {
    expect(formOptionalFloat("  ")).toBeNull();
    expect(formOptionalFloat("0.52")).toBe(0.52);
    expect(formOptionalFloat(new File([""], "a.txt"))).toBeNull();
  });
});
