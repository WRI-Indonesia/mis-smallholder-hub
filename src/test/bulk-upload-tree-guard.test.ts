import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard, scope, dan revisi set pohon Bulk Upload Pohon (`bulk-upload-tree.ts`,
 * #238) — tanpa DB. Menu key di-hardcode `bulk-upload-trees`. Lahan wajib
 * dalam scope; ambiguitas parcel_id dihitung GLOBAL (tanpa scope); upload
 * ulang = pohon aktif lama isActive=false, set baru revision = max + 1.
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

const db = vi.hoisted(() => ({
  landParcel: { findMany: vi.fn(), groupBy: vi.fn() },
  tree: { groupBy: vi.fn(), updateMany: vi.fn(), createMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/bulk-upload-tree");

const treeRow = { treeId: 1, sequenceNo: 1, longitude: 101.1, latitude: 0.5, category: null, vigor: null, source: null, modelVersion: null };
const input = (parcelId = "HJP.0001.A") => ({ sourceFile: "pohon.zip", groups: [{ parcelId, rows: [treeRow, { ...treeRow, treeId: 2 }] }] });

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  parseShapefileZip.mockResolvedValue({ features: [] });
  db.landParcel.findMany.mockResolvedValue([{ id: "lp-1", parcelId: "HJP.0001.A", area: 2, farmer: { name: "Budi" } }]);
  db.landParcel.groupBy.mockResolvedValue([{ parcelId: "HJP.0001.A", _count: { _all: 1 } }]);
  db.tree.groupBy.mockResolvedValue([]);
  db.tree.createMany.mockResolvedValue({ count: 2 });
});

describe("guard — menu bulk-upload-trees", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["parseTreeShapefile", () => actions.parseTreeShapefile("AAAA"), "VIEW"],
    ["matchTreeUploadParcels", () => actions.matchTreeUploadParcels(["HJP.0001.A"]), "VIEW"],
    ["bulkCreateTrees", () => actions.bulkCreateTrees(input()), "CREATE"],
  ];
  for (const [name, call, level] of cases) {
    it(`${name} → bulk-upload-trees:${level}`, async () => {
      await call();
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith("bulk-upload-trees", level);
    });
  }

  it("izin ditolak → baca melempar, simpan { success:false }, DB & parser tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.parseTreeShapefile("AAAA")).rejects.toThrow(/izin/);
    await expect(actions.matchTreeUploadParcels(["HJP.0001.A"])).rejects.toThrow(/izin/);
    expect((await actions.bulkCreateTrees(input())).success).toBe(false);
    expect(parseShapefileZip).not.toHaveBeenCalled();
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("matchTreeUploadParcels — scope & ambiguitas global", () => {
  it("query lahan ber-scope, hitungan ambigu TANPA scope; id ambigu dikeluarkan", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    db.landParcel.findMany.mockResolvedValue([
      { id: "lp-1", parcelId: "A", area: 1, farmer: { name: "Budi" } },
      { id: "lp-2", parcelId: "B", area: 1, farmer: { name: "Sari" } },
    ]);
    db.landParcel.groupBy.mockResolvedValue([{ parcelId: "A", _count: { _all: 1 } }, { parcelId: "B", _count: { _all: 2 } }]);
    db.tree.groupBy.mockResolvedValue([{ landParcelId: "lp-1", _count: { _all: 7 } }]);
    const res = await actions.matchTreeUploadParcels(["A", "B", "A", ""]);
    expect(db.landParcel.findMany.mock.calls[0][0].where).toEqual({ parcelId: { in: ["A", "B"] }, isActive: true, farmer: { farmerGroupId: { in: ["kt-1"] } } });
    expect(db.landParcel.groupBy.mock.calls[0][0].where).toEqual({ parcelId: { in: ["A", "B"] }, isActive: true });
    expect(res.ambiguousParcelIds).toEqual(["B"]);
    expect(res.parcels).toEqual([{ id: "lp-1", parcelId: "A", area: 1, farmerName: "Budi", activeTreeCount: 7 }]);
  });

  it("daftar kosong → tanpa query DB", async () => {
    expect(await actions.matchTreeUploadParcels([])).toEqual({ parcels: [], ambiguousParcelIds: [] });
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });
});

describe("bulkCreateTrees — validasi, scope, revisi", () => {
  it("input tak lolos Zod → gagal tanpa query DB", async () => {
    const res = await actions.bulkCreateTrees({ groups: [] });
    expect(res.success).toBe(false);
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });

  it("lahan di luar scope → ditolak, tak ada transaksi", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    db.landParcel.findMany.mockResolvedValue([]);
    const res = await actions.bulkCreateTrees(input());
    expect(res.success === false && res.error).toMatch(/di luar akses/);
    expect(db.landParcel.findMany.mock.calls[0][0].where).toMatchObject({ isActive: true, farmer: { farmerGroup: { districtId: { in: ["1401"] } } } });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("parcel_id ambigu secara global (kembaran di luar scope) → ditolak", async () => {
    db.landParcel.groupBy.mockResolvedValue([{ parcelId: "HJP.0001.A", _count: { _all: 2 } }]);
    const res = await actions.bulkCreateTrees(input());
    expect(res.success === false && res.error).toMatch(/ambigu/);
    expect(db.landParcel.groupBy.mock.calls[0][0].where).not.toHaveProperty("farmer");
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("upload pertama → revision 0, tanpa soft delete, createdBy dari sesi", async () => {
    const res = await actions.bulkCreateTrees(input());
    expect(res).toEqual({ success: true, data: { parcels: 1, trees: 2 } });
    expect(db.tree.updateMany).not.toHaveBeenCalled();
    const data = db.tree.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ landParcelId: "lp-1", parcelId: "HJP.0001.A", revision: 0, createdBy: "user-1", sourceFile: "pohon.zip" });
  });

  it("upload ulang → pohon aktif lama isActive=false (modifiedBy), set baru revision = max + 1", async () => {
    db.tree.groupBy.mockResolvedValue([{ landParcelId: "lp-1", _max: { revision: 3 } }]);
    await actions.bulkCreateTrees(input());
    expect(db.tree.updateMany).toHaveBeenCalledWith({
      where: { landParcelId: { in: ["lp-1"] }, isActive: true },
      data: { isActive: false, modifiedBy: "user-1" },
    });
    expect(db.tree.createMany.mock.calls[0][0].data[0].revision).toBe(4);
  });

  it("P2028 (timeout transaksi) → pesan untuk memecah ZIP", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.tree.createMany.mockRejectedValue(Object.assign(new Error("Transaction timeout"), { code: "P2028" }));
    const res = await actions.bulkCreateTrees(input());
    expect(res.success === false && res.error).toMatch(/Pecah ZIP/);
  });
});
