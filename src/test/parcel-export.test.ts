import { describe, it, expect } from "vitest";
import {
  buildParcelExportFeatures,
  explodeMultiPolygons,
  parcelExportFileBase,
  parcelExportGroupWhere,
  toDbfProperties,
  type ParcelExportProperties,
  type ParcelExportRow,
} from "@/lib/parcel-export-data";
import { parcelExportFilterSchema } from "@/validations/land-parcel-export.schema";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

// ── Filter ekspor (#313): Distrik ATAU Lembaga wajib, tanpa mode "all" ──────

describe("parcelExportFilterSchema", () => {
  it("menolak tanpa Distrik maupun Lembaga (tak ada mode all)", () => {
    expect(parcelExportFilterSchema.safeParse({}).success).toBe(false);
    expect(
      parcelExportFilterSchema.safeParse({ provinceId: "14", districtId: null, farmerGroupId: null })
        .success
    ).toBe(false);
  });

  it("menerima Distrik saja atau Lembaga saja", () => {
    expect(parcelExportFilterSchema.safeParse({ districtId: "1404" }).success).toBe(true);
    expect(parcelExportFilterSchema.safeParse({ farmerGroupId: "kt-1" }).success).toBe(true);
  });

  it("menolak string kosong sebagai id", () => {
    expect(parcelExportFilterSchema.safeParse({ districtId: "" }).success).toBe(false);
  });
});

// ── Scope BUG-007 (#127): filter akses masuk AND, tak tertimpa literal ──────

describe("parcelExportGroupWhere scope (BUG-007)", () => {
  it("BY_DISTRICT: literal districtId dipertahankan; scope masuk AND", () => {
    const where = parcelExportGroupWhere(
      { districtId: "d-outside" },
      { districtId: { in: ["d1"] } }
    );
    expect(where.districtId).toBe("d-outside");
    expect(where.AND).toEqual({ districtId: { in: ["d1"] } });
  });

  it("BY_FARMER_GROUP: literal id dipertahankan; scope masuk AND", () => {
    const where = parcelExportGroupWhere(
      { farmerGroupId: "kt-outside" },
      { id: { in: ["kt-1"] } }
    );
    expect(where.id).toBe("kt-outside");
    expect(where.AND).toEqual({ id: { in: ["kt-1"] } });
  });

  it("ALL: AND no-op; filter user apa adanya", () => {
    const where = parcelExportGroupWhere(
      { provinceId: "14", districtId: "d-x", farmerGroupId: "kt-x" },
      {}
    );
    expect(where.AND).toEqual({});
    expect(where.districtId).toBe("d-x");
    expect(where.id).toBe("kt-x");
    expect(where.district).toEqual({ provinceId: "14" });
  });
});

// ── Perakitan FeatureCollection beratribut lengkap ──────────────────────────

const square: Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [101.0, 0.0],
      [101.1, 0.0],
      [101.1, 0.1],
      [101.0, 0.1],
      [101.0, 0.0],
    ],
  ],
};

const row = (over: Partial<ParcelExportRow> = {}): ParcelExportRow => ({
  parcelId: "PCL-01",
  blok: "A1",
  geometry: square,
  area: 2.5,
  landStatus: "Milik",
  cropType: "Kelapa Sawit",
  species: "Elaeis guineensis",
  isPsr: false,
  plantingYear: 2018,
  subGroupLv2: "KT Harapan",
  revision: 2,
  farmer: {
    farmerId: "FMR-01",
    name: "Budi",
    nik: "1401010101010001",
    farmerGroup: { code: "LP-01", name: "LP Maju", district: { name: "Kampar" } },
  },
  identity: {
    documents: [
      { type: "SHM", number: "123", holderName: "Budi", statedArea: 1.2 },
      { type: "SKT", number: null, holderName: "Ani", statedArea: 0.8 },
    ],
    stdbLinks: [{ stdb: { number: "1637/53/1401/6/2025", stage: "TERBIT" } }],
    externalIds: [{ source: "MERIDIA", code: "ID0001" }],
    programs: [],
  },
  ...over,
});

describe("buildParcelExportFeatures", () => {
  it("memetakan atribut lengkap termasuk gabungan legalitas (pola #296/#305)", () => {
    const { fc, count, skipped } = buildParcelExportFeatures([row()]);
    expect(count).toBe(1);
    expect(skipped).toBe(0);
    const p = fc.features[0].properties;
    expect(p).toMatchObject({
      idLahan: "PCL-01",
      idPetani: "FMR-01",
      namaPetani: "Budi",
      nik: "1401010101010001",
      kodeLembaga: "LP-01",
      lembaga: "LP Maju",
      kelompokTani: "KT Harapan",
      distrik: "Kampar",
      blok: "A1",
      luasHa: 2.5,
      statusLahan: "Milik",
      psr: "Tidak",
      tahunTanam: 2018,
      revisi: 2,
    });
    // >1 dokumen → digabung distinct, bukan pilih-satu.
    expect(p.surat).toBe("SHM 123; SKT");
    expect(p.namaDiSurat).toBe("Budi; Ani");
    expect(p.luasSurat).toBeCloseTo(2.0, 5);
    expect(p.stdb).toBe("1637/53/1401/6/2025");
    expect(p.kodeUl).toContain("ID0001");
  });

  it("melewati geometri null/invalid tanpa menggagalkan batch, terhitung skipped", () => {
    const { fc, count, skipped } = buildParcelExportFeatures([
      row(),
      row({ parcelId: "PCL-02", geometry: null }),
      row({ parcelId: "PCL-03", geometry: { type: "Point", coordinates: [101, 0] } }),
      row({ parcelId: "PCL-04", geometry: { type: "Polygon", coordinates: "broken" } }),
    ]);
    expect(count).toBe(1);
    expect(skipped).toBe(3);
    expect(fc.features[0].properties.idLahan).toBe("PCL-01");
  });

  it("lahan tanpa relasi/identitas → atribut null, PSR & psr string tetap terisi", () => {
    const { fc } = buildParcelExportFeatures([
      row({ farmer: null, identity: null, isPsr: true, subGroupLv2: "  " }),
    ]);
    const p = fc.features[0].properties;
    expect(p.idPetani).toBeNull();
    expect(p.lembaga).toBeNull();
    expect(p.kelompokTani).toBeNull();
    expect(p.surat).toBeNull();
    expect(p.stdb).toBeNull();
    expect(p.psr).toBe("Ya");
  });
});

// ── DBF: kolom ≤10 karakter, string null → "" ───────────────────────────────

describe("toDbfProperties", () => {
  it("semua nama kolom ≤10 karakter dan string null menjadi kosong", () => {
    const { fc } = buildParcelExportFeatures([row({ farmer: null, identity: null })]);
    const dbf = toDbfProperties(fc.features[0].properties);
    for (const key of Object.keys(dbf)) {
      expect(key.length).toBeLessThanOrEqual(10);
    }
    expect(dbf.id_lahan).toBe("PCL-01");
    expect(dbf.nm_petani).toBe("");
    expect(dbf.surat).toBe("");
    // Angka null dibiarkan null (pola ekspor SHP titik api).
    expect(dbf.luas_surat).toBeNull();
    expect(dbf.luas_ha).toBe(2.5);
  });

  it("mentransliterasi non-ASCII (penulis dbf menulis 1 byte per karakter)", () => {
    const { fc } = buildParcelExportFeatures([
      row({ farmer: { ...row().farmer!, name: "Budi Ræhman Ñoño — “ok”" } }),
    ]);
    const dbf = toDbfProperties(fc.features[0].properties);
    // Diakritik dilepas (Ñ→N, ñ→n); tanpa dekomposisi (æ) & tipografi (— “ ”) → "?".
    expect(dbf.nm_petani).toBe("Budi R?hman Nono ? ?ok?");
  });
});

// ── SHP: MultiPolygon dipecah per poligon anggota, lubang tetap ikut ────────

describe("explodeMultiPolygons", () => {
  const props = buildParcelExportFeatures([row()]).fc.features[0].properties;
  const withHole: MultiPolygon = {
    type: "MultiPolygon",
    coordinates: [
      [
        square.coordinates[0],
        [
          [101.02, 0.02],
          [101.04, 0.02],
          [101.04, 0.04],
          [101.02, 0.02],
        ],
      ],
      [
        [
          [102.0, 0.0],
          [102.1, 0.0],
          [102.1, 0.1],
          [102.0, 0.0],
        ],
      ],
    ],
  };

  it("MultiPolygon 2 anggota → 2 Feature Polygon dengan atribut sama", () => {
    const fc: FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties> = {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: withHole, properties: props }],
    };
    const out = explodeMultiPolygons(fc);
    expect(out.features).toHaveLength(2);
    expect(out.features.every((f) => f.geometry.type === "Polygon")).toBe(true);
    // Anggota pertama membawa ring dalam (lubang) — tidak hilang saat dipecah.
    expect(out.features[0].geometry.coordinates).toHaveLength(2);
    expect(out.features[1].geometry.coordinates).toHaveLength(1);
    expect(out.features[0].properties).toBe(props);
    expect(out.features[1].properties).toBe(props);
  });

  it("Polygon biasa lolos apa adanya", () => {
    const fc: FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties> = {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: square, properties: props }],
    };
    expect(explodeMultiPolygons(fc).features).toHaveLength(1);
  });
});

// ── Nama file: lahan_<label-slug>_<YYYYMMDD-HHmm> WIB ───────────────────────

describe("parcelExportFileBase", () => {
  const now = new Date("2026-09-01T03:05:00Z"); // 10:05 WIB

  it("label di-slug-kan dan stamp memakai WIB", () => {
    expect(parcelExportFileBase("LP-01", now)).toBe("lahan_lp-01_20260901-1005");
    expect(parcelExportFileBase("Kampar  (Riau)", now)).toBe("lahan_kampar-riau_20260901-1005");
  });

  it("label kosong/null → fallback 'terfilter'", () => {
    expect(parcelExportFileBase(null, now)).toBe("lahan_terfilter_20260901-1005");
    expect(parcelExportFileBase("  ", now)).toBe("lahan_terfilter_20260901-1005");
  });
});
