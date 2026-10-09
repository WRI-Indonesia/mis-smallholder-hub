import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `fetchParcelPassport(id, includeProduction, shared)` (#343): Profil Petani
 * memanggilnya sampai 40× per dokumen — `shared.access` & `shared.training`
 * harus benar-benar dipakai (tidak menghitung ulang akses / partisipasi
 * pelatihan per lahan), dan pemanggil lama (tanpa `shared`) tetap berjalan
 * seperti semula.
 */
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({
  getAccessContext,
  farmerGroupAccessFilter: (access: { mode: string; ids?: string[] }) =>
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } : {},
}));
const fetchParcelNeighbors = vi.hoisted(() => vi.fn());
vi.mock("@/lib/parcel-neighbor-query", () => ({ fetchParcelNeighbors }));

const db = vi.hoisted(() => ({
  landParcel: { findFirst: vi.fn() },
  productionRecord: { findMany: vi.fn(), groupBy: vi.fn() },
  tree: { count: vi.fn() },
  trainingParticipant: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { fetchParcelPassport } = await import("@/lib/parcel-passport-query");

const PARCEL = {
  parcelId: "HJP.0001.A", area: 2, landStatus: null, cropType: null, plantingYear: null, notes: null,
  geometry: { type: "Polygon", coordinates: [[[101.19, 0.52], [101.191, 0.52], [101.191, 0.521], [101.19, 0.521], [101.19, 0.52]]] },
  blok: null, subGroupLv2: null, species: null, isPsr: false, parcelUid: "uid-1",
  identity: { documents: [], stdbLinks: [], externalIds: [], programs: [], border: null, nkt: null, markers: [] },
  farmer: { id: "f-1", farmerGroupId: "kt-1", name: "Abdul", farmerId: "HJP.0001", gender: "M", birthPlace: null, birthDate: null, nik: null, address: null, joinedYear: null, farmerGroup: { name: "HJP", code: null, district: { name: "Kampar", province: { name: "Riau" } } } },
};
const TRAINING = [{ code: "PAKET_1_BMP_PC_RSPO_NKT", label: "Paket 1 - BMP", completed: true, date: "2025-05-16T00:00:00.000Z" }];

beforeEach(() => {
  vi.clearAllMocks();
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.landParcel.findFirst.mockResolvedValue(PARCEL);
  db.productionRecord.findMany.mockResolvedValue([]);
  db.productionRecord.groupBy.mockResolvedValue([]);
  db.tree.count.mockResolvedValue(0);
  db.trainingParticipant.findMany.mockResolvedValue([]);
  fetchParcelNeighbors.mockResolvedValue({ neighbors: [], omitted: 0 });
});

describe("fetchParcelPassport — parameter `shared`", () => {
  it("tanpa shared (pemanggil lama): akses & partisipasi pelatihan dihitung sendiri", async () => {
    const res = await fetchParcelPassport("lp-1", true);
    expect(res.success).toBe(true);
    expect(getAccessContext).toHaveBeenCalledTimes(1);
    expect(db.trainingParticipant.findMany).toHaveBeenCalledTimes(1);
  });

  it("dengan shared: getAccessContext & kueri partisipasi TIDAK dipanggil; scope & training yang dioper yang dipakai", async () => {
    const access = { mode: "BY_FARMER_GROUP" as const, ids: ["kt-1"] };
    const res = await fetchParcelPassport("lp-1", true, { access, training: TRAINING });
    expect(res.success).toBe(true);
    expect(getAccessContext).not.toHaveBeenCalled();
    expect(db.trainingParticipant.findMany).not.toHaveBeenCalled();
    // Scope yang dioper diterapkan ke where lahan (farmer.farmerGroup) dan diteruskan ke kueri tetangga.
    expect(db.landParcel.findFirst.mock.calls[0][0].where.farmer.farmerGroup).toEqual({ id: { in: ["kt-1"] } });
    expect(fetchParcelNeighbors).toHaveBeenCalledWith("lp-1", expect.any(Number), access);
    if (res.success) expect(res.data!.training).toBe(TRAINING);
  });

  it("Ton/Ha/tahun Profil Lahan: bulan Lembaga + record petani & lahan ini; bulan dari Profil Petani dipakai ulang (tanpa kueri per lahan)", async () => {
    db.productionRecord.groupBy.mockResolvedValue([{ period: "2026-01", _sum: { yieldKg: 900 }, _count: { parcelId: 1 } }]);
    const own = await fetchParcelPassport("lp-1", true);
    expect(db.productionRecord.groupBy.mock.calls[0][0].where).toEqual({
      isActive: true,
      OR: [{ farmer: { isActive: true, farmerGroup: { id: "kt-1" } } }, { farmerId: "f-1" }, { parcel: { farmerId: "f-1" } }],
    });
    if (own.success) expect(own.data!.production.dataMonthsByYear).toEqual({ "2026": 1 });

    db.productionRecord.groupBy.mockClear();
    const reused = await fetchParcelPassport("lp-1", true, { access: { mode: "ALL" }, training: TRAINING, groupDataMonths: { "2026": 6 } });
    expect(db.productionRecord.groupBy).not.toHaveBeenCalled();
    if (reused.success) expect(reused.data!.production.dataMonthsByYear).toEqual({ "2026": 6 });

    // Tanpa produksi (includeProduction=false) → tak ada kueri bulan.
    await fetchParcelPassport("lp-1", false);
    expect(db.productionRecord.groupBy).not.toHaveBeenCalled();
  });

  it("includeInactiveFarmer: filter farmer.isActive dilepas HANYA bila diminta (SUPERADMIN Profil Petani nonaktif, review #343); bawaan tetap aktif saja", async () => {
    await fetchParcelPassport("lp-1", true, { access: { mode: "ALL" }, training: TRAINING, includeInactiveFarmer: true });
    expect(db.landParcel.findFirst.mock.calls[0][0].where.farmer).not.toHaveProperty("isActive");
    await fetchParcelPassport("lp-1", true, { access: { mode: "ALL" }, training: TRAINING });
    expect(db.landParcel.findFirst.mock.calls[1][0].where.farmer).toMatchObject({ isActive: true });
    // Lahan nonaktif tetap tidak pernah ditemukan — kelonggaran hanya di sisi petani.
    expect(db.landParcel.findFirst.mock.calls[0][0].where.isActive).toBe(true);
  });
});
