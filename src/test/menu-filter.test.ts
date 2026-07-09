import { describe, it, expect } from "vitest";
import { filterMenuTreeByAccess, type MenuItem } from "@/lib/menu-utils";
import { filterNavByQuery } from "@/components/layout/admin/nav-filter";
import type { NavItem } from "@/components/layout/admin/nav-types";

// Shared fixture: Settings (parent) with 4 children.
function settingsTree(): MenuItem[] {
  const child = (key: string, title: string): MenuItem => ({
    key,
    parentKey: "settings",
    title,
    url: `/admin/settings/${key}`,
    icon: null,
    children: [],
  });
  return [
    {
      key: "settings",
      parentKey: null,
      title: "Settings",
      url: "#",
      icon: null,
      children: [
        child("settings-users", "User Management"),
        child("settings-menu", "Menu Management"),
        child("settings-roles", "Role & Permission"),
        child("settings-regions", "Regions"),
      ],
    },
  ];
}

describe("filterMenuTreeByAccess (RBAC menu visibility)", () => {
  it("shows the parent as a container when only a child is granted", () => {
    // Facilitator granted ONLY the Regions child — NOT the Settings parent.
    const keys = new Set(["settings-regions"]);
    const result = filterMenuTreeByAccess(settingsTree(), keys);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("settings");
    // Only Regions survives; sibling admin menus are gone.
    expect(result[0].children?.map((c) => c.key)).toEqual(["settings-regions"]);
  });

  it("does NOT leak sibling menus when a child is granted", () => {
    const keys = new Set(["settings-regions"]);
    const result = filterMenuTreeByAccess(settingsTree(), keys);
    const childKeys = result[0].children?.map((c) => c.key) ?? [];

    expect(childKeys).not.toContain("settings-users");
    expect(childKeys).not.toContain("settings-menu");
    expect(childKeys).not.toContain("settings-roles");
  });

  it("keeps all granted children (e.g. cascade-style full grant)", () => {
    const keys = new Set([
      "settings",
      "settings-users",
      "settings-menu",
      "settings-roles",
      "settings-regions",
    ]);
    const result = filterMenuTreeByAccess(settingsTree(), keys);
    expect(result[0].children).toHaveLength(4);
  });

  it("drops a parent entirely when no descendant is accessible", () => {
    const keys = new Set(["some-other-menu"]);
    const result = filterMenuTreeByAccess(settingsTree(), keys);
    expect(result).toHaveLength(0);
  });

  it("keeps a leaf-only accessible top-level menu", () => {
    const items: MenuItem[] = [
      { key: "dashboard", parentKey: null, title: "Dashboard", url: "/admin/dashboard", icon: null, children: [] },
    ];
    expect(filterMenuTreeByAccess(items, new Set(["dashboard"]))).toHaveLength(1);
    expect(filterMenuTreeByAccess(items, new Set())).toHaveLength(0);
  });
});

describe("filterNavByQuery (sidebar search)", () => {
  const nav: NavItem[] = [
    {
      title: "Settings",
      url: "#",
      items: [
        { title: "User Management", url: "/admin/settings/users" },
        { title: "Regions", url: "/admin/settings/regions" },
      ],
    },
    {
      title: "Master Data",
      url: "#",
      items: [{ title: "Petani", url: "/admin/master-data/farmers" }],
    },
  ];

  it("returns the input unchanged for a blank query", () => {
    expect(filterNavByQuery(nav, "")).toBe(nav);
    expect(filterNavByQuery(nav, "   ")).toBe(nav);
  });

  it("keeps only branches whose descendant matches", () => {
    const result = filterNavByQuery(nav, "user");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Settings");
    expect(result[0].items?.map((i) => i.title)).toEqual(["User Management"]);
  });

  it("is case-insensitive and matches on substring", () => {
    const result = filterNavByQuery(nav, "PETAN");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Master Data");
  });

  it("keeps all children when the parent title itself matches", () => {
    const result = filterNavByQuery(nav, "settings");
    expect(result[0].items).toHaveLength(2);
  });

  it("returns empty when nothing matches", () => {
    expect(filterNavByQuery(nav, "zzz")).toHaveLength(0);
  });
});
