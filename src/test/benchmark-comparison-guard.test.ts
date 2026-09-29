import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard, scope, dan audit Komparasi Data Acuan (`benchmark-comparison.ts`,
 * #243) — tanpa DB. Menu key di-hardcode `data-analyst-benchmark-comparison`
 * (VIEW baca, EDIT simpan). Lembaga dibaca/ditulis hanya dalam scope (filter
 * lewat AND). Rumus agregasi (lib/benchmark-comparison) dimock — diuji di lib test.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await import("@/lib/access-scope")),
  getAccessContext,
}));

vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const lib = vi.hoisted(() => ({
  aggregateMisMetrics: vi.fn(() => new Map()),
  buildComparisonView: vi.fn(() => ({ sections: ["x"], groupsWithDiff: 0, totalGroups: 1 })),
  TRAINING_METRIC_BY_PACKAGE: { P1: "trainingP1" },
}));
vi.mock("@/lib/benchmark-comparison", () => lib);

const db = vi.hoisted(() => ({
  farmerGroup: { findMany: vi.fn(), findFirst: vi.fn() },
  farmer: { findMany: vi.fn() },
  landParcel: { findMany: vi.fn() },
  trainingParticipant: { findMany: vi.fn() },
  productionRecord: { findMany: vi.fn() },
  referenceBenchmark: { findMany: vi.fn(), upsert: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/benchmark-comparison");

const input = (o: Record<string, unknown> = {}) => ({
  farmerGroupId: "kt-1", farmerCount: 10, parcelCount: 12, areaHa: 20.5, trainingP1: 5,
  trainingP2Mk: null, trainingP2K3: null, trainingP34: null, productionFarmerCount: 3, notes: null, ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.farmerGroup.findMany.mockResolvedValue([{ id: "kt-1", code: "C", abrv: "A", name: "N", district: { id: "1401", name: "Siak" } }]);
  db.farmerGroup.findFirst.mockResolvedValue({ id: "kt-1" });
  for (const m of [db.farmer, db.landParcel, db.trainingParticipant, db.productionRecord, db.referenceBenchmark]) m.findMany.mockResolvedValue([]);
});

describe("guard", () => {
  it("getBenchmarkComparisonView → VIEW; upsertReferenceBenchmark → EDIT", async () => {
    await actions.getBenchmarkComparisonView();
    expect(hasPermission).toHaveBeenLastCalledWith("data-analyst-benchmark-comparison", "VIEW");
    await actions.upsertReferenceBenchmark(input());
    expect(hasPermission).toHaveBeenLastCalledWith("data-analyst-benchmark-comparison", "EDIT");
    expect(hasPermission).toHaveBeenCalledTimes(2);
  });

  it("izin ditolak → baca melempar, simpan { success:false }, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getBenchmarkComparisonView()).rejects.toThrow(/izin/);
    expect((await actions.upsertReferenceBenchmark(input())).success).toBe(false);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
    expect(db.referenceBenchmark.upsert).not.toHaveBeenCalled();
  });
});

describe("getBenchmarkComparisonView — scope", () => {
  it("Lembaga ber-scope lewat AND; seluruh entitas turunan dibatasi Lembaga tsb + aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    const res = await actions.getBenchmarkComparisonView();
    expect(res.totalGroups).toBe(1);
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toEqual({ isActive: true, AND: { id: { in: ["kt-1"] } } });
    const scope = { farmerGroupId: { in: ["kt-1"] } };
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ isActive: true, ...scope });
    expect(db.landParcel.findMany.mock.calls[0][0].where).toEqual({ isActive: true, farmer: { isActive: true, ...scope } });
    expect(db.trainingParticipant.findMany.mock.calls[0][0].where).toMatchObject({ isActive: true, farmer: { isActive: true, ...scope }, activity: { isActive: true, ...scope } });
    expect(db.productionRecord.findMany.mock.calls[0][0].where).toEqual({ isActive: true, farmer: { isActive: true, ...scope } });
    expect(db.referenceBenchmark.findMany.mock.calls[0][0].where).toEqual({ isActive: true, ...scope });
  });

  it("tak ada Lembaga dalam scope → view kosong, tanpa query turunan", async () => {
    db.farmerGroup.findMany.mockResolvedValue([]);
    expect(await actions.getBenchmarkComparisonView()).toEqual({ sections: [], groupsWithDiff: 0, totalGroups: 0 });
    expect(db.farmer.findMany).not.toHaveBeenCalled();
  });
});

describe("upsertReferenceBenchmark", () => {
  it("input tak valid → gagal tanpa query", async () => {
    const res = await actions.upsertReferenceBenchmark(input({ farmerCount: -1 }));
    expect(res.success).toBe(false);
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
  });

  it("Lembaga di luar scope → ditolak, tak ada upsert", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    db.farmerGroup.findFirst.mockResolvedValue(null);
    const res = await actions.upsertReferenceBenchmark(input());
    expect(res.success).toBe(false);
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toEqual({ id: "kt-1", isActive: true, AND: { districtId: { in: ["1401"] } } });
    expect(db.referenceBenchmark.upsert).not.toHaveBeenCalled();
  });

  it("valid → upsert per Lembaga; create=createdBy, update=modifiedBy + reaktivasi; revalidate", async () => {
    const res = await actions.upsertReferenceBenchmark(input());
    expect(res.success).toBe(true);
    const args = db.referenceBenchmark.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ farmerGroupId: "kt-1" });
    expect(args.create).toMatchObject({ farmerGroupId: "kt-1", farmerCount: 10, createdBy: "user-1" });
    expect(args.update).toMatchObject({ farmerCount: 10, isActive: true, modifiedBy: "user-1" });
    expect(args.update).not.toHaveProperty("farmerGroupId");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/data-analyst/benchmark-comparison");
  });
});
