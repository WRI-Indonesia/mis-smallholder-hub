import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard, scope distrik, dan soft delete Dashboard Snapshot (`snapshot.ts`) —
 * tanpa DB. Menu key di-hardcode `dashboard-snapshot`. Distrik yang diminta /
 * snapshot yang dibaca-dihapus wajib dalam scope (snapshot organisasi —
 * districtId NULL — terlihat semua); hapus = isActive=false; audit dari sesi.
 * Agregasi (lib/dashboard-*) dimock — diuji di lib test.
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

const dq = vi.hoisted(() => ({ aggregateDashboardData: vi.fn(), getDashboardFilterOptions: vi.fn() }));
vi.mock("@/lib/dashboard-query", () => dq);
vi.mock("@/lib/dashboard-aggregation", () => ({
  toSnapshotData: (d: unknown) => d,
  normalizeSnapshotData: (d: unknown) => d,
}));

const db = vi.hoisted(() => ({
  mainDashboardSnapshot: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/snapshot");
const SNAP = db.mainDashboardSnapshot;

const detailRow = (districtId: string | null) => ({
  id: "s-1", snapshotDate: new Date("2026-09-01T00:00:00Z"), districtId, joinedYear: null, data: { totalPetani: 5 },
  createdAt: new Date("2026-09-01T00:00:00Z"), district: null, createdByUser: { name: "Admin" },
});

beforeEach(() => {
  vi.clearAllMocks();
  session.value = { user: { id: "user-1" } };
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  getAccessibleDistrictIds.mockResolvedValue(null);
  dq.aggregateDashboardData.mockResolvedValue({ totalPetani: 5 });
  dq.getDashboardFilterOptions.mockResolvedValue({ districts: [], joinedYears: [] });
  SNAP.findFirst.mockResolvedValue(null);
  SNAP.findMany.mockResolvedValue([]);
  SNAP.create.mockResolvedValue({ id: "s-new" });
});

describe("guard — menu dashboard-snapshot", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["generateSnapshot", () => actions.generateSnapshot({}), "CREATE"],
    ["getSnapshotFilterOptions", () => actions.getSnapshotFilterOptions(), "VIEW"],
    ["getSnapshots", () => actions.getSnapshots(), "VIEW"],
    ["getSnapshotById", () => actions.getSnapshotById("s-1"), "VIEW"],
    ["deleteSnapshot", () => actions.deleteSnapshot("s-1"), "DELETE"],
  ];
  for (const [name, call, level] of cases) {
    it(`${name} → dashboard-snapshot:${level}`, async () => {
      await call();
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith("dashboard-snapshot", level);
    });
  }

  it("izin ditolak → baca melempar, mutasi { success:false }, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getSnapshotFilterOptions()).rejects.toThrow(/izin/);
    await expect(actions.getSnapshots()).rejects.toThrow(/izin/);
    await expect(actions.getSnapshotById("s-1")).rejects.toThrow(/izin/);
    expect((await actions.generateSnapshot({})).success).toBe(false);
    expect((await actions.deleteSnapshot("s-1")).success).toBe(false);
    expect(SNAP.findFirst).not.toHaveBeenCalled();
    expect(SNAP.findMany).not.toHaveBeenCalled();
    expect(SNAP.create).not.toHaveBeenCalled();
    expect(SNAP.update).not.toHaveBeenCalled();
    expect(dq.aggregateDashboardData).not.toHaveBeenCalled();
    expect(dq.getDashboardFilterOptions).not.toHaveBeenCalled();
  });
});

describe("generateSnapshot", () => {
  it("filter tak valid → gagal tanpa query DB", async () => {
    const res = await actions.generateSnapshot({ joinedYear: 1800 });
    expect(res.success).toBe(false);
    expect(SNAP.findFirst).not.toHaveBeenCalled();
  });

  it("distrik di luar scope → ditolak, tak ada agregasi/tulis", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    const res = await actions.generateSnapshot({ districtId: "1402" });
    expect(res.success === false && res.error).toMatch(/tidak memiliki akses ke distrik/);
    expect(dq.aggregateDashboardData).not.toHaveBeenCalled();
    expect(SNAP.create).not.toHaveBeenCalled();
  });

  it("sesi tanpa user → ditolak", async () => {
    session.value = null;
    const res = await actions.generateSnapshot({});
    expect(res.success === false && res.error).toMatch(/Sesi/);
    expect(SNAP.create).not.toHaveBeenCalled();
  });

  it("snapshot filter sama di detik yang sama → ditolak (dedupe klik ganda)", async () => {
    SNAP.findFirst.mockResolvedValue({ id: "s-dup" });
    const res = await actions.generateSnapshot({ districtId: "1401", joinedYear: 2024 });
    expect(res.success).toBe(false);
    expect(SNAP.findFirst.mock.calls[0][0].where).toMatchObject({ districtId: "1401", joinedYear: 2024, isActive: true });
    expect(SNAP.create).not.toHaveBeenCalled();
  });

  it("valid → agregasi dengan filter, createdBy/modifiedBy dari sesi, revalidate", async () => {
    const res = await actions.generateSnapshot({ districtId: "1401" });
    expect(res).toEqual({ success: true, data: { id: "s-new" } });
    expect(dq.aggregateDashboardData).toHaveBeenCalledWith({ districtId: "1401", joinedYear: null });
    expect(SNAP.create.mock.calls[0][0].data).toMatchObject({ districtId: "1401", joinedYear: null, createdBy: "user-1", modifiedBy: "user-1" });
    expect(SNAP.create.mock.calls[0][0].data.snapshotDate.getMilliseconds()).toBe(0);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tools/snapshot");
  });
});

describe("baca — scope distrik", () => {
  it("getSnapshots: user terbatas → distrik sendiri + organisasi (NULL), hanya aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    await actions.getSnapshots();
    expect(SNAP.findMany.mock.calls[0][0].where).toEqual({ isActive: true, OR: [{ districtId: { in: ["1401"] } }, { districtId: null }] });
  });

  it("getSnapshots: ALL → tanpa filter distrik", async () => {
    await actions.getSnapshots();
    expect(SNAP.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
  });

  it("getSnapshotById: hanya aktif; distrik di luar scope → melempar; organisasi boleh", async () => {
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    SNAP.findFirst.mockResolvedValue(detailRow("1402"));
    await expect(actions.getSnapshotById("s-1")).rejects.toThrow(/tidak memiliki akses/);
    expect(SNAP.findFirst.mock.calls[0][0].where).toEqual({ id: "s-1", isActive: true });
    SNAP.findFirst.mockResolvedValue(detailRow(null));
    expect((await actions.getSnapshotById("s-1"))?.id).toBe("s-1");
  });

  it("getSnapshotById: tak ditemukan → null", async () => {
    expect(await actions.getSnapshotById("x")).toBeNull();
  });
});

describe("deleteSnapshot — soft delete ber-scope", () => {
  it("tak ditemukan → gagal", async () => {
    expect((await actions.deleteSnapshot("x")).success).toBe(false);
    expect(SNAP.update).not.toHaveBeenCalled();
  });

  it("distrik di luar scope → ditolak, tak ada update", async () => {
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    SNAP.findFirst.mockResolvedValue({ districtId: "1402" });
    const res = await actions.deleteSnapshot("s-1");
    expect(res.success).toBe(false);
    expect(SNAP.update).not.toHaveBeenCalled();
  });

  it("dalam scope → isActive=false + modifiedBy dari sesi (bukan hard delete)", async () => {
    SNAP.findFirst.mockResolvedValue({ districtId: "1401" });
    const res = await actions.deleteSnapshot("s-1");
    expect(res.success).toBe(true);
    expect(SNAP.update).toHaveBeenCalledWith({ where: { id: "s-1" }, data: { isActive: false, modifiedBy: "user-1" } });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tools/snapshot");
  });
});
