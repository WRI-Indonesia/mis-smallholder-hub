import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard 3 lapis & semantik tulis Monev BMP (#344) — tanpa DB, pola mock
 * `land-parcel-satellite-nkt-guard.test.ts`. Aturan yang dijaga: satu
 * penilaian AKTIF per (petani, tahun) ditegakkan di action (bukan unique
 * index); lahan wajib milik petani yang sama; import meresolusi kode → CUID
 * ulang di server dan upsert per petani-tahun; scope lewat relasi `farmer`.
 */
const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerAccessFilter: (access: { mode: string; ids: string[] }) =>
    access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } : {},
  farmerGroupAccessFilter: (access: { mode: string; ids: string[] }) =>
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } : {},
  farmerRelationAccessFilter: (access: { mode: string; ids: string[] }) =>
    access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } : {},
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const db = vi.hoisted(() => ({
  farmer: { findFirst: vi.fn(), findMany: vi.fn() },
  farmerGroup: { findFirst: vi.fn() },
  landParcelIdentity: { findFirst: vi.fn() },
  bmpAssessment: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), createMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { createBmpAssessment, updateBmpAssessment, toggleBmpAssessmentActive, importBmpAssessments, getBmpAssessments } =
  await import("@/server/actions/bmp-assessment");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  db.farmer.findFirst.mockResolvedValue({ id: "f-1" });
  db.farmerGroup.findFirst.mockResolvedValue({ id: "g-1" });
  db.landParcelIdentity.findFirst.mockResolvedValue({ id: "uid-1" });
  db.bmpAssessment.findFirst.mockResolvedValue(null);
  db.bmpAssessment.findMany.mockResolvedValue([]);
  db.bmpAssessment.create.mockResolvedValue({ id: "a-1" });
  db.bmpAssessment.update.mockResolvedValue({ id: "a-1" });
  db.bmpAssessment.createMany.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => Promise<void>) => fn(db));
});

const INPUT = { farmerId: "f-1", surveyYear: 2026, surveyDate: "2026-06-26", score: 1.83, parcelUid: "uid-1", assessor: "Fasilitator", notes: null };

describe("guard menu master-data-bmp-monev", () => {
  it("CREATE/EDIT/DELETE/CREATE(import) ditolak → tanpa sentuh DB", async () => {
    hasPermission.mockResolvedValue(false);
    expect((await createBmpAssessment(INPUT)).success).toBe(false);
    expect(hasPermission).toHaveBeenLastCalledWith("master-data-bmp-monev", "CREATE");
    expect((await updateBmpAssessment({ id: "a-1", ...INPUT })).success).toBe(false);
    expect(hasPermission).toHaveBeenLastCalledWith("master-data-bmp-monev", "EDIT");
    expect((await toggleBmpAssessmentActive("a-1")).success).toBe(false);
    expect(hasPermission).toHaveBeenLastCalledWith("master-data-bmp-monev", "DELETE");
    expect((await importBmpAssessments({ farmerGroupId: "g-1", rows: [{ rowNumber: 3, farmerCode: "X.1", parcelId: null, surveyYear: 2026, surveyDate: null, score: 1 }] })).success).toBe(false);
    await expect(getBmpAssessments()).rejects.toThrow(/izin/);
    expect(db.farmer.findFirst).not.toHaveBeenCalled();
    expect(db.bmpAssessment.create).not.toHaveBeenCalled();
    expect(db.bmpAssessment.update).not.toHaveBeenCalled();
    expect(db.bmpAssessment.findMany).not.toHaveBeenCalled();
  });

  it("daftar: scope lewat AND (bukan spread) + petani aktif; non-SUPERADMIN hanya baris aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-1"] });
    await getBmpAssessments();
    const where = db.bmpAssessment.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual([{ farmer: { farmerGroupId: { in: ["g-1"] } } }]);
    expect(where.farmer).toEqual({ isActive: true });
    expect(where.isActive).toBe(true);
    isSuperAdmin.mockResolvedValue(true);
    await getBmpAssessments();
    expect(db.bmpAssessment.findMany.mock.calls[1][0].where.isActive).toBeUndefined();
  });

  it("petani di luar scope (BY_FARMER_GROUP) → ditolak sebelum menulis", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-lain"] });
    db.farmer.findFirst.mockResolvedValue(null);
    const res = await createBmpAssessment(INPUT);
    expect(res.success).toBe(false);
    expect(db.farmer.findFirst.mock.calls[0][0].where).toMatchObject({ id: "f-1", isActive: true, farmerGroupId: { in: ["g-lain"] } });
    expect(db.bmpAssessment.create).not.toHaveBeenCalled();
  });
});

describe("create/update — satu penilaian aktif per (petani, tahun), lahan milik petani", () => {
  it("create: simpan dengan audit createdBy; skor dibulatkan; tanggal jadi Date", async () => {
    const res = await createBmpAssessment({ ...INPUT, score: 1.8349 });
    expect(res).toEqual({ success: true, id: "a-1" });
    const data = db.bmpAssessment.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ farmerId: "f-1", surveyYear: 2026, score: 1.83, parcelUid: "uid-1", assessor: "Fasilitator", notes: null, createdBy: "user-1" });
    expect(data.surveyDate).toBeInstanceOf(Date);
    expect(db.landParcelIdentity.findFirst.mock.calls[0][0].where).toMatchObject({ id: "uid-1", farmerId: "f-1", isActive: true });
  });

  it("create: tahun itu sudah punya baris aktif → ditolak (fieldError surveyYear), tanpa create", async () => {
    db.bmpAssessment.findFirst.mockResolvedValue({ id: "a-lama" });
    const res = await createBmpAssessment(INPUT);
    expect(res.success).toBe(false);
    expect(typeof (res as { error: unknown }).error).toBe("object");
    expect(db.bmpAssessment.findFirst.mock.calls[0][0].where).toMatchObject({ farmerId: "f-1", surveyYear: 2026, isActive: true });
    expect(db.bmpAssessment.create).not.toHaveBeenCalled();
  });

  it("create: lahan bukan milik petani → ditolak", async () => {
    db.landParcelIdentity.findFirst.mockResolvedValue(null);
    const res = await createBmpAssessment(INPUT);
    expect(res.success).toBe(false);
    expect((res as { error: string }).error).toMatch(/bukan milik petani/);
    expect(db.bmpAssessment.create).not.toHaveBeenCalled();
  });

  it("update: baris nonaktif/di luar scope tidak ditemukan → ditolak; duplikat tahun mengecualikan diri sendiri", async () => {
    db.bmpAssessment.findFirst.mockResolvedValueOnce(null);
    expect((await updateBmpAssessment({ id: "a-1", ...INPUT })).success).toBe(false);
    expect(db.bmpAssessment.update).not.toHaveBeenCalled();

    db.bmpAssessment.findFirst.mockReset();
    db.bmpAssessment.findFirst.mockResolvedValueOnce({ id: "a-1" }).mockResolvedValueOnce(null);
    const ok = await updateBmpAssessment({ id: "a-1", ...INPUT, parcelUid: null });
    expect(ok.success).toBe(true);
    expect(db.bmpAssessment.findFirst.mock.calls[1][0].where).toMatchObject({ farmerId: "f-1", surveyYear: 2026, isActive: true, id: { not: "a-1" } });
    expect(db.bmpAssessment.update.mock.calls[0][0].data).toMatchObject({ parcelUid: null, modifiedBy: "user-1" });
    expect(db.landParcelIdentity.findFirst).not.toHaveBeenCalled();
  });

  it("Zod: skor 3,5 / tanggal masa depan ditolak sebelum DB", async () => {
    expect((await createBmpAssessment({ ...INPUT, score: 3.5 })).success).toBe(false);
    const future = new Date(Date.now() + 86_400_000 * 3);
    expect((await createBmpAssessment({ ...INPUT, surveyYear: future.getUTCFullYear(), surveyDate: future })).success).toBe(false);
    expect(db.farmer.findFirst).not.toHaveBeenCalled();
  });
});

describe("toggle (soft delete / restore)", () => {
  it("nonaktifkan: isActive dibalik + modifiedBy; restore ditolak bila tahun sudah punya baris aktif lain", async () => {
    db.bmpAssessment.findFirst.mockResolvedValueOnce({ isActive: true, farmerId: "f-1", surveyYear: 2026 });
    expect((await toggleBmpAssessmentActive("a-1")).success).toBe(true);
    expect(db.bmpAssessment.update.mock.calls[0][0]).toMatchObject({ where: { id: "a-1" }, data: { isActive: false, modifiedBy: "user-1" } });

    db.bmpAssessment.findFirst.mockReset();
    db.bmpAssessment.findFirst.mockResolvedValueOnce({ isActive: false, farmerId: "f-1", surveyYear: 2026 }).mockResolvedValueOnce({ id: "a-2" });
    const res = await toggleBmpAssessmentActive("a-1");
    expect(res.success).toBe(false);
    expect((res as { error: string }).error).toMatch(/sudah punya penilaian aktif/);
    expect(db.bmpAssessment.update).toHaveBeenCalledTimes(1);
  });
});

describe("import — resolusi ulang di server, upsert per petani-tahun", () => {
  const rows = [
    { rowNumber: 3, farmerCode: "X.1", parcelId: "X.1.A", surveyYear: 2026, surveyDate: "2026-06-26", score: 1.83 },
    { rowNumber: 4, farmerCode: "X.2", parcelId: "X.2.Z", surveyYear: 2026, surveyDate: null, score: 2.6 },
    { rowNumber: 5, farmerCode: "X.9", parcelId: null, surveyYear: 2026, surveyDate: null, score: 1.0 },
  ];

  beforeEach(() => {
    db.farmer.findMany.mockResolvedValue([
      { id: "f-1", farmerId: "X.1", landParcels: [{ parcelId: "X.1.A", parcelUid: "uid-a" }] },
      { id: "f-2", farmerId: "X.2", landParcels: [] },
    ]);
    // f-1 sudah punya 2026 → update; f-2 belum → create.
    db.bmpAssessment.findMany.mockResolvedValue([{ id: "a-1", farmerId: "f-1", surveyYear: 2026 }]);
  });

  it("Lembaga di luar scope → ditolak; kode tak dikenal ditolak per baris; lahan tak dikenal → tanpa lahan", async () => {
    db.farmerGroup.findFirst.mockResolvedValueOnce(null);
    expect((await importBmpAssessments({ farmerGroupId: "g-lain", rows })).success).toBe(false);
    expect(db.farmer.findMany).not.toHaveBeenCalled();

    const res = await importBmpAssessments({ farmerGroupId: "g-1", assessor: "Tim Rohul", rows });
    expect(res.success).toBe(true);
    expect(res.success && res.data).toMatchObject({ created: 1, updated: 1 });
    expect(res.success && res.data?.rejected).toEqual([{ rowNumber: 5, farmerCode: "X.9", reason: expect.stringMatching(/tidak dikenal/) }]);
    // update f-1: lahan dikenal → parcelUid diisi; assessor ikut
    expect(db.bmpAssessment.update.mock.calls[0][0]).toMatchObject({ where: { id: "a-1" }, data: { score: 1.83, parcelUid: "uid-a", assessor: "Tim Rohul", modifiedBy: "user-1" } });
    // create f-2: lahan X.2.Z tak dikenal → null
    expect(db.bmpAssessment.createMany.mock.calls[0][0].data).toEqual([
      { farmerId: "f-2", surveyYear: 2026, surveyDate: null, score: 2.6, parcelUid: null, assessor: "Tim Rohul", createdBy: "user-1" },
    ]);
  });

  it("berkas tanpa kolom lahan tidak menghapus lahan yang sudah tercatat (parcelUid tak disentuh saat update)", async () => {
    await importBmpAssessments({ farmerGroupId: "g-1", rows: [{ ...rows[0], parcelId: null }] });
    const data = db.bmpAssessment.update.mock.calls[0][0].data;
    expect("parcelUid" in data).toBe(false);
    expect("assessor" in data).toBe(false);
  });

  it("duplikat petani-tahun dalam berkas: baris terakhir dipakai, yang tertimpa dilaporkan", async () => {
    const res = await importBmpAssessments({ farmerGroupId: "g-1", rows: [rows[1], { ...rows[1], rowNumber: 9, score: 2.7 }] });
    expect(res.success && res.data?.created).toBe(1);
    expect(res.success && res.data?.rejected[0]).toMatchObject({ rowNumber: 4, reason: expect.stringMatching(/Duplikat/) });
    expect(db.bmpAssessment.createMany.mock.calls[0][0].data[0].score).toBe(2.7);
  });

  it("transaksi gagal → error tunggal Bahasa Indonesia, tanpa klaim sebagian tersimpan", async () => {
    db.$transaction.mockRejectedValueOnce(new Error("boom"));
    const res = await importBmpAssessments({ farmerGroupId: "g-1", rows: [rows[0]] });
    expect(res.success).toBe(false);
    expect((res as { error: string }).error).toMatch(/tidak ada baris yang tersimpan/);
  });
});
