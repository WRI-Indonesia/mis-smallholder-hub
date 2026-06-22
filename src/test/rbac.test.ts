import { describe, it, expect } from "vitest";

// Unit test for RBAC data access resolution logic
describe("RBAC - Data access resolution", () => {
  interface UserAccess {
    role: string;
    provinces: string[]; // province IDs
    districts: string[]; // district IDs
    farmerGroups: string[]; // farmer group IDs
  }

  // District lookup: province → districts
  const provinceDistricts: Record<string, string[]> = {
    "14": ["1401", "1405", "1406", "1408"],
  };

  // Farmer group lookup: district → farmer groups
  const districtFarmerGroups: Record<string, string[]> = {
    "1401": ["ICS-1401-01", "ICS-1401-02", "ICS-1401-03"],
    "1406": ["ICS-1406-01", "ICS-1406-02"],
    "1408": ["ICS-1408-01"],
  };

  function resolveAccessibleDistricts(user: UserAccess): string[] | "ALL" {
    if (user.role === "SUPERADMIN") return "ALL";

    const ids = new Set<string>();

    // Expand provinces to districts
    for (const prov of user.provinces) {
      const dists = provinceDistricts[prov] ?? [];
      dists.forEach((d) => ids.add(d));
    }

    // Direct district assignments
    for (const dist of user.districts) {
      ids.add(dist);
    }

    return [...ids];
  }

  function resolveAccessibleGroups(user: UserAccess, accessibleDistricts: string[]): string[] | "ALL" {
    if (user.role === "SUPERADMIN") return "ALL";

    // If user has specific farmer groups assigned, use those only
    if (user.farmerGroups.length > 0) return user.farmerGroups;

    // Otherwise, all groups in accessible districts
    const groups: string[] = [];
    for (const dist of accessibleDistricts) {
      const dg = districtFarmerGroups[dist] ?? [];
      groups.push(...dg);
    }
    return groups;
  }

  it("SUPERADMIN gets ALL access", () => {
    const user: UserAccess = { role: "SUPERADMIN", provinces: [], districts: [], farmerGroups: [] };
    expect(resolveAccessibleDistricts(user)).toBe("ALL");
    expect(resolveAccessibleGroups(user, [])).toBe("ALL");
  });

  it("Project Leader (UserProvince) gets all districts in province", () => {
    const user: UserAccess = { role: "MANAGEMENT", provinces: ["14"], districts: [], farmerGroups: [] };
    const districts = resolveAccessibleDistricts(user);
    expect(districts).toEqual(["1401", "1405", "1406", "1408"]);
  });

  it("District Coordinator (UserDistrict) gets all KT in district", () => {
    const user: UserAccess = { role: "OPERATOR", provinces: [], districts: ["1401"], farmerGroups: [] };
    const districts = resolveAccessibleDistricts(user);
    expect(districts).toEqual(["1401"]);

    const groups = resolveAccessibleGroups(user, districts as string[]);
    expect(groups).toEqual(["ICS-1401-01", "ICS-1401-02", "ICS-1401-03"]);
  });

  it("Facilitator (UserFarmerGroup) gets only assigned KT", () => {
    const user: UserAccess = { role: "OPERATOR", provinces: [], districts: ["1401"], farmerGroups: ["ICS-1401-01", "ICS-1401-02"] };
    const districts = resolveAccessibleDistricts(user);
    expect(districts).toEqual(["1401"]);

    const groups = resolveAccessibleGroups(user, districts as string[]);
    expect(groups).toEqual(["ICS-1401-01", "ICS-1401-02"]);
  });

  it("User with no assignments gets no access", () => {
    const user: UserAccess = { role: "OPERATOR", provinces: [], districts: [], farmerGroups: [] };
    const districts = resolveAccessibleDistricts(user);
    expect(districts).toEqual([]);

    const groups = resolveAccessibleGroups(user, []);
    expect(groups).toEqual([]);
  });

  it("Combined province + district assignments merge correctly", () => {
    const user: UserAccess = { role: "OPERATOR", provinces: ["14"], districts: ["9999"], farmerGroups: [] };
    const districts = resolveAccessibleDistricts(user);
    expect(districts).toContain("1401");
    expect(districts).toContain("9999");
    expect(districts).toHaveLength(5); // 4 from province + 1 direct
  });
});
