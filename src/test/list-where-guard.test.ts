import { describe, it, expect, vi, beforeEach } from "vitest";
import { matches, type Row } from "./prisma-where";

/**
 * `where` daftar master data (audit #440 F2) — memanggil action ASLI, bukan
 * salinan logika di test (cermin lama di farmer/land-parcel/training-activity/
 * production.test.ts menguji kode yang tak lagi sama dengan produksi: mengira
 * `isActive` tak difilter, padahal non-SUPERADMIN dipaksa `isActive: true`).
 *
 * Yang dijaga: (1) soft delete — non-SUPERADMIN hanya record aktif, SUPERADMIN
 * melihat nonaktif; (2) scope `getAccessContext` ikut ke `where`; (3) filter
 * dari klien (`farmerGroupId`) TIDAK menimpa scope BY_FARMER_GROUP yang memakai
 * kunci sama — dulu `...farmerAccessFilter(access)` lalu `...{ farmerGroupId }`
 * membuat Lembaga di luar scope ikut termuat. Prisma tiruan memfilter data
 * contoh dengan `matches` agar yang diuji SEMANTIK, bukan hanya bentuk.
 *
 * Data contoh: G1 (milik user, D1) · G2 (Lembaga lain, D1) · G3 (Lembaga lain, D2);
 * satu petani/pelatihan/lahan/produksi aktif per Lembaga + satu nonaktif di G1.
 */
const GROUPS: Row[] = [
  { id: "G1", districtId: "D1", isActive: true },
  { id: "G2", districtId: "D1", isActive: true },
  { id: "G3", districtId: "D2", isActive: true },
];
const FARMERS: Row[] = [
  ...GROUPS.map((g, i) => ({ id: `F${i + 1}`, isActive: true, farmerGroupId: g.id, farmerGroup: g, _count: { landParcels: 0 } })),
  { id: "F9", isActive: false, farmerGroupId: "G1", farmerGroup: GROUPS[0], _count: { landParcels: 0 } },
];
const ACTIVITIES: Row[] = FARMERS.map((f) => ({ id: `T-${f.id}`, isActive: f.isActive, farmerGroupId: f.farmerGroupId, farmerGroup: f.farmerGroup }));
const PARCELS: Row[] = FARMERS.map((f) => ({
  id: `L-${f.id}`, isActive: f.isActive, farmerId: f.id, farmer: f, identity: { nkt: null, _count: { markers: 0 } },
}));
const RECORDS: Row[] = FARMERS.map((f) => ({ id: `P-${f.id}`, isActive: f.isActive, farmerId: f.id, farmer: f }));

const ALL = { mode: "ALL", ids: [] };
const BY_GROUP = { mode: "BY_FARMER_GROUP", ids: ["G1"] };
const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["D1"] };

const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/s3", () => ({ getPresignedUrl: vi.fn() }));
vi.mock("@/lib/land-marker-query", () => ({ fetchFarmerGroupMarkerPoints: vi.fn(), fetchFarmerMarkerPoints: vi.fn(), fetchFarmerGroupMarkerStats: vi.fn(), fetchFarmerMarkerStats: vi.fn() }));
vi.mock("@/lib/parcel-passport-query", () => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));
vi.mock("@/lib/select-options", () => ({ getFarmerOptions: vi.fn() }));
vi.mock("@/lib/parcel-neighbor-query", () => ({ fetchParcelNeighbors: vi.fn() }));

const db = vi.hoisted(() => ({
  farmer: { findMany: vi.fn() },
  trainingActivity: { findMany: vi.fn() },
  landParcel: { findMany: vi.fn(), groupBy: vi.fn() },
  productionRecord: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getFarmers } = await import("@/server/actions/farmer");
const { getTrainingActivities } = await import("@/server/actions/training");
const { getLandParcels } = await import("@/server/actions/land-parcel");
const { getProductionRecords } = await import("@/server/actions/production");

const filterBy = (rows: Row[]) => async ({ where }: { where: unknown }) => rows.filter((r) => matches(r, where));
const whereOf = (fn: { mock: { calls: unknown[][] } }, i = 0) => (fn.mock.calls[i][0] as { where: Row }).where;
const ids = (rows: { id: unknown }[]) => rows.map((r) => r.id);

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue(ALL);
  db.farmer.findMany.mockImplementation(filterBy(FARMERS));
  db.trainingActivity.findMany.mockImplementation(filterBy(ACTIVITIES));
  db.landParcel.findMany.mockImplementation(filterBy(PARCELS));
  db.landParcel.groupBy.mockResolvedValue([]);
  db.productionRecord.findMany.mockImplementation(filterBy(RECORDS));
});

describe("getFarmers — soft delete + scope", () => {
  it("non-SUPERADMIN mode ALL → isActive:true, scope kosong di AND; petani nonaktif tak kembali", async () => {
    expect(ids(await getFarmers())).toEqual(["F1", "F2", "F3"]);
    expect(whereOf(db.farmer.findMany)).toEqual({ isActive: true });
  });

  it("SUPERADMIN → tanpa filter isActive (nonaktif ikut untuk restore)", async () => {
    isSuperAdmin.mockResolvedValue(true);
    expect(ids(await getFarmers())).toEqual(["F1", "F2", "F3", "F9"]);
    expect(whereOf(db.farmer.findMany)).not.toHaveProperty("isActive");
  });

  it("BY_DISTRICT → farmerGroup.districtId in ids; search jadi OR 3 kolom", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(ids(await getFarmers("Budi"))).toEqual(["F1", "F2"]);
    const where = whereOf(db.farmer.findMany);
    expect(where.AND).toEqual([{ farmerGroup: { districtId: { in: ["D1"] } } }]);
    expect(where.OR).toHaveLength(3);
  });

  it("BY_FARMER_GROUP + farmerGroupId Lembaga lain → scope `{ in: ids }` tetap ada, hasil kosong (#440)", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await getFarmers(undefined, "G2")).toEqual([]);
    const where = whereOf(db.farmer.findMany);
    expect(where).toMatchObject({ AND: [{ farmerGroupId: { in: ["G1"] } }], farmerGroupId: "G2", isActive: true });
    // Hitungan lahan per petani memakai where petani yang sama — scope ikut terbawa.
    expect(whereOf(db.landParcel.groupBy).farmer).toBe(where);
  });

  it("BY_FARMER_GROUP + Lembaga milik sendiri → petani aktif Lembaga itu saja", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(ids(await getFarmers(undefined, "G1"))).toEqual(["F1"]);
  });

  it("BY_DISTRICT + farmerGroupId dalam distrik → digabung dengan scope distrik", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(ids(await getFarmers(undefined, "G2"))).toEqual(["F2"]);
    expect(ids(await getFarmers(undefined, "G3"))).toEqual([]);
  });
});

describe("getTrainingActivities — soft delete + scope", () => {
  it("non-SUPERADMIN → isActive:true; SUPERADMIN → tanpa isActive", async () => {
    expect(ids(await getTrainingActivities())).toEqual(["T-F1", "T-F2", "T-F3"]);
    expect(whereOf(db.trainingActivity.findMany)).toEqual({ isActive: true });

    isSuperAdmin.mockResolvedValue(true);
    expect(ids(await getTrainingActivities())).toEqual(["T-F1", "T-F2", "T-F3", "T-F9"]);
    expect(whereOf(db.trainingActivity.findMany, 1)).not.toHaveProperty("isActive");
  });

  it("BY_FARMER_GROUP + farmerGroupId Lembaga lain → scope `{ in: ids }` tetap ada, hasil kosong (#440)", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await getTrainingActivities(undefined, "G-other")).toEqual([]);
    expect(await getTrainingActivities(undefined, "G2")).toEqual([]);
    expect(whereOf(db.trainingActivity.findMany)).toMatchObject({
      AND: [{ farmerGroupId: { in: ["G1"] } }], farmerGroupId: "G-other", isActive: true,
    });
  });

  it("BY_FARMER_GROUP + Lembaga sendiri → pelatihan aktif Lembaga itu; BY_DISTRICT → distrik saja", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(ids(await getTrainingActivities(undefined, "G1"))).toEqual(["T-F1"]);
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(ids(await getTrainingActivities())).toEqual(["T-F1", "T-F2"]);
    expect(whereOf(db.trainingActivity.findMany, 1).AND).toEqual([{ farmerGroup: { districtId: { in: ["D1"] } } }]);
  });
});

describe("getLandParcels — soft delete + scope relasi petani", () => {
  it("non-SUPERADMIN BY_FARMER_GROUP → farmer.farmerGroupId in ids + isActive:true", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(ids(await getLandParcels())).toEqual(["L-F1"]);
    expect(whereOf(db.landParcel.findMany)).toEqual({ farmer: { farmerGroupId: { in: ["G1"] } }, isActive: true });
  });

  it("SUPERADMIN → tanpa isActive (lahan nonaktif ikut); mode ALL tanpa filter relasi", async () => {
    isSuperAdmin.mockResolvedValue(true);
    expect(ids(await getLandParcels())).toEqual(["L-F1", "L-F2", "L-F3", "L-F9"]);
    expect(whereOf(db.landParcel.findMany)).toEqual({});
  });

  it("filter farmerId klien digabung dengan scope (kunci beda: farmerId vs farmer) — petani luar scope → kosong", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(ids(await getLandParcels(undefined, "F2"))).toEqual(["L-F2"]);
    expect(await getLandParcels(undefined, "F3")).toEqual([]);
    expect(whereOf(db.landParcel.findMany, 1)).toEqual({
      farmer: { farmerGroup: { districtId: { in: ["D1"] } } }, isActive: true, farmerId: "F3",
    });
  });
});

describe("getProductionRecords — soft delete (status hanya untuk SUPERADMIN) + scope", () => {
  it("non-SUPERADMIN → isActive:true apa pun status; mode ALL tanpa kunci farmer", async () => {
    for (const status of [undefined, "active", "inactive", "all"]) {
      expect(ids(await getProductionRecords({ status }))).toEqual(["P-F1", "P-F2", "P-F3"]);
    }
    for (const [args] of db.productionRecord.findMany.mock.calls) expect((args as { where: Row }).where).toEqual({ isActive: true });
  });

  it("SUPERADMIN: default/active → aktif, inactive → nonaktif saja, all → tanpa isActive", async () => {
    isSuperAdmin.mockResolvedValue(true);
    expect(ids(await getProductionRecords())).toEqual(["P-F1", "P-F2", "P-F3"]);
    expect(ids(await getProductionRecords({ status: "active" }))).toEqual(["P-F1", "P-F2", "P-F3"]);
    expect(ids(await getProductionRecords({ status: "inactive" }))).toEqual(["P-F9"]);
    expect(ids(await getProductionRecords({ status: "all" }))).toEqual(["P-F1", "P-F2", "P-F3", "P-F9"]);
    expect(whereOf(db.productionRecord.findMany, 3)).not.toHaveProperty("isActive");
  });

  it("hasParcel true/false/all + period + search → kunci where masing-masing", async () => {
    await getProductionRecords({ hasParcel: "true", period: "2026-06" });
    await getProductionRecords({ hasParcel: "false", search: "Budi" });
    await getProductionRecords({ hasParcel: "all" });
    expect(whereOf(db.productionRecord.findMany, 0)).toEqual({ isActive: true, parcelId: { not: null }, period: "2026-06" });
    expect(whereOf(db.productionRecord.findMany, 1)).toMatchObject({ isActive: true, parcelId: null, OR: expect.any(Array) });
    expect(whereOf(db.productionRecord.findMany, 1).OR).toHaveLength(2);
    expect(whereOf(db.productionRecord.findMany, 2)).toEqual({ isActive: true });
  });

  it("BY_DISTRICT + farmerGroupId → keduanya di objek farmer (scope distrik tak tertimpa)", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(ids(await getProductionRecords({ farmerGroupId: "G2" }))).toEqual(["P-F2"]);
    expect(await getProductionRecords({ farmerGroupId: "G3" })).toEqual([]);
  });

  // Dulu bocor (#440): `farmerFilter` men-spread `farmerAccessFilter` lalu
  // `{ farmerGroupId }` — di mode BY_FARMER_GROUP parameter menimpa scope.
  it("BY_FARMER_GROUP + farmerGroupId Lembaga lain → kosong (scope tak tertimpa)", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await getProductionRecords({ farmerGroupId: "G2" })).toEqual([]);
  });
});
