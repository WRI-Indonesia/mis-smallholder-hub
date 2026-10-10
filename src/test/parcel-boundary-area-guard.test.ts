import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

/**
 * Guard action Luar Boundary & Selisih Luas (`src/server/actions/parcel-boundary-area.ts`,
 * #317 Fase 2) — tanpa DB, pola `parcel-overlap.test.ts`: izin
 * `data-analyst-parcel-overlap` (VIEW untuk daftar & preview, EXPORT untuk ekspor),
 * Zod gagal → tanpa `$queryRaw`, scope akses masuk ke SQL, dan soft delete
 * (`is_active`) di setiap tabel yang di-JOIN. Logika klasifikasi murni di
 * `parcel-boundary-area.test.ts`.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({ getAccessContext }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
const db = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getParcelOutsideBoundary, getParcelAreaMismatch, getParcelFindingGeometries } = await import("@/server/actions/parcel-boundary-area");

const MENU = "data-analyst-parcel-overlap";

/** Rakit ulang kueri yang dikirim ke `$queryRaw` (tagged template) → SQL + parameter. */
const sentQuery = (i = 0) => {
  const [strings, ...values] = db.$queryRaw.mock.calls[i] as [TemplateStringsArray, ...unknown[]];
  return Prisma.sql(strings, ...values);
};
const flat = (sql: string) => sql.replace(/\s+/g, " ");

const BASE = {
  id: "lp1", parcelId: "P-1", kelompokTani: null, farmerId: "f1", farmerCode: "F-1", farmerName: "Petani",
  groupId: "g1", groupName: "Lembaga", districtId: "d1", districtName: "Distrik",
};

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.$queryRaw.mockResolvedValue([]);
});

describe("getParcelOutsideBoundary & getParcelAreaMismatch — VIEW + scope SQL", () => {
  const actions: [string, () => Promise<unknown>][] = [
    ["getParcelOutsideBoundary", getParcelOutsideBoundary],
    ["getParcelAreaMismatch", getParcelAreaMismatch],
  ];
  for (const [name, call] of actions) {
    it(`${name}: tanpa VIEW → melempar, tanpa kueri & tanpa resolusi scope`, async () => {
      hasPermission.mockResolvedValue(false);
      await expect(call()).rejects.toThrow(/izin/);
      expect(hasPermission).toHaveBeenCalledExactlyOnceWith(MENU, "VIEW");
      expect(getAccessContext).not.toHaveBeenCalled();
      expect(db.$queryRaw).not.toHaveBeenCalled();
    });

    it(`${name}: BY_FARMER_GROUP → id Lembaga user masuk fragmen scope; lahan/petani/Lembaga aktif saja`, async () => {
      getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-1"] });
      await call();
      const q = sentQuery();
      expect(q.values).toContainEqual(["g-1"]);
      expect(flat(q.sql)).toMatch(/g\.id = ANY/);
      expect(q.sql).toMatch(/p\.is_active/);
      expect(q.sql).toMatch(/f\.id = p\.farmer_id AND f\.is_active/);
      expect(q.sql).toMatch(/g\.id = f\.farmer_group_id AND g\.is_active/);
    });

    it(`${name}: BY_DISTRICT → id distrik masuk fragmen scope`, async () => {
      getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d-9"] });
      await call();
      const q = sentQuery();
      expect(q.values).toContainEqual(["d-9"]);
      expect(flat(q.sql)).toMatch(/g\.district_id = ANY/);
    });
  }

  it("Luar Boundary: boundary aktif saja, Lembaga boundary juga ber-scope; angka numeric (string) dinormalkan", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g-1"] });
    db.$queryRaw.mockResolvedValue([{ ...BASE, polygonM2: "10000", intersects: false, outsideM2: "10000", distanceM: "12.4" }]);
    const rows = await getParcelOutsideBoundary();
    const q = sentQuery();
    expect(q.sql).toMatch(/b\.is_active AND b\.geom IS NOT NULL/);
    // Fragmen scope muncul di CTE boundary (sebelum GROUP BY) — union boundary Lembaga lain tak ikut dihitung.
    expect(flat(q.sql).indexOf("ANY")).toBeLessThan(flat(q.sql).indexOf("GROUP BY b.farmer_group_id"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "lp1", kind: "FULL", distanceM: 12 });
  });

  it("Selisih Luas: memakai ambang DA-02 sebagai parameter, bukan literal", async () => {
    db.$queryRaw.mockResolvedValue([{ ...BASE, recordedHa: "2", polygonM2: "10000" }]);
    const rows = await getParcelAreaMismatch();
    expect(rows).toHaveLength(1);
    const { PARCEL_AREA_MISMATCH_RATIO } = await import("@/lib/parcel-boundary-area");
    expect(sentQuery().values).toContain(PARCEL_AREA_MISMATCH_RATIO);
  });
});

describe("getParcelFindingGeometries — Zod dulu, lalu VIEW (preview) / EXPORT (ekspor)", () => {
  it("purpose asing / id cacat / preview > 1 lahan / ekspor kosong → ditolak tanpa cek izin & tanpa kueri", async () => {
    const bad: [string[], string][] = [
      [["lp1"], "bogus"],
      [["lp1;--"], "preview"],
      [["lp1", "lp2"], "preview"],
      [[], "export"],
      [["a".repeat(41)], "export"],
    ];
    for (const [ids, purpose] of bad) {
      expect(await getParcelFindingGeometries(ids, purpose as never)).toEqual({ success: false, error: "Lahan tidak valid" });
    }
    expect(hasPermission).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("preview butuh VIEW, ekspor butuh EXPORT; ditolak → tanpa kueri", async () => {
    hasPermission.mockResolvedValue(false);
    expect(await getParcelFindingGeometries(["lp1"], "preview")).toMatchObject({ success: false, error: expect.stringMatching(/izin/) });
    expect(hasPermission).toHaveBeenLastCalledWith(MENU, "VIEW");
    expect(await getParcelFindingGeometries(["lp1", "lp2"], "export")).toMatchObject({ success: false });
    expect(hasPermission).toHaveBeenLastCalledWith(MENU, "EXPORT");
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("ekspor dengan withBoundary → boundary TIDAK ikut (hanya preview); id & scope jadi parameter", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d-9"] });
    await getParcelFindingGeometries(["lp1", "lp2"], "export", true);
    const q = sentQuery();
    expect(q.values[0]).toBe(false);
    expect(q.values).toContainEqual(["lp1", "lp2"]);
    expect(q.values).toContainEqual(["d-9"]);
    expect(q.sql).toMatch(/p\.is_active AND p\.geom IS NOT NULL/);
    expect(q.sql).toMatch(/b\.is_active/);
  });

  it("preview + withBoundary → boundary diminta; geometri string di-parse, non-poligon dibuang", async () => {
    const poly = { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
    db.$queryRaw.mockResolvedValue([{ id: "lp1", gp: JSON.stringify(poly), gb: { type: "Point", coordinates: [0, 0] } }]);
    const res = await getParcelFindingGeometries(["lp1"], "preview", true);
    expect(sentQuery().values[0]).toBe(true);
    expect(res).toEqual({ success: true, data: [{ id: "lp1", parcel: poly, boundary: null }] });
  });
});
