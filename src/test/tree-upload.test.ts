import { describe, it, expect } from "vitest";
import { groupTreeFeatures, treeDensity, type TreeFeatureInput } from "@/lib/tree-upload";
import { treeGroupSchema, bulkCreateTreesSchema } from "@/validations/tree.schema";

/** Fitur point valid ala hasil parse shpjs atas ekspor pohon (#238). */
function feat(
  index: number,
  props: Record<string, unknown>,
  geometry: TreeFeatureInput["geometry"] = { type: "Point", coordinates: [100.7, 0.78] },
): TreeFeatureInput {
  return { index, properties: props, geometry };
}

describe("groupTreeFeatures — parsing & pengelompokan per parcel_id", () => {
  it("membaca atribut lengkap dan koordinat dari geometri Point", () => {
    const { groups, skipped } = groupTreeFeatures([
      feat(0, {
        no: 1,
        tree_id: 48914,
        parcel_id: "ITM.0001.A.14.06.06.2017",
        farmer: "Daniar Sholikhatun",
        lon: 100.70568174,
        lat: 0.78263561,
        category: "unknown",
        vigor: 0.83,
        source: "auto",
        model_ver: "v2",
      }),
    ]);

    expect(skipped).toEqual([]);
    expect(groups).toHaveLength(1);
    expect(groups[0].parcelId).toBe("ITM.0001.A.14.06.06.2017");
    expect(groups[0].rows[0]).toEqual({
      treeId: 48914,
      sequenceNo: 1,
      longitude: 100.7, // dari geometri Point, bukan atribut lon/lat
      latitude: 0.78,
      category: "unknown",
      vigor: 0.83,
      source: "auto",
      modelVersion: "v2",
    });
  });

  it("mengelompokkan titik lintas lahan dalam satu file", () => {
    const { groups } = groupTreeFeatures([
      feat(0, { parcel_id: "A" }),
      feat(1, { parcel_id: "B" }),
      feat(2, { parcel_id: "A" }),
    ]);
    expect(groups.map((g) => [g.parcelId, g.rows.length])).toEqual([
      ["A", 2],
      ["B", 1],
    ]);
  });

  it("NULL DBF ('********') dan string kosong dinormalkan jadi null", () => {
    const { groups } = groupTreeFeatures([
      feat(0, { parcel_id: "A", vigor: "********", model_ver: "", category: "  ", source: null }),
    ]);
    const row = groups[0].rows[0];
    expect(row.vigor).toBeNull();
    expect(row.modelVersion).toBeNull();
    expect(row.category).toBeNull();
    expect(row.source).toBeNull();
  });

  it("nama atribut tidak peduli kapitalisasi (DBF kadang uppercase)", () => {
    const { groups } = groupTreeFeatures([
      feat(0, { PARCEL_ID: "A", TREE_ID: "7", SOURCE: "moved" }),
    ]);
    expect(groups[0].parcelId).toBe("A");
    expect(groups[0].rows[0].treeId).toBe(7);
    expect(groups[0].rows[0].source).toBe("moved");
  });

  it("tanpa parcel_id → dilewati dengan alasan, tidak menggagalkan file", () => {
    const { groups, skipped } = groupTreeFeatures([
      feat(0, { parcel_id: "" }),
      feat(1, { parcel_id: "A" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(skipped).toEqual([{ index: 0, reason: "Atribut parcel_id kosong" }]);
  });

  it("geometri hilang → fallback ke atribut lon/lat", () => {
    const { groups, skipped } = groupTreeFeatures([
      feat(0, { parcel_id: "A", lon: "101.5", lat: "-0.5" }, null),
    ]);
    expect(skipped).toEqual([]);
    expect(groups[0].rows[0].longitude).toBe(101.5);
    expect(groups[0].rows[0].latitude).toBe(-0.5);
  });

  it("koordinat di luar rentang WGS84 (proyeksi meter?) → dilewati dengan alasan", () => {
    const { groups, skipped } = groupTreeFeatures([
      feat(0, { parcel_id: "A" }, { type: "Point", coordinates: [11212843.9, 87121.2] }),
    ]);
    expect(groups).toHaveLength(0);
    expect(skipped[0].reason).toContain("WGS84");
  });

  it("geometri bukan Point tanpa atribut lon/lat → dilewati", () => {
    const { groups, skipped } = groupTreeFeatures([
      feat(0, { parcel_id: "A" }, { type: "Polygon", coordinates: [[[1, 2]]] }),
    ]);
    expect(groups).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });
});

describe("treeDensity — kerapatan tanam (pohon/ha)", () => {
  it("286 pohon / 1,945 ha ≈ 147 pohon/ha (sampel ITM.0001)", () => {
    expect(treeDensity(286, 1.945)).toBeCloseTo(147.04, 1);
  });

  it("luas null / 0 / negatif → null (jangan bagi nol)", () => {
    expect(treeDensity(100, null)).toBeNull();
    expect(treeDensity(100, undefined)).toBeNull();
    expect(treeDensity(100, 0)).toBeNull();
    expect(treeDensity(100, -1)).toBeNull();
  });
});

describe("skema Zod bulk upload pohon", () => {
  const validRow = {
    treeId: 1,
    sequenceNo: 1,
    longitude: 100.7,
    latitude: 0.78,
    category: null,
    vigor: null,
    source: "auto",
    modelVersion: null,
  };

  it("grup tanpa baris → ditolak", () => {
    expect(treeGroupSchema.safeParse({ parcelId: "A", rows: [] }).success).toBe(false);
  });

  it("longitude di luar ±180 → ditolak", () => {
    const parsed = treeGroupSchema.safeParse({
      parcelId: "A",
      rows: [{ ...validRow, longitude: 200 }],
    });
    expect(parsed.success).toBe(false);
  });

  it("payload valid diterima", () => {
    const parsed = bulkCreateTreesSchema.safeParse({
      sourceFile: "pohon_ITM_0001.zip",
      groups: [{ parcelId: "A", rows: [validRow] }],
    });
    expect(parsed.success).toBe(true);
  });

  it("tanpa grup sama sekali → ditolak", () => {
    expect(bulkCreateTreesSchema.safeParse({ groups: [] }).success).toBe(false);
  });
});

describe("parcel_id ambigu lintas petani — deteksi duplikat (mirror bulkCreateTrees & preview client)", () => {
  // Mirror: parcelId hanya unik PER PETANI; id yang resolve ke >1 baris lahan
  // aktif harus ditolak, bukan diam-diam memilih salah satu.
  function ambiguousIds(activeParcels: { parcelId: string }[], requested: string[]): string[] {
    const counts = new Map<string, number>();
    for (const p of activeParcels) counts.set(p.parcelId, (counts.get(p.parcelId) ?? 0) + 1);
    return requested.filter((pid) => (counts.get(pid) ?? 0) > 1);
  }

  it("parcelId dipakai dua petani → terdeteksi ambigu", () => {
    const parcels = [{ parcelId: "A.01" }, { parcelId: "A.01" }, { parcelId: "B.02" }];
    expect(ambiguousIds(parcels, ["A.01", "B.02"])).toEqual(["A.01"]);
  });

  it("parcelId unik → tidak ada yang ambigu", () => {
    const parcels = [{ parcelId: "A.01" }, { parcelId: "B.02" }];
    expect(ambiguousIds(parcels, ["A.01", "B.02"])).toEqual([]);
  });
});

describe("revisi per-set — keputusan nomor revisi (mirror bulkCreateTrees)", () => {
  // Mirror logika di bulk-upload-tree.ts: max revision set aktif; null = belum ada set.
  function nextRevision(prevMaxRevision: number | null): number {
    return prevMaxRevision != null ? prevMaxRevision + 1 : 0;
  }

  it("lahan belum punya pohon → set pertama revision 0", () => {
    expect(nextRevision(null)).toBe(0);
  });

  it("sudah ada set aktif revision N → set baru N+1 (set lama dinonaktifkan)", () => {
    expect(nextRevision(0)).toBe(1);
    expect(nextRevision(3)).toBe(4);
  });
});
