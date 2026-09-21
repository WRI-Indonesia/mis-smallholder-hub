import { describe, it, expect } from "vitest";
import { normalizeRolePermissionUpdates } from "@/lib/role-permission-updates";

/**
 * Guard/scope logic yang menutup celah RBAC audit P0 (#125).
 * Mengikuti gaya test repo (mis. rbac-permission.test.ts): memverifikasi logika
 * keputusan (guard + scope filter) secara terisolasi tanpa DB. Modul asli
 * (`access-context`, server actions) tidak diimpor karena menarik rantai next-auth
 * yang tidak resolve di environment vitest.
 */

type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

// Mirror dari access-context.ts `farmerGroupAccessFilter`.
function farmerGroupAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { id: { in: access.ids } }
    : access.mode === "BY_DISTRICT"
    ? { districtId: { in: access.ids } }
    : {};
}

describe("RBAC scope — farmerGroupAccessFilter (create/update/bulk farmer target group)", () => {
  it("ALL → tanpa batasan (SUPERADMIN / user tanpa assignment)", () => {
    expect(farmerGroupAccessFilter({ mode: "ALL" })).toEqual({});
  });

  it("BY_FARMER_GROUP → batasi ke id lembaga tani yang diberikan", () => {
    const access: AccessContext = { mode: "BY_FARMER_GROUP", ids: ["kt-1", "kt-2"] };
    expect(farmerGroupAccessFilter(access)).toEqual({ id: { in: ["kt-1", "kt-2"] } });
  });

  it("BY_DISTRICT → batasi ke districtId", () => {
    const access: AccessContext = { mode: "BY_DISTRICT", ids: ["dist-1"] };
    expect(farmerGroupAccessFilter(access)).toEqual({ districtId: { in: ["dist-1"] } });
  });
});

describe("RBAC scope — filter petani by-id (getFarmerDetail/updateFarmer/toggleFarmerActive)", () => {
  // Mirror dari inline accessFilter di farmer.ts.
  function farmerAccessFilter(access: AccessContext) {
    return access.mode === "BY_FARMER_GROUP"
      ? { farmerGroupId: { in: access.ids } }
      : access.mode === "BY_DISTRICT"
      ? { farmerGroup: { districtId: { in: access.ids } } }
      : {};
  }

  it("user BY_FARMER_GROUP tidak dapat menjangkau petani KT lain (where menyertakan filter KT)", () => {
    const where = { id: "farmer-x", isActive: true, ...farmerAccessFilter({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] }) };
    expect(where).toEqual({ id: "farmer-x", isActive: true, farmerGroupId: { in: ["kt-1"] } });
  });

  it("user BY_DISTRICT dibatasi lewat relasi farmerGroup.districtId", () => {
    const where = { id: "farmer-x", isActive: true, ...farmerAccessFilter({ mode: "BY_DISTRICT", ids: ["d1"] }) };
    expect(where).toEqual({ id: "farmer-x", isActive: true, farmerGroup: { districtId: { in: ["d1"] } } });
  });

  it("mode ALL tidak menambah batasan scope", () => {
    const where = { id: "farmer-x", isActive: true, ...farmerAccessFilter({ mode: "ALL" }) };
    expect(where).toEqual({ id: "farmer-x", isActive: true });
  });
});

describe("RBAC guard — setRolePermissions: entri SUPERADMIN diabaikan, dedup entri terakhir menang", () => {
  // Guard EDIT tetap mirror (hasPermission menarik next-auth); normalisasi payload
  // diuji lewat fungsi aslinya (#353 — sebelumnya mirror toggle per sel yang sudah dihapus).
  function canEdit(hasEdit: boolean): { ok: boolean; reason?: string } {
    return hasEdit ? { ok: true } : { ok: false, reason: "no-permission" };
  }

  it("tanpa izin EDIT settings-roles → ditolak", () => {
    expect(canEdit(false)).toEqual({ ok: false, reason: "no-permission" });
  });

  it("entri SUPERADMIN dibuang, entri role lain tetap", () => {
    const valid = normalizeRolePermissionUpdates([
      { role: "SUPERADMIN", menuKey: "settings-roles", permission: "EDIT", granted: false },
      { role: "OPERATOR", menuKey: "master-data-farmers", permission: "VIEW", granted: true },
    ]);
    expect(valid).toEqual([
      { role: "OPERATOR", menuKey: "master-data-farmers", permission: "VIEW", granted: true },
    ]);
  });

  it("payload hanya SUPERADMIN → kosong (action mengembalikan count 0 tanpa menyentuh DB)", () => {
    expect(
      normalizeRolePermissionUpdates([
        { role: "SUPERADMIN", menuKey: "settings-roles", permission: "VIEW", granted: true },
      ])
    ).toEqual([]);
  });

  it("dedup per (role, menuKey, permission) — entri terakhir menang", () => {
    const valid = normalizeRolePermissionUpdates([
      { role: "ADMIN", menuKey: "report-farmer", permission: "EXPORT", granted: true },
      { role: "ADMIN", menuKey: "report-farmer", permission: "EXPORT", granted: false },
      { role: "ADMIN", menuKey: "report-farmer", permission: "PRINT", granted: true },
    ]);
    expect(valid).toEqual([
      { role: "ADMIN", menuKey: "report-farmer", permission: "EXPORT", granted: false },
      { role: "ADMIN", menuKey: "report-farmer", permission: "PRINT", granted: true },
    ]);
  });
});

describe("RBAC scope — validasi lembaga tani target (createFarmer & bulkCreateFarmers)", () => {
  // Mirror dari logika "target group in allowed set".
  function isTargetAllowed(mode: AccessContext["mode"], allowedIds: string[], targetId: string): boolean {
    if (mode === "ALL") return true;
    return new Set(allowedIds).has(targetId);
  }

  it("user ter-scope: tolak petani ke KT di luar wilayah", () => {
    expect(isTargetAllowed("BY_FARMER_GROUP", ["kt-1"], "kt-2")).toBe(false);
  });

  it("user ter-scope: terima petani ke KT dalam wilayah", () => {
    expect(isTargetAllowed("BY_FARMER_GROUP", ["kt-1", "kt-2"], "kt-2")).toBe(true);
  });

  it("mode ALL: semua KT diperbolehkan", () => {
    expect(isTargetAllowed("ALL", [], "kt-9")).toBe(true);
  });
});

describe("RBAC guard — getAllMenuItems dapat diakses settings-menu ATAU settings-roles", () => {
  function canReadMenus(hasMenuView: boolean, hasRolesView: boolean): boolean {
    return hasMenuView || hasRolesView;
  }

  it("hanya settings-menu VIEW → boleh (halaman Menu Management)", () => {
    expect(canReadMenus(true, false)).toBe(true);
  });

  it("hanya settings-roles VIEW → boleh (halaman Role & Permission)", () => {
    expect(canReadMenus(false, true)).toBe(true);
  });

  it("tidak keduanya → ditolak", () => {
    expect(canReadMenus(false, false)).toBe(false);
  });
});
