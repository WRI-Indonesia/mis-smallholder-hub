import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * UL Parcel Code manual (#373) — tanpa DB, pola mock
 * `land-parcel-satellite-nkt-guard.test.ts`. Keputusan owner 2026-09-23: kode
 * yang sama BOLEH menempel di >1 lahan; yang dijaga hanya duplikat di lahan
 * yang sama. Kode aktif di lahan lain tidak pernah dipindah/diubah.
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
  landParcelExternalId: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { createLandParcelExternalId, updateLandParcelExternalId } = await import("@/server/actions/land-parcel-satellite");

const CODE = { landParcelId: "lp-1", source: "MERIDIA", code: "ID080d781b4" };

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  db.landParcel.findFirst.mockResolvedValue({ parcelUid: "uid-1", farmerId: "f-1" });
  db.landParcelExternalId.findUnique.mockResolvedValue(null);
  db.landParcelExternalId.create.mockResolvedValue({ id: "x-new" });
  db.landParcelExternalId.update.mockResolvedValue({ id: "x-old" });
});

describe("createLandParcelExternalId (#373)", () => {
  it("cek duplikat hanya di lahan ini (kunci parcelUid+source+code) — kode milik lahan lain tak menghalangi", async () => {
    const res = await createLandParcelExternalId(CODE);
    expect(res).toEqual({ success: true, data: { id: "x-new" } });
    expect(db.landParcelExternalId.findUnique.mock.calls[0][0].where).toEqual({
      parcelUid_source_code: { parcelUid: "uid-1", source: "MERIDIA", code: "ID080d781b4" },
    });
    expect(db.landParcelExternalId.create.mock.calls[0][0].data).toMatchObject({ parcelUid: "uid-1", code: "ID080d781b4", createdBy: "user-1" });
  });

  it("kode aktif di lahan yang sama → ditolak tanpa menulis", async () => {
    db.landParcelExternalId.findUnique.mockResolvedValue({ id: "x-old", isActive: true });
    const res = await createLandParcelExternalId(CODE);
    expect(res.success).toBe(false);
    expect(db.landParcelExternalId.create).not.toHaveBeenCalled();
    expect(db.landParcelExternalId.update).not.toHaveBeenCalled();
  });

  it("kode nonaktif di lahan yang sama → diaktifkan kembali per id (bukan dipindah dari lahan lain)", async () => {
    db.landParcelExternalId.findUnique.mockResolvedValue({ id: "x-old", isActive: false });
    const res = await createLandParcelExternalId(CODE);
    expect(res.success).toBe(true);
    const arg = db.landParcelExternalId.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "x-old" });
    expect(arg.data).toMatchObject({ isActive: true, modifiedBy: "user-1" });
    expect(arg.data).not.toHaveProperty("parcelUid");
  });

  it("izin CREATE ditolak → tanpa DB", async () => {
    hasPermission.mockResolvedValue(false);
    expect((await createLandParcelExternalId(CODE)).success).toBe(false);
    expect(hasPermission).toHaveBeenLastCalledWith("master-data-parcels", "CREATE");
    expect(db.landParcel.findFirst).not.toHaveBeenCalled();
  });
});

describe("updateLandParcelExternalId (#373)", () => {
  const UPD = { id: "x-1", source: "MERIDIA", code: "ID080d781b4" };

  it("bentrok dicek di lahan record itu saja; record lain di lahan yang sama → ditolak", async () => {
    db.landParcelExternalId.findFirst.mockResolvedValue({ id: "x-1", parcelUid: "uid-1" });
    db.landParcelExternalId.findUnique.mockResolvedValue({ id: "x-2" });
    const res = await updateLandParcelExternalId(UPD);
    expect(res.success).toBe(false);
    expect(db.landParcelExternalId.findUnique.mock.calls[0][0].where).toEqual({
      parcelUid_source_code: { parcelUid: "uid-1", source: "MERIDIA", code: "ID080d781b4" },
    });
    expect(db.landParcelExternalId.update).not.toHaveBeenCalled();
  });

  it("kode sama dipakai lahan lain (tak ketemu di lahan ini) → disimpan", async () => {
    db.landParcelExternalId.findFirst.mockResolvedValue({ id: "x-1", parcelUid: "uid-1" });
    const res = await updateLandParcelExternalId(UPD);
    expect(res).toEqual({ success: true, data: { id: "x-1" } });
    expect(db.landParcelExternalId.update.mock.calls[0][0].where).toEqual({ id: "x-1" });
  });

  it("record di luar scope → ditolak (findFirst ber-scope relasi parcel.farmer)", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["lp-lain"] });
    db.landParcelExternalId.findFirst.mockResolvedValue(null);
    const res = await updateLandParcelExternalId(UPD);
    expect(res.success).toBe(false);
    expect(db.landParcelExternalId.findFirst.mock.calls[0][0].where).toMatchObject({ id: "x-1", isActive: true, parcel: { farmer: { farmerGroupId: { in: ["lp-lain"] } } } });
    expect(db.landParcelExternalId.update).not.toHaveBeenCalled();
  });
});
