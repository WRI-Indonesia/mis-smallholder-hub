import { describe, it, expect, vi, beforeEach } from "vitest";
import { canGrantDataAccess, roleGrantError, userTargetError } from "@/lib/user-admin-guard";

/**
 * Anti-eskalasi Settings › Users (#386 butir 2, keputusan owner 2026-10-10):
 * role/akun SUPERADMIN hanya oleh SUPERADMIN · akun sendiri terkunci (role, status,
 * penugasan, override) · penugasan wilayah/Lembaga dalam scope pemanggil · pemanggil
 * ber-scope tak boleh mencabut penugasan terakhir (tanpa penugasan = akses SEMUA data).
 * Menguji helper murni ASLI dan ketiga berkas aksi ASLI dengan Prisma/sesi tiruan.
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
};
const db = vi.hoisted(() => {
  const model = () => ({ findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), count: vi.fn() });
  return {
    user: model(), farmerGroup: model(), userPermissionOverride: model(),
    userProvince: model(), userDistrict: model(), userFarmerGroup: model(),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const userActions = await import("@/server/actions/user");
const access = await import("@/server/actions/user-data-access");
const overrides = await import("@/server/actions/user-menu-access");

const asActor = (id: string, role: string) => Object.assign(session.user, { id, role });
const OP = { name: "Nama Uji", email: "uji@example.org", password: "", role: "OPERATOR" as const };

beforeEach(() => {
  vi.clearAllMocks();
  asActor("admin-1", "ADMIN");
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string } }) => (where.id ? USERS[where.id] ?? null : null));
  db.user.create.mockResolvedValue({ id: "u-new" });
  db.farmerGroup.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({ G1: { districtId: "d1" }, G2: { districtId: "d2" } })[where.id] ?? null);
  for (const m of [db.userProvince, db.userDistrict, db.userFarmerGroup]) m.count.mockResolvedValue(1);
});

describe("helper murni", () => {
  it("userTargetError: SUPERADMIN hanya oleh SUPERADMIN; akun sendiri terkunci kecuali allowSelf", () => {
    const admin = { id: "a", role: "ADMIN" };
    expect(userTargetError(admin, null)).toMatch(/tidak ditemukan/);
    expect(userTargetError(admin, { id: "s", role: "SUPERADMIN" })).toMatch(/Hanya SUPERADMIN/);
    expect(userTargetError({ id: "s2", role: "SUPERADMIN" }, { id: "s", role: "SUPERADMIN" })).toBeNull();
    expect(userTargetError(admin, admin)).toMatch(/akun Anda sendiri/);
    expect(userTargetError(admin, admin, { allowSelf: true })).toBeNull();
  });

  it("roleGrantError: hanya SUPERADMIN memberi role SUPERADMIN", () => {
    expect(roleGrantError({ id: "a", role: "ADMIN" }, "SUPERADMIN")).toMatch(/Hanya SUPERADMIN/);
    expect(roleGrantError({ id: "a", role: "ADMIN" }, "OPERATOR")).toBeNull();
    expect(roleGrantError({ id: "s", role: "SUPERADMIN" }, "SUPERADMIN")).toBeNull();
  });

  it("canGrantDataAccess per mode", () => {
    const byD = { mode: "BY_DISTRICT" as const, ids: ["d1"] };
    const byG = { mode: "BY_FARMER_GROUP" as const, ids: ["G1"] };
    expect(canGrantDataAccess({ mode: "ALL" }, { kind: "province" })).toBe(true);
    expect(canGrantDataAccess(byD, { kind: "province" })).toBe(false);
    expect(canGrantDataAccess(byD, { kind: "district", districtId: "d1" })).toBe(true);
    expect(canGrantDataAccess(byD, { kind: "district", districtId: "d2" })).toBe(false);
    expect(canGrantDataAccess(byD, { kind: "group", groupId: "G2", districtId: "d2" })).toBe(false);
    expect(canGrantDataAccess(byG, { kind: "district", districtId: "d1" })).toBe(false);
    expect(canGrantDataAccess(byG, { kind: "group", groupId: "G1", districtId: "d1" })).toBe(true);
    expect(canGrantDataAccess(byG, { kind: "group", groupId: "G2", districtId: "d1" })).toBe(false);
  });
});

describe("user.ts — role & status", () => {
  it("ADMIN membuat user SUPERADMIN → ditolak tanpa create; SUPERADMIN → boleh", async () => {
    expect(await userActions.createUser({ ...OP, password: "rahasia1", role: "SUPERADMIN" })).toMatchObject({ success: false, error: expect.stringMatching(/Hanya SUPERADMIN/) });
    expect(db.user.create).not.toHaveBeenCalled();
    asActor("sa-1", "SUPERADMIN");
    expect(await userActions.createUser({ ...OP, password: "rahasia1", role: "SUPERADMIN" })).toMatchObject({ success: true });
  });

  it("ADMIN: ubah akun SUPERADMIN, atau naikkan OPERATOR jadi SUPERADMIN → ditolak tanpa update", async () => {
    expect(await userActions.updateUser({ id: "sa-1", ...OP, role: "SUPERADMIN" })).toMatchObject({ success: false, error: expect.stringMatching(/Hanya SUPERADMIN/) });
    expect(await userActions.updateUser({ id: "op-1", ...OP, role: "SUPERADMIN" })).toMatchObject({ success: false, error: expect.stringMatching(/Hanya SUPERADMIN/) });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("akun sendiri: ganti role → ditolak; ganti nama dengan role tetap → boleh", async () => {
    expect(await userActions.updateUser({ id: "admin-1", ...OP, role: "OPERATOR" })).toMatchObject({ success: false, error: expect.stringMatching(/role akun Anda sendiri/) });
    expect(db.user.update).not.toHaveBeenCalled();
    expect(await userActions.updateUser({ id: "admin-1", ...OP, role: "ADMIN" })).toEqual({ success: true });
  });

  it("toggle aktif: akun sendiri & SUPERADMIN (oleh ADMIN) → ditolak; OPERATOR → dibalik", async () => {
    expect((await userActions.toggleUserActive("admin-1")).success).toBe(false);
    expect((await userActions.toggleUserActive("sa-1")).success).toBe(false);
    expect(db.user.update).not.toHaveBeenCalled();
    expect((await userActions.toggleUserActive("op-1")).success).toBe(true);
    expect(db.user.update.mock.calls[0][0].data.isActive).toBe(false);
  });
});

describe("user-data-access.ts — penugasan wilayah/Lembaga", () => {
  it("akun sendiri & akun SUPERADMIN (oleh ADMIN) → ditolak", async () => {
    expect((await access.assignUserDistrict("admin-1", "d1")).success).toBe(false);
    expect((await access.assignUserDistrict("sa-1", "d1")).success).toBe(false);
    expect(db.userDistrict.create).not.toHaveBeenCalled();
  });

  it("pemanggil BY_DISTRICT [d1]: distrik/Lembaga di luar scope & provinsi → ditolak; dalam scope → boleh", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d1"] });
    expect((await access.assignUserDistrict("op-1", "d2")).success).toBe(false);
    expect((await access.assignUserFarmerGroup("op-1", "G2")).success).toBe(false);
    expect((await access.assignUserProvince("op-1", "p1")).success).toBe(false);
    expect(db.userDistrict.create).not.toHaveBeenCalled();
    expect(db.userFarmerGroup.create).not.toHaveBeenCalled();
    expect(db.userProvince.create).not.toHaveBeenCalled();
    expect((await access.assignUserDistrict("op-1", "d1")).success).toBe(true);
    expect((await access.assignUserFarmerGroup("op-1", "G1")).success).toBe(true);
  });

  it("Lembaga tak dikenal → ditolak", async () => {
    expect(await access.assignUserFarmerGroup("op-1", "G-x")).toMatchObject({ success: false, error: expect.stringMatching(/tidak ditemukan/) });
  });

  it("cabut penugasan terakhir: pemanggil ber-scope → ditolak (akan jadi akses semua data); ALL → boleh", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["d1"] });
    db.userProvince.count.mockResolvedValue(0);
    db.userFarmerGroup.count.mockResolvedValue(0);
    expect(await access.removeUserDistrict("op-1", "d1")).toMatchObject({ success: false, error: expect.stringMatching(/penugasan terakhir/) });
    expect(db.userDistrict.deleteMany).not.toHaveBeenCalled();
    getAccessContext.mockResolvedValue({ mode: "ALL" });
    expect((await access.removeUserDistrict("op-1", "d1")).success).toBe(true);
  });
});

describe("user-menu-access.ts — override izin", () => {
  it("override di akun sendiri (set & remove) → ditolak tanpa tulis", async () => {
    expect((await overrides.setUserMenuOverride("admin-1", "settings-users", "EDIT", true)).success).toBe(false);
    expect((await overrides.removeUserMenuOverride("admin-1", "settings-users", "EDIT")).success).toBe(false);
    expect(db.userPermissionOverride.upsert).not.toHaveBeenCalled();
    expect(db.userPermissionOverride.update).not.toHaveBeenCalled();
  });
});
