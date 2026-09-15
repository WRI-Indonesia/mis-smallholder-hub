import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard, scope, dan aturan tulis action patok (#329/#331) — tanpa DB, pola mock
 * `land-parcel-export-guard.test.ts`. Menu key tiap entry point DI-HARDCODE di
 * server: tab Patok = master-data-parcels, unggahan = bulk-upload-parcels,
 * unduhan Peta Lahan = map-parcel, Report › Patok = report-marker, unduhan
 * Detail Lembaga = master-data-groups. Ditambah aturan yang lahir dari review
 * 2026-09-15: patok ber-Kode Patok hanya boleh disentuh bila sudah tertaut ke
 * lahan pemanggil atau ≤ 100 m dari titik yang diunggah, dan baris kedua pada
 * titik yang sama dalam SATU batch memperbarui patok yang baru dibuat, bukan
 * melahirkan kembaran.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerGroupAccessFilter: () => ({}),
  farmerRelationAccessFilter: (access: { mode: string; ids: string[] }) =>
    access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } : {},
}));

vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/s3", () => ({ s3: { send: vi.fn() }, S3_BUCKET: "bucket", getPresignedUrl: async () => "https://signed" }));
vi.mock("@aws-sdk/client-s3", () => ({ PutObjectCommand: class {} }));

const q = vi.hoisted(() => ({
  fetchSimplifiedVertices: vi.fn(),
  fetchNearbyMarkers: vi.fn(),
  distancesToParcelBoundary: vi.fn(),
  allocateMarkerCodes: vi.fn(),
}));
vi.mock("@/lib/land-marker-query", () => q);

const db = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), aggregate: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), groupBy: vi.fn(), upsert: vi.fn(),
  });
  const m = {
    landParcel: model(),
    landParcelMarker: model(),
    landMarker: model(),
    farmerGroup: model(),
    district: model(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  // Transaksi = callback dengan client yang sama (mock), pola action asli.
  m.$transaction.mockImplementation(async (fn: (tx: typeof m) => unknown) => fn(m));
  return m;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/land-marker");

const PARCEL = {
  id: "lp-1", parcelUid: "uid-1", parcelId: "HJP.0001.A", revision: 1,
  geometry: { type: "Polygon", coordinates: [[[101.19, 0.52], [101.191, 0.52], [101.191, 0.521], [101.19, 0.521], [101.19, 0.52]]] },
  farmer: { farmerGroup: { abrv: "HJP", code: "ISH-1401-03" } },
};
const POINT = { lon: 101.1905, lat: 0.5205 };

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  db.landParcel.findFirst.mockResolvedValue(PARCEL);
  db.landParcel.findMany.mockResolvedValue([PARCEL]);
  db.landParcel.groupBy.mockResolvedValue([]);
  db.landParcelMarker.findMany.mockResolvedValue([]);
  db.landParcelMarker.findFirst.mockResolvedValue(null);
  db.landParcelMarker.findUnique.mockResolvedValue(null);
  db.landParcelMarker.aggregate.mockResolvedValue({ _max: { sequenceNo: 0 } });
  db.landParcelMarker.create.mockImplementation(async ({ data }: { data: { sequenceNo: number } }) => ({ id: `link-${data.sequenceNo}` }));
  db.landParcelMarker.update.mockImplementation(async ({ where }: { where: { id: string } }) => ({ id: where.id }));
  // Tautan lahan↔patok lewat satu upsert (parcelUid_markerId) — lihat `upsertParcelLink`.
  db.landParcelMarker.upsert.mockImplementation(async ({ create }: { create: { sequenceNo: number } }) => ({ id: `link-${create.sequenceNo}` }));
  db.landParcelMarker.count.mockResolvedValue(0);
  db.landMarker.findUnique.mockResolvedValue(null);
  db.landMarker.update.mockResolvedValue({ id: "m-x" });
  let created = 0;
  db.landMarker.create.mockImplementation(async () => ({ id: `m-new-${++created}` }));
  db.farmerGroup.findFirst.mockResolvedValue({ id: "kt-1", code: "ISH-1401-03", name: "HJP" });
  db.district.findUnique.mockResolvedValue(null);
  // `geom IS NOT NULL` batch (bulkUpsertLandMarkers/matchLandMarkerUploadParcels): lahan uji ber-poligon.
  db.$queryRaw.mockResolvedValue([{ id: PARCEL.id }]);
  q.fetchSimplifiedVertices.mockResolvedValue([[{ lon: 101.19, lat: 0.52 }, { lon: 101.191, lat: 0.52 }, { lon: 101.191, lat: 0.521 }, { lon: 101.19, lat: 0.521 }]]);
  q.fetchNearbyMarkers.mockResolvedValue([]);
  q.distancesToParcelBoundary.mockImplementation(async (_id: string, pts: unknown[]) => pts.map(() => 0));
  let code = 0;
  q.allocateMarkerCodes.mockImplementation(async (_tx: unknown, prefix: string, n: number) => Array.from({ length: n }, () => `${prefix}-PTK-${String(++code).padStart(6, "0")}`));
});

const uploadRow = (o: Record<string, unknown> = {}) => ({
  landParcelId: "lp-1", code: null, sequenceNo: null, longitude: POINT.lon, latitude: POINT.lat,
  condition: "PRESENT", type: null, installedAt: null, installedBy: null, notes: null, ...o,
});

describe("guard — menu key & level per entry point (fail-closed, DB tak disentuh)", () => {
  const cases: [string, () => Promise<unknown>, string, string][] = [
    ["getLandParcelMarkers", () => actions.getLandParcelMarkers("lp-1"), "master-data-parcels", "VIEW"],
    ["previewMarkersFromPolygon", () => actions.previewMarkersFromPolygon("lp-1"), "master-data-parcels", "VIEW"],
    ["createMarkersFromPolygon", () => actions.createMarkersFromPolygon({ landParcelId: "lp-1", keepSeqNos: [1] }), "master-data-parcels", "CREATE"],
    ["createLandMarker", () => actions.createLandMarker({ landParcelId: "lp-1", longitude: POINT.lon, latitude: POINT.lat, condition: "PRESENT" }), "master-data-parcels", "CREATE"],
    ["updateLandMarker", () => actions.updateLandMarker({ landParcelId: "lp-1", markerId: "m-1", longitude: POINT.lon, latitude: POINT.lat, condition: "PRESENT" }), "master-data-parcels", "EDIT"],
    ["unlinkLandMarker", () => actions.unlinkLandMarker("lp-1", "m-1"), "master-data-parcels", "DELETE"],
    ["renumberLandMarkers", () => actions.renumberLandMarkers({ landParcelId: "lp-1", order: ["m-1"] }), "master-data-parcels", "EDIT"],
    ["getFarmerGroupMarkerExportRows", () => actions.getFarmerGroupMarkerExportRows("kt-1"), "master-data-groups", "EXPORT"],
    ["getMapMarkerExportRows", () => actions.getMapMarkerExportRows({ districtId: "1401" }), "map-parcel", "EXPORT"],
    ["getMarkerReportRows (view)", () => actions.getMarkerReportRows({ districtId: "1401" }), "report-marker", "VIEW"],
    ["getMarkerReportRows (export)", () => actions.getMarkerReportRows({ districtId: "1401" }, "export"), "report-marker", "EXPORT"],
    ["matchLandMarkerUploadParcels", () => actions.matchLandMarkerUploadParcels(["HJP.0001.A"]), "bulk-upload-parcels", "VIEW"],
    ["bulkUpsertLandMarkers", () => actions.bulkUpsertLandMarkers([uploadRow()]), "bulk-upload-parcels", "CREATE"],
  ];

  for (const [name, call, menu, level] of cases) {
    it(`${name} → ${menu}:${level}`, async () => {
      await call().catch(() => null);
      expect(hasPermission.mock.calls[0]).toEqual([menu, level]);
    });
  }

  it("izin ditolak → semua action gagal terang dan tidak menyentuh DB", async () => {
    hasPermission.mockResolvedValue(false);
    for (const [, call] of cases) {
      const res = await call().catch((e: Error) => ({ success: false, error: e.message }));
      expect(res && typeof res === "object" && "success" in res ? res.success : false).toBe(false);
    }
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
    expect(db.landMarker.update).not.toHaveBeenCalled();
  });

  it("uploadLandMarkerPhoto menerima EDIT ATAU CREATE (keduanya ditolak → gagal)", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await actions.uploadLandMarkerPhoto(new FormData());
    expect(res.success).toBe(false);
    expect(hasPermission).toHaveBeenCalledWith("master-data-parcels", "EDIT");
    expect(hasPermission).toHaveBeenCalledWith("master-data-parcels", "CREATE");
  });
});

describe("scope — lahan diambil lewat farmerRelationAccessFilter", () => {
  it("createLandMarker: lahan di luar scope (findFirst null) → ditolak sebelum menulis", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    db.landParcel.findFirst.mockResolvedValue(null);
    const res = await actions.createLandMarker({ landParcelId: "lp-1", longitude: POINT.lon, latitude: POINT.lat, condition: "PRESENT" });
    expect(res.success).toBe(false);
    expect(res.success === false && String(res.error)).toMatch(/di luar akses/);
    expect(db.landParcel.findFirst.mock.calls[0][0].where).toMatchObject({ id: "lp-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-lain"] } } });
    expect(db.landMarker.create).not.toHaveBeenCalled();
  });

  it("bulkUpsertLandMarkers: lahan di luar scope → seluruh barisnya masuk `rejected`, lahan lain tetap diproses", async () => {
    db.landParcel.findMany.mockResolvedValue([PARCEL]); // lp-2 tidak dikembalikan = di luar scope
    const res = await actions.bulkUpsertLandMarkers([uploadRow(), uploadRow({ landParcelId: "lp-2" })]);
    expect(res.success).toBe(true);
    expect(res.success && res.data?.created).toBe(1);
    expect(res.success && res.data?.rejected).toEqual([expect.objectContaining({ landParcelId: "lp-2", reason: expect.stringMatching(/di luar akses/) })]);
  });

  it("getMarkerReportRows: filter Lembaga dari klien hidup berdampingan dengan scope (AND), Distrik wajib", async () => {
    const res = await actions.getMarkerReportRows({ districtId: "" });
    expect(res.success).toBe(false);
    db.landParcel.findMany.mockResolvedValue([]);
    await actions.getMarkerReportRows({ districtId: "1401", farmerGroupId: "kt-1" });
    const where = db.landParcel.findMany.mock.calls[0][0].where.farmer.farmerGroup;
    expect(where).toMatchObject({ isActive: true, districtId: "1401", id: "kt-1" });
    expect(where).toHaveProperty("AND");
  });
});

describe("bulkUpsertLandMarkers — aturan Kode Patok (review 2026-09-15)", () => {
  it("kode patok Lembaga lain yang jauh (tidak tertaut, > 100 m) → ditolak, koordinatnya TIDAK ditimpa", async () => {
    // Patok HJP-PTK-000010 milik lahan lain, 5 km dari titik yang diunggah.
    db.landMarker.findUnique.mockResolvedValue({ id: "m-far", longitude: 101.24, latitude: 0.52 });
    const res = await actions.bulkUpsertLandMarkers([uploadRow({ code: "HJP-PTK-000010" })]);
    expect(res.success && res.data?.rejected[0]?.reason).toMatch(/bukan patok lahan ini/);
    expect(db.landMarker.update).not.toHaveBeenCalled();
    expect(db.landParcelMarker.upsert).not.toHaveBeenCalled();
  });

  it("kode patok yang sudah tertaut aktif ke lahan ini → diperbarui (source GPS)", async () => {
    db.landMarker.findUnique.mockResolvedValue({ id: "m-1", longitude: 101.24, latitude: 0.52 });
    db.landParcelMarker.findMany.mockResolvedValue([{ id: "link-1", sequenceNo: 1, markerId: "m-1" }]);
    const res = await actions.bulkUpsertLandMarkers([uploadRow({ code: "HJP-PTK-000001" })]);
    expect(res.success && res.data?.updated).toBe(1);
    expect(db.landMarker.update.mock.calls[0][0]).toMatchObject({ where: { id: "m-1" }, data: { longitude: POINT.lon, latitude: POINT.lat, source: "GPS" } });
  });

  it("kode patok lahan tetangga yang ≤ 100 m dari titik → ditautkan ke lahan ini (patok bersama)", async () => {
    db.landMarker.findUnique.mockResolvedValue({ id: "m-nb", longitude: POINT.lon + 0.0002, latitude: POINT.lat }); // ±22 m
    const res = await actions.bulkUpsertLandMarkers([uploadRow({ code: "HJP-PTK-000002" })]);
    expect(res.success && res.data?.linked).toBe(1);
    expect(db.landParcelMarker.upsert.mock.calls[0][0].create).toMatchObject({ parcelUid: "uid-1", markerId: "m-nb", sequenceNo: 1 });
  });

  it("kode tidak dikenal → ditolak dengan pesan yang menyebut kodenya", async () => {
    const res = await actions.bulkUpsertLandMarkers([uploadRow({ code: "HJP-PTK-999999" })]);
    expect(res.success && res.data?.rejected[0]?.reason).toMatch(/HJP-PTK-999999 tidak ditemukan/);
  });
});

describe("bulkUpsertLandMarkers — idempoten di dalam satu batch", () => {
  it("dua baris tanpa nomor pada titik yang sama → 1 dibuat + 1 diperbarui, bukan dua patok", async () => {
    const res = await actions.bulkUpsertLandMarkers([uploadRow(), uploadRow({ notes: "ulang" })]);
    expect(res.success && [res.data?.created, res.data?.updated, res.data?.linked]).toEqual([1, 1, 0]);
    expect(db.landMarker.create).toHaveBeenCalledTimes(1);
    expect(q.allocateMarkerCodes).toHaveBeenCalledTimes(1);
  });

  it("transaksi per lahan menaikkan timeout Prisma (2–4 query per patok; bawaan 5 s gagal P2028 lewat tunnel prod — review 2026-09-15)", async () => {
    await actions.bulkUpsertLandMarkers([uploadRow()]);
    const opts = db.$transaction.mock.calls[0][1] as { timeout?: number } | undefined;
    expect(opts?.timeout, "bulkUpsertLandMarkers tanpa { timeout } — seluruh lahan ditolak pada batch besar").toBeGreaterThanOrEqual(20_000);
  });

  it("nomor yang belum ada + titik ≤ 5 m dari patok lahan lain → tautkan (snap), bukan buat", async () => {
    q.fetchNearbyMarkers.mockResolvedValue([{ id: "m-nb", lon: POINT.lon, lat: POINT.lat, parcelIds: ["HJP.0002.A"], linkedToThisParcel: false, isActive: true }]);
    const res = await actions.bulkUpsertLandMarkers([uploadRow({ sequenceNo: 3 })]);
    expect(res.success && [res.data?.created, res.data?.linked]).toEqual([0, 1]);
    expect(db.landParcelMarker.upsert.mock.calls[0][0].create).toMatchObject({ markerId: "m-nb", sequenceNo: 3 });
  });

  it("titik > 100 m dari batas lahan → baris ditolak (guard jarak), lahan tanpa geom valid → guard dilewati", async () => {
    q.distancesToParcelBoundary.mockImplementation(async (_id: string, pts: unknown[]) => pts.map(() => 250));
    const far = await actions.bulkUpsertLandMarkers([uploadRow()]);
    expect(far.success && far.data?.rejected[0]?.reason).toMatch(/250 m dari batas lahan/);

    q.distancesToParcelBoundary.mockImplementation(async (_id: string, pts: unknown[]) => pts.map(() => Number.POSITIVE_INFINITY));
    const noGeom = await actions.bulkUpsertLandMarkers([uploadRow()]);
    expect(noGeom.success && noGeom.data?.created).toBe(1);
  });

  it("ada/tidaknya poligon dari `geom IS NOT NULL` (satu kueri batch), bukan JSON `geometry` — lahan tanpa geom: guard & snap dilewati, patok tetap dibuat (review 2026-09-15)", async () => {
    db.$queryRaw.mockResolvedValue([]); // tidak ada lahan ber-geom
    q.distancesToParcelBoundary.mockClear();
    q.fetchNearbyMarkers.mockClear();
    const res = await actions.bulkUpsertLandMarkers([uploadRow()]);
    expect(res.success && res.data?.created).toBe(1);
    expect(q.distancesToParcelBoundary).not.toHaveBeenCalled();
    expect(q.fetchNearbyMarkers).not.toHaveBeenCalled();
    // Select batch tidak menarik JSON poligon.
    expect(db.landParcel.findMany.mock.calls[0][0].select).not.toHaveProperty("geometry");
  });
});

describe("unlinkLandMarker — patok tanpa tautan aktif ikut nonaktif, yang masih dipakai tetap aktif", () => {
  it("tautan terakhir dilepas → landMarker.update isActive=false", async () => {
    db.landParcelMarker.findFirst.mockResolvedValue({ id: "link-1" });
    db.landParcelMarker.count.mockResolvedValue(0);
    const res = await actions.unlinkLandMarker("lp-1", "m-1");
    expect(res.success).toBe(true);
    expect(db.landParcelMarker.update.mock.calls[0][0]).toMatchObject({ where: { id: "link-1" }, data: { isActive: false } });
    expect(db.landMarker.update.mock.calls[0][0]).toMatchObject({ where: { id: "m-1" }, data: { isActive: false } });
  });

  it("masih ada tautan aktif di lahan lain → patok tidak dinonaktifkan", async () => {
    db.landParcelMarker.findFirst.mockResolvedValue({ id: "link-1" });
    db.landParcelMarker.count.mockResolvedValue(2);
    await actions.unlinkLandMarker("lp-1", "m-1");
    expect(db.landMarker.update).not.toHaveBeenCalled();
  });
});
