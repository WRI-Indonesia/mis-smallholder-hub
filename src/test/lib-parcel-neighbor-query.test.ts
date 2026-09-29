import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Kueri lahan tetangga `src/lib/parcel-neighbor-query.ts` ASLI (#327). SQL
 * PostGIS tidak dieksekusi (`$queryRaw` di-mock); yang diuji: kandidat diambil
 * tanpa scope, kueri kedua memakai `farmerRelationAccessFilter` asli hanya
 * untuk menandai `inScope`, normalisasi angka, urut + potong, `sameFarmer`.
 */
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));

const db = vi.hoisted(() => ({ $queryRaw: vi.fn(), landParcel: { findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { fetchParcelNeighbors } = await import("@/lib/parcel-neighbor-query");

const row = (id: string, parcelId: string, distanceM: unknown, farmerId = "f-lain", overlaps: unknown = false) => ({
  id, parcelId, geometry: { type: "Polygon", coordinates: [] }, farmerId, targetFarmerId: "f-1",
  farmerName: `Pemilik ${id}`, farmerCode: `X.${id}`, groupName: "HJP", distanceM, overlaps,
});

beforeEach(() => {
  vi.clearAllMocks();
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.landParcel.findMany.mockResolvedValue([]);
});

describe("fetchParcelNeighbors", () => {
  it("tanpa kandidat → kosong, konteks akses & kueri scope tidak dipanggil", async () => {
    db.$queryRaw.mockResolvedValue([]);
    expect(await fetchParcelNeighbors("lp-1", 10)).toEqual({ neighbors: [], omitted: 0 });
    expect(getAccessContext).not.toHaveBeenCalled();
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });

  it("inScope ditandai dari kueri ber-scope (farmerRelationAccessFilter); di luar scope tetap tampil", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    db.$queryRaw.mockResolvedValue([row("b", "B.1", 5), row("c", "C.1", 3)]);
    db.landParcel.findMany.mockResolvedValue([{ id: "b" }]);
    const res = await fetchParcelNeighbors("lp-1", 10);
    expect(db.landParcel.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["b", "c"] },
      farmer: { farmerGroupId: { in: ["kt-1"] } },
    });
    expect(res.neighbors.map((n) => [n.id, n.inScope])).toEqual([["c", false], ["b", true]]);
  });

  it("access yang diteruskan pemanggil dipakai — getAccessContext tidak dipanggil ulang", async () => {
    db.$queryRaw.mockResolvedValue([row("b", "B.1", 1)]);
    await fetchParcelNeighbors("lp-1", 10, { mode: "BY_DISTRICT", ids: ["d1"] });
    expect(getAccessContext).not.toHaveBeenCalled();
    expect(db.landParcel.findMany.mock.calls[0][0].where.farmer).toEqual({ farmerGroup: { districtId: { in: ["d1"] } } });
  });

  it("jarak string numeric dibulatkan 0,1 m; overlaps & sameFarmer jadi boolean", async () => {
    db.$queryRaw.mockResolvedValue([row("b", "B.1", "12.345", "f-1", 1), row("c", "C.1", 0, "f-2", null)]);
    const { neighbors } = await fetchParcelNeighbors("lp-1", 10);
    expect(neighbors[0]).toMatchObject({ id: "c", distanceM: 0, overlaps: false, sameFarmer: false });
    expect(neighbors[1]).toMatchObject({ id: "b", distanceM: 12.3, overlaps: true, sameFarmer: true, farmerName: "Pemilik b" });
    expect(neighbors[1]).not.toHaveProperty("targetFarmerId");
  });

  it("urut jarak lalu ID lahan, dipotong ke limit; omitted = sisanya", async () => {
    db.$queryRaw.mockResolvedValue([row("a", "Z.1", 2), row("b", "A.1", 2), row("c", "M.1", 1), row("d", "D.1", 9)]);
    const res = await fetchParcelNeighbors("lp-1", 2);
    expect(res.neighbors.map((n) => n.parcelId)).toEqual(["M.1", "A.1"]);
    expect(res.omitted).toBe(2);
  });
});
