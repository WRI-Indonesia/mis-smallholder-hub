import { describe, it, expect, vi, beforeEach } from "vitest";
import { matches, type Row } from "./prisma-where";

/**
 * Guard 3 lapis action Peta Lahan (`src/server/actions/map.ts`) — tanpa DB:
 * `requireView` (map-parcel VIEW) di semua pintu baca, getMapData (izin → Zod →
 * scope lewat AND), popup lahan (pelatihan petani & produksi lahan ber-scope
 * id + isActive), dan Profil Lahan (map-parcel PRINT). getMapMarkers sudah di
 * `nkt-report-map-marker-guard.test.ts`; getBmpMapData di
 * `bmp-map-annualize-guard.test.ts`; filter distrik getFarmerGroupsForMap di
 * `scope-collision-guard.test.ts` — tidak diulang.
 *
 * Data contoh: G1 (D1) · G2 (D1) · G3 (D2); satu petani + satu lahan per Lembaga.
 */
const GROUPS: Row[] = [
  { id: "G1", name: "Lembaga 1", code: "C1", districtId: "D1", isActive: true, district: { name: "D1", provinceId: "P1" } },
  { id: "G2", name: "Lembaga 2", code: "C2", districtId: "D1", isActive: true, district: { name: "D1", provinceId: "P1" } },
  { id: "G3", name: "Lembaga 3", code: "C3", districtId: "D2", isActive: true, district: { name: "D2", provinceId: "P2" } },
];
const FARMERS: Row[] = GROUPS.map((g, i) => ({ id: `F${i + 1}`, isActive: true, farmerGroupId: g.id, farmerGroup: g }));
const PARCELS: Row[] = FARMERS.map((f, i) => ({ id: `LP${i + 1}`, isActive: true, farmer: f }));

const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
  // Asli (BY_FARMER_GROUP → distrik Lembaga lewat prisma tiruan di bawah).
  getAccessibleDistrictIds: (await vi.importActual<typeof import("@/lib/access-context")>("@/lib/access-context")).getAccessibleDistrictIds,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
const passport = vi.hoisted(() => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));
vi.mock("@/lib/parcel-passport-query", () => passport);

const db = vi.hoisted(() => ({
  province: { findMany: vi.fn() },
  district: { findMany: vi.fn() },
  farmerGroup: { findMany: vi.fn() },
  farmer: { findFirst: vi.fn() },
  landParcel: { findMany: vi.fn(), findFirst: vi.fn() },
  landMarker: { count: vi.fn() },
  productionRecord: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const map = await import("@/server/actions/map");

const DENIED = /Tidak memiliki izin/;
const expectNoDb = () => {
  for (const fn of Object.values(db).flatMap((m) => Object.values(m))) expect(fn).not.toHaveBeenCalled();
};
const whereOf = (fn: { mock: { calls: unknown[][] } }, i = 0) => (fn.mock.calls[i][0] as { where: Record<string, unknown> }).where;

const BY_GROUP = { mode: "BY_FARMER_GROUP", ids: ["G1"] };
const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["D1"] };

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.province.findMany.mockResolvedValue([]);
  db.district.findMany.mockResolvedValue([]);
  db.farmerGroup.findMany.mockImplementation(async ({ where }: { where: unknown }) => GROUPS.filter((g) => matches(g, where)));
  db.farmer.findFirst.mockImplementation(async ({ where }: { where: unknown }) => FARMERS.find((f) => matches(f, where)) ?? null);
  db.landParcel.findMany.mockImplementation(async ({ where }: { where: unknown }) => PARCELS.filter((p) => matches(p, where)));
  db.landParcel.findFirst.mockImplementation(async ({ where }: { where: unknown }) => PARCELS.find((p) => matches(p, where)) ?? null);
  db.landMarker.count.mockResolvedValue(0);
  db.productionRecord.findMany.mockResolvedValue([]);
  passport.computeFarmerTrainingItems.mockResolvedValue([]);
  passport.fetchParcelPassport.mockResolvedValue({ success: true, data: {} });
});

describe("requireView — map-parcel VIEW di semua pintu baca", () => {
  const cases: [string, () => Promise<unknown>][] = [
    ["getProvincesForMap", () => map.getProvincesForMap()],
    ["getDistrictsForMap", () => map.getDistrictsForMap("P1")],
    ["getFarmerGroupsForMap", () => map.getFarmerGroupsForMap("D1")],
    ["getFarmerTraining", () => map.getFarmerTraining("F1")],
    ["getParcelProduction", () => map.getParcelProduction("LP1")],
  ];
  for (const [name, call] of cases) {
    it(`${name}: ditolak → melempar tanpa kueri`, async () => {
      hasPermission.mockResolvedValue(false);
      await expect(call()).rejects.toThrow(DENIED);
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith("map-parcel", "VIEW");
      expect(getAccessContext).not.toHaveBeenCalled();
      expectNoDb();
      expect(passport.computeFarmerTrainingItems).not.toHaveBeenCalled();
    });
  }
});

describe("dropdown Provinsi/Distrik — scope akses", () => {
  it("Provinsi ALL → semua provinsi aktif tanpa batasan distrik", async () => {
    await map.getProvincesForMap();
    expect(whereOf(db.province.findMany)).toEqual({ isActive: true });
  });

  it("Provinsi BY_DISTRICT → hanya provinsi yang memuat distrik user; tanpa distrik → [] tanpa kueri", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await map.getProvincesForMap();
    expect(whereOf(db.province.findMany)).toEqual({ isActive: true, districts: { some: { id: { in: ["D1"] } } } });

    vi.clearAllMocks();
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: [] });
    expect(await map.getProvincesForMap()).toEqual([]);
    expect(db.province.findMany).not.toHaveBeenCalled();
  });

  it("Distrik BY_FARMER_GROUP → distrik turunan Lembaga user (isActive + provinsi diminta)", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await map.getDistrictsForMap("P1");
    expect(whereOf(db.district.findMany)).toEqual({ isActive: true, provinceId: "P1", id: { in: ["D1"] } });
  });
});

describe("getMapData — izin → Zod → scope lewat AND", () => {
  it("tanpa VIEW → success false, tanpa kueri", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await map.getMapData({ districtId: "D1" } as never);
    expect(res).toEqual({ success: false, error: expect.stringMatching(DENIED) });
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("map-parcel", "VIEW");
    expectNoDb();
  });

  it("distrik kosong / tipe salah → pesan Zod, tanpa kueri", async () => {
    expect(await map.getMapData({ districtId: "" } as never)).toEqual({ success: false, error: "Distrik wajib dipilih" });
    expect(await map.getMapData({ districtId: "D1", farmerGroupId: 7 } as never)).toMatchObject({ success: false });
    expect(getAccessContext).not.toHaveBeenCalled();
    expectNoDb();
  });

  it("BY_FARMER_GROUP + Lembaga lain di distrik yang sama → literal id tetap, scope di AND → tanpa Lembaga & lahan", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    const res = await map.getMapData({ districtId: "D1", farmerGroupId: "G2" } as never);
    expect(res.success).toBe(true);
    const groupWhere = whereOf(db.farmerGroup.findMany);
    expect(groupWhere).toEqual({ isActive: true, districtId: "D1", id: "G2", AND: { id: { in: ["G1"] } } });
    expect(await db.farmerGroup.findMany.mock.results[0].value).toEqual([]);
    expect(await db.landParcel.findMany.mock.results[0].value).toEqual([]);
  });

  it("BY_DISTRICT + distrik lain → scope distrik tak tertimpa; lahan & patok memakai groupWhere yang sama, isActive", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await map.getMapData({ districtId: "D2", provinceId: "P2" } as never);
    const groupWhere = whereOf(db.farmerGroup.findMany);
    expect(groupWhere).toMatchObject({ districtId: "D2", district: { provinceId: "P2" }, AND: { districtId: { in: ["D1"] } } });
    expect(await db.farmerGroup.findMany.mock.results[0].value).toEqual([]);

    const parcelWhere = whereOf(db.landParcel.findMany);
    expect(parcelWhere).toMatchObject({ isActive: true, farmer: { isActive: true, farmerGroup: groupWhere } });
    expect(await db.landParcel.findMany.mock.results[0].value).toEqual([]);

    const markerWhere = whereOf(db.landMarker.count) as { isActive: boolean; parcels: unknown };
    expect(markerWhere.isActive).toBe(true);
    expect(markerWhere.parcels).toEqual({
      some: { isActive: true, parcel: { revisions: { some: { isActive: true, farmer: { isActive: true, farmerGroup: groupWhere } } } } },
    });
  });

  it("dalam scope → lahan Lembaga user saja", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await map.getMapData({ districtId: "D1" } as never);
    expect((await db.landParcel.findMany.mock.results[0].value).map((p: Row) => p.id)).toEqual(["LP1", "LP2"]);
  });
});

describe("popup lahan — pelatihan petani & produksi lahan ber-scope by id", () => {
  it("getFarmerTraining: petani Lembaga lain → melempar, pelatihan tak dihitung", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await expect(map.getFarmerTraining("F2")).rejects.toThrow(/tidak ditemukan/);
    expect(whereOf(db.farmer.findFirst)).toEqual({ id: "F2", isActive: true, farmerGroup: { id: { in: ["G1"] } } });
    expect(passport.computeFarmerTrainingItems).not.toHaveBeenCalled();
  });

  it("getFarmerTraining: petani dalam scope → item pelatihan petani itu", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    passport.computeFarmerTrainingItems.mockResolvedValue([{ code: "X" }]);
    expect(await map.getFarmerTraining("F2")).toEqual([{ code: "X" }]);
    expect(passport.computeFarmerTrainingItems).toHaveBeenCalledExactlyOnceWith("F2");
  });

  it("getParcelProduction: lahan di distrik lain → melempar, produksi tak dikueri", async () => {
    getAccessContext.mockResolvedValue(BY_DISTRICT);
    await expect(map.getParcelProduction("LP3")).rejects.toThrow(/tidak ditemukan/);
    expect(whereOf(db.landParcel.findFirst)).toEqual({
      id: "LP3",
      isActive: true,
      farmer: { isActive: true, farmerGroup: { districtId: { in: ["D1"] } } },
    });
    expect(db.productionRecord.findMany).not.toHaveBeenCalled();
  });

  it("getParcelProduction: lahan nonaktif → melempar", async () => {
    db.landParcel.findFirst.mockImplementation(async ({ where }: { where: unknown }) =>
      [{ ...PARCELS[0], isActive: false }].find((p) => matches(p, where)) ?? null,
    );
    await expect(map.getParcelProduction("LP1")).rejects.toThrow(/tidak ditemukan/);
    expect(db.productionRecord.findMany).not.toHaveBeenCalled();
  });

  it("getParcelProduction: dalam scope → hanya record aktif lahan itu", async () => {
    getAccessContext.mockResolvedValue(BY_GROUP);
    await map.getParcelProduction("LP1");
    expect(whereOf(db.productionRecord.findMany)).toEqual({ parcelId: "LP1", isActive: true });
  });
});

describe("getParcelPassport — map-parcel PRINT", () => {
  it("tanpa PRINT → success false, passport tak diambil", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await map.getParcelPassport("LP1");
    expect(res.success).toBe(false);
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("map-parcel", "PRINT");
    expect(passport.fetchParcelPassport).not.toHaveBeenCalled();
  });

  it("PRINT → diteruskan ke pemuat bersama dengan flag produksi", async () => {
    await map.getParcelPassport("LP1", false);
    expect(passport.fetchParcelPassport).toHaveBeenCalledExactlyOnceWith("LP1", false);
    await map.getParcelPassport("LP2");
    expect(passport.fetchParcelPassport).toHaveBeenLastCalledWith("LP2", true);
  });
});
