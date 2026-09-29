import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  farmerGroupAccessFilter,
  farmerAccessFilter,
  farmerRelationAccessFilter,
  type AccessContext,
} from "@/lib/access-scope";

/**
 * Helper access-filter (#127 — AUDIT-P1) dan pemakaiannya di action by-id.
 * Menguji fungsi & action ASLI (bukan cermin): filter murni dari
 * `@/lib/access-scope`; action diimpor dengan `auth`/`rbac`/`prisma` di-mock
 * (pola `land-marker-guard.test.ts`) lalu `where` yang dikirim ke Prisma diperiksa.
 */
const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));

// Filter scope tetap ASLI; hanya sumber konteks akses yang dikendalikan test.
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
  getAccessibleDistrictIds: async () => null,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/s3", () => ({ getPresignedUrl: async () => "https://signed" }));
vi.mock("@/lib/land-marker-query", () => ({ fetchFarmerGroupMarkerPoints: vi.fn(), fetchFarmerMarkerPoints: vi.fn() }));
vi.mock("@/lib/parcel-passport-query", () => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));

const db = vi.hoisted(() => {
  const model = () => ({ findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() });
  return {
    farmerGroup: model(),
    farmer: model(),
    trainingActivity: model(),
    trainingParticipant: model(),
    landParcel: model(),
    productionRecord: model(),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { toggleFarmerGroupActive } = await import("@/server/actions/farmer-group");
const { toggleTrainingActivityActive, getTrainingActivityById, removeParticipant } = await import("@/server/actions/training");
const { createLandParcel, toggleLandParcelActive, getLandParcelById } = await import("@/server/actions/land-parcel");
const { toggleProductionRecordActive } = await import("@/server/actions/production");

const ALL: AccessContext = { mode: "ALL" };
const BY_KT: AccessContext = { mode: "BY_FARMER_GROUP", ids: ["kt-1"] };
const BY_DIST: AccessContext = { mode: "BY_DISTRICT", ids: ["d1"] };

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue(ALL);
  for (const m of Object.values(db)) {
    m.findFirst.mockResolvedValue(null);
    m.findMany.mockResolvedValue([]);
  }
});

const whereOf = (fn: { mock: { calls: unknown[][] } }) => (fn.mock.calls[0][0] as { where: Record<string, unknown> }).where;

describe("farmerGroupAccessFilter", () => {
  it("ALL → tanpa batasan", () => {
    expect(farmerGroupAccessFilter(ALL)).toEqual({});
  });
  it("BY_FARMER_GROUP → batasi id KT", () => {
    expect(farmerGroupAccessFilter({ mode: "BY_FARMER_GROUP", ids: ["kt-1", "kt-2"] })).toEqual({
      id: { in: ["kt-1", "kt-2"] },
    });
  });
  it("BY_DISTRICT → batasi districtId", () => {
    expect(farmerGroupAccessFilter(BY_DIST)).toEqual({ districtId: { in: ["d1"] } });
  });
});

describe("farmerAccessFilter", () => {
  it("ALL → tanpa batasan", () => {
    expect(farmerAccessFilter(ALL)).toEqual({});
  });
  it("BY_FARMER_GROUP → farmerGroupId in ids", () => {
    expect(farmerAccessFilter(BY_KT)).toEqual({ farmerGroupId: { in: ["kt-1"] } });
  });
  it("BY_DISTRICT → relasi farmerGroup.districtId", () => {
    expect(farmerAccessFilter(BY_DIST)).toEqual({ farmerGroup: { districtId: { in: ["d1"] } } });
  });
});

describe("farmerRelationAccessFilter", () => {
  it("ALL → tanpa batasan", () => {
    expect(farmerRelationAccessFilter(ALL)).toEqual({});
  });
  it("BY_FARMER_GROUP → relasi farmer.farmerGroupId", () => {
    expect(farmerRelationAccessFilter(BY_KT)).toEqual({ farmer: { farmerGroupId: { in: ["kt-1"] } } });
  });
  it("BY_DISTRICT → relasi farmer.farmerGroup.districtId", () => {
    expect(farmerRelationAccessFilter(BY_DIST)).toEqual({
      farmer: { farmerGroup: { districtId: { in: ["d1"] } } },
    });
  });
});

describe("by-id scope — Lembaga Petani (toggleFarmerGroupActive) tidak bocor lintas wilayah", () => {
  // Filter KT dipasang lewat `AND`, bukan spread, agar `{ id: { in } }` (mode
  // BY_FARMER_GROUP) tidak menimpa literal `id` (celah scope-bypass).
  it("BY_DISTRICT: where menyertakan id spesifik + batasan districtId; tak ditemukan → gagal tanpa update", async () => {
    getAccessContext.mockResolvedValue(BY_DIST);
    const res = await toggleFarmerGroupActive("kt-x");
    expect(whereOf(db.farmerGroup.findFirst)).toEqual({ id: "kt-x", AND: { districtId: { in: ["d1"] } } });
    expect(res.success).toBe(false);
    expect(db.farmerGroup.update).not.toHaveBeenCalled();
  });
  it("BY_FARMER_GROUP: literal id tetap ada, scope masuk lewat AND", async () => {
    getAccessContext.mockResolvedValue(BY_KT);
    await toggleFarmerGroupActive("kt-x");
    const where = whereOf(db.farmerGroup.findFirst);
    expect(where).toEqual({ id: "kt-x", AND: { id: { in: ["kt-1"] } } });
    expect(where.id).toBe("kt-x");
  });
  it("ALL: AND no-op tidak menambah batasan; ditemukan → flag isActive dibalik", async () => {
    db.farmerGroup.findFirst.mockResolvedValue({ isActive: true });
    const res = await toggleFarmerGroupActive("kt-x");
    expect(whereOf(db.farmerGroup.findFirst)).toEqual({ id: "kt-x", AND: {} });
    expect(res.success).toBe(true);
    expect(db.farmerGroup.update.mock.calls[0][0]).toMatchObject({ where: { id: "kt-x" }, data: { isActive: false } });
  });
});

describe("by-id scope — Pelatihan (toggleTrainingActivityActive)", () => {
  it("BY_FARMER_GROUP: activity dibatasi farmerGroupId", async () => {
    getAccessContext.mockResolvedValue(BY_KT);
    await toggleTrainingActivityActive("act-x");
    expect(whereOf(db.trainingActivity.findFirst)).toEqual({ id: "act-x", farmerGroupId: { in: ["kt-1"] } });
  });
  it("BY_DISTRICT: activity dibatasi lewat relasi farmerGroup.districtId", async () => {
    getAccessContext.mockResolvedValue(BY_DIST);
    await toggleTrainingActivityActive("act-x");
    expect(whereOf(db.trainingActivity.findFirst)).toEqual({ id: "act-x", farmerGroup: { districtId: { in: ["d1"] } } });
  });
});

describe("scope peserta pelatihan (removeParticipant) via relasi activity", () => {
  it("BY_FARMER_GROUP: participant dibatasi activity.farmerGroupId; luar scope → gagal tanpa update", async () => {
    getAccessContext.mockResolvedValue(BY_KT);
    const res = await removeParticipant("part-x");
    expect(whereOf(db.trainingParticipant.findFirst)).toEqual({ id: "part-x", activity: { farmerGroupId: { in: ["kt-1"] } } });
    expect(res.success).toBe(false);
    expect(db.trainingParticipant.update).not.toHaveBeenCalled();
  });
  it("BY_DISTRICT: participant dibatasi activity.farmerGroup.districtId", async () => {
    getAccessContext.mockResolvedValue(BY_DIST);
    await removeParticipant("part-x");
    expect(whereOf(db.trainingParticipant.findFirst)).toEqual({
      id: "part-x",
      activity: { farmerGroup: { districtId: { in: ["d1"] } } },
    });
  });
});

describe("soft-delete visibility gating — hanya SUPERADMIN yang melihat record nonaktif", () => {
  it("SUPERADMIN: tanpa batasan isActive (bisa lihat aktif & nonaktif)", async () => {
    isSuperAdmin.mockResolvedValue(true);
    await getTrainingActivityById("act-x");
    expect(whereOf(db.trainingActivity.findFirst)).toEqual({ id: "act-x" });
  });
  it("non-SUPERADMIN: dipaksa isActive: true (hanya record aktif)", async () => {
    await getTrainingActivityById("act-x");
    expect(whereOf(db.trainingActivity.findFirst)).toEqual({ id: "act-x", isActive: true });
  });
  it("gabung dengan scope+id (getLandParcelById): user biasa tetap terkunci ke aktif", async () => {
    getAccessContext.mockResolvedValue(BY_DIST);
    await getLandParcelById("row-x");
    expect(whereOf(db.landParcel.findFirst)).toEqual({
      id: "row-x",
      farmer: { farmerGroup: { districtId: { in: ["d1"] } } },
      isActive: true,
    });
  });
});

describe("by-id scope — Lahan & Produksi (create target + toggle)", () => {
  it("createLandParcel: petani target harus lolos farmerAccessFilter, luar scope → ditolak sebelum menulis", async () => {
    getAccessContext.mockResolvedValue(BY_KT);
    const res = await createLandParcel({ farmerId: "farmer-x", parcelId: "HJP.0001.A", cropType: "Kelapa Sawit" });
    expect(whereOf(db.farmer.findFirst)).toEqual({ id: "farmer-x", isActive: true, farmerGroupId: { in: ["kt-1"] } });
    expect(res.success).toBe(false);
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
  });
  it("toggleLandParcelActive/toggleProductionRecordActive: dibatasi relasi farmer", async () => {
    getAccessContext.mockResolvedValue(BY_DIST);
    await toggleLandParcelActive("row-x");
    await toggleProductionRecordActive("row-y");
    const scope = { farmer: { farmerGroup: { districtId: { in: ["d1"] } } } };
    expect(whereOf(db.landParcel.findFirst)).toEqual({ id: "row-x", ...scope });
    expect(whereOf(db.productionRecord.findFirst)).toEqual({ id: "row-y", ...scope });
    expect(db.landParcel.update).not.toHaveBeenCalled();
    expect(db.productionRecord.update).not.toHaveBeenCalled();
  });
});
