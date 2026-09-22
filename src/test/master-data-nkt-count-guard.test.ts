import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Kolom "Lahan NKT" di daftar Lembaga Petani & Petani (#338) — tanpa DB, pola
 * mock `land-parcel-export-guard.test.ts`. Menguji action ASLI (bukan cermin
 * logika): hitungan datang dari satu agregat tambahan (groupBy ketiga untuk
 * Lembaga, `_count.landParcels` ber-filter untuk Petani) yang memakai
 * `NKT_AFFECTED_STATUSES`, di-merge ke bentuk klien tanpa membocorkan `_count`.
 */
const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerGroupAccessFilter: () => ({}),
  farmerAccessFilter: () => ({}),
  farmerRelationAccessFilter: () => ({}),
  getAccessibleDistrictIds: async () => null,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/land-marker-query", () => ({ fetchFarmerGroupMarkerPoints: vi.fn(), fetchFarmerMarkerPoints: vi.fn() }));
vi.mock("@/lib/parcel-passport-query", () => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));

const db = vi.hoisted(() => ({
  farmerGroup: { findMany: vi.fn() },
  farmer: { findMany: vi.fn() },
  landParcel: { groupBy: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getFarmerGroups } = await import("@/server/actions/farmer-group");
const { getFarmers } = await import("@/server/actions/farmer");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
});

describe("getFarmerGroups — nktCount per Lembaga (#338)", () => {
  it("agregat ketiga (groupBy ber-filter status NKT) di-merge lewat peta petani→Lembaga; Lembaga tanpa lahan NKT → 0", async () => {
    db.farmerGroup.findMany.mockResolvedValue([{ id: "g1", name: "A" }, { id: "g2", name: "B" }]);
    db.farmer.findMany.mockResolvedValue([{ id: "f1", farmerGroupId: "g1" }, { id: "f2", farmerGroupId: "g1" }, { id: "f3", farmerGroupId: "g2" }]);
    db.landParcel.groupBy
      .mockResolvedValueOnce([{ farmerId: "f1", _count: { _all: 3 }, _sum: { area: 4 } }]) // persil & luas
      .mockResolvedValueOnce([{ farmerId: "f1", _count: { _all: 2 } }, { farmerId: "f2", _count: { _all: 1 } }]); // NKT
    const rows = await getFarmerGroups();
    expect(rows.map((g) => [g.id, g.nktCount, g.parcelsCount])).toEqual([["g1", 3, 3], ["g2", 0, 0]]);

    const nktCall = db.landParcel.groupBy.mock.calls[1][0];
    expect(nktCall.where.identity.nkt.status.in).toEqual(expect.arrayContaining(["AFFECTED", "INCLUDED"]));
    expect(nktCall.where.isActive).toBe(true);
    expect(nktCall.where.farmer.farmerGroupId.in).toEqual(["g1", "g2"]);
  });

  it("izin VIEW master-data-groups ditolak → throw, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getFarmerGroups()).rejects.toThrow(/izin/);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
  });
});

describe("getFarmers — nktCount per petani (#338)", () => {
  it("_count.landParcels ber-filter NKT dipetakan ke nktCount, `_count` tidak bocor ke klien; parcelCount (#343) dari groupBy kedua, 0 bila tanpa lahan", async () => {
    db.farmer.findMany.mockResolvedValue([
      { id: "f1", name: "Abdul", farmerId: "HJP.1", farmerGroup: { name: "HJP", district: { id: "1401", name: "Kampar" } }, _count: { landParcels: 2 } },
      { id: "f2", name: "Budi", farmerId: "HJP.2", farmerGroup: { name: "HJP", district: { id: "1401", name: "Kampar" } }, _count: { landParcels: 0 } },
    ]);
    db.landParcel.groupBy.mockResolvedValue([{ farmerId: "f1", _count: { _all: 12 } }]);
    const rows = await getFarmers();
    expect(rows.map((f) => [f.farmerId, f.nktCount, f.parcelCount])).toEqual([["HJP.1", 2, 12], ["HJP.2", 0, 0]]);
    expect(rows[0]).not.toHaveProperty("_count");
    // groupBy memakai where petani yang sama (scope + status) — bukan seluruh tabel lahan.
    const countCall = db.landParcel.groupBy.mock.calls[0][0];
    expect(countCall.by).toEqual(["farmerId"]);
    expect(countCall.where.isActive).toBe(true);
    expect(countCall.where.farmer).toMatchObject({ isActive: true });

    const select = db.farmer.findMany.mock.calls[0][0].select;
    expect(select._count.select.landParcels.where).toMatchObject({ isActive: true, identity: { nkt: { status: { in: expect.arrayContaining(["AFFECTED"]) } } } });
  });

  it("izin VIEW master-data-farmers ditolak → throw, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getFarmers()).rejects.toThrow(/izin/);
    expect(db.farmer.findMany).not.toHaveBeenCalled();
    expect(db.landParcel.groupBy).not.toHaveBeenCalled();
  });
});
