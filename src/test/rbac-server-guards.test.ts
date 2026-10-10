import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeRolePermissionUpdates } from "@/lib/role-permission-updates";

/**
 * Guard/scope yang menutup celah RBAC audit P0 (#125). Menguji kode ASLI:
 * action diimpor dengan `auth`/`rbac`/`prisma`/`getAccessContext` di-mock
 * (pola `land-marker-guard.test.ts`); filter scope tetap asli dari `access-scope`.
 */
const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
  getAccessibleDistrictIds: async () => null,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/land-marker-query", () => ({ fetchFarmerGroupMarkerPoints: vi.fn(), fetchFarmerMarkerPoints: vi.fn(), fetchFarmerGroupMarkerStats: vi.fn(async () => ({ total: 0, present: 0 })), fetchFarmerMarkerStats: vi.fn(async () => ({ total: 0, present: 0 })) }));
vi.mock("@/lib/parcel-passport-query", () => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));

const db = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn(), createMany: vi.fn(),
  });
  const m = {
    farmerGroup: model(),
    farmer: model(),
    menuItem: model(),
    rolePermission: model(),
    $transaction: vi.fn(),
  };
  m.$transaction.mockImplementation(async (fn: (tx: typeof m) => unknown) => fn(m));
  return m;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { toggleFarmerActive, createFarmer } = await import("@/server/actions/farmer");
const { bulkCreateFarmers } = await import("@/server/actions/bulk-upload");
const { setRolePermissions } = await import("@/server/actions/role-permission");

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  for (const m of [db.farmerGroup, db.farmer, db.menuItem, db.rolePermission]) {
    m.findFirst.mockResolvedValue(null);
    m.findMany.mockResolvedValue([]);
  }
});

const whereOf = (fn: { mock: { calls: unknown[][] } }) => (fn.mock.calls[0][0] as { where: Record<string, unknown> }).where;
const FARMER = { farmerGroupId: "kt-2", gender: "M" as const, name: "Budi", farmerId: "HJP.01" };

describe("RBAC scope — filter petani by-id (toggleFarmerActive)", () => {
  it("user BY_FARMER_GROUP tidak dapat menjangkau petani KT lain (where menyertakan filter KT)", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    const res = await toggleFarmerActive("farmer-x");
    expect(whereOf(db.farmer.findFirst)).toEqual({ id: "farmer-x", farmerGroupId: { in: ["kt-1"] } });
    expect(res.success).toBe(false);
    expect(db.farmer.update).not.toHaveBeenCalled();
  });

  it("user BY_DISTRICT dibatasi lewat relasi farmerGroup.districtId", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d1"] });
    await toggleFarmerActive("farmer-x");
    expect(whereOf(db.farmer.findFirst)).toEqual({ id: "farmer-x", farmerGroup: { districtId: { in: ["d1"] } } });
  });

  it("mode ALL tidak menambah batasan scope", async () => {
    await toggleFarmerActive("farmer-x");
    expect(whereOf(db.farmer.findFirst)).toEqual({ id: "farmer-x" });
  });
});

describe("RBAC guard — setRolePermissions: entri SUPERADMIN diabaikan, dedup entri terakhir menang (guard EDIT & no-op SUPERADMIN: role-permission-guard.test.ts)", () => {
  it("entri SUPERADMIN dibuang, entri role lain tetap", () => {
    const valid = normalizeRolePermissionUpdates([
      { role: "SUPERADMIN", menuKey: "settings-roles", permission: "EDIT", granted: false },
      { role: "OPERATOR", menuKey: "master-data-farmers", permission: "VIEW", granted: true },
    ]);
    expect(valid).toEqual([{ role: "OPERATOR", menuKey: "master-data-farmers", permission: "VIEW", granted: true }]);
  });

  it("dedup per (role, menuKey, permission) — entri terakhir menang (hanya PRINT yang dibuat)", async () => {
    await setRolePermissions([
      { role: "ADMIN", menuKey: "report-farmer", permission: "EXPORT", granted: true },
      { role: "ADMIN", menuKey: "report-farmer", permission: "EXPORT", granted: false },
      { role: "ADMIN", menuKey: "report-farmer", permission: "PRINT", granted: true },
    ]);
    // EXPORT berakhir `granted: false` dan belum ada barisnya → tidak dibuat.
    expect(db.rolePermission.createMany.mock.calls[0][0].data).toEqual([
      { role: "ADMIN", menuKey: "report-farmer", permission: "PRINT", createdBy: "user-1" },
    ]);
  });
});

describe("RBAC scope — validasi lembaga tani target (createFarmer & bulkCreateFarmers)", () => {
  it("createFarmer ter-scope: tolak petani ke KT di luar wilayah (lookup AND scope → null)", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    const res = await createFarmer(FARMER);
    expect(whereOf(db.farmerGroup.findFirst)).toEqual({ id: "kt-2", isActive: true, AND: { id: { in: ["kt-1"] } } });
    expect(res.success).toBe(false);
    expect(db.farmer.create).not.toHaveBeenCalled();
  });

  it("bulkCreateFarmers ter-scope: KT dalam wilayah diterima, KT luar wilayah menolak seluruh batch", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1", "kt-2"] });
    db.farmerGroup.findMany.mockResolvedValue([{ id: "kt-1" }, { id: "kt-2" }]);
    const ok = await bulkCreateFarmers([FARMER]);
    expect(ok.success).toBe(true);
    expect(db.farmer.createMany).toHaveBeenCalledTimes(1);

    db.farmer.createMany.mockClear();
    const bad = await bulkCreateFarmers([FARMER, { ...FARMER, farmerId: "X.02", farmerGroupId: "kt-9" }]);
    expect(bad.success).toBe(false);
    expect(bad.success === false && bad.error).toMatch(/kt-9/);
    expect(db.farmer.createMany).not.toHaveBeenCalled();
  });
});

