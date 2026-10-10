import { describe, it, expect, vi, beforeEach } from "vitest";
import { matches, type Row } from "./prisma-where";

/**
 * Guard 3 lapis CRUD satelit lahan 1:N (`src/server/actions/land-parcel-satellite.ts`)
 * — dokumen, STDB, program, nonaktifkan — tanpa DB. Menguji action ASLI:
 * izin `master-data-parcels` per level, Zod → tanpa DB, scope lahan/record
 * (semantik lewat penilai `where` mini), soft delete (`isActive: false`, tidak
 * pernah `delete`), dan audit `createdBy`/`modifiedBy`. UL Parcel Code di
 * `land-parcel-external-id-guard.test.ts`; sepadan & NKT di
 * `land-parcel-satellite-nkt-guard.test.ts` — tidak diulang.
 *
 * Data contoh: lahan LP1 (G1/D1) · LP2 (G2/D1) · LP3 (G3/D2) · LP9 nonaktif (G1).
 */
const farmerOf = (n: number, groupId: string, districtId: string) => ({
  id: `F${n}`, isActive: true, farmerGroupId: groupId, farmerGroup: { id: groupId, districtId },
});
const PARCELS: Row[] = [
  { id: "LP1", parcelUid: "U1", farmerId: "F1", isActive: true, farmer: farmerOf(1, "G1", "D1") },
  { id: "LP2", parcelUid: "U2", farmerId: "F2", isActive: true, farmer: farmerOf(2, "G2", "D1") },
  { id: "LP3", parcelUid: "U3", farmerId: "F3", isActive: true, farmer: farmerOf(3, "G3", "D2") },
  { id: "LP9", parcelUid: "U9", farmerId: "F1", isActive: false, farmer: farmerOf(1, "G1", "D1") },
];
/** Satelit (dokumen/program/kode): record → identitas (`parcel`) → farmer. */
const SATELLITES: Row[] = PARCELS.slice(0, 3).map((p, i) => ({ id: `S${i + 1}`, isActive: true, parcelUid: p.parcelUid, parcel: { farmer: p.farmer } }));
const STDBS: Row[] = PARCELS.slice(0, 3).map((p, i) => ({ id: `T${i + 1}`, isActive: true, farmerId: p.farmerId, number: `N${i + 1}`, stage: "TERBIT", farmer: p.farmer }));

const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const db = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
  });
  return {
    landParcel: model(),
    landParcelDocument: model(),
    landParcelExternalId: model(),
    landParcelProgram: model(),
    landStdb: model(),
    landParcelStdb: model(),
    $transaction: vi.fn(),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const sat = await import("@/server/actions/land-parcel-satellite");

const MENU = "master-data-parcels";
const BY_GROUP = { mode: "BY_FARMER_GROUP", ids: ["G1"] };
const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["D1"] };

type Fn = ReturnType<typeof vi.fn>;
const modelFns = () => Object.entries(db).flatMap(([k, m]) => (k === "$transaction" ? [m as Fn] : Object.values(m as Record<string, Fn>)));
const expectNoDb = () => {
  for (const fn of modelFns()) expect(fn).not.toHaveBeenCalled();
};
const expectNoWrite = () => {
  for (const [k, m] of Object.entries(db)) {
    if (k === "$transaction") expect(m).not.toHaveBeenCalled();
    else for (const op of ["create", "update", "updateMany", "delete", "deleteMany"]) expect((m as Record<string, Fn>)[op]).not.toHaveBeenCalled();
  }
};
const argOf = (fn: Fn, i = 0) => fn.mock.calls[i][0] as { where: Row; data: Row };

const DOC = { landParcelId: "LP1", type: "SHM", number: "123/2020", holderName: "Budi" };
const STDB = { landParcelId: "LP1", stage: "TERBIT", number: " 9999/1 " };
const PROGRAM = { landParcelId: "LP1", programType: "DEMPLOT_PBU", status: "ACTIVE" };

const finder = (rows: Row[]) => async ({ where }: { where: unknown }) => rows.find((r) => matches(r, where)) ?? null;

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  db.landParcel.findFirst.mockImplementation(finder(PARCELS));
  for (const m of [db.landParcelDocument, db.landParcelProgram, db.landParcelExternalId]) {
    m.findFirst.mockImplementation(finder(SATELLITES));
    m.create.mockResolvedValue({ id: "new-1" });
    m.update.mockResolvedValue({ id: "S1" });
  }
  db.landStdb.findFirst.mockImplementation(finder(STDBS));
  db.landStdb.create.mockResolvedValue({ id: "T-new" });
  db.landParcelStdb.findUnique.mockResolvedValue(null);
  db.landParcelStdb.updateMany.mockResolvedValue({ count: 1 });
});

describe("izin menu master-data-parcels per level — ditolak → tanpa DB", () => {
  const cases: [string, string, () => Promise<{ success: boolean }>][] = [
    ["createLandParcelDocument", "CREATE", () => sat.createLandParcelDocument(DOC)],
    ["updateLandParcelDocument", "EDIT", () => sat.updateLandParcelDocument({ ...DOC, id: "S1" })],
    ["createLandStdb", "CREATE", () => sat.createLandStdb(STDB)],
    ["updateLandStdb", "EDIT", () => sat.updateLandStdb({ id: "T1", stage: "TERBIT", number: "N1" })],
    ["unlinkLandStdb", "DELETE", () => sat.unlinkLandStdb("LP1", "T1")],
    ["createLandParcelProgram", "CREATE", () => sat.createLandParcelProgram(PROGRAM)],
    ["updateLandParcelProgram", "EDIT", () => sat.updateLandParcelProgram({ ...PROGRAM, id: "S1" })],
    ["deactivateLandParcelSatellite", "DELETE", () => sat.deactivateLandParcelSatellite("document", "S1")],
  ];
  for (const [name, level, call] of cases) {
    it(`${name}: ${level}`, async () => {
      hasPermission.mockResolvedValue(false);
      const res = await call();
      expect(res.success).toBe(false);
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith(MENU, level);
      expect(getAccessContext).not.toHaveBeenCalled();
      expectNoDb();
    });
  }
});

describe("Zod gagal → fieldErrors per kolom, tanpa DB", () => {
  it("dokumen: jenis di luar enum / luas ≤ 0; update tanpa id", async () => {
    const res = await sat.createLandParcelDocument({ ...DOC, type: "KTP", statedArea: -1 });
    expect(res.success).toBe(false);
    expect(!res.success && res.error).toMatchObject({ type: expect.any(Array), statedArea: expect.any(Array) });
    expect(await sat.updateLandParcelDocument(DOC)).toMatchObject({ success: false, error: { id: expect.any(Array) } });
    expectNoDb();
  });

  it("STDB: tahap Terbit tanpa nomor; update Ditolak tanpa alasan", async () => {
    expect(await sat.createLandStdb({ landParcelId: "LP1", stage: "TERBIT" })).toMatchObject({ success: false, error: { number: expect.any(Array) } });
    expect(await sat.updateLandStdb({ id: "T1", stage: "DITOLAK" })).toMatchObject({ success: false, error: { stageNote: expect.any(Array) } });
    expectNoDb();
  });

  it("program: tanggal selesai sebelum mulai; status asing", async () => {
    expect(await sat.createLandParcelProgram({ ...PROGRAM, startDate: "2026-05-01", endDate: "2026-01-01" })).toMatchObject({
      success: false, error: { endDate: expect.any(Array) },
    });
    expect(await sat.updateLandParcelProgram({ ...PROGRAM, id: "S1", status: "DONE" })).toMatchObject({ success: false, error: { status: expect.any(Array) } });
    expectNoDb();
  });
});

describe("scope lahan induk (create & unlink) — id lahan dari klien tidak dipercaya", () => {
  const creates: [string, () => Promise<{ success: boolean }>][] = [
    ["dokumen", () => sat.createLandParcelDocument({ ...DOC, landParcelId: "LP2" })],
    ["STDB", () => sat.createLandStdb({ ...STDB, landParcelId: "LP2" })],
    ["program", () => sat.createLandParcelProgram({ ...PROGRAM, landParcelId: "LP2" })],
    ["unlink STDB", () => sat.unlinkLandStdb("LP2", "T2")],
  ];
  for (const [name, call] of creates) {
    it(`${name}: BY_FARMER_GROUP + lahan Lembaga lain (distrik sama) → ditolak tanpa tulis`, async () => {
      getAccessContext.mockResolvedValue(BY_GROUP);
      const res = await call();
      expect(res).toMatchObject({ success: false, error: expect.stringMatching(/di luar akses/) });
      expect(argOf(db.landParcel.findFirst).where).toMatchObject({ id: "LP2", isActive: true, farmer: { farmerGroupId: { in: ["G1"] } } });
      expectNoWrite();
    });
  }

  it("BY_DISTRICT + lahan distrik lain → ditolak; lahan nonaktif (walau milik user) → ditolak", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(await sat.createLandParcelDocument({ ...DOC, landParcelId: "LP3" })).toMatchObject({ success: false });
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await sat.createLandParcelProgram({ ...PROGRAM, landParcelId: "LP9" })).toMatchObject({ success: false });
    expectNoWrite();
  });

  it("dokumen dalam scope → parcelUid dari baris lahan (bukan dari klien), createdBy, tanpa landParcelId", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    const res = await sat.createLandParcelDocument({ ...DOC, landParcelId: "LP2", parcelUid: "U3" });
    expect(res).toEqual({ success: true, data: { id: "new-1" } });
    const { data } = argOf(db.landParcelDocument.create);
    expect(data).toMatchObject({ parcelUid: "U2", type: "SHM", number: "123/2020", createdBy: "user-1" });
    expect(data).not.toHaveProperty("landParcelId");
  });

  it("program dalam scope → createdBy terisi", async () => {
    await sat.createLandParcelProgram(PROGRAM);
    expect(argOf(db.landParcelProgram.create).data).toMatchObject({ parcelUid: "U1", programType: "DEMPLOT_PBU", createdBy: "user-1" });
  });
});

describe("update record satelit — kepemilikan dicek ulang lewat parcel.farmer", () => {
  it("dokumen: record lahan Lembaga lain → ditolak tanpa update; milik sendiri → modifiedBy", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await sat.updateLandParcelDocument({ ...DOC, id: "S2" })).toMatchObject({ success: false });
    expect(argOf(db.landParcelDocument.findFirst).where).toEqual({ id: "S2", isActive: true, parcel: { farmer: { farmerGroupId: { in: ["G1"] } } } });
    expect(db.landParcelDocument.update).not.toHaveBeenCalled();

    expect(await sat.updateLandParcelDocument({ ...DOC, id: "S1" })).toEqual({ success: true, data: { id: "S1" } });
    const { where, data } = argOf(db.landParcelDocument.update);
    expect(where).toEqual({ id: "S1" });
    expect(data).toMatchObject({ modifiedBy: "user-1", type: "SHM" });
    expect(data).not.toHaveProperty("landParcelId");
  });

  it("program: record distrik lain → ditolak; dalam scope → modifiedBy", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(await sat.updateLandParcelProgram({ ...PROGRAM, id: "S3" })).toMatchObject({ success: false });
    expect(db.landParcelProgram.update).not.toHaveBeenCalled();
    expect(await sat.updateLandParcelProgram({ ...PROGRAM, id: "S2" })).toMatchObject({ success: true });
    expect(argOf(db.landParcelProgram.update).data).toMatchObject({ modifiedBy: "user-1", status: "ACTIVE" });
  });

  it("STDB: scope lewat relasi farmer langsung; luar scope → ditolak; nomor bentrok → fieldError", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await sat.updateLandStdb({ id: "T2", stage: "TERBIT", number: "N2" })).toMatchObject({ success: false });
    expect(argOf(db.landStdb.findFirst).where).toEqual({ id: "T2", isActive: true, farmer: { farmerGroupId: { in: ["G1"] } } });

    db.landStdb.findFirst
      .mockResolvedValueOnce({ id: "T1", farmerId: "F1", number: "N1", stage: "TERBIT" })
      .mockResolvedValueOnce({ id: "T-other" });
    expect(await sat.updateLandStdb({ id: "T1", stage: "TERBIT", number: "N-baru" })).toMatchObject({ success: false, error: { number: expect.any(Array) } });
    expect(db.landStdb.update).not.toHaveBeenCalled();
  });

  it("STDB dalam scope → nomor di-trim, modifiedBy, stageChangedAt hanya bila tahap berubah", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await sat.updateLandStdb({ id: "T1", stage: "TERBIT", number: " N1 " })).toMatchObject({ success: true });
    const { data } = argOf(db.landStdb.update);
    expect(data).toMatchObject({ number: "N1", modifiedBy: "user-1" });
    expect(data).not.toHaveProperty("stageChangedAt");
  });
});

describe("createLandStdb — guard berkas terbuka & tautan", () => {
  it("tahap terbuka saat petani sudah punya berkas terbuka → fieldError stage, tanpa transaksi", async () => {
    db.landStdb.findFirst.mockResolvedValue({ id: "T-open" });
    const res = await sat.createLandStdb({ landParcelId: "LP1", stage: "PENGAJUAN" });
    expect(res).toMatchObject({ success: false, error: { stage: expect.any(Array) } });
    expect(argOf(db.landStdb.findFirst).where).toMatchObject({ farmerId: "F1", isActive: true });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("STDB baru: farmerId dari lahan, nomor di-trim, createdBy; tautan dibuat dengan createdBy", async () => {
    db.landStdb.findFirst.mockResolvedValue(null);
    expect(await sat.createLandStdb(STDB)).toEqual({ success: true, data: { id: "T-new" } });
    expect(argOf(db.landStdb.create).data).toMatchObject({ farmerId: "F1", number: "9999/1", stage: "TERBIT", createdBy: "user-1" });
    expect(argOf(db.landParcelStdb.create).data).toEqual({ parcelUid: "U1", stdbId: "T-new", createdBy: "user-1" });
  });

  it("nomor sama pernah dinonaktifkan → dipakai ulang & diaktifkan (modifiedBy), tautan nonaktif diaktifkan lagi", async () => {
    db.landStdb.findFirst.mockResolvedValue({ id: "T-old" });
    db.landParcelStdb.findUnique.mockResolvedValue({ id: "L-old", isActive: false });
    expect(await sat.createLandStdb(STDB)).toEqual({ success: true, data: { id: "T-old" } });
    expect(argOf(db.landStdb.update).data).toMatchObject({ isActive: true, modifiedBy: "user-1" });
    expect(db.landStdb.create).not.toHaveBeenCalled();
    expect(argOf(db.landParcelStdb.update)).toEqual({ where: { id: "L-old" }, data: { isActive: true, modifiedBy: "user-1" } });
  });
});

describe("soft delete — lepas STDB & nonaktifkan satelit tidak pernah menghapus baris", () => {
  it("unlinkLandStdb: updateMany isActive false + modifiedBy pada tautan aktif lahan itu saja", async () => {
    expect(await sat.unlinkLandStdb("LP1", "T1")).toEqual({ success: true });
    expect(argOf(db.landParcelStdb.updateMany)).toEqual({
      where: { parcelUid: "U1", stdbId: "T1", isActive: true },
      data: { isActive: false, modifiedBy: "user-1" },
    });
    for (const m of [db.landParcelStdb, db.landStdb]) {
      expect(m.delete).not.toHaveBeenCalled();
      expect(m.deleteMany).not.toHaveBeenCalled();
    }
  });

  it("unlinkLandStdb: tautan tak ditemukan → success false", async () => {
    db.landParcelStdb.updateMany.mockResolvedValue({ count: 0 });
    expect(await sat.unlinkLandStdb("LP1", "T-x")).toMatchObject({ success: false, error: expect.stringMatching(/tidak ditemukan/) });
  });

  const kinds: ["document" | "externalId" | "program", keyof typeof db][] = [
    ["document", "landParcelDocument"],
    ["externalId", "landParcelExternalId"],
    ["program", "landParcelProgram"],
  ];
  for (const [kind, table] of kinds) {
    it(`deactivate ${kind}: tabel ${table}, update isActive false + modifiedBy, tanpa delete`, async () => {
      expect(await sat.deactivateLandParcelSatellite(kind, "S1")).toEqual({ success: true });
      const m = db[table] as Record<string, Fn>;
      expect(argOf(m.update)).toEqual({ where: { id: "S1" }, data: { isActive: false, modifiedBy: "user-1" } });
      expect(m.delete).not.toHaveBeenCalled();
      expect(m.deleteMany).not.toHaveBeenCalled();
      for (const [, other] of kinds.filter(([k]) => k !== kind)) expect((db[other] as Record<string, Fn>).update).not.toHaveBeenCalled();
    });
  }

  it("deactivate: record di luar scope (BY_DISTRICT, distrik lain) → ditolak tanpa update", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(await sat.deactivateLandParcelSatellite("program", "S3")).toMatchObject({ success: false });
    expect(argOf(db.landParcelProgram.findFirst).where).toEqual({ id: "S3", isActive: true, parcel: { farmer: { farmerGroup: { districtId: { in: ["D1"] } } } } });
    expectNoWrite();
  });
});
