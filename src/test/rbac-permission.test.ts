import { describe, it, expect } from "vitest";

// Test RBAC permission check logic (no DB)
describe("RBAC - Permission check", () => {
  interface RolePermission {
    role: string;
    menuKey: string;
    permission: string;
    isActive: boolean;
  }

  const permissions: RolePermission[] = [
    { role: "SUPERADMIN", menuKey: "settings-users", permission: "VIEW", isActive: true },
    { role: "SUPERADMIN", menuKey: "settings-users", permission: "EDIT", isActive: true },
    { role: "SUPERADMIN", menuKey: "settings-users", permission: "DELETE", isActive: true },
    { role: "SUPERADMIN", menuKey: "master-data-groups", permission: "VIEW", isActive: true },
    { role: "ADMIN", menuKey: "master-data-groups", permission: "VIEW", isActive: true },
    { role: "ADMIN", menuKey: "master-data-groups", permission: "EDIT", isActive: true },
    { role: "OPERATOR", menuKey: "master-data-groups", permission: "VIEW", isActive: true },
    { role: "MANAGEMENT", menuKey: "master-data-groups", permission: "VIEW", isActive: true },
  ];

  function hasPermission(role: string, menuKey: string, permission: string): boolean {
    if (role === "SUPERADMIN") return true;
    return permissions.some(
      (p) => p.role === role && p.menuKey === menuKey && p.permission === permission && p.isActive
    );
  }

  function getAccessibleMenuKeys(role: string): string[] {
    if (role === "SUPERADMIN") return [...new Set(permissions.map((p) => p.menuKey))];
    return [...new Set(
      permissions.filter((p) => p.role === role && p.permission === "VIEW" && p.isActive).map((p) => p.menuKey)
    )];
  }

  it("SUPERADMIN has access to everything", () => {
    expect(hasPermission("SUPERADMIN", "settings-users", "VIEW")).toBe(true);
    expect(hasPermission("SUPERADMIN", "settings-users", "DELETE")).toBe(true);
    expect(hasPermission("SUPERADMIN", "any-menu", "VIEW")).toBe(true);
  });

  it("MANAGEMENT cannot access settings-users", () => {
    expect(hasPermission("MANAGEMENT", "settings-users", "VIEW")).toBe(false);
  });

  it("MANAGEMENT can view master-data-groups", () => {
    expect(hasPermission("MANAGEMENT", "master-data-groups", "VIEW")).toBe(true);
  });

  it("OPERATOR cannot delete master-data-groups", () => {
    expect(hasPermission("OPERATOR", "master-data-groups", "DELETE")).toBe(false);
  });

  it("getAccessibleMenuKeys filters correctly per role", () => {
    expect(getAccessibleMenuKeys("MANAGEMENT")).toEqual(["master-data-groups"]);
    expect(getAccessibleMenuKeys("ADMIN")).toEqual(["master-data-groups"]);
    expect(getAccessibleMenuKeys("SUPERADMIN")).toContain("settings-users");
    expect(getAccessibleMenuKeys("SUPERADMIN")).toContain("master-data-groups");
  });

  it("sidebar filters parent with no accessible children", () => {
    const allMenus = [
      { key: "settings", parentKey: null, children: ["settings-users", "settings-menu"] },
      { key: "master-data", parentKey: null, children: ["master-data-groups"] },
    ];

    const accessibleKeys = getAccessibleMenuKeys("MANAGEMENT"); // only master-data-groups

    const visibleParents = allMenus.filter(
      (m) => accessibleKeys.includes(m.key) || m.children.some((c) => accessibleKeys.includes(c))
    );

    expect(visibleParents).toHaveLength(1);
    expect(visibleParents[0].key).toBe("master-data");
  });
});
