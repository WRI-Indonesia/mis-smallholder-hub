import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tiga lapis keamanan action Pelatihan (`src/server/actions/training.ts`) tanpa
 * DB — pola mock `land-marker-guard.test.ts`. Menu key di-hardcode
 * `master-data-training`; scope memakai helper ASLI `access-scope`. Yang dijaga:
 * pelatihan & Lembaga target harus dalam scope (termasuk saat memindah Lembaga),
 * peserta hanya petani aktif Lembaga pelatihan itu, hapus peserta/pelatihan =
 * `isActive:false` (tak pernah `delete`), audit createdBy/modifiedBy dari sesi.
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
vi.mock("@/lib/s3", () => ({ getPresignedUrl: vi.fn(async (k: string) => `https://signed/${k}`) }));

const db = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
  });
  return {
    trainingActivity: model(), trainingParticipant: model(), trainingPackage: model(),
    farmerGroup: model(), farmer: model(),
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/training");

const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["1401"] };
const BY_GROUP = { mode: "BY_FARMER_GROUP", ids: ["kt-1"] };
const activityInput = (o: Record<string, unknown> = {}) => ({
  packageId: "pkg-1", farmerGroupId: "kt-1", trainingDate: new Date("2026-06-01"), location: "Balai Desa", ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.trainingActivity.findMany.mockResolvedValue([]);
  db.trainingActivity.findFirst.mockResolvedValue({ id: "ta-1", farmerGroupId: "kt-1", isActive: true, evidenceKey: null });
  db.trainingActivity.create.mockResolvedValue({ id: "ta-new" });
  db.trainingActivity.update.mockResolvedValue({ id: "ta-1" });
  db.farmerGroup.findFirst.mockResolvedValue({ id: "kt-1" });
  db.farmer.findMany.mockResolvedValue([{ id: "f-1" }]);
  db.trainingPackage.findMany.mockResolvedValue([]);
  db.trainingParticipant.findFirst.mockResolvedValue({ isActive: true });
  db.trainingParticipant.findMany.mockResolvedValue([]);
  db.trainingParticipant.create.mockImplementation(async (a: unknown) => a);
  db.trainingParticipant.update.mockImplementation(async (a: unknown) => a);
  db.trainingParticipant.updateMany.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
});

describe("guard — menu master-data-training + level per action", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["getTrainingActivities", () => actions.getTrainingActivities(), "VIEW"],
    ["getTrainingActivityById", () => actions.getTrainingActivityById("ta-1"), "VIEW"],
    ["createTrainingActivity", () => actions.createTrainingActivity(activityInput()), "CREATE"],
    ["updateTrainingActivity", () => actions.updateTrainingActivity({ id: "ta-1", ...activityInput() }), "EDIT"],
    ["toggleTrainingActivityActive", () => actions.toggleTrainingActivityActive("ta-1"), "DELETE"],
    ["getTrainingPackagesForSelect", () => actions.getTrainingPackagesForSelect(), "VIEW"],
    ["getFarmersByGroup", () => actions.getFarmersByGroup("kt-1"), "VIEW"],
    ["addParticipants", () => actions.addParticipants("ta-1", [{ farmerId: "f-1" }]), "EDIT"],
    ["removeParticipant", () => actions.removeParticipant("tp-1"), "EDIT"],
    ["removeParticipants", () => actions.removeParticipants(["tp-1"]), "EDIT"],
    ["updateParticipantScores", () => actions.updateParticipantScores("tp-1", { preTestScore: 50 }), "EDIT"],
  ];

  for (const [name, call, level] of cases) {
    it(`${name} → master-data-training:${level}`, async () => {
      await call();
      expect(hasPermission.mock.calls[0]).toEqual(["master-data-training", level]);
    });
  }

  it("izin ditolak → baca melempar, mutasi { success:false }, Prisma tidak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getTrainingActivities()).rejects.toThrow(/izin/);
    await expect(actions.getTrainingActivityById("ta-1")).rejects.toThrow(/izin/);
    await expect(actions.getTrainingPackagesForSelect()).rejects.toThrow(/izin/);
    await expect(actions.getFarmersByGroup("kt-1")).rejects.toThrow(/izin/);
    for (const res of [
      await actions.createTrainingActivity(activityInput()),
      await actions.updateTrainingActivity({ id: "ta-1", ...activityInput() }),
      await actions.toggleTrainingActivityActive("ta-1"),
      await actions.addParticipants("ta-1", [{ farmerId: "f-1" }]),
      await actions.removeParticipant("tp-1"),
      await actions.removeParticipants(["tp-1"]),
      await actions.updateParticipantScores("tp-1", { preTestScore: 50 }),
    ]) expect(res.success).toBe(false);
    for (const m of [db.trainingActivity, db.trainingParticipant, db.trainingPackage, db.farmerGroup, db.farmer]) {
      for (const fn of Object.values(m)) expect(fn).not.toHaveBeenCalled();
    }
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("scope — pelatihan & Lembaga target", () => {
  it("getTrainingActivities BY_DISTRICT → farmerGroup.districtId in ids; non-SUPERADMIN hanya aktif", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await actions.getTrainingActivities();
    expect(db.trainingActivity.findMany.mock.calls[0][0].where).toMatchObject({
      farmerGroup: { districtId: { in: ["1401"] } }, isActive: true,
    });
  });

  it("getTrainingActivities SUPERADMIN → tanpa filter isActive (lihat nonaktif untuk restore)", async () => {
    isSuperAdmin.mockResolvedValue(true);
    await actions.getTrainingActivities();
    expect(db.trainingActivity.findMany.mock.calls[0][0].where).not.toHaveProperty("isActive");
  });

  it("getTrainingActivityById di luar scope → null, presigned URL tidak dibuat", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    db.trainingActivity.findFirst.mockResolvedValue(null);
    expect(await actions.getTrainingActivityById("ta-9")).toBeNull();
    expect(db.trainingActivity.findFirst.mock.calls[0][0].where).toMatchObject({
      id: "ta-9", farmerGroupId: { in: ["kt-1"] }, isActive: true,
    });
  });

  it("createTrainingActivity: Lembaga di luar scope → ditolak; filter scope lewat AND (id literal tak tertimpa)", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    db.farmerGroup.findFirst.mockResolvedValue(null);
    const res = await actions.createTrainingActivity(activityInput({ farmerGroupId: "kt-9" }));
    expect(res.success).toBe(false);
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toEqual({
      id: "kt-9", isActive: true, AND: { id: { in: ["kt-1"] } },
    });
    expect(db.trainingActivity.create).not.toHaveBeenCalled();
  });

  it("updateTrainingActivity: pelatihan di luar scope → ditolak sebelum cek Lembaga", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    db.trainingActivity.findFirst.mockResolvedValue(null);
    const res = await actions.updateTrainingActivity({ id: "ta-1", ...activityInput() });
    expect(res.success).toBe(false);
    expect(db.trainingActivity.findFirst.mock.calls[0][0].where).toMatchObject({
      id: "ta-1", isActive: true, farmerGroup: { districtId: { in: ["1401"] } },
    });
    expect(db.trainingActivity.update).not.toHaveBeenCalled();
  });

  it("updateTrainingActivity: memindah ke Lembaga di luar scope → ditolak", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    db.farmerGroup.findFirst.mockResolvedValue(null);
    const res = await actions.updateTrainingActivity({ id: "ta-1", ...activityInput({ farmerGroupId: "kt-lain" }) });
    expect(res).toMatchObject({ success: false, error: expect.stringMatching(/memindahkan/) });
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toEqual({
      id: "kt-lain", isActive: true, AND: { districtId: { in: ["1401"] } },
    });
    expect(db.trainingActivity.update).not.toHaveBeenCalled();
  });

  it("toggleTrainingActivityActive: di luar scope → ditolak", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    db.trainingActivity.findFirst.mockResolvedValue(null);
    expect((await actions.toggleTrainingActivityActive("ta-1")).success).toBe(false);
    expect(db.trainingActivity.findFirst.mock.calls[0][0].where).toMatchObject({ id: "ta-1", farmerGroupId: { in: ["kt-1"] } });
    expect(db.trainingActivity.update).not.toHaveBeenCalled();
  });

  it("getFarmersByGroup: Lembaga di luar scope → melempar, daftar petani tidak dibaca", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    db.farmerGroup.findFirst.mockResolvedValue(null);
    await expect(actions.getFarmersByGroup("kt-9")).rejects.toThrow(/tidak dalam akses/);
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toEqual({ id: "kt-9", AND: { id: { in: ["kt-1"] } } });
    expect(db.farmer.findMany).not.toHaveBeenCalled();
  });

  it("peserta: removeParticipant/updateParticipantScores/removeParticipants membatasi lewat activity scope", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    db.trainingParticipant.findFirst.mockResolvedValue(null);
    expect((await actions.removeParticipant("tp-1")).success).toBe(false);
    expect((await actions.updateParticipantScores("tp-1", { preTestScore: 50 })).success).toBe(false);
    for (const [args] of db.trainingParticipant.findFirst.mock.calls) {
      expect(args.where).toEqual({ id: "tp-1", activity: { farmerGroupId: { in: ["kt-1"] } } });
    }
    expect(db.trainingParticipant.update).not.toHaveBeenCalled();

    await actions.removeParticipants(["tp-1", "tp-2"]);
    expect(db.trainingParticipant.updateMany.mock.calls[0][0]).toEqual({
      where: { id: { in: ["tp-1", "tp-2"] }, isActive: true, activity: { farmerGroupId: { in: ["kt-1"] } } },
      data: { isActive: false, modifiedBy: "user-1" },
    });
  });
});

describe("addParticipants — peserta dibatasi petani aktif Lembaga pelatihan", () => {
  it("pelatihan di luar scope → ditolak, petani tidak dibaca", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    db.trainingActivity.findFirst.mockResolvedValue(null);
    const res = await actions.addParticipants("ta-1", [{ farmerId: "f-1" }]);
    expect(res.success).toBe(false);
    expect(db.trainingActivity.findFirst.mock.calls[0][0].where).toMatchObject({ id: "ta-1", isActive: true, farmerGroupId: { in: ["kt-1"] } });
    expect(db.farmer.findMany).not.toHaveBeenCalled();
  });

  it("farmerId dari Lembaga lain disisipkan → seluruh batch ditolak", async () => {
    db.farmer.findMany.mockResolvedValue([{ id: "f-1" }]); // f-lain tidak lolos filter Lembaga
    const res = await actions.addParticipants("ta-1", [{ farmerId: "f-1" }, { farmerId: "f-lain" }]);
    expect(res.success).toBe(false);
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["f-1", "f-lain"] }, isActive: true, farmerGroupId: "kt-1" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("daftar kosong / nilai > 100 → ditolak Zod tanpa DB", async () => {
    expect((await actions.addParticipants("ta-1", [])).success).toBe(false);
    expect((await actions.addParticipants("ta-1", [{ farmerId: "f-1", postTestScore: 101 }])).success).toBe(false);
    expect(db.trainingActivity.findFirst).not.toHaveBeenCalled();
  });

  it("peserta lama direaktivasi (update + modifiedBy), baru dibuat (create + createdBy)", async () => {
    db.farmer.findMany.mockResolvedValue([{ id: "f-1" }, { id: "f-2" }]);
    db.trainingParticipant.findMany.mockResolvedValue([{ id: "tp-1", farmerId: "f-1" }]);
    const res = await actions.addParticipants("ta-1", [{ farmerId: "f-1", preTestScore: 40 }, { farmerId: "f-2" }]);
    expect(res.success).toBe(true);
    expect(db.trainingParticipant.update.mock.calls[0][0]).toEqual({
      where: { id: "tp-1" }, data: { isActive: true, preTestScore: 40, postTestScore: null, modifiedBy: "user-1" },
    });
    expect(db.trainingParticipant.create.mock.calls[0][0].data).toMatchObject({ activityId: "ta-1", farmerId: "f-2", createdBy: "user-1" });
  });
});

describe("tulis — Zod, audit, soft delete", () => {
  it("createTrainingActivity tanpa paket/tanggal → fieldErrors, tanpa DB", async () => {
    const res = await actions.createTrainingActivity(activityInput({ packageId: "", trainingDate: "" }));
    expect(res.success).toBe(false);
    expect(res.error).toHaveProperty("packageId");
    expect(res.error).toHaveProperty("trainingDate");
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
  });

  it("createTrainingActivity sukses → createdBy dari sesi", async () => {
    const res = await actions.createTrainingActivity(activityInput());
    expect(res).toEqual({ success: true, id: "ta-new" });
    expect(db.trainingActivity.create.mock.calls[0][0].data).toMatchObject({ farmerGroupId: "kt-1", createdBy: "user-1" });
  });

  it("updateTrainingActivity sukses → modifiedBy dari sesi, id tidak ikut data", async () => {
    await actions.updateTrainingActivity({ id: "ta-1", ...activityInput() });
    const call = db.trainingActivity.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "ta-1" });
    expect(call.data).toMatchObject({ modifiedBy: "user-1" });
    expect(call.data).not.toHaveProperty("id");
  });

  it("#385 createTrainingActivity mengabaikan evidenceKey/Name dari klien (kunci memuat id yang belum ada)", async () => {
    await actions.createTrainingActivity({ ...activityInput(), evidenceKey: "land-marker/x/1-foto.jpg", evidenceName: "foto.jpg" });
    const { data } = db.trainingActivity.create.mock.calls[0][0];
    expect(data).not.toHaveProperty("evidenceKey");
    expect(data).not.toHaveProperty("evidenceName");
  });

  it("#385 updateTrainingActivity: kunci objek lain di bucket → ditolak, tidak disimpan", async () => {
    for (const evidenceKey of ["land-marker/ta-9/1-foto.jpg", "training/ta-lain/1-a.pdf", "training/ta-1/../x.pdf"]) {
      const res = await actions.updateTrainingActivity({ id: "ta-1", ...activityInput(), evidenceKey, evidenceName: "a.pdf" });
      expect(res.success).toBe(false);
      expect(res.error).toHaveProperty("evidenceKey");
    }
    expect(db.trainingActivity.update).not.toHaveBeenCalled();
  });

  it("#385 updateTrainingActivity: kunci format sekarang / format lama #45 milik pelatihan ini, null, atau \"\" → diterima", async () => {
    for (const evidenceKey of ["training/ta-1/1727600000000-bukti.pdf", "training/evidence/2026/06/ta-1/bukti.pdf", null]) {
      expect((await actions.updateTrainingActivity({ id: "ta-1", ...activityInput(), evidenceKey })).success).toBe(true);
    }
    // "" (tanpa bukti) disimpan sebagai null — dulu terhitung "ada bukti" oleh evidenceKey != null.
    await actions.updateTrainingActivity({ id: "ta-1", ...activityInput(), evidenceKey: "", evidenceName: "" });
    expect(db.trainingActivity.update.mock.calls[3][0].data).toMatchObject({ evidenceKey: null, evidenceName: null });
  });

  it("#385 kunci tersimpan yang TIDAK berubah tak memblokir edit kolom lain; tautannya tetap tertutup (review wrap-up)", async () => {
    // Kunci lama tak lolos pola (mis. objek asing sebelum #385, atau nama ber-"..").
    db.trainingActivity.findFirst.mockResolvedValue({ id: "ta-1", evidenceKey: "land-marker/x/1-foto.jpg" });
    const res = await actions.updateTrainingActivity({ id: "ta-1", ...activityInput({ location: "Balai baru" }), evidenceKey: "land-marker/x/1-foto.jpg" });
    expect(res.success).toBe(true);
    // Sisi baca tetap tidak membuat presigned URL untuk kunci itu.
    expect((await actions.getTrainingActivityById("ta-1"))?.evidenceUrl).toBeNull();
    // Kunci asing yang BARU (berbeda dari tersimpan) tetap ditolak.
    const swap = await actions.updateTrainingActivity({ id: "ta-1", ...activityInput(), evidenceKey: "land-marker/y/2-lain.jpg" });
    expect(swap.success).toBe(false);
  });

  it("#385 getTrainingActivityById: presigned URL hanya untuk kunci milik pelatihan ini", async () => {
    db.trainingActivity.findFirst.mockResolvedValue({ id: "ta-1", evidenceKey: "land-marker/x/1-foto.jpg" });
    expect((await actions.getTrainingActivityById("ta-1"))?.evidenceUrl).toBeNull();
    db.trainingActivity.findFirst.mockResolvedValue({ id: "ta-1", evidenceKey: "training/ta-1/1-bukti.pdf" });
    expect((await actions.getTrainingActivityById("ta-1"))?.evidenceUrl).toBe("https://signed/training/ta-1/1-bukti.pdf");
  });

  it("toggleTrainingActivityActive → update isActive dibalik, tak pernah delete", async () => {
    db.trainingActivity.findFirst.mockResolvedValue({ isActive: true });
    await actions.toggleTrainingActivityActive("ta-1");
    expect(db.trainingActivity.update.mock.calls[0][0]).toEqual({ where: { id: "ta-1" }, data: { isActive: false, modifiedBy: "user-1" } });
    expect(db.trainingActivity.delete).not.toHaveBeenCalled();
    expect(db.trainingActivity.deleteMany).not.toHaveBeenCalled();
  });

  it("removeParticipant → update isActive:false + modifiedBy, bukan delete", async () => {
    await actions.removeParticipant("tp-1");
    expect(db.trainingParticipant.update.mock.calls[0][0]).toEqual({ where: { id: "tp-1" }, data: { isActive: false, modifiedBy: "user-1" } });
    expect(db.trainingParticipant.delete).not.toHaveBeenCalled();
    expect(db.trainingParticipant.deleteMany).not.toHaveBeenCalled();
  });

  it("updateParticipantScores: nilai > 100 ditolak; peserta nonaktif ditolak; sukses → modifiedBy", async () => {
    expect((await actions.updateParticipantScores("tp-1", { postTestScore: 150 })).success).toBe(false);
    expect(db.trainingParticipant.findFirst).not.toHaveBeenCalled();

    db.trainingParticipant.findFirst.mockResolvedValueOnce({ isActive: false });
    expect((await actions.updateParticipantScores("tp-1", { postTestScore: 80 })).success).toBe(false);
    expect(db.trainingParticipant.update).not.toHaveBeenCalled();

    await actions.updateParticipantScores("tp-1", { postTestScore: 80 });
    expect(db.trainingParticipant.update.mock.calls[0][0].data).toEqual({ preTestScore: null, postTestScore: 80, modifiedBy: "user-1" });
  });
});
