import { describe, it, expect } from "vitest";
import { cleanGroupInput } from "@/lib/group-placeholder";
import { BLANK_TOKENS, PENDING_TOKENS, validateParcelDetailRows } from "@/lib/land-parcel-detail-import";
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
    ["Tidak  Ada", null], // spasi ganda (review #374)
    ["Tidak\u00a0Ada", null], // NBSP
    // Owner 2026-10-12 (review pra-rilis v1.7.0): HANYA "Tidak Ada"/"-" — token import lain bisa nilai sah.
    ["n/a", "n/a"],
    ["NA", "NA"],
    ["0", "0"],
    ["Belum ada", "Belum ada"],
    ["proses", "proses"],
    ["Nama", "Nama"], // bukan token walau mengandung "na"
    ["KT  Maju", "KT Maju"], // spasi ganda dirapatkan, sama dengan pengelompokan
  ])("%j → %j", (input, expected) => {
    expect(cleanGroupInput(input)).toBe(expected);
  });

  it("token import STDB/surat (BLANK/PENDING_TOKENS) BUKAN aturan KT/Blok — selain 'Tidak Ada'/'-'/kosong, nilainya dipertahankan", () => {
    for (const t of [...BLANK_TOKENS, ...PENDING_TOKENS]) {
      const expected = t.trim() === "" || /^-+$/.test(t) || t === "tidak ada" ? null : t;
      expect(cleanGroupInput(t), t).toBe(expected);
    }
    expect(cleanGroupInput("Blok 0")).toBe("Blok 0");
  });

  it("import Detail Lahan membaca KT/Blok mentah lalu cleanGroupInput — sama dengan form (Blok '0', KT 'NA' tersimpan)", () => {
    const parcels = [
      { parcelUid: "u1", parcelId: "CTH.0001.A", farmerCode: "CTH.F1", farmerName: "X", farmerDbId: "f1", subGroupLv2: null, blok: null },
      { parcelUid: "u2", parcelId: "CTH.0002.A", farmerCode: "CTH.F2", farmerName: "Y", farmerDbId: "f2", subGroupLv2: null, blok: null },
    ];
    const rows = validateParcelDetailRows(
      [
        { ID: "CTH.0001.A", PETANI: "CTH.F1", KT: "NA", BLOK: "0" },
        { ID: "CTH.0002.A", PETANI: "CTH.F2", KT: "Tidak Ada", BLOK: "-" },
      ],
      { parcelId: "ID", farmerId: "PETANI", subGroupLv2: "KT", blok: "BLOK" },
      parcels,
    );
    expect(rows[0].data?.subGroupLv2).toBe("NA");
    expect(rows[0].data?.blok).toBe("0");
    // "Tidak Ada" / "-" = kosong → baris tanpa data detail apa pun ditolak dengan pesan itu.
    expect(rows[1]._errors).toEqual([expect.stringContaining("Tidak ada data detail")]);
  });

  it("sejalan dengan parcelGroupValue (pengelompokan Excel/peta #371/#372)", () => {
    for (const v of ["Tidak Ada", "Tidak  Ada", "Tidak\u00a0 Ada", "-", "KT Maju", "  ", "n/a", "none", "0"]) expect(cleanGroupInput(v) === null).toBe(parcelGroupValue(v) === null);
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

describe("penjaga Blok (#374 review) — aturan sama dengan KT", () => {
  it("form/shapefile & import Detail Lahan: Blok '-' / 'Tidak Ada' → null", () => {
    expect(landParcelSchema.shape.blok.parse("-")).toBeNull();
    expect(landParcelSchema.shape.blok.parse(" 11 F ")).toBe("11 F");
    expect(landParcelDetailRowSchema.shape.blok.parse("Tidak Ada")).toBeNull();
    expect(landParcelDetailRowSchema.shape.blok.parse(undefined)).toBeUndefined();
  });
});
