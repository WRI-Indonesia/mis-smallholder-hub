import { describe, it, expect } from "vitest";
import {
  provinceSchema, updateProvinceSchema,
  districtSchema, updateDistrictSchema,
  subdistrictSchema, updateSubdistrictSchema,
  villageSchema, updateVillageSchema,
} from "@/validations/region.schema";

// ─── Helpers (mirror of region-list-client logic) ─────────────────────────────

type Village = { id: string; code: string; name: string; isActive: boolean };
type Subdistrict = { id: string; code: string; name: string; isActive: boolean; villages: Village[] };
type District = { id: string; code: string; name: string; isActive: boolean; subdistricts: Subdistrict[] };
type Province = { id: string; code: string; name: string; isActive: boolean; districts: District[] };

function matchesSearch(item: { code: string; name: string }, q: string) {
  return !q || item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
}

function matchesStatus(isActive: boolean, filter: "all" | "active" | "inactive") {
  if (filter === "active") return isActive;
  if (filter === "inactive") return !isActive;
  return true;
}

function filterProvinces(data: Province[], q: string, statusFilter: "all" | "active" | "inactive") {
  const lq = q.toLowerCase();
  return data.filter((p) => {
    if (matchesSearch(p, lq) && matchesStatus(p.isActive, statusFilter)) return true;
    return p.districts.some((d) =>
      (matchesSearch(d, lq) && matchesStatus(d.isActive, statusFilter)) ||
      d.subdistricts.some((s) =>
        (matchesSearch(s, lq) && matchesStatus(s.isActive, statusFilter)) ||
        s.villages.some((v) => matchesSearch(v, lq) && matchesStatus(v.isActive, statusFilter))
      )
    );
  });
}

function buildAutoExpandIds(data: Province[], q: string, statusFilter: "all" | "active" | "inactive") {
  const lq = q.toLowerCase();
  const ids = new Set<string>();
  if (!lq && statusFilter === "all") return ids;
  for (const p of data) {
    for (const d of p.districts) {
      for (const s of d.subdistricts) {
        const villageMatch = s.villages.some((v) => matchesSearch(v, lq) && matchesStatus(v.isActive, statusFilter));
        if (villageMatch) { ids.add(p.id); ids.add(d.id); ids.add(s.id); }
        if (matchesSearch(s, lq) && matchesStatus(s.isActive, statusFilter)) { ids.add(p.id); ids.add(d.id); }
      }
      if (matchesSearch(d, lq) && matchesStatus(d.isActive, statusFilter)) ids.add(p.id);
    }
  }
  return ids;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_DATA: Province[] = [
  {
    id: "prov-1", code: "32", name: "Jawa Barat", isActive: true,
    districts: [
      {
        id: "dist-1", code: "3201", name: "Bogor", isActive: true,
        subdistricts: [
          {
            id: "sub-1", code: "320101", name: "Cibinong", isActive: true,
            villages: [
              { id: "vil-1", code: "3201010001", name: "Nanggewer", isActive: true },
              { id: "vil-2", code: "3201010002", name: "Cirimekar", isActive: false },
            ],
          },
          {
            id: "sub-2", code: "320102", name: "Gunung Putri", isActive: false,
            villages: [
              { id: "vil-3", code: "3201020001", name: "Bojong", isActive: true },
            ],
          },
        ],
      },
      {
        id: "dist-2", code: "3202", name: "Sukabumi", isActive: false,
        subdistricts: [],
      },
    ],
  },
  {
    id: "prov-2", code: "33", name: "Jawa Tengah", isActive: true,
    districts: [],
  },
];

// ─── 1. Schema Validation: Province ──────────────────────────────────────────

describe("Region Schema - Province Create", () => {
  it("accepts valid province input", () => {
    const r = provinceSchema.safeParse({ code: "32", name: "Jawa Barat" });
    expect(r.success).toBe(true);
  });
  it("rejects empty code", () => {
    const r = provinceSchema.safeParse({ code: "", name: "Jawa Barat" });
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.code).toBeDefined();
  });
  it("rejects short name (1 char)", () => {
    const r = provinceSchema.safeParse({ code: "32", name: "J" });
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.name).toBeDefined();
  });
  it("rejects missing fields entirely", () => {
    const r = provinceSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

describe("Region Schema - Province Update", () => {
  it("accepts valid update with id", () => {
    const r = updateProvinceSchema.safeParse({ id: "prov-1", code: "32", name: "Jawa Barat" });
    expect(r.success).toBe(true);
  });
  it("rejects update without id", () => {
    const r = updateProvinceSchema.safeParse({ code: "32", name: "Jawa Barat" });
    expect(r.success).toBe(false);
  });
});

// ─── 2. Schema Validation: District ──────────────────────────────────────────

describe("Region Schema - District Create", () => {
  it("accepts valid district input", () => {
    const r = districtSchema.safeParse({ provinceId: "prov-1", code: "3201", name: "Bogor" });
    expect(r.success).toBe(true);
  });
  it("rejects empty provinceId", () => {
    const r = districtSchema.safeParse({ provinceId: "", code: "3201", name: "Bogor" });
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.provinceId).toBeDefined();
  });
  it("rejects empty code", () => {
    const r = districtSchema.safeParse({ provinceId: "prov-1", code: "", name: "Bogor" });
    expect(r.success).toBe(false);
  });
});

// ─── 3. Schema Validation: Subdistrict ────────────────────────────────────────

describe("Region Schema - Subdistrict Create", () => {
  it("accepts valid subdistrict input", () => {
    const r = subdistrictSchema.safeParse({ districtId: "dist-1", code: "320101", name: "Cibinong" });
    expect(r.success).toBe(true);
  });
  it("rejects empty districtId", () => {
    const r = subdistrictSchema.safeParse({ districtId: "", code: "320101", name: "Cibinong" });
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.districtId).toBeDefined();
  });
});

describe("Region Schema - Subdistrict Update", () => {
  it("accepts valid update", () => {
    const r = updateSubdistrictSchema.safeParse({ id: "sub-1", districtId: "dist-1", code: "320101", name: "Cibinong" });
    expect(r.success).toBe(true);
  });
  it("rejects without id", () => {
    const r = updateSubdistrictSchema.safeParse({ districtId: "dist-1", code: "320101", name: "Cibinong" });
    expect(r.success).toBe(false);
  });
});

// ─── 4. Schema Validation: Village ────────────────────────────────────────────

describe("Region Schema - Village Create", () => {
  it("accepts valid village input", () => {
    const r = villageSchema.safeParse({ subdistrictId: "sub-1", code: "3201010001", name: "Nanggewer" });
    expect(r.success).toBe(true);
  });
  it("rejects empty subdistrictId", () => {
    const r = villageSchema.safeParse({ subdistrictId: "", code: "3201010001", name: "Nanggewer" });
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.subdistrictId).toBeDefined();
  });
});

describe("Region Schema - Village Update", () => {
  it("accepts valid update", () => {
    const r = updateVillageSchema.safeParse({ id: "vil-1", subdistrictId: "sub-1", code: "3201010001", name: "Nanggewer" });
    expect(r.success).toBe(true);
  });
  it("rejects short name", () => {
    const r = updateVillageSchema.safeParse({ id: "vil-1", subdistrictId: "sub-1", code: "3201010001", name: "N" });
    expect(r.success).toBe(false);
  });
});

// ─── 5. Search Filter Logic ────────────────────────────────────────────────────

describe("Region Tree - Search filter", () => {
  it("returns all provinces when search is empty", () => {
    const result = filterProvinces(MOCK_DATA, "", "all");
    expect(result).toHaveLength(2);
  });

  it("finds province by name", () => {
    const result = filterProvinces(MOCK_DATA, "jawa barat", "all");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("prov-1");
  });

  it("finds province when district name matches", () => {
    const result = filterProvinces(MOCK_DATA, "bogor", "all");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("prov-1");
  });

  it("finds province when subdistrict name matches", () => {
    const result = filterProvinces(MOCK_DATA, "cibinong", "all");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("prov-1");
  });

  it("finds province when village name matches", () => {
    const result = filterProvinces(MOCK_DATA, "nanggewer", "all");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("prov-1");
  });

  it("finds by code", () => {
    const result = filterProvinces(MOCK_DATA, "3201", "all");
    expect(result).toHaveLength(1);
  });

  it("returns empty for non-matching query", () => {
    const result = filterProvinces(MOCK_DATA, "zzznomatch", "all");
    expect(result).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const result = filterProvinces(MOCK_DATA, "JAWA BARAT", "all");
    expect(result).toHaveLength(1);
  });
});

// ─── 6. Status Filter Logic ────────────────────────────────────────────────────

describe("Region Tree - Status filter", () => {
  it("shows all provinces with 'all' filter", () => {
    const result = filterProvinces(MOCK_DATA, "", "all");
    expect(result).toHaveLength(2);
  });

  it("shows only active provinces with 'active' filter (Jawa Tengah has no active children but is itself active)", () => {
    const result = filterProvinces(MOCK_DATA, "", "active");
    expect(result).toHaveLength(2); // both prov-1 and prov-2 are isActive: true
  });

  it("shows inactive children when status=inactive, bubbling up parent", () => {
    const result = filterProvinces(MOCK_DATA, "", "inactive");
    // dist-2 (Sukabumi) isActive: false → prov-1 should appear
    // sub-2 (Gunung Putri) isActive: false → prov-1 should appear
    // vil-2 (Cirimekar) isActive: false → prov-1 should appear
    expect(result.find((p) => p.id === "prov-1")).toBeDefined();
    // prov-2 has no inactive children and is itself active → should not appear
    expect(result.find((p) => p.id === "prov-2")).toBeUndefined();
  });
});

// ─── 7. Auto-Expand Logic ─────────────────────────────────────────────────────

describe("Region Tree - Auto-expand IDs", () => {
  it("returns empty set when no filter active", () => {
    const ids = buildAutoExpandIds(MOCK_DATA, "", "all");
    expect(ids.size).toBe(0);
  });

  it("auto-expands ancestors when village matches search", () => {
    const ids = buildAutoExpandIds(MOCK_DATA, "nanggewer", "all");
    expect(ids.has("prov-1")).toBe(true);
    expect(ids.has("dist-1")).toBe(true);
    expect(ids.has("sub-1")).toBe(true);
  });

  it("auto-expands ancestors when subdistrict matches search", () => {
    const ids = buildAutoExpandIds(MOCK_DATA, "cibinong", "all");
    expect(ids.has("prov-1")).toBe(true);
    expect(ids.has("dist-1")).toBe(true);
  });

  it("auto-expands ancestors when district matches search", () => {
    const ids = buildAutoExpandIds(MOCK_DATA, "bogor", "all");
    expect(ids.has("prov-1")).toBe(true);
  });

  it("does NOT auto-expand unrelated nodes", () => {
    const ids = buildAutoExpandIds(MOCK_DATA, "nanggewer", "all");
    expect(ids.has("prov-2")).toBe(false);
  });
});

// ─── 8. Cascade Muting Logic ──────────────────────────────────────────────────

describe("Region Tree - Cascade muting", () => {
  function isMuted(isActive: boolean, parentMuted: boolean) {
    return parentMuted || !isActive;
  }

  it("province inactive → itself muted", () => {
    expect(isMuted(false, false)).toBe(true);
  });

  it("district active but parent province inactive → muted", () => {
    expect(isMuted(true, true)).toBe(true);
  });

  it("district active and province active → not muted", () => {
    expect(isMuted(true, false)).toBe(false);
  });

  it("village active but subdistrict muted → village muted", () => {
    const subMuted = isMuted(false, false); // subdistrict is inactive
    expect(isMuted(true, subMuted)).toBe(true);
  });

  it("all active chain → leaf not muted", () => {
    const provMuted = isMuted(true, false);
    const distMuted = isMuted(true, provMuted);
    const subMuted = isMuted(true, distMuted);
    const vilMuted = isMuted(true, subMuted);
    expect(vilMuted).toBe(false);
  });
});

// ─── 9. Performance Tests ─────────────────────────────────────────────────────

describe("Performance - Region tree operations", () => {
  function buildLargeTree(provinceCount: number, distPerProv: number, subPerDist: number, vilPerSub: number): Province[] {
    return Array.from({ length: provinceCount }, (_, pi) => ({
      id: `prov-${pi}`, code: `${pi}`, name: `Province ${pi}`, isActive: pi % 4 !== 0,
      districts: Array.from({ length: distPerProv }, (_, di) => ({
        id: `dist-${pi}-${di}`, code: `${pi}${di}`, name: `District ${pi}-${di}`, isActive: di % 3 !== 0,
        subdistricts: Array.from({ length: subPerDist }, (_, si) => ({
          id: `sub-${pi}-${di}-${si}`, code: `${pi}${di}${si}`, name: `Sub ${pi}-${di}-${si}`, isActive: true,
          villages: Array.from({ length: vilPerSub }, (_, vi) => ({
            id: `vil-${pi}-${di}-${si}-${vi}`, code: `${pi}${di}${si}${vi}`, name: `Village ${pi}-${di}-${si}-${vi}`, isActive: vi % 5 !== 0,
          })),
        })),
      })),
    }));
  }

  it("filters 500 provinces (5 dist × 3 sub × 4 vil each) under 20ms", () => {
    const data = buildLargeTree(500, 5, 3, 4); // 500 × 5 × 3 × 4 = 30,000 nodes

    const start = performance.now();
    filterProvinces(data, "province 1", "all");
    const duration = performance.now() - start;

    console.log(`  filterProvinces (30k nodes): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(20);
  });

  it("builds auto-expand IDs for 10k nodes under 10ms", () => {
    const data = buildLargeTree(100, 5, 4, 5); // 100 × 5 × 4 × 5 = 10,000 nodes

    const start = performance.now();
    buildAutoExpandIds(data, "village 1", "all");
    const duration = performance.now() - start;

    console.log(`  buildAutoExpandIds (10k nodes): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(10);
  });

  it("status filter (inactive) across 10k nodes under 10ms", () => {
    const data = buildLargeTree(100, 5, 4, 5);

    const start = performance.now();
    filterProvinces(data, "", "inactive");
    const duration = performance.now() - start;

    console.log(`  filterProvinces inactive (10k nodes): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(10);
  });

  it("Zod schema parse is under 1ms for valid province input", () => {
    const start = performance.now();
    provinceSchema.safeParse({ code: "32", name: "Jawa Barat" });
    const duration = performance.now() - start;

    console.log(`  provinceSchema.safeParse: ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(1);
  });
});
