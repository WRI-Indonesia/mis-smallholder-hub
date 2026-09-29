import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & scope Dashboard BMP (`dashboard-bmp.ts`) — tanpa DB. Menu key
 * di-hardcode `dashboard-bmp`. Hanya snapshot organisasi (districtId NULL)
 * yang dibaca; entri per Lembaga dipangkas ke scope penonton lewat
 * `filterBmpGroups` (diuji di lib test).
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

const filterBmpGroups = vi.hoisted(() => vi.fn(() => [{ id: "kt-1" }]));
vi.mock("@/lib/bmp-dashboard-aggregation", () => ({
  normalizeBmpSnapshotData: (d: unknown) => d,
  filterBmpGroups,
}));

const findFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { bmpDashboardSnapshot: { findFirst } } }));

const { getLatestBmpSnapshot } = await import("@/server/actions/dashboard-bmp");

const DATA = { groups: [{ id: "kt-1" }, { id: "kt-2" }] };

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  getAccessibleDistrictIds.mockResolvedValue(null);
  findFirst.mockResolvedValue({ snapshotDate: new Date("2026-09-01T00:00:00Z"), data: DATA, createdByUser: { name: "Admin" } });
});

describe("getLatestBmpSnapshot", () => {
  it("guard dashboard-bmp:VIEW; ditolak → melempar tanpa query", async () => {
    await getLatestBmpSnapshot();
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("dashboard-bmp", "VIEW");
    hasPermission.mockResolvedValue(false);
    await expect(getLatestBmpSnapshot()).rejects.toThrow(/izin/);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("ALL → snapshot organisasi aktif terbaru, data utuh", async () => {
    const res = await getLatestBmpSnapshot();
    expect(findFirst.mock.calls[0][0].where).toEqual({ isActive: true, districtId: null });
    expect(findFirst.mock.calls[0][0].orderBy).toEqual({ snapshotDate: "desc" });
    expect(filterBmpGroups).not.toHaveBeenCalled();
    expect(res?.data).toEqual(DATA);
  });

  it("BY_DISTRICT → filter baris + entri dipangkas per distrik", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    const res = await getLatestBmpSnapshot();
    expect(findFirst.mock.calls[0][0].where).toEqual({ isActive: true, districtId: null, OR: [{ districtId: { in: ["1401"] } }, { districtId: null }] });
    expect(filterBmpGroups).toHaveBeenCalledWith(DATA, { districtIds: ["1401"] });
    expect(res?.data).toEqual({ groups: [{ id: "kt-1" }] });
  });

  it("BY_FARMER_GROUP → entri dipangkas per Lembaga", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    getAccessibleDistrictIds.mockResolvedValue(["1401"]);
    await getLatestBmpSnapshot();
    expect(filterBmpGroups).toHaveBeenCalledWith(DATA, { groupIds: ["kt-1"] });
  });

  it("tak ada snapshot → null", async () => {
    findFirst.mockResolvedValue(null);
    expect(await getLatestBmpSnapshot()).toBeNull();
  });
});
