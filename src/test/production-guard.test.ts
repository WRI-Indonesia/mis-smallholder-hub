import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tiga lapis keamanan action Data Produksi (`src/server/actions/production.ts`)
 * tanpa DB — pola mock `land-marker-guard.test.ts`. Menu key di-hardcode
 * `master-data-production`; scope memakai helper ASLI `access-scope` (hanya
 * `getAccessContext` yang dipalsukan) supaya filter yang diuji sama dengan
 * yang dikirim ke Prisma. Hapus = `update isActive`, tidak pernah `delete`.
 */
const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));

vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const db = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
  });
  return { productionRecord: model(), farmer: model(), landParcel: model(), user: model() };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/production");

const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["1401"] };
const BY_GROUP = { mode: "BY_FARMER_GROUP", ids: ["kt-1"] };
const FARMER = { id: "f-1", farmerGroupId: "kt-1", farmerGroup: { districtId: "1401" } };
const RECORD = {
  id: "pr-1", farmerId: "f-1", parcelId: "lp-1", period: "2026-06",
  harvestNumber: 1, harvestDate: new Date("2026-06-10"), isActive: true,
};
const input = (o: Record<string, unknown> = {}) => ({
  farmerId: "f-1", parcelId: "lp-1", period: "2026-06", harvestDate: new Date("2026-06-10"),
  harvestNumber: 1, yieldKg: 1200, notes: null, ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.farmer.findFirst.mockResolvedValue(FARMER);
  db.landParcel.findFirst.mockResolvedValue({ id: "lp-1", farmerId: "f-1" });
  db.landParcel.findMany.mockResolvedValue([]);
  db.productionRecord.findMany.mockResolvedValue([]);
  // findFirst dipakai dua jalur: cari record (scope) & cek duplikat. Default: record ada, tak ada duplikat.
  db.productionRecord.findFirst.mockImplementation(async ({ where }: { where: { id?: unknown } }) =>
    typeof where.id === "string" ? RECORD : null,
  );
  db.productionRecord.create.mockResolvedValue({ id: "pr-new" });
  db.productionRecord.update.mockResolvedValue({ id: "pr-1" });
  db.user.findMany.mockResolvedValue([]);
});

describe("guard — menu master-data-production + level per action", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["getProductionRecords", () => actions.getProductionRecords(), "VIEW"],
    ["getProductionRecordById", () => actions.getProductionRecordById("pr-1"), "VIEW"],
    ["createProductionRecord", () => actions.createProductionRecord(input()), "CREATE"],
    ["updateProductionRecord", () => actions.updateProductionRecord("pr-1", { yieldKg: 900 }), "EDIT"],
    ["deleteProductionRecord", () => actions.deleteProductionRecord("pr-1"), "DELETE"],
    ["toggleProductionRecordActive", () => actions.toggleProductionRecordActive("pr-1"), "DELETE"],
    ["getParcelPeriodRecords", () => actions.getParcelPeriodRecords("lp-1", "2026-06"), "VIEW"],
    ["getFarmerParcels", () => actions.getFarmerParcels("f-1"), "VIEW"],
    ["getAuditUserNames", () => actions.getAuditUserNames("u-1", null), "VIEW"],
  ];

  for (const [name, call, level] of cases) {
    it(`${name} → master-data-production:${level}`, async () => {
      await call();
      expect(hasPermission.mock.calls[0]).toEqual(["master-data-production", level]);
    });
  }

  it("izin ditolak → baca melempar, mutasi { success:false }, Prisma tidak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getProductionRecords()).rejects.toThrow(/izin/);
    await expect(actions.getProductionRecordById("pr-1")).rejects.toThrow(/izin/);
    await expect(actions.getParcelPeriodRecords("lp-1", "2026-06")).rejects.toThrow(/izin/);
    await expect(actions.getAuditUserNames("u-1", null)).rejects.toThrow(/izin/);
    // getFarmerParcels dipakai combobox — gagal diam-diam = daftar kosong.
    expect(await actions.getFarmerParcels("f-1")).toEqual([]);
    for (const res of [
      await actions.createProductionRecord(input()),
      await actions.updateProductionRecord("pr-1", { yieldKg: 900 }),
      await actions.deleteProductionRecord("pr-1"),
      await actions.toggleProductionRecordActive("pr-1"),
    ]) expect(res.success).toBe(false);
    for (const m of [db.productionRecord, db.farmer, db.landParcel, db.user]) {
      for (const fn of Object.values(m)) expect(fn).not.toHaveBeenCalled();
    }
  });
});

describe("scope — filter getAccessContext ikut ke where", () => {
  it("getProductionRecords BY_DISTRICT → farmer.farmerGroup.districtId, filter Lembaga dari klien digabung (bukan ditimpa)", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await actions.getProductionRecords({ farmerGroupId: "kt-9" });
    expect(db.productionRecord.findMany.mock.calls[0][0].where.farmer).toEqual({
      farmerGroup: { districtId: { in: ["1401"] } },
      farmerGroupId: "kt-9",
    });
  });

  it("getProductionRecords BY_FARMER_GROUP → farmer.farmerGroupId in ids", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await actions.getProductionRecords();
    expect(db.productionRecord.findMany.mock.calls[0][0].where.farmer).toEqual({ farmerGroupId: { in: ["kt-1"] } });
  });

  it("getProductionRecordById & getParcelPeriodRecords membawa filter relasi petani", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await actions.getProductionRecordById("pr-1");
    expect(db.productionRecord.findFirst.mock.calls[0][0].where).toMatchObject({
      id: "pr-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-1"] } },
    });
    await actions.getParcelPeriodRecords("lp-1", "2026-06");
    expect(db.productionRecord.findMany.mock.calls[0][0].where).toMatchObject({
      parcelId: "lp-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-1"] } },
    });
  });

  it("createProductionRecord: petani di luar Lembaga scope → ditolak sebelum menulis", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    const res = await actions.createProductionRecord(input());
    expect(res).toMatchObject({ success: false, error: expect.stringMatching(/tidak memiliki akses/) });
    expect(db.productionRecord.create).not.toHaveBeenCalled();
  });

  it("createProductionRecord: petani di luar distrik scope → ditolak sebelum menulis", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1402"] });
    const res = await actions.createProductionRecord(input());
    expect(res.success).toBe(false);
    expect(db.productionRecord.create).not.toHaveBeenCalled();
  });

  it("update/delete/toggle: record di luar scope (findFirst null) → ditolak, tidak ada update", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    db.productionRecord.findFirst.mockResolvedValue(null);
    for (const res of [
      await actions.updateProductionRecord("pr-1", { yieldKg: 900 }),
      await actions.deleteProductionRecord("pr-1"),
      await actions.toggleProductionRecordActive("pr-1"),
    ]) expect(res.success).toBe(false);
    for (const [args] of db.productionRecord.findFirst.mock.calls) {
      expect(args.where).toMatchObject({ id: "pr-1", farmer: { farmerGroup: { districtId: { in: ["1401"] } } } });
    }
    expect(db.productionRecord.update).not.toHaveBeenCalled();
  });

  it("getFarmerParcels: petani di luar scope → [] tanpa membaca lahan", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    db.farmer.findFirst.mockResolvedValue(null);
    expect(await actions.getFarmerParcels("f-9")).toEqual([]);
    expect(db.farmer.findFirst.mock.calls[0][0].where).toMatchObject({ id: "f-9", isActive: true, farmerGroupId: { in: ["kt-1"] } });
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });
});

describe("soft delete — record nonaktif hanya untuk SUPERADMIN", () => {
  it("non-SUPERADMIN meminta status=all/inactive → tetap dipaksa isActive:true", async () => {
    await actions.getProductionRecords({ status: "inactive" });
    await actions.getProductionRecordById("pr-1");
    expect(db.productionRecord.findMany.mock.calls[0][0].where.isActive).toBe(true);
    expect(db.productionRecord.findFirst.mock.calls[0][0].where.isActive).toBe(true);
  });

  it("SUPERADMIN status=all → tanpa filter isActive", async () => {
    isSuperAdmin.mockResolvedValue(true);
    await actions.getProductionRecords({ status: "all" });
    expect(db.productionRecord.findMany.mock.calls[0][0].where).not.toHaveProperty("isActive");
  });

  it("deleteProductionRecord → update isActive:false + modifiedBy, bukan delete", async () => {
    const res = await actions.deleteProductionRecord("pr-1");
    expect(res.success).toBe(true);
    expect(db.productionRecord.update.mock.calls[0][0]).toEqual({
      where: { id: "pr-1" }, data: { isActive: false, modifiedBy: "user-1" },
    });
    expect(db.productionRecord.delete).not.toHaveBeenCalled();
    expect(db.productionRecord.deleteMany).not.toHaveBeenCalled();
  });

  it("toggleProductionRecordActive membalik isActive (restore record nonaktif)", async () => {
    db.productionRecord.findFirst.mockResolvedValue({ isActive: false });
    await actions.toggleProductionRecordActive("pr-1");
    expect(db.productionRecord.update.mock.calls[0][0].data).toEqual({ isActive: true, modifiedBy: "user-1" });
  });
});

describe("validasi Zod & aturan tulis", () => {
  it("create: periode salah format / tanggal di luar periode → fieldErrors, tanpa DB", async () => {
    const bad = await actions.createProductionRecord(input({ period: "06-2026" }));
    expect(bad.success).toBe(false);
    expect(bad.error).toHaveProperty("period");
    const outside = await actions.createProductionRecord(input({ harvestDate: new Date("2026-07-02") }));
    expect(outside.error).toHaveProperty("harvestDate");
    expect(db.farmer.findFirst).not.toHaveBeenCalled();
    expect(db.productionRecord.create).not.toHaveBeenCalled();
  });

  it("update: panen ke-5 → fieldErrors, tanpa DB", async () => {
    const res = await actions.updateProductionRecord("pr-1", { harvestNumber: 5 });
    expect(res.success).toBe(false);
    expect(res.error).toHaveProperty("harvestNumber");
    expect(db.productionRecord.findFirst).not.toHaveBeenCalled();
  });

  it("create: lahan milik petani lain → ditolak (cegah menempel panen ke lahan orang)", async () => {
    db.landParcel.findFirst.mockResolvedValue({ id: "lp-1", farmerId: "f-lain" });
    const res = await actions.createProductionRecord(input());
    expect(res.error).toEqual({ parcelId: ["Lahan tidak dimiliki oleh petani ini"] });
    expect(db.productionRecord.create).not.toHaveBeenCalled();
  });

  it("create: duplikat aktif (petani, lahan, periode, panen-ke) → ditolak", async () => {
    db.productionRecord.findFirst.mockResolvedValue({ id: "pr-lama" });
    const res = await actions.createProductionRecord(input());
    expect(res).toMatchObject({ success: false, error: expect.stringMatching(/sudah terdaftar/) });
    expect(db.productionRecord.findFirst.mock.calls[0][0].where).toMatchObject({
      farmerId: "f-1", parcelId: "lp-1", period: "2026-06", harvestNumber: 1, isActive: true,
    });
    expect(db.productionRecord.create).not.toHaveBeenCalled();
  });

  it("create sukses → createdBy dari sesi", async () => {
    const res = await actions.createProductionRecord(input());
    expect(res).toEqual({ success: true, id: "pr-new" });
    expect(db.productionRecord.create.mock.calls[0][0].data).toMatchObject({ farmerId: "f-1", yieldKg: 1200, createdBy: "user-1" });
  });

  it("update sukses → modifiedBy dari sesi; cek duplikat mengecualikan record sendiri", async () => {
    const res = await actions.updateProductionRecord("pr-1", { harvestNumber: 2 });
    expect(res.success).toBe(true);
    const dupWhere = db.productionRecord.findFirst.mock.calls[1][0].where;
    expect(dupWhere).toMatchObject({ harvestNumber: 2, id: { not: "pr-1" } });
    expect(db.productionRecord.update.mock.calls[0][0]).toMatchObject({
      where: { id: "pr-1" }, data: { harvestNumber: 2, modifiedBy: "user-1" },
    });
  });

  it("update: tanggal baru di luar periode lama → ditolak", async () => {
    const res = await actions.updateProductionRecord("pr-1", { harvestDate: new Date("2026-08-01") });
    expect(res.error).toHaveProperty("harvestDate");
    expect(db.productionRecord.update).not.toHaveBeenCalled();
  });
});
