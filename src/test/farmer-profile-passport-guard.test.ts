import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Action `getFarmerProfilePassport` (#343) — tanpa DB, pola mock
 * `master-data-nkt-count-guard.test.ts`. Menguji action ASLI: guard PRINT
 * menu Petani, scope petani (lampiran mengikuti petani — lahan tak punya scope
 * sendiri), Bagian A dari `buildFarmerDetail`, pohon/patok via groupBy,
 * lampiran hanya lahan ber-geometri dengan `{ access, training }` dihitung
 * sekali + chunk 5 paralel, dan `includeParcels:false` yang tidak menyentuh
 * kueri lahan berat.
 */
const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerGroupAccessFilter: () => ({}),
  // Cermin `farmerAccessFilter` asli untuk BY_FARMER_GROUP — supaya `where` yang dikirim ke DB bisa diperiksa.
  farmerAccessFilter: (access: { mode: string; ids: string[] }) =>
    access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } : {},
  farmerRelationAccessFilter: () => ({}),
  getAccessibleDistrictIds: async () => null,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/land-marker-query", () => ({ fetchFarmerGroupMarkerPoints: vi.fn(), fetchFarmerMarkerPoints: vi.fn() }));

const passportQuery = vi.hoisted(() => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));
vi.mock("@/lib/parcel-passport-query", () => passportQuery);
const getBmpAssessmentDetailView = vi.hoisted(() => vi.fn());
vi.mock("@/server/actions/bmp-assessment-detail", () => ({ getBmpAssessmentDetailView }));

const db = vi.hoisted(() => ({
  farmer: { findFirst: vi.fn(), findMany: vi.fn() },
  trainingPackage: { findMany: vi.fn() },
  tree: { groupBy: vi.fn() },
  landParcelMarker: { groupBy: vi.fn() },
  landParcel: { groupBy: vi.fn() },
  bmpAssessment: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getFarmerProfilePassport } = await import("@/server/actions/farmer");

const D = 0.0009;
const square = (i: number) => ({
  type: "Polygon",
  coordinates: [[[101.5 + i * D, 0.75], [101.5 + (i + 1) * D, 0.75], [101.5 + (i + 1) * D, 0.75 + D], [101.5 + i * D, 0.75 + D], [101.5 + i * D, 0.75]]],
});
const parcelRow = (i: number, geometry: unknown = square(i)) => ({
  id: `lp-${i}`, parcelUid: `uid-${i}`, parcelId: `HJP.0001.${i}`, area: 2, subGroupLv2: "KT A", blok: null, plantingYear: 2016,
  cropType: null, landStatus: null, revision: 1, isPsr: false, geometry,
  identity: { documents: [], stdbLinks: [], nkt: i === 2 ? { status: "AFFECTED" } : null },
});
const farmerRow = (parcels: ReturnType<typeof parcelRow>[]) => ({
  id: "f-1", name: "Abdul", farmerId: "HJP.0001", gender: "M", nik: "1408011501800001", address: null, birthPlace: null, birthDate: null,
  joinedYear: 2020, isActive: true, createdAt: new Date("2025-01-01"), modifiedAt: new Date("2026-01-01"),
  farmerGroup: { name: "HJP", code: "ISH-1401-03", district: { name: "Kampar", province: { name: "Riau" } } },
  landParcels: parcels,
  trainingParticipants: [
    { id: "tp-1", preTestScore: 60, postTestScore: 80, activity: { trainingDate: new Date("2025-05-16"), location: "Balai", package: { code: "PAKET_1_BMP_PC_RSPO_NKT", name: "BMP" } } },
  ],
  productionRecords: [{ parcelId: "lp-1", period: "2025-01", yieldKg: 1000 }],
});
/** Lampiran tiruan — `fetchParcelPassport` menerima LandParcel.id (db); kode lahan diturunkan agar urutan bisa diperiksa. */
const passportOf = (id: string) => ({ parcel: { parcelId: `HJP.0001.${id.replace("lp-", "")}` } });

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  db.trainingPackage.findMany.mockResolvedValue([{ code: "PAKET_1_BMP_PC_RSPO_NKT", name: "BMP" }, { code: "PAKET_2_MK", name: "MK" }]);
  db.tree.groupBy.mockResolvedValue([]);
  db.landParcelMarker.groupBy.mockResolvedValue([]);
  db.bmpAssessment.findMany.mockResolvedValue([]);
  passportQuery.computeFarmerTrainingItems.mockResolvedValue([{ code: "PAKET_1_BMP_PC_RSPO_NKT", label: "Paket 1 - BMP", completed: true, date: null }]);
  passportQuery.fetchParcelPassport.mockImplementation(async (id: string) => ({ success: true, data: passportOf(id) }));
});

describe("guard & scope", () => {
  it("tanpa izin PRINT master-data-farmers → ditolak, DB tak disentuh", async () => {
    hasPermission.mockImplementation(async (_menu: string, level: string) => level !== "PRINT");
    const res = await getFarmerProfilePassport("f-1");
    expect(res).toEqual({ success: false, error: expect.stringMatching(/izin/) });
    expect(hasPermission).toHaveBeenCalledWith("master-data-farmers", "PRINT");
    expect(db.farmer.findFirst).not.toHaveBeenCalled();
    expect(passportQuery.fetchParcelPassport).not.toHaveBeenCalled();
  });

  it("BY_FARMER_GROUP: petani di luar scope → 'tidak ditemukan'; where memuat filter lembaga + isActive (non-SUPERADMIN)", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    db.farmer.findFirst.mockResolvedValue(null);
    const res = await getFarmerProfilePassport("f-lain");
    expect(res).toEqual({ success: false, error: expect.stringMatching(/tidak ditemukan/) });
    const where = db.farmer.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: "f-lain", farmerGroupId: { in: ["kt-1"] }, isActive: true });
    expect(passportQuery.fetchParcelPassport).not.toHaveBeenCalled();
  });

  it("SUPERADMIN: petani nonaktif boleh dicetak (tanpa filter isActive) — sama dengan siapa yang bisa membuka detailnya", async () => {
    isSuperAdmin.mockResolvedValue(true);
    db.farmer.findFirst.mockResolvedValue({ ...farmerRow([]), isActive: false });
    const res = await getFarmerProfilePassport("f-1");
    expect(res.success).toBe(true);
    expect(db.farmer.findFirst.mock.calls[0][0].where).not.toHaveProperty("isActive");
    if (res.success) expect(res.data!.farmer.isActive).toBe(false);
  });

  it("SUPERADMIN + petani nonaktif BER-LAHAN: lampiran diminta dengan includeInactiveFarmer (review #343 — semula semua lampiran 'tidak ditemukan' → aksi gagal)", async () => {
    isSuperAdmin.mockResolvedValue(true);
    db.farmer.findFirst.mockResolvedValue({ ...farmerRow([parcelRow(1), parcelRow(2)]), isActive: false });
    const res = await getFarmerProfilePassport("f-1");
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data!.parcelPassports).toHaveLength(2);
    for (const call of passportQuery.fetchParcelPassport.mock.calls) expect(call[2]).toMatchObject({ includeInactiveFarmer: true });
  });

  it("petani AKTIF (SUPERADMIN atau bukan): lampiran TIDAK melonggarkan filter petani nonaktif", async () => {
    isSuperAdmin.mockResolvedValue(true);
    db.farmer.findFirst.mockResolvedValue(farmerRow([parcelRow(1)]));
    await getFarmerProfilePassport("f-1");
    expect(passportQuery.fetchParcelPassport.mock.calls[0][2]).toMatchObject({ includeInactiveFarmer: false });
  });
});

describe("Bagian A + lampiran", () => {
  it("3 lahan (1 tanpa geometri): tabel 3 baris, lampiran 2 (urut parcelId), pohon/patok dari groupBy, akses & pelatihan dihitung sekali lalu dioper", async () => {
    db.farmer.findFirst.mockResolvedValue(farmerRow([parcelRow(1), parcelRow(2, null), parcelRow(3)]));
    db.tree.groupBy.mockResolvedValue([{ landParcelId: "lp-1", _count: { _all: 120 } }]);
    db.landParcelMarker.groupBy.mockResolvedValue([{ parcelUid: "uid-3", _count: { _all: 4 } }]);
    const res = await getFarmerProfilePassport("f-1");
    expect(res.success).toBe(true);
    if (!res.success) return;
    const d = res.data!;
    expect(d.parcels.map((p) => [p.parcelId, p.geometry != null, p.treeCount, p.markerCount])).toEqual([
      ["HJP.0001.1", true, 120, 0],
      ["HJP.0001.2", false, 0, 0],
      ["HJP.0001.3", true, 0, 4],
    ]);
    expect(d.parcels[1].centroid).toBeNull();
    expect(d.parcels[1].nktStatus).toBe("AFFECTED");
    // Hitungan via groupBy ber-`in`, bukan memuat titik pohon/patok.
    expect(db.tree.groupBy.mock.calls[0][0].where.landParcelId.in).toEqual(["lp-1", "lp-2", "lp-3"]);
    expect(db.landParcelMarker.groupBy.mock.calls[0][0].where.parcelUid.in).toEqual(["uid-1", "uid-2", "uid-3"]);
    // Lampiran hanya lahan ber-geometri, urutan tabel.
    expect(d.parcelPassports.map((p) => p.parcel.parcelId)).toEqual(["HJP.0001.1", "HJP.0001.3"]);
    expect(d.includeParcels).toBe(true);
    // Akses & checklist pelatihan SEKALI, dioper ke tiap fetch (bukan dihitung per lahan).
    expect(passportQuery.computeFarmerTrainingItems).toHaveBeenCalledTimes(1);
    expect(getAccessContext).toHaveBeenCalledTimes(1);
    for (const call of passportQuery.fetchParcelPassport.mock.calls) {
      expect(call[1]).toBe(true);
      expect(call[2]).toEqual({ access: { mode: "ALL", ids: [] }, training: expect.any(Array), includeInactiveFarmer: false });
    }
    // Bagian A = buildFarmerDetail: angka identik dengan Detail Petani.
    expect(d.summary.totalParcels).toBe(3);
    expect(d.summary.totalArea).toBe(6);
    expect(d.summary.productionTotalKg).toBe(1000);
    expect(d.summary.packagesDone).toBe(1);
    expect(d.summary.packagesTotal).toBe(2);
    expect(d.training.history[0]).toMatchObject({ packageCode: "PAKET_1_BMP_PC_RSPO_NKT", trainingDate: "2025-05-16T00:00:00.000Z", preTestScore: 60 });
    expect(d.production.all.perYear[0]).toMatchObject({ year: 2025, totalKg: 1000 });
    expect(d.production.parcelBreakdown).toHaveLength(1);
    expect(d.farmer.nik).toBe("1408011501800001");
    expect(d.group).toEqual({ name: "HJP", code: "ISH-1401-03", districtName: "Kampar", provinceName: "Riau" });
  });

  it("includeParcels:false (Ringkasan saja) → Bagian A lengkap, tanpa satu pun kueri lahan berat", async () => {
    db.farmer.findFirst.mockResolvedValue(farmerRow([parcelRow(1), parcelRow(2)]));
    const res = await getFarmerProfilePassport("f-1", { includeParcels: false });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data!.parcels).toHaveLength(2);
    expect(res.data!.parcelPassports).toEqual([]);
    expect(res.data!.includeParcels).toBe(false);
    expect(passportQuery.fetchParcelPassport).not.toHaveBeenCalled();
    expect(passportQuery.computeFarmerTrainingItems).not.toHaveBeenCalled();
  });

  it("petani tanpa lahan (7 % di prod) → sukses: parcels [], lampiran [], groupBy pohon/patok tidak dipanggil", async () => {
    db.farmer.findFirst.mockResolvedValue(farmerRow([]));
    const res = await getFarmerProfilePassport("f-1");
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data!.parcels).toEqual([]);
    expect(res.data!.parcelPassports).toEqual([]);
    expect(res.data!.summary.totalParcels).toBe(0);
    expect(db.tree.groupBy).not.toHaveBeenCalled();
    expect(db.landParcelMarker.groupBy).not.toHaveBeenCalled();
    expect(passportQuery.fetchParcelPassport).not.toHaveBeenCalled();
  });

  it("12 lahan → 12 lampiran, paralel maksimal 5 sekaligus (chunk), urutan tetap", async () => {
    db.farmer.findFirst.mockResolvedValue(farmerRow(Array.from({ length: 12 }, (_, i) => parcelRow(i + 1))));
    let inFlight = 0, peak = 0;
    passportQuery.fetchParcelPassport.mockImplementation(async (id: string) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight -= 1;
      return { success: true, data: passportOf(id) };
    });
    const res = await getFarmerProfilePassport("f-1");
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data!.parcelPassports).toHaveLength(12);
    expect(res.data!.parcelPassports.map((p) => p.parcel.parcelId)).toEqual(Array.from({ length: 12 }, (_, i) => `HJP.0001.${i + 1}`));
    expect(peak).toBe(5);
  });

  it("satu lampiran gagal (mis. geometri tak valid di sisi lahan) → seluruh action gagal dengan pesannya, bukan dokumen tanpa lampiran diam-diam", async () => {
    db.farmer.findFirst.mockResolvedValue(farmerRow([parcelRow(1), parcelRow(2)]));
    passportQuery.fetchParcelPassport.mockImplementation(async (id: string) =>
      id === "lp-2" ? { success: false, error: "Geometri lahan tidak valid" } : { success: true, data: passportOf(id) },
    );
    const res = await getFarmerProfilePassport("f-1");
    expect(res).toEqual({ success: false, error: "Geometri lahan tidak valid" });
  });

  it("geometri ada tapi centroid gagal dihitung (ring kosong) → diperlakukan belum dipetakan, tidak throw & tidak minta lampiran", async () => {
    db.farmer.findFirst.mockResolvedValue(farmerRow([parcelRow(1, { type: "Polygon", coordinates: [[]] })]));
    const res = await getFarmerProfilePassport("f-1");
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data!.parcels[0].geometry).toBeNull();
    expect(res.data!.parcels[0].centroid).toBeNull();
    expect(passportQuery.fetchParcelPassport).not.toHaveBeenCalled();
  });
});

describe("Monev BMP (owner 2026-09-22) — ikut izin VIEW menu Monev BMP, bukan izin Petani", () => {
  const indicator = (id: string, code: string, activityCode: string, level: "INDIVIDU" | "LEMBAGA", weight = 1) => ({
    id, code, activityCode, activityName: activityCode === "1.1" ? "Knowledge (Petani dan Pekerja)" : "Pemupukan", criteriaCode: `${activityCode}.1`, criteriaName: "-", seq: 1, level, name: code, weight, inFinalScore: true,
    scoreLabel0: null, scoreLabel1: null, scoreLabel2: null, scoreLabel3: null, sortOrder: 1,
  });
  const view = (id: string, year: number, score: number) => ({
    assessment: { id, farmerId: "f-1", farmerCode: "HJP.0001", farmerName: "Abdul", farmerGroupId: "kt-1", farmerGroupName: "HJP", surveyYear: year, surveyDate: new Date(Date.UTC(year, 6, 11)), score, parcelId: "HJP.0001.1", assessor: "Tim ICS", notes: null, isActive: true },
    indicators: [indicator("i1", "1.1.1", "1.1", "INDIVIDU"), indicator("i2", "1.2.1", "1.2", "INDIVIDU", 0.5), indicator("i3", "1.2.2", "1.2", "INDIVIDU", 0.5), indicator("g1", "1.2.3", "1.2", "LEMBAGA")],
    details: [{ indicatorId: "i1", score: 2, weightUsed: 1, notes: null }, { indicatorId: "i2", score: 3, weightUsed: 0.5, notes: null }, { indicatorId: "i3", score: null, weightUsed: 0.5, notes: null }],
    groupAssessment: { id: "g", farmerGroupId: "kt-1", farmerGroupName: "HJP", surveyYear: year, surveyDate: null, assessor: null, notes: null, details: [{ indicatorId: "g1", score: 1, weightUsed: 1, notes: null }] },
    recomputed: { total: score, activities: [{ activityCode: "1.1", activityName: "Knowledge (Petani dan Pekerja)", activityWeight: 0.5, indicatorScore: 2, contribution: 1, missingWeighted: 0 }, { activityCode: "1.2", activityName: "Pemupukan", activityWeight: 0.5, indicatorScore: 2.5, contribution: 1.25, missingWeighted: 1 }] },
    outOfRange: [],
  });

  it("tanpa VIEW master-data-bmp-monev → bmp null, tabel penilaian tak disentuh (PDF tetap terbit)", async () => {
    hasPermission.mockImplementation(async (menu: string) => menu !== "master-data-bmp-monev");
    db.farmer.findFirst.mockResolvedValue(farmerRow([]));
    const res = await getFarmerProfilePassport("f-1");
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data!.bmp).toBeNull();
    expect(db.bmpAssessment.findMany).not.toHaveBeenCalled();
    expect(getBmpAssessmentDetailView).not.toHaveBeenCalled();
  });

  it("dengan VIEW → penilaian aktif petani (terbaru dulu) lewat action detail yang sama dengan tab; skor kegiatan + terisi/total + max + indikator Lembaga", async () => {
    db.farmer.findFirst.mockResolvedValue(farmerRow([]));
    db.bmpAssessment.findMany.mockResolvedValue([{ id: "b-2026" }, { id: "b-2025" }]);
    getBmpAssessmentDetailView.mockImplementation(async (id: string) => (id === "b-2026" ? view(id, 2026, 2.53) : view(id, 2025, 1.2)));
    const res = await getFarmerProfilePassport("f-1");
    expect(res.success).toBe(true);
    if (!res.success) return;
    const where = db.bmpAssessment.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ farmerId: "f-1", isActive: true });
    const bmp = res.data!.bmp!;
    expect(bmp.assessments.map((a) => [a.surveyYear, a.score, a.surveyDate, a.parcelId, a.assessor])).toEqual([
      [2026, 2.53, "2026-07-11T00:00:00.000Z", "HJP.0001.1", "Tim ICS"],
      [2025, 1.2, "2025-07-11T00:00:00.000Z", "HJP.0001.1", "Tim ICS"],
    ]);
    const acts = bmp.assessments[0].activities;
    // 1.1: satu indikator bobot 1 → max 3, terisi 1/1; 1.2: dua indikator individu (0,5 + 0,5) + satu Lembaga (1) → max 6, terisi 1/2 individu.
    expect(acts.map((a) => [a.code, a.score, a.max, a.filled, a.total])).toEqual([["1.1", 2, 3, 1, 1], ["1.2", 2.5, 6, 1, 2]]);
    expect(bmp.assessments[0].groupFilled).toBe(1);
    expect(bmp.assessments[0].groupTotal).toBe(1);
  });

  it("penilaian tanpa rincian (recomputed null) → activities kosong, tetap tercantum", async () => {
    db.farmer.findFirst.mockResolvedValue(farmerRow([]));
    db.bmpAssessment.findMany.mockResolvedValue([{ id: "b-2024" }]);
    getBmpAssessmentDetailView.mockResolvedValue({ ...view("b-2024", 2024, 1.8), recomputed: null, details: [], groupAssessment: null });
    const res = await getFarmerProfilePassport("f-1");
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data!.bmp!.assessments[0]).toMatchObject({ surveyYear: 2024, activities: [], groupFilled: null, groupTotal: 1 });
  });
});

