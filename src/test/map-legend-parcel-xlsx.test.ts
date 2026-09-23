import { describe, it, expect } from "vitest";
import { planParcelXlsxSheets } from "@/app/(admin)/admin/map/parcel/map-legend-export";

/** Modal Excel baris lahan Legenda Peta Lahan (#371): pecahan sheet + urutan. */

type Props = Parameters<typeof planParcelXlsxSheets>[0][number]["properties"];

const feat = (idLahan: string, namaPetani: string, kelompokTani: string | null, blok: string | null, x: number, yTop: number) => ({
  type: "Feature" as const,
  geometry: { type: "Polygon" as const, coordinates: [[[x, yTop], [x + 1, yTop], [x + 1, yTop - 1], [x, yTop - 1], [x, yTop]]] },
  properties: { idLahan, namaPetani, kelompokTani, blok, lembaga: "APSS - Sei Galuh", kodeLembaga: "ISH-1401-01" } as unknown as Props,
});

const FEATURES = [
  feat("L1", "Yanti", "KT B", "2 F", 0, 5),
  feat("L2", "Agus", "KT A", "11 F", 5, 5),
  feat("L3", "Budi", "Tidak Ada", "2 F", 2, 5),
  feat("L4", "Citra", "KT A", null, 1, 2),
];
const ids = (fs: { properties: Props }[]) => fs.map((f) => f.properties.idLahan);

describe("planParcelXlsxSheets", () => {
  it("1 sheet, abjad: Lembaga → KT → nama petani", () => {
    const sheets = planParcelXlsxSheets(FEATURES, { split: "single", order: "pemilik" });
    expect(sheets.map((s) => s.name)).toEqual(["Data"]);
    expect(ids(sheets[0].features)).toEqual(["L2", "L4", "L1", "L3"]);
  });

  it("1 sheet, posisi: baris utara kiri → kanan, lalu baris bawah", () => {
    const [sheet] = planParcelXlsxSheets(FEATURES, { split: "single", order: "posisi" });
    expect(ids(sheet.features)).toEqual(["L1", "L3", "L2", "L4"]);
  });

  it("per Blok: sheet Semua + sheet bernama Blok, urutan natural, Tanpa Blok di akhir", () => {
    const sheets = planParcelXlsxSheets(FEATURES, { split: "blok", order: "posisi" });
    expect(sheets.map((s) => s.name)).toEqual(["Semua", "2 F", "11 F", "Tanpa Blok"]);
    expect(ids(sheets[0].features)).toHaveLength(4);
    expect(ids(sheets[1].features)).toEqual(["L1", "L3"]);
  });

  it("per KT: 'Tidak Ada' = Tanpa KT", () => {
    const sheets = planParcelXlsxSheets(FEATURES, { split: "kelompokTani", order: "pemilik" });
    expect(sheets.map((s) => s.name)).toEqual(["Semua", "KT A", "KT B", "Tanpa KT"]);
    expect(ids(sheets[1].features)).toEqual(["L2", "L4"]);
  });
});
