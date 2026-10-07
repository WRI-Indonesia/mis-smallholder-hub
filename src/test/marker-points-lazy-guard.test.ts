import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * #335 — titik patok Detail Lembaga/Petani dimuat malas lewat action ber-guard,
 * payload detail hanya membawa hitungan. Action ASLI, tanpa DB (pola
 * `master-data-nkt-count-guard.test.ts`).
 */
const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));

const getAccessContext = vi.hoisted(() => vi.fn());
const farmerGroupAccessFilter = vi.hoisted(() => vi.fn(() => ({ id: { in: ["g-scope"] } })));
const farmerAccessFilter = vi.hoisted(() => vi.fn(() => ({ farmerGroupId: { in: ["g-scope"] } })));
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerGroupAccessFilter,
  farmerAccessFilter,
  farmerRelationAccessFilter: () => ({}),
  getAccessibleDistrictIds: async () => null,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/parcel-passport-query", () => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));

const markers = vi.hoisted(() => ({
  fetchFarmerGroupMarkerPoints: vi.fn(),
  fetchFarmerMarkerPoints: vi.fn(),
  fetchFarmerGroupMarkerStats: vi.fn(),
  fetchFarmerMarkerStats: vi.fn(),
}));
vi.mock("@/lib/land-marker-query", () => markers);

const db = vi.hoisted(() => ({
  farmerGroup: { findFirst: vi.fn() },
  farmer: { findFirst: vi.fn() },
  trainingPackage: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getFarmerGroupMarkerPoints } = await import("@/server/actions/farmer-group");
const { getFarmerMarkerPoints, getFarmerDetail } = await import("@/server/actions/farmer");

const POINT = { id: "m1", code: "HJP-PTK-000001", longitude: 101.1, latitude: 0.5, condition: "PRESENT" };

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-scope"] });
  markers.fetchFarmerGroupMarkerPoints.mockResolvedValue([POINT]);
  markers.fetchFarmerMarkerPoints.mockResolvedValue([POINT]);
  markers.fetchFarmerMarkerStats.mockResolvedValue({ total: 1, present: 1 });
});

describe("getFarmerGroupMarkerPoints (#335)", () => {
  it("izin VIEW master-data-groups ditolak → error, DB & kueri titik tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    expect(await getFarmerGroupMarkerPoints("g-scope")).toEqual({ success: false, error: expect.stringMatching(/izin/) });
    expect(hasPermission).toHaveBeenCalledWith("master-data-groups", "VIEW");
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
    expect(markers.fetchFarmerGroupMarkerPoints).not.toHaveBeenCalled();
  });

  it("Lembaga di luar scope → error, kueri titik (raw tanpa scope) TIDAK dijalankan", async () => {
    db.farmerGroup.findFirst.mockResolvedValue(null);
    expect(await getFarmerGroupMarkerPoints("g-lain")).toMatchObject({ success: false });
    const where = db.farmerGroup.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: "g-lain", isActive: true, AND: { id: { in: ["g-scope"] } } });
    expect(markers.fetchFarmerGroupMarkerPoints).not.toHaveBeenCalled();
  });

  it("dalam scope → titik Lembaga itu; SUPERADMIN boleh Lembaga nonaktif (sama dengan halaman detail)", async () => {
    db.farmerGroup.findFirst.mockResolvedValue({ id: "g-scope" });
    expect(await getFarmerGroupMarkerPoints("g-scope")).toEqual({ success: true, data: [POINT] });
    expect(markers.fetchFarmerGroupMarkerPoints).toHaveBeenCalledWith("g-scope");

    isSuperAdmin.mockResolvedValue(true);
    await getFarmerGroupMarkerPoints("g-scope");
    expect(db.farmerGroup.findFirst.mock.calls[1][0].where.isActive).toBeUndefined();
  });
});

describe("getFarmerMarkerPoints (#335)", () => {
  it("izin VIEW master-data-farmers ditolak → error, kueri titik tak dijalankan", async () => {
    hasPermission.mockResolvedValue(false);
    expect(await getFarmerMarkerPoints("f1")).toMatchObject({ success: false });
    expect(hasPermission).toHaveBeenCalledWith("master-data-farmers", "VIEW");
    expect(markers.fetchFarmerMarkerPoints).not.toHaveBeenCalled();
  });

  it("petani di luar scope → error; dalam scope → titiknya, lewat farmerAccessFilter", async () => {
    db.farmer.findFirst.mockResolvedValueOnce(null);
    expect(await getFarmerMarkerPoints("f-lain")).toMatchObject({ success: false });
    expect(markers.fetchFarmerMarkerPoints).not.toHaveBeenCalled();

    db.farmer.findFirst.mockResolvedValueOnce({ id: "f1" });
    expect(await getFarmerMarkerPoints("f1")).toEqual({ success: true, data: [POINT] });
    expect(db.farmer.findFirst.mock.calls[1][0].where).toMatchObject({ id: "f1", farmerGroupId: { in: ["g-scope"] }, isActive: true });
    expect(markers.fetchFarmerMarkerPoints).toHaveBeenCalledWith("f1");
  });
});

describe("getFarmerDetail — hitungan patok sesudah scope (#335, temuan review #339)", () => {
  it("petani di luar scope → null tanpa satu pun kueri patok (dulu kueri titik tanpa scope jalan sejajar)", async () => {
    db.farmer.findFirst.mockResolvedValue(null);
    db.trainingPackage.findMany.mockResolvedValue([]);
    expect(await getFarmerDetail("f-lain")).toBeNull();
    expect(markers.fetchFarmerMarkerStats).not.toHaveBeenCalled();
    expect(markers.fetchFarmerMarkerPoints).not.toHaveBeenCalled();
  });
});
