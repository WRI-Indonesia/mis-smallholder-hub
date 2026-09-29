import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard, scope, dan soft delete Snapshot Dashboard BMP (`snapshot-bmp.ts`,
 * DASH-04 #166) — tanpa DB. Menu key di-hardcode `dashboard-snapshot-bmp`.
 * Agregasi snapshot wajib ber-scope (farmerGroupAccessFilter lewat AND, pitfall
 * #127); baca/hapus snapshot dibatasi distrik; hapus = isActive=false.
 * Rumus agregasi (lib/bmp-dashboard-aggregation) dimock — diuji di lib test.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
const getAccessibleDistrictIds = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await import("@/lib/access-scope")),
  getAccessContext,
  getAccessibleDistrictIds,
}));

const session = vi.hoisted(() => ({ value: { user: { id: "user-1" } } as { user: { id: string } } | null }));
vi.mock("@/lib/auth", () => ({ auth: async () => session.value }));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const agg = vi.hoisted(() => ({
  buildBmpSnapshotData: vi.fn(() => ({ groups: [] })),
  normalizeBmpSnapshotData: (d: unknown) => d,
  sumBmpGroups: () => ({ totals: { produksiTon: 0, lahanBerData: 0, totalLahan: 0, luasMelaporHa: 0, totalLuasHa: 0, petaniMelapor: 0, totalPetani: 0 } }),
}));
vi.mock("@/lib/bmp-dashboard-aggregation", () => agg);

const db = vi.hoisted(() => ({
  bmpDashboardSnapshot: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  farmerGroup: { findMany: vi.fn() },
  farmer: { findMany: vi.fn() },
  landParcel: { findMany: vi.fn() },
  productionRecord: { groupBy: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/snapshot-bmp");
const SNAP = db.bmpDashboardSnapshot;

beforeEach(() => {
  vi.clearAllMocks();
  session.value = { user: { id: "user-1" } };
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  getAccessibleDistrictIds.mockResolvedValue(null);
  SNAP.findFirst.mockResolvedValue(null);
  SNAP.findMany.mockResolvedValue([]);
  SNAP.create.mockResolvedValue({ id: "b-new" });
  db.farmerGroup.findMany.mockResolvedValue([{ id: "kt-1", name: "HJP", code: "ISH-1401-03", category: null, districtId: "1401", district: { name: "Siak" } }]);
  db.farmer.findMany.mockResolvedValue([]);
  db.landParcel.findMany.mockResolvedValue([]);
  db.productionRecord.groupBy.mockResolvedValue([]);
});

describe("guard — menu dashboard-snapshot-bmp", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["generateBmpSnapshot", () => actions.generateBmpSnapshot({}), "CREATE"],
    ["getBmpSnapshots", () => actions.getBmpSnapshots(), "VIEW"],
    ["getBmpSnapshotById", () => actions.getBmpSnapshotById("b-1"), "VIEW"],
    ["deleteBmpSnapshot", () => actions.deleteBmpSnapshot("b-1"), "DELETE"],
  ];
  for (const [name, call, level] of cases) {
    it(`${name} → dashboard-snapshot-bmp:${level}`, async () => {
      await call();
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith("dashboard-snapshot-bmp", level);
    });
  }

  it("izin ditolak → baca melempar, mutasi { success:false }, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getBmpSnapshots()).rejects.toThrow(/izin/);
    await expect(actions.getBmpSnapshotById("b-1")).rejects.toThrow(/izin/);
    expect((await actions.generateBmpSnapshot({})).success).toBe(false);
    expect((await actions.deleteBmpSnapshot("b-1")).success).toBe(false);
    expect(SNAP.findFirst).not.toHaveBeenCalled();
    expect(SNAP.findMany).not.toHaveBeenCalled();
    expect(SNAP.create).not.toHaveBeenCalled();
    expect(SNAP.update).not.toHaveBeenCalled();
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
  });
});

describe("generateBmpSnapshot", () => {
  it("filter tak valid → gagal tanpa query", async () => {
    const res = await actions.generateBmpSnapshot({ districtId: "" });
    expect(res.success).toBe(false);
    expect(SNAP.findFirst).not.toHaveBeenCalled();
  });

  it("distrik di luar scope → ditolak, tak ada agregasi/tulis", async () => {
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    const res = await actions.generateBmpSnapshot({ districtId: "1402" });
    expect(res.success === false && res.error).toMatch(/tidak memiliki akses ke distrik/);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    expect(SNAP.create).not.toHaveBeenCalled();
  });

  it("sesi tanpa user / duplikat detik yang sama → ditolak tanpa tulis", async () => {
    session.value = null;
    expect((await actions.generateBmpSnapshot({})).success).toBe(false);
    session.value = { user: { id: "user-1" } };
    SNAP.findFirst.mockResolvedValue({ id: "b-dup" });
    expect((await actions.generateBmpSnapshot({})).success).toBe(false);
    expect(SNAP.create).not.toHaveBeenCalled();
  });

  it("agregasi ber-scope: filter akses di AND (tak menimpa districtId), entitas turunan dibatasi Lembaga + aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    const res = await actions.generateBmpSnapshot({ districtId: "1401" });
    expect(res).toEqual({ success: true, data: { id: "b-new" } });
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toEqual({ isActive: true, districtId: "1401", AND: { id: { in: ["kt-1"] } } });
    const farmerWhere = { isActive: true, farmerGroupId: { in: ["kt-1"] } };
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual(farmerWhere);
    expect(db.landParcel.findMany.mock.calls[0][0].where).toEqual({ isActive: true, farmer: farmerWhere });
    expect(db.productionRecord.groupBy.mock.calls[0][0].where).toEqual({ isActive: true, farmer: farmerWhere });
    expect(SNAP.create.mock.calls[0][0].data).toMatchObject({ districtId: "1401", createdBy: "user-1", modifiedBy: "user-1" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tools/snapshot-bmp");
  });

  it("tak ada Lembaga dalam scope → entitas turunan tidak di-query", async () => {
    db.farmerGroup.findMany.mockResolvedValue([]);
    await actions.generateBmpSnapshot({});
    expect(db.farmer.findMany).not.toHaveBeenCalled();
    expect(agg.buildBmpSnapshotData).toHaveBeenCalledWith([], [], [], []);
  });
});

describe("baca & hapus — scope distrik + soft delete", () => {
  it("getBmpSnapshots: user terbatas → distrik sendiri + organisasi, hanya aktif", async () => {
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    await actions.getBmpSnapshots();
    expect(SNAP.findMany.mock.calls[0][0].where).toEqual({ isActive: true, OR: [{ districtId: { in: ["1401"] } }, { districtId: null }] });
  });

  it("getBmpSnapshotById: distrik di luar scope → melempar; tak ditemukan → null", async () => {
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    SNAP.findFirst.mockResolvedValue({ id: "b-1", snapshotDate: new Date(), districtId: "1402", data: { groups: [] }, createdAt: new Date(), district: null, createdByUser: { name: "A" } });
    await expect(actions.getBmpSnapshotById("b-1")).rejects.toThrow(/tidak memiliki akses/);
    expect(SNAP.findFirst.mock.calls[0][0].where).toEqual({ id: "b-1", isActive: true });
    SNAP.findFirst.mockResolvedValue(null);
    expect(await actions.getBmpSnapshotById("x")).toBeNull();
  });

  it("deleteBmpSnapshot: di luar scope → ditolak; dalam scope → isActive=false + modifiedBy", async () => {
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    SNAP.findFirst.mockResolvedValue({ districtId: "1402" });
    expect((await actions.deleteBmpSnapshot("b-1")).success).toBe(false);
    expect(SNAP.update).not.toHaveBeenCalled();

    SNAP.findFirst.mockResolvedValue({ districtId: null });
    expect((await actions.deleteBmpSnapshot("b-1")).success).toBe(true);
    expect(SNAP.update).toHaveBeenCalledWith({ where: { id: "b-1" }, data: { isActive: false, modifiedBy: "user-1" } });
  });
});
