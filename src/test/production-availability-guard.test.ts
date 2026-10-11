import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard 3 lapis action Ketersediaan Data › Produksi (#416) — tanpa DB:
 * izin dicek sebelum kueri; Lembaga/petani di luar scope → hasil kosong tanpa
 * kueri lanjutan; aksi khusus ekspor (Sheet 2 Excel) wajib EXPORT di server,
 * bukan sekadar tombol tersembunyi (review pra-rilis v1.7.0).
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({ getAccessContext }));

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn().mockResolvedValue([]),
  farmerGroup: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  farmer: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  landParcel: { findMany: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/production-availability");
const MENU = "data-analyst-availability-production";

beforeEach(() => {
  vi.clearAllMocks();
  getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-in"] });
  db.farmerGroup.findFirst.mockResolvedValue(null);
  db.farmer.findFirst.mockResolvedValue(null);
});

describe("izin dicek sebelum kueri", () => {
  it.each([
    ["getProductionAvailabilityView", () => actions.getProductionAvailabilityView()],
    ["getProductionAvailabilityFarmers", () => actions.getProductionAvailabilityFarmers("g-in", 2026)],
    ["getProductionAvailabilityParcels", () => actions.getProductionAvailabilityParcels("f-1", 2026)],
    ["getProductionAvailabilityGroupParcels", () => actions.getProductionAvailabilityGroupParcels("g-in", 2026)],
  ])("%s tanpa izin → throw, tanpa sentuh DB", async (_, call) => {
    hasPermission.mockResolvedValue(false);
    await expect(call()).rejects.toThrow(/izin/);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
    expect(db.farmer.findFirst).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("Sheet 2 Excel menuntut EXPORT, bukan VIEW", async () => {
    hasPermission.mockImplementation(async (_menu: string, perm: string) => perm === "VIEW");
    await expect(actions.getProductionAvailabilityGroupParcels("g-in", 2026)).rejects.toThrow(/mengekspor/);
    expect(hasPermission).toHaveBeenCalledWith(MENU, "EXPORT");
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("pohon layar cukup VIEW", async () => {
    hasPermission.mockImplementation(async (_menu: string, perm: string) => perm === "VIEW");
    await expect(actions.getProductionAvailabilityFarmers("g-in", 2026)).resolves.toEqual([]);
    expect(hasPermission).toHaveBeenCalledWith(MENU, "VIEW");
  });
});

describe("scope data", () => {
  beforeEach(() => hasPermission.mockResolvedValue(true));

  it("Lembaga di luar scope → [] tanpa kueri petani/record", async () => {
    await expect(actions.getProductionAvailabilityFarmers("g-out", 2026)).resolves.toEqual([]);
    // Regresi: spread `...farmerGroupAccessFilter` dulu MENIMPA `id: groupId` dengan `{ in: scope }`
    // sehingga Lembaga di luar scope lolos. Kini id yang diminta DAN scope sama-sama berlaku.
    const where = db.farmerGroup.findFirst.mock.calls[0][0].where;
    expect(where).toEqual({ AND: [{ id: "g-out", isActive: true }, { id: { in: ["g-in"] } }] });
    expect(db.farmer.findMany).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("ekspor Lembaga di luar scope → [] tanpa kueri lahan", async () => {
    await expect(actions.getProductionAvailabilityGroupParcels("g-out", 2026)).resolves.toEqual([]);
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toEqual({ AND: [{ id: "g-out", isActive: true }, { id: { in: ["g-in"] } }] });
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });

  it("petani di luar scope (relasi farmerGroup ber-scope) → kosong", async () => {
    await expect(actions.getProductionAvailabilityParcels("f-out", 2026)).resolves.toEqual({ parcels: [], noParcel: [] });
    const where = db.farmer.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: "f-out", isActive: true, farmerGroup: { isActive: true } });
    expect(JSON.stringify(where.farmerGroup)).toContain("g-in");
  });

  it("tampilan utama: kueri Lembaga memakai filter aktif + scope", async () => {
    await actions.getProductionAvailabilityView();
    const where = db.farmerGroup.findMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(JSON.stringify(where)).toContain("g-in");
  });
});
