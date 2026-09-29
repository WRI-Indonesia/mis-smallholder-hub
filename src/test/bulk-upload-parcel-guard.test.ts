import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard, scope, dan revisi Bulk Upload Lahan shapefile (`bulk-upload-parcel.ts`)
 * — tanpa DB, pola mock `land-marker-guard.test.ts`. Menu key di-hardcode
 * `bulk-upload-parcels`. Revisi: pasangan (petani, ID Lahan) aktif dengan
 * poligon beda → baris lama isActive=false, baris baru revision+1, produksi &
 * pohon di-repoint (TD-022/#238); poligon sama → ditolak.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await import("@/lib/access-scope")),
  getAccessContext,
}));

vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const parseShapefileZip = vi.hoisted(() => vi.fn());
vi.mock("@/lib/shapefile-server", () => ({ parseShapefileZip }));

const db = vi.hoisted(() => {
  const m = {
    farmer: { findMany: vi.fn() },
    landParcel: { findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    landParcelIdentity: { upsert: vi.fn() },
    landParcelBorder: { upsert: vi.fn() },
    productionRecord: { updateMany: vi.fn() },
    tree: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return m;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/bulk-upload-parcel");

const GEOM_A = { type: "Polygon", coordinates: [[[101, 0], [101.1, 0], [101.1, 0.1], [101, 0]]] };
const GEOM_B = { type: "Polygon", coordinates: [[[102, 0], [102.1, 0], [102.1, 0.1], [102, 0]]] };
const row = (o: Record<string, unknown> = {}) => ({ farmerId: "f-1", parcelId: "HJP.0001.A", geometry: GEOM_A, ...o });

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  parseShapefileZip.mockResolvedValue({ features: [] });
  db.farmer.findMany.mockResolvedValue([{ id: "f-1" }]);
  db.landParcel.findMany.mockResolvedValue([]);
  db.landParcel.create.mockResolvedValue({ id: "lp-new" });
  db.landParcelIdentity.upsert.mockResolvedValue({ id: "uid-1" });
});

describe("guard — menu bulk-upload-parcels", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["parseShapefile", () => actions.parseShapefile("AAAA"), "VIEW"],
    ["getFarmersForMapping", () => actions.getFarmersForMapping(), "VIEW"],
    ["getExistingParcelIds", () => actions.getExistingParcelIds(), "VIEW"],
    ["bulkCreateLandParcels", () => actions.bulkCreateLandParcels([row()]), "CREATE"],
  ];
  for (const [name, call, level] of cases) {
    it(`${name} → bulk-upload-parcels:${level}`, async () => {
      await call();
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith("bulk-upload-parcels", level);
    });
  }

  it("izin ditolak → baca melempar, simpan { success:false }, DB & parser tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.parseShapefile("AAAA")).rejects.toThrow(/izin/);
    await expect(actions.getFarmersForMapping()).rejects.toThrow(/izin/);
    await expect(actions.getExistingParcelIds()).rejects.toThrow(/izin/);
    expect((await actions.bulkCreateLandParcels([row()])).success).toBe(false);
    expect(parseShapefileZip).not.toHaveBeenCalled();
    expect(db.farmer.findMany).not.toHaveBeenCalled();
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("scope — pembacaan & target petani", () => {
  it("getFarmersForMapping BY_FARMER_GROUP / BY_DISTRICT → filter scope + aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    await actions.getFarmersForMapping();
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ farmerGroupId: { in: ["kt-1"] }, isActive: true });
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    await actions.getFarmersForMapping();
    expect(db.farmer.findMany.mock.calls[1][0].where).toEqual({ farmerGroup: { districtId: { in: ["1401"] } }, isActive: true });
  });

  it("getExistingParcelIds → filter lewat relasi farmer + hanya revisi aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    await actions.getExistingParcelIds();
    expect(db.landParcel.findMany.mock.calls[0][0].where).toEqual({ farmer: { farmerGroup: { districtId: { in: ["1401"] } } }, isActive: true });
  });

  it("bulkCreateLandParcels: petani di luar scope → ditolak sebelum transaksi", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    db.farmer.findMany.mockResolvedValue([{ id: "f-1" }]);
    const res = await actions.bulkCreateLandParcels([row(), row({ farmerId: "f-luar" })]);
    expect(res.success).toBe(false);
    expect(res.success === false && String(res.error)).toMatch(/f-luar/);
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ farmerGroupId: { in: ["kt-1"] }, isActive: true });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("bulkCreateLandParcels — validasi & audit", () => {
  it("baris tanpa ID Lahan → gagal Zod, tak ada transaksi", async () => {
    const res = await actions.bulkCreateLandParcels([row({ parcelId: "" })]);
    expect(res.success).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("sepadan tak valid → gagal, tak ada transaksi", async () => {
    const res = await actions.bulkCreateLandParcels([row({ border: { north: 123 } })]);
    expect(res.success).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("lahan baru → revision 0, createdBy dari sesi, identitas di-upsert, tak ada soft delete", async () => {
    const res = await actions.bulkCreateLandParcels([row()]);
    expect(res).toEqual({ success: true, data: { count: 1 } });
    expect(db.landParcelIdentity.upsert).toHaveBeenCalledTimes(1);
    expect(db.landParcel.create.mock.calls[0][0].data).toMatchObject({ parcelUid: "uid-1", revision: 0, createdBy: "user-1", farmerId: "f-1" });
    expect(db.landParcel.update).not.toHaveBeenCalled();
    expect(db.productionRecord.updateMany).not.toHaveBeenCalled();
  });

  it("sepadan: hanya sisi terisi yang ditulis ke satelit identitas", async () => {
    await actions.bulkCreateLandParcels([row({ border: { north: "Sungai", east: "", south: null, west: null } })]);
    const args = db.landParcelBorder.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ parcelUid: "uid-1" });
    expect(args.create).toEqual({ north: "Sungai", parcelUid: "uid-1", createdBy: "user-1" });
    expect(args.update).toEqual({ north: "Sungai", modifiedBy: "user-1" });
  });
});

describe("bulkCreateLandParcels — revisi", () => {
  it("pasangan aktif dengan poligon berbeda → lama isActive=false, baru revision+1, produksi & pohon di-repoint", async () => {
    db.landParcel.findMany.mockResolvedValue([{ id: "lp-old", farmerId: "f-1", parcelId: "HJP.0001.A", revision: 2, geometry: GEOM_B }]);
    const res = await actions.bulkCreateLandParcels([row()]);
    expect(res.success).toBe(true);
    expect(db.landParcel.findMany.mock.calls[0][0].where.isActive).toBe(true);
    expect(db.landParcel.update).toHaveBeenCalledWith({ where: { id: "lp-old" }, data: { isActive: false } });
    expect(db.landParcel.create.mock.calls[0][0].data.revision).toBe(3);
    expect(db.productionRecord.updateMany).toHaveBeenCalledWith({ where: { parcelId: "lp-old" }, data: { parcelId: "lp-new", modifiedBy: "user-1" } });
    expect(db.tree.updateMany).toHaveBeenCalledWith({ where: { landParcelId: "lp-old" }, data: { landParcelId: "lp-new", modifiedBy: "user-1" } });
  });

  it("pasangan aktif dengan poligon sama → ditolak, tak ada create", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.landParcel.findMany.mockResolvedValue([{ id: "lp-old", farmerId: "f-1", parcelId: "HJP.0001.A", revision: 0, geometry: GEOM_A }]);
    const res = await actions.bulkCreateLandParcels([row()]);
    expect(res.success).toBe(false);
    expect(res.success === false && String(res.error)).toMatch(/polygon yang sama/);
    expect(db.landParcel.create).not.toHaveBeenCalled();
  });

  it("pasangan muncul dua kali dalam satu batch (poligon beda) → baris kedua jadi revisi baris pertama", async () => {
    db.landParcel.create.mockResolvedValueOnce({ id: "lp-1" }).mockResolvedValueOnce({ id: "lp-2" });
    const res = await actions.bulkCreateLandParcels([row(), row({ geometry: GEOM_B })]);
    expect(res.success).toBe(true);
    expect(db.landParcel.update).toHaveBeenCalledWith({ where: { id: "lp-1" }, data: { isActive: false } });
    expect(db.landParcel.create.mock.calls.map((c) => c[0].data.revision)).toEqual([0, 1]);
  });
});
