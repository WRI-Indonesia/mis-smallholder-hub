import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & aturan tulis Pengaturan › Wilayah (`src/server/actions/region.ts`)
 * tanpa DB — pola mock `land-marker-guard.test.ts`. Data master wilayah tidak
 * ber-scope (menu Settings), jadi yang dijaga: menu `settings-regions` + level,
 * validasi Zod, kode unik, toggle = `isActive` dibalik (tak pernah `delete`),
 * dan audit createdBy/modifiedBy dari sesi — sama untuk keempat level wilayah.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));

const db = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
  });
  return { province: model(), district: model(), subdistrict: model(), village: model() };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/region");

type Level = {
  label: string;
  model: keyof typeof db;
  parent: Record<string, string>;
  create: (i: never) => Promise<{ success: boolean; error?: unknown }>;
  update: (i: never) => Promise<{ success: boolean; error?: unknown }>;
  toggle: (id: string) => Promise<{ success: boolean; error?: unknown }>;
};
const LEVELS: Level[] = [
  { label: "provinsi", model: "province", parent: {}, create: actions.createProvince, update: actions.updateProvince, toggle: actions.toggleProvinceActive },
  { label: "distrik", model: "district", parent: { provinceId: "14" }, create: actions.createDistrict, update: actions.updateDistrict, toggle: actions.toggleDistrictActive },
  { label: "kecamatan", model: "subdistrict", parent: { districtId: "1401" }, create: actions.createSubdistrict, update: actions.updateSubdistrict, toggle: actions.toggleSubdistrictActive },
  { label: "desa", model: "village", parent: { subdistrictId: "140101" }, create: actions.createVillage, update: actions.updateVillage, toggle: actions.toggleVillageActive },
];

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  for (const m of Object.values(db)) {
    m.findUnique.mockResolvedValue(null);
    m.findFirst.mockResolvedValue(null);
    m.findMany.mockResolvedValue([]);
    m.create.mockResolvedValue({ id: "new" });
    m.update.mockResolvedValue({ id: "r-1" });
  }
});

describe("getRegionTree — settings-regions:VIEW", () => {
  it("izin ada → baca pohon provinsi", async () => {
    await actions.getRegionTree();
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("settings-regions", "VIEW");
    expect(db.province.findMany).toHaveBeenCalledOnce();
  });

  it("izin ditolak → melempar tanpa query", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getRegionTree()).rejects.toThrow(/izin/);
    expect(db.province.findMany).not.toHaveBeenCalled();
  });
});

for (const lv of LEVELS) {
  const m = () => db[lv.model];
  const valid = { code: "X1", name: "Nama Wilayah", ...lv.parent };

  describe(`${lv.label} — guard, Zod, kode unik, audit, soft delete`, () => {
    it("level: create=CREATE, update=EDIT, toggle=DELETE pada settings-regions", async () => {
      await lv.create(valid as never);
      await lv.update({ id: "r-1", ...valid } as never);
      await lv.toggle("r-1");
      expect(hasPermission.mock.calls).toEqual([
        ["settings-regions", "CREATE"], ["settings-regions", "EDIT"], ["settings-regions", "DELETE"],
      ]);
    });

    it("izin ditolak → { success:false } tanpa menyentuh DB", async () => {
      hasPermission.mockResolvedValue(false);
      expect((await lv.create(valid as never)).success).toBe(false);
      expect((await lv.update({ id: "r-1", ...valid } as never)).success).toBe(false);
      expect((await lv.toggle("r-1")).success).toBe(false);
      for (const fn of Object.values(m())) expect(fn).not.toHaveBeenCalled();
    });

    it("input tidak valid (kode kosong, nama 1 huruf) → fieldErrors tanpa DB", async () => {
      const res = await lv.create({ ...valid, code: "", name: "A" } as never);
      expect(res.success).toBe(false);
      expect(res.error).toHaveProperty("code");
      expect(res.error).toHaveProperty("name");
      expect(m().findUnique).not.toHaveBeenCalled();
      expect(m().create).not.toHaveBeenCalled();
    });

    it("kode sudah dipakai → ditolak (create) / dipakai baris lain → ditolak (update)", async () => {
      m().findUnique.mockResolvedValue({ id: "lain" });
      m().findFirst.mockResolvedValue({ id: "lain" });
      expect((await lv.create(valid as never)).error).toEqual({ code: ["Kode sudah digunakan"] });
      expect((await lv.update({ id: "r-1", ...valid } as never)).error).toEqual({ code: ["Kode sudah digunakan"] });
      expect(m().findFirst.mock.calls[0][0].where).toEqual({ code: "X1", NOT: { id: "r-1" } });
      expect(m().create).not.toHaveBeenCalled();
      expect(m().update).not.toHaveBeenCalled();
    });

    it("create → createdBy, update → modifiedBy dari sesi", async () => {
      await lv.create(valid as never);
      expect(m().create.mock.calls[0][0].data).toEqual({ ...valid, createdBy: "user-1" });
      await lv.update({ id: "r-1", ...valid } as never);
      expect(m().update.mock.calls[0][0]).toEqual({ where: { id: "r-1" }, data: { ...valid, modifiedBy: "user-1" } });
    });

    it("toggle → update isActive dibalik + modifiedBy, bukan delete; id tak dikenal → ditolak", async () => {
      m().findUnique.mockResolvedValue({ isActive: true });
      await lv.toggle("r-1");
      expect(m().update.mock.calls[0][0]).toEqual({ where: { id: "r-1" }, data: { isActive: false, modifiedBy: "user-1" } });
      expect(m().delete).not.toHaveBeenCalled();
      expect(m().deleteMany).not.toHaveBeenCalled();

      m().findUnique.mockResolvedValue(null);
      expect((await lv.toggle("r-x")).success).toBe(false);
      expect(m().update).toHaveBeenCalledTimes(1);
    });
  });
}
