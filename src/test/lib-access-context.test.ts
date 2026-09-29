import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `getAccessContext` & `getAccessibleDistrictIds` ASLI (`src/lib/access-context.ts`)
 * — urutan prioritas mode akses: sesi kosong → BY_DISTRICT [], SUPERADMIN → ALL,
 * tanpa assignment → ALL, hanya KT → BY_FARMER_GROUP, provinsi/distrik apa pun
 * → BY_DISTRICT (KT diabaikan). `auth`/`prisma` di-mock.
 */
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth }));

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  farmerGroup: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

// #252: `cache` ASLI dibungkus spy — di luar render RSC React tidak memoize,
// jadi yang dikunci adalah bahwa `getAccessContext` memang dibungkus `cache()`.
const cacheSpy = vi.hoisted(() => ({ wrapped: [] as unknown[] }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => {
      const wrapped = actual.cache(fn);
      cacheSpy.wrapped.push(wrapped);
      return wrapped;
    },
  };
});

const { getAccessContext, getAccessibleDistrictIds } = await import("@/lib/access-context");

type Assign = { provinces?: { districts: string[] }[]; districts?: string[]; farmerGroups?: string[] };
function user(a: Assign) {
  return {
    id: "u1",
    provinces: (a.provinces ?? []).map((p) => ({ province: { districts: p.districts.map((id) => ({ id })) } })),
    districts: (a.districts ?? []).map((districtId) => ({ districtId })),
    farmerGroups: (a.farmerGroups ?? []).map((farmerGroupId) => ({ farmerGroupId })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "OPERATOR" } });
});

describe("getAccessContext — dedup per request (#252)", () => {
  it("dibungkus React cache() — satu kueri scope per render walau dipanggil banyak action", () => {
    expect(cacheSpy.wrapped).toContain(getAccessContext);
  });

  it("kueri user hanya memilih id (bukan baris distrik penuh per provinsi)", async () => {
    db.user.findUnique.mockResolvedValue(user({ districts: ["d1"] }));
    await getAccessContext();
    expect(db.user.findUnique.mock.calls[0][0]).toEqual({
      where: { id: "u1" },
      select: {
        provinces: { select: { province: { select: { districts: { select: { id: true } } } } } },
        districts: { select: { districtId: true } },
        farmerGroups: { select: { farmerGroupId: true } },
      },
    });
  });
});

describe("getAccessContext — mode akses", () => {
  it("tanpa sesi → BY_DISTRICT kosong (fail-closed), DB tak disentuh", async () => {
    auth.mockResolvedValue(null);
    expect(await getAccessContext()).toEqual({ mode: "BY_DISTRICT", ids: [] });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("SUPERADMIN → ALL tanpa membaca assignment", async () => {
    auth.mockResolvedValue({ user: { id: "u0", role: "SUPERADMIN" } });
    expect(await getAccessContext()).toEqual({ mode: "ALL" });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("user tidak ditemukan di DB → BY_DISTRICT kosong", async () => {
    db.user.findUnique.mockResolvedValue(null);
    expect(await getAccessContext()).toEqual({ mode: "BY_DISTRICT", ids: [] });
  });

  it("tanpa assignment sama sekali → ALL", async () => {
    db.user.findUnique.mockResolvedValue(user({}));
    expect(await getAccessContext()).toEqual({ mode: "ALL" });
    expect(db.user.findUnique.mock.calls[0][0].where).toEqual({ id: "u1" });
  });

  it("hanya Lembaga (KT) → BY_FARMER_GROUP dengan id Lembaga", async () => {
    db.user.findUnique.mockResolvedValue(user({ farmerGroups: ["kt-1", "kt-2"] }));
    expect(await getAccessContext()).toEqual({ mode: "BY_FARMER_GROUP", ids: ["kt-1", "kt-2"] });
  });

  it("provinsi diekspansi ke distriknya + union distrik langsung tanpa duplikat; KT diabaikan", async () => {
    db.user.findUnique.mockResolvedValue(
      user({ provinces: [{ districts: ["1401", "1405"] }], districts: ["1405", "1601"], farmerGroups: ["kt-1"] })
    );
    const ctx = await getAccessContext();
    expect(ctx.mode).toBe("BY_DISTRICT");
    expect(ctx.mode !== "ALL" && [...ctx.ids].sort()).toEqual(["1401", "1405", "1601"]);
  });

  it("hanya distrik (tanpa provinsi) → BY_DISTRICT distrik itu", async () => {
    db.user.findUnique.mockResolvedValue(user({ districts: ["1408"] }));
    expect(await getAccessContext()).toEqual({ mode: "BY_DISTRICT", ids: ["1408"] });
  });

  it("provinsi tanpa distrik terdaftar → BY_DISTRICT kosong (bukan ALL)", async () => {
    db.user.findUnique.mockResolvedValue(user({ provinces: [{ districts: [] }] }));
    expect(await getAccessContext()).toEqual({ mode: "BY_DISTRICT", ids: [] });
  });
});

describe("getAccessibleDistrictIds", () => {
  it("ALL → null (tanpa batasan)", async () => {
    expect(await getAccessibleDistrictIds({ mode: "ALL" })).toBeNull();
  });

  it("BY_DISTRICT → id apa adanya, tanpa query", async () => {
    expect(await getAccessibleDistrictIds({ mode: "BY_DISTRICT", ids: ["d1"] })).toEqual(["d1"]);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
  });

  it("BY_FARMER_GROUP → distrik unik dari Lembaga yang di-assign", async () => {
    db.farmerGroup.findMany.mockResolvedValue([{ districtId: "d1" }, { districtId: "d1" }, { districtId: "d2" }]);
    expect(await getAccessibleDistrictIds({ mode: "BY_FARMER_GROUP", ids: ["kt-1", "kt-2", "kt-3"] })).toEqual(["d1", "d2"]);
    expect(db.farmerGroup.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["kt-1", "kt-2", "kt-3"] } });
  });

  it("BY_FARMER_GROUP tanpa id → [] tanpa query", async () => {
    expect(await getAccessibleDistrictIds({ mode: "BY_FARMER_GROUP", ids: [] })).toEqual([]);
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
  });
});
