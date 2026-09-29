import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard, scope, dan aturan tulis Bulk Upload Produksi
 * (`bulk-upload-production.ts`) — tanpa DB. Menu key di-hardcode
 * `bulk-upload-production`; petani target wajib dalam scope; lahan harus aktif
 * & milik petani baris; duplikat (petani, lahan, periode, panen ke-) ditolak
 * baik terhadap DB maupun di dalam satu batch.
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
  farmer: { findMany: vi.fn() },
  landParcel: { findMany: vi.fn() },
  productionRecord: { findMany: vi.fn(), createMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/bulk-upload-production");

const row = (o: Record<string, unknown> = {}) => ({
  farmerId: "f-1", parcelId: "HJP.0001.A", period: "2026-06", harvestDate: "2026-06-10", harvestNumber: 1, yieldKg: 1200, ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.farmer.findMany.mockResolvedValue([{ id: "f-1" }]);
  db.landParcel.findMany.mockResolvedValue([{ id: "lp-1", parcelId: "HJP.0001.A", farmerId: "f-1" }]);
  db.productionRecord.findMany.mockResolvedValue([]);
  db.productionRecord.createMany.mockResolvedValue({ count: 1 });
});

describe("guard — menu bulk-upload-production", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["getFarmersForProductionMapping", () => actions.getFarmersForProductionMapping(), "VIEW"],
    ["getExistingProductionRecords", () => actions.getExistingProductionRecords(), "VIEW"],
    ["bulkCreateProductionRecords", () => actions.bulkCreateProductionRecords([row()]), "CREATE"],
  ];
  for (const [name, call, level] of cases) {
    it(`${name} → bulk-upload-production:${level}`, async () => {
      await call();
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith("bulk-upload-production", level);
    });
  }

  it("izin ditolak → baca melempar, simpan { success:false }, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getFarmersForProductionMapping()).rejects.toThrow(/izin/);
    await expect(actions.getExistingProductionRecords()).rejects.toThrow(/izin/);
    expect((await actions.bulkCreateProductionRecords([row()])).success).toBe(false);
    expect(db.farmer.findMany).not.toHaveBeenCalled();
    expect(db.productionRecord.findMany).not.toHaveBeenCalled();
    expect(db.productionRecord.createMany).not.toHaveBeenCalled();
  });
});

describe("scope", () => {
  it("getFarmersForProductionMapping BY_DISTRICT → filter distrik lembaga + aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    await actions.getFarmersForProductionMapping();
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ farmerGroup: { districtId: { in: ["1401"] } }, isActive: true });
  });

  it("getExistingProductionRecords BY_FARMER_GROUP → filter relasi farmer + aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    await actions.getExistingProductionRecords();
    expect(db.productionRecord.findMany.mock.calls[0][0].where).toEqual({ farmer: { farmerGroupId: { in: ["kt-1"] } }, isActive: true });
  });

  it("bulkCreateProductionRecords: petani di luar scope → ditolak, tak ada tulis", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    const res = await actions.bulkCreateProductionRecords([row({ farmerId: "f-luar" })]);
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatch(/f-luar/);
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ farmerGroupId: { in: ["kt-1"] }, isActive: true });
    expect(db.productionRecord.createMany).not.toHaveBeenCalled();
  });
});

describe("bulkCreateProductionRecords — validasi, kepemilikan lahan, duplikat, audit", () => {
  it("tanggal panen di luar periode → gagal Zod, tak ada tulis", async () => {
    const res = await actions.bulkCreateProductionRecords([row({ harvestDate: "2026-07-01" })]);
    expect(res.success).toBe(false);
    expect(db.productionRecord.createMany).not.toHaveBeenCalled();
  });

  it("lahan tak ditemukan/nonaktif → ditolak; lookup lahan hanya revisi aktif", async () => {
    db.landParcel.findMany.mockResolvedValue([]);
    const res = await actions.bulkCreateProductionRecords([row()]);
    expect(res.success === false && res.error).toMatch(/tidak ditemukan atau tidak aktif/);
    expect(db.landParcel.findMany.mock.calls[0][0].where.isActive).toBe(true);
    expect(db.productionRecord.createMany).not.toHaveBeenCalled();
  });

  it("lahan milik petani lain → ditolak", async () => {
    db.landParcel.findMany.mockResolvedValue([{ id: "lp-1", parcelId: "HJP.0001.A", farmerId: "f-2" }]);
    const res = await actions.bulkCreateProductionRecords([row()]);
    expect(res.success === false && res.error).toMatch(/tidak dimiliki/);
    expect(db.productionRecord.createMany).not.toHaveBeenCalled();
  });

  it("duplikat terhadap record aktif di DB → ditolak", async () => {
    db.productionRecord.findMany.mockResolvedValue([{ farmerId: "f-1", parcelId: "lp-1", period: "2026-06", harvestNumber: 1 }]);
    const res = await actions.bulkCreateProductionRecords([row()]);
    expect(res.success === false && res.error).toMatch(/sudah terdaftar/);
    expect(db.productionRecord.findMany.mock.calls[0][0].where).toEqual({ farmerId: { in: ["f-1"] }, isActive: true });
    expect(db.productionRecord.createMany).not.toHaveBeenCalled();
  });

  it("duplikat di dalam satu batch → ditolak", async () => {
    const res = await actions.bulkCreateProductionRecords([row(), row({ yieldKg: 900 })]);
    expect(res.success === false && res.error).toMatch(/sudah terdaftar/);
    expect(db.productionRecord.createMany).not.toHaveBeenCalled();
  });

  it("valid → satu createMany, parcelId dipetakan ke id baris lahan, createdBy dari sesi", async () => {
    const res = await actions.bulkCreateProductionRecords([row(), row({ harvestNumber: 2, parcelId: null })]);
    expect(res).toEqual({ success: true, data: { count: 2 } });
    const data = db.productionRecord.createMany.mock.calls[0][0].data;
    expect(data[0]).toMatchObject({ farmerId: "f-1", parcelId: "lp-1", createdBy: "user-1" });
    expect(data[1]).toMatchObject({ parcelId: null, createdBy: "user-1" });
  });
});
