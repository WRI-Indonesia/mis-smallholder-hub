import { describe, it, expect } from "vitest";
import {
  buildMenuTree,
  collapsibleKeys,
  descendantKeys,
  flattenTree,
  type FlatMenu,
} from "@/lib/menu-tree";

// Pohon 3 level (bug lama: level-3 tak pernah dirender di matriks/menu).
const items: (FlatMenu & { title: string })[] = [
  { key: "dashboard", parentKey: null, title: "Dashboard" },
  { key: "dashboard-main", parentKey: "dashboard", title: "Main" },
  { key: "settings", parentKey: null, title: "Settings" },
  { key: "settings-menu", parentKey: "settings", title: "Menu Management" },
  { key: "tools", parentKey: null, title: "Tools" },
  { key: "tools-snapshot", parentKey: "tools", title: "Snapshot" },
  { key: "tools-snapshot-bmp", parentKey: "tools-snapshot", title: "Snapshot BMP" }, // level-3
];

const noCollapse = { isCollapsed: () => false };

describe("menu-tree — buildMenuTree", () => {
  it("nests to 3 levels and keeps depth", () => {
    const tree = buildMenuTree(items);
    expect(tree.map((n) => n.item.key)).toEqual(["dashboard", "settings", "tools"]);
    const tools = tree.find((n) => n.item.key === "tools")!;
    expect(tools.depth).toBe(0);
    const snapshot = tools.children[0];
    expect(snapshot.item.key).toBe("tools-snapshot");
    expect(snapshot.depth).toBe(1);
    expect(snapshot.children[0].item.key).toBe("tools-snapshot-bmp");
    expect(snapshot.children[0].depth).toBe(2);
  });
});

describe("menu-tree — flattenTree renders all 3 levels (level-3 bug fix)", () => {
  it("includes the level-3 node when expanded", () => {
    const tree = buildMenuTree(items);
    const keys = flattenTree(tree, noCollapse).map((r) => r.item.key);
    expect(keys).toContain("tools-snapshot-bmp");
    // urutan: induk sebelum anak
    expect(keys.indexOf("tools")).toBeLessThan(keys.indexOf("tools-snapshot"));
    expect(keys.indexOf("tools-snapshot")).toBeLessThan(keys.indexOf("tools-snapshot-bmp"));
  });

  it("hasChildren flag benar", () => {
    const tree = buildMenuTree(items);
    const rows = flattenTree(tree, noCollapse);
    expect(rows.find((r) => r.item.key === "tools")!.hasChildren).toBe(true);
    expect(rows.find((r) => r.item.key === "tools-snapshot")!.hasChildren).toBe(true);
    expect(rows.find((r) => r.item.key === "tools-snapshot-bmp")!.hasChildren).toBe(false);
    expect(rows.find((r) => r.item.key === "dashboard-main")!.hasChildren).toBe(false);
  });
});

describe("menu-tree — collapse", () => {
  it("menyembunyikan subtree bila induk collapsed", () => {
    const tree = buildMenuTree(items);
    const collapsed = new Set(["tools"]);
    const keys = flattenTree(tree, { isCollapsed: (k) => collapsed.has(k) }).map((r) => r.item.key);
    expect(keys).toContain("tools");
    expect(keys).not.toContain("tools-snapshot");
    expect(keys).not.toContain("tools-snapshot-bmp");
  });

  it("collapse level-2 hanya menyembunyikan level-3", () => {
    const tree = buildMenuTree(items);
    const collapsed = new Set(["tools-snapshot"]);
    const keys = flattenTree(tree, { isCollapsed: (k) => collapsed.has(k) }).map((r) => r.item.key);
    expect(keys).toContain("tools-snapshot");
    expect(keys).not.toContain("tools-snapshot-bmp");
  });
});

describe("menu-tree — search filter", () => {
  it("cocok di level-3 tetap menampilkan seluruh leluhur & mengabaikan collapse", () => {
    const tree = buildMenuTree(items);
    const rows = flattenTree(tree, {
      isCollapsed: () => true, // semua collapsed
      matches: (m) => m.key === "tools-snapshot-bmp",
    });
    const keys = rows.map((r) => r.item.key);
    expect(keys).toEqual(["tools", "tools-snapshot", "tools-snapshot-bmp"]);
    // cabang lain tak muncul
    expect(keys).not.toContain("dashboard");
  });

  it("cocok di induk menampilkan induk (dan tidak memaksa anak yang tak cocok)", () => {
    const tree = buildMenuTree(items);
    const rows = flattenTree(tree, { isCollapsed: () => false, matches: (m) => m.key === "dashboard" });
    expect(rows.map((r) => r.item.key)).toEqual(["dashboard"]);
  });
});

describe("menu-tree — descendantKeys & collapsibleKeys", () => {
  it("descendantKeys mengembalikan seluruh keturunan", () => {
    const tree = buildMenuTree(items);
    expect(descendantKeys(tree, "tools").sort()).toEqual(["tools-snapshot", "tools-snapshot-bmp"].sort());
    expect(descendantKeys(tree, "tools-snapshot")).toEqual(["tools-snapshot-bmp"]);
    expect(descendantKeys(tree, "dashboard-main")).toEqual([]);
  });

  it("collapsibleKeys hanya node yang punya anak", () => {
    const tree = buildMenuTree(items);
    expect(collapsibleKeys(tree).sort()).toEqual(["dashboard", "settings", "tools", "tools-snapshot"].sort());
  });
});
