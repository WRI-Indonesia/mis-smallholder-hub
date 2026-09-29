import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `src/lib/select-options.ts` ASLI (#129) — helper "for select" wajib cek VIEW
 * menu pemanggil sebelum menyentuh DB, lalu membatasi hasil ke scope akses.
 * `rbac`/`prisma`/`getAccessContext` di-mock; filter scope asli.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));

const db = vi.hoisted(() => ({
  farmer: { findMany: vi.fn() },
  farmerGroup: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getFarmerOptions, getFarmerGroupOptions } = await import("@/lib/select-options");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.farmer.findMany.mockResolvedValue([]);
  db.farmerGroup.findMany.mockResolvedValue([]);
});

describe("guard — VIEW pada menu pemanggil", () => {
  it("izin ditolak → throw, DB & konteks akses tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getFarmerOptions("master-data-parcels")).rejects.toThrow(/izin/);
    await expect(getFarmerGroupOptions("master-data-training")).rejects.toThrow(/izin/);
    expect(db.farmer.findMany).not.toHaveBeenCalled();
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    expect(getAccessContext).not.toHaveBeenCalled();
  });

  it("menu key yang dicek = argumen pemanggil, level VIEW", async () => {
    await getFarmerOptions("master-data-production");
    await getFarmerGroupOptions("master-data-farmers");
    expect(hasPermission.mock.calls).toEqual([
      ["master-data-production", "VIEW"],
      ["master-data-farmers", "VIEW"],
    ]);
  });
});

describe("scope — getFarmerOptions", () => {
  it("BY_FARMER_GROUP → farmerGroupId in ids + hanya aktif, kolom ringan urut nama", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    await getFarmerOptions("m");
    expect(db.farmer.findMany.mock.calls[0][0]).toEqual({
      where: { farmerGroupId: { in: ["kt-1"] }, isActive: true },
      select: { id: true, name: true, farmerId: true },
      orderBy: { name: "asc" },
    });
  });

  it("BY_DISTRICT → relasi farmerGroup.districtId", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d1"] });
    await getFarmerOptions("m");
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ farmerGroup: { districtId: { in: ["d1"] } }, isActive: true });
  });
});

describe("scope — getFarmerGroupOptions", () => {
  it("ALL → hanya isActive", async () => {
    await getFarmerGroupOptions("m");
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
  });

  it("BY_FARMER_GROUP → id in ids; BY_DISTRICT → districtId in ids", async () => {
    getAccessContext.mockResolvedValueOnce({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    await getFarmerGroupOptions("m");
    getAccessContext.mockResolvedValueOnce({ mode: "BY_DISTRICT", ids: ["d1"] });
    await getFarmerGroupOptions("m");
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["kt-1"] }, isActive: true });
    expect(db.farmerGroup.findMany.mock.calls[1][0].where).toEqual({ districtId: { in: ["d1"] }, isActive: true });
    expect(db.farmerGroup.findMany.mock.calls[0][0].select).toEqual({ id: true, name: true, code: true, districtId: true });
  });
});
