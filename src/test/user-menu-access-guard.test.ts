import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard override hak akses per-user (`src/server/actions/user-menu-access.ts`)
 * tanpa DB — pola mock `land-marker-guard.test.ts`. Override grant/revoke
 * mengubah `hasPermission` user lain, jadi tulisnya wajib `settings-users:EDIT`
 * (baca efektif = VIEW). Yang dijaga juga: SUPERADMIN tak bisa di-override,
 * upsert menyalakan kembali baris nonaktif, dan hapus override = `isActive:false`
 * (kembali ke default role), tak pernah `delete`.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "admin-1" } }) }));

const db = vi.hoisted(() => {
  const model = () => ({ findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() });
  return { user: model(), menuItem: model(), rolePermission: model(), userPermissionOverride: model() };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/user-menu-access");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  db.user.findUnique.mockResolvedValue({ role: "OPERATOR" });
  db.menuItem.findMany.mockResolvedValue([]);
  db.rolePermission.findMany.mockResolvedValue([]);
  db.userPermissionOverride.findMany.mockResolvedValue([]);
  db.userPermissionOverride.upsert.mockResolvedValue({});
  db.userPermissionOverride.update.mockResolvedValue({});
});

describe("guard — settings-users + level", () => {
  it("getMenuItemsForSelect=EDIT, getUserEffectivePermissions=VIEW, set/remove override=EDIT", async () => {
    await actions.getMenuItemsForSelect();
    await actions.getUserEffectivePermissions("u-1");
    await actions.setUserMenuOverride("u-1", "master-data-farmers", "VIEW", true);
    await actions.removeUserMenuOverride("u-1", "master-data-farmers", "VIEW");
    expect(hasPermission.mock.calls).toEqual([
      ["settings-users", "EDIT"], ["settings-users", "VIEW"], ["settings-users", "EDIT"], ["settings-users", "EDIT"],
    ]);
  });

  it("izin ditolak → baca melempar, mutasi { success:false }, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getMenuItemsForSelect()).rejects.toThrow(/izin/i);
    await expect(actions.getUserEffectivePermissions("u-1")).rejects.toThrow(/izin/);
    expect((await actions.setUserMenuOverride("u-1", "m", "VIEW", true)).success).toBe(false);
    expect((await actions.removeUserMenuOverride("u-1", "m", "VIEW")).success).toBe(false);
    for (const m of Object.values(db)) for (const fn of Object.values(m)) expect(fn).not.toHaveBeenCalled();
  });
});

describe("baca", () => {
  it("getUserEffectivePermissions: permission role + override yang AKTIF saja", async () => {
    const res = await actions.getUserEffectivePermissions("u-1");
    expect(res.role).toBe("OPERATOR");
    expect(db.rolePermission.findMany.mock.calls[0][0].where).toEqual({ role: "OPERATOR", isActive: true });
    expect(db.userPermissionOverride.findMany.mock.calls[0][0].where).toEqual({ userId: "u-1", isActive: true });
  });

  it("getUserEffectivePermissions: user tak dikenal → melempar", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(actions.getUserEffectivePermissions("u-x")).rejects.toThrow(/tidak ditemukan/);
  });

  it("getMenuItemsForSelect hanya menu aktif", async () => {
    await actions.getMenuItemsForSelect();
    expect(db.menuItem.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
  });
});

describe("setUserMenuOverride / removeUserMenuOverride", () => {
  it("target SUPERADMIN → ditolak tanpa upsert", async () => {
    db.user.findUnique.mockResolvedValue({ role: "SUPERADMIN" });
    const res = await actions.setUserMenuOverride("sa-1", "settings-users", "EDIT", false);
    expect(res).toEqual({ success: false, error: "Tidak dapat mengubah hak akses SUPERADMIN" });
    expect(db.userPermissionOverride.upsert).not.toHaveBeenCalled();
  });

  it("upsert per (user, menu, level): update menyalakan isActive + modifiedBy, create membawa createdBy", async () => {
    await actions.setUserMenuOverride("u-1", "master-data-farmers", "DELETE", false);
    expect(db.userPermissionOverride.upsert.mock.calls[0][0]).toEqual({
      where: { userId_menuKey_permission: { userId: "u-1", menuKey: "master-data-farmers", permission: "DELETE" } },
      update: { granted: false, isActive: true, modifiedBy: "admin-1" },
      create: { userId: "u-1", menuKey: "master-data-farmers", permission: "DELETE", granted: false, isActive: true, createdBy: "admin-1" },
    });
  });

  it("upsert gagal → { success:false }", async () => {
    db.userPermissionOverride.upsert.mockRejectedValue(new Error("db"));
    expect((await actions.setUserMenuOverride("u-1", "m", "VIEW", true)).success).toBe(false);
  });

  it("remove → update isActive:false (soft delete), bukan delete; baris tak ada tetap sukses", async () => {
    await actions.removeUserMenuOverride("u-1", "master-data-farmers", "VIEW");
    expect(db.userPermissionOverride.update.mock.calls[0][0]).toMatchObject({
      where: { userId_menuKey_permission: { userId: "u-1", menuKey: "master-data-farmers", permission: "VIEW" } },
      data: { isActive: false },
    });
    expect(db.userPermissionOverride.delete).not.toHaveBeenCalled();
    expect(db.userPermissionOverride.deleteMany).not.toHaveBeenCalled();

    db.userPermissionOverride.update.mockRejectedValue(new Error("P2025"));
    expect(await actions.removeUserMenuOverride("u-1", "x", "VIEW")).toEqual({ success: true });
  });
});
