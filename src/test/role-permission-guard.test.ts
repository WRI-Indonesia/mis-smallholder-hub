import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & tulis matriks Role & Permission (`src/server/actions/role-permission.ts`)
 * tanpa DB — pola mock `land-marker-guard.test.ts`. Menu `settings-roles`
 * (baca VIEW, tulis EDIT). Yang dijaga: entri SUPERADMIN dibuang (bypass RBAC),
 * cabut = `updateMany isActive:false` (tak pernah `delete`), beri = aktifkan
 * baris lama atau `createMany` baru, audit createdBy/modifiedBy dari sesi.
 * `normalizeRolePermissionUpdates` memakai versi ASLI.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "admin-1" } }) }));

const db = vi.hoisted(() => {
  const rp = {
    findMany: vi.fn(), updateMany: vi.fn(), createMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
  };
  const m = { rolePermission: rp, $transaction: vi.fn() };
  return m;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getRolePermissions, setRolePermissions } = await import("@/server/actions/role-permission");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  db.rolePermission.findMany.mockResolvedValue([]);
  db.rolePermission.updateMany.mockResolvedValue({ count: 0 });
  db.rolePermission.createMany.mockResolvedValue({ count: 0 });
});

describe("guard — settings-roles", () => {
  it("getRolePermissions=VIEW (hanya aktif), ditolak → melempar tanpa query", async () => {
    await getRolePermissions();
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("settings-roles", "VIEW");
    expect(db.rolePermission.findMany.mock.calls[0][0].where).toEqual({ isActive: true });

    hasPermission.mockResolvedValue(false);
    await expect(getRolePermissions()).rejects.toThrow(/izin/);
    expect(db.rolePermission.findMany).toHaveBeenCalledOnce();
  });

  it("setRolePermissions=EDIT, ditolak → { success:false } tanpa transaksi", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await setRolePermissions([{ role: "OPERATOR", menuKey: "m", permission: "VIEW", granted: true }]);
    expect(res.success).toBe(false);
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("settings-roles", "EDIT");
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("setRolePermissions — tulis", () => {
  it("entri SUPERADMIN saja → no-op (count 0), tanpa transaksi", async () => {
    const res = await setRolePermissions([{ role: "SUPERADMIN", menuKey: "m", permission: "VIEW", granted: false }]);
    expect(res).toEqual({ success: true, data: { count: 0 } });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("aktifkan baris lama, nonaktifkan (soft) baris aktif, buat yang belum ada — audit dari sesi", async () => {
    db.rolePermission.findMany.mockResolvedValue([
      { id: "rp-off", role: "OPERATOR", menuKey: "a", permission: "VIEW", isActive: false },
      { id: "rp-on", role: "OPERATOR", menuKey: "b", permission: "EDIT", isActive: true },
    ]);
    const res = await setRolePermissions([
      { role: "OPERATOR", menuKey: "a", permission: "VIEW", granted: true },
      { role: "OPERATOR", menuKey: "b", permission: "EDIT", granted: false },
      { role: "DONOR", menuKey: "c", permission: "VIEW", granted: true },
      { role: "DONOR", menuKey: "d", permission: "VIEW", granted: false }, // belum ada & dicabut → tak ada tulis
    ]);
    expect(res).toEqual({ success: true, data: { count: 4 } });
    expect(db.rolePermission.updateMany.mock.calls).toEqual([
      [{ where: { id: { in: ["rp-off"] } }, data: { isActive: true, modifiedBy: "admin-1" } }],
      [{ where: { id: { in: ["rp-on"] } }, data: { isActive: false, modifiedBy: "admin-1" } }],
    ]);
    expect(db.rolePermission.createMany.mock.calls[0][0]).toEqual({
      data: [{ role: "DONOR", menuKey: "c", permission: "VIEW", createdBy: "admin-1" }],
    });
    expect(db.rolePermission.delete).not.toHaveBeenCalled();
    expect(db.rolePermission.deleteMany).not.toHaveBeenCalled();
  });

  it("status sudah sesuai → tidak ada updateMany/createMany", async () => {
    db.rolePermission.findMany.mockResolvedValue([{ id: "rp-1", role: "ADMIN", menuKey: "a", permission: "VIEW", isActive: true }]);
    await setRolePermissions([{ role: "ADMIN", menuKey: "a", permission: "VIEW", granted: true }]);
    expect(db.rolePermission.updateMany).not.toHaveBeenCalled();
    expect(db.rolePermission.createMany).not.toHaveBeenCalled();
  });
});
