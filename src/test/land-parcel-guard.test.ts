import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tiga lapis keamanan action CRUD Lahan (`src/server/actions/land-parcel.ts`)
 * tanpa DB — pola mock `land-marker-guard.test.ts`. Menu key di-hardcode
 * `master-data-parcels` (Profil Lahan = PRINT); scope memakai helper ASLI
 * `access-scope`. Yang dijaga: baca by-id & target mutasi ber-scope, lahan tak
 * bisa dibuat/dipindah ke petani di luar scope, hapus = `isActive:false`,
 * `revision` dinaikkan server (bukan dari klien), audit dari sesi. Helper
 * query berat (passport, tetangga, opsi petani) dipalsukan — diuji di berkasnya.
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

const helpers = vi.hoisted(() => ({
  getFarmerOptions: vi.fn(async () => []),
  fetchParcelPassport: vi.fn(async () => ({ success: true, data: {} })),
  fetchParcelNeighbors: vi.fn(async () => ({ neighbors: [], omitted: 0 })),
}));
vi.mock("@/lib/select-options", () => ({ getFarmerOptions: helpers.getFarmerOptions }));
vi.mock("@/lib/parcel-passport-query", () => ({ fetchParcelPassport: helpers.fetchParcelPassport }));
vi.mock("@/lib/parcel-neighbor-query", () => ({ fetchParcelNeighbors: helpers.fetchParcelNeighbors }));

const db = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), groupBy: vi.fn(), upsert: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
  });
  return {
    landParcel: model(), landParcelIdentity: model(), farmer: model(), productionRecord: model(), tree: model(),
    landParcelDocument: model(), landParcelStdb: model(), landParcelExternalId: model(), landParcelProgram: model(),
    landParcelBorder: model(), landParcelNkt: model(),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/land-parcel");

const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["1401"] };
const BY_GROUP = { mode: "BY_FARMER_GROUP", ids: ["kt-1"] };
const EXISTING = { id: "lp-1", farmerId: "f-1", parcelId: "HJP.0001.A", parcelUid: "uid-1", revision: 3, isActive: true };
const parcelInput = (o: Record<string, unknown> = {}) => ({
  farmerId: "f-1", parcelId: "HJP.0001.A", cropType: "Kelapa Sawit", area: 2, ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.landParcel.findMany.mockResolvedValue([]);
  // findFirst: lookup by id (scope) → EXISTING; cek duplikat (tanpa id string) → null.
  db.landParcel.findFirst.mockImplementation(async ({ where }: { where: { id?: unknown } }) =>
    typeof where.id === "string" ? EXISTING : null,
  );
  db.landParcel.create.mockResolvedValue({ id: "lp-new" });
  db.landParcel.update.mockResolvedValue({ id: "lp-1" });
  db.farmer.findFirst.mockResolvedValue({ id: "f-1" });
  db.landParcelIdentity.upsert.mockResolvedValue({ id: "uid-new" });
  db.landParcelIdentity.findUnique.mockResolvedValue(null);
  db.landParcelIdentity.update.mockResolvedValue({});
  db.productionRecord.findMany.mockResolvedValue([]);
  db.tree.groupBy.mockResolvedValue([]);
  db.tree.updateMany.mockResolvedValue({ count: 0 });
  for (const m of [db.landParcelDocument, db.landParcelStdb, db.landParcelExternalId, db.landParcelProgram]) m.findMany.mockResolvedValue([]);
  db.landParcelBorder.findUnique.mockResolvedValue(null);
  db.landParcelNkt.findUnique.mockResolvedValue(null);
});

describe("guard — menu master-data-parcels + level per action", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["getLandParcels", () => actions.getLandParcels(), "VIEW"],
    ["getLandParcelById", () => actions.getLandParcelById("lp-1"), "VIEW"],
    ["getLandParcelProduction", () => actions.getLandParcelProduction("lp-1"), "VIEW"],
    ["getFarmerSiblingParcels", () => actions.getFarmerSiblingParcels("f-1", "lp-1"), "VIEW"],
    ["getLandParcelNeighbors", () => actions.getLandParcelNeighbors("lp-1"), "VIEW"],
    ["getLandParcelPassport", () => actions.getLandParcelPassport("lp-1"), "PRINT"],
    ["createLandParcel", () => actions.createLandParcel(parcelInput({ parcelId: "HJP.0009.A" })), "CREATE"],
    ["updateLandParcel", () => actions.updateLandParcel({ id: "lp-1", ...parcelInput() }), "EDIT"],
    ["deleteLandParcel", () => actions.deleteLandParcel("lp-1"), "DELETE"],
    ["toggleLandParcelActive", () => actions.toggleLandParcelActive("lp-1"), "DELETE"],
    ["getLandParcelSatellites", () => actions.getLandParcelSatellites("lp-1"), "VIEW"],
  ];

  for (const [name, call, level] of cases) {
    it(`${name} → master-data-parcels:${level}`, async () => {
      await call();
      expect(hasPermission.mock.calls[0]).toEqual(["master-data-parcels", level]);
    });
  }

  it("getParcelFarmerOptions mendelegasikan ke getFarmerOptions dengan menu Lahan", async () => {
    await actions.getParcelFarmerOptions();
    expect(helpers.getFarmerOptions).toHaveBeenCalledExactlyOnceWith("master-data-parcels");
  });

  it("izin ditolak → baca melempar, mutasi/PRINT { success:false }, Prisma & helper tidak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getLandParcels()).rejects.toThrow(/izin/);
    await expect(actions.getLandParcelById("lp-1")).rejects.toThrow(/izin/);
    await expect(actions.getLandParcelProduction("lp-1")).rejects.toThrow(/izin/);
    await expect(actions.getFarmerSiblingParcels("f-1", "lp-1")).rejects.toThrow(/izin/);
    await expect(actions.getLandParcelNeighbors("lp-1")).rejects.toThrow(/izin/);
    await expect(actions.getLandParcelSatellites("lp-1")).rejects.toThrow(/izin/);
    for (const res of [
      await actions.getLandParcelPassport("lp-1"),
      await actions.createLandParcel(parcelInput()),
      await actions.updateLandParcel({ id: "lp-1", ...parcelInput() }),
      await actions.deleteLandParcel("lp-1"),
      await actions.toggleLandParcelActive("lp-1"),
    ]) expect(res.success).toBe(false);
    for (const m of Object.values(db)) for (const fn of Object.values(m)) expect(fn).not.toHaveBeenCalled();
    expect(helpers.fetchParcelPassport).not.toHaveBeenCalled();
    expect(helpers.fetchParcelNeighbors).not.toHaveBeenCalled();
  });
});

describe("scope — baca & target mutasi lewat farmerRelationAccessFilter", () => {
  it("getLandParcels BY_DISTRICT → farmer.farmerGroup.districtId; non-SUPERADMIN hanya aktif", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await actions.getLandParcels();
    expect(db.landParcel.findMany.mock.calls[0][0].where).toMatchObject({
      farmer: { farmerGroup: { districtId: { in: ["1401"] } } }, isActive: true,
    });
  });

  it("getLandParcels SUPERADMIN → tanpa filter isActive", async () => {
    isSuperAdmin.mockResolvedValue(true);
    await actions.getLandParcels();
    expect(db.landParcel.findMany.mock.calls[0][0].where).not.toHaveProperty("isActive");
  });

  it("baca by-id (detail, produksi, satelit, tetangga, lahan saudara) membawa scope", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    db.landParcel.findFirst.mockResolvedValue(null);
    expect(await actions.getLandParcelById("lp-9")).toBeNull();
    expect(await actions.getLandParcelProduction("lp-9")).toBeNull();
    expect(await actions.getLandParcelSatellites("lp-9")).toBeNull();
    expect(await actions.getLandParcelNeighbors("lp-9")).toEqual({ neighbors: [], omitted: 0 });
    for (const [args] of db.landParcel.findFirst.mock.calls) {
      expect(args.where).toMatchObject({ id: "lp-9", farmer: { farmerGroupId: { in: ["kt-1"] } } });
    }
    // Lahan di luar scope: turunannya tak pernah dibaca.
    expect(db.productionRecord.findMany).not.toHaveBeenCalled();
    expect(db.landParcelDocument.findMany).not.toHaveBeenCalled();
    expect(helpers.fetchParcelNeighbors).not.toHaveBeenCalled();

    await actions.getFarmerSiblingParcels("f-1", "lp-1");
    expect(db.landParcel.findMany.mock.calls[0][0].where).toMatchObject({
      farmerId: "f-1", isActive: true, id: { not: "lp-1" }, farmer: { farmerGroupId: { in: ["kt-1"] } },
    });
  });

  it("getLandParcelNeighbors meneruskan access ke fetchParcelNeighbors (nama di luar scope dibuang di sana)", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await actions.getLandParcelNeighbors("lp-1");
    expect(helpers.fetchParcelNeighbors.mock.calls[0]).toEqual(["lp-1", expect.any(Number), BY_DISTRICT]);
  });

  it("createLandParcel: petani di luar scope → ditolak, identitas & lahan tidak dibuat", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    db.farmer.findFirst.mockResolvedValue(null);
    const res = await actions.createLandParcel(parcelInput({ farmerId: "f-9" }));
    expect(res.success).toBe(false);
    expect(res.error).toHaveProperty("farmerId");
    expect(db.farmer.findFirst.mock.calls[0][0].where).toEqual({ id: "f-9", isActive: true, farmerGroupId: { in: ["kt-1"] } });
    expect(db.landParcelIdentity.upsert).not.toHaveBeenCalled();
    expect(db.landParcel.create).not.toHaveBeenCalled();
  });

  it("update/delete/toggle: lahan di luar scope → ditolak tanpa update", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    db.landParcel.findFirst.mockResolvedValue(null);
    for (const res of [
      await actions.updateLandParcel({ id: "lp-1", ...parcelInput() }),
      await actions.deleteLandParcel("lp-1"),
      await actions.toggleLandParcelActive("lp-1"),
    ]) expect(res.success).toBe(false);
    for (const [args] of db.landParcel.findFirst.mock.calls) {
      expect(args.where).toMatchObject({ id: "lp-1", farmer: { farmerGroup: { districtId: { in: ["1401"] } } } });
    }
    expect(db.landParcel.update).not.toHaveBeenCalled();
  });

  it("updateLandParcel: memindah lahan ke petani di luar scope → ditolak", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    db.farmer.findFirst.mockResolvedValue(null);
    const res = await actions.updateLandParcel({ id: "lp-1", ...parcelInput({ farmerId: "f-lain" }) });
    expect(res.success).toBe(false);
    expect(db.farmer.findFirst.mock.calls[0][0].where).toEqual({
      id: "f-lain", isActive: true, farmerGroup: { districtId: { in: ["1401"] } },
    });
    expect(db.landParcel.update).not.toHaveBeenCalled();
    expect(db.landParcelIdentity.update).not.toHaveBeenCalled();
  });
});

describe("tulis — Zod, duplikat, revisi, audit, soft delete", () => {
  it("createLandParcel tanpa ID Lahan / tahun tanam < 1900 → fieldErrors, tanpa DB", async () => {
    const res = await actions.createLandParcel(parcelInput({ parcelId: "", plantingYear: 1800 }));
    expect(res.success).toBe(false);
    expect(res.error).toHaveProperty("parcelId");
    expect(res.error).toHaveProperty("plantingYear");
    expect(db.farmer.findFirst).not.toHaveBeenCalled();
  });

  it("createLandParcel: ID Lahan aktif ganda untuk petani yang sama → ditolak", async () => {
    db.landParcel.findFirst.mockResolvedValue({ id: "lp-lama" });
    const res = await actions.createLandParcel(parcelInput());
    expect(res.error).toEqual({ parcelId: ["ID Lahan sudah terdaftar untuk petani ini"] });
    expect(db.landParcel.findFirst.mock.calls[0][0].where).toEqual({ farmerId: "f-1", parcelId: "HJP.0001.A", isActive: true });
    expect(db.landParcel.create).not.toHaveBeenCalled();
  });

  it("createLandParcel sukses → identitas di-upsert, revision 0, createdBy dari sesi", async () => {
    const res = await actions.createLandParcel(parcelInput({ parcelId: "HJP.0009.A" }));
    expect(res.success).toBe(true);
    expect(db.landParcelIdentity.upsert.mock.calls[0][0]).toMatchObject({
      where: { farmerId_parcelId: { farmerId: "f-1", parcelId: "HJP.0009.A" } },
      create: { createdBy: "user-1" },
    });
    expect(db.landParcel.create.mock.calls[0][0].data).toMatchObject({
      parcelId: "HJP.0009.A", parcelUid: "uid-new", revision: 0, createdBy: "user-1",
    });
  });

  it("updateLandParcel: revision = existing + 1 (abaikan klien), modifiedBy dari sesi, geometry tak ditimpa bila tak dikirim", async () => {
    const res = await actions.updateLandParcel({ id: "lp-1", ...parcelInput({ notes: "cek" }) });
    expect(res.success).toBe(true);
    const call = db.landParcel.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "lp-1" });
    expect(call.data).toMatchObject({ revision: 4, modifiedBy: "user-1", notes: "cek" });
    expect(call.data.geometry).toBeUndefined();
    expect(db.tree.updateMany).not.toHaveBeenCalled();
  });

  it("updateLandParcel: ganti ID Lahan → identitas dipindah + parcelId pohon ikut, audit modifiedBy", async () => {
    await actions.updateLandParcel({ id: "lp-1", ...parcelInput({ parcelId: "HJP.0002.A" }) });
    expect(db.landParcelIdentity.update.mock.calls[0][0]).toEqual({
      where: { id: "uid-1" }, data: { farmerId: "f-1", parcelId: "HJP.0002.A", modifiedBy: "user-1" },
    });
    expect(db.tree.updateMany.mock.calls[0][0]).toEqual({
      where: { landParcelId: "lp-1" }, data: { parcelId: "HJP.0002.A", modifiedBy: "user-1" },
    });
  });

  it("deleteLandParcel → update isActive:false + modifiedBy, bukan delete", async () => {
    const res = await actions.deleteLandParcel("lp-1");
    expect(res.success).toBe(true);
    expect(db.landParcel.update.mock.calls[0][0]).toEqual({ where: { id: "lp-1" }, data: { isActive: false, modifiedBy: "user-1" } });
    expect(db.landParcel.delete).not.toHaveBeenCalled();
    expect(db.landParcel.deleteMany).not.toHaveBeenCalled();
  });

  it("toggleLandParcelActive membalik isActive (restore)", async () => {
    db.landParcel.findFirst.mockResolvedValue({ isActive: false });
    await actions.toggleLandParcelActive("lp-1");
    expect(db.landParcel.update.mock.calls[0][0].data).toEqual({ isActive: true, modifiedBy: "user-1" });
  });
});
