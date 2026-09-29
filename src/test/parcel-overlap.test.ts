import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  OVERLAP_GEOMETRY_CHUNK,
  OVERLAP_LEVEL_RANK,
  OVERLAP_LEVELS,
  OVERLAP_PCT_DEFAULT,
  buildOverlapRows,
  filterOverlapRows,
  isNegligibleOverlap,
  overlapFilterOptions,
  overlapKind,
  overlapLevel,
  pairCountByParcel,
  parseKind,
  parseLevel,
  parsePctOption,
  type OverlapRaw,
  type ParcelOverlapRow,
} from "@/lib/parcel-overlap";

/**
 * Tumpang Tindih Lahan (#317 Fase 2). Aturan yang dijaga: ambang buang
 * <100 m² DAN <1%, persen terhadap lahan TERKECIL, pemisahan Duplikat vs
 * Tercakup, filter ">" ketat, dan guard 3 lapis action (izin, scope "minimal
 * satu sisi", validasi kunci pasangan).
 */
const side = (id: string, o: Partial<OverlapRaw["a"]> = {}): OverlapRaw["a"] => ({
  id,
  parcelId: `L-${id}`,
  kelompokTani: null,
  farmerId: `f-${id}`,
  farmerCode: `SH-${id}`,
  farmerName: `Petani ${id}`,
  groupId: "g1",
  groupName: "Lembaga Satu",
  districtId: "d1",
  districtName: "Siak",
  areaM2: 10_000,
  ...o,
});
const raw = (intersectionM2: number, a: OverlapRaw["a"], b: OverlapRaw["b"]): OverlapRaw => ({ intersectionM2, a, b });

describe("ambang buang irisan", () => {
  it("dibuang hanya bila < 100 m² DAN < 1% lahan terkecil", () => {
    expect(isNegligibleOverlap(99, 20_000)).toBe(true); // 0,5%
    expect(isNegligibleOverlap(99, 5_000)).toBe(false); // 1,98% → tetap tampil
    expect(isNegligibleOverlap(150, 1_000_000)).toBe(false); // 0,015% tapi ≥ 100 m²
    expect(isNegligibleOverlap(100, 20_000)).toBe(false); // tepat 100 m² bukan "< 100"
  });
});

describe("jenis & label pasangan", () => {
  it("petani sama didahulukan dari kesamaan Lembaga", () => {
    expect(overlapKind({ farmerId: "f", groupId: "g1" }, { farmerId: "f", groupId: "g2" })).toBe("SAME_FARMER");
    expect(overlapKind({ farmerId: "f1", groupId: "g1" }, { farmerId: "f2", groupId: "g1" })).toBe("SAME_GROUP");
    expect(overlapKind({ farmerId: "f1", groupId: "g1" }, { farmerId: "f2", groupId: "g2" })).toBe("CROSS_GROUP");
  });

  it("urutan sortir Label mengikuti tingkat (Duplikat → Tercakup → Sebagian), bukan jenis", () => {
    expect([...OVERLAP_LEVELS].sort((x, y) => OVERLAP_LEVEL_RANK[y] - OVERLAP_LEVEL_RANK[x]).reverse()).toEqual(["DUPLICATE", "CONTAINED", "PARTIAL"]);
    expect(OVERLAP_LEVEL_RANK.DUPLICATE).toBeLessThan(OVERLAP_LEVEL_RANK.CONTAINED);
    expect(OVERLAP_LEVEL_RANK.CONTAINED).toBeLessThan(OVERLAP_LEVEL_RANK.PARTIAL);
  });

  it("Duplikat = > 90% dari kedua lahan; Tercakup = hanya lahan kecil > 90%; sisanya Sebagian", () => {
    expect(overlapLevel(95, 92)).toBe("DUPLICATE");
    expect(overlapLevel(100, 20)).toBe("CONTAINED");
    expect(overlapLevel(90, 90)).toBe("PARTIAL"); // ambang ketat
    expect(overlapLevel(40, 10)).toBe("PARTIAL");
  });
});

describe("buildOverlapRows", () => {
  it("persen per sisi & pctMin terhadap lahan TERKECIL; luas ha; inScope per sisi", () => {
    // Lahan kecil 0,5 ha seluruhnya di dalam lahan 2 ha.
    const [r] = buildOverlapRows(
      [raw(5_000, side("a", { areaM2: 5_000 }), side("b", { areaM2: 20_000, groupId: "g2", groupName: "Lembaga Dua" }))],
      new Set(["a"])
    );
    expect(r).toMatchObject({ key: "a|b", pctMin: 100, intersectionHa: 0.5, kind: "CROSS_GROUP", level: "CONTAINED" });
    expect(r.a).toMatchObject({ pct: 100, areaHa: 0.5, inScope: true });
    expect(r.b).toMatchObject({ pct: 25, areaHa: 2, inScope: false });
    expect(r.b).not.toHaveProperty("areaM2");
  });

  it("membuang irisan tepi & mengurutkan % terbesar dulu (lalu luas irisan)", () => {
    const rows = buildOverlapRows(
      [
        raw(50, side("p"), side("q")), // 0,5% & < 100 m² → buang
        raw(3_000, side("c"), side("d")), // 30%
        raw(9_500, side("e"), side("f")), // 95%
        raw(4_000, side("g", { areaM2: 40_000 }), side("h", { areaM2: 13_333 })), // 30%, irisan lebih besar
      ],
      new Set()
    );
    expect(rows.map((r) => r.key)).toEqual(["e|f", "g|h", "c|d"]);
    expect(rows[0].level).toBe("DUPLICATE");
  });

  it("persen dibatasi 100 (irisan hasil geometri bisa sedikit melebihi luas lahan)", () => {
    const [r] = buildOverlapRows([raw(10_001, side("a"), side("b"))], new Set());
    expect(r.pctMin).toBe(100);
  });
});

describe("filter halaman", () => {
  const rows: ParcelOverlapRow[] = buildOverlapRows(
    [
      raw(9_500, side("a"), side("b", { farmerId: "f-a" })), // 95%, petani sama
      raw(5_000, side("c"), side("d")), // 50%, satu Lembaga
      raw(1_200, side("e"), side("f", { groupId: "g2", groupName: "Lembaga Dua", districtId: "d2", districtName: "Kampar" })), // 12%, lintas
      raw(500, side("g"), side("h")), // 5%
    ],
    new Set()
  );
  const f = (o: Partial<Parameters<typeof filterOverlapRows>[1]>) =>
    filterOverlapRows(rows, { pct: "all", kind: null, level: null, groupId: null, districtId: null, ...o }).map((r) => r.key);

  it("ambang persen ketat '>' pada tiap pilihan", () => {
    expect(f({})).toHaveLength(4);
    expect(f({ pct: "10" })).toEqual(["a|b", "c|d", "e|f"]);
    expect(f({ pct: "25" })).toEqual(["a|b", "c|d"]);
    expect(f({ pct: "50" })).toEqual(["a|b"]); // tepat 50% tidak masuk
    expect(f({ pct: "75" })).toEqual(["a|b"]);
    expect(f({ pct: "90" })).toEqual(["a|b"]);
  });

  it("jenis, Lembaga, dan Kabupaten cocok bila SALAH SATU sisi cocok", () => {
    expect(f({ kind: "SAME_FARMER" })).toEqual(["a|b"]);
    expect(f({ kind: "CROSS_GROUP" })).toEqual(["e|f"]);
    expect(f({ groupId: "g2" })).toEqual(["e|f"]);
    expect(f({ districtId: "d2" })).toEqual(["e|f"]);
  });

  it("filter label (chip ringkasan)", () => {
    expect(f({ level: "DUPLICATE" })).toEqual(["a|b"]);
    expect(f({ level: "PARTIAL" })).toEqual(["c|d", "e|f", "g|h"]);
    expect(f({ level: "CONTAINED" })).toEqual([]);
  });

  it("pasangan per lahan dihitung dari kedua sisi", () => {
    const m = pairCountByParcel(buildOverlapRows([raw(5_000, side("a"), side("b")), raw(5_000, side("a"), side("c"))], new Set()));
    expect([m.get("a"), m.get("b"), m.get("c")]).toEqual([2, 1, 1]);
  });

  it("opsi filter diambil dari kedua sisi, urut nama", () => {
    const o = overlapFilterOptions(rows);
    expect(o.groups.map((g) => g.name)).toEqual(["Lembaga Dua", "Lembaga Satu"]);
    expect(o.districts.map((d) => d.name)).toEqual(["Kampar", "Siak"]);
  });

  it("nilai URL tak dikenal → bawaan", () => {
    expect(parsePctOption("33")).toBe(OVERLAP_PCT_DEFAULT);
    expect(parsePctOption(null)).toBe("all");
    expect(parsePctOption("10")).toBe("10");
    expect(parsePctOption("all")).toBe("all");
    expect(parseKind("X")).toBeNull();
    expect(parseKind("SAME_GROUP")).toBe("SAME_GROUP");
    expect(parseLevel("CONTAINED")).toBe("CONTAINED");
    expect(parseLevel("dup")).toBeNull();
  });
});

// ─── Guard action (tanpa DB) ────────────────────────────────────────────────

const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  getAccessContext,
  rawFarmerGroupScope: (await import("@/lib/access-scope")).rawFarmerGroupScope,
}));
const db = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getParcelOverlaps, getParcelOverlapGeometries } = await import("@/server/actions/parcel-overlap");

/** Rakit ulang kueri yang dikirim ke `$queryRaw` (tagged template) → SQL + parameter. */
const sentQuery = () => {
  const [strings, ...values] = db.$queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
  return Prisma.sql(strings, ...values);
};

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.$queryRaw.mockResolvedValue([]);
});

describe("guard getParcelOverlaps", () => {
  it("tanpa VIEW → melempar tanpa menyentuh DB", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getParcelOverlaps()).rejects.toThrow(/izin/);
    expect(hasPermission).toHaveBeenCalledWith("data-analyst-parcel-overlap", "VIEW");
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("BY_FARMER_GROUP: pasangan disaring 'sisi A di scope ATAU sisi B di scope'", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-1"] });
    await getParcelOverlaps();
    const q = sentQuery();
    expect(q.sql.replace(/\s+/g, " ")).toMatch(/AND \(\(\(.*ga\.id = ANY.*\)\) OR \(\(.*gb\.id = ANY/);
    expect(q.values).toContainEqual(["g-1"]);
    expect(q.sql).toMatch(/a\.is_active/);
    expect(q.sql).toMatch(/b\.is_active/);
    // Soft delete berlaku juga untuk Lembaga (review #317).
    expect(q.sql).toMatch(/ga\.id = fa\.farmer_group_id AND ga\.is_active/);
    expect(q.sql).toMatch(/gb\.id = fb\.farmer_group_id AND gb\.is_active/);
  });

  it("BY_DISTRICT: id distrik diteruskan ke fragmen scope; tanpa daftar Lembaga", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d-9"] });
    await getParcelOverlaps();
    const q = sentQuery();
    expect(q.values).toContainEqual(["d-9"]);
    expect(q.sql).toMatch(/ga\.district_id = ANY/);
  });

  it("menandai inScope per sisi dari kolom SQL dan menerapkan ambang buang", async () => {
    const r = (o: Record<string, unknown>) => ({
      aId: "a", aParcelId: "LA", aKt: null, aAreaM2: "10000", aFarmerId: "fa", aFarmerCode: "SA", aFarmerName: "A",
      aGroupId: "g1", aGroupName: "G1", aDistrictId: "d1", aDistrictName: "D1",
      bId: "b", bParcelId: "LB", bKt: "KT", bAreaM2: "10000", bFarmerId: "fb", bFarmerCode: "SB", bFarmerName: "B",
      bGroupId: "g2", bGroupName: "G2", bDistrictId: "d1", bDistrictName: "D1",
      aInScope: true, bInScope: false, intersectionM2: "5000",
      ...o,
    });
    db.$queryRaw.mockResolvedValue([r({}), r({ aId: "x", bId: "y", intersectionM2: "10" })]);
    const rows = await getParcelOverlaps();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ pctMin: 50, kind: "CROSS_GROUP", a: { inScope: true }, b: { inScope: false, kelompokTani: "KT" } });
  });
});

describe("guard getParcelOverlapGeometries", () => {
  it("preview butuh VIEW, ekspor butuh EXPORT", async () => {
    hasPermission.mockResolvedValue(false);
    expect(await getParcelOverlapGeometries(["a|b"], "preview")).toMatchObject({ success: false });
    expect(hasPermission).toHaveBeenLastCalledWith("data-analyst-parcel-overlap", "VIEW");
    expect(await getParcelOverlapGeometries(["a|b"], "export")).toMatchObject({ success: false });
    expect(hasPermission).toHaveBeenLastCalledWith("data-analyst-parcel-overlap", "EXPORT");
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("kunci pasangan tidak valid / preview > 1 pasangan → ditolak tanpa kueri", async () => {
    for (const keys of [[], ["a"], ["a|b|c"], ["a;--|b"], ["a|b", "c|d"]]) {
      expect(await getParcelOverlapGeometries(keys, "preview")).toMatchObject({ success: false });
    }
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("ekspor > batas per panggilan ditolak (client memecah per OVERLAP_GEOMETRY_CHUNK)", async () => {
    const keys = Array.from({ length: OVERLAP_GEOMETRY_CHUNK + 1 }, (_, i) => `a${i}|b${i}`);
    expect(await getParcelOverlapGeometries(keys, "export")).toMatchObject({ success: false });
    expect(await getParcelOverlapGeometries(keys.slice(0, OVERLAP_GEOMETRY_CHUNK), "export")).toMatchObject({ success: true });
  });

  it("ekspor tidak mengirim poligon utuh kedua lahan; baris ekspor tanpa a/b tetap dikembalikan", async () => {
    const inter = { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
    db.$queryRaw.mockResolvedValue([{ aId: "a", bId: "b", ga: null, gb: null, gi: inter }]);
    const res = await getParcelOverlapGeometries(["a|b"], "export");
    expect(res).toEqual({ success: true, data: [{ key: "a|b", a: null, b: null, intersection: inter }] });
    const q = sentQuery();
    expect(q.sql.replace(/\s+/g, " ")).toMatch(/CASE WHEN \?::text = 'preview' THEN a\.geometry END AS ga/);
    expect(q.values).toContain("export");
  });

  it("preview tanpa poligon lahan (data rusak) dibuang, bukan dikirim setengah", async () => {
    db.$queryRaw.mockResolvedValue([{ aId: "a", bId: "b", ga: null, gb: null, gi: null }]);
    expect(await getParcelOverlapGeometries(["a|b"], "preview")).toEqual({ success: true, data: [] });
  });

  it("memakai scope yang sama (minimal satu sisi) & membuang irisan kosong", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-1"] });
    const poly = { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
    db.$queryRaw.mockResolvedValue([{ aId: "a", bId: "b", ga: poly, gb: poly, gi: { type: "MultiPolygon", coordinates: [] } }]);
    const res = await getParcelOverlapGeometries(["a|b"], "export");
    expect(res).toEqual({ success: true, data: [{ key: "a|b", a: poly, b: poly, intersection: null }] });
    const q = sentQuery();
    const flat = q.sql.replace(/\s+/g, " ");
    expect(flat).toMatch(/ga\.id = fa\.farmer_group_id AND ga\.is_active/);
    expect(flat).toMatch(/gb\.id = fb\.farmer_group_id AND gb\.is_active/);
    // Kunci pasangan dari client tidak dipercaya: harus benar-benar beririsan (review #317).
    expect(flat).toMatch(/WHERE a\.id < b\.id .*AND ST_Intersects\(a\.geom, b\.geom\) AND NOT ST_Touches\(a\.geom, b\.geom\)/);
    expect(flat).toMatch(/AND \(\(\(.*ga\.id = ANY.*\)\) OR \(\(.*gb\.id = ANY/);
    expect(q.values).toContainEqual(["a"]);
    expect(q.values).toContainEqual(["b"]);
  });
});
