import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & scope batas wilayah Fire Alert (`fire-boundary.ts`, #266/#269/#280)
 * — tanpa DB. Boundary Lembaga: `dashboard-risk-fire:VIEW` + scope akses.
 * Batas administrasi & outline Riau: `dashboard-risk-fire` ATAU `map-parcel`
 * (VIEW), sengaja tanpa access-context (garis referensi publik). Geojson yang
 * bukan MultiPolygon dibuang.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await import("@/lib/access-scope")),
  getAccessContext,
}));

const db = vi.hoisted(() => ({
  farmerGroupBoundary: { findMany: vi.fn() },
  administrativeBoundary: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/fire-boundary");

const MP = { type: "MultiPolygon", coordinates: [[[[101, 0], [101.1, 0], [101.1, 0.1], [101, 0]]]] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.farmerGroupBoundary.findMany.mockResolvedValue([]);
  db.administrativeBoundary.findMany.mockResolvedValue([]);
  db.$queryRaw.mockResolvedValue([{ geojson: MP }]);
});

describe("getFireBoundaries", () => {
  it("guard dashboard-risk-fire:VIEW; ditolak → melempar tanpa query", async () => {
    await actions.getFireBoundaries();
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("dashboard-risk-fire", "VIEW");
    hasPermission.mockResolvedValue(false);
    await expect(actions.getFireBoundaries()).rejects.toThrow(/izin/);
    expect(db.farmerGroupBoundary.findMany).toHaveBeenCalledTimes(1);
  });

  it("scope akses masuk ke relasi farmerGroup + hanya aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    await actions.getFireBoundaries();
    expect(db.farmerGroupBoundary.findMany.mock.calls[0][0].where).toEqual({
      isActive: true, farmerGroup: { isActive: true, districtId: { in: ["1401"] } },
    });
  });

  it("baris geojson bukan MultiPolygon dibuang", async () => {
    const fg = { name: "HJP", districtId: "1401", district: { name: "Siak" } };
    db.farmerGroupBoundary.findMany.mockResolvedValue([
      { id: "b-1", farmerGroupId: "kt-1", geojson: MP, farmerGroup: fg },
      { id: "b-2", farmerGroupId: "kt-2", geojson: { type: "Polygon", coordinates: [] }, farmerGroup: fg },
    ]);
    const res = await actions.getFireBoundaries();
    expect(res.map((b) => b.id)).toEqual(["b-1"]);
    expect(res[0]).toMatchObject({ name: "HJP", districtName: "Siak", geometry: MP });
  });
});

describe("batas administrasi — fire ATAU map-parcel", () => {
  it("pemegang dashboard-risk-fire tidak memicu cek kedua", async () => {
    await actions.getAdminBoundaries();
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("dashboard-risk-fire", "VIEW");
  });

  it("tanpa fire tapi punya map-parcel → boleh", async () => {
    hasPermission.mockImplementation(async (menu: string) => menu === "map-parcel");
    await expect(actions.getAdminBoundaries()).resolves.toEqual([]);
    expect(hasPermission).toHaveBeenCalledWith("map-parcel", "VIEW");
  });

  it("keduanya ditolak → getAdminBoundaries & getRiauOutline melempar tanpa query", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getAdminBoundaries()).rejects.toThrow(/izin/);
    await expect(actions.getRiauOutline()).rejects.toThrow(/izin/);
    expect(db.administrativeBoundary.findMany).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("getAdminBoundaries: hanya KABUPATEN aktif, tanpa filter scope; non-MultiPolygon dibuang", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    db.administrativeBoundary.findMany.mockResolvedValue([
      { id: "a-1", name: "Siak", districtId: "1401", geojson: MP },
      { id: "a-2", name: "Rusak", districtId: null, geojson: null },
    ]);
    const res = await actions.getAdminBoundaries();
    expect(db.administrativeBoundary.findMany.mock.calls[0][0].where).toEqual({ level: "KABUPATEN", isActive: true });
    expect(getAccessContext).not.toHaveBeenCalled();
    expect(res.map((r) => r.id)).toEqual(["a-1"]);
  });

  it("getRiauOutline: hasil union di-cache di memori proses (panggilan kedua tanpa query)", async () => {
    expect(await actions.getRiauOutline()).toEqual(MP);
    expect(await actions.getRiauOutline()).toEqual(MP);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
