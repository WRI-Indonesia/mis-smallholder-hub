import { describe, it, expect } from "vitest";

describe("User Menu Access — Permission Override Logic", () => {
  interface RolePermission {
    role: string;
    menuKey: string;
    permission: string;
  }

  interface UserOverride {
    userId: string;
    menuKey: string;
    permission: string;
    granted: boolean;
  }

  // Sample seed data
  const rolePermissions: RolePermission[] = [
    { role: "OPERATOR", menuKey: "master-data-groups", permission: "VIEW" },
    { role: "OPERATOR", menuKey: "master-data-groups", permission: "EDIT" },
    { role: "OPERATOR", menuKey: "dashboard-bmp", permission: "VIEW" },
    { role: "ADMIN", menuKey: "settings-users", permission: "VIEW" },
    { role: "ADMIN", menuKey: "settings-users", permission: "EDIT" },
  ];

  // Helper to simulate getUserPermissionsForMenu logic
  function resolveEffectivePermissions(
    role: string,
    userId: string,
    menuKey: string,
    overrides: UserOverride[]
  ): string[] {
    if (role === "SUPERADMIN") {
      return ["CREATE", "VIEW", "EDIT", "DELETE"];
    }

    const defaultPerms = rolePermissions
      .filter((rp) => rp.role === role && rp.menuKey === menuKey)
      .map((rp) => rp.permission);

    const userOverrides = overrides.filter(
      (o) => o.userId === userId && o.menuKey === menuKey
    );

    let effective = [...defaultPerms];

    for (const override of userOverrides) {
      if (override.granted) {
        if (!effective.includes(override.permission)) {
          effective.push(override.permission);
        }
      } else {
        effective = effective.filter((p) => p !== override.permission);
      }
    }

    return effective;
  }

  // Helper to simulate getAccessibleMenuKeys logic
  function resolveAccessibleMenuKeys(
    role: string,
    userId: string,
    overrides: UserOverride[]
  ): string[] {
    if (role === "SUPERADMIN") {
      // Superadmin sees all menus present in role permissions
      return [...new Set(rolePermissions.map((rp) => rp.menuKey))];
    }

    const defaultKeys = rolePermissions
      .filter((rp) => rp.role === role && rp.permission === "VIEW")
      .map((rp) => rp.menuKey);

    let accessible = [...defaultKeys];

    const viewOverrides = overrides.filter(
      (o) => o.userId === userId && o.permission === "VIEW"
    );

    for (const override of viewOverrides) {
      if (override.granted) {
        if (!accessible.includes(override.menuKey)) {
          accessible.push(override.menuKey);
        }
      } else {
        accessible = accessible.filter((k) => k !== override.menuKey);
      }
    }

    return accessible;
  }

  it("returns default role permissions when no overrides exist", () => {
    const permissions = resolveEffectivePermissions("OPERATOR", "user-1", "master-data-groups", []);
    expect(permissions).toContain("VIEW");
    expect(permissions).toContain("EDIT");
    expect(permissions).not.toContain("CREATE");
  });

  it("revokes permission when override.granted is false", () => {
    const overrides: UserOverride[] = [
      { userId: "user-1", menuKey: "master-data-groups", permission: "EDIT", granted: false },
    ];
    const permissions = resolveEffectivePermissions("OPERATOR", "user-1", "master-data-groups", overrides);
    expect(permissions).toContain("VIEW");
    expect(permissions).not.toContain("EDIT");
  });

  it("grants permission when override.granted is true and role does not have it", () => {
    const overrides: UserOverride[] = [
      { userId: "user-1", menuKey: "master-data-groups", permission: "CREATE", granted: true },
    ];
    const permissions = resolveEffectivePermissions("OPERATOR", "user-1", "master-data-groups", overrides);
    expect(permissions).toContain("VIEW");
    expect(permissions).toContain("EDIT");
    expect(permissions).toContain("CREATE");
  });

  it("retains permissions for SUPERADMIN regardless of overrides", () => {
    const overrides: UserOverride[] = [
      { userId: "user-1", menuKey: "master-data-groups", permission: "VIEW", granted: false },
      { userId: "user-1", menuKey: "master-data-groups", permission: "EDIT", granted: false },
    ];
    const permissions = resolveEffectivePermissions("SUPERADMIN", "user-1", "master-data-groups", overrides);
    expect(permissions).toContain("VIEW");
    expect(permissions).toContain("EDIT");
    expect(permissions).toContain("CREATE");
    expect(permissions).toContain("DELETE");
  });

  it("hides menu from accessible keys when VIEW is revoked", () => {
    const overrides: UserOverride[] = [
      { userId: "user-1", menuKey: "dashboard-bmp", permission: "VIEW", granted: false },
    ];
    const keys = resolveAccessibleMenuKeys("OPERATOR", "user-1", overrides);
    expect(keys).toContain("master-data-groups");
    expect(keys).not.toContain("dashboard-bmp");
  });

  it("shows menu in accessible keys when VIEW is explicitly granted", () => {
    const overrides: UserOverride[] = [
      { userId: "user-1", menuKey: "settings-users", permission: "VIEW", granted: true },
    ];
    const keys = resolveAccessibleMenuKeys("OPERATOR", "user-1", overrides);
    expect(keys).toContain("master-data-groups");
    expect(keys).toContain("settings-users");
  });
});
