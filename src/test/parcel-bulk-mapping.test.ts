import { describe, it, expect } from "vitest";
import {
  PARCEL_AUTO_MATCH_RULES,
  autoMatchColumns,
  normalizeAttr,
} from "@/lib/parcel-bulk-mapping";

const ALL_KEYS = Object.keys(PARCEL_AUTO_MATCH_RULES);

describe("parcel bulk mapping (#150)", () => {
  describe("autoMatchColumns", () => {
    it("memetakan atribut shapefile umum ke subGroupLv2/blok", () => {
      const headers = ["ID_LAHAN", "ID_PETANI", "LUAS_HA", "KELOMPOK_TANI", "BLOK"];
      const m = autoMatchColumns(headers, ALL_KEYS);
      expect(m.parcelId).toBe("ID_LAHAN");
      expect(m.farmerId).toBe("ID_PETANI");
      expect(m.area).toBe("LUAS_HA");
      expect(m.subGroupLv2).toBe("KELOMPOK_TANI");
      expect(m.blok).toBe("BLOK");
    });

    it("match case-insensitive + trim; alias poktan/kt dikenali", () => {
      const m = autoMatchColumns(["Poktan", "blk"], ALL_KEYS);
      expect(m.subGroupLv2).toBe("Poktan");
      expect(m.blok).toBe("blk");
    });

    it("header tanpa alias → field tak terpetakan (opsional, tak memblokir)", () => {
      const m = autoMatchColumns(["FOO", "BAR"], ALL_KEYS);
      expect(m.subGroupLv2).toBeUndefined();
      expect(m.blok).toBeUndefined();
    });

    it("alias 'kt' tidak menabrak field lain (kolom pertama yang cocok menang)", () => {
      const m = autoMatchColumns(["KT", "NAMA_KT"], ALL_KEYS);
      expect(m.subGroupLv2).toBe("KT"); // urutan header, bukan urutan alias
    });
  });

  describe("normalizeAttr (null-handling)", () => {
    it("trim spasi; string kosong/whitespace → null", () => {
      expect(normalizeAttr("  Gapoktan Maju ")).toBe("Gapoktan Maju");
      expect(normalizeAttr("")).toBeNull();
      expect(normalizeAttr("   ")).toBeNull();
    });

    it("null/undefined → null (tidak melempar)", () => {
      expect(normalizeAttr(null)).toBeNull();
      expect(normalizeAttr(undefined)).toBeNull();
    });

    it("nilai non-string di-stringify (atribut DBF numerik, mis. blok angka)", () => {
      expect(normalizeAttr(12)).toBe("12");
    });
  });
});
