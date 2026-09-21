import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard 3 lapis action Ketersediaan Data (#352) — tanpa DB: izin VIEW wajib
 * sebelum kueri; scope BY_FARMER_GROUP / BY_DISTRICT dipasang pada kueri utama
 * DAN pada 13 kueri id-set satelit (`loadModuleFlagSets`) lewat relasi
 * `parcel.farmer` / `farmerGroup` — bukan spread `districtId` literal
 * (pitfall BUG-007); `LandParcelNkt` & `LandParcelBorder` sengaja tanpa
 * `isActive` (semantik hapusnya berbeda); `?lembaga=` di luar scope → pesan
 * "di luar akses" / "Tidak memiliki akses".
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
// `@/lib/access-context` menarik next-auth (tak ada `next/server` di env node)
// → hanya `getAccessContext` yang di-mock; helper scope murni
// (`farmerGroupAccessFilter`, `rawFarmerGroupScope`) diimpor action dari
// `@/lib/access-scope` yang ASLI, jadi jalur SQL mentah diuji sungguhan
// (review pra-rilis #352: sebelumnya salinan).
vi.mock("@/lib/access-context", () => ({ getAccessContext }));

const db = vi.hoisted(() => {
  const groupBy = () => vi.fn().mockResolvedValue([]);
  const findMany = () => vi.fn().mockResolvedValue([]);
  return {
    $queryRaw: vi.fn().mockResolvedValue([]),
    trainingPackage: { findMany: findMany() },
    farmerGroup: { findFirst: vi.fn(), findMany: findMany() },
    district: { findMany: findMany() },
    landParcel: { findMany: findMany() },
    productionRecord: { findMany: findMany() },
    landParcelDocument: { groupBy: groupBy() },
    landParcelStdb: { groupBy: groupBy() },
    landParcelExternalId: { groupBy: groupBy() },
    landParcelNkt: { findMany: findMany() },
    landParcelBorder: { findMany: findMany() },
    landParcelMarker: { groupBy: groupBy() },
    landParcelProgram: { groupBy: groupBy() },
    tree: { groupBy: groupBy() },
    landStdb: { groupBy: groupBy() },
    bmpAssessment: { groupBy: groupBy() },
    farmerGroupBoundary: { groupBy: groupBy() },
    referenceBenchmark: { findMany: findMany() },
    bmpGroupAssessment: { groupBy: groupBy() },
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { analyzeFarmerGroupCompleteness } = await import("@/server/actions/data-completeness");
const { getDataAvailabilityView } = await import("@/server/actions/data-availability");

const GROUP = {
  id: "g-1",
  name: "Lembaga A",
  code: "A",
  abrv: "A",
  joinYear: 2015,
  groupType: "KOPERASI",
  establishedYear: 2010,
  rspoCertStatus: null,
  ispoCertStatus: null,
  sapMapAssuranceStatus: null,
  locationLat: 1,
  locationLong: 101,
  districtId: "d-1",
  category: "SWADAYA",
  district: { id: "d-1", name: "Distrik" },
  activities: [],
  farmers: [],
};

const SATELLITE_QUERIES = [
  db.landParcelDocument.groupBy,
  db.landParcelStdb.groupBy,
  db.landParcelExternalId.groupBy,
  db.landParcelNkt.findMany,
  db.landParcelBorder.findMany,
  db.landParcelMarker.groupBy,
  db.landParcelProgram.groupBy,
  db.tree.groupBy,
  db.landStdb.groupBy,
  db.bmpAssessment.groupBy,
  db.farmerGroupBoundary.groupBy,
  db.referenceBenchmark.findMany,
  db.bmpGroupAssessment.groupBy,
];

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  db.farmerGroup.findFirst.mockResolvedValue(GROUP);
  db.farmerGroup.findMany.mockResolvedValue([GROUP]);
  for (const q of SATELLITE_QUERIES) q.mockResolvedValue([]);
  db.trainingPackage.findMany.mockResolvedValue([]);
  db.landParcel.findMany.mockResolvedValue([]);
  db.productionRecord.findMany.mockResolvedValue([]);
  db.$queryRaw.mockResolvedValue([]);
});

describe("guard izin", () => {
  it("VIEW ditolak → kedua action melempar tanpa menyentuh DB", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(analyzeFarmerGroupCompleteness("g-1")).rejects.toThrow(/izin/);
    await expect(getDataAvailabilityView()).rejects.toThrow(/izin/);
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    for (const q of SATELLITE_QUERIES) expect(q).not.toHaveBeenCalled();
  });
});

describe("analyzeFarmerGroupCompleteness — scope", () => {
  it("BY_FARMER_GROUP: Lembaga di luar daftar → 'Tidak memiliki akses' sebelum kueri", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-9"] });
    await expect(analyzeFarmerGroupCompleteness("g-1")).rejects.toThrow(/akses/);
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
    for (const q of SATELLITE_QUERIES) expect(q).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("kueri PostGIS mentah (boundary, luas poligon, koordinat) membawa scope Lembaga & distrik sebagai parameter", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d-1"] });
    await analyzeFarmerGroupCompleteness("g-1");
    // 4 kueri mentah; tiap kueri menyisipkan array scope (id Lembaga + distrik) sebagai nilai parameter.
    expect(db.$queryRaw).toHaveBeenCalledTimes(4);
    for (const call of db.$queryRaw.mock.calls) {
      const values = JSON.stringify(call.slice(1));
      expect(values).toContain('["g-1"]');
      expect(values).toContain('["d-1"]');
    }
  });

  it("BY_DISTRICT: kueri Lembaga DAN satelit difilter districtId; Lembaga luar distrik → 'di luar akses'", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d-1"] });
    db.farmerGroup.findFirst.mockResolvedValue(null);
    await expect(analyzeFarmerGroupCompleteness("g-1")).rejects.toThrow(/di luar akses/);
    const groupWhere = { id: "g-1", isActive: true, districtId: { in: ["d-1"] } };
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toMatchObject(groupWhere);
    // Satelit tidak dimuat "lalu dibuang": scope distrik ikut di relasi Lembaga (review #352).
    expect(db.landParcelDocument.groupBy.mock.calls[0][0].where).toMatchObject({
      parcel: { farmer: { isActive: true, farmerGroup: groupWhere } },
    });
    expect(db.farmerGroupBoundary.groupBy.mock.calls[0][0].where).toMatchObject({ farmerGroup: groupWhere });
    expect(db.productionRecord.findMany.mock.calls[0][0].where).toMatchObject({
      isActive: true,
      farmer: { isActive: true, farmerGroup: groupWhere },
      notes: { contains: "estimasi", mode: "insensitive" },
    });
    // Poligon GeoJSON tidak diangkut — kehadiran geometry lewat id-set ber-scope (review pra-rilis #352).
    const parcelSelect = db.farmerGroup.findFirst.mock.calls[0][0].select.farmers.select.landParcels.select;
    expect(parcelSelect.geometry).toBeUndefined();
    expect(db.landParcel.findMany.mock.calls[0][0]).toMatchObject({
      where: { isActive: true, geometry: { not: expect.anything() }, farmer: { isActive: true, farmerGroup: groupWhere } },
      select: { id: true },
    });
  });

  it("13 kueri satelit memakai scope Lembaga lewat relasi petani/Lembaga, bukan id-set persil", async () => {
    const result = await analyzeFarmerGroupCompleteness("g-1");
    expect(result.group.id).toBe("g-1");
    expect(result.moduleCoverage.length).toBeGreaterThan(0);

    const groupWhere = { id: "g-1", isActive: true };
    const farmerWhere = { isActive: true, farmerGroup: groupWhere };
    const parcelScope = { isActive: true, farmer: farmerWhere };
    const arg = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls[0][0];

    expect(arg(db.landParcelDocument.groupBy).where).toMatchObject({ isActive: true, parcel: parcelScope });
    expect(arg(db.landParcelStdb.groupBy).where).toMatchObject({
      isActive: true,
      stdb: { isActive: true, stage: "TERBIT" },
      parcel: parcelScope,
    });
    expect(arg(db.landParcelExternalId.groupBy).where).toMatchObject({ isActive: true, parcel: parcelScope });
    expect(arg(db.landParcelMarker.groupBy).where).toMatchObject({
      isActive: true,
      marker: { isActive: true },
      parcel: parcelScope,
    });
    expect(arg(db.landParcelProgram.groupBy).where).toMatchObject({ isActive: true, parcel: parcelScope });
    // Tree menunjuk baris revisi LandParcel — scope lewat landParcel.farmer.
    expect(arg(db.tree.groupBy).where).toMatchObject({
      isActive: true,
      landParcel: { isActive: true, farmer: farmerWhere },
    });
    expect(arg(db.landStdb.groupBy).where).toMatchObject({ isActive: true, farmer: farmerWhere });
    expect(arg(db.bmpAssessment.groupBy).where).toMatchObject({ isActive: true, farmer: farmerWhere });
    expect(arg(db.bmpAssessment.groupBy).where.surveyYear).toBe(new Date().getFullYear());
    expect(arg(db.farmerGroupBoundary.groupBy).where).toMatchObject({ isActive: true, farmerGroup: groupWhere });
    expect(arg(db.referenceBenchmark.findMany).where).toMatchObject({ isActive: true, farmerGroup: groupWhere });
    expect(arg(db.bmpGroupAssessment.groupBy).where).toMatchObject({ isActive: true, farmerGroup: groupWhere });

    // NKT & Border: semantik hapus berbeda → TANPA filter isActive (docs/database/models.md).
    expect(arg(db.landParcelNkt.findMany).where).toEqual({ parcel: parcelScope });
    expect(arg(db.landParcelNkt.findMany).where).not.toHaveProperty("isActive");
    const border = arg(db.landParcelBorder.findMany).where;
    expect(border).not.toHaveProperty("isActive");
    expect(border).toMatchObject({ parcel: parcelScope, north: { not: null }, west: { not: null } });
  });
});

describe("getDataAvailabilityView — scope satelit lintas Lembaga", () => {
  it("BY_FARMER_GROUP: kueri utama, geometry, dan satelit sama-sama dibatasi ke Lembaga scope lewat relasi", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-1"] });
    const view = await getDataAvailabilityView();
    expect(view.data.groups).toHaveLength(1);
    expect(view.data.groups[0].moduleCoverage.length).toBeGreaterThan(0);

    const groupWhere = { isActive: true, id: { in: ["g-1"] } };
    const farmerWhere = { isActive: true, farmerGroup: groupWhere };
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toMatchObject(groupWhere);
    expect(db.landParcel.findMany.mock.calls[0][0].where).toMatchObject({ isActive: true, farmer: farmerWhere });
    // Kolom `notes` produksi tidak ikut kueri utama; scan id-set "Estimasi" pun
    // DILEWATI di DA-03 — labelnya hanya dipakai kartu DA-02 (review pra-rilis #352).
    const farmerSelect = db.farmerGroup.findMany.mock.calls[0][0].select.farmers.select;
    expect(farmerSelect.productionRecords.select).toEqual({ id: true, parcelId: true, period: true, yieldKg: true });
    expect(db.productionRecord.findMany).not.toHaveBeenCalled();
    expect(db.landParcelDocument.groupBy.mock.calls[0][0].where).toMatchObject({
      isActive: true,
      parcel: { isActive: true, farmer: farmerWhere },
    });
    expect(db.tree.groupBy.mock.calls[0][0].where).toMatchObject({ landParcel: { isActive: true, farmer: farmerWhere } });
    expect(db.farmerGroupBoundary.groupBy.mock.calls[0][0].where).toMatchObject({ isActive: true, farmerGroup: groupWhere });
    expect(db.landParcelNkt.findMany.mock.calls[0][0].where).toEqual({ parcel: { isActive: true, farmer: farmerWhere } });
  });

  it("BY_DISTRICT: scope districtId dipasang lewat relasi farmerGroup, bukan literal di satelit", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d-1"] });
    await getDataAvailabilityView();
    const groupWhere = { isActive: true, districtId: { in: ["d-1"] } };
    expect(db.landStdb.groupBy.mock.calls[0][0].where).toMatchObject({
      isActive: true,
      farmer: { isActive: true, farmerGroup: groupWhere },
    });
    expect(db.landStdb.groupBy.mock.calls[0][0].where).not.toHaveProperty("districtId");
  });
});
