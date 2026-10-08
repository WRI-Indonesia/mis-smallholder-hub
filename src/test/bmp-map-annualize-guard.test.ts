import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `getBmpMapData` — bulan ber-data Lembaga untuk penyetahunan produktivitas Peta BMP
 * (owner 2026-10-08, aturan sama dengan BMP Dashboard). Kueri bulan hanya untuk
 * Lembaga yang lolos scope; tanpa VIEW tidak menyentuh DB. Pola mock
 * `nkt-report-map-marker-guard.test.ts`.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerGroupAccessFilter: (access: { mode: string; ids: string[] }) =>
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } : {},
  farmerRelationAccessFilter: () => ({}),
  getAccessibleDistrictIds: async () => null,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/parcel-passport-query", () => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));
vi.mock("@/lib/land-marker-query", () => ({ fetchFarmerGroupMarkerPoints: vi.fn(), fetchFarmerMarkerPoints: vi.fn() }));

const db = vi.hoisted(() => ({
  farmerGroup: { findMany: vi.fn() },
  landParcel: { findMany: vi.fn() },
  productionRecord: { groupBy: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getBmpMapData } = await import("@/server/actions/map");

const square = { type: "Polygon", coordinates: [[[101.5, 0.75], [101.501, 0.75], [101.501, 0.751], [101.5, 0.751], [101.5, 0.75]]] };
const GROUP = { id: "kt-1", name: "Lembaga Uji", code: "ISH-0000-01", locationLat: null, locationLong: null, district: { name: "Kampar" } };
const PARCEL = {
  id: "lp-1", parcelId: "CTH.0001.A", farmerId: "f-1", geometry: square, area: 2, plantingYear: 2010, cropType: null, landStatus: null,
  farmer: { name: "Contoh Petani", farmerId: "CTH.0001", farmerGroup: { name: "Lembaga Uji" } },
};

/** groupBy dipanggil dua kali: per (lahan, periode) untuk warna persil, per periode untuk bulan Lembaga. */
function mockGroupBy(byPeriod: { period: string; _sum: { yieldKg: number }; _count: { parcelId: number } }[]) {
  db.productionRecord.groupBy.mockImplementation(async (args: { by: string[] }) =>
    args.by.includes("parcelId")
      ? [{ parcelId: "lp-1", period: "2026-01", _sum: { yieldKg: 2000 } }]
      : byPeriod
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  db.farmerGroup.findMany.mockResolvedValue([GROUP]);
  db.landParcel.findMany.mockResolvedValue([PARCEL]);
});

describe("getBmpMapData — bulan ber-data Lembaga (penyetahunan)", () => {
  it("tanpa VIEW map-bmp → gagal tanpa kueri apa pun", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await getBmpMapData({ farmerGroupId: "kt-1" });
    expect(res.success).toBe(false);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    expect(db.productionRecord.groupBy).not.toHaveBeenCalled();
  });

  it("Lembaga dalam scope → bulan dihitung dari record aktif petani aktif Lembaga itu", async () => {
    mockGroupBy([
      { period: "2026-01", _sum: { yieldKg: 9000 }, _count: { parcelId: 4 } },
      { period: "2026-02", _sum: { yieldKg: 3 }, _count: { parcelId: 0 } }, // < 5 kg tanpa lahan → bukan bulan ber-data
      { period: "2026-03", _sum: { yieldKg: 0 }, _count: { parcelId: 1 } },
      { period: "2025-12", _sum: { yieldKg: 700 }, _count: { parcelId: 0 } },
    ]);
    const res = await getBmpMapData({ farmerGroupId: "kt-1" });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data!.monthsByYear).toEqual({ "2026": 2, "2025": 1 });
    const monthsCall = db.productionRecord.groupBy.mock.calls.find((c) => !c[0].by.includes("parcelId"))!;
    expect(monthsCall[0].where).toEqual({ isActive: true, farmer: { isActive: true, farmerGroupId: "kt-1" } });
  });

  it("Lembaga di luar scope (groups kosong) → tanpa kueri bulan, monthsByYear kosong", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    db.farmerGroup.findMany.mockResolvedValue([]);
    db.landParcel.findMany.mockResolvedValue([]);
    mockGroupBy([]);
    const res = await getBmpMapData({ farmerGroupId: "kt-1" });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data!.monthsByYear).toEqual({});
    expect(db.productionRecord.groupBy).not.toHaveBeenCalled();
  });
});
