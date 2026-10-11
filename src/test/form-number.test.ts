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
    ["2024.9", 2024],
  ])("int %j → %j", (input, expected) => {
    expect(formOptionalInt(input)).toBe(expected);
  });

  it("teks bukan angka tetap NaN agar ditolak validasi server (tidak diam-diam jadi kosong)", () => {
    expect(Number.isNaN(formOptionalInt("abc"))).toBe(true);
    expect(Number.isNaN(formOptionalFloat("x"))).toBe(true);
  });

  it("float: spasi → null, desimal dipertahankan, File → null", () => {
    expect(formOptionalFloat("  ")).toBeNull();
    expect(formOptionalFloat("0.52")).toBe(0.52);
    expect(formOptionalFloat(new File([""], "a.txt"))).toBeNull();
  });
});
