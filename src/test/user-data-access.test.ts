import { describe, it, expect } from "vitest";

// ─── Visual Summary Logic ────────────────────────────────────────────────────

type Access = {
  provinces: { provinceId: string; province: { id: string; name: string } }[];
  districts: { districtId: string; district: { id: string; name: string } }[];
  farmerGroups: { farmerGroupId: string; farmerGroup: { id: string; name: string; abrv: string | null } }[];
};

function getSummaryLabels(access: Access): string[] {
  const labels: string[] = [];
  for (const p of access.provinces) {
    labels.push(`Semua district di ${p.province.name}`);
  }
  for (const d of access.districts) {
    labels.push(d.district.name);
  }
  for (const f of access.farmerGroups) {
    labels.push(f.farmerGroup.abrv ?? f.farmerGroup.name);
  }
  return labels;
}

function hasAnyAssignment(access: Access): boolean {
  return (
    access.provinces.length > 0 ||
    access.districts.length > 0 ||
    access.farmerGroups.length > 0
  );
}

const emptyAccess: Access = { provinces: [], districts: [], farmerGroups: [] };

describe("UserDataAccess — visual summary", () => {
  it("returns empty array when no assignments", () => {
    expect(getSummaryLabels(emptyAccess)).toHaveLength(0);
  });

  it("shows 'Semua district di X' for province assignments", () => {
    const access: Access = {
      ...emptyAccess,
      provinces: [{ provinceId: "p1", province: { id: "p1", name: "Kalimantan Tengah" } }],
    };
    const labels = getSummaryLabels(access);
    expect(labels).toContain("Semua district di Kalimantan Tengah");
  });

  it("shows district name directly for district assignments", () => {
    const access: Access = {
      ...emptyAccess,
      districts: [{ districtId: "d1", district: { id: "d1", name: "Kotawaringin Barat" } }],
    };
    const labels = getSummaryLabels(access);
    expect(labels).toContain("Kotawaringin Barat");
  });

  it("shows abrv if available for farmer group", () => {
    const access: Access = {
      ...emptyAccess,
      farmerGroups: [
        {
          farmerGroupId: "fg1",
          farmerGroup: { id: "fg1", name: "Lembaga Tani Sejahtera", abrv: "KTS" },
        },
      ],
    };
    const labels = getSummaryLabels(access);
    expect(labels).toContain("KTS");
  });

  it("shows name if abrv is null for farmer group", () => {
    const access: Access = {
      ...emptyAccess,
      farmerGroups: [
        {
          farmerGroupId: "fg2",
          farmerGroup: { id: "fg2", name: "Kelompok Makmur", abrv: null },
        },
      ],
    };
    const labels = getSummaryLabels(access);
    expect(labels).toContain("Kelompok Makmur");
  });

  it("combines all assignment types in summary", () => {
    const access: Access = {
      provinces: [{ provinceId: "p1", province: { id: "p1", name: "Kalteng" } }],
      districts: [{ districtId: "d1", district: { id: "d1", name: "Kobar" } }],
      farmerGroups: [
        { farmerGroupId: "fg1", farmerGroup: { id: "fg1", name: "KT Maju", abrv: "KTM" } },
      ],
    };
    const labels = getSummaryLabels(access);
    expect(labels).toHaveLength(3);
    expect(labels[0]).toBe("Semua district di Kalteng");
    expect(labels[1]).toBe("Kobar");
    expect(labels[2]).toBe("KTM");
  });
});

describe("UserDataAccess — hasAnyAssignment", () => {
  it("returns false when empty", () => {
    expect(hasAnyAssignment(emptyAccess)).toBe(false);
  });

  it("returns true if province assigned", () => {
    const access: Access = {
      ...emptyAccess,
      provinces: [{ provinceId: "p1", province: { id: "p1", name: "X" } }],
    };
    expect(hasAnyAssignment(access)).toBe(true);
  });

  it("returns true if district assigned", () => {
    const access: Access = {
      ...emptyAccess,
      districts: [{ districtId: "d1", district: { id: "d1", name: "Y" } }],
    };
    expect(hasAnyAssignment(access)).toBe(true);
  });

  it("returns true if farmer group assigned", () => {
    const access: Access = {
      ...emptyAccess,
      farmerGroups: [
        { farmerGroupId: "fg1", farmerGroup: { id: "fg1", name: "Z", abrv: null } },
      ],
    };
    expect(hasAnyAssignment(access)).toBe(true);
  });
});

// ─── Search filter logic ─────────────────────────────────────────────────────

describe("UserDataAccess — search filter", () => {
  const provinces = [
    { id: "p1", name: "Kalimantan Tengah" },
    { id: "p2", name: "Kalimantan Barat" },
    { id: "p3", name: "Riau" },
  ];

  function filterProvinces(list: typeof provinces, q: string) {
    const lower = q.toLowerCase();
    return !lower ? list : list.filter((p) => p.name.toLowerCase().includes(lower));
  }

  it("returns all when query is empty", () => {
    expect(filterProvinces(provinces, "")).toHaveLength(3);
  });

  it("filters by partial match", () => {
    const result = filterProvinces(provinces, "Kalimantan");
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("is case insensitive", () => {
    const result = filterProvinces(provinces, "riau");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Riau");
  });

  it("returns empty for no match", () => {
    expect(filterProvinces(provinces, "Papua")).toHaveLength(0);
  });
});

// ─── RBAC access context resolution (mirrors getAccessContext in farmer-group.ts) ───

describe("UserDataAccess — RBAC access context resolution", () => {
  type UserAssignments = {
    provinces: { province: { districts: { id: string }[] } }[];
    districts: { districtId: string }[];
    farmerGroups: { farmerGroupId: string }[];
  };

  type AccessContext =
    | { mode: "ALL" }
    | { mode: "BY_FARMER_GROUP"; ids: string[] }
    | { mode: "BY_DISTRICT"; ids: string[] };

  function getAccessContext(user: UserAssignments): AccessContext {
    if (user.provinces.length === 0 && user.districts.length === 0 && user.farmerGroups.length === 0) {
      return { mode: "ALL" };
    }
    if (user.farmerGroups.length > 0 && user.provinces.length === 0 && user.districts.length === 0) {
      return { mode: "BY_FARMER_GROUP", ids: user.farmerGroups.map((f) => f.farmerGroupId) };
    }
    const ids = new Set<string>();
    for (const up of user.provinces) {
      for (const d of up.province.districts) ids.add(d.id);
    }
    for (const ud of user.districts) ids.add(ud.districtId);
    return { mode: "BY_DISTRICT", ids: [...ids] };
  }

  it("returns ALL when no assignment", () => {
    expect(getAccessContext({ provinces: [], districts: [], farmerGroups: [] }).mode).toBe("ALL");
  });

  it("returns BY_FARMER_GROUP when only KT assigned (bug fix: was returning empty array)", () => {
    const result = getAccessContext({
      provinces: [],
      districts: [],
      farmerGroups: [{ farmerGroupId: "fg1" }, { farmerGroupId: "fg2" }],
    });
    expect(result.mode).toBe("BY_FARMER_GROUP");
    if (result.mode === "BY_FARMER_GROUP") {
      expect(result.ids).toEqual(["fg1", "fg2"]);
    }
  });

  it("returns BY_DISTRICT when province assigned", () => {
    const result = getAccessContext({
      provinces: [{ province: { districts: [{ id: "d1" }, { id: "d2" }] } }],
      districts: [],
      farmerGroups: [],
    });
    expect(result.mode).toBe("BY_DISTRICT");
    if (result.mode === "BY_DISTRICT") {
      expect(result.ids).toEqual(expect.arrayContaining(["d1", "d2"]));
    }
  });

  it("returns BY_DISTRICT when only district assigned", () => {
    const result = getAccessContext({ provinces: [], districts: [{ districtId: "d5" }], farmerGroups: [] });
    expect(result.mode).toBe("BY_DISTRICT");
    if (result.mode === "BY_DISTRICT") expect(result.ids).toContain("d5");
  });

  it("deduplicates district IDs across province + direct assignments", () => {
    const result = getAccessContext({
      provinces: [{ province: { districts: [{ id: "d1" }] } }],
      districts: [{ districtId: "d1" }],
      farmerGroups: [],
    });
    expect(result.mode).toBe("BY_DISTRICT");
    if (result.mode === "BY_DISTRICT") expect(result.ids).toHaveLength(1);
  });

  it("uses BY_DISTRICT (not BY_FARMER_GROUP) when province + farmerGroup both assigned", () => {
    const result = getAccessContext({
      provinces: [{ province: { districts: [{ id: "d1" }] } }],
      districts: [],
      farmerGroups: [{ farmerGroupId: "fg1" }],
    });
    expect(result.mode).toBe("BY_DISTRICT");
  });
});

// ─── Performance ─────────────────────────────────────────────────────────────

describe("UserDataAccess — performance", () => {
  it("resolves 50 KT search filter under 1ms", () => {
    const groups = Array.from({ length: 50 }, (_, i) => ({
      id: `fg-${i}`,
      name: `Lembaga Tani ${i}`,
      abrv: `KT-${i}`,
      district: { name: `Distrik ${i % 5}` },
    }));

    const start = performance.now();
    const q = "lembaga";
    const result = groups.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.abrv.toLowerCase().includes(q) ||
        f.district.name.toLowerCase().includes(q),
    );
    const duration = performance.now() - start;

    console.log(`  data access filter (50 KT): ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(1);
    expect(result.length).toBe(50); // all match "lembaga"
  });

  it("badge label generation for 20 assignments under 1ms", () => {
    const access: Access = {
      provinces: Array.from({ length: 5 }, (_, i) => ({
        provinceId: `p${i}`,
        province: { id: `p${i}`, name: `Provinsi ${i}` },
      })),
      districts: Array.from({ length: 10 }, (_, i) => ({
        districtId: `d${i}`,
        district: { id: `d${i}`, name: `Distrik ${i}` },
      })),
      farmerGroups: Array.from({ length: 5 }, (_, i) => ({
        farmerGroupId: `fg${i}`,
        farmerGroup: { id: `fg${i}`, name: `KT ${i}`, abrv: `KT-${i}` },
      })),
    };

    const start = performance.now();
    const labels = getSummaryLabels(access);
    const duration = performance.now() - start;

    console.log(`  badge label generation (20 assignments): ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(1);
    expect(labels.length).toBe(20);
  });
});
