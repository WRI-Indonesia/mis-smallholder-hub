import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & semantik tulis satelit 1:1 lahan (#326 sepadan, #328 NKT) — tanpa DB,
 * pola mock `land-parcel-export-guard.test.ts`. Dua aturan hapus yang berbeda
 * dan disengaja (Decision Log 2026-09-14, CLAUDE.md §Soft delete): sepadan
 * "hapus" = KOSONGKAN kolom (baris tetap), NKT "hapus" = HAPUS BARIS — keduanya
 * karena UNIQUE(parcel_uid) akan memblokir pengisian ulang bila baris nonaktif
 * dibiarkan. Plus: NOT_AFFECTED selalu disimpan tanpa kategori (transform Zod).
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerAccessFilter: () => ({}),
  farmerRelationAccessFilter: (access: { mode: string; ids: string[] }) =>
    access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } : {},
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const db = vi.hoisted(() => ({
  landParcel: { findFirst: vi.fn() },
  landParcelBorder: { upsert: vi.fn() },
  landParcelNkt: { upsert: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { upsertLandParcelBorder, upsertLandParcelNkt, deleteLandParcelNkt } = await import("@/server/actions/land-parcel-satellite");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  db.landParcel.findFirst.mockResolvedValue({ parcelUid: "uid-1", farmerId: "f-1" });
  db.landParcelBorder.upsert.mockResolvedValue({ id: "b-1" });
  db.landParcelNkt.upsert.mockResolvedValue({ id: "n-1" });
  db.landParcelNkt.deleteMany.mockResolvedValue({ count: 1 });
});

const NKT = { landParcelId: "lp-1", status: "AFFECTED", categories: ["NKT_4"], assessedAt: "2026-09-01", assessor: "WRI", source: "Lampiran III", notes: null, affectedAreaHa: 0.1, affectedLengthM: null };

describe("guard menu master-data-parcels", () => {
  it("sepadan & NKT: EDIT untuk simpan, DELETE untuk hapus NKT; ditolak → tanpa DB", async () => {
    hasPermission.mockResolvedValue(false);
    expect((await upsertLandParcelBorder({ landParcelId: "lp-1", north: "Jalan" })).success).toBe(false);
    expect(hasPermission).toHaveBeenLastCalledWith("master-data-parcels", "EDIT");
    expect((await upsertLandParcelNkt(NKT)).success).toBe(false);
    expect(hasPermission).toHaveBeenLastCalledWith("master-data-parcels", "EDIT");
    expect((await deleteLandParcelNkt("lp-1")).success).toBe(false);
    expect(hasPermission).toHaveBeenLastCalledWith("master-data-parcels", "DELETE");
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
    expect(db.landParcelBorder.upsert).not.toHaveBeenCalled();
    expect(db.landParcelNkt.upsert).not.toHaveBeenCalled();
    expect(db.landParcelNkt.deleteMany).not.toHaveBeenCalled();
  });

  it("lahan di luar scope user (BY_FARMER_GROUP) → ditolak sebelum menulis", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-lain"] });
    db.landParcel.findFirst.mockResolvedValue(null);
    const res = await upsertLandParcelNkt(NKT);
    expect(res.success).toBe(false);
    expect(db.landParcel.findFirst.mock.calls[0][0].where).toMatchObject({ id: "lp-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-lain"] } } });
    expect(db.landParcelNkt.upsert).not.toHaveBeenCalled();
  });
});

describe("sepadan (#326) — upsert by parcelUid, hapus = kosongkan kolom", () => {
  it("dua kali simpan lahan yang sama → upsert pada kunci parcelUid (satu baris), audit terisi", async () => {
    await upsertLandParcelBorder({ landParcelId: "lp-1", north: " Lahan Pak Budi ", east: "Jalan desa" });
    await upsertLandParcelBorder({ landParcelId: "lp-1", north: "Sungai" });
    expect(db.landParcelBorder.upsert).toHaveBeenCalledTimes(2);
    const call = db.landParcelBorder.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ parcelUid: "uid-1" });
    expect(call.create).toMatchObject({ parcelUid: "uid-1", north: "Lahan Pak Budi", east: "Jalan desa", south: null, west: null, createdBy: "user-1" });
    expect(call.update).toMatchObject({ north: "Lahan Pak Budi", modifiedBy: "user-1" });
  });

  it("semua sisi kosong → sah: keempat kolom null, baris TIDAK dihapus/dinonaktifkan", async () => {
    const res = await upsertLandParcelBorder({ landParcelId: "lp-1", north: "", east: "", south: "", west: "", notes: "" });
    expect(res.success).toBe(true);
    const { update } = db.landParcelBorder.upsert.mock.calls[0][0];
    expect(update).toMatchObject({ north: null, east: null, south: null, west: null, notes: null });
    expect(update).not.toHaveProperty("isActive");
  });
});

describe("NKT (#328) — upsert by parcelUid, hapus = hapus baris", () => {
  it("simpan AFFECTED + kategori → upsert; kategori string 'NKT 1; 4' dinormalkan & dedup", async () => {
    const res = await upsertLandParcelNkt({ ...NKT, categories: "NKT 1; 4; NKT_4" });
    expect(res.success).toBe(true);
    const { where, create } = db.landParcelNkt.upsert.mock.calls[0][0];
    expect(where).toEqual({ parcelUid: "uid-1" });
    expect(create).toMatchObject({ parcelUid: "uid-1", status: "AFFECTED", categories: ["NKT_1", "NKT_4"], affectedAreaHa: 0.1, assessor: "WRI", createdBy: "user-1" });
  });

  it("NOT_AFFECTED disimpan tanpa kategori walau form mengirim sisa centang", async () => {
    await upsertLandParcelNkt({ ...NKT, status: "NOT_AFFECTED", categories: ["NKT_4"] });
    expect(db.landParcelNkt.upsert.mock.calls[0][0].create.categories).toEqual([]);
  });

  it("AFFECTED tanpa kategori / tanggal masa depan → fieldErrors, tanpa DB", async () => {
    const a = await upsertLandParcelNkt({ ...NKT, categories: [] });
    expect(a.success).toBe(false);
    expect(a.success === false && typeof a.error === "object" && "categories" in a.error).toBe(true);
    const b = await upsertLandParcelNkt({ ...NKT, assessedAt: "2999-01-01" });
    expect(b.success).toBe(false);
    expect(db.landParcelNkt.upsert).not.toHaveBeenCalled();
  });

  it("hapus = deleteMany by parcelUid (baris hilang → 'belum dinilai'), bukan toggle isActive", async () => {
    const res = await deleteLandParcelNkt("lp-1");
    expect(res.success).toBe(true);
    expect(db.landParcelNkt.deleteMany).toHaveBeenCalledWith({ where: { parcelUid: "uid-1" } });
  });
});
