import { describe, it, expect, vi, beforeEach } from "vitest";
import { MARKER_SNAP_M, planMarkersFromVertices } from "@/lib/land-marker";

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
const { s3 } = await import("@/lib/s3");
const s3Send = vi.mocked(s3.send);

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

describe("uploadLandMarkerPhoto — validasi berkas & kepemilikan sebelum S3 (audit 2026-10-12)", () => {
  const form = (o: { file?: File | null; landParcelId?: string; markerId?: string } = {}) => {
    const fd = new FormData();
    const file = o.file === undefined ? new File([new Uint8Array([0xff, 0xd8, 0xff])], "Foto Patok 1.JPG", { type: "image/jpeg" }) : o.file;
    if (file) fd.set("file", file);
    fd.set("landParcelId", o.landParcelId ?? "lp-1");
    fd.set("markerId", o.markerId ?? "m-1");
    return fd;
  };
  const expectNothingWritten = () => {
    expect(s3Send).not.toHaveBeenCalled();
    expect(db.landMarker.update).not.toHaveBeenCalled();
  };

  it("berkas kosong (field file tidak ada) → ditolak tanpa kueri", async () => {
    expect(await actions.uploadLandMarkerPhoto(form({ file: null }))).toEqual({ success: false, error: "Berkas atau patok tidak ditemukan" });
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("tipe text/plain → 'Hanya JPG, PNG, atau WebP' sebelum lahan dibaca & sebelum s3.send", async () => {
    const txt = new File(["halo"], "catatan.txt", { type: "text/plain" });
    expect(await actions.uploadLandMarkerPhoto(form({ file: txt }))).toEqual({ success: false, error: "Hanya JPG, PNG, atau WebP" });
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("ukuran > 5 MB → ditolak sebelum s3.send", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "besar.jpg", { type: "image/jpeg" });
    expect(await actions.uploadLandMarkerPhoto(form({ file: big }))).toEqual({ success: false, error: "Ukuran foto maksimal 5 MB" });
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("lahan di luar scope → 'di luar akses' tanpa cek tautan; where lahan memuat id + scope", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    db.landParcel.findFirst.mockResolvedValue(null);
    const res = await actions.uploadLandMarkerPhoto(form());
    expect(res).toMatchObject({ success: false, error: expect.stringMatching(/di luar akses/) });
    expect(db.landParcel.findFirst.mock.calls[0][0].where).toEqual({ id: "lp-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-lain"] } } });
    expect(db.landParcelMarker.findFirst).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("markerId milik lahan lain (tak tertaut aktif ke lahan ini) → 'tidak ditemukan pada lahan ini', update tak dipanggil", async () => {
    db.landParcelMarker.findFirst.mockResolvedValue(null);
    const res = await actions.uploadLandMarkerPhoto(form({ markerId: "m-lain" }));
    expect(res).toEqual({ success: false, error: "Patok tidak ditemukan pada lahan ini" });
    expect(db.landParcelMarker.findFirst.mock.calls[0][0].where).toEqual({ parcelUid: "uid-1", markerId: "m-lain", isActive: true });
    expectNothingWritten();
  });

  it("valid → kunci land-marker/<markerId>/<ts>-<nama-tersanitasi>, photoKey disimpan + modifiedBy", async () => {
    db.landParcelMarker.findFirst.mockResolvedValue({ id: "link-1" });
    s3Send.mockResolvedValue({} as never);
    const res = await actions.uploadLandMarkerPhoto(form());
    expect(res.success).toBe(true);
    expect(s3Send).toHaveBeenCalledOnce();
    const { where, data } = db.landMarker.update.mock.calls[0][0];
    expect(where).toEqual({ id: "m-1" });
    expect(data.photoKey).toMatch(/^land-marker\/m-1\/\d+-foto-patok-1\.jpg$/);
    expect(data).toMatchObject({ photoName: "Foto Patok 1.JPG", modifiedBy: "user-1" });
  });
});

describe("updateLandMarker & createMarkersFromPolygon — Zod, scope, poligon (audit 2026-10-12)", () => {
  const UPDATE = { landParcelId: "lp-1", markerId: "m-1", longitude: POINT.lon, latitude: POINT.lat, condition: "PRESENT" };

  it("updateLandMarker: Zod gagal (bujur di luar rentang, kondisi asing) → fieldErrors tanpa kueri", async () => {
    const res = await actions.updateLandMarker({ ...UPDATE, longitude: 999, condition: "HILANG" });
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatchObject({ longitude: expect.any(Array), condition: expect.any(Array) });
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
    expect(db.landMarker.update).not.toHaveBeenCalled();
  });

  it("updateLandMarker: lahan di luar scope → 'di luar akses', tautan tak dicek, update tak dipanggil", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    db.landParcel.findFirst.mockResolvedValue(null);
    const res = await actions.updateLandMarker(UPDATE);
    expect(res).toMatchObject({ success: false, error: expect.stringMatching(/di luar akses/) });
    expect(db.landParcel.findFirst.mock.calls[0][0].where).toEqual({ id: "lp-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-lain"] } } });
    expect(db.landParcelMarker.findFirst).not.toHaveBeenCalled();
    expect(db.landMarker.update).not.toHaveBeenCalled();
  });

  it("createMarkersFromPolygon: Zod gagal (tanpa vertex dicentang) → pesan dari skema, tanpa kueri", async () => {
    expect(await actions.createMarkersFromPolygon({ landParcelId: "lp-1", keepSequenceNos: [] })).toEqual({ success: false, error: "Pilih minimal satu vertex" });
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
  });

  it("createMarkersFromPolygon: lahan di luar scope → 'di luar akses', vertex tak dihitung, tanpa transaksi", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    db.landParcel.findFirst.mockResolvedValue(null);
    const res = await actions.createMarkersFromPolygon({ landParcelId: "lp-1", keepSequenceNos: [1] });
    expect(res).toMatchObject({ success: false, error: expect.stringMatching(/di luar akses/) });
    expect(db.landParcel.findFirst.mock.calls[0][0].where).toMatchObject({ id: "lp-1", farmer: { farmerGroupId: { in: ["kt-lain"] } } });
    expect(q.fetchSimplifiedVertices).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.landMarker.create).not.toHaveBeenCalled();
  });

  it("createMarkersFromPolygon: lahan tanpa poligon → 'belum punya poligon', tanpa transaksi", async () => {
    db.landParcel.findFirst.mockResolvedValue({ ...PARCEL, geometry: null });
    expect(await actions.createMarkersFromPolygon({ landParcelId: "lp-1", keepSequenceNos: [1] })).toEqual({ success: false, error: "Lahan belum punya poligon" });
    expect(q.fetchSimplifiedVertices).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.landMarker.create).not.toHaveBeenCalled();
  });
});

describe("getLandParcelMarkers — scope lahan & patok bersama (audit #440 F2)", () => {
  /** Lahan lain yang memakai patok yang sama — revisi aktif membawa Lembaga & distrik. */
  const other = (parcelId: string, rev: { id: string; group: string; district: string } | null) => ({
    parcel: {
      parcelId,
      farmer: { name: `Petani ${parcelId}`, farmerGroup: { name: "Lembaga Lain" } },
      revisions: rev ? [{ id: rev.id, farmer: { farmerGroupId: rev.group, farmerGroup: { districtId: rev.district } } }] : [],
    },
  });
  const LINK = {
    id: "link-1", sequenceNo: 1, sourceRevision: 0,
    marker: {
      id: "m-1", code: "HJP-PTK-000001", longitude: POINT.lon, latitude: POINT.lat, source: "POLYGON_VERTEX", condition: "PRESENT", type: null,
      installedAt: null, installedBy: null, photoKey: "land-marker/m-1/foto.jpg", photoName: "foto.jpg", notes: null, modifiedAt: new Date("2026-10-01"),
      parcels: [
        other("HJP.0002.A", { id: "lp-2", group: "kt-1", district: "1401" }),
        other("ASP.0003.A", { id: "lp-3", group: "kt-2", district: "1402" }),
        other("HJP.0004.A", null), // tak punya revisi aktif
      ],
    },
  };
  const sharedIds = async () => ((await actions.getLandParcelMarkers("lp-1"))?.markers[0].sharedWith ?? []).map((s) => s.landParcelId);

  it("lahan di luar scope (findFirst null) → null, tautan patok tidak dikueri", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    db.landParcel.findFirst.mockResolvedValue(null);
    expect(await actions.getLandParcelMarkers("lp-1")).toBeNull();
    expect(db.landParcel.findFirst.mock.calls[0][0].where).toEqual({ id: "lp-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-lain"] } } });
    expect(db.landParcelMarker.findMany).not.toHaveBeenCalled();
  });

  it("ALL: patok dipetakan lengkap (foto bertanda tangan, petunjuk poligon berubah) + sharedWith punya landParcelId bila ada revisi aktif", async () => {
    db.landParcelMarker.findMany.mockResolvedValue([LINK]);
    const out = await actions.getLandParcelMarkers("lp-1");
    expect(db.landParcelMarker.findMany.mock.calls[0][0].where).toEqual({ parcelUid: "uid-1", isActive: true });
    expect(db.landParcelMarker.findMany.mock.calls[0][0].select.marker.select.parcels.where).toEqual({ isActive: true, parcelUid: { not: "uid-1" } });
    expect(out).toMatchObject({ parcelUid: "uid-1", revision: 1, hasGeometry: true, polygonChangedSince: true });
    expect(out?.markers[0]).toMatchObject({ linkId: "link-1", id: "m-1", code: "HJP-PTK-000001", sequenceNo: 1, photoUrl: "https://signed" });
    expect(out?.markers[0].sharedWith).toEqual([
      { parcelId: "HJP.0002.A", landParcelId: "lp-2", farmerName: "Petani HJP.0002.A", groupName: "Lembaga Lain" },
      { parcelId: "ASP.0003.A", landParcelId: "lp-3", farmerName: "Petani ASP.0003.A", groupName: "Lembaga Lain" },
      { parcelId: "HJP.0004.A", landParcelId: null, farmerName: "Petani HJP.0004.A", groupName: "Lembaga Lain" },
    ]);
  });

  it("BY_FARMER_GROUP: lahan tetangga di Lembaga lain → landParcelId null (nama tetap tampil, tautan tidak)", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    db.landParcelMarker.findMany.mockResolvedValue([LINK]);
    expect(await sharedIds()).toEqual(["lp-2", null, null]);
  });

  it("BY_DISTRICT: hanya lahan tetangga di distrik scope yang bertautan", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1402"] });
    db.landParcelMarker.findMany.mockResolvedValue([LINK]);
    expect(await sharedIds()).toEqual([null, "lp-3", null]);
  });

  it("tanpa foto → photoUrl null; sourceRevision = revisi lahan → polygonChangedSince false; lahan tanpa poligon → hasGeometry false", async () => {
    db.landParcel.findFirst.mockResolvedValue({ ...PARCEL, geometry: null });
    db.landParcelMarker.findMany.mockResolvedValue([{ ...LINK, sourceRevision: 1, marker: { ...LINK.marker, photoKey: null, parcels: [] } }]);
    const out = await actions.getLandParcelMarkers("lp-1");
    expect(out).toMatchObject({ hasGeometry: false, polygonChangedSince: false });
    expect(out?.markers[0]).toMatchObject({ photoUrl: null, sharedWith: [] });
  });
});

describe("createMarkersFromPolygon — isi transaksi (audit #440 F2)", () => {
  const VERTS = [{ lon: 101.19, lat: 0.52 }, { lon: 101.191, lat: 0.52 }, { lon: 101.191, lat: 0.521 }, { lon: 101.19, lat: 0.521 }];
  // Vertex pertama sudah tertaut ke lahan ini; vertex kedua berimpit patok tetangga yang nonaktif.
  const NEARBY = [
    { id: "m-linked", lon: VERTS[0].lon, lat: VERTS[0].lat, parcelIds: ["HJP.0001.A"], linkedToThisParcel: true, isActive: true },
    { id: "m-nb", lon: VERTS[1].lon, lat: VERTS[1].lat, parcelIds: ["HJP.0002.A"], linkedToThisParcel: false, isActive: false },
  ];
  const plan = () => planMarkersFromVertices([VERTS], NEARBY, MARKER_SNAP_M);

  beforeEach(() => {
    q.fetchSimplifiedVertices.mockResolvedValue([VERTS]);
    q.fetchNearbyMarkers.mockResolvedValue(NEARBY);
    db.landParcelMarker.aggregate.mockResolvedValue({ _max: { sequenceNo: 4 } });
  });

  it("rencana dihitung ulang di server: vertex tertaut → skipped, berimpit → dihidupkan & ditautkan, sisanya dibuat dengan kode beruntun", async () => {
    const res = await actions.createMarkersFromPolygon({ landParcelId: "lp-1", keepSequenceNos: [1, 2, 3, 4] });
    expect(res).toEqual({ success: true, data: { created: 2, linked: 1, skipped: 1 } });
    expect(q.fetchNearbyMarkers).toHaveBeenCalledWith("lp-1", "uid-1");
    // Kode hanya dialokasikan untuk vertex BARU, sekali, berawalan singkatan Lembaga.
    expect(q.allocateMarkerCodes).toHaveBeenCalledExactlyOnceWith(db, "HJP", 2);
    const fresh = plan().filter((c) => !c.existingMarkerId);
    expect(db.landMarker.create.mock.calls.map((c) => c[0].data)).toEqual([
      { code: "HJP-PTK-000001", longitude: fresh[0].lon, latitude: fresh[0].lat, source: "POLYGON_VERTEX", createdBy: "user-1" },
      { code: "HJP-PTK-000002", longitude: fresh[1].lon, latitude: fresh[1].lat, source: "POLYGON_VERTEX", createdBy: "user-1" },
    ]);
    expect(db.landMarker.update).toHaveBeenCalledExactlyOnceWith({ where: { id: "m-nb" }, data: { isActive: true, modifiedBy: "user-1" } });
    // Nomor urut lanjut dari maksimum tautan aktif (4) — urut rencana, yang di-skip tidak memakan nomor.
    const upserts = db.landParcelMarker.upsert.mock.calls.map((c) => c[0]);
    expect(upserts.map((u) => u.create.sequenceNo)).toEqual([5, 6, 7]);
    for (const u of upserts) {
      expect(u.where.parcelUid_markerId.parcelUid).toBe("uid-1");
      expect(u.create).toMatchObject({ parcelUid: "uid-1", createdBy: "user-1", sourceRevision: 1 });
      expect(u.update).toMatchObject({ isActive: true, modifiedBy: "user-1", sourceRevision: 1 });
    }
    const linkedOrder = plan().filter((c) => !c.alreadyLinked).map((c) => c.existingMarkerId ?? "baru");
    expect(upserts.map((u) => (u.create.markerId === "m-nb" ? "m-nb" : "baru"))).toEqual(linkedOrder);
    expect((db.$transaction.mock.calls[0][1] as { timeout: number }).timeout).toBeGreaterThanOrEqual(20_000);
  });

  it("hanya vertex yang dicentang diproses; centang vertex tertaut saja → skipped tanpa tulis", async () => {
    const linkedSeq = plan().find((c) => c.alreadyLinked)!.sequenceNo;
    const res = await actions.createMarkersFromPolygon({ landParcelId: "lp-1", keepSequenceNos: [linkedSeq] });
    expect(res).toEqual({ success: true, data: { created: 0, linked: 0, skipped: 1 } });
    expect(q.allocateMarkerCodes).toHaveBeenCalledWith(db, "HJP", 0);
    expect(db.landMarker.create).not.toHaveBeenCalled();
    expect(db.landParcelMarker.upsert).not.toHaveBeenCalled();
  });

  it("galat di transaksi: P2002 → pesan bentrok nomor; galat lain → pesan umum (bukan teks Prisma)", async () => {
    db.$transaction.mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }));
    const clash = await actions.createMarkersFromPolygon({ landParcelId: "lp-1", keepSequenceNos: [1] });
    expect(clash).toMatchObject({ success: false, error: expect.stringMatching(/bentrok/) });

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    db.$transaction.mockRejectedValueOnce(new Error("koneksi putus"));
    expect(await actions.createMarkersFromPolygon({ landParcelId: "lp-1", keepSequenceNos: [1] })).toEqual({ success: false, error: "Gagal menyimpan patok dari poligon" });
    spy.mockRestore();
  });
});

describe("updateLandMarker — isi pembaruan: digeser / sumber / modifiedBy (audit #440 F2)", () => {
  const UPDATE = { landParcelId: "lp-1", markerId: "m-1", longitude: POINT.lon, latitude: POINT.lat, condition: "DAMAGED", type: "CONCRETE", notes: "miring" };
  const link = (source = "POLYGON_VERTEX") => ({ id: "link-1", marker: { longitude: POINT.lon, latitude: POINT.lat, source } });

  it("patok tak tertaut aktif ke lahan ini → 'tidak ditemukan pada lahan ini', tanpa update", async () => {
    const res = await actions.updateLandMarker(UPDATE);
    expect(res).toEqual({ success: false, error: "Patok tidak ditemukan pada lahan ini" });
    expect(db.landParcelMarker.findFirst.mock.calls[0][0].where).toEqual({ parcelUid: "uid-1", markerId: "m-1", isActive: true });
    expect(db.landMarker.update).not.toHaveBeenCalled();
  });

  it("koordinat sama (hanya kondisi berubah) → koordinat & sumber dibiarkan, guard jarak dilewati, modifiedBy diisi", async () => {
    db.landParcelMarker.findFirst.mockResolvedValue(link());
    const res = await actions.updateLandMarker(UPDATE);
    expect(res).toEqual({ success: true, data: { id: "m-1" } });
    expect(q.distancesToParcelBoundary).not.toHaveBeenCalled();
    const { where, data } = db.landMarker.update.mock.calls[0][0];
    expect(where).toEqual({ id: "m-1" });
    expect(data).toEqual({ source: "POLYGON_VERTEX", condition: "DAMAGED", type: "CONCRETE", installedAt: null, installedBy: null, notes: "miring", modifiedBy: "user-1" });
  });

  it("selisih pembulatan form (< 20 cm) → tidak dianggap digeser", async () => {
    db.landParcelMarker.findFirst.mockResolvedValue(link());
    await actions.updateLandMarker({ ...UPDATE, longitude: POINT.lon + 0.000001 }); // ±11 cm
    expect(db.landMarker.update.mock.calls[0][0].data).not.toHaveProperty("longitude");
    expect(q.distancesToParcelBoundary).not.toHaveBeenCalled();
  });

  it("digeser (±11 m) dari vertex poligon → koordinat baru disimpan, sumber jadi GPS, guard jarak dijalankan", async () => {
    db.landParcelMarker.findFirst.mockResolvedValue(link());
    const lon = POINT.lon + 0.0001;
    await actions.updateLandMarker({ ...UPDATE, longitude: lon });
    expect(q.distancesToParcelBoundary).toHaveBeenCalledWith("lp-1", [{ lon, lat: POINT.lat }, { lon: POINT.lat, lat: lon }]);
    expect(db.landMarker.update.mock.calls[0][0].data).toMatchObject({ longitude: lon, latitude: POINT.lat, source: "GPS", modifiedBy: "user-1" });
  });

  it("digeser dari patok MANUAL → sumber tetap MANUAL", async () => {
    db.landParcelMarker.findFirst.mockResolvedValue(link("MANUAL"));
    await actions.updateLandMarker({ ...UPDATE, longitude: POINT.lon + 0.0001 });
    expect(db.landMarker.update.mock.calls[0][0].data.source).toBe("MANUAL");
  });

  it("digeser > 100 m dari batas lahan → fieldError longitude, tanpa update; lahan tanpa poligon → guard dilewati", async () => {
    db.landParcelMarker.findFirst.mockResolvedValue(link());
    q.distancesToParcelBoundary.mockImplementation(async (_id: string, pts: unknown[]) => pts.map(() => 250));
    const far = await actions.updateLandMarker({ ...UPDATE, longitude: POINT.lon + 0.0001 });
    expect(far).toMatchObject({ success: false, error: { longitude: [expect.stringMatching(/250 m/)] } });
    expect(db.landMarker.update).not.toHaveBeenCalled();

    db.landParcel.findFirst.mockResolvedValue({ ...PARCEL, geometry: null });
    q.distancesToParcelBoundary.mockClear();
    const noGeom = await actions.updateLandMarker({ ...UPDATE, longitude: POINT.lon + 0.0001 });
    expect(noGeom.success).toBe(true);
    expect(q.distancesToParcelBoundary).not.toHaveBeenCalled();
  });

  it("update gagal P2002 → pesan bentrok yang bisa ditindaklanjuti", async () => {
    db.landParcelMarker.findFirst.mockResolvedValue(link());
    db.landMarker.update.mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }));
    expect(await actions.updateLandMarker(UPDATE)).toMatchObject({ success: false, error: expect.stringMatching(/bentrok/) });
  });
});

describe("unlinkLandMarker — scope (audit #440 F2)", () => {
  it("lahan di luar scope → 'di luar akses', tautan tak dicek, tanpa transaksi", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    db.landParcel.findFirst.mockResolvedValue(null);
    const res = await actions.unlinkLandMarker("lp-1", "m-1");
    expect(res).toMatchObject({ success: false, error: expect.stringMatching(/di luar akses/) });
    expect(db.landParcel.findFirst.mock.calls[0][0].where).toEqual({ id: "lp-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-lain"] } } });
    expect(db.landParcelMarker.findFirst).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("patok tak tertaut ke lahan ini → 'tidak ditemukan', tanpa transaksi", async () => {
    expect(await actions.unlinkLandMarker("lp-1", "m-lain")).toEqual({ success: false, error: "Patok tidak ditemukan pada lahan ini" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("renumberLandMarkers — validasi urutan & dua tahap (audit #440 F2)", () => {
  const LINKS = [{ id: "l-a", markerId: "m-a" }, { id: "l-b", markerId: "m-b" }, { id: "l-c", markerId: "m-c" }];
  const ORDER_ERR = "Daftar urutan harus memuat semua patok lahan ini, masing-masing sekali";
  beforeEach(() => db.landParcelMarker.findMany.mockResolvedValue(LINKS));

  it("Zod gagal (order kosong / tanpa lahan) → 'Input tidak valid' tanpa kueri", async () => {
    expect(await actions.renumberLandMarkers({ landParcelId: "lp-1", order: [] })).toEqual({ success: false, error: "Input tidak valid" });
    expect(await actions.renumberLandMarkers({ landParcelId: "", order: ["m-a"] })).toEqual({ success: false, error: "Input tidak valid" });
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
  });

  it("lahan di luar scope → 'di luar akses', tautan tak dibaca", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    db.landParcel.findFirst.mockResolvedValue(null);
    const res = await actions.renumberLandMarkers({ landParcelId: "lp-1", order: ["m-a", "m-b", "m-c"] });
    expect(res).toMatchObject({ success: false, error: expect.stringMatching(/di luar akses/) });
    expect(db.landParcel.findFirst.mock.calls[0][0].where).toMatchObject({ farmer: { farmerGroupId: { in: ["kt-lain"] } } });
    expect(db.landParcelMarker.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ["kurang satu patok", ["m-a", "m-b"]],
    ["patok lahan lain", ["m-a", "m-b", "m-x"]],
    ["patok ganda (panjang sama)", ["m-a", "m-a", "m-b"]],
    ["kelebihan", ["m-a", "m-b", "m-c", "m-c"]],
  ])("daftar tidak lengkap/unik (%s) → ditolak tanpa transaksi", async (_label, order) => {
    expect(await actions.renumberLandMarkers({ landParcelId: "lp-1", order })).toEqual({ success: false, error: ORDER_ERR });
    expect(db.landParcelMarker.findMany.mock.calls[0][0].where).toEqual({ parcelUid: "uid-1", isActive: true });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("valid → tahap 1 parkir di nomor negatif, tahap 2 nomor 1..n sesuai urutan baru + modifiedBy", async () => {
    const res = await actions.renumberLandMarkers({ landParcelId: "lp-1", order: ["m-c", "m-a", "m-b"] });
    expect(res).toEqual({ success: true });
    expect(db.landParcelMarker.update.mock.calls.map((c) => c[0])).toEqual([
      { where: { id: "l-c" }, data: { sequenceNo: -1 } },
      { where: { id: "l-a" }, data: { sequenceNo: -2 } },
      { where: { id: "l-b" }, data: { sequenceNo: -3 } },
      { where: { id: "l-c" }, data: { sequenceNo: 1, modifiedBy: "user-1" } },
      { where: { id: "l-a" }, data: { sequenceNo: 2, modifiedBy: "user-1" } },
      { where: { id: "l-b" }, data: { sequenceNo: 3, modifiedBy: "user-1" } },
    ]);
    expect((db.$transaction.mock.calls[0][1] as { timeout: number }).timeout).toBeGreaterThanOrEqual(20_000);
  });

  it("transaksi gagal P2002 → pesan bentrok, bukan teks Prisma", async () => {
    db.$transaction.mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }));
    expect(await actions.renumberLandMarkers({ landParcelId: "lp-1", order: ["m-a", "m-b", "m-c"] })).toMatchObject({ success: false, error: expect.stringMatching(/bentrok/) });
  });
});

describe("getFarmerGroupMarkerExportRows — id & scope Lembaga (audit #440 F2)", () => {
  it("id kosong / bukan string → 'Lembaga tidak valid' tanpa kueri", async () => {
    expect(await actions.getFarmerGroupMarkerExportRows("")).toEqual({ success: false, error: "Lembaga tidak valid" });
    expect(await actions.getFarmerGroupMarkerExportRows(123 as never)).toEqual({ success: false, error: "Lembaga tidak valid" });
    expect(getAccessContext).not.toHaveBeenCalled();
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
  });

  it("Lembaga di luar scope (findFirst null) → sukses 0 baris, label null, lahan tidak dikueri", async () => {
    db.farmerGroup.findFirst.mockResolvedValue(null);
    expect(await actions.getFarmerGroupMarkerExportRows("kt-lain")).toEqual({ success: true, data: { rows: [], label: null } });
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toMatchObject({ id: "kt-lain", isActive: true });
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toHaveProperty("AND");
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });

  it("Lembaga dalam scope → satu baris per patok per lahan, sharedWith = lahan lain; label = kode Lembaga (kosong → nama)", async () => {
    db.landParcel.findMany.mockResolvedValue([
      {
        parcelId: "HJP.0001.A", parcelUid: "uid-1", subGroupLv2: "KT Maju", blok: "B1",
        farmer: { farmerId: "HJP.0001", name: "Ani", farmerGroup: { name: "HJP" } },
        identity: {
          markers: [{
            sequenceNo: 1,
            marker: {
              id: "m-1", code: "HJP-PTK-000001", longitude: POINT.lon, latitude: POINT.lat, condition: "PRESENT", type: "CONCRETE",
              installedAt: new Date("2026-09-01T00:00:00.000Z"), installedBy: "Tim", source: "GPS", notes: null,
              parcels: [{ parcelUid: "uid-1", parcel: { parcelId: "HJP.0001.A" } }, { parcelUid: "uid-2", parcel: { parcelId: "HJP.0002.A" } }],
            },
          }],
        },
      },
    ]);
    const res = await actions.getFarmerGroupMarkerExportRows("kt-1");
    expect(db.landParcel.findMany.mock.calls[0][0].where).toEqual({ isActive: true, farmer: { isActive: true, farmerGroupId: "kt-1" } });
    expect(res).toEqual({
      success: true,
      data: {
        label: "ISH-1401-03",
        rows: [{
          markerId: "m-1", code: "HJP-PTK-000001", parcelId: "HJP.0001.A", farmerCode: "HJP.0001", farmerName: "Ani", groupName: "HJP",
          subGroupLv2: "KT Maju", blok: "B1", sequenceNo: 1, latitude: POINT.lat, longitude: POINT.lon, condition: "PRESENT", type: "CONCRETE",
          installedAt: "2026-09-01", installedBy: "Tim", source: "GPS", sharedWith: ["HJP.0002.A"], notes: null,
        }],
      },
    });

    db.farmerGroup.findFirst.mockResolvedValue({ code: "  ", name: "HJP Nama" });
    db.landParcel.findMany.mockResolvedValue([]);
    expect(await actions.getFarmerGroupMarkerExportRows("kt-1")).toEqual({ success: true, data: { rows: [], label: "HJP Nama" } });
  });
});
