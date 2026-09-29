import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & scope baca titik pohon (`src/server/actions/tree.ts`) tanpa DB — pola
 * mock `land-marker-guard.test.ts`. Titik GPS pohon = data lahan: Detail Lahan
 * digate `master-data-parcels`, overlay Detail Petani digate
 * `master-data-farmers`; lahan diambil lewat `farmerRelationAccessFilter` ASLI
 * dan lahan nonaktif hanya terbuka untuk SUPERADMIN (paritas getLandParcelById).
 */
const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));

const db = vi.hoisted(() => ({
  landParcel: { findFirst: vi.fn() },
  tree: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getParcelTrees, getFarmerTreePoints } = await import("@/server/actions/tree");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.landParcel.findFirst.mockResolvedValue({ id: "lp-1", area: 2 });
  db.tree.findMany.mockResolvedValue([{ longitude: 101.1, latitude: 0.5 }, { longitude: 101.2, latitude: 0.5 }]);
});

describe("getParcelTrees — master-data-parcels:VIEW + scope lahan", () => {
  it("izin ditolak → melempar, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getParcelTrees("lp-1")).rejects.toThrow(/izin/);
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("master-data-parcels", "VIEW");
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
    expect(db.tree.findMany).not.toHaveBeenCalled();
  });

  it("lahan di luar scope → null, titik pohon tidak dibaca", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    db.landParcel.findFirst.mockResolvedValue(null);
    expect(await getParcelTrees("lp-9")).toBeNull();
    expect(db.landParcel.findFirst.mock.calls[0][0].where).toEqual({
      id: "lp-9", farmer: { farmerGroup: { districtId: { in: ["1401"] } } }, isActive: true,
    });
    expect(db.tree.findMany).not.toHaveBeenCalled();
  });

  it("SUPERADMIN boleh membuka lahan nonaktif (tanpa filter isActive)", async () => {
    isSuperAdmin.mockResolvedValue(true);
    await getParcelTrees("lp-1");
    expect(db.landParcel.findFirst.mock.calls[0][0].where).not.toHaveProperty("isActive");
  });

  it("ringkasan: hanya pohon aktif; kerapatan = jumlah / luas", async () => {
    const res = await getParcelTrees("lp-1");
    expect(db.tree.findMany.mock.calls[0][0].where).toEqual({ landParcelId: "lp-1", isActive: true });
    expect(res?.summary).toEqual({ count: 2, density: 1 });
  });
});

describe("getFarmerTreePoints — master-data-farmers:VIEW + scope lewat relasi lahan", () => {
  it("izin ditolak → melempar, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getFarmerTreePoints("f-1")).rejects.toThrow(/izin/);
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("master-data-farmers", "VIEW");
    expect(db.tree.findMany).not.toHaveBeenCalled();
  });

  it("BY_FARMER_GROUP → filter landParcel.farmer.farmerGroupId, pohon & lahan aktif saja", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    await getFarmerTreePoints("f-1");
    expect(db.tree.findMany.mock.calls[0][0].where).toEqual({
      isActive: true,
      landParcel: { farmerId: "f-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-1"] } } },
    });
  });
});
