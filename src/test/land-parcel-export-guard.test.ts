import { describe, it, expect, vi, beforeEach } from "vitest";

// Penjaga properti keamanan #313: menu key tiap entry point ekspor lahan
// DI-HARDCODE di server. Bentuk pertama action ini menerima menu key dari
// klien, sehingga gate-nya ikut berpindah mengikuti pemanggil — mencabut
// EXPORT di satu menu tak memblokir apa pun selama menu lain masih memberi
// izin, padahal dataset yang keluar identik dan ber-PII (nama + NIK petani).
// Tanpa test ini, penggabungan balik jadi satu action ber-parameter tidak
// menggagalkan apa pun. Pola mock mengikuti map-hotspot-route.test.ts.
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerGroupAccessFilter: () => ({}),
}));

const findMany = vi.hoisted(() => vi.fn());
const groupFindFirst = vi.hoisted(() => vi.fn());
const districtFindUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  prisma: {
    landParcel: { findMany },
    farmerGroup: { findFirst: groupFindFirst },
    district: { findUnique: districtFindUnique },
  },
}));

const {
  getMapParcelExportData,
  getMasterDataParcelExportData,
  getFarmerGroupParcelExportData,
} = await import("@/server/actions/land-parcel-export");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL", ids: [] });
  findMany.mockResolvedValue([]);
  groupFindFirst.mockResolvedValue(null);
  districtFindUnique.mockResolvedValue(null);
});

describe("guard EXPORT ekspor lahan — menu key di-hardcode per entry point", () => {
  it("Peta Lahan digate map-parcel, bukan menu lain", async () => {
    await getMapParcelExportData({ districtId: "1404" });
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("map-parcel", "EXPORT");
  });

  it("Master Data → Lahan digate master-data-parcels", async () => {
    await getMasterDataParcelExportData({ districtId: "1404" });
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("master-data-parcels", "EXPORT");
  });

  it("detail Lembaga Petani digate master-data-groups", async () => {
    await getFarmerGroupParcelExportData("kt-1");
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("master-data-groups", "EXPORT");
  });

  it("izin ditolak → error, dan DB tidak pernah disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    for (const call of [
      () => getMapParcelExportData({ districtId: "1404" }),
      () => getMasterDataParcelExportData({ districtId: "1404" }),
      () => getFarmerGroupParcelExportData("kt-1"),
    ]) {
      const res = await call();
      expect(res.success).toBe(false);
      expect(res.success === false && res.error).toMatch(/tidak memiliki izin/i);
    }
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("kontrak entry point Lembaga Petani", () => {
  it("hanya id lembaga yang dipakai — tak bisa dititipi filter distrik", async () => {
    await getFarmerGroupParcelExportData("kt-1");
    const where = findMany.mock.calls[0][0].where.farmer.farmerGroup;
    expect(where.id).toBe("kt-1");
    expect(where.districtId).toBeUndefined();
  });

  it("id kosong ditolak sebelum menyentuh DB (fail-closed)", async () => {
    const res = await getFarmerGroupParcelExportData("");
    expect(res.success).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("scope akses tetap masuk lewat AND (anti BUG-007)", () => {
  it("filter user tak menimpa scope: keduanya hidup berdampingan", async () => {
    await getMasterDataParcelExportData({ districtId: "d-x", farmerGroupId: "kt-x" });
    const where = findMany.mock.calls[0][0].where.farmer.farmerGroup;
    expect(where).toHaveProperty("AND");
    expect(where.isActive).toBe(true);
  });

  it("hanya revisi aktif yang diekspor", async () => {
    await getMapParcelExportData({ districtId: "1404" });
    expect(findMany.mock.calls[0][0].where.isActive).toBe(true);
    expect(findMany.mock.calls[0][0].where.farmer.isActive).toBe(true);
  });
});
