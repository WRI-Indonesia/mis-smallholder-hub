/**
 * menu.test.ts
 *
 * Unit tests for Issue #35 — Dynamic Menu Management
 * Tests cover: server actions (mocked Prisma), Zod schema validation,
 * RBAC filtering, and tree-building logic.
 *
 * No live DB required — all Prisma calls are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { menuItemSchema, reorderMenuItemsSchema } from "../validations/menu.schema";
import { filterNavItems, type UserContext } from "../lib/static-data/admin/menu-utils";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    menuItem: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockRootItem = {
  id: "item-1",
  key: "dashboard",
  parentKey: null,
  title: "Dashboard",
  url: "#",
  icon: "LayoutDashboardIcon",
  order: 10,
  isActive: true,
  isVisible: true,
  roles: "all",
  groups: "all",
  jobDescs: "all",
  regions: "all",
  createdAt: new Date("2026-05-07T00:00:00Z"),
  modifiedAt: new Date("2026-05-07T00:00:00Z"),
  createdBy: null,
  modifiedBy: null,
};

const mockChildItem = {
  id: "item-2",
  key: "dashboard-training",
  parentKey: "dashboard",
  title: "Training",
  url: "/admin/dashboard/training",
  icon: null,
  order: 13,
  isActive: true,
  isVisible: true,
  roles: "all",
  groups: "all",
  jobDescs: "all",
  regions: "all",
  createdAt: new Date("2026-05-07T00:00:00Z"),
  modifiedAt: new Date("2026-05-07T00:00:00Z"),
  createdBy: null,
  modifiedBy: null,
};

const mockHiddenItem = {
  ...mockChildItem,
  id: "item-3",
  key: "dashboard-hidden",
  isVisible: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Menu Management — Issue #35", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── TC-1: getMenuItems returns tree structure ─────────────────────────────
  it("TC-1: getMenuItems() returns tree with correct parent-child structure", async () => {
    mockFindMany.mockResolvedValueOnce([mockRootItem, mockChildItem]);

    const { getMenuItems } = await import("../server/actions/menu");
    const result = await getMenuItems();

    expect(result.success).toBe(true);
    if (!result.success) return;

    const tree = result.data!;
    expect(tree).toHaveLength(1); // 1 root
    expect(tree[0].key).toBe("dashboard");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].key).toBe("dashboard-training");
  });

  // ── TC-2: getMenuItems only returns isVisible=true items ─────────────────
  it("TC-2: getMenuItems() only fetches isVisible=true items (DB filter)", async () => {
    mockFindMany.mockResolvedValueOnce([mockRootItem, mockChildItem]);

    const { getMenuItems } = await import("../server/actions/menu");
    await getMenuItems();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isVisible: true } })
    );
  });

  // ── TC-3: createMenuItem succeeds with valid data ─────────────────────────
  it("TC-3: createMenuItem() succeeds with valid data", async () => {
    mockFindUnique.mockResolvedValueOnce(null); // no duplicate key
    mockCreate.mockResolvedValueOnce({ ...mockChildItem, id: "new-id" });

    const { createMenuItem } = await import("../server/actions/menu");
    const result = await createMenuItem({
      key: "dashboard-training",
      title: "Training",
      url: "/admin/dashboard/training",
      order: 13,
      isActive: true,
      isVisible: true,
      roles: "all",
      groups: "all",
      jobDescs: "all",
      regions: "all",
    });

    expect(result.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  // ── TC-4: createMenuItem fails on duplicate key ───────────────────────────
  it("TC-4: createMenuItem() fails if key already exists", async () => {
    mockFindUnique.mockResolvedValueOnce(mockChildItem); // duplicate found

    const { createMenuItem } = await import("../server/actions/menu");
    const result = await createMenuItem({
      key: "dashboard-training",
      title: "Training",
      url: "/admin/dashboard/training",
      order: 13,
      isActive: true,
      isVisible: true,
      roles: "all",
      groups: "all",
      jobDescs: "all",
      regions: "all",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("sudah digunakan");
    }
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // ── TC-5: updateMenuItem succeeds updating order ──────────────────────────
  it("TC-5: updateMenuItem() succeeds updating order", async () => {
    mockFindUnique.mockResolvedValueOnce(mockChildItem);
    mockUpdate.mockResolvedValueOnce({ ...mockChildItem, order: 99 });

    const { updateMenuItem } = await import("../server/actions/menu");
    const result = await updateMenuItem("item-2", { order: 99 });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-2" },
        data: expect.objectContaining({ order: 99 }),
      })
    );
  });

  // ── TC-6: deleteMenuItem hard deletes when no children ────────────────────
  it("TC-6: deleteMenuItem() hard deletes when item has no children", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...mockChildItem,
      _count: { children: 0 },
    });
    mockDelete.mockResolvedValueOnce(mockChildItem);

    const { deleteMenuItem } = await import("../server/actions/menu");
    const result = await deleteMenuItem("item-2");

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "item-2" } });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── TC-7: deleteMenuItem soft deletes when has children ───────────────────
  it("TC-7: deleteMenuItem() soft deletes (isVisible=false) when item has children", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...mockRootItem,
      _count: { children: 3 },
    });
    mockUpdate.mockResolvedValueOnce({ ...mockRootItem, isVisible: false });

    const { deleteMenuItem } = await import("../server/actions/menu");
    const result = await deleteMenuItem("item-1");

    expect(result.success).toBe(true);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: { isVisible: false },
      })
    );
  });

  // ── TC-8: reorderMenuItems batch updates order ────────────────────────────
  it("TC-8: reorderMenuItems() batch updates order via transaction", async () => {
    mockTransaction.mockResolvedValueOnce([]);

    const { reorderMenuItems } = await import("../server/actions/menu");
    const result = await reorderMenuItems([
      { id: "item-1", order: 0 },
      { id: "item-2", order: 10 },
      { id: "item-3", order: 20 },
    ]);

    expect(result.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  // ── TC-9: Zod schema rejects empty url ───────────────────────────────────
  it("TC-9: menuItemSchema rejects empty url", () => {
    const result = menuItemSchema.safeParse({
      key: "test-menu",
      title: "Test",
      url: "",
      order: 0,
      isActive: true,
      isVisible: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const urlError = result.error.issues.find((e) => e.path.includes("url"));
      expect(urlError).toBeDefined();
    }
  });

  // ── TC-10: Zod schema rejects empty title ────────────────────────────────
  it("TC-10: menuItemSchema rejects empty title", () => {
    const result = menuItemSchema.safeParse({
      key: "test-menu",
      title: "",
      url: "/admin/test",
      order: 0,
      isActive: true,
      isVisible: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleError = result.error.issues.find((e) => e.path.includes("title"));
      expect(titleError).toBeDefined();
    }
  });

  // ── TC-11: filterNavItems filters by role ────────────────────────────────
  it("TC-11: filterNavItems() filters menu items by user role", () => {
    const adminOnlyItems = [
      {
        title: "Settings",
        url: "#",
        rbac: { roles: ["admin"] as never[], groups: ["all"] as never[], jobDescs: ["all"] as never[], regions: ["all"] as never[] },
        items: [
          {
            title: "User Management",
            url: "/admin/settings/users",
            rbac: { roles: ["admin"] as never[], groups: ["all"] as never[], jobDescs: ["all"] as never[], regions: ["all"] as never[] },
          },
        ],
      },
    ];

    const adminCtx: UserContext = { role: "admin", group: "WRI", jobDesc: "manager", region: "all" };
    const operatorCtx: UserContext = { role: "operator", group: "WRI", jobDesc: "manager", region: "all" };

    const adminResult = filterNavItems(adminOnlyItems, adminCtx);
    const operatorResult = filterNavItems(adminOnlyItems, operatorCtx);

    expect(adminResult).toHaveLength(1);
    expect(operatorResult).toHaveLength(0);
  });

  // ── TC-12: updateMenuItem prevents self-reference ────────────────────────
  it("TC-12: updateMenuItem() rejects self-referential parentKey", async () => {
    mockFindUnique.mockResolvedValueOnce(mockRootItem); // existing item with key "dashboard"

    const { updateMenuItem } = await import("../server/actions/menu");
    const result = await updateMenuItem("item-1", {
      parentKey: "dashboard", // same as existing.key — circular!
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("parent dari dirinya sendiri");
    }
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── TC-13: reorderMenuItemsSchema rejects empty array ────────────────────
  it("TC-13: reorderMenuItemsSchema rejects empty array", () => {
    const result = reorderMenuItemsSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  // ── TC-14: menuItemSchema rejects invalid key format ─────────────────────
  it("TC-14: menuItemSchema rejects key with uppercase or spaces", () => {
    const result = menuItemSchema.safeParse({
      key: "Dashboard Training", // spaces not allowed
      title: "Training",
      url: "/admin/dashboard/training",
      order: 0,
      isActive: true,
      isVisible: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const keyError = result.error.issues.find((e) => e.path.includes("key"));
      expect(keyError).toBeDefined();
    }
  });
});
