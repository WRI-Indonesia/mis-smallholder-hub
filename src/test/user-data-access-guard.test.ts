import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard penugasan wilayah/Lembaga ke user (`src/server/actions/user-data-access.ts`)
 * tanpa DB — pola mock `land-marker-guard.test.ts`. Penugasan inilah sumber
 * `getAccessContext`, jadi setiap tulisnya wajib `settings-users:EDIT`
 * (baca = VIEW). `UserProvince`/`UserDistrict`/`UserFarmerGroup` tidak punya
 * `isActive` — hapus via `deleteMany` adalah pengecualian soft delete yang
 * TERCATAT (docs/database/models.md), dan dibatasi pasangan (userId, targetId).
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "admin-1" } }) }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({ getAccessContext }));

const db = vi.hoisted(() => {
  const model = () => ({ findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), count: vi.fn() });
  return {
    user: model(), province: model(), district: model(), farmerGroup: model(),
    userProvince: model(), userDistrict: model(), userFarmerGroup: model(),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/user-data-access");

type Res = { success: boolean; error?: unknown };
const PAIRS: [string, keyof typeof db, string, (u: string, t: string) => Promise<Res>, (u: string, t: string) => Promise<Res>][] = [
  ["provinsi", "userProvince", "provinceId", actions.assignUserProvince, actions.removeUserProvince],
  ["distrik", "userDistrict", "districtId", actions.assignUserDistrict, actions.removeUserDistrict],
  ["Lembaga", "userFarmerGroup", "farmerGroupId", actions.assignUserFarmerGroup, actions.removeUserFarmerGroup],
];

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  for (const m of Object.values(db)) {
    m.findMany.mockResolvedValue([]);
    m.findUnique.mockResolvedValue(null);
    m.create.mockResolvedValue({});
    m.deleteMany.mockResolvedValue({ count: 1 });
    m.count.mockResolvedValue(2);
    m.findFirst.mockResolvedValue({ id: "t-1" });
  }
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.user.findUnique.mockResolvedValue({ id: "u-1", role: "OPERATOR" });
  db.farmerGroup.findUnique.mockResolvedValue({ districtId: "d1" });
});

describe("baca — getUserDataAccess VIEW, getRegionsForSelect EDIT", () => {
  it("level sesuai kode", async () => {
    await actions.getUserDataAccess("u-1");
    await actions.getRegionsForSelect();
    expect(hasPermission.mock.calls).toEqual([["settings-users", "VIEW"], ["settings-users", "EDIT"]]);
  });

  it("izin ditolak → melempar tanpa query", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getUserDataAccess("u-1")).rejects.toThrow(/izin/);
    await expect(actions.getRegionsForSelect()).rejects.toThrow(/izin/i);
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.province.findMany).not.toHaveBeenCalled();
  });

  it("getRegionsForSelect hanya menawarkan wilayah & Lembaga aktif", async () => {
    await actions.getRegionsForSelect();
    for (const m of [db.province, db.district, db.farmerGroup]) {
      expect(m.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
    }
  });
});

for (const [label, model, field, assign, remove] of PAIRS) {
  describe(`penugasan ${label}`, () => {
    it("izin EDIT ditolak → assign & remove gagal, tabel penugasan tak disentuh", async () => {
      hasPermission.mockResolvedValue(false);
      expect((await assign("u-1", "t-1")).success).toBe(false);
      expect((await remove("u-1", "t-1")).success).toBe(false);
      expect(hasPermission.mock.calls).toEqual([["settings-users", "EDIT"], ["settings-users", "EDIT"]]);
      expect(db[model].create).not.toHaveBeenCalled();
      expect(db[model].deleteMany).not.toHaveBeenCalled();
    });

    it("assign → create dengan createdBy dari sesi; gagal unik → { success:false }", async () => {
      expect((await assign("u-1", "t-1")).success).toBe(true);
      expect(db[model].create.mock.calls[0][0]).toEqual({ data: { userId: "u-1", [field]: "t-1", createdBy: "admin-1" } });

      db[model].create.mockRejectedValue(new Error("P2002"));
      expect(await assign("u-1", "t-1")).toEqual({ success: false, error: "Gagal menyimpan atau sudah terassign" });
    });

    it("remove → deleteMany dibatasi pasangan (userId, target) — pengecualian soft delete tercatat", async () => {
      await remove("u-1", "t-1");
      expect(db[model].deleteMany.mock.calls[0][0]).toEqual({ where: { userId: "u-1", [field]: "t-1" } });
    });
  });
}
