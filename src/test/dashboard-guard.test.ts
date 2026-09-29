import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & scope Main Dashboard (`dashboard.ts`) — tanpa DB. Menu key
 * di-hardcode `dashboard-main`. Baris snapshot yang terlihat = distrik sendiri
 * + organisasi (NULL); isi snapshot dipangkas ke scope penonton
 * (`scopeSnapshotData`, diuji di lib test) — di sini dipastikan mode & id yang
 * diteruskan benar.
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

const scopeSnapshotData = vi.hoisted(() => vi.fn((d: object, s: object) => ({ ...d, scopedBy: s })));
vi.mock("@/lib/dashboard-aggregation", () => ({
  normalizeSnapshotData: (d: unknown) => d,
  scopeSnapshotData,
}));

const findFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { mainDashboardSnapshot: { findFirst } } }));

const { getLatestDashboardSnapshot } = await import("@/server/actions/dashboard");

const SNAP = {
  snapshotDate: new Date("2026-09-01T00:00:00Z"), districtId: null, joinedYear: null,
  data: { totalPetani: 10 }, district: null, createdByUser: { name: "Admin" },
};

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  getAccessibleDistrictIds.mockResolvedValue(null);
  findFirst.mockResolvedValue(SNAP);
});

describe("getLatestDashboardSnapshot", () => {
  it("guard dashboard-main:VIEW; ditolak → melempar tanpa query", async () => {
    await getLatestDashboardSnapshot();
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("dashboard-main", "VIEW");
    hasPermission.mockResolvedValue(false);
    await expect(getLatestDashboardSnapshot()).rejects.toThrow(/izin/);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("ALL → tanpa filter distrik, data tidak dipangkas; hanya snapshot aktif terbaru", async () => {
    const res = await getLatestDashboardSnapshot({ districtId: "1401", joinedYear: 2024 });
    const args = findFirst.mock.calls[0][0];
    expect(args.where).toEqual({ isActive: true, districtId: "1401", joinedYear: 2024 });
    expect(args.orderBy).toEqual({ snapshotDate: "desc" });
    expect(scopeSnapshotData).not.toHaveBeenCalled();
    expect(res?.data).toEqual({ totalPetani: 10 });
  });

  it("BY_DISTRICT → baris distrik sendiri + organisasi, isi dipangkas per distrik", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    const res = await getLatestDashboardSnapshot();
    expect(findFirst.mock.calls[0][0].where).toEqual({
      isActive: true, districtId: null, joinedYear: null, OR: [{ districtId: { in: ["1401"] } }, { districtId: null }],
    });
    expect(scopeSnapshotData).toHaveBeenCalledWith(SNAP.data, { mode: "BY_DISTRICT", districtIds: ["1401"] });
    expect(res?.data).toMatchObject({ scopedBy: { mode: "BY_DISTRICT" } });
  });

  it("BY_FARMER_GROUP → isi dipangkas per Lembaga", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    await getLatestDashboardSnapshot();
    expect(scopeSnapshotData).toHaveBeenCalledWith(SNAP.data, { mode: "BY_FARMER_GROUP", groupIds: ["kt-1"] });
  });

  it("tak ada snapshot → null", async () => {
    findFirst.mockResolvedValue(null);
    expect(await getLatestDashboardSnapshot()).toBeNull();
  });
});
