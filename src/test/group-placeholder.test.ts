import { describe, it, expect } from "vitest";
import { cleanGroupInput } from "@/lib/group-placeholder";
import { parcelGroupValue } from "@/lib/report-land-parcel";
import { landParcelSchema } from "@/validations/land-parcel.schema";
import { landParcelDetailRowSchema } from "@/validations/land-parcel-detail.schema";

/**
 * KT "Tidak Ada" (#374): 417 lahan tersimpan dengan teks pengganti kosong dan
 * terhitung sebagai KT di Detail Lembaga, Dashboard, Laporan KT, kelengkapan
 * data. Penjaga input: form lahan + upload shapefile (landParcelSchema) dan
 * import Detail Lahan (landParcelDetailRowSchema) menyimpannya sebagai kosong.
 */
describe("cleanGroupInput", () => {
  it.each([
    ["Tidak Ada", null],
    ["  tidak ada ", null],
    ["TIDAK ADA", null],
    ["-", null],
    ["---", null],
    ["   ", null],
    ["", null],
    [" KUD Terbit Sentosa Makmur ", "KUD Terbit Sentosa Makmur"],
    ["Tidak Ada Nama", "Tidak Ada Nama"], // hanya isian pengganti utuh
    ["KT-1", "KT-1"],
  ])("%j → %j", (input, expected) => {
    expect(cleanGroupInput(input)).toBe(expected);
  });

  it("sejalan dengan parcelGroupValue (pengelompokan Excel/peta #371/#372)", () => {
    for (const v of ["Tidak Ada", "-", "KT Maju", "  "]) expect(cleanGroupInput(v) === null).toBe(parcelGroupValue(v) === null);
  });
});

describe("penjaga skema KT (#374)", () => {
  const form = landParcelSchema.shape.subGroupLv2;
  const detail = landParcelDetailRowSchema.shape.subGroupLv2;

  it("form lahan & upload shapefile: 'Tidak Ada' / '-' disimpan null; nama KT di-trim; undefined tetap undefined", () => {
    expect(form.parse("Tidak Ada")).toBeNull();
    expect(form.parse("-")).toBeNull();
    expect(form.parse(" KT Maju ")).toBe("KT Maju");
    expect(form.parse(undefined)).toBeUndefined();
    expect(form.parse(null)).toBeNull();
  });

  it("import Detail Lahan: 'Tidak Ada' → null (tidak mengisi KT lahan)", () => {
    expect(detail.parse("tidak ada")).toBeNull();
    expect(detail.parse("KT Maju")).toBe("KT Maju");
    expect(detail.parse(null)).toBeNull();
  });
});
