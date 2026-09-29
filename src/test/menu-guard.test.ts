import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & aturan tulis Pengaturan › Menu (`src/server/actions/menu.ts`) tanpa
 * DB — pola mock `land-marker-guard.test.ts`. Menu key `settings-menu`
 * (daftar lengkap juga dibuka untuk `settings-roles`: matriks Role &
 * Permission). Yang dijaga: level per action, Zod key, key unik, kedalaman ≤ 3,
 * `key` tak bisa diganti lewat update, hapus = `isActive/isVisible:false`
 * (tak pernah `delete`), audit dari sesi. `menu-utils` memakai versi ASLI.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "admin-1" } }) }));

const db = vi.hoisted(() => ({
  menuItem: {
    findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/menu");

const item = (key: string, parentKey: string | null, id = key) => ({
  id, key, parentKey, title: key, url: `/admin/${key}`, icon: null, order: 0, isActive: true, isVisible: true,
});
const input = (o: Record<string, unknown> = {}) => ({
  key: "menu-baru", parentKey: null, title: "Menu Baru", url: "/admin/baru", icon: null, order: 1, isActive: true, isVisible: true, ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  db.menuItem.findMany.mockResolvedValue([]);
  db.menuItem.findUnique.mockResolvedValue(null);
  db.menuItem.create.mockResolvedValue({});
  db.menuItem.update.mockResolvedValue({});
});

describe("guard", () => {
  it("create=CREATE, update=EDIT, delete=DELETE pada settings-menu", async () => {
    await actions.createMenuItem(input());
    await actions.updateMenuItem({ id: "m-1", ...input() });
    await actions.deleteMenuItem("m-1");
    expect(hasPermission.mock.calls).toEqual([
      ["settings-menu", "CREATE"], ["settings-menu", "EDIT"], ["settings-menu", "DELETE"],
    ]);
  });

  it("getAllMenuItems: settings-menu:VIEW ATAU settings-roles:VIEW; keduanya ditolak → melempar", async () => {
    hasPermission.mockImplementation(async (menu: string) => menu === "settings-roles");
    await actions.getAllMenuItems();
    expect(db.menuItem.findMany).toHaveBeenCalledOnce();

    hasPermission.mockResolvedValue(false);
    await expect(actions.getAllMenuItems()).rejects.toThrow(/izin/);
    expect(hasPermission).toHaveBeenCalledWith("settings-menu", "VIEW");
    expect(hasPermission).toHaveBeenCalledWith("settings-roles", "VIEW");
    expect(db.menuItem.findMany).toHaveBeenCalledOnce();
  });

  it("izin ditolak → mutasi { success:false }, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    expect((await actions.createMenuItem(input())).success).toBe(false);
    expect((await actions.updateMenuItem({ id: "m-1", ...input() })).success).toBe(false);
    expect((await actions.deleteMenuItem("m-1")).success).toBe(false);
    for (const fn of Object.values(db.menuItem)) expect(fn).not.toHaveBeenCalled();
  });

  it("getMenuItems (sidebar) hanya membaca menu aktif & tampil", async () => {
    await actions.getMenuItems();
    expect(db.menuItem.findMany.mock.calls[0][0].where).toEqual({ isActive: true, isVisible: true });
  });
});

describe("createMenuItem / updateMenuItem", () => {
  it("key berhuruf besar/spasi → fieldErrors tanpa DB", async () => {
    const res = await actions.createMenuItem(input({ key: "Menu Baru" }));
    expect(res.success).toBe(false);
    expect(res.error).toHaveProperty("key");
    expect(db.menuItem.findUnique).not.toHaveBeenCalled();
  });

  it("key sudah dipakai → ditolak", async () => {
    db.menuItem.findUnique.mockResolvedValue(item("menu-baru", null));
    expect((await actions.createMenuItem(input())).error).toEqual({ key: ["Key sudah digunakan"] });
    expect(db.menuItem.create).not.toHaveBeenCalled();
  });

  it("induk sudah di level 3 → kedalaman 4 ditolak", async () => {
    db.menuItem.findMany.mockResolvedValue([item("l1", null), item("l2", "l1"), item("l3", "l2")]);
    const res = await actions.createMenuItem(input({ parentKey: "l3" }));
    expect(res.error).toHaveProperty("parentKey");
    expect(db.menuItem.create).not.toHaveBeenCalled();
  });

  it("create sukses → createdBy dari sesi", async () => {
    await actions.createMenuItem(input({ parentKey: "l1" }));
    expect(db.menuItem.create.mock.calls[0][0].data).toMatchObject({ key: "menu-baru", parentKey: "l1", createdBy: "admin-1" });
  });

  it("update → modifiedBy dari sesi, `key` TIDAK ikut ditulis (kunci RBAC stabil)", async () => {
    await actions.updateMenuItem({ id: "m-1", ...input({ key: "key-diganti" }) });
    const call = db.menuItem.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "m-1" });
    expect(call.data).toMatchObject({ modifiedBy: "admin-1" });
    expect(call.data).not.toHaveProperty("key");
  });

  it("title & order dari klien TIDAK ditulis — hanya lewat menu.csv + seed (#364 opsi b)", async () => {
    // Payload langsung ke action (bukan lewat form) tetap membawa title/order.
    const payload = { id: "m-1", ...input({ title: "Data — All Lembaga", order: 99 }) } as Parameters<typeof actions.updateMenuItem>[0];
    expect((await actions.updateMenuItem(payload)).success).toBe(true);
    const { data } = db.menuItem.update.mock.calls[0][0];
    expect(data).not.toHaveProperty("title");
    expect(data).not.toHaveProperty("order");
    expect(data).toMatchObject({ url: payload.url, isActive: payload.isActive, isVisible: payload.isVisible });
  });
});

describe("deleteMenuItem — soft delete", () => {
  it("update isActive:false + isVisible:false + modifiedBy, bukan delete", async () => {
    expect((await actions.deleteMenuItem("m-1")).success).toBe(true);
    expect(db.menuItem.update.mock.calls[0][0]).toEqual({
      where: { id: "m-1" }, data: { isActive: false, isVisible: false, modifiedBy: "admin-1" },
    });
    expect(db.menuItem.delete).not.toHaveBeenCalled();
    expect(db.menuItem.deleteMany).not.toHaveBeenCalled();
  });
});
