import { describe, it, expect, vi, beforeEach } from "vitest";
import { matches, type Row } from "./prisma-where";

/**
 * Guard 3 lapis action Lembaga Petani (`src/server/actions/farmer-group.ts`) —
 * tanpa DB: Detail Lembaga (VIEW + scope by id), create (CREATE + Zod),
 * update (EDIT + Zod + scope by id), toggle aktif (DELETE + scope). Daftar
 * Lembaga & distrik di `farmer-group.test.ts`, titik patok di
 * `marker-points-lazy-guard.test.ts`, Laporan NKT di
 * `nkt-report-map-marker-guard.test.ts` — tidak diulang.
 *
 * Data contoh: G1 (D1) · G2 (D1) · G3 (D2) · G9 nonaktif (D1).
 */
const group = (id: string, districtId: string, isActive = true): Row => ({
  id, name: `Lembaga ${id}`, code: `C-${id}`, abrv: null, districtId, isActive, district: { id: districtId, name: districtId },
  joinYear: null, groupType: null, establishedYear: null, rspoCertYear: null, rspoCertStatus: null, ispoCertYear: null,
  ispoCertStatus: null, sapMapAssuranceYear: null, sapMapAssuranceStatus: null, locationLat: null, locationLong: null,
});
const GROUPS: Row[] = [group("G1", "D1"), group("G2", "D1"), group("G3", "D2"), group("G9", "D1", false)];

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
const markers = vi.hoisted(() => ({
  fetchFarmerGroupMarkerPoints: vi.fn(), fetchFarmerMarkerPoints: vi.fn(),
  fetchFarmerGroupMarkerStats: vi.fn(), fetchFarmerMarkerStats: vi.fn(),
}));
vi.mock("@/lib/land-marker-query", () => markers);

const db = vi.hoisted(() => ({
  farmerGroup: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  trainingPackage: { findMany: vi.fn() },
  trainingActivity: { findMany: vi.fn() },
  farmer: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getFarmerGroupDetail, createFarmerGroup, updateFarmerGroup, toggleFarmerGroupActive } = await import("@/server/actions/farmer-group");

const MENU = "master-data-groups";
const BY_GROUP = { mode: "BY_FARMER_GROUP", ids: ["G1"] };
const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["D1"] };
const VALID = { districtId: "D1", name: "Lembaga Baru", category: "SWADAYA" as const };

const expectNoDb = () => {
  for (const fn of Object.values(db).flatMap((m) => Object.values(m))) expect(fn).not.toHaveBeenCalled();
  expect(markers.fetchFarmerGroupMarkerStats).not.toHaveBeenCalled();
};
const argOf = (fn: { mock: { calls: unknown[][] } }, i = 0) => fn.mock.calls[i][0] as { where: Row; data: Row };

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.farmerGroup.findFirst.mockImplementation(async ({ where }: { where: unknown }) => GROUPS.find((g) => matches(g, where)) ?? null);
  db.farmerGroup.create.mockResolvedValue({ id: "G-new" });
  db.farmerGroup.update.mockResolvedValue({});
  db.trainingPackage.findMany.mockResolvedValue([]);
  db.trainingActivity.findMany.mockResolvedValue([]);
  db.farmer.findMany.mockResolvedValue([]);
  markers.fetchFarmerGroupMarkerStats.mockResolvedValue({ total: 0, present: 0 });
});

describe("getFarmerGroupDetail — VIEW + scope by id", () => {
  it("tanpa VIEW → melempar, tanpa kueri", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getFarmerGroupDetail("G1")).rejects.toThrow(/izin/);
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith(MENU, "VIEW");
    expectNoDb();
  });

  it("BY_FARMER_GROUP + Lembaga lain → null; literal id tak tertimpa scope (AND); data turunan tak dikueri", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await getFarmerGroupDetail("G2")).toBeNull();
    expect(argOf(db.farmerGroup.findFirst).where).toEqual({ id: "G2", AND: { id: { in: ["G1"] } }, isActive: true });
    for (const fn of [db.trainingPackage.findMany, db.trainingActivity.findMany, db.farmer.findMany]) expect(fn).not.toHaveBeenCalled();
    expect(markers.fetchFarmerGroupMarkerStats).not.toHaveBeenCalled();
  });

  it("BY_DISTRICT + Lembaga distrik lain → null", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(await getFarmerGroupDetail("G3")).toBeNull();
    expect(db.farmer.findMany).not.toHaveBeenCalled();
  });

  it("non-SUPERADMIN: Lembaga nonaktif → null; SUPERADMIN: boleh dibuka (tanpa filter isActive)", async () => {
    expect(await getFarmerGroupDetail("G9")).toBeNull();
    isSuperAdmin.mockResolvedValue(true);
    const res = await getFarmerGroupDetail("G9");
    expect(res?.group).toMatchObject({ id: "G9" });
    expect(argOf(db.farmerGroup.findFirst, 1).where).not.toHaveProperty("isActive");
  });

  it("dalam scope → kueri turunan dibatasi Lembaga itu & baris aktif", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    const res = await getFarmerGroupDetail("G1");
    expect(res?.group).toMatchObject({ id: "G1" });
    expect(argOf(db.trainingActivity.findMany).where).toEqual({ farmerGroupId: "G1", isActive: true });
    const farmerArgs = db.farmer.findMany.mock.calls[0][0];
    expect(farmerArgs.where).toEqual({ farmerGroupId: "G1", isActive: true });
    expect(farmerArgs.select.landParcels.where).toEqual({ isActive: true });
    expect(farmerArgs.select.productionRecords.where).toEqual({ isActive: true });
    expect(farmerArgs.select.trainingParticipants.where).toEqual({ isActive: true, activity: { isActive: true, farmerGroupId: "G1" } });
    expect(markers.fetchFarmerGroupMarkerStats).toHaveBeenCalledExactlyOnceWith("G1");
  });
});

describe("createFarmerGroup — CREATE + Zod", () => {
  it("tanpa CREATE → error, tanpa tulis", async () => {
    hasPermission.mockResolvedValue(false);
    expect(await createFarmerGroup(VALID)).toMatchObject({ success: false, error: expect.stringMatching(/izin/) });
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith(MENU, "CREATE");
    expectNoDb();
  });

  it("Zod gagal → fieldErrors per kolom (nama pendek, distrik kosong, tahun RSPO tanpa status), tanpa tulis", async () => {
    const res = await createFarmerGroup({ ...VALID, districtId: "", name: "A", rspoCertYear: 2024 });
    expect(res.success).toBe(false);
    expect(res.error).toMatchObject({ districtId: expect.any(Array), name: expect.any(Array) });
    const res2 = await createFarmerGroup({ ...VALID, rspoCertYear: 2024 });
    expect(res2.error).toMatchObject({ rspoCertStatus: expect.any(Array) });
    expectNoDb();
  });

  it("valid → create dengan createdBy dari sesi", async () => {
    expect(await createFarmerGroup(VALID)).toEqual({ success: true });
    expect(argOf(db.farmerGroup.create).data).toEqual({ ...VALID, createdBy: "user-1" });
  });
});

describe("updateFarmerGroup — EDIT + Zod + scope by id", () => {
  it("tanpa EDIT → error, tanpa kueri", async () => {
    hasPermission.mockResolvedValue(false);
    expect(await updateFarmerGroup({ ...VALID, id: "G1" })).toMatchObject({ success: false });
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith(MENU, "EDIT");
    expectNoDb();
  });

  it("Zod gagal (tanpa id / nama pendek) → fieldErrors, tanpa kueri", async () => {
    expect((await updateFarmerGroup(VALID as never)).error).toMatchObject({ id: expect.any(Array) });
    expect((await updateFarmerGroup({ ...VALID, id: "G1", name: "" })).error).toMatchObject({ name: expect.any(Array) });
    expectNoDb();
  });

  it("BY_FARMER_GROUP + Lembaga lain → ditolak; where = id + isActive + scope di AND", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await updateFarmerGroup({ ...VALID, id: "G2" })).toMatchObject({ success: false, error: expect.stringMatching(/tidak dalam akses/) });
    expect(argOf(db.farmerGroup.findFirst).where).toEqual({ id: "G2", isActive: true, AND: { id: { in: ["G1"] } } });
    expect(db.farmerGroup.update).not.toHaveBeenCalled();
  });

  it("Lembaga nonaktif → ditolak (aktifkan dulu)", async () => {
    expect(await updateFarmerGroup({ ...VALID, id: "G9" })).toMatchObject({ success: false });
    expect(db.farmerGroup.update).not.toHaveBeenCalled();
  });

  it("dalam scope → update by id, data tanpa id, modifiedBy dari sesi", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(await updateFarmerGroup({ ...VALID, id: "G2", name: "Nama Baru" })).toEqual({ success: true });
    const { where, data } = argOf(db.farmerGroup.update);
    expect(where).toEqual({ id: "G2" });
    expect(data).toEqual({ ...VALID, name: "Nama Baru", modifiedBy: "user-1" });
  });
});

describe("toggleFarmerGroupActive — DELETE + scope, soft delete", () => {
  it("tanpa DELETE → error, tanpa kueri", async () => {
    hasPermission.mockResolvedValue(false);
    expect(await toggleFarmerGroupActive("G1")).toMatchObject({ success: false, error: expect.stringMatching(/izin/) });
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith(MENU, "DELETE");
    expectNoDb();
  });

  it("Lembaga di luar scope → 'tidak ditemukan', tanpa update", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(await toggleFarmerGroupActive("G3")).toEqual({ success: false, error: "Lembaga Petani tidak ditemukan" });
    expect(argOf(db.farmerGroup.findFirst).where).toEqual({ id: "G3", AND: { districtId: { in: ["D1"] } } });
    expect(db.farmerGroup.update).not.toHaveBeenCalled();
  });

  it("dalam scope → flip isActive (aktif → nonaktif, nonaktif → aktif) + modifiedBy, tanpa delete", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await toggleFarmerGroupActive("G1");
    await toggleFarmerGroupActive("G9");
    expect(argOf(db.farmerGroup.update, 0)).toEqual({ where: { id: "G1" }, data: { isActive: false, modifiedBy: "user-1" } });
    expect(argOf(db.farmerGroup.update, 1)).toEqual({ where: { id: "G9" }, data: { isActive: true, modifiedBy: "user-1" } });
    expect(db.farmerGroup.delete).not.toHaveBeenCalled();
  });
});
