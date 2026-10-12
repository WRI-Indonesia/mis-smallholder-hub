import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard 3 lapis action Ketersediaan Data › Produksi (#416) — tanpa DB:
 * izin dicek sebelum kueri; Lembaga/petani di luar scope → hasil kosong tanpa
 * kueri lanjutan; aksi khusus ekspor (Sheet 2 Excel) wajib EXPORT di server,
 * bukan sekadar tombol tersembunyi (review pra-rilis v1.7.0).
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({ getAccessContext }));

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn().mockResolvedValue([]),
  farmerGroup: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  farmer: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  landParcel: { findMany: vi.fn().mockResolvedValue([]) },
  productionRecord: { findMany: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/production-availability");
const MENU = "data-analyst-availability-production";

beforeEach(() => {
  vi.clearAllMocks();
  getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-in"] });
  db.farmerGroup.findFirst.mockResolvedValue(null);
  db.farmer.findFirst.mockResolvedValue(null);
  // `mockResolvedValueOnce` antrean dari test sebelumnya tidak boleh bocor.
  db.$queryRaw.mockReset().mockResolvedValue([]);
  db.farmerGroup.findMany.mockReset().mockResolvedValue([]);
  db.farmer.findMany.mockReset().mockResolvedValue([]);
  db.landParcel.findMany.mockReset().mockResolvedValue([]);
  db.productionRecord.findMany.mockReset().mockResolvedValue([]);
});

describe("izin dicek sebelum kueri", () => {
  it.each([
    ["getProductionAvailabilityView", () => actions.getProductionAvailabilityView()],
    ["getProductionAvailabilityFarmers", () => actions.getProductionAvailabilityFarmers("g-in", 2026)],
    ["getProductionAvailabilityParcels", () => actions.getProductionAvailabilityParcels("f-1", 2026)],
    ["getProductionAvailabilityGroupParcels", () => actions.getProductionAvailabilityGroupParcels("g-in", 2026)],
  ])("%s tanpa izin → throw, tanpa sentuh DB", async (_, call) => {
    hasPermission.mockResolvedValue(false);
    await expect(call()).rejects.toThrow(/izin/);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
    expect(db.farmer.findFirst).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("Sheet 2 Excel menuntut EXPORT, bukan VIEW", async () => {
    hasPermission.mockImplementation(async (_menu: string, perm: string) => perm === "VIEW");
    await expect(actions.getProductionAvailabilityGroupParcels("g-in", 2026)).rejects.toThrow(/mengekspor/);
    expect(hasPermission).toHaveBeenCalledWith(MENU, "EXPORT");
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("pohon layar cukup VIEW", async () => {
    hasPermission.mockImplementation(async (_menu: string, perm: string) => perm === "VIEW");
    await expect(actions.getProductionAvailabilityFarmers("g-in", 2026)).resolves.toEqual([]);
    expect(hasPermission).toHaveBeenCalledWith(MENU, "VIEW");
  });
});

describe("scope data", () => {
  beforeEach(() => hasPermission.mockResolvedValue(true));

  it("Lembaga di luar scope → [] tanpa kueri petani/record", async () => {
    await expect(actions.getProductionAvailabilityFarmers("g-out", 2026)).resolves.toEqual([]);
    // Regresi: spread `...farmerGroupAccessFilter` dulu MENIMPA `id: groupId` dengan `{ in: scope }`
    // sehingga Lembaga di luar scope lolos. Kini id yang diminta DAN scope sama-sama berlaku.
    const where = db.farmerGroup.findFirst.mock.calls[0][0].where;
    expect(where).toEqual({ AND: [{ id: "g-out", isActive: true }, { id: { in: ["g-in"] } }] });
    expect(db.farmer.findMany).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("ekspor Lembaga di luar scope → [] tanpa kueri lahan", async () => {
    await expect(actions.getProductionAvailabilityGroupParcels("g-out", 2026)).resolves.toEqual([]);
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toEqual({ AND: [{ id: "g-out", isActive: true }, { id: { in: ["g-in"] } }] });
    expect(db.landParcel.findMany).not.toHaveBeenCalled();
  });

  it("petani di luar scope (relasi farmerGroup ber-scope) → kosong", async () => {
    await expect(actions.getProductionAvailabilityParcels("f-out", 2026)).resolves.toEqual({ parcels: [], noParcel: [] });
    const where = db.farmer.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: "f-out", isActive: true, farmerGroup: { isActive: true } });
    expect(JSON.stringify(where.farmerGroup)).toContain("g-in");
  });

  it("tampilan utama: kueri Lembaga memakai filter aktif + scope", async () => {
    await actions.getProductionAvailabilityView();
    const where = db.farmerGroup.findMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(JSON.stringify(where)).toContain("g-in");
  });
});

/** Baris agregat SQL (owner, periode) — bentuk `CellRow` setelah cast ::int/::float8. */
const cellRow = (owner_id: string, period: string, o: Partial<Record<string, number>> = {}) => ({
  owner_id, period, parcels_reporting: 1, records: 1, linked_records: 1, kg: 100, zero_records: 0, estimate_records: 0, no_parcel_records: 0, ...o,
});

describe("tahun tidak valid", () => {
  beforeEach(() => hasPermission.mockResolvedValue(true));

  it("year non-integer (2026.5) → kosong tanpa scope & tanpa kueri", async () => {
    await expect(actions.getProductionAvailabilityFarmers("g-in", 2026.5)).resolves.toEqual([]);
    await expect(actions.getProductionAvailabilityGroupParcels("g-in", 2026.5)).resolves.toEqual([]);
    await expect(actions.getProductionAvailabilityParcels("f-1", 2026.5)).resolves.toEqual({ parcels: [], noParcel: [] });
    await expect(actions.getProductionAvailabilityFarmers("g-in", Number.NaN)).resolves.toEqual([]);
    expect(getAccessContext).not.toHaveBeenCalled();
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
    expect(db.farmer.findFirst).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.productionRecord.findMany).not.toHaveBeenCalled();
  });
});

describe("agregasi — tampilan utama (Lembaga × periode)", () => {
  beforeEach(() => hasPermission.mockResolvedValue(true));

  it("penyebut lahan per Lembaga, sel diurutkan per periode, Lembaga tanpa data → 0 & []", async () => {
    db.farmerGroup.findMany.mockResolvedValue([
      { id: "g-in", name: "A", code: "A1", abrv: "A", category: "SWADAYA", districtId: "d-1", district: { name: "Siak" } },
      { id: "g-2", name: "B", code: "B1", abrv: null, category: "SWADAYA", districtId: "d-1", district: { name: "Siak" } },
    ]);
    db.$queryRaw
      // 1) penyebut (urutan Promise.all: penyebut lalu sel)
      .mockResolvedValueOnce([{ group_id: "g-in", total_farmers: 3, total_parcels: 5, non_psr_parcels: 4 }])
      // 2) sel — sengaja tidak terurut
      .mockResolvedValueOnce([
        cellRow("g-in", "2026-03", { kg: 300, estimate_records: 1 }),
        cellRow("g-in", "2025-12"),
        cellRow("g-in", "2026-01", { zero_records: 1, kg: 0, no_parcel_records: 1, linked_records: 0 }),
      ]);
    const view = await actions.getProductionAvailabilityView();
    expect(view.referencePeriod).toMatch(/^\d{4}-\d{2}$/);
    const [a, b] = view.groups;
    expect(a).toMatchObject({ id: "g-in", districtName: "Siak", totalFarmers: 3, totalParcels: 5, nonPsrParcels: 4 });
    expect(a.cells.map((c) => c.period)).toEqual(["2025-12", "2026-01", "2026-03"]);
    expect(a.cells[1]).toEqual({
      period: "2026-01", parcelsReporting: 1, records: 1, linkedRecords: 0, kg: 0, zeroRecords: 1, estimateRecords: 0, noParcelRecords: 1,
    });
    expect(a.cells[2]).toMatchObject({ kg: 300, estimateRecords: 1 });
    expect(b).toMatchObject({ id: "g-2", totalFarmers: 0, totalParcels: 0, nonPsrParcels: 0, cells: [] });
  });
});

describe("agregasi — baris petani satu Lembaga", () => {
  beforeEach(() => {
    hasPermission.mockResolvedValue(true);
    db.farmerGroup.findFirst.mockResolvedValue({ id: "g-in" });
  });

  it("totalParcels/nonPsrParcels dari lahan aktif; sel per petani terurut; petani tanpa record ikut", async () => {
    db.farmer.findMany.mockResolvedValue([
      { id: "f-1", name: "Ani", farmerId: "P.01", landParcels: [{ isPsr: false }, { isPsr: true }, { isPsr: false }] },
      { id: "f-2", name: "Budi", farmerId: "P.02", landParcels: [] },
    ]);
    db.$queryRaw.mockResolvedValueOnce([cellRow("f-1", "2026-05"), cellRow("f-1", "2026-02", { records: 2 })]);
    const rows = await actions.getProductionAvailabilityFarmers("g-in", 2026);
    expect(rows[0]).toMatchObject({ id: "f-1", farmerCode: "P.01", totalParcels: 3, nonPsrParcels: 2 });
    expect(rows[0].cells.map((c) => [c.period, c.records])).toEqual([["2026-02", 2], ["2026-05", 1]]);
    expect(rows[1]).toMatchObject({ id: "f-2", totalParcels: 0, nonPsrParcels: 0, cells: [] });
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ farmerGroupId: "g-in", isActive: true });
    // Rentang tahun dikirim sebagai parameter SQL (indeks `period`).
    expect(JSON.stringify(db.$queryRaw.mock.calls[0][0].values)).toContain("2026-01");
    expect(JSON.stringify(db.$queryRaw.mock.calls[0][0].values)).toContain("2026-12");
  });
});

describe("agregasi — Sheet 2 ekspor (lahan × bulan satu Lembaga)", () => {
  beforeEach(() => {
    hasPermission.mockResolvedValue(true);
    db.farmerGroup.findFirst.mockResolvedValue({ id: "g-in" });
  });

  const cell = (parcel_id: string, farmer_id: string, period: string, o: Partial<Record<string, number>> = {}) => ({
    parcel_id, farmer_id, period, records: 1, kg: 50, zero_records: 0, estimate_records: 0, ...o,
  });

  it("tanpa record lain → hanya baris lahan sendiri, sel terurut, tanpa kueri tambahan", async () => {
    db.landParcel.findMany.mockResolvedValueOnce([
      { id: "lp-1", parcelId: "L.01", isPsr: false, area: 1.5, farmerId: "f-1", farmer: { name: "Ani", farmerId: "P.01" } },
    ]);
    db.$queryRaw.mockResolvedValueOnce([cell("lp-1", "f-1", "2026-04"), cell("lp-1", "f-1", "2026-01", { estimate_records: 1 })]);
    const rows = await actions.getProductionAvailabilityGroupParcels("g-in", 2026);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "lp-1", parcelCode: "L.01", isOwn: true, farmerName: "Ani", farmerCode: "P.01" });
    expect(rows[0].cells).toEqual([
      { period: "2026-01", records: 1, kg: 50, zeroRecords: 0, estimateRecords: 1 },
      { period: "2026-04", records: 1, kg: 50, zeroRecords: 0, estimateRecords: 0 },
    ]);
    expect(db.landParcel.findMany).toHaveBeenCalledOnce();
    expect(db.farmer.findMany).not.toHaveBeenCalled();
  });

  it("lahan lain: '(nonaktif)', '(lahan tidak ditemukan)', dan satu lahan dicatat dua petani = dua baris", async () => {
    db.landParcel.findMany
      .mockResolvedValueOnce([
        { id: "lp-1", parcelId: "L.01", isPsr: false, area: 1.5, farmerId: "f-1", farmer: { name: "Ani", farmerId: "P.01" } },
      ])
      // kueri tambahan lahan "lain"
      .mockResolvedValueOnce([
        { id: "lp-1", parcelId: "L.01", isPsr: false, area: 1.5, isActive: true },
        { id: "lp-old", parcelId: "L.02", isPsr: true, area: 2, isActive: false },
      ]);
    db.farmer.findMany.mockResolvedValueOnce([
      { id: "f-1", name: "Ani", farmerId: "P.01" },
      { id: "f-2", name: "Budi", farmerId: "P.02" },
    ]);
    db.$queryRaw.mockResolvedValueOnce([
      cell("lp-1", "f-1", "2026-01"),
      // lahan lp-1 juga dicatat petani f-2 → baris kedua (kunci lahan|petani)
      cell("lp-1", "f-2", "2026-02"),
      cell("lp-old", "f-1", "2026-03"),
      cell("lp-gone", "f-2", "2026-04", { zero_records: 1, kg: 0 }),
    ]);
    const rows = await actions.getProductionAvailabilityGroupParcels("g-in", 2026);
    expect(rows.map((r) => [r.id, r.parcelCode, r.isOwn, r.farmerCode])).toEqual([
      ["lp-1", "L.01", true, "P.01"],
      ["lp-1", "L.01", false, "P.02"],
      ["lp-old", "L.02 (nonaktif)", false, "P.01"],
      ["lp-gone", "(lahan tidak ditemukan)", false, "P.02"],
    ]);
    // Baris own hanya memuat sel petaninya sendiri; sel f-2 di lahan yang sama tidak tercampur.
    expect(rows[0].cells.map((c) => c.period)).toEqual(["2026-01"]);
    expect(rows[1].cells.map((c) => c.period)).toEqual(["2026-02"]);
    expect(rows[2]).toMatchObject({ isPsr: true, area: 2 });
    expect(rows[3]).toMatchObject({ isPsr: false, area: null, cells: [{ period: "2026-04", records: 1, kg: 0, zeroRecords: 1, estimateRecords: 0 }] });
    // Kueri tambahan: id unik lahan & petani dari kunci "lain".
    expect(db.landParcel.findMany.mock.calls[1][0].where).toEqual({ id: { in: ["lp-1", "lp-old", "lp-gone"] } });
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["f-2", "f-1"] } });
  });
});

describe("agregasi — baris lahan satu petani", () => {
  beforeEach(() => {
    hasPermission.mockResolvedValue(true);
    db.farmer.findFirst.mockResolvedValue({
      id: "f-1",
      landParcels: [
        { id: "lp-1", parcelId: "L.01", isPsr: false, area: 1 },
        { id: "lp-2", parcelId: "L.02", isPsr: true, area: 2 },
      ],
    });
  });

  const rec = (o: { parcelId?: string | null; period: string; yieldKg?: number; notes?: string | null; parcel?: unknown }) => ({
    parcelId: o.parcelId === undefined ? "lp-1" : o.parcelId,
    period: o.period,
    yieldKg: o.yieldKg ?? 100,
    notes: o.notes ?? null,
    parcel: o.parcel === undefined ? { id: "lp-1", parcelId: "L.01", isPsr: false, area: 1, isActive: true } : o.parcel,
  });

  it("record dijumlah per lahan × periode; 'Estimasi' → estimateRecords; 0 kg → zeroRecords; tanpa parcelId → noParcel", async () => {
    db.productionRecord.findMany.mockResolvedValue([
      rec({ period: "2026-03", yieldKg: 200, notes: "Estimasi fasilitator" }),
      rec({ period: "2026-03", yieldKg: 0 }),
      rec({ period: "2026-01", yieldKg: 50, notes: "estimasi" }),
      rec({ parcelId: null, parcel: null, period: "2026-02", yieldKg: 10 }),
      rec({ parcelId: null, parcel: null, period: "2026-02", yieldKg: 5, notes: "ESTIMASI" }),
    ]);
    const res = await actions.getProductionAvailabilityParcels("f-1", 2026);
    expect(res.parcels.map((p) => [p.id, p.isOwn])).toEqual([["lp-1", true], ["lp-2", true]]);
    expect(res.parcels[0].cells).toEqual([
      { period: "2026-01", records: 1, kg: 50, zeroRecords: 0, estimateRecords: 1 },
      { period: "2026-03", records: 2, kg: 200, zeroRecords: 1, estimateRecords: 1 },
    ]);
    expect(res.parcels[1].cells).toEqual([]);
    expect(res.noParcel).toEqual([{ period: "2026-02", records: 2, kg: 15, zeroRecords: 0, estimateRecords: 1 }]);
    expect(db.productionRecord.findMany.mock.calls[0][0].where).toEqual({
      isActive: true,
      period: { gte: "2026-01", lte: "2026-12" },
      farmerId: "f-1",
    });
  });

  it("lahan bukan milik aktif petani → baris 'lain' (isOwn false) sekali saja, label '(nonaktif)' bila lahannya nonaktif", async () => {
    const other = { id: "lp-x", parcelId: "X.09", isPsr: false, area: 3, isActive: false };
    const otherActive = { id: "lp-y", parcelId: "Y.01", isPsr: true, area: null, isActive: true };
    db.productionRecord.findMany.mockResolvedValue([
      rec({ parcelId: "lp-x", parcel: other, period: "2026-02" }),
      rec({ parcelId: "lp-x", parcel: other, period: "2026-01" }),
      rec({ parcelId: "lp-y", parcel: otherActive, period: "2026-05" }),
    ]);
    const res = await actions.getProductionAvailabilityParcels("f-1", 2026);
    expect(res.parcels.map((p) => [p.id, p.parcelCode, p.isOwn])).toEqual([
      ["lp-1", "L.01", true],
      ["lp-2", "L.02", true],
      ["lp-x", "X.09 (nonaktif)", false],
      ["lp-y", "Y.01", false],
    ]);
    expect(res.parcels[2].cells.map((c) => c.period)).toEqual(["2026-01", "2026-02"]);
    expect(res.parcels[3]).toMatchObject({ isPsr: true, area: null });
    expect(res.noParcel).toEqual([]);
  });
});
