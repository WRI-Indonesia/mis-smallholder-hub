import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupplyChainTables } from "@/lib/supply-chain-tables";

/**
 * Guard, scope, dan titik lahan aksi prototipe Supply Chain (#379) — tanpa DB.
 * Menu key di-hardcode `dashboard-supply-chain` / `map-supply-chain` (VIEW).
 * Record difilter per kode Lembaga dalam scope user; Mill/offtaker dikirim
 * sebatas yang dirujuk record terlihat. Pembaca tabel CSV dimock.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await import("@/lib/access-scope")),
  getAccessContext,
}));

const tables = vi.hoisted(() => ({ loadSupplyChainTables: vi.fn(), supplyChainTablesLocation: vi.fn(() => "lokasi-uji") }));
vi.mock("@/lib/supply-chain-tables", () => tables);

const db = vi.hoisted(() => ({ farmerGroup: { findMany: vi.fn() }, $queryRaw: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/supply-chain-prototype");

const rec = (id: string, groupCode: string, o: Partial<SupplyChainTables["records"][number]> = {}) => ({
  id, year: 2025, level: "LAHAN" as const, groupCode, surveyId: null, offtakerId: null, nextOfftakerId: null, millText: null,
  millId: "M1", millStatus: "PKS_PASTI" as const, millBasis: "NAMA_PKS", supplyTon: 10, toUl: false, ulTon: null, flags: [], ...o,
});
const survey = (id: string, groupCode: string, farmerId: string, parcelId: string) => ({
  id, year: 2025, groupCode, farmerId, parcelId, parcelIdFile: parcelId, ffbTon: 1, areaClaimHa: null, plantingYear: null, landRight: null,
  lat: 0.1, lon: 101.1, flags: [],
});
const TABLES: SupplyChainTables = {
  source: "uji",
  mills: [
    { id: "M1", umlId: "PO1", name: "A", company: "PT A", district: null, lat: 1, lon: 101, rspoStatus: null, source: "UML", buyerPrograms: [] },
    { id: "M2", umlId: "PO2", name: "B", company: "PT B", district: null, lat: 1, lon: 101, rspoStatus: null, source: "UML", buyerPrograms: [] },
  ],
  offtakers: [
    { id: "AGN-1", name: "Agen 1", type: "AGEN", district: "Siak", lat: null, lon: null, farmerGroupCode: null },
    { id: "AGN-2", name: "Agen 2", type: "AGEN", district: "Kampar", lat: null, lon: null, farmerGroupCode: null },
  ],
  records: [
    rec("r1", "G1", { offtakerId: "AGN-1", surveyId: "S1" }),
    rec("r2", "G1", { surveyId: "S2" }),
    rec("r3", "G2", { offtakerId: "AGN-2", millId: "M2" }),
  ],
  surveys: [survey("S1", "G1", "F-A", "P-001"), survey("S2", "G1", "F-B", "P-001")],
};
const GROUPS = [
  { code: "G1", name: "Lembaga 1", abrv: "L1", category: "SWADAYA", locationLat: 0.5, locationLong: 101.5, district: { name: "Siak" } },
  { code: "G2", name: "Lembaga 2", abrv: "L2", category: "EX_PLASMA", locationLat: 0.4, locationLong: 101.2, district: { name: "Kampar" } },
];

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  tables.loadSupplyChainTables.mockResolvedValue(TABLES);
  db.farmerGroup.findMany.mockResolvedValue(GROUPS);
  db.$queryRaw.mockResolvedValue([]);
});

describe("guard", () => {
  it("Dashboard → dashboard-supply-chain:VIEW; Peta → map-supply-chain:VIEW", async () => {
    await actions.getSupplyChainDashboardView();
    expect(hasPermission).toHaveBeenLastCalledWith("dashboard-supply-chain", "VIEW");
    await actions.getSupplyChainMapView();
    expect(hasPermission).toHaveBeenLastCalledWith("map-supply-chain", "VIEW");
  });

  it("tanpa izin → melempar sebelum membaca tabel maupun DB", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getSupplyChainDashboardView()).rejects.toThrow();
    await expect(actions.getSupplyChainMapView()).rejects.toThrow();
    expect(tables.loadSupplyChainTables).not.toHaveBeenCalled();
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
  });
});

describe("scope", () => {
  it("Lembaga dibaca dengan filter scope + isActive; record & master di luar scope tidak dikirim", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["fg-1"] });
    db.farmerGroup.findMany.mockResolvedValue([GROUPS[0]]);
    const view = await actions.getSupplyChainDashboardView();
    const where = db.farmerGroup.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ isActive: true, id: { in: ["fg-1"] } });
    expect(view.data.records.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(view.data.offtakers.map((o) => o.id)).toEqual(["AGN-1"]);
    expect(view.data.mills.map((m) => m.id)).toEqual(["M1"]);
  });

  it("tabel tidak tersedia → available=false, tanpa error", async () => {
    tables.loadSupplyChainTables.mockResolvedValue(null);
    const view = await actions.getSupplyChainDashboardView();
    expect(view.available).toBe(false);
    expect(view.tablesDir).toBe("lokasi-uji");
  });
});

describe("titik lahan Peta", () => {
  it("Parcel ID sama milik dua petani di satu Lembaga tidak saling menimpa (kunci menyertakan Farmer ID)", async () => {
    db.$queryRaw.mockResolvedValue([
      { parcel_id: "P-001", group_code: "G1", farmer_id: "F-A", farmer_name: "Petani A", lat: 0.11, lon: 101.11 },
      { parcel_id: "P-001", group_code: "G1", farmer_id: "F-B", farmer_name: "Petani B", lat: 0.22, lon: 101.22 },
    ]);
    const view = await actions.getSupplyChainMapView();
    const byId = new Map(view.parcels.map((p) => [p.surveyId, p]));
    expect(byId.get("S1")).toMatchObject({ farmerName: "Petani A", lat: 0.11, pointSource: "POLIGON" });
    expect(byId.get("S2")).toMatchObject({ farmerName: "Petani B", lat: 0.22, pointSource: "POLIGON" });
  });

  it("lahan tanpa poligon MIS memakai koordinat survei", async () => {
    const view = await actions.getSupplyChainMapView();
    expect(view.parcels.find((p) => p.surveyId === "S1")).toMatchObject({ pointSource: "SURVEI", lat: 0.1, farmerName: null });
  });
});
