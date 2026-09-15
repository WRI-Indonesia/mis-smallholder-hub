import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & kontrak dua action baca siklus #331/#332 — tanpa DB, pola mock
 * `land-parcel-export-guard.test.ts`:
 * - `getNktReportData` (Report › Lahan › Laporan NKT): PRINT `report-land-parcel`,
 *   Lembaga wajib dalam cakupan akses, SELURUH lahan aktif (bukan hasil filter),
 *   tanggal asesmen diserialisasi yyyy-mm-dd, tanpa kueri patok (revisi 3 KPI).
 * - `getMapMarkers` (Peta Lahan, layer patok malas): VIEW `map-parcel`, scope
 *   lewat AND (anti BUG-007), tuple ringkas + NKT turunan dari lahan pemakai.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerGroupAccessFilter: (access: { mode: string; ids: string[] }) =>
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } : access.mode === "BY_DISTRICT" ? { districtId: { in: access.ids } } : {},
  farmerRelationAccessFilter: () => ({}),
  getAccessibleDistrictIds: async () => null,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/parcel-passport-query", () => ({ fetchParcelPassport: vi.fn(), computeFarmerTrainingItems: vi.fn() }));
vi.mock("@/lib/land-marker-query", () => ({ fetchFarmerGroupMarkerPoints: vi.fn(), fetchFarmerMarkerPoints: vi.fn() }));

const db = vi.hoisted(() => ({
  farmerGroup: { findFirst: vi.fn(), findMany: vi.fn() },
  landParcel: { findMany: vi.fn(), count: vi.fn() },
  landMarker: { findMany: vi.fn(), count: vi.fn() },
  district: { findMany: vi.fn() },
  province: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getNktReportData } = await import("@/server/actions/report");
const { getMapMarkers } = await import("@/server/actions/map");
const { getFarmerGroupNktReportData } = await import("@/server/actions/farmer-group");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  db.farmerGroup.findFirst.mockResolvedValue({ id: "kt-1", name: "KP Hasrat Jaya Pagaruyung", code: "ISH-1401-03", abrv: "HJP", district: { name: "Kampar" } });
  db.landParcel.findMany.mockResolvedValue([
    {
      id: "lp-1", parcelId: "HJP.0001.A", area: 1.95, subGroupLv2: null, blok: "17 L", geometry: { type: "Polygon", coordinates: [] },
      farmer: { name: "Abdul Halim", farmerId: "HJP.14.01.10.2011.0001" },
      identity: { nkt: { status: "AFFECTED", categories: ["NKT_4"], affectedAreaHa: 0.09, affectedLengthM: 176, assessedAt: new Date("2025-03-12T00:00:00Z"), assessor: null, source: "Lampiran III", notes: null } },
    },
    { id: "lp-2", parcelId: "HJP.0002.A", area: 0.45, subGroupLv2: null, blok: "15 L", geometry: null, farmer: { name: "Agus", farmerId: "HJP.2" }, identity: { nkt: null } },
  ]);
  db.landMarker.findMany.mockResolvedValue([]);
});

describe("getNktReportData — Laporan NKT per Lembaga (#332)", () => {
  it("digate report-land-parcel:PRINT; ditolak → tanpa DB", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await getNktReportData("kt-1");
    expect(res.success).toBe(false);
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("report-land-parcel", "PRINT");
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });

  it("Lembaga di luar cakupan (BY_DISTRICT lain) → 'tidak memiliki akses', where memuat districtId", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1404"] });
    db.farmerGroup.findFirst.mockResolvedValue(null);
    const res = await getNktReportData("kt-1");
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatch(/tidak memiliki akses/);
    // Scope lewat AND (anti BUG-007) — pemuat bersama `loadNktReportData`.
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toMatchObject({ id: "kt-1", isActive: true, AND: { districtId: { in: ["1404"] } } });
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });

  it("memuat SELURUH lahan aktif Lembaga (bukan hasil filter) — tanpa kueri patok sejak revisi 3 KPI", async () => {
    const res = await getNktReportData("kt-1");
    expect(res.success).toBe(true);
    const where = db.landParcel.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ isActive: true, farmer: { isActive: true, farmerGroupId: "kt-1" } });
    expect(db.landMarker.count).not.toHaveBeenCalled();
    expect(res.success && res.data).not.toHaveProperty("markersNkt");
  });

  it("pintu kedua Detail Lembaga: getFarmerGroupNktReportData digate master-data-groups:PRINT — data identik dari pemuat bersama", async () => {
    const res = await getFarmerGroupNktReportData("kt-1");
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("master-data-groups", "PRINT");
    expect(res.success && res.data?.parcels.length).toBe(2);
    hasPermission.mockResolvedValue(false);
    const denied = await getFarmerGroupNktReportData("kt-1");
    expect(denied.success).toBe(false);
    expect(hasPermission).not.toHaveBeenCalledWith("report-land-parcel", "PRINT");
  });

  it("baris NKT diserialisasi: assessedAt → 'yyyy-mm-dd', lahan tanpa NKT → null, kop Lembaga + Distrik", async () => {
    const res = await getNktReportData("kt-1");
    expect(res.success && res.data?.group).toEqual({ name: "KP Hasrat Jaya Pagaruyung", code: "ISH-1401-03", abrv: "HJP", districtName: "Kampar" });
    expect(res.success && res.data?.parcels.map((p) => p.nkt?.assessedAt ?? null)).toEqual(["2025-03-12", null]);
    expect(res.success && res.data?.parcels[1].nkt).toBeNull();
    expect(res.success && typeof res.data?.printedAt).toBe("string");
  });
});

describe("getMapMarkers — layer patok malas Peta Lahan (#331)", () => {
  it("digate map-parcel:VIEW; ditolak → tanpa DB", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await getMapMarkers({ districtId: "1401" });
    expect(res.success).toBe(false);
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("map-parcel", "VIEW");
    expect(db.landMarker.findMany).not.toHaveBeenCalled();
  });

  it("filter Distrik/Lembaga dari klien + scope user hidup berdampingan lewat AND (anti BUG-007)", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    await getMapMarkers({ districtId: "1401", farmerGroupId: "kt-2" });
    const groupWhere = db.landMarker.findMany.mock.calls[0][0].where.parcels.some.parcel.revisions.some.farmer.farmerGroup;
    expect(groupWhere).toMatchObject({ isActive: true, districtId: "1401", id: "kt-2", AND: { id: { in: ["kt-1"] } } });
  });

  it("tuple ringkas: NKT = 1 bila SALAH SATU lahan pemakai kena NKT; 'ID Lahan #n' digabung", async () => {
    db.landMarker.findMany.mockResolvedValue([
      { id: "m-1", code: "HJP-PTK-000001", longitude: 101.19, latitude: 0.52, condition: "PRESENT", parcels: [
        { sequenceNo: 2, parcel: { parcelId: "HJP.0001.A", nkt: { status: "AFFECTED" } } },
        { sequenceNo: 4, parcel: { parcelId: "HJP.0002.A", nkt: null } },
      ] },
      { id: "m-2", code: "HJP-PTK-000002", longitude: 101.2, latitude: 0.53, condition: "MISSING", parcels: [
        { sequenceNo: 1, parcel: { parcelId: "HJP.0003.A", nkt: { status: "NOT_AFFECTED" } } },
      ] },
    ]);
    const res = await getMapMarkers({ districtId: "1401" });
    expect(res.success && res.data?.markers).toEqual([
      ["m-1", 101.19, 0.52, 1, "PRESENT", "HJP.0001.A #2; HJP.0002.A #4", "HJP-PTK-000001"],
      ["m-2", 101.2, 0.53, 0, "MISSING", "HJP.0003.A #1", "HJP-PTK-000002"],
    ]);
  });

  it("filter tidak valid (tanpa districtId) → gagal sebelum DB", async () => {
    const res = await getMapMarkers({ districtId: "" });
    expect(res.success).toBe(false);
    expect(db.landMarker.findMany).not.toHaveBeenCalled();
  });
});
