import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & scope Import Detail Lahan (`bulk-upload-parcel-detail.ts`, #296) —
 * tanpa DB. Menumpang menu `bulk-upload-parcels`. Setiap parcelUid wajib lahan
 * aktif dalam scope DAN pemiliknya sama dengan farmerDbId kiriman klien; inti
 * upsert (`applyLandParcelDetailRows`) diuji terpisah di lib test — di sini
 * hanya dipastikan ia TIDAK dipanggil saat guard gagal, dan menerima userId sesi.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await import("@/lib/access-scope")),
  getAccessContext,
}));

vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const applyLandParcelDetailRows = vi.hoisted(() => vi.fn());
vi.mock("@/lib/land-parcel-detail-save", async (orig) => ({
  ...(await orig<typeof import("@/lib/land-parcel-detail-save")>()),
  applyLandParcelDetailRows,
}));

const db = vi.hoisted(() => {
  const m = { landParcel: { findMany: vi.fn() }, $transaction: vi.fn() };
  return m;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/bulk-upload-parcel-detail");

const row = (o: Record<string, unknown> = {}) => ({
  parcelUid: "uid-1", farmerDbId: "f-1", parcelId: "HJP.0001.A",
  document: null, custodyNote: null, stdb: null, externalCode: "EXT-1", subGroupLv2: null, ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn("tx"));
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.landParcel.findMany.mockResolvedValue([{ parcelUid: "uid-1", farmerId: "f-1", parcelId: "HJP.0001.A" }]);
  applyLandParcelDetailRows.mockResolvedValue(undefined);
});

describe("guard — menu bulk-upload-parcels", () => {
  it("getParcelsForDetailMapping → VIEW; bulkSaveLandParcelDetails → CREATE", async () => {
    db.landParcel.findMany.mockResolvedValue([]);
    await actions.getParcelsForDetailMapping();
    expect(hasPermission).toHaveBeenLastCalledWith("bulk-upload-parcels", "VIEW");
    await actions.bulkSaveLandParcelDetails([row()]);
    expect(hasPermission).toHaveBeenLastCalledWith("bulk-upload-parcels", "CREATE");
    expect(hasPermission).toHaveBeenCalledTimes(2);
  });

  it("izin ditolak → baca melempar, simpan { success:false }, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getParcelsForDetailMapping()).rejects.toThrow(/izin/);
    expect((await actions.bulkSaveLandParcelDetails([row()])).success).toBe(false);
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("scope", () => {
  it("getParcelsForDetailMapping: filter relasi farmer + hanya revisi aktif", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    db.landParcel.findMany.mockResolvedValue([]);
    await actions.getParcelsForDetailMapping();
    expect(db.landParcel.findMany.mock.calls[0][0].where).toEqual({ farmer: { farmerGroupId: { in: ["kt-1"] } }, isActive: true });
  });

  it("parcelUid di luar scope (tak kembali dari query ber-scope) → ditolak, tak ada transaksi", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    db.landParcel.findMany.mockResolvedValue([]);
    const res = await actions.bulkSaveLandParcelDetails([row()]);
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatch(/di luar akses/);
    expect(db.landParcel.findMany.mock.calls[0][0].where).toEqual({
      parcelUid: { in: ["uid-1"] }, isActive: true, farmer: { farmerGroup: { districtId: { in: ["1401"] } } },
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("farmerDbId kiriman klien ≠ pemilik identitas → ditolak (klien tak menentukan pemilik)", async () => {
    const res = await actions.bulkSaveLandParcelDetails([row({ farmerDbId: "f-lain" })]);
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatch(/bukan milik petani/);
    expect(applyLandParcelDetailRows).not.toHaveBeenCalled();
  });
});

describe("validasi & tulis", () => {
  it("batch kosong / baris cacat → gagal tanpa query DB", async () => {
    expect((await actions.bulkSaveLandParcelDetails([])).success).toBe(false);
    expect((await actions.bulkSaveLandParcelDetails([row({ parcelUid: "" })])).success).toBe(false);
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });

  it("pemeta kosong → gagal tanpa query DB", async () => {
    const res = await actions.bulkSaveLandParcelDetails([row()], " ");
    expect(res.success).toBe(false);
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });

  it("valid → apply per chunk dalam transaksi ber-timeout, dengan userId sesi & pemeta", async () => {
    const res = await actions.bulkSaveLandParcelDetails([row()], "Meridia");
    expect(res.success).toBe(true);
    expect(db.$transaction.mock.calls[0][1]).toEqual({ timeout: 60_000 });
    const [tx, chunk, userId, , source] = applyLandParcelDetailRows.mock.calls[0];
    expect(tx).toBe("tx");
    expect(chunk).toHaveLength(1);
    expect(userId).toBe("user-1");
    expect(source).toBe("Meridia");
  });

  it("chunk gagal → pesan menyebut jumlah yang sudah tersimpan", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    applyLandParcelDetailRows.mockRejectedValue(new Error("boom"));
    const res = await actions.bulkSaveLandParcelDetails([row()]);
    expect(res.success).toBe(false);
    expect(res.success === false && res.error).toMatch(/^0 dari 1 baris/);
  });
});
