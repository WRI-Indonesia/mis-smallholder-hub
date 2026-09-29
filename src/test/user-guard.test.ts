import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & aturan tulis Pengaturan › Pengguna (`src/server/actions/user.ts`)
 * tanpa DB — pola mock `land-marker-guard.test.ts`. Menu `settings-users`
 * (tanpa scope data). Yang dijaga: level per action, Zod (email/role/password),
 * email unik, password disimpan sebagai hash & tidak ditimpa bila dikosongkan,
 * nonaktifkan user = `isActive` dibalik (tak pernah `delete`), audit dari sesi.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "admin-1" } }) }));

const bcrypt = vi.hoisted(() => ({ hash: vi.fn(async (p: string) => `hash(${p})`) }));
vi.mock("bcryptjs", () => ({ default: bcrypt }));

const db = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/user");

const newUser = (o: Record<string, unknown> = {}) => ({
  name: "Operator Uji", email: "op@example.org", password: "rahasia1", role: "OPERATOR" as const, ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  db.user.findMany.mockResolvedValue([]);
  db.user.findUnique.mockResolvedValue(null);
  db.user.create.mockResolvedValue({ id: "u-new" });
  db.user.update.mockResolvedValue({});
});

describe("guard — settings-users + level", () => {
  it("get=VIEW, create=CREATE, update=EDIT, toggle=DELETE", async () => {
    db.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ isActive: true });
    await actions.getUsers();
    await actions.createUser(newUser());
    await actions.updateUser({ id: "u-1", ...newUser() });
    await actions.toggleUserActive("u-1");
    expect(hasPermission.mock.calls).toEqual([
      ["settings-users", "VIEW"], ["settings-users", "CREATE"], ["settings-users", "EDIT"], ["settings-users", "DELETE"],
    ]);
  });

  it("izin ditolak → getUsers melempar, mutasi { success:false }, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getUsers()).rejects.toThrow(/izin/);
    expect((await actions.createUser(newUser())).success).toBe(false);
    expect((await actions.updateUser({ id: "u-1", ...newUser() })).success).toBe(false);
    expect((await actions.toggleUserActive("u-1")).success).toBe(false);
    for (const fn of Object.values(db.user)) expect(fn).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("getUsers tidak memilih kolom password", async () => {
    await actions.getUsers("op");
    const args = db.user.findMany.mock.calls[0][0];
    expect(args.select).not.toHaveProperty("password");
    expect(args.where.OR).toHaveLength(2);
  });
});

describe("createUser / updateUser — Zod, email unik, hash, audit", () => {
  it("email invalid, password < 6, role tak dikenal → fieldErrors tanpa DB", async () => {
    const res = await actions.createUser(newUser({ email: "bukan-email", password: "123", role: "ROOT" }) as never);
    expect(res.success).toBe(false);
    expect(res.error).toHaveProperty("email");
    expect(res.error).toHaveProperty("password");
    expect(res.error).toHaveProperty("role");
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("email sudah terdaftar → ditolak", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u-lain" });
    expect((await actions.createUser(newUser())).error).toEqual({ email: ["Email sudah terdaftar"] });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("create sukses → password di-hash, createdBy dari sesi", async () => {
    const res = await actions.createUser(newUser());
    expect(res).toEqual({ success: true, data: { id: "u-new" } });
    expect(db.user.create.mock.calls[0][0].data).toEqual({
      name: "Operator Uji", email: "op@example.org", password: "hash(rahasia1)", role: "OPERATOR", createdBy: "admin-1",
    });
  });

  it("update dengan password kosong → password lama tidak ditimpa; modifiedBy dari sesi", async () => {
    await actions.updateUser({ id: "u-1", ...newUser({ password: "" }) });
    const call = db.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "u-1" });
    expect(call.data).not.toHaveProperty("password");
    expect(call.data).toMatchObject({ modifiedBy: "admin-1", role: "OPERATOR" });
  });

  it("update dengan password baru → disimpan hash", async () => {
    await actions.updateUser({ id: "u-1", ...newUser({ password: "baru999" }) });
    expect(db.user.update.mock.calls[0][0].data.password).toBe("hash(baru999)");
  });

  it("update input tidak valid → fieldErrors tanpa update", async () => {
    const res = await actions.updateUser({ id: "u-1", ...newUser({ name: "A" }) });
    expect(res.error).toHaveProperty("name");
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("toggleUserActive — soft delete", () => {
  it("membalik isActive + modifiedBy, bukan delete; id tak dikenal → ditolak", async () => {
    db.user.findUnique.mockResolvedValue({ isActive: true });
    await actions.toggleUserActive("u-1");
    expect(db.user.update.mock.calls[0][0]).toEqual({ where: { id: "u-1" }, data: { isActive: false, modifiedBy: "admin-1" } });
    expect(db.user.delete).not.toHaveBeenCalled();
    expect(db.user.deleteMany).not.toHaveBeenCalled();

    db.user.findUnique.mockResolvedValue(null);
    expect((await actions.toggleUserActive("u-x")).success).toBe(false);
    expect(db.user.update).toHaveBeenCalledTimes(1);
  });
});
