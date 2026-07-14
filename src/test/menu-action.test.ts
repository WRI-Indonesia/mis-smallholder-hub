import { describe, it, expect } from "vitest";
import { buildMenuTree, validateMenuDepth } from "@/lib/menu-utils";
import type { MenuItem } from "@/lib/menu-utils";

describe("Menu - Tree building logic", () => {
  const mockItems: MenuItem[] = [
    { key: "master-data", parentKey: null, title: "Master Data", url: "/admin/master-data", icon: "Database" },
    { key: "master-data-groups", parentKey: "master-data", title: "Lembaga Tani", url: "/admin/master-data/groups", icon: "Users" },
    { key: "master-data-training-participants", parentKey: "master-data-groups", title: "Peserta Pelatihan", url: "/admin/master-data/training/participants", icon: "Users" },
    { key: "settings", parentKey: null, title: "Settings", url: "/admin/settings", icon: "Settings" },
    { key: "settings-users", parentKey: "settings", title: "User Management", url: "/admin/settings/users", icon: "UserCog" },
    { key: "settings-menu", parentKey: "settings", title: "Menu Management", url: "/admin/settings/menu", icon: "Menu" },
  ];

  it("builds correct 3-level tree with parents, children, and grandchildren", () => {
    const tree = buildMenuTree(mockItems);

    expect(tree).toHaveLength(2);
    expect(tree[0].key).toBe("master-data");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].key).toBe("master-data-groups");
    expect(tree[0].children![0].children).toHaveLength(1);
    expect(tree[0].children![0].children![0].key).toBe("master-data-training-participants");
    expect(tree[1].key).toBe("settings");
    expect(tree[1].children).toHaveLength(2);
  });

  it("handles empty items", () => {
    expect(buildMenuTree([])).toHaveLength(0);
  });

  it("handles items with no children", () => {
    const items: MenuItem[] = [
      { key: "standalone", parentKey: null, title: "Standalone", url: "/standalone", icon: null },
    ];
    const tree = buildMenuTree(items);
    expect(tree[0].children).toHaveLength(0);
  });
});

describe("Menu - Depth validation logic", () => {
  const existingItems: MenuItem[] = [
    { key: "root", parentKey: null, title: "Root", url: "/root", icon: null },
    { key: "child", parentKey: "root", title: "Child", url: "/child", icon: null },
    { key: "gchild", parentKey: "child", title: "GChild", url: "/gchild", icon: null },
  ];

  it("allows level 1 items (no parent)", () => {
    expect(validateMenuDepth("new-root", null, existingItems)).toBe(true);
  });

  it("allows level 2 items (parent is root)", () => {
    expect(validateMenuDepth("new-child", "root", existingItems)).toBe(true);
  });

  it("allows level 3 items (parent is level 2)", () => {
    expect(validateMenuDepth("new-gchild", "child", existingItems)).toBe(true);
  });

  it("rejects level 4 items (parent is level 3)", () => {
    expect(validateMenuDepth("new-ggchild", "gchild", existingItems)).toBe(false);
  });

  it("rejects when current item already has children and moving it makes depth > 3", () => {
    const itemsWithSubtree: MenuItem[] = [
      { key: "root", parentKey: null, title: "Root", url: "/root", icon: null },
      { key: "child1", parentKey: "root", title: "Child 1", url: "/c1", icon: null },
      { key: "child2", parentKey: null, title: "Child 2", url: "/c2", icon: null },
      { key: "gchild2", parentKey: "child2", title: "Grandchild 2", url: "/gc2", icon: null },
      { key: "ggchild2", parentKey: "gchild2", title: "Great Grandchild 2", url: "/ggc2", icon: null },
    ];
    // Moving child2 (which has a chain of length 3: child2 -> gchild2 -> ggchild2) under child1
    // would result in root -> child1 -> child2 -> gchild2 -> ggchild2 (depth 5).
    expect(validateMenuDepth("child2", "child1", itemsWithSubtree)).toBe(false);
  });
});

describe("RBAC - Cascading permission inheritance logic simulation", () => {
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

  const rolePermissions: RolePermission[] = [
    { role: "OPERATOR", menuKey: "master-data", permission: "VIEW" },
    { role: "OPERATOR", menuKey: "master-data", permission: "EDIT" },
    { role: "ADMIN", menuKey: "settings", permission: "VIEW" },
  ];

  const menuItems: MenuItem[] = [
    { key: "master-data", parentKey: null, title: "Master Data", url: "/md", icon: null },
    { key: "master-data-groups", parentKey: "master-data", title: "Groups", url: "/md/groups", icon: null },
    { key: "master-data-farmers", parentKey: "master-data-groups", title: "Farmers", url: "/md/farmers", icon: null },
  ];

  // Helper simulating the new cascading inheritance logic
  function resolveEffectivePermissions(
    role: string,
    userId: string,
    menuKey: string,
    overrides: UserOverride[]
  ): string[] {
    // Build path from root to key
    const path: string[] = [];
    let currentKey: string | null = menuKey;
    while (currentKey) {
      path.unshift(currentKey);
      const item = menuItems.find((i) => i.key === currentKey);
      currentKey = item ? item.parentKey : null;
    }

    const effective = new Set<string>();

    for (const key of path) {
      // Apply defaults for this level
      rolePermissions
        .filter((rp) => rp.role === role && rp.menuKey === key)
        .forEach((rp) => effective.add(rp.permission));

      // Apply overrides for this level
      overrides
        .filter((o) => o.userId === userId && o.menuKey === key)
        .forEach((o) => {
          if (o.granted) {
            effective.add(o.permission);
          } else {
            effective.delete(o.permission);
          }
        });
    }

    return Array.from(effective);
  }

  it("inherits permission from parent and grandparent", () => {
    // master-data has VIEW, EDIT
    // master-data-groups and master-data-farmers should inherit them
    const p1 = resolveEffectivePermissions("OPERATOR", "user-1", "master-data", []);
    const p2 = resolveEffectivePermissions("OPERATOR", "user-1", "master-data-groups", []);
    const p3 = resolveEffectivePermissions("OPERATOR", "user-1", "master-data-farmers", []);

    expect(p1).toContain("VIEW");
    expect(p1).toContain("EDIT");

    expect(p2).toContain("VIEW");
    expect(p2).toContain("EDIT");

    expect(p3).toContain("VIEW");
    expect(p3).toContain("EDIT");
  });

  it("respects explicit revoke overrides at deeper level", () => {
    // Revoke VIEW on master-data-farmers
    const overrides: UserOverride[] = [
      { userId: "user-1", menuKey: "master-data-farmers", permission: "VIEW", granted: false },
    ];
    const p3 = resolveEffectivePermissions("OPERATOR", "user-1", "master-data-farmers", overrides);
    const p2 = resolveEffectivePermissions("OPERATOR", "user-1", "master-data-groups", overrides);

    expect(p2).toContain("VIEW"); // Parent still has VIEW
    expect(p3).not.toContain("VIEW"); // Grandchild VIEW is revoked
  });
});
