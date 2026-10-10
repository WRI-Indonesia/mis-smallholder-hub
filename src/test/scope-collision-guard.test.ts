import { describe, it, expect, vi, beforeEach } from "vitest";
import { matches, type Row } from "./prisma-where";

/**
 * Regresi kelas BUG-007 / #127 (audit 2026-10-10): filter akses yang di-*spread*
 * ke `where` bersama key literal yang SAMA (`id`, `districtId`) — key belakangan
 * menimpa yang lebih dulu, sehingga scope hilang. Test ini SEMANTIK: Prisma
 * tiruan memfilter data contoh dengan penilai `where` mini (kesamaan, `in`, `AND`,
 * relasi bersarang), lalu memastikan permintaan di luar scope ditolak/kosong —
 * bukan sekadar mencocokkan bentuk `where` (test bentuk lolos walau scope bocor).
 *
 * Data contoh: G1 (milik user, D1) · G2 (Lembaga lain, D1) · G3 (Lembaga lain, D2).
 */
const GROUPS: Row[] = [
  { id: "G1", name: "Milik User", code: "C1", districtId: "D1", isActive: true },
  { id: "G2", name: "Lain Sedistrik", code: "C2", districtId: "D1", isActive: true },
  { id: "G3", name: "Lain Distrik", code: "C3", districtId: "D2", isActive: true },
];
const FARMERS: Row[] = GROUPS.map((g, i) => ({
  id: `F${i + 1}`, farmerId: `P${i + 1}`, name: `Petani ${i + 1}`, isActive: true, farmerGroupId: g.id, farmerGroup: g,
  _count: { landParcels: 0 },
}));

const BY_GROUP = { mode: "BY_FARMER_GROUP", ids: ["G1"] };
const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["D1"] };

const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/parcel-passport-query", () => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));

const db = vi.hoisted(() => ({
  farmerGroup: { findFirst: vi.fn(), findMany: vi.fn() },
  farmer: { findMany: vi.fn(), groupBy: vi.fn(), count: vi.fn() },
  landParcel: { findMany: vi.fn(), aggregate: vi.fn() },
  trainingActivity: { findMany: vi.fn() },
  trainingParticipant: { findMany: vi.fn() },
  productionRecord: { findMany: vi.fn() },
  district: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const report = await import("@/server/actions/report");
const map = await import("@/server/actions/map");
const analyst = await import("@/server/actions/data-analyst");
const { aggregateDashboardData } = await import("@/lib/dashboard-query");

const ids = (rows: Row[]) => rows.map((r) => r.id);

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  db.farmerGroup.findFirst.mockImplementation(async ({ where }: { where: unknown }) => GROUPS.find((g) => matches(g, where)) ?? null);
  db.farmerGroup.findMany.mockImplementation(async ({ where }: { where: unknown }) => GROUPS.filter((g) => matches(g, where)));
  db.farmer.findMany.mockImplementation(async ({ where }: { where: unknown }) => FARMERS.filter((f) => matches(f, where)));
  db.farmer.groupBy.mockResolvedValue([]);
  db.farmer.count.mockImplementation(async ({ where }: { where: unknown }) => FARMERS.filter((f) => matches(f, where)).length);
  db.landParcel.findMany.mockResolvedValue([]);
  db.landParcel.aggregate.mockResolvedValue({ _sum: { area: 0 } });
  db.trainingActivity.findMany.mockResolvedValue([]);
  db.trainingParticipant.findMany.mockResolvedValue([]);
  db.productionRecord.findMany.mockResolvedValue([]);
});

describe("Report — verifikasi Lembaga tak boleh tertimpa scope BY_FARMER_GROUP", () => {
  const DENIED = /tidak memiliki akses/;

  it("getFarmerReport: Lembaga lain di distrik yang sama ditolak, data petani tak dikueri", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await expect(report.getFarmerReport({ districtId: "D1", farmerGroupId: "G2" } as never)).rejects.toThrow(DENIED);
    expect(db.farmer.findMany).not.toHaveBeenCalled();
  });

  it("getFarmerReport: Lembaga milik user tetap lolos verifikasi", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await report.getFarmerReport({ districtId: "D1", farmerGroupId: "G1" } as never).catch(() => undefined);
    expect(await db.farmerGroup.findFirst.mock.results[0].value).toMatchObject({ id: "G1" });
  });

  it("getTrainingReport: Lembaga lain di distrik yang sama ditolak", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await expect(report.getTrainingReport({ districtId: "D1", farmerGroupId: "G2" } as never)).rejects.toThrow(DENIED);
    expect(db.trainingActivity.findMany).not.toHaveBeenCalled();
    expect(db.trainingParticipant.findMany).not.toHaveBeenCalled();
  });

  it("getProductionReport: Lembaga lain di distrik yang sama ditolak", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await expect(
      report.getProductionReport({ districtId: "D1", farmerGroupId: "G2", periodStart: "2025-01", periodEnd: "2025-02" } as never),
    ).rejects.toThrow(DENIED);
    expect(db.productionRecord.findMany).not.toHaveBeenCalled();
  });

  it("getLandParcelReportGeometries: Lembaga lain di distrik mana pun ditolak, geometri tak dikueri", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await expect(report.getLandParcelReportGeometries("G3")).rejects.toThrow(DENIED);
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });

  it("getKelompokTaniDetailReport: Lembaga lain ditolak (nama Lembaga tak bocor)", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await expect(report.getKelompokTaniDetailReport("G2")).rejects.toThrow(DENIED);
  });
});

describe("Daftar Lembaga — filter distrik tak boleh menimpa scope BY_DISTRICT", () => {
  it("Report getFarmerGroupsForReport: distrik di luar scope → kosong; dalam scope → G1, G2", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(ids(await report.getFarmerGroupsForReport("D2"))).toEqual([]);
    expect(ids(await report.getFarmerGroupsForReport("D1"))).toEqual(["G1", "G2"]);
  });

  it("Map getFarmerGroupsForMap: distrik di luar scope → kosong", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(ids(await map.getFarmerGroupsForMap("D2"))).toEqual([]);
    expect(ids(await map.getFarmerGroupsForMap("D1"))).toEqual(["G1", "G2"]);
  });

  it("Data Analyst getFarmerGroupsForAnalyst: distrik di luar scope → kosong (#386 butir 1)", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(ids(await analyst.getFarmerGroupsForAnalyst("D2"))).toEqual([]);
  });

  it("Main Dashboard aggregateDashboardData: distrik di luar scope → tanpa Lembaga", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await aggregateDashboardData({ districtId: "D2" });
    expect(await db.farmerGroup.findMany.mock.results[0].value).toEqual([]);
  });
});

describe("Data Analyst — filter Lembaga/distrik tak boleh menimpa scope (#386 butir 1)", () => {
  it("getFarmerSummary: BY_FARMER_GROUP + Lembaga lain → tanpa petani", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    const res = await analyst.getFarmerSummary({ farmerGroupId: "G2" } as never);
    expect(res.rows).toEqual([]);
  });

  it("getFarmerSummary: BY_DISTRICT + distrik lain → tanpa petani", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    const res = await analyst.getFarmerSummary({ districtId: "D2" } as never);
    expect(res.rows).toEqual([]);
  });

  it("getFarmersWithoutParcels: BY_FARMER_GROUP + Lembaga lain → kosong", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await analyst.getFarmersWithoutParcels({ farmerGroupId: "G2" } as never);
    expect(await db.farmer.findMany.mock.results[0].value).toEqual([]);
  });
});
