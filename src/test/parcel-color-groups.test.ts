import { describe, it, expect } from "vitest";
import {
  buildParcelColorGroups,
  parcelColorGroupKey,
  PARCEL_GROUP_COLORS,
  NO_GROUP_COLOR,
  NO_GROUP_KEY,
} from "@/lib/parcel-color-groups";

/** Warna Sebaran Lahan per KT / per Blok (#372) — pola data Sei Galuh. */
const r = (kelompokTani: string | null, blok: string | null) => ({ kelompokTani, blok });
const PARCELS = [
  r("KUD Terbit Sentosa Makmur", "11 F"),
  r("Tidak Ada", "2 F"),
  r("Deli makmur", null),
  r("kud terbit sentosa makmur", "DUSUN 3"),
  r(null, "Dusun  3"),
  r("KUD Terbit Sentosa Makmur", "2 F"),
];

describe("buildParcelColorGroups", () => {
  it("mode KT: 'Tidak Ada' & kosong = Tanpa Kelompok Tani (abu, di akhir); tak peka huruf besar-kecil", () => {
    const g = buildParcelColorGroups(PARCELS, "kelompokTani");
    expect(g.map((x) => x.label)).toEqual(["Deli makmur", "KUD Terbit Sentosa Makmur", "Tanpa Kelompok Tani"]);
    expect(g.map((x) => x.color)).toEqual([PARCEL_GROUP_COLORS[0], PARCEL_GROUP_COLORS[1], NO_GROUP_COLOR]);
  });

  it("mode Blok: lintas KT, urutan natural, spasi ganda dirapatkan, Tanpa Blok di akhir", () => {
    const g = buildParcelColorGroups(PARCELS, "blok");
    expect(g.map((x) => x.label)).toEqual(["2 F", "11 F", "DUSUN 3", "Tanpa Blok"]);
    expect(g[3].color).toBe(NO_GROUP_COLOR);
  });

  it("kunci lahan cocok dengan kunci grup", () => {
    const keys = new Set(buildParcelColorGroups(PARCELS, "blok").map((x) => x.key));
    for (const p of PARCELS) expect(keys.has(parcelColorGroupKey(p, "blok"))).toBe(true);
    expect(parcelColorGroupKey(r("Tidak Ada", null), "kelompokTani")).toBe(NO_GROUP_KEY);
  });

  it("grup > palet: warna berulang, 'Tanpa' tetap abu", () => {
    const many = Array.from({ length: PARCEL_GROUP_COLORS.length + 2 }, (_, i) => r(null, `B${i + 1}`));
    const g = buildParcelColorGroups(many, "blok");
    expect(g[PARCEL_GROUP_COLORS.length].color).toBe(PARCEL_GROUP_COLORS[0]);
  });
});
