import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `getFarmerGroups` (merge agregat #163) dan scope `getDistrictsForSelect`
 * (#211) — menguji action ASLI dengan `auth`/`rbac`/`prisma` di-mock (pola
 * `land-marker-guard.test.ts`); `getAccessibleDistrictIds` tetap asli.
 */
const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-context")>("@/lib/access-context")),
  getAccessContext,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/land-marker-query", () => ({ fetchFarmerGroupMarkerPoints: vi.fn(), fetchFarmerMarkerPoints: vi.fn(), fetchFarmerGroupMarkerStats: vi.fn(async () => ({ total: 0, present: 0 })), fetchFarmerMarkerStats: vi.fn(async () => ({ total: 0, present: 0 })) }));

const db = vi.hoisted(() => ({
  farmerGroup: { findMany: vi.fn() },
  farmer: { findMany: vi.fn() },
  landParcel: { groupBy: vi.fn() },
  district: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getFarmerGroups, getDistrictsForSelect } = await import("@/server/actions/farmer-group");

interface ParcelAgg {
  farmerId: string;
  _count: { _all: number };
  _sum: { area: number | null };
}

/** Jalankan getFarmerGroups asli dengan baris Lembaga/petani/agregat lahan tertentu. */
async function statsOf(groupIds: string[], farmers: { id: string; farmerGroupId: string }[], parcelAggs: ParcelAgg[]) {
  db.farmerGroup.findMany.mockResolvedValue(groupIds.map((id) => ({ id, name: id })));
  db.farmer.findMany.mockResolvedValue(farmers);
  // groupBy pertama = persil & luas; yang ber-filter `identity` = hitungan NKT (#338).
  db.landParcel.groupBy.mockImplementation(async (args: { where: { identity?: unknown } }) => (args.where.identity ? [] : parcelAggs));
  const rows = await getFarmerGroups();
  return (id: string) => {
    const r = rows.find((g) => g.id === id)!;
    return { farmersCount: r.farmersCount, parcelsCount: r.parcelsCount, totalArea: r.totalArea };
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.district.findMany.mockResolvedValue([]);
});

describe("getFarmerGroups stats merge (#163)", () => {
  it("menghitung jumlah petani per group", async () => {
    const statsFor = await statsOf(
      ["g1", "g2"],
      [
        { id: "f1", farmerGroupId: "g1" },
        { id: "f2", farmerGroupId: "g1" },
        { id: "f3", farmerGroupId: "g2" },
      ],
      []
    );
    expect(statsFor("g1").farmersCount).toBe(2);
    expect(statsFor("g2").farmersCount).toBe(1);
  });

  it("menjumlahkan persil & luas ke group pemilik via map petani→group", async () => {
    const statsFor = await statsOf(
      ["g1", "g2"],
      [
        { id: "f1", farmerGroupId: "g1" },
        { id: "f2", farmerGroupId: "g1" },
        { id: "f3", farmerGroupId: "g2" },
      ],
      [
        { farmerId: "f1", _count: { _all: 2 }, _sum: { area: 3.5 } },
        { farmerId: "f2", _count: { _all: 1 }, _sum: { area: 1.25 } },
        { farmerId: "f3", _count: { _all: 4 }, _sum: { area: null } },
      ]
    );
    expect(statsFor("g1")).toEqual({ farmersCount: 2, parcelsCount: 3, totalArea: 4.75 });
    // _sum.area null (semua lahan tanpa luas) tidak menambah totalArea.
    expect(statsFor("g2")).toEqual({ farmersCount: 1, parcelsCount: 4, totalArea: 0 });
  });

  it("mengabaikan agregat persil dari petani di luar map (nonaktif / luar scope)", async () => {
    const statsFor = await statsOf(
      ["g1"],
      [{ id: "f1", farmerGroupId: "g1" }],
      [
        { farmerId: "f1", _count: { _all: 1 }, _sum: { area: 2 } },
        { farmerId: "f-unknown", _count: { _all: 9 }, _sum: { area: 99 } },
      ]
    );
    expect(statsFor("g1")).toEqual({ farmersCount: 1, parcelsCount: 1, totalArea: 2 });
  });

  it("group tanpa petani mendapat default 0 (bukan undefined)", async () => {
    const statsFor = await statsOf(["g-kosong"], [], []);
    expect(statsFor("g-kosong")).toEqual({ farmersCount: 0, parcelsCount: 0, totalArea: 0 });
  });
});

/**
 * Scope `getDistrictsForSelect` (#211 → #217): helper for-select ini juga
 * access-scoped — user BY_DISTRICT/BY_FARMER_GROUP hanya melihat distrik dalam
 * jurisdiksinya (termasuk di form tambah/edit Lembaga Petani — by design).
 */
describe("getDistrictsForSelect access scope (#211)", () => {
  const groupDistricts: Record<string, string> = { "kt-1": "d1", "kt-2": "d1", "kt-3": "d2" };
  const districtWhere = () => db.district.findMany.mock.calls[0][0].where;

  beforeEach(() => {
    // Lookup Lembaga→distrik di getAccessibleDistrictIds (asli) lewat prisma mock.
    db.farmerGroup.findMany.mockImplementation(async (args: { where: { id: { in: string[] } } }) =>
      args.where.id.in.filter((id) => groupDistricts[id]).map((id) => ({ districtId: groupDistricts[id] }))
    );
  });

  it("ALL → semua distrik aktif, tanpa filter id", async () => {
    await getDistrictsForSelect();
    expect(districtWhere()).toEqual({ isActive: true });
  });

  it("BY_DISTRICT → hanya distrik assignment", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d1", "d3"] });
    await getDistrictsForSelect();
    expect(districtWhere()).toEqual({ isActive: true, id: { in: ["d1", "d3"] } });
  });

  it("BY_FARMER_GROUP → distrik turunan lembaga, tanpa duplikat", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1", "kt-2", "kt-3"] });
    await getDistrictsForSelect();
    expect(districtWhere()).toEqual({ isActive: true, id: { in: ["d1", "d2"] } });
  });

  it("BY_FARMER_GROUP tanpa assignment → tidak ada distrik (in: []), lookup Lembaga dilewati", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: [] });
    await getDistrictsForSelect();
    expect(districtWhere()).toEqual({ isActive: true, id: { in: [] } });
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
  });
});

// ——— #169: Sertifikasi ISPO + Assurance SAP/MAP (status + tahun, pola RSPO #160) ———

import { farmerGroupSchema } from "@/validations/farmer-group.schema";
import { formatCertStatus } from "@/lib/farmer-group-labels";

const validBase = {
  districtId: "d1",
  name: "Lembaga Uji",
  category: "SWADAYA" as const,
};

describe("farmerGroupSchema — sertifikasi ISPO & SAP/MAP (#169)", () => {
  it("status tanpa tahun sah (semua skema)", () => {
    const r = farmerGroupSchema.safeParse({
      ...validBase,
      rspoCertStatus: "CERTIFIED",
      ispoCertStatus: "PLANNED",
      sapMapAssuranceStatus: "CERTIFIED",
    });
    expect(r.success).toBe(true);
  });

  it("tahun ISPO tanpa status ditolak (ambigu), path di ispoCertStatus", () => {
    const r = farmerGroupSchema.safeParse({ ...validBase, ispoCertYear: 2026 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.ispoCertStatus).toBeDefined();
    }
  });

  it("tahun SAP/MAP tanpa status ditolak, path di sapMapAssuranceStatus", () => {
    const r = farmerGroupSchema.safeParse({ ...validBase, sapMapAssuranceYear: 2027 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.sapMapAssuranceStatus).toBeDefined();
    }
  });

  it("pasangan lengkap tahun + status sah untuk ketiga skema", () => {
    const r = farmerGroupSchema.safeParse({
      ...validBase,
      rspoCertYear: 2020,
      rspoCertStatus: "CERTIFIED",
      ispoCertYear: 2026,
      ispoCertStatus: "PLANNED",
      sapMapAssuranceYear: 2024,
      sapMapAssuranceStatus: "CERTIFIED",
    });
    expect(r.success).toBe(true);
  });
});

describe("formatCertStatus (label bersama RSPO/ISPO/SAP-MAP)", () => {
  it("CERTIFIED + tahun → tahun saja", () => {
    expect(formatCertStatus(2020, "CERTIFIED")).toBe("2020");
  });
  it("CERTIFIED tanpa tahun → Tersertifikasi", () => {
    expect(formatCertStatus(null, "CERTIFIED")).toBe("Tersertifikasi");
  });
  it("PLANNED + tahun → Plan <tahun>; tanpa tahun → Plan", () => {
    expect(formatCertStatus(2026, "PLANNED")).toBe("Plan 2026");
    expect(formatCertStatus(null, "PLANNED")).toBe("Plan");
  });
  it("tanpa status → em dash", () => {
    expect(formatCertStatus(null, null)).toBe("—");
    expect(formatCertStatus(2026, null)).toBe("—");
  });
});
