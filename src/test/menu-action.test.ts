import { describe, it, expect } from "vitest";

// Unit test for menu tree building logic (extracted from server action)
describe("Menu - Tree building logic", () => {
  interface MenuItem {
    key: string;
    parentKey: string | null;
    title: string;
    url: string;
    icon: string | null;
  }

  function buildMenuTree(items: MenuItem[]) {
    const parents = items.filter((i) => !i.parentKey);
    return parents.map((p) => ({
      key: p.key,
      title: p.title,
      url: p.url,
      icon: p.icon,
      children: items
        .filter((c) => c.parentKey === p.key)
        .map((c) => ({
          key: c.key,
          title: c.title,
          url: c.url,
          icon: c.icon,
          children: [],
        })),
    }));
  }

  const mockItems: MenuItem[] = [
    { key: "master-data", parentKey: null, title: "Master Data", url: "/admin/master-data", icon: "Database" },
    { key: "master-data-groups", parentKey: "master-data", title: "Kelompok Tani", url: "/admin/master-data/groups", icon: "Users" },
    { key: "settings", parentKey: null, title: "Settings", url: "/admin/settings", icon: "Settings" },
    { key: "settings-users", parentKey: "settings", title: "User Management", url: "/admin/settings/users", icon: "UserCog" },
    { key: "settings-menu", parentKey: "settings", title: "Menu Management", url: "/admin/settings/menu", icon: "Menu" },
  ];

  it("builds correct tree with parents and children", () => {
    const tree = buildMenuTree(mockItems);

    expect(tree).toHaveLength(2);
    expect(tree[0].key).toBe("master-data");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].key).toBe("master-data-groups");
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

  it("ignores orphan children (parentKey not found)", () => {
    const items: MenuItem[] = [
      { key: "parent", parentKey: null, title: "Parent", url: "/parent", icon: null },
      { key: "orphan", parentKey: "nonexistent", title: "Orphan", url: "/orphan", icon: null },
    ];
    const tree = buildMenuTree(items);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(0);
  });
});
