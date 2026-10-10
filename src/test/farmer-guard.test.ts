import { describe, it, expect, vi, beforeEach } from "vitest";
import { matches, type Row } from "./prisma-where";

/**
 * Guard 3 lapis `updateFarmer` (`src/server/actions/farmer.ts`) — tanpa DB:
 * izin EDIT, Zod, petani harus aktif & dalam scope, Lembaga TUJUAN harus dalam
 * scope (anti pemindahan ke luar wilayah), keunikan ID per Lembaga, audit
 * `modifiedBy`. createFarmer & toggleFarmerActive di `rbac-server-guards.test.ts`
 * — tidak diulang.
 *
 * Data contoh: F1 (G1/D1) · F2 (G2/D1) · F3 (G3/D2) · F9 nonaktif (G1).
 */
const GROUPS: Row[] = [
  { id: "G1", districtId: "D1", isActive: true },
  { id: "G2", districtId: "D1", isActive: true },
  { id: "G3", districtId: "D2", isActive: true },
  { id: "G8", districtId: "D1", isActive: false },
];
const farmer = (id: string, farmerId: string, g: Row, isActive = true): Row => ({ id, farmerId, isActive, farmerGroupId: g.id, farmerGroup: g });
const FARMERS: Row[] = [
  farmer("F1", "P.01", GROUPS[0]),
  farmer("F2", "P.02", GROUPS[1]),
  farmer("F3", "P.03", GROUPS[2]),
  farmer("F9", "P.09", GROUPS[0], false),
];

const hasPermission = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/land-marker-query", () => ({ fetchFarmerGroupMarkerPoints: vi.fn(), fetchFarmerMarkerPoints: vi.fn(), fetchFarmerGroupMarkerStats: vi.fn(), fetchFarmerMarkerStats: vi.fn() }));
vi.mock("@/lib/parcel-passport-query", () => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));

const db = vi.hoisted(() => ({
  farmer: { findFirst: vi.fn(), update: vi.fn() },
  farmerGroup: { findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { updateFarmer } = await import("@/server/actions/farmer");

const BY_GROUP = { mode: "BY_FARMER_GROUP", ids: ["G1"] };
const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["D1"] };
const INPUT = { id: "F1", farmerGroupId: "G1", gender: "M" as const, name: "Budi", farmerId: "P.01" };

const argOf = (fn: { mock: { calls: unknown[][] } }, i = 0) => fn.mock.calls[i][0] as { where: Row; data: Row };
const expectNoDb = () => {
  for (const fn of [db.farmer.findFirst, db.farmer.update, db.farmerGroup.findFirst]) expect(fn).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  isSuperAdmin.mockResolvedValue(false);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.farmer.findFirst.mockImplementation(async ({ where }: { where: unknown }) => FARMERS.find((f) => matches(f, where)) ?? null);
  db.farmerGroup.findFirst.mockImplementation(async ({ where }: { where: unknown }) => GROUPS.find((g) => matches(g, where)) ?? null);
  db.farmer.update.mockResolvedValue({});
});

describe("updateFarmer — izin & validasi", () => {
  it("tanpa EDIT master-data-farmers → error, tanpa kueri", async () => {
    hasPermission.mockResolvedValue(false);
    expect(await updateFarmer(INPUT)).toMatchObject({ success: false, error: expect.stringMatching(/izin/) });
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("master-data-farmers", "EDIT");
    expect(getAccessContext).not.toHaveBeenCalled();
    expectNoDb();
  });

  it("Zod gagal → fieldErrors per kolom (tanpa id, nama pendek, JK asing), tanpa kueri", async () => {
    const { id: _id, ...noId } = INPUT;
    void _id;
    expect((await updateFarmer(noId as never)).error).toMatchObject({ id: expect.any(Array) });
    expect((await updateFarmer({ ...INPUT, name: "B", gender: "X" as never })).error).toMatchObject({ name: expect.any(Array), gender: expect.any(Array) });
    expectNoDb();
  });
});

describe("updateFarmer — scope petani & Lembaga tujuan", () => {
  it("BY_FARMER_GROUP + petani Lembaga lain → 'tidak ditemukan'; Lembaga tujuan tak dicek, tanpa update", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await updateFarmer({ ...INPUT, id: "F2", farmerGroupId: "G1" })).toMatchObject({ success: false, error: expect.stringMatching(/tidak ditemukan/) });
    expect(argOf(db.farmer.findFirst).where).toEqual({ id: "F2", isActive: true, farmerGroupId: { in: ["G1"] } });
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
    expect(db.farmer.update).not.toHaveBeenCalled();
  });

  it("BY_DISTRICT + petani distrik lain → ditolak", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(await updateFarmer({ ...INPUT, id: "F3", farmerGroupId: "G3" })).toMatchObject({ success: false });
    expect(argOf(db.farmer.findFirst).where).toEqual({ id: "F3", isActive: true, farmerGroup: { districtId: { in: ["D1"] } } });
    expect(db.farmer.update).not.toHaveBeenCalled();
  });

  it("petani nonaktif (walau dalam scope) → ditolak", async () => {
    expect(await updateFarmer({ ...INPUT, id: "F9" })).toMatchObject({ success: false, error: expect.stringMatching(/tidak aktif/) });
    expect(db.farmer.update).not.toHaveBeenCalled();
  });

  it("pindah ke Lembaga di luar scope (distrik lain) → ditolak; where Lembaga = id + isActive + scope di AND", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(await updateFarmer({ ...INPUT, farmerGroupId: "G3" })).toMatchObject({ success: false, error: expect.stringMatching(/memindahkan/) });
    expect(argOf(db.farmerGroup.findFirst).where).toEqual({ id: "G3", isActive: true, AND: { districtId: { in: ["D1"] } } });
    expect(db.farmer.update).not.toHaveBeenCalled();
  });

  it("BY_FARMER_GROUP: pindah ke Lembaga lain di distrik yang sama → ditolak (literal id tak menimpa scope)", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await updateFarmer({ ...INPUT, farmerGroupId: "G2" })).toMatchObject({ success: false, error: expect.stringMatching(/memindahkan/) });
    expect(db.farmer.update).not.toHaveBeenCalled();
  });

  it("pindah ke Lembaga nonaktif → ditolak", async () => {
    expect(await updateFarmer({ ...INPUT, farmerGroupId: "G8" })).toMatchObject({ success: false });
    expect(db.farmer.update).not.toHaveBeenCalled();
  });
});

describe("updateFarmer — keunikan ID per Lembaga & audit", () => {
  it("ID Petani dipakai petani lain di Lembaga tujuan → fieldError farmerId; baris sendiri dikecualikan", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    const res = await updateFarmer({ ...INPUT, farmerGroupId: "G2", farmerId: "P.02" });
    expect(res).toMatchObject({ success: false, error: { farmerId: [expect.stringMatching(/sudah terdaftar/)] } });
    expect(argOf(db.farmer.findFirst, 1).where).toEqual({ id: { not: "F1" }, farmerGroupId: "G2", farmerId: "P.02" });
    expect(db.farmer.update).not.toHaveBeenCalled();
  });

  it("ID milik petani NONAKTIF di Lembaga tujuan → tetap ditolak dengan pesan aktifkan kembali", async () => {
    const res = await updateFarmer({ ...INPUT, farmerId: "P.09", id: "F1" });
    expect(res).toMatchObject({ success: false, error: { farmerId: [expect.stringMatching(/nonaktif/)] } });
  });

  it("simpan tanpa mengubah ID (baris sendiri) → sukses; update by id, data tanpa id, modifiedBy", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    expect(await updateFarmer({ ...INPUT, name: "Budi Baru" })).toEqual({ success: true });
    const { where, data } = argOf(db.farmer.update);
    expect(where).toEqual({ id: "F1" });
    expect(data).not.toHaveProperty("id");
    expect(data).toMatchObject({ name: "Budi Baru", farmerGroupId: "G1", farmerId: "P.01", modifiedBy: "user-1" });
  });

  it("pindah ke Lembaga lain dalam scope (BY_DISTRICT) → sukses", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    expect(await updateFarmer({ ...INPUT, farmerGroupId: "G2" })).toEqual({ success: true });
    expect(argOf(db.farmer.update).data).toMatchObject({ farmerGroupId: "G2", modifiedBy: "user-1" });
  });
});
