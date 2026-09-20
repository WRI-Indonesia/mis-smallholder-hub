import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard 3 lapis & semantik tulis rincian Monev BMP (#346) — tanpa DB. Aturan:
 * rincian individu hanya untuk indikator level INDIVIDU; penilaian Lembaga
 * hanya indikator LEMBAGA, satu aktif per Lembaga-tahun (P2002 ditangkap);
 * import form: petani harus anggota Lembaga & dalam scope, tak dipakai dua
 * form, skor akhir = HITUNG ULANG dari rincian (total form hanya bila tanpa
 * rincian; keputusan owner 2026-09-20), tanggal hanya ditimpa bila ada,
 * penilaian Lembaga dari berkas pertama (atau yang tersimpan di DB) dengan
 * peringatan bila berkas lain berbeda; rincian ditulis massal (ON CONFLICT).
 */
const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn(async () => false));
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerAccessFilter: (access: { mode: string; ids: string[] }) => (access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } : {}),
  farmerGroupAccessFilter: (access: { mode: string; ids: string[] }) => (access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } : {}),
  farmerRelationAccessFilter: (access: { mode: string; ids: string[] }) => (access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } : {}),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const IND = [
  { id: "i1", code: "1.1.1.1", activityCode: "1.1", activityName: "Training", activityWeight: 0.1, criteriaCode: "1.1.1", criteriaName: "", seq: 1, level: "INDIVIDU", name: "Pelatihan", weight: 0.3, inFinalScore: true, scoreLabel0: null, scoreLabel1: null, scoreLabel2: null, scoreLabel3: null, sortOrder: 1 },
  { id: "l1", code: "1.1.1.2", activityCode: "1.1", activityName: "Training", activityWeight: 0.1, criteriaCode: "1.1.1", criteriaName: "", seq: 2, level: "LEMBAGA", name: "Standar teknis", weight: 0.7, inFinalScore: true, scoreLabel0: null, scoreLabel1: null, scoreLabel2: null, scoreLabel3: null, sortOrder: 2 },
];

const db = vi.hoisted(() => ({
  farmer: { findMany: vi.fn() },
  farmerGroup: { findFirst: vi.fn() },
  bmpIndicator: { findMany: vi.fn(), findUnique: vi.fn() },
  bmpAssessment: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  bmpAssessmentDetail: { upsert: vi.fn() },
  bmpGroupAssessment: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  bmpGroupAssessmentDetail: { upsert: vi.fn() },
  $transaction: vi.fn(),
  $executeRaw: vi.fn(async () => 1),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getBmpAssessmentDetailView, saveBmpAssessmentDetails, upsertBmpGroupAssessment, importBmpSurveyForms } = await import("@/server/actions/bmp-assessment-detail");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  db.bmpIndicator.findMany.mockImplementation(async (args: { where?: { level?: string } }) => IND.filter((i) => !args?.where?.level || i.level === args.where.level));
  db.farmerGroup.findFirst.mockResolvedValue({ id: "g-1" });
  db.farmer.findMany.mockResolvedValue([{ id: "f-1" }, { id: "f-2" }]);
  db.bmpAssessment.findFirst.mockResolvedValue({ id: "a-1", surveyYear: 2026, farmer: { farmerGroupId: "g-1" } });
  db.bmpAssessment.findMany.mockResolvedValue([]);
  db.bmpAssessment.create.mockResolvedValue({ id: "a-new" });
  db.bmpAssessment.update.mockResolvedValue({ id: "a-1" });
  db.bmpAssessmentDetail.upsert.mockResolvedValue({});
  db.bmpGroupAssessment.findFirst.mockResolvedValue(null);
  db.bmpGroupAssessment.create.mockResolvedValue({ id: "ga-1" });
  db.bmpGroupAssessment.update.mockResolvedValue({ id: "ga-1" });
  db.bmpGroupAssessmentDetail.upsert.mockResolvedValue({});
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db));
});

describe("guard menu master-data-bmp-monev", () => {
  it("VIEW untuk baca, EDIT untuk simpan rincian/penilaian Lembaga, CREATE untuk import — ditolak tanpa sentuh DB", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getBmpAssessmentDetailView("a-1")).rejects.toThrow(/izin/);
    expect((await saveBmpAssessmentDetails({ assessmentId: "a-1", rows: [{ indicatorId: "i1", score: 2 }] })).success).toBe(false);
    expect(hasPermission).toHaveBeenLastCalledWith("master-data-bmp-monev", "EDIT");
    expect((await upsertBmpGroupAssessment({ farmerGroupId: "g-1", surveyYear: 2026, rows: [] })).success).toBe(false);
    expect((await importBmpSurveyForms({ farmerGroupId: "g-1", forms: [{ fileName: "x", farmerId: "f-1", surveyYear: 2026, score: 2, individu: [], lembaga: [] }] })).success).toBe(false);
    expect(hasPermission).toHaveBeenLastCalledWith("master-data-bmp-monev", "CREATE");
    expect(db.bmpAssessment.findFirst).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("detail: penilaian di luar scope → null; scope via AND farmer relation", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-lain"] });
    db.bmpAssessment.findFirst.mockResolvedValue(null);
    expect(await getBmpAssessmentDetailView("a-1")).toBeNull();
    expect(db.bmpAssessment.findFirst.mock.calls[0][0].where).toMatchObject({ id: "a-1", AND: [{ farmer: { farmerGroupId: { in: ["g-lain"] } } }] });
  });
});

describe("saveBmpAssessmentDetails", () => {
  it("upsert per indikator individu dengan weightUsed dari master; indikator Lembaga ditolak; skor > 3 ditolak Zod", async () => {
    db.bmpAssessment.findFirst
      .mockResolvedValueOnce({ id: "a-1", surveyYear: 2026, farmer: { farmerGroupId: "g-1" } }) // guard
      .mockResolvedValueOnce({ id: "a-1", farmerId: "f-1", surveyYear: 2026, surveyDate: null, score: 1.5, assessor: null, notes: null, isActive: true, farmer: { farmerId: "X.1", name: "A", farmerGroupId: "g-1", farmerGroup: { name: "G" } }, parcel: null, details: [{ indicatorId: "i1", score: 2, weightUsed: 0.3, notes: null }] }); // view
    const res = await saveBmpAssessmentDetails({ assessmentId: "a-1", rows: [{ indicatorId: "i1", score: 2, notes: " ok " }] });
    expect(res.success).toBe(true);
    const call = db.bmpAssessmentDetail.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ assessmentId_indicatorId: { assessmentId: "a-1", indicatorId: "i1" } });
    expect(call.create).toMatchObject({ score: 2, weightUsed: 0.3, notes: "ok", createdBy: "user-1" });
    expect(call.update).toMatchObject({ score: 2, isActive: true, modifiedBy: "user-1" });
    // tanpa applyRecomputedScore → skor tersimpan tidak disentuh
    expect(db.bmpAssessment.update).not.toHaveBeenCalled();

    const bad = await saveBmpAssessmentDetails({ assessmentId: "a-1", rows: [{ indicatorId: "l1", score: 2 }] });
    expect(bad.success).toBe(false);
    expect((bad as { error: string }).error).toMatch(/level Lembaga/);

    db.bmpIndicator.findUnique.mockResolvedValueOnce({ code: "1.1.1.1" });
    const zod = await saveBmpAssessmentDetails({ assessmentId: "a-1", rows: [{ indicatorId: "i1", score: 4 }] });
    expect(zod.success).toBe(false);
    // Pesan validasi menyebut indikatornya, bukan "Skor maksimal 3" telanjang (temuan review).
    expect((zod as { error: string }).error).toBe("Skor maksimal 3 — indikator 1.1.1.1");
  });

  it("petani tanpa rincian individu (hanya skor rekap) → recomputed null walau Lembaga punya penilaian, sehingga tak ada peringatan '≠ skor' palsu", async () => {
    db.bmpAssessment.findFirst.mockResolvedValueOnce({ id: "a-1", farmerId: "f-1", surveyYear: 2026, surveyDate: null, score: 2.3, assessor: null, notes: null, isActive: true, farmer: { farmerId: "X.1", name: "A", farmerGroupId: "g-1", farmerGroup: { name: "G" } }, parcel: null, details: [] });
    db.bmpGroupAssessment.findFirst.mockResolvedValueOnce({ id: "ga-1", farmerGroupId: "g-1", surveyYear: 2026, surveyDate: null, assessor: null, notes: null, farmerGroup: { name: "G" }, details: [{ indicatorId: "l1", score: 2, weightUsed: 0.7, notes: null }] });
    const view = await getBmpAssessmentDetailView("a-1");
    expect(view?.recomputed).toBeNull();
    expect(view?.groupAssessment?.id).toBe("ga-1");
  });

  it("applyRecomputedScore → skor tersimpan ditimpa hasil hitung ulang dari state DB", async () => {
    db.bmpAssessment.findFirst
      .mockResolvedValueOnce({ id: "a-1", surveyYear: 2026, farmer: { farmerGroupId: "g-1" } })
      .mockResolvedValueOnce({ id: "a-1", farmerId: "f-1", surveyYear: 2026, surveyDate: null, score: 1.5, assessor: null, notes: null, isActive: true, farmer: { farmerId: "X.1", name: "A", farmerGroupId: "g-1", farmerGroup: { name: "G" } }, parcel: null, details: [{ indicatorId: "i1", score: 3, weightUsed: 0.3, notes: null }] });
    db.bmpGroupAssessment.findFirst.mockResolvedValue({ id: "ga-1", farmerGroupId: "g-1", surveyYear: 2026, surveyDate: null, assessor: null, notes: null, farmerGroup: { name: "G" }, details: [{ indicatorId: "l1", score: 2, weightUsed: 0.7, notes: null }] });
    const res = await saveBmpAssessmentDetails({ assessmentId: "a-1", rows: [{ indicatorId: "i1", score: 3 }], applyRecomputedScore: true });
    // Training: (3×0,3 + 2×0,7) × 0,1 = 0,23
    expect(res.success && res.data?.recomputedScore).toBe(0.23);
    expect(db.bmpAssessment.update.mock.calls[0][0]).toMatchObject({ where: { id: "a-1" }, data: { score: 0.23, modifiedBy: "user-1" } });
  });
});

describe("upsertBmpGroupAssessment", () => {
  it("Lembaga di luar scope → ditolak; indikator individu ditolak; buat baru bila belum ada, update bila ada; P2002 → pesan ramah", async () => {
    db.farmerGroup.findFirst.mockResolvedValueOnce(null);
    expect((await upsertBmpGroupAssessment({ farmerGroupId: "g-1", surveyYear: 2026, rows: [] })).success).toBe(false);

    expect((await upsertBmpGroupAssessment({ farmerGroupId: "g-1", surveyYear: 2026, rows: [{ indicatorId: "i1", score: 1 }] })).success).toBe(false);

    const created = await upsertBmpGroupAssessment({ farmerGroupId: "g-1", surveyYear: 2026, surveyDate: "2026-07-11", assessor: "Tim", rows: [{ indicatorId: "l1", score: 2 }] });
    expect(created.success && created.data?.id).toBe("ga-1");
    expect(db.bmpGroupAssessment.create.mock.calls[0][0].data).toMatchObject({ farmerGroupId: "g-1", surveyYear: 2026, assessor: "Tim", createdBy: "user-1" });
    expect(db.bmpGroupAssessmentDetail.upsert.mock.calls[0][0].create).toMatchObject({ groupAssessmentId: "ga-1", indicatorId: "l1", score: 2, weightUsed: 0.7 });

    // TAMBAH saat Lembaga-tahun sudah punya baris aktif → ditolak (tidak menimpa diam-diam)
    db.bmpGroupAssessment.findFirst.mockResolvedValueOnce({ id: "ga-1" });
    const dupAdd = await upsertBmpGroupAssessment({ farmerGroupId: "g-1", surveyYear: 2026, rows: [{ indicatorId: "l1", score: 3 }] });
    expect(dupAdd.success).toBe(false);
    expect((dupAdd as { error: string }).error).toMatch(/tombol Ubah/);
    expect(db.bmpGroupAssessment.update).not.toHaveBeenCalled();
    // UBAH dengan id baris yang sama → update
    db.bmpGroupAssessment.findFirst.mockResolvedValueOnce({ id: "ga-1" });
    await upsertBmpGroupAssessment({ id: "ga-1", farmerGroupId: "g-1", surveyYear: 2026, rows: [{ indicatorId: "l1", score: 3 }] });
    expect(db.bmpGroupAssessment.update).toHaveBeenCalledTimes(1);
    // UBAH tapi barisnya sudah nonaktif → ditolak
    db.bmpGroupAssessment.findFirst.mockResolvedValueOnce(null);
    const gone = await upsertBmpGroupAssessment({ id: "ga-9", farmerGroupId: "g-1", surveyYear: 2026, rows: [] });
    expect(gone.success).toBe(false);

    db.bmpGroupAssessment.create.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }));
    const race = await upsertBmpGroupAssessment({ farmerGroupId: "g-1", surveyYear: 2027, rows: [] });
    expect(race.success).toBe(false);
    expect((race as { error: string }).error).toMatch(/pengguna lain/);
  });
});

describe("importBmpSurveyForms", () => {
  const form = (fileName: string, farmerId: string, lembagaScore = 2) => ({
    fileName,
    farmerId,
    surveyYear: 2026,
    surveyDate: null,
    score: 1.83,
    individu: [{ indicatorId: "i1", score: 2, notes: null }],
    lembaga: [{ indicatorId: "l1", score: lembagaScore, notes: null }],
  });

  it("petani bukan anggota/di luar scope ditolak per form; petani dipakai dua form ditolak; sisanya disimpan dalam satu transaksi", async () => {
    const res = await importBmpSurveyForms({ farmerGroupId: "g-1", forms: [form("a.xlsx", "f-1"), form("b.xlsx", "f-1"), form("c.xlsx", "f-9"), form("d.xlsx", "f-2")] });
    expect(res.success).toBe(true);
    expect(res.success && res.data?.rejected.map((r) => r.fileName)).toEqual(["b.xlsx", "c.xlsx"]);
    expect(res.success && res.data).toMatchObject({ assessmentsCreated: 2, assessmentsUpdated: 0, detailRows: 2, groupAssessmentId: "ga-1" });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    // Skor akhir = hitung ulang (0,1 × (2×0,3 + 2×0,7) = 0,2), BUKAN total form 1,83 (keputusan owner 2026-09-20: maks harus 3, rumus form menjumlahkan kriteria alternatif).
    expect(db.bmpAssessment.create.mock.calls[0][0].data).toMatchObject({ farmerId: "f-1", surveyYear: 2026, score: 0.2, createdBy: "user-1" });
    // Penilaian Lembaga: sekali per tahun dari berkas pertama; rincian ditulis massal —
    // satu $executeRaw per induk (1 set Lembaga + 2 penilaian), bukan per indikator.
    expect(db.bmpGroupAssessment.create).toHaveBeenCalledTimes(1);
    expect(db.$executeRaw).toHaveBeenCalledTimes(3);
  });

  it("penilaian petani yang sudah ada diperbarui (skor = hitung ulang dengan set Lembaga berkas pertama; tanggal hanya bila ada); skor Lembaga berbeda antar berkas → peringatan, berkas pertama dipakai", async () => {
    db.bmpAssessment.findMany.mockResolvedValue([{ id: "a-1", farmerId: "f-1", surveyYear: 2026 }]);
    const res = await importBmpSurveyForms({ farmerGroupId: "g-1", assessor: "Tim", forms: [form("a.xlsx", "f-1", 2), form("d.xlsx", "f-2", 3)] });
    expect(res.success && res.data).toMatchObject({ assessmentsCreated: 1, assessmentsUpdated: 1 });
    const upd = db.bmpAssessment.update.mock.calls[0][0].data;
    expect(upd).toMatchObject({ score: 0.2, assessor: "Tim", modifiedBy: "user-1" });
    // d.xlsx memuat Lembaga 3, tapi yang tersimpan (dan dipakai menghitung skornya) set berkas pertama (2) → tetap 0,2, bukan 0,27
    expect(db.bmpAssessment.create.mock.calls[0][0].data).toMatchObject({ farmerId: "f-2", score: 0.2 });
    expect("surveyDate" in upd).toBe(false);
    expect(res.success && res.data?.warnings[0]).toMatch(/berbeda dari "a.xlsx"/);
    // Set Lembaga yang ditulis = berkas pertama (skor 2), dipakai pula untuk hitung ulang f-2 (0,2 bukan 0,27)
    expect(db.bmpAssessment.create.mock.calls[0][0].data).toMatchObject({ farmerId: "f-2", score: 0.2 });
  });

  it("berkas tanpa rincian sama sekali: skor akhir = total form (tak ada yang bisa dihitung ulang)", async () => {
    const res = await importBmpSurveyForms({ farmerGroupId: "g-1", forms: [{ ...form("a.xlsx", "f-1"), individu: [], lembaga: [] }] });
    expect(res.success).toBe(true);
    expect(db.bmpAssessment.create.mock.calls[0][0].data).toMatchObject({ farmerId: "f-1", score: 1.83 });
  });

  it("level indikator tertukar (Lembaga di `individu` / individu di `lembaga`) → form ditolak, bukan ditulis ke tabel yang salah", async () => {
    const res = await importBmpSurveyForms({
      farmerGroupId: "g-1",
      forms: [
        { ...form("a.xlsx", "f-1"), individu: [{ indicatorId: "l1", score: 2, notes: null }], lembaga: [] },
        { ...form("b.xlsx", "f-2"), individu: [], lembaga: [{ indicatorId: "i1", score: 2, notes: null }] },
      ],
    });
    expect(res.success && res.data?.rejected.map((r) => r.reason)).toEqual(["Level indikator tidak sesuai (individu ↔ Lembaga tertukar)", "Level indikator tidak sesuai (individu ↔ Lembaga tertukar)"]);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("filter akses petani dipasang lewat AND — mode BY_FARMER_GROUP tidak menimpa syarat anggota Lembaga terpilih", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-1", "g-2"] });
    await importBmpSurveyForms({ farmerGroupId: "g-1", forms: [form("a.xlsx", "f-1")] });
    const where = db.farmer.findMany.mock.calls[0][0].where;
    expect(where.farmerGroupId).toBe("g-1");
    expect(where.AND).toEqual([{ farmerGroupId: { in: ["g-1", "g-2"] } }]);
  });

  it("skor akhir hasil hitung ulang boleh > 3 (skor 4 di luar rubrik) sampai 4 — tidak menggagalkan batch", async () => {
    const res = await importBmpSurveyForms({ farmerGroupId: "g-1", forms: [{ ...form("a.xlsx", "f-1"), score: 3.4, individu: [], lembaga: [] }] });
    expect(res.success).toBe(true);
    expect(db.bmpAssessment.create.mock.calls[0][0].data.score).toBe(3.4);
    expect((await importBmpSurveyForms({ farmerGroupId: "g-1", forms: [{ ...form("a.xlsx", "f-1"), score: 4.5 }] })).success).toBe(false);
  });

  it("batch tanpa sheet Lembaga: hitung ulang memakai penilaian Lembaga yang SUDAH tersimpan (bukan 0); tanpa keduanya → peringatan", async () => {
    db.bmpGroupAssessment.findFirst.mockResolvedValueOnce({ details: [{ indicatorId: "l1", score: 3 }] });
    const res = await importBmpSurveyForms({ farmerGroupId: "g-1", forms: [{ ...form("a.xlsx", "f-1"), lembaga: [] }] });
    // 0,1 × (2×0,3 + 3×0,7) = 0,27 — skor Lembaga dari DB ikut dihitung
    expect(db.bmpAssessment.create.mock.calls[0][0].data.score).toBe(0.27);
    expect(res.success && res.data?.warnings).toEqual([]);
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db));
    db.bmpGroupAssessment.findFirst.mockResolvedValueOnce(null);
    const res2 = await importBmpSurveyForms({ farmerGroupId: "g-1", forms: [{ ...form("b.xlsx", "f-2"), lembaga: [] }] });
    expect(res2.success && res2.data?.warnings[0]).toMatch(/belum ada penilaian Lembaga tersimpan/);
  });

  it("nama berkas kembar untuk dua petani berbeda: skor tiap penilaian mengikuti form-nya sendiri (kunci = objek form, bukan nama berkas)", async () => {
    const res = await importBmpSurveyForms({
      farmerGroupId: "g-1",
      forms: [
        { ...form("Suparman.xlsx", "f-1"), individu: [{ indicatorId: "i1", score: 3, notes: null }] },
        { ...form("Suparman.xlsx", "f-2"), individu: [{ indicatorId: "i1", score: 1, notes: null }] },
      ],
    });
    expect(res.success && res.data?.assessmentsCreated).toBe(2);
    const scores = db.bmpAssessment.create.mock.calls.map((c) => [c[0].data.farmerId, c[0].data.score]);
    expect(scores).toEqual([["f-1", 0.23], ["f-2", 0.17]]); // 0,1×(3×0,3+2×0,7) · 0,1×(1×0,3+2×0,7)
  });

  it("skor indikator 4 diterima lewat import (bukan form manual); transaksi gagal → tak ada klaim tersimpan", async () => {
    const ok = await importBmpSurveyForms({ farmerGroupId: "g-1", forms: [{ ...form("a.xlsx", "f-1"), individu: [{ indicatorId: "i1", score: 4, notes: null }] }] });
    expect(ok.success).toBe(true);
    expect(db.$executeRaw).toHaveBeenCalled(); // rincian (termasuk skor 4) ditulis massal apa adanya

    db.$transaction.mockRejectedValueOnce(new Error("boom"));
    const bad = await importBmpSurveyForms({ farmerGroupId: "g-1", forms: [form("a.xlsx", "f-1")] });
    expect(bad.success).toBe(false);
    expect((bad as { error: string }).error).toMatch(/tidak ada yang tersimpan/);
  });
});
