import { describe, it, expect, vi, beforeEach } from "vitest";
import { ALL_PERMISSIONS } from "@/lib/permission-levels";

/**
 * `src/lib/rbac.ts` ASLI — kaskade izin menu (induk → anak), override per
 * pengguna (grant/revoke per node), dan bypass SUPERADMIN. `auth`/`prisma`
 * di-mock; `redirect` dibuat melempar agar tujuannya bisa diperiksa.
 */
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const db = vi.hoisted(() => ({
  menuItem: { findMany: vi.fn() },
  rolePermission: { findMany: vi.fn() },
  userPermissionOverride: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const rbac = await import("@/lib/rbac");

// Pohon 3 tingkat: master-data → master-data-farmers → master-data-farmers-detail; plus akar lain.
const MENUS = [
  { key: "master-data", parentKey: null },
  { key: "master-data-farmers", parentKey: "master-data" },
  { key: "master-data-farmers-detail", parentKey: "master-data-farmers" },
  { key: "master-data-groups", parentKey: "master-data" },
  { key: "report", parentKey: null },
];

type Perm = { menuKey: string; permission: string };
type Override = Perm & { granted: boolean };

function seed(rolePerms: Perm[], overrides: Override[] = []) {
  db.menuItem.findMany.mockResolvedValue(MENUS);
  db.rolePermission.findMany.mockResolvedValue(rolePerms);
  db.userPermissionOverride.findMany.mockResolvedValue(overrides);
}

const sorted = (xs: string[] | undefined) => [...(xs ?? [])].sort();

beforeEach(() => {
  vi.clearAllMocks();
  seed([]);
  auth.mockResolvedValue({ user: { id: "u1", role: "OPERATOR" } });
});

describe("getEffectiveMenuPermissions — kaskade induk → anak", () => {
  it("izin di node induk menurun ke seluruh turunan, tidak ke akar lain", async () => {
    seed([{ menuKey: "master-data", permission: "VIEW" }]);
    const eff = await rbac.getEffectiveMenuPermissions("OPERATOR", "u1");
    expect(eff["master-data"]).toEqual(["VIEW"]);
    expect(eff["master-data-farmers"]).toEqual(["VIEW"]);
    expect(eff["master-data-farmers-detail"]).toEqual(["VIEW"]);
    expect(eff["master-data-groups"]).toEqual(["VIEW"]);
    expect(eff.report).toEqual([]);
  });

  it("izin anak = gabungan (union) izin induk + izin node sendiri; induk tidak ikut naik", async () => {
    seed([
      { menuKey: "master-data", permission: "VIEW" },
      { menuKey: "master-data-farmers", permission: "EDIT" },
    ]);
    const eff = await rbac.getEffectiveMenuPermissions("OPERATOR");
    expect(sorted(eff["master-data-farmers"])).toEqual(["EDIT", "VIEW"]);
    expect(sorted(eff["master-data-farmers-detail"])).toEqual(["EDIT", "VIEW"]);
    expect(eff["master-data"]).toEqual(["VIEW"]);
    expect(eff["master-data-groups"]).toEqual(["VIEW"]);
  });

  it("override grant menambah izin di node itu dan turunannya", async () => {
    seed([], [{ menuKey: "master-data-farmers", permission: "DELETE", granted: true }]);
    const eff = await rbac.getEffectiveMenuPermissions("OPERATOR", "u1");
    expect(eff["master-data"]).toEqual([]);
    expect(eff["master-data-farmers"]).toEqual(["DELETE"]);
    expect(eff["master-data-farmers-detail"]).toEqual(["DELETE"]);
  });

  it("override revoke mencabut izin warisan di node itu (dan turunannya), saudara tetap mewarisi", async () => {
    seed(
      [{ menuKey: "master-data", permission: "VIEW" }, { menuKey: "master-data", permission: "EDIT" }],
      [{ menuKey: "master-data-farmers", permission: "EDIT", granted: false }]
    );
    const eff = await rbac.getEffectiveMenuPermissions("OPERATOR", "u1");
    expect(eff["master-data-farmers"]).toEqual(["VIEW"]);
    expect(eff["master-data-farmers-detail"]).toEqual(["VIEW"]);
    expect(sorted(eff["master-data-groups"])).toEqual(["EDIT", "VIEW"]);
  });

  it("izin default role di node anak yang dicabut override di node yang sama → tetap tercabut", async () => {
    seed(
      [{ menuKey: "master-data-groups", permission: "VIEW" }],
      [{ menuKey: "master-data-groups", permission: "VIEW", granted: false }]
    );
    const eff = await rbac.getEffectiveMenuPermissions("OPERATOR", "u1");
    expect(eff["master-data-groups"]).toEqual([]);
  });

  it("KARAKTERISASI — menu yang induknya tidak aktif (tak ikut findMany) tidak pernah dijangkau traversal", async () => {
    // Traversal hanya berangkat dari akar aktif; anak yatim tak punya entri
    // sama sekali walau punya izin role sendiri. Dipaku agar perubahan disengaja.
    db.menuItem.findMany.mockResolvedValue([{ key: "yatim", parentKey: "induk-nonaktif" }]);
    db.rolePermission.findMany.mockResolvedValue([{ menuKey: "yatim", permission: "VIEW" }]);
    const eff = await rbac.getEffectiveMenuPermissions("OPERATOR");
    expect(eff).not.toHaveProperty("yatim");
  });

  it("tanpa userId → override tidak dibaca sama sekali", async () => {
    await rbac.getEffectiveMenuPermissions("OPERATOR");
    expect(db.userPermissionOverride.findMany).not.toHaveBeenCalled();
    expect(db.rolePermission.findMany.mock.calls[0][0].where).toEqual({ role: "OPERATOR", isActive: true });
  });
});

describe("getAccessibleMenuKeys", () => {
  it("SUPERADMIN → seluruh menu aktif tanpa membaca izin role", async () => {
    db.menuItem.findMany.mockResolvedValue([{ key: "a" }, { key: "b" }]);
    expect(await rbac.getAccessibleMenuKeys("SUPERADMIN", "u0")).toEqual(["a", "b"]);
    expect(db.rolePermission.findMany).not.toHaveBeenCalled();
  });

  it("role lain → hanya node ber-VIEW efektif; userId diambil dari sesi bila tidak diberikan", async () => {
    seed([{ menuKey: "master-data", permission: "VIEW" }], [{ menuKey: "master-data-groups", permission: "VIEW", granted: false }]);
    const keys = await rbac.getAccessibleMenuKeys("OPERATOR");
    expect(keys.sort()).toEqual(["master-data", "master-data-farmers", "master-data-farmers-detail"]);
    expect(db.userPermissionOverride.findMany.mock.calls[0][0].where).toEqual({ userId: "u1", isActive: true });
  });
});

describe("hasPermission / getUserPermissionsForMenu", () => {
  it("SUPERADMIN bypass: semua level di menu apa pun, tanpa query DB", async () => {
    auth.mockResolvedValue({ user: { id: "u0", role: "SUPERADMIN" } });
    expect(await rbac.hasPermission("menu-tak-dikenal", "DELETE")).toBe(true);
    expect(await rbac.getUserPermissionsForMenu("apa-saja")).toEqual([...ALL_PERMISSIONS]);
    expect(db.menuItem.findMany).not.toHaveBeenCalled();
  });

  it("tanpa sesi → tidak punya izin apa pun", async () => {
    auth.mockResolvedValue(null);
    expect(await rbac.hasPermission("master-data", "VIEW")).toBe(false);
  });

  it("role biasa mengikuti izin efektif (kaskade + override)", async () => {
    seed([{ menuKey: "master-data", permission: "VIEW" }], [{ menuKey: "master-data-farmers", permission: "EDIT", granted: true }]);
    expect(await rbac.hasPermission("master-data-farmers-detail", "EDIT")).toBe(true);
    expect(await rbac.hasPermission("master-data-groups", "EDIT")).toBe(false);
    expect(await rbac.hasPermission("report", "VIEW")).toBe(false);
  });

  it("isSuperAdmin mengikuti role sesi", async () => {
    expect(await rbac.isSuperAdmin()).toBe(false);
    auth.mockResolvedValue({ user: { id: "u0", role: "SUPERADMIN" } });
    expect(await rbac.isSuperAdmin()).toBe(true);
  });
});

describe("requirePermission (guard halaman)", () => {
  it("tanpa sesi → redirect /login", async () => {
    auth.mockResolvedValue(null);
    await expect(rbac.requirePermission("master-data")).rejects.toThrow("REDIRECT:/login");
  });

  it("SUPERADMIN → lolos tanpa cek izin, sesi dikembalikan", async () => {
    const session = { user: { id: "u0", role: "SUPERADMIN" } };
    auth.mockResolvedValue(session);
    await expect(rbac.requirePermission("apa-saja")).resolves.toBe(session);
    expect(db.menuItem.findMany).not.toHaveBeenCalled();
  });

  it("tanpa VIEW → redirect /admin; dengan VIEW → sesi dikembalikan", async () => {
    await expect(rbac.requirePermission("report")).rejects.toThrow("REDIRECT:/admin");
    seed([{ menuKey: "report", permission: "VIEW" }]);
    await expect(rbac.requirePermission("report")).resolves.toMatchObject({ user: { id: "u1" } });
  });
});
