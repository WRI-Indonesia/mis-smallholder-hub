import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard 3 lapis & semantik action Dashboard Monev BMP (#344/#346) — tanpa DB:
 * izin `dashboard-bmp-monev` VIEW wajib sebelum kueri; scope `farmerGroupAccessFilter`
 * (view) / `AND` di relasi farmer (petani prioritas); satu penilaian → activityScores
 * dihitung dengan skor Lembaga tahun yang sama; petani prioritas/teladan diurut
 * naik/turun, `take` dibatasi 50, dan kegiatan terlemah/terkuat menghitung skor
 * Lembaga (review #347: tanpa itu Training selalu "terlemah").
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerGroupAccessFilter: (access: { mode: string; ids: string[] }) => (access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } : {}),
}));

const IND = [
  { id: "i1", code: "1.1.1.1", activityCode: "1.1", activityName: "Training", activityWeight: 0.1, criteriaCode: "1.1.1", criteriaName: "", seq: 1, level: "INDIVIDU", name: "Pelatihan", weight: 0.3, inFinalScore: true, scoreLabel0: null, scoreLabel1: null, scoreLabel2: null, scoreLabel3: null, sortOrder: 1 },
  { id: "l1", code: "1.1.1.2", activityCode: "1.1", activityName: "Training", activityWeight: 0.1, criteriaCode: "1.1.1", criteriaName: "", seq: 2, level: "LEMBAGA", name: "Standar teknis", weight: 0.7, inFinalScore: true, scoreLabel0: null, scoreLabel1: null, scoreLabel2: null, scoreLabel3: null, sortOrder: 2 },
  { id: "i2", code: "1.2.3.1", activityCode: "1.2", activityName: "Pemupukan", activityWeight: 0.35, criteriaCode: "1.2.3", criteriaName: "", seq: 1, level: "INDIVIDU", name: "5 T", weight: 1, inFinalScore: true, scoreLabel0: null, scoreLabel1: null, scoreLabel2: null, scoreLabel3: null, sortOrder: 3 },
];

const db = vi.hoisted(() => ({
  farmerGroup: { findMany: vi.fn() },
  bmpIndicator: { findMany: vi.fn() },
  bmpAssessment: { findMany: vi.fn() },
  bmpGroupAssessment: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getBmpMonevDashboardView, getBmpMonevPriorityFarmers } = await import("@/server/actions/dashboard-bmp-monev");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  db.bmpIndicator.findMany.mockResolvedValue(IND);
  db.farmerGroup.findMany.mockResolvedValue([]);
  db.bmpAssessment.findMany.mockResolvedValue([]);
  db.bmpGroupAssessment.findMany.mockResolvedValue([]);
});

describe("guard menu dashboard-bmp-monev", () => {
  it("VIEW ditolak → kedua action melempar tanpa menyentuh DB", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getBmpMonevDashboardView()).rejects.toThrow(/izin/);
    await expect(getBmpMonevPriorityFarmers({ districtId: null, groupId: null, year: 2026 })).rejects.toThrow(/izin/);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    expect(db.bmpAssessment.findMany).not.toHaveBeenCalled();
  });

  it("scope BY_FARMER_GROUP: view memfilter Lembaga; prioritas memasang filter lewat AND di relasi farmerGroup + tahun wajib bilangan bulat", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-1"] });
    await getBmpMonevDashboardView();
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toMatchObject({ isActive: true, id: { in: ["g-1"] } });

    await getBmpMonevPriorityFarmers({ districtId: "d-1", groupId: "g-1", year: 2026 });
    const where = db.bmpAssessment.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ isActive: true, surveyYear: 2026, farmer: { isActive: true, farmerGroupId: "g-1", farmerGroup: { isActive: true, districtId: "d-1", AND: [{ id: { in: ["g-1"] } }] } } });

    await expect(getBmpMonevPriorityFarmers({ districtId: null, groupId: null, year: 2026.5 })).rejects.toThrow(/Tahun/);
  });
});

describe("getBmpMonevDashboardView — activityScores memakai skor Lembaga tahun yang sama", () => {
  it("petani ber-rincian: skor kegiatan Training = 0,3×3 + 0,7×(Lembaga 2) = 2,3; tanpa rincian → null; statistik indikator individu dihitung", async () => {
    db.farmerGroup.findMany.mockResolvedValue([
      {
        id: "g-1", name: "G", code: "G", districtId: "d-1", district: { name: "D" }, _count: { farmers: 10 },
        farmers: [
          { id: "f-1", bmpAssessments: [{ id: "a-1", surveyYear: 2026, score: 2, details: [{ indicatorId: "i1", score: 3 }, { indicatorId: "i2", score: null }] }] },
          { id: "f-2", bmpAssessments: [{ id: "a-2", surveyYear: 2026, score: 1.5, details: [] }] },
        ],
        bmpGroupAssessments: [{ surveyYear: 2026, details: [{ indicatorId: "l1", score: 2 }] }],
      },
    ]);
    const view = await getBmpMonevDashboardView();
    const g = view.data.groups[0];
    expect(g.totalFarmers).toBe(10);
    expect(g.assessments.find((a) => a.farmerId === "f-1")?.activityScores).toEqual([2.3, 0]);
    expect(g.assessments.find((a) => a.farmerId === "f-2")?.activityScores).toBeNull();
    expect(g.groupProfiles).toEqual([{ surveyYear: 2026, scores: { l1: 2 } }]);
    expect(view.data.activities.map((a) => a.code)).toEqual(["1.1", "1.2"]);
    expect(view.data.indicators.map((i) => i.criteriaCode)).toEqual(["1.1.1", "1.1.1", "1.2.3"]);
    expect(view.data.indicatorStats).toEqual(expect.arrayContaining([
      expect.objectContaining({ groupId: "g-1", surveyYear: 2026, indicatorId: "i1", sum: 3, n: 1, nullCount: 0 }),
      expect.objectContaining({ indicatorId: "i2", sum: 0, n: 0, nullCount: 1 }),
    ]));
  });
});

describe("getBmpMonevPriorityFarmers", () => {
  const row = (id: string, score: number, details: { indicatorId: string; score: number | null }[]) => ({
    id, farmerId: `f-${id}`, score,
    farmer: { name: `Petani ${id}`, farmerId: `X.${id}`, farmerGroupId: "g-1", farmerGroup: { name: "G" } },
    details,
  });

  it("order lowest = asc, highest = desc; take dibatasi 1–50", async () => {
    await getBmpMonevPriorityFarmers({ districtId: null, groupId: null, year: 2026 }, 999, "highest");
    const args = db.bmpAssessment.findMany.mock.calls[0][0];
    expect(args.orderBy[0]).toEqual({ score: "desc" });
    expect(args.take).toBe(50);
    await getBmpMonevPriorityFarmers({ districtId: null, groupId: null, year: 2026 }, 0);
    expect(db.bmpAssessment.findMany.mock.calls[1][0].take).toBe(1);
    expect(db.bmpAssessment.findMany.mock.calls[1][0].orderBy[0]).toEqual({ score: "asc" });
  });

  it("kegiatan terlemah/terkuat dihitung DENGAN skor Lembaga: Training (individu 3 + Lembaga 3 = 3,0) jadi terkuat, Pemupukan 1 jadi terlemah; tanpa rincian → null", async () => {
    db.bmpAssessment.findMany.mockResolvedValue([row("1", 1.2, [{ indicatorId: "i1", score: 3 }, { indicatorId: "i2", score: 1 }]), row("2", 1.0, [])]);
    db.bmpGroupAssessment.findMany.mockResolvedValue([{ farmerGroupId: "g-1", details: [{ indicatorId: "l1", score: 3 }] }]);
    const out = await getBmpMonevPriorityFarmers({ districtId: null, groupId: null, year: 2026 });
    expect(db.bmpGroupAssessment.findMany.mock.calls[0][0].where).toMatchObject({ farmerGroupId: { in: ["g-1"] }, surveyYear: 2026, isActive: true });
    expect(out[0]).toMatchObject({ assessmentId: "1", farmerName: "Petani 1", weakestActivity: "Pemupukan", strongestActivity: "Training" });
    expect(out[1]).toMatchObject({ assessmentId: "2", weakestActivity: null, strongestActivity: null });
  });

  it("tanpa penilaian Lembaga: skor Lembaga dihitung 0 (Training 0,9) — konsisten dengan dashboard, bukan dilewati", async () => {
    db.bmpAssessment.findMany.mockResolvedValue([row("1", 1.2, [{ indicatorId: "i1", score: 3 }, { indicatorId: "i2", score: 1 }])]);
    const out = await getBmpMonevPriorityFarmers({ districtId: null, groupId: null, year: 2026 });
    expect(out[0].weakestActivity).toBe("Training"); // 0,9 < 1,0
  });
});
