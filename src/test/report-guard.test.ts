import { describe, it, expect, vi, beforeEach } from "vitest";
import { PRODUCTION_REPORT_MAX_MONTHS } from "@/lib/report-production";
import { matches, type Row } from "./prisma-where";

/**
 * Guard 3 lapis action Report (`src/server/actions/report.ts`) — tanpa DB:
 * izin menu per action (key + level), penolakan sebelum kueri data, filter
 * wajib, `isActive: true` di setiap `where`, dan scope dropdown/agregat.
 * Penolakan Lembaga di luar scope pada verifikasi Lembaga (BUG-007) sudah
 * diuji semantik di `scope-collision-guard.test.ts`; Laporan NKT (PRINT) di
 * `nkt-report-map-marker-guard.test.ts` — tidak diulang di sini.
 *
 * Data contoh: G1 (D1) · G2 (D1) · G3 (D2); satu lahan per Lembaga.
 */
const GROUPS: Row[] = [
  { id: "G1", name: "Lembaga 1", districtId: "D1", isActive: true },
  { id: "G2", name: "Lembaga 2", districtId: "D1", isActive: true },
  { id: "G3", name: "Lembaga 3", districtId: "D2", isActive: true },
];
const PARCELS: Row[] = GROUPS.map((g, i) => ({
  id: `LP${i + 1}`, isActive: true, area: 1, subGroupLv2: "KT A", farmerId: `F${i + 1}`,
  farmer: { id: `F${i + 1}`, farmerId: `P${i + 1}`, name: `Petani ${i + 1}`, isActive: true, farmerGroupId: g.id, farmerGroup: g },
  identity: { nkt: null, _count: { markers: 0 }, documents: [], stdbLinks: [], externalIds: [], programs: [], markers: [] },
}));

const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const db = vi.hoisted(() => ({
  district: { findMany: vi.fn() },
  farmerGroup: { findFirst: vi.fn(), findMany: vi.fn() },
  farmer: { findMany: vi.fn() },
  trainingActivity: { findMany: vi.fn() },
  productionRecord: { findMany: vi.fn() },
  landParcel: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const report = await import("@/server/actions/report");

const DENIED = /Tidak memiliki izin/;
const allDbFns = () => Object.values(db).flatMap((m) => Object.values(m));
const expectNoDb = () => {
  for (const fn of allDbFns()) expect(fn).not.toHaveBeenCalled();
};
const whereOf = (fn: { mock: { calls: unknown[][] } }, i = 0) => (fn.mock.calls[i][0] as { where: Record<string, unknown> }).where;

const BY_GROUP = { mode: "BY_FARMER_GROUP", ids: ["G1"] };
const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["D1"] };
const PROD = { districtId: "D1", farmerGroupId: "G1", periodStart: "2025-01", periodEnd: "2025-03" };

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.district.findMany.mockResolvedValue([]);
  db.farmerGroup.findFirst.mockImplementation(async ({ where }: { where: unknown }) => GROUPS.find((g) => matches(g, where)) ?? null);
  db.farmerGroup.findMany.mockImplementation(async ({ where }: { where: unknown }) => GROUPS.filter((g) => matches(g, where)));
  db.farmer.findMany.mockResolvedValue([]);
  db.trainingActivity.findMany.mockResolvedValue([]);
  db.productionRecord.findMany.mockResolvedValue([]);
  db.landParcel.findMany.mockImplementation(async ({ where }: { where: unknown }) => PARCELS.filter((p) => matches(p, where)));
});

describe("izin menu per action — ditolak → melempar tanpa satu pun kueri", () => {
  const cases: [string, string, () => Promise<unknown>][] = [
    ["getFarmerReport", "report-farmer", () => report.getFarmerReport({ districtId: "D1", farmerGroupId: "G1" } as never)],
    ["getTrainingReport", "report-training", () => report.getTrainingReport({ districtId: "D1", farmerGroupId: "G1" } as never)],
    ["getProductionReport", "report-production", () => report.getProductionReport(PROD as never)],
    ["getKelompokTaniReport", "report-kelompok-tani", () => report.getKelompokTaniReport({})],
    ["getLandParcelReport", "report-land-parcel", () => report.getLandParcelReport({ coverage: "all" } as never)],
    ["getLandParcelReportGeometries", "report-land-parcel", () => report.getLandParcelReportGeometries("G1")],
    ["getKelompokTaniDetailReport", "report-kelompok-tani-detail", () => report.getKelompokTaniDetailReport("G1")],
  ];

  for (const [name, menuKey, call] of cases) {
    it(`${name}: ${menuKey} VIEW`, async () => {
      hasPermission.mockResolvedValue(false);
      await expect(call()).rejects.toThrow(DENIED);
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith(menuKey, "VIEW");
      expect(getAccessContext).not.toHaveBeenCalled();
      expectNoDb();
    });
  }
});

describe("dropdown Distrik/Lembaga — izin per menu Report", () => {
  const cases: [string, string[], () => Promise<unknown>][] = [
    ["getDistrictsForReport", ["report-farmer"], () => report.getDistrictsForReport()],
    ["getFarmerGroupsForReport", ["report-farmer"], () => report.getFarmerGroupsForReport("D1")],
    ["getDistrictsForTrainingReport", ["report-training"], () => report.getDistrictsForTrainingReport()],
    ["getFarmerGroupsForTrainingReport", ["report-training"], () => report.getFarmerGroupsForTrainingReport("D1")],
    ["getDistrictsForProductionReport", ["report-production"], () => report.getDistrictsForProductionReport()],
    ["getFarmerGroupsForProductionReport", ["report-production"], () => report.getFarmerGroupsForProductionReport("D1")],
    ["getDistrictsForKtReport", ["report-kelompok-tani", "report-kelompok-tani-detail"], () => report.getDistrictsForKtReport()],
    ["getFarmerGroupsForKtReport", ["report-kelompok-tani", "report-kelompok-tani-detail"], () => report.getFarmerGroupsForKtReport("D1")],
    ["getDistrictsForLandParcelReport", ["report-land-parcel"], () => report.getDistrictsForLandParcelReport()],
    ["getFarmerGroupsForLandParcelReport", ["report-land-parcel"], () => report.getFarmerGroupsForLandParcelReport("D1")],
    ["getDistrictsForMarkerReport", ["report-marker"], () => report.getDistrictsForMarkerReport()],
    ["getFarmerGroupsForMarkerReport", ["report-marker"], () => report.getFarmerGroupsForMarkerReport("D1")],
  ];

  for (const [name, keys, call] of cases) {
    it(`${name}: VIEW ${keys.join(" | ")}; ditolak → melempar tanpa kueri`, async () => {
      hasPermission.mockResolvedValue(false);
      await expect(call()).rejects.toThrow(DENIED);
      expect(hasPermission.mock.calls).toEqual(keys.map((k) => [k, "VIEW"]));
      expectNoDb();
    });
  }

  it("menu KT ganda: VIEW salah satu (Detail saja) sudah cukup", async () => {
    hasPermission.mockImplementation(async (key: string) => key === "report-kelompok-tani-detail");
    await expect(report.getDistrictsForKtReport()).resolves.toEqual([]);
    expect(db.district.findMany).toHaveBeenCalledOnce();
  });

  it("distrik: isActive + scope BY_DISTRICT (id in) / BY_FARMER_GROUP (Lembaga aktif dalam scope)", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await report.getDistrictsForReport();
    expect(whereOf(db.district.findMany)).toEqual({ isActive: true, id: { in: ["D1"] } });

    getAccessContext.mockResolvedValue(BY_GROUP);
    await report.getDistrictsForTrainingReport();
    expect(whereOf(db.district.findMany, 1)).toEqual({ isActive: true, farmerGroups: { some: { id: { in: ["G1"] }, isActive: true } } });

    getAccessContext.mockResolvedValue({ mode: "ALL" });
    await report.getDistrictsForProductionReport();
    expect(whereOf(db.district.findMany, 2)).toEqual({ isActive: true });
  });

  it("Lembaga: BY_FARMER_GROUP tanpa filter distrik → hanya Lembaga milik user, isActive", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    const rows = (await report.getFarmerGroupsForLandParcelReport()) as Row[];
    expect(rows.map((r) => r.id)).toEqual(["G1"]);
    expect(whereOf(db.farmerGroup.findMany)).toMatchObject({ isActive: true });
  });
});

describe("filter wajib — ditolak sebelum menyentuh DB", () => {
  it("Petani/Pelatihan/Produksi: tanpa Distrik atau Lembaga → 'wajib diisi'", async () => {
    for (const f of [{ districtId: "D1" }, { farmerGroupId: "G1" }, {}]) {
      await expect(report.getFarmerReport(f as never)).rejects.toThrow(/wajib diisi/);
      await expect(report.getTrainingReport(f as never)).rejects.toThrow(/wajib diisi/);
      await expect(report.getProductionReport({ ...PROD, districtId: undefined, farmerGroupId: undefined, ...f } as never)).rejects.toThrow(/wajib diisi/);
    }
    expectNoDb();
  });

  it("Produksi: periode cacat, terbalik, atau > batas bulan → ditolak", async () => {
    await expect(report.getProductionReport({ ...PROD, periodStart: "2025-13" } as never)).rejects.toThrow(/format bulan/);
    await expect(report.getProductionReport({ ...PROD, periodEnd: "" } as never)).rejects.toThrow(/format bulan/);
    await expect(report.getProductionReport({ ...PROD, periodStart: "2025-05", periodEnd: "2025-01" } as never)).rejects.toThrow(/setelah Periode Awal/);
    const end = new Date(Date.UTC(2020, PRODUCTION_REPORT_MAX_MONTHS, 1)); // bulan ke-(MAX+1) dihitung dari 2020-01
    const tooLong = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}`;
    await expect(report.getProductionReport({ ...PROD, periodStart: "2020-01", periodEnd: tooLong } as never)).rejects.toThrow(/maksimal/);
    expectNoDb();
  });

  it("Lahan: tanpa / dengan coverage tak sah → 'Cakupan Pendataan wajib diisi'", async () => {
    await expect(report.getLandParcelReport({} as never)).rejects.toThrow(/Cakupan Pendataan/);
    await expect(report.getLandParcelReport({ coverage: "semua" } as never)).rejects.toThrow(/Cakupan Pendataan/);
    expectNoDb();
  });
});

describe("soft delete — setiap kueri data membawa isActive: true", () => {
  it("getFarmerReport: petani & lahan aktif saja, dibatasi Lembaga terverifikasi", async () => {
    await report.getFarmerReport({ districtId: "D1", farmerGroupId: "G1" } as never);
    expect(whereOf(db.farmerGroup.findFirst)).toMatchObject({ id: "G1", districtId: "D1", isActive: true });
    const args = db.farmer.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ isActive: true, farmerGroupId: "G1" });
    expect(args.select.landParcels.where).toEqual({ isActive: true });
  });

  it("getTrainingReport: kegiatan, peserta, dan petani aktif; paket OTHER dibuang", async () => {
    await report.getTrainingReport({ districtId: "D1", farmerGroupId: "G1" } as never);
    const act = db.trainingActivity.findMany.mock.calls[0][0];
    expect(act.where).toEqual({ isActive: true, farmerGroupId: "G1", package: { code: { not: "OTHER" } } });
    expect(act.include.participants.where).toEqual({ isActive: true });
    expect(whereOf(db.farmer.findMany)).toEqual({ isActive: true, farmerGroupId: "G1" });
  });

  it("getProductionReport: record aktif milik petani aktif Lembaga, dalam rentang periode", async () => {
    await report.getProductionReport(PROD as never);
    expect(whereOf(db.productionRecord.findMany)).toEqual({
      isActive: true,
      period: { gte: "2025-01", lte: "2025-03" },
      farmer: { isActive: true, farmerGroupId: "G1" },
    });
  });

  it("getLandParcelReport: lahan & petani aktif; satelit hanya baris aktif", async () => {
    await report.getLandParcelReport({ coverage: "all" } as never);
    const args = db.landParcel.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ isActive: true, farmer: { isActive: true } });
    const identity = args.select.identity.select;
    for (const k of ["documents", "externalIds", "programs", "markers"]) expect(identity[k].where).toEqual({ isActive: true });
    expect(identity.stdbLinks.where).toEqual({ isActive: true, stdb: { isActive: true } });
  });

  it("getLandParcelReportGeometries: lahan aktif milik petani aktif Lembaga itu", async () => {
    await report.getLandParcelReportGeometries("G1");
    expect(whereOf(db.landParcel.findMany)).toEqual({ isActive: true, farmer: { isActive: true, farmerGroupId: "G1" } });
  });
});

describe("Report Kelompok Tani & Detail — scope lewat AND (semantik)", () => {
  it("getKelompokTaniReport BY_DISTRICT: filter distrik lain tak menembus scope → tanpa lahan", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await report.getKelompokTaniReport({ districtId: "D2" });
    expect(await db.landParcel.findMany.mock.results[0].value).toEqual([]);
  });

  it("getKelompokTaniReport BY_FARMER_GROUP: filter Lembaga lain → tanpa lahan; tanpa filter → hanya lahan G1", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await report.getKelompokTaniReport({ farmerGroupId: "G2" });
    expect(await db.landParcel.findMany.mock.results[0].value).toEqual([]);
    await report.getKelompokTaniReport({});
    expect((await db.landParcel.findMany.mock.results[1].value).map((p: Row) => p.id)).toEqual(["LP1"]);
  });

  it("getLandParcelReport BY_DISTRICT: filter Lembaga di distrik lain → tanpa lahan", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await report.getLandParcelReport({ coverage: "all", farmerGroupId: "G3" } as never);
    expect(await db.landParcel.findMany.mock.results[0].value).toEqual([]);
  });

  it("getKelompokTaniDetailReport: Lembaga dalam scope → kueri lahan memuat scope + Lembaga di AND, isActive", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await report.getKelompokTaniDetailReport("G2");
    expect(whereOf(db.farmerGroup.findFirst)).toEqual({ id: "G2", isActive: true, AND: { districtId: { in: ["D1"] } } });
    expect(whereOf(db.landParcel.findMany)).toEqual({
      isActive: true,
      farmer: { isActive: true },
      AND: [{ farmer: { farmerGroup: { districtId: { in: ["D1"] } } } }, { farmer: { farmerGroupId: "G2" } }],
    });
    expect((await db.landParcel.findMany.mock.results[0].value).map((p: Row) => p.id)).toEqual(["LP2"]);
  });

  it("getKelompokTaniDetailReport: Lembaga tak ditemukan → melempar, lahan tak dikueri", async () => {
    await expect(report.getKelompokTaniDetailReport("G-hilang")).rejects.toThrow(/tidak ditemukan/);
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });
});
