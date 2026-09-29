import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Kueri Main Dashboard `src/lib/dashboard-query.ts` ASLI — komposisi `where`
 * (scope akses + filter distrik/Lembaga/tahun bergabung) dan opsi filter per
 * mode akses. `prisma`/`getAccessContext` di-mock; filter scope asli.
 */
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));

const db = vi.hoisted(() => ({
  farmerGroup: { findMany: vi.fn() },
  farmer: { findMany: vi.fn() },
  district: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { aggregateDashboardData, getDashboardFilterOptions } = await import("@/lib/dashboard-query");

const GROUP = {
  id: "g1", name: "A", code: "A1", districtId: "d1", district: { name: "Siak" }, locationLat: null, locationLong: null,
  rspoCertStatus: null, rspoCertYear: null, ispoCertStatus: null, ispoCertYear: null, sapMapAssuranceStatus: null, sapMapAssuranceYear: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.farmerGroup.findMany.mockResolvedValue([]);
  db.farmer.findMany.mockResolvedValue([]);
  db.district.findMany.mockResolvedValue([]);
});

describe("aggregateDashboardData — where Lembaga", () => {
  it("filter Lembaga dibungkus AND sehingga tidak menimpa scope `id` BY_FARMER_GROUP", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g1", "g2"] });
    await aggregateDashboardData({ farmerGroupId: "g9", districtId: "d1" });
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toEqual({
      isActive: true,
      id: { in: ["g1", "g2"] },
      districtId: "d1",
      AND: [{ id: "g9" }],
    });
  });

  it("BY_DISTRICT tanpa filter → isActive + districtId scope", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d1"] });
    await aggregateDashboardData();
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toEqual({ isActive: true, districtId: { in: ["d1"] } });
  });

  it("tidak ada Lembaga dalam scope → kueri petani dilewati", async () => {
    const data = await aggregateDashboardData();
    expect(db.farmer.findMany).not.toHaveBeenCalled();
    expect(data.stats.totalPetani).toBe(0);
  });

  it("filter tahun bergabung hanya mempersempit kueri petani, bukan daftar Lembaga", async () => {
    db.farmerGroup.findMany.mockResolvedValue([GROUP]);
    db.farmer.findMany.mockResolvedValue([
      { id: "f1", farmerGroupId: "g1", gender: "F", joinedYear: 2024, landParcels: [{ area: 2, subGroupLv2: null }], trainingParticipants: [] },
    ]);
    const data = await aggregateDashboardData({ joinedYear: 2024 });
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).not.toHaveProperty("joinedYear");
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ isActive: true, farmerGroupId: { in: ["g1"] }, joinedYear: 2024 });
    expect(data.stats.totalPetani).toBe(1);
  });
});

describe("getDashboardFilterOptions", () => {
  it("BY_DISTRICT → distrik dibatasi id; BY_FARMER_GROUP → distrik yang punya Lembaga aktif ter-assign", async () => {
    getAccessContext.mockResolvedValueOnce({ mode: "BY_DISTRICT", ids: ["d1"] });
    await getDashboardFilterOptions();
    getAccessContext.mockResolvedValueOnce({ mode: "BY_FARMER_GROUP", ids: ["g1"] });
    await getDashboardFilterOptions();
    expect(db.district.findMany.mock.calls[0][0].where).toEqual({ isActive: true, id: { in: ["d1"] } });
    expect(db.district.findMany.mock.calls[1][0].where).toEqual({
      isActive: true,
      farmerGroups: { some: { id: { in: ["g1"] }, isActive: true } },
    });
    expect(db.farmer.findMany.mock.calls[1][0].where.farmerGroup).toEqual({ isActive: true, id: { in: ["g1"] } });
  });

  it("ALL → semua distrik aktif; tahun bergabung unik, null dibuang, urut menurun", async () => {
    db.district.findMany.mockResolvedValue([{ id: "d1", name: "Siak" }]);
    db.farmer.findMany.mockResolvedValue([{ joinedYear: 2019 }, { joinedYear: null }, { joinedYear: 2024 }, { joinedYear: 2021 }]);
    const opts = await getDashboardFilterOptions();
    expect(db.district.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
    expect(opts).toEqual({ districts: [{ id: "d1", name: "Siak" }], joinedYears: [2024, 2021, 2019] });
  });
});
