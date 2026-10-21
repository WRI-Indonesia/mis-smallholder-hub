import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Pemetaan id-set modul (#352 A1) ke flag per persil/petani/Lembaga — fungsi
 * murni yang dipakai DA-02 (`analyzeFarmerGroupCompleteness`) dan DA-03
 * (`getDataAvailabilityView`). Guard izin & scope kueri diuji di
 * data-completeness-guard.test.ts; di sini: semantik "null = tak bisa dicek"
 * dan konversi hasil kueri mentah di `loadModuleFlagSets`.
 */
const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  landParcelDocument: { groupBy: vi.fn() },
  landParcelStdb: { groupBy: vi.fn() },
  landParcelExternalId: { groupBy: vi.fn() },
  landParcelNkt: { findMany: vi.fn() },
  landParcelBorder: { findMany: vi.fn() },
  landParcelMarker: { groupBy: vi.fn() },
  landParcelProgram: { groupBy: vi.fn() },
  tree: { groupBy: vi.fn() },
  landStdb: { groupBy: vi.fn() },
  bmpAssessment: { groupBy: vi.fn() },
  farmerGroupBoundary: { groupBy: vi.fn() },
  referenceBenchmark: { findMany: vi.fn() },
  bmpGroupAssessment: { groupBy: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { loadModuleFlagSets, parcelModuleFlags, parcelGeometryAreaHa, farmerModuleFlags, groupModuleFlags } = await import(
  "@/lib/data-completeness-query"
);
type ModuleFlagSets = Awaited<ReturnType<typeof loadModuleFlagSets>>;

function emptySets(): ModuleFlagSets {
  return {
    parcel: {
      document: new Set(),
      stdbIssued: new Set(),
      externalId: new Set(),
      nkt: new Set(),
      border: new Set(),
      marker: new Set(),
      program: new Set(),
    },
    parcelIdWithTree: new Set(),
    nktStatus: new Map(),
    parcelIdOutsideBoundary: new Set(),
    parcelGeometryAreaHa: new Map(),
    farmer: { stdb: new Set(), bmpAssessment: new Set() },
    farmerBmpAny: new Set(),
    farmerBmpNoDetails: new Set(),
    group: { boundary: new Set(), benchmark: new Set(), bmpGroupAssessment: new Set() },
    groupBoundaryGeom: new Set(),
    groupCoordinateOutside: new Map(),
  };
}

describe("parcelModuleFlags", () => {
  it("satelit dikunci parcelUid, pohon dikunci LandParcel.id (baris revisi)", () => {
    const sets = emptySets();
    for (const k of Object.keys(sets.parcel) as (keyof ModuleFlagSets["parcel"])[]) sets.parcel[k].add("pu-1");
    sets.parcelIdWithTree.add("p-1");
    sets.nktStatus.set("pu-1", "AFFECTED");

    expect(parcelModuleFlags(sets, { id: "p-1", parcelUid: "pu-1" }, "g-1")).toEqual({
      document: true,
      stdbIssued: true,
      externalId: true,
      nkt: true,
      border: true,
      marker: true,
      tree: true,
      program: true,
      nktStatus: "AFFECTED",
      outsideBoundary: null, // Lembaga tanpa boundary ber-geom → tak bisa dicek
    });
    // Pohon di revisi lain (id beda, parcelUid sama) tidak terhitung untuk revisi ini.
    expect(parcelModuleFlags(sets, { id: "p-2", parcelUid: "pu-1" }, "g-1").tree).toBe(false);
  });

  it("persil tanpa data apa pun → semua false, nktStatus null", () => {
    expect(parcelModuleFlags(emptySets(), { id: "p-9", parcelUid: "pu-9" }, "g-1")).toEqual({
      document: false,
      stdbIssued: false,
      externalId: false,
      nkt: false,
      border: false,
      marker: false,
      tree: false,
      program: false,
      nktStatus: null,
      outsideBoundary: null,
    });
  });

  it("outsideBoundary hanya boolean bila Lembaga ber-boundary geom DAN persil ber-geometry", () => {
    const sets = emptySets();
    sets.groupBoundaryGeom.add("g-1");
    sets.parcelGeometryAreaHa.set("p-in", 1.2).set("p-out", 0.8);
    sets.parcelIdOutsideBoundary.add("p-out");

    const flag = (id: string, groupId = "g-1") => parcelModuleFlags(sets, { id, parcelUid: `pu-${id}` }, groupId).outsideBoundary;
    expect(flag("p-in")).toBe(false);
    expect(flag("p-out")).toBe(true);
    expect(flag("p-no-geom")).toBeNull(); // persil tanpa geometry
    expect(flag("p-out", "g-2")).toBeNull(); // Lembaga lain tanpa boundary ber-geom
  });
});

describe("parcelGeometryAreaHa", () => {
  it("luas poligon dari id-set; null (bukan 0) bila persil tanpa geometry", () => {
    const sets = emptySets();
    sets.parcelGeometryAreaHa.set("p-1", 2.5).set("p-0", 0);
    expect(parcelGeometryAreaHa(sets, "p-1")).toBe(2.5);
    expect(parcelGeometryAreaHa(sets, "p-0")).toBe(0);
    expect(parcelGeometryAreaHa(sets, "p-x")).toBeNull();
  });
});

describe("farmerModuleFlags", () => {
  it("bmpAssessmentNoDetails: undefined bila petani belum pernah dinilai (tak dicek ≠ lengkap)", () => {
    const sets = emptySets();
    sets.farmer.stdb.add("f-1");
    sets.farmer.bmpAssessment.add("f-1");
    sets.farmerBmpAny.add("f-1").add("f-2");
    sets.farmerBmpNoDetails.add("f-2");

    expect(farmerModuleFlags(sets, "f-1")).toEqual({ stdb: true, bmpAssessment: true, bmpAssessmentNoDetails: false });
    // Dinilai tahun lain saja, tanpa rincian indikator.
    expect(farmerModuleFlags(sets, "f-2")).toEqual({ stdb: false, bmpAssessment: false, bmpAssessmentNoDetails: true });
    expect(farmerModuleFlags(sets, "f-3")).toEqual({ stdb: false, bmpAssessment: false, bmpAssessmentNoDetails: undefined });
  });
});

describe("groupModuleFlags", () => {
  it("koordinat di luar kabupaten: null bila tak bisa dicek", () => {
    const sets = emptySets();
    sets.group.boundary.add("g-1");
    sets.group.bmpGroupAssessment.add("g-1");
    sets.groupCoordinateOutside.set("g-1", true).set("g-2", false);
    expect(groupModuleFlags(sets, { id: "g-1" })).toEqual({ boundary: true, benchmark: false, bmpGroupAssessment: true, coordinateOutsideDistrict: true });
    expect(groupModuleFlags(sets, { id: "g-2" }).coordinateOutsideDistrict).toBe(false);
    expect(groupModuleFlags(sets, { id: "g-3" }).coordinateOutsideDistrict).toBeNull();
  });
});

describe("loadModuleFlagSets — konversi hasil kueri", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const m of Object.values(db)) {
      if (typeof m === "function") continue;
      for (const fn of Object.values(m)) (fn as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    }
  });

  it("status NKT, luas poligon (numeric mentah → number) & koordinat Lembaga terpetakan per kunci", async () => {
    db.landParcelNkt.findMany.mockResolvedValue([
      { parcelUid: "pu-1", status: "AFFECTED" },
      { parcelUid: "pu-2", status: "NOT_AFFECTED" },
    ]);
    db.landParcelDocument.groupBy.mockResolvedValue([{ parcelUid: "pu-1" }]);
    db.tree.groupBy.mockResolvedValue([{ landParcelId: "p-1" }]);
    db.bmpAssessment.groupBy
      .mockResolvedValueOnce([{ farmerId: "f-1" }]) // tahun acuan
      .mockResolvedValueOnce([{ farmerId: "f-1" }, { farmerId: "f-2" }]) // tahun mana pun
      .mockResolvedValueOnce([{ farmerId: "f-2" }]); // tanpa rincian
    db.referenceBenchmark.findMany.mockResolvedValue([{ farmerGroupId: "g-1" }, { farmerGroupId: "g-1" }]);
    // Urutan $queryRaw: boundary geom, persil di luar boundary, luas poligon, koordinat Lembaga.
    db.$queryRaw
      .mockResolvedValueOnce([{ id: "g-1" }])
      .mockResolvedValueOnce([{ id: "p-2" }])
      .mockResolvedValueOnce([{ id: "p-1", ha: "1.25" }, { id: "p-2", ha: 0.5 }])
      .mockResolvedValueOnce([{ id: "g-1", outside: false }, { id: "g-2", outside: true }]);

    const sets = await loadModuleFlagSets({
      farmerWhere: { isActive: true },
      groupWhere: { isActive: true },
      scope: {},
      referenceYear: 2026,
    });

    expect(sets.nktStatus).toEqual(new Map([["pu-1", "AFFECTED"], ["pu-2", "NOT_AFFECTED"]]));
    expect(sets.parcel.nkt).toEqual(new Set(["pu-1", "pu-2"]));
    expect(sets.parcel.document).toEqual(new Set(["pu-1"]));
    expect(sets.parcelIdWithTree).toEqual(new Set(["p-1"]));
    expect(sets.parcelGeometryAreaHa.get("p-1")).toBe(1.25);
    expect(typeof sets.parcelGeometryAreaHa.get("p-1")).toBe("number");
    expect(sets.parcelIdOutsideBoundary).toEqual(new Set(["p-2"]));
    expect(sets.groupBoundaryGeom).toEqual(new Set(["g-1"]));
    expect(sets.groupCoordinateOutside).toEqual(new Map([["g-1", false], ["g-2", true]]));
    expect(sets.group.benchmark).toEqual(new Set(["g-1"]));

    // Ujung ke ujung lewat helper flag.
    expect(farmerModuleFlags(sets, "f-2")).toEqual({ stdb: false, bmpAssessment: false, bmpAssessmentNoDetails: true });
    expect(parcelModuleFlags(sets, { id: "p-2", parcelUid: "pu-2" }, "g-1")).toMatchObject({ nkt: true, nktStatus: "NOT_AFFECTED", outsideBoundary: true });
    expect(groupModuleFlags(sets, { id: "g-2" }).coordinateOutsideDistrict).toBe(true);
  });
});
