import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & scope Data Analyst › Ringkasan Petani (`data-analyst.ts`) — tanpa DB.
 * Menu key di-hardcode `data-analyst-farmer-summary` (VIEW) untuk keempat
 * action; setiap query dibatasi scope akses + hanya baris aktif.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await import("@/lib/access-scope")),
  getAccessContext,
}));

const db = vi.hoisted(() => ({
  district: { findMany: vi.fn() },
  farmerGroup: { findMany: vi.fn() },
  farmer: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  landParcel: { aggregate: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/data-analyst");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.district.findMany.mockResolvedValue([]);
  db.farmerGroup.findMany.mockResolvedValue([]);
  db.farmer.findMany.mockResolvedValue([]);
  db.farmer.count.mockResolvedValue(0);
  db.farmer.groupBy.mockResolvedValue([]);
  db.landParcel.aggregate.mockResolvedValue({ _sum: { area: null } });
});

describe("guard — data-analyst-farmer-summary:VIEW", () => {
  const cases: [string, () => Promise<unknown>][] = [
    ["getDistrictsForAnalyst", () => actions.getDistrictsForAnalyst()],
    ["getFarmerGroupsForAnalyst", () => actions.getFarmerGroupsForAnalyst()],
    ["getFarmerSummary", () => actions.getFarmerSummary({})],
    ["getFarmersWithoutParcels", () => actions.getFarmersWithoutParcels({})],
  ];
  for (const [name, call] of cases) {
    it(`${name} → data-analyst-farmer-summary:VIEW`, async () => {
      await call();
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith("data-analyst-farmer-summary", "VIEW");
    });
  }

  it("izin ditolak → semua melempar, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    for (const [, call] of cases) await expect(call()).rejects.toThrow(/izin/);
    expect(db.district.findMany).not.toHaveBeenCalled();
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    expect(db.farmer.findMany).not.toHaveBeenCalled();
    expect(db.farmer.count).not.toHaveBeenCalled();
  });
});

describe("scope", () => {
  it("getDistrictsForAnalyst: BY_DISTRICT → id distrik; BY_FARMER_GROUP → distrik yang punya Lembaga user", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    await actions.getDistrictsForAnalyst();
    expect(db.district.findMany.mock.calls[0][0].where).toEqual({ isActive: true, id: { in: ["1401"] } });
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    await actions.getDistrictsForAnalyst();
    expect(db.district.findMany.mock.calls[1][0].where).toEqual({ isActive: true, farmerGroups: { some: { id: { in: ["kt-1"] }, isActive: true } } });
  });

  it("getFarmerGroupsForAnalyst BY_FARMER_GROUP + filter distrik → id Lembaga scope tetap ada", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    await actions.getFarmerGroupsForAnalyst("1401");
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toEqual({ isActive: true, id: { in: ["kt-1"] }, districtId: "1401" });
  });

  it("getFarmerSummary BY_DISTRICT + filter Lembaga → farmer aktif, Lembaga aktif dalam distrik scope", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    await actions.getFarmerSummary({ farmerGroupId: "kt-1" });
    const args = db.farmer.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ isActive: true, farmerGroup: { isActive: true, districtId: { in: ["1401"] }, id: "kt-1" } });
    // #253: tak ada nested landParcels (baris lahan ke Node) — hanya _count ber-filter aktif.
    expect(args.select.landParcels).toBeUndefined();
    expect(args.select._count.select.landParcels.where).toEqual({ isActive: true });
    // Luas & jumlah Lembaga memakai scope petani yang SAMA dengan daftar.
    expect(db.landParcel.aggregate.mock.calls[0][0].where).toEqual({ isActive: true, farmer: args.where });
    expect(db.farmer.groupBy.mock.calls[0][0]).toEqual({ by: ["farmerGroupId"], where: args.where });
  });

  it("getFarmersWithoutParcels BY_FARMER_GROUP + filter distrik → scope Lembaga; 'tanpa lahan' = tanpa lahan AKTIF", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    await actions.getFarmersWithoutParcels({ districtId: "1401" });
    const scoped = { isActive: true, farmerGroup: { isActive: true, id: { in: ["kt-1"] }, districtId: "1401" } };
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ ...scoped, landParcels: { none: { isActive: true } } });
    expect(db.farmer.count.mock.calls[0][0].where).toEqual(scoped);
  });
});

describe("agregasi ringkas", () => {
  it("getFarmerSummary scope tanpa lahan → luas 0 (bukan null), 0 Lembaga", async () => {
    const res = await actions.getFarmerSummary({});
    expect(res.summary).toEqual({ totalKT: 0, totalPetani: 0, totalPersil: 0, totalLuasLahan: 0 });
  });

  it("getFarmerSummary menjumlah Lembaga, petani, persil, luas — nilai sama dengan implementasi lama (fixture sama)", async () => {
    // Fixture lama: P1 = lahan 1,5 + null, P2 = lahan 2 → persil 3, luas 3,5, 1 Lembaga.
    db.farmer.findMany.mockResolvedValue([
      { farmerId: "P1", name: "A", farmerGroup: { name: "HJP" }, _count: { landParcels: 2 } },
      { farmerId: "P2", name: "B", farmerGroup: { name: "HJP" }, _count: { landParcels: 1 } },
    ]);
    db.landParcel.aggregate.mockResolvedValue({ _sum: { area: 3.5 } });
    db.farmer.groupBy.mockResolvedValue([{ farmerGroupId: "kt-hjp" }]);
    const res = await actions.getFarmerSummary({});
    expect(res.summary).toEqual({ totalKT: 1, totalPetani: 2, totalPersil: 3, totalLuasLahan: 3.5 });
    expect(res.rows[0]).toEqual({ farmerGroupName: "HJP", farmerId: "P1", farmerName: "A", totalParcels: 2 });
  });

  it("getFarmersWithoutParcels: persentase terhadap total petani scope, 0 bila scope kosong", async () => {
    db.farmer.findMany.mockResolvedValue([{ farmerId: "P1", name: "A", farmerGroup: { name: "HJP" } }]);
    db.farmer.count.mockResolvedValue(3);
    expect((await actions.getFarmersWithoutParcels({})).summary.percentageFromTotal).toBe(33.33);
    db.farmer.count.mockResolvedValue(0);
    expect((await actions.getFarmersWithoutParcels({})).summary.percentageFromTotal).toBe(0);
  });
});
