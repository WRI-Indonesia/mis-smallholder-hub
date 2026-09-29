import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard, scope, dan aturan tulis Bulk Upload Petani (`bulk-upload.ts`) — tanpa
 * DB, pola mock `land-parcel-export-guard.test.ts`. Menu key di-hardcode
 * `bulk-upload-farmers`; Lembaga tujuan wajib dalam scope (TD-029/TD-024);
 * validasi Zod gagal → tak ada tulis; P2002 diterjemahkan ke Bahasa Indonesia.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await import("@/lib/access-scope")),
  getAccessContext,
}));

vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const db = vi.hoisted(() => ({
  farmerGroup: { findMany: vi.fn(), findFirst: vi.fn() },
  farmer: { findMany: vi.fn(), createMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/bulk-upload");

const row = (o: Record<string, unknown> = {}) => ({
  farmerGroupId: "kt-1", gender: "M", name: "Budi", farmerId: "P-001", ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.farmerGroup.findMany.mockResolvedValue([{ id: "kt-1" }]);
  db.farmerGroup.findFirst.mockResolvedValue({ id: "kt-1" });
  db.farmer.findMany.mockResolvedValue([]);
  db.farmer.createMany.mockResolvedValue({ count: 1 });
});

describe("guard — menu bulk-upload-farmers", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["getFarmerGroupsForMapping", () => actions.getFarmerGroupsForMapping(), "VIEW"],
    ["getExistingFarmerIds", () => actions.getExistingFarmerIds("kt-1"), "VIEW"],
    ["bulkCreateFarmers", () => actions.bulkCreateFarmers([row()]), "CREATE"],
  ];
  for (const [name, call, level] of cases) {
    it(`${name} → bulk-upload-farmers:${level}`, async () => {
      await call();
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith("bulk-upload-farmers", level);
    });
  }

  it("izin ditolak → baca melempar, simpan { success:false }, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getFarmerGroupsForMapping()).rejects.toThrow(/izin/);
    await expect(actions.getExistingFarmerIds("kt-1")).rejects.toThrow(/izin/);
    const res = await actions.bulkCreateFarmers([row()]);
    expect(res.success).toBe(false);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
    expect(db.farmer.findMany).not.toHaveBeenCalled();
    expect(db.farmer.createMany).not.toHaveBeenCalled();
  });
});

describe("scope — Lembaga tujuan", () => {
  it("getFarmerGroupsForMapping: filter scope masuk lewat AND + hanya aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    await actions.getFarmerGroupsForMapping();
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toEqual({ isActive: true, AND: { districtId: { in: ["1401"] } } });
  });

  it("getExistingFarmerIds: Lembaga di luar scope → melempar, farmer tak dibaca", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    db.farmerGroup.findFirst.mockResolvedValue(null);
    await expect(actions.getExistingFarmerIds("kt-1")).rejects.toThrow(/di luar akses/);
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toEqual({ id: "kt-1", isActive: true, AND: { id: { in: ["kt-lain"] } } });
    expect(db.farmer.findMany).not.toHaveBeenCalled();
  });

  it("getExistingFarmerIds: dalam scope → hanya ID petani lembaga tsb (termasuk nonaktif)", async () => {
    db.farmer.findMany.mockResolvedValue([{ farmerId: "P-001" }, { farmerId: "P-002" }]);
    const ids = await actions.getExistingFarmerIds("kt-1");
    expect(ids).toEqual(["P-001", "P-002"]);
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ farmerGroupId: "kt-1" });
  });

  it("bulkCreateFarmers: satu baris ke Lembaga di luar scope → seluruh batch ditolak, tak ada tulis", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    db.farmerGroup.findMany.mockResolvedValue([{ id: "kt-1" }]);
    const res = await actions.bulkCreateFarmers([row(), row({ farmerGroupId: "kt-9", farmerId: "P-002" })]);
    expect(res.success).toBe(false);
    expect(res.success === false && String(res.error)).toMatch(/kt-9/);
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["kt-1"] }, isActive: true });
    expect(db.farmer.createMany).not.toHaveBeenCalled();
  });

  it("bulkCreateFarmers: mode ALL tak memeriksa daftar Lembaga", async () => {
    const res = await actions.bulkCreateFarmers([row()]);
    expect(res.success).toBe(true);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
  });
});

describe("bulkCreateFarmers — validasi, audit, duplikat", () => {
  it("baris tak lolos Zod → gagal, tak ada tulis", async () => {
    const res = await actions.bulkCreateFarmers([row(), row({ name: "X" })]);
    expect(res.success).toBe(false);
    expect(db.farmer.createMany).not.toHaveBeenCalled();
  });

  it("createdBy diisi dari sesi pada satu createMany", async () => {
    const res = await actions.bulkCreateFarmers([row(), row({ farmerId: "P-002" })]);
    expect(res).toEqual({ success: true, data: { count: 2 } });
    expect(db.farmer.createMany).toHaveBeenCalledTimes(1);
    const data = db.farmer.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data.every((d: { createdBy: string }) => d.createdBy === "user-1")).toBe(true);
  });

  it("P2002 (ID Petani bentrok per Lembaga) → pesan yang bisa ditindaklanjuti", async () => {
    db.farmer.createMany.mockRejectedValue(Object.assign(new Error("Unique constraint failed on tbl_farmer"), { code: "P2002" }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await actions.bulkCreateFarmers([row()]);
    expect(res.success).toBe(false);
    expect(res.success === false && String(res.error)).toMatch(/sudah terdaftar di lembaga ini/);
    expect(res.success === false && String(res.error)).not.toMatch(/tbl_farmer/);
  });
});
