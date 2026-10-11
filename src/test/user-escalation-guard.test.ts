import { describe, it, expect, vi, beforeEach } from "vitest";
import { roleGrantError, rolePermissionEditError, userAdminScopeError, userTargetError } from "@/lib/user-admin-guard";

/**
 * Anti-eskalasi Settings › Users & Role & Permission (#386 butir 2, keputusan owner
 * 2026-10-10, diperketat sesudah review 61d002a):
 * 1. pengelolaan pengguna hanya oleh pemanggil tanpa batasan wilayah (scope ALL);
 * 2. role/akun SUPERADMIN hanya oleh SUPERADMIN;
 * 3. akun sendiri terkunci (role, status, penugasan, override; nama/email/password boleh);
 * 4. matriks Role & Permission hanya diubah SUPERADMIN.
 * Menguji helper murni ASLI dan aksi ASLI dengan Prisma/sesi tiruan.
 */
const session = vi.hoisted(() => ({ user: { id: "admin-1", role: "ADMIN" } }));
vi.mock("@/lib/auth", () => ({ auth: async () => session }));
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", () => ({ getAccessContext }));
vi.mock("bcryptjs", () => ({ default: { hash: async (p: string) => `hash(${p})` } }));

const USERS: Record<string, { id: string; role: string; isActive: boolean }> = {
  "admin-1": { id: "admin-1", role: "ADMIN", isActive: true },
  "op-1": { id: "op-1", role: "OPERATOR", isActive: true },
  "sa-1": { id: "sa-1", role: "SUPERADMIN", isActive: true },
  "sa-2": { id: "sa-2", role: "SUPERADMIN", isActive: true },
};
const db = vi.hoisted(() => {
  const model = () => ({
    findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn(),
    updateMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), count: vi.fn(),
  });
  const m = {
    user: model(), province: model(), district: model(), farmerGroup: model(), userPermissionOverride: model(),
    userProvince: model(), userDistrict: model(), userFarmerGroup: model(), rolePermission: model(), $transaction: vi.fn(),
  };
  m.$transaction.mockImplementation(async (fn: (tx: typeof m) => unknown) => fn(m));
  return m;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const userActions = await import("@/server/actions/user");
const access = await import("@/server/actions/user-data-access");
const overrides = await import("@/server/actions/user-menu-access");
const roles = await import("@/server/actions/role-permission");

const asActor = (id: string, role: string) => Object.assign(session.user, { id, role });
const OP = { name: "Nama Uji", email: "uji@example.org", password: "", role: "OPERATOR" as const };
const BY_DISTRICT = { mode: "BY_DISTRICT", ids: ["d1"] };
const ACTIVE_REGIONS = new Set(["p1", "d1", "G1"]);

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  asActor("admin-1", "ADMIN");
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string } }) => (where.id ? USERS[where.id] ?? null : null));
  db.user.findFirst.mockResolvedValue(null);
  db.user.findMany.mockResolvedValue([]);
  db.user.create.mockResolvedValue({ id: "u-new" });
  for (const m of [db.province, db.district, db.farmerGroup]) {
    m.findFirst.mockImplementation(async ({ where }: { where: { id: string; isActive: boolean } }) => (ACTIVE_REGIONS.has(where.id) && where.isActive ? { id: where.id } : null));
  }
  db.rolePermission.findMany.mockResolvedValue([]);
});

describe("helper murni", () => {
  it("userAdminScopeError: hanya scope ALL", () => {
    expect(userAdminScopeError({ mode: "ALL" })).toBeNull();
    expect(userAdminScopeError({ mode: "BY_DISTRICT", ids: ["d1"] })).toMatch(/tanpa batasan wilayah/);
    expect(userAdminScopeError({ mode: "BY_FARMER_GROUP", ids: ["G1"] })).toMatch(/tanpa batasan wilayah/);
  });

  it("userTargetError: SUPERADMIN hanya oleh SUPERADMIN; akun sendiri terkunci kecuali allowSelf", () => {
    const admin = { id: "a", role: "ADMIN" };
    expect(userTargetError(admin, null)).toMatch(/tidak ditemukan/);
    expect(userTargetError(admin, { id: "s", role: "SUPERADMIN" })).toMatch(/Hanya SUPERADMIN/);
    expect(userTargetError({ id: "s2", role: "SUPERADMIN" }, { id: "s", role: "SUPERADMIN" })).toBeNull();
    expect(userTargetError(admin, admin)).toMatch(/akun Anda sendiri/);
    expect(userTargetError(admin, admin, { allowSelf: true })).toBeNull();
  });

  it("roleGrantError & rolePermissionEditError: SUPERADMIN saja", () => {
    expect(roleGrantError({ id: "a", role: "ADMIN" }, "SUPERADMIN")).toMatch(/Hanya SUPERADMIN/);
    expect(roleGrantError({ id: "a", role: "ADMIN" }, "OPERATOR")).toBeNull();
    expect(roleGrantError({ id: "s", role: "SUPERADMIN" }, "SUPERADMIN")).toBeNull();
    expect(rolePermissionEditError({ id: "a", role: "ADMIN" })).toMatch(/Hanya SUPERADMIN/);
    expect(rolePermissionEditError({ id: "s", role: "SUPERADMIN" })).toBeNull();
  });
});

describe("aturan 1 — pemanggil ber-scope ditolak di semua jalur kelola pengguna", () => {
  beforeEach(() => getAccessContext.mockResolvedValue(BY_DISTRICT));

  it("baca daftar pengguna / penugasan / wilayah / izin efektif → melempar", async () => {
    await expect(userActions.getUsers()).rejects.toThrow(/tanpa batasan wilayah/);
    await expect(access.getUserDataAccess("op-1")).rejects.toThrow(/tanpa batasan wilayah/);
    await expect(access.getRegionsForSelect()).rejects.toThrow(/tanpa batasan wilayah/);
    await expect(overrides.getUserEffectivePermissions("op-1")).rejects.toThrow(/tanpa batasan wilayah/);
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("buat (akun tanpa penugasan = akses semua data), ubah/reset password, nonaktifkan → ditolak tanpa tulis", async () => {
    expect((await userActions.createUser({ ...OP, password: "rahasia1" })).success).toBe(false);
    expect((await userActions.updateUser({ id: "op-1", ...OP, password: "baru999" })).success).toBe(false);
    expect((await userActions.toggleUserActive("op-1")).success).toBe(false);
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("penugasan (assign & remove, termasuk dalam distrik scope sendiri) dan override → ditolak tanpa tulis", async () => {
    expect((await access.assignUserDistrict("op-1", "d1")).success).toBe(false);
    expect((await access.removeUserDistrict("op-1", "d1")).success).toBe(false);
    expect((await access.assignUserFarmerGroup("op-1", "G1")).success).toBe(false);
    expect((await overrides.setUserMenuOverride("op-1", "settings-users", "EDIT", true)).success).toBe(false);
    expect((await overrides.removeUserMenuOverride("op-1", "settings-users", "EDIT")).success).toBe(false);
    for (const m of [db.userDistrict, db.userFarmerGroup]) {
      expect(m.create).not.toHaveBeenCalled();
      expect(m.deleteMany).not.toHaveBeenCalled();
    }
    expect(db.userPermissionOverride.upsert).not.toHaveBeenCalled();
    expect(db.userPermissionOverride.update).not.toHaveBeenCalled();
  });
});

describe("aturan 2 & 3 — user.ts", () => {
  it("ADMIN membuat user SUPERADMIN → ditolak; SUPERADMIN → boleh", async () => {
    expect(await userActions.createUser({ ...OP, password: "rahasia1", role: "SUPERADMIN" })).toMatchObject({ success: false, error: expect.stringMatching(/Hanya SUPERADMIN/) });
    expect(db.user.create).not.toHaveBeenCalled();
    asActor("sa-1", "SUPERADMIN");
    expect(await userActions.createUser({ ...OP, password: "rahasia1", role: "SUPERADMIN" })).toMatchObject({ success: true });
  });

  it("ADMIN: ubah akun SUPERADMIN atau naikkan OPERATOR jadi SUPERADMIN → ditolak; SUPERADMIN mengubah SUPERADMIN lain → boleh", async () => {
    expect(await userActions.updateUser({ id: "sa-1", ...OP, role: "SUPERADMIN" })).toMatchObject({ success: false, error: expect.stringMatching(/Hanya SUPERADMIN/) });
    expect(await userActions.updateUser({ id: "op-1", ...OP, role: "SUPERADMIN" })).toMatchObject({ success: false, error: expect.stringMatching(/Hanya SUPERADMIN/) });
    expect(db.user.update).not.toHaveBeenCalled();
    asActor("sa-1", "SUPERADMIN");
    expect(await userActions.updateUser({ id: "sa-2", ...OP, role: "SUPERADMIN" })).toEqual({ success: true });
    expect((await userActions.toggleUserActive("sa-2")).success).toBe(true);
  });

  it("akun sendiri (juga SUPERADMIN): ganti role / toggle → ditolak; ganti nama dengan role tetap → boleh", async () => {
    expect(await userActions.updateUser({ id: "admin-1", ...OP, role: "OPERATOR" })).toMatchObject({ success: false, error: expect.stringMatching(/role akun Anda sendiri/) });
    expect((await userActions.toggleUserActive("admin-1")).success).toBe(false);
    asActor("sa-1", "SUPERADMIN");
    expect(await userActions.updateUser({ id: "sa-1", ...OP, role: "ADMIN" })).toMatchObject({ success: false, error: expect.stringMatching(/role akun Anda sendiri/) });
    expect((await userActions.toggleUserActive("sa-1")).success).toBe(false);
    expect(db.user.update).not.toHaveBeenCalled();
    expect(await userActions.updateUser({ id: "sa-1", ...OP, role: "SUPERADMIN" })).toEqual({ success: true });
  });

  it("ADMIN menonaktifkan SUPERADMIN → ditolak; OPERATOR → dibalik", async () => {
    expect((await userActions.toggleUserActive("sa-1")).success).toBe(false);
    expect((await userActions.toggleUserActive("op-1")).success).toBe(true);
    expect(db.user.update.mock.calls[0][0].data.isActive).toBe(false);
  });
});

describe("aturan 2 & 3 — penugasan & override", () => {
  it("akun sendiri & akun SUPERADMIN (oleh ADMIN) → ditolak di assign & remove (provinsi, distrik, Lembaga)", async () => {
    for (const target of ["admin-1", "sa-1"]) {
      expect((await access.assignUserProvince(target, "p1")).success).toBe(false);
      expect((await access.removeUserProvince(target, "p1")).success).toBe(false);
      expect((await access.assignUserDistrict(target, "d1")).success).toBe(false);
      expect((await access.removeUserDistrict(target, "d1")).success).toBe(false);
      expect((await access.assignUserFarmerGroup(target, "G1")).success).toBe(false);
      expect((await access.removeUserFarmerGroup(target, "G1")).success).toBe(false);
    }
    for (const m of [db.userProvince, db.userDistrict, db.userFarmerGroup]) {
      expect(m.create).not.toHaveBeenCalled();
      expect(m.deleteMany).not.toHaveBeenCalled();
    }
  });

  it("wilayah/Lembaga nonaktif atau tak dikenal → ditolak dengan pesan jelas; aktif → dibuat", async () => {
    expect(await access.assignUserDistrict("op-1", "d-nonaktif")).toMatchObject({ success: false, error: expect.stringMatching(/tidak ditemukan atau nonaktif/) });
    expect(await access.assignUserFarmerGroup("op-1", "G-x")).toMatchObject({ success: false, error: expect.stringMatching(/tidak ditemukan atau nonaktif/) });
    expect(db.userDistrict.create).not.toHaveBeenCalled();
    expect((await access.assignUserDistrict("op-1", "d1")).success).toBe(true);
    expect((await access.removeUserDistrict("op-1", "d1")).success).toBe(true);
  });

  it("override di akun sendiri (set & remove) → ditolak tanpa tulis", async () => {
    expect((await overrides.setUserMenuOverride("admin-1", "settings-users", "EDIT", true)).success).toBe(false);
    expect((await overrides.removeUserMenuOverride("admin-1", "settings-users", "EDIT")).success).toBe(false);
    expect(db.userPermissionOverride.upsert).not.toHaveBeenCalled();
    expect(db.userPermissionOverride.update).not.toHaveBeenCalled();
  });
});

describe("aturan 4 — Role & Permission", () => {
  it("ADMIN (walau ber-izin EDIT) mengubah matriks → ditolak tanpa transaksi; SUPERADMIN → diproses", async () => {
    const upd = [{ role: "ADMIN" as const, menuKey: "settings-users", permission: "EDIT" as const, granted: true }];
    expect(await roles.setRolePermissions(upd)).toMatchObject({ success: false, error: expect.stringMatching(/Hanya SUPERADMIN/) });
    expect(db.$transaction).not.toHaveBeenCalled();
    asActor("sa-1", "SUPERADMIN");
    expect((await roles.setRolePermissions(upd)).success).toBe(true);
    expect(db.$transaction).toHaveBeenCalledOnce();
  });
});
