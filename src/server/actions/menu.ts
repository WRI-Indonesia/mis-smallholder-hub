"use server";

import { prisma } from "@/lib/prisma";
import { menuItemSchema, reorderMenuItemsSchema } from "@/validations/menu.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import type { MenuItemFormValues, ReorderItem } from "@/validations/menu.schema";

const REVALIDATE_PATH = "/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuItemRow {
  id: string;
  key: string;
  parentKey: string | null;
  title: string;
  url: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  isVisible: boolean;
  roles: string;
  groups: string;
  jobDescs: string;
  regions: string;
  createdAt: Date;
  modifiedAt: Date;
  createdBy: string | null;
  modifiedBy: string | null;
}

export interface MenuItemTree extends MenuItemRow {
  children: MenuItemTree[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a nested tree from a flat list of MenuItemRow */
function buildTree(items: MenuItemRow[]): MenuItemTree[] {
  const map = new Map<string, MenuItemTree>();
  const roots: MenuItemTree[] = [];

  // First pass: create all nodes
  for (const item of items) {
    map.set(item.key, { ...item, children: [] });
  }

  // Second pass: attach children to parents
  for (const item of items) {
    const node = map.get(item.key)!;
    if (item.parentKey) {
      const parent = map.get(item.parentKey);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node); // orphan — treat as root
      }
    } else {
      roots.push(node);
    }
  }

  // Sort by order at each level
  const sortByOrder = (nodes: MenuItemTree[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((n) => sortByOrder(n.children));
  };
  sortByOrder(roots);

  return roots;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Fetch all visible menu items and return as a nested tree (for sidebar) */
export async function getMenuItems(): Promise<ActionResult<MenuItemTree[]>> {
  try {
    const start = Date.now();
    const items = await prisma.menuItem.findMany({
      where: { isVisible: true },
      orderBy: { order: "asc" },
    });
    const elapsed = Date.now() - start;
    console.log(`[getMenuItems] ${items.length} items fetched in ${elapsed}ms`);

    return { success: true, data: buildTree(items as MenuItemRow[]) };
  } catch (error) {
    console.error("[getMenuItems] error:", error);
    return { success: false, error: "Gagal memuat menu" };
  }
}

/** Fetch ALL menu items (including hidden) — for Settings Menu management page */
export async function getAllMenuItems(): Promise<ActionResult<MenuItemRow[]>> {
  try {
    const items = await prisma.menuItem.findMany({
      orderBy: [{ order: "asc" }, { key: "asc" }],
    });
    return { success: true, data: items as MenuItemRow[] };
  } catch (error) {
    console.error("[getAllMenuItems] error:", error);
    return { success: false, error: "Gagal memuat daftar menu" };
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createMenuItem(
  data: MenuItemFormValues
): Promise<ActionResult<MenuItemRow>> {
  const parsed = menuItemSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    // Check for duplicate key
    const existing = await prisma.menuItem.findUnique({
      where: { key: parsed.data.key },
    });
    if (existing) {
      return { success: false, error: `Key "${parsed.data.key}" sudah digunakan` };
    }

    // Validate parent exists if parentKey provided
    if (parsed.data.parentKey) {
      const parent = await prisma.menuItem.findUnique({
        where: { key: parsed.data.parentKey },
      });
      if (!parent) {
        return { success: false, error: "Parent menu tidak ditemukan" };
      }
      // Prevent circular: parent cannot be a child of the new item
      // (new item doesn't exist yet, so no circular risk on create)
    }

    const item = await prisma.menuItem.create({
      data: {
        key: parsed.data.key,
        parentKey: parsed.data.parentKey ?? null,
        title: parsed.data.title,
        url: parsed.data.url,
        icon: parsed.data.icon ?? null,
        order: parsed.data.order,
        isActive: parsed.data.isActive,
        isVisible: parsed.data.isVisible,
        roles: parsed.data.roles,
        groups: parsed.data.groups,
        jobDescs: parsed.data.jobDescs,
        regions: parsed.data.regions,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: item as MenuItemRow };
  } catch (error) {
    console.error("[createMenuItem] error:", error);
    return { success: false, error: "Gagal membuat menu item" };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateMenuItem(
  id: string,
  data: Partial<MenuItemFormValues>
): Promise<ActionResult<MenuItemRow>> {
  if (!id) return { success: false, error: "ID tidak valid" };

  const parsed = menuItemSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Menu item tidak ditemukan" };
    }

    // Prevent circular self-reference
    if (parsed.data.parentKey && parsed.data.parentKey === existing.key) {
      return { success: false, error: "Menu tidak bisa menjadi parent dari dirinya sendiri" };
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.url !== undefined && { url: parsed.data.url }),
        ...(parsed.data.icon !== undefined && { icon: parsed.data.icon }),
        ...(parsed.data.order !== undefined && { order: parsed.data.order }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
        ...(parsed.data.isVisible !== undefined && { isVisible: parsed.data.isVisible }),
        ...(parsed.data.roles !== undefined && { roles: parsed.data.roles }),
        ...(parsed.data.groups !== undefined && { groups: parsed.data.groups }),
        ...(parsed.data.jobDescs !== undefined && { jobDescs: parsed.data.jobDescs }),
        ...(parsed.data.regions !== undefined && { regions: parsed.data.regions }),
        ...("parentKey" in parsed.data && { parentKey: parsed.data.parentKey ?? null }),
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: item as MenuItemRow };
  } catch (error) {
    console.error("[updateMenuItem] error:", error);
    return { success: false, error: "Gagal memperbarui menu item" };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a menu item.
 * - Hard delete if no children exist.
 * - Soft delete (isVisible = false) if children exist to preserve hierarchy.
 */
export async function deleteMenuItem(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: "ID tidak valid" };

  try {
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });

    if (!item) {
      return { success: false, error: "Menu item tidak ditemukan" };
    }

    if (item._count.children > 0) {
      // Soft delete — has children, preserve hierarchy
      await prisma.menuItem.update({
        where: { id },
        data: { isVisible: false },
      });
    } else {
      // Hard delete — no children
      await prisma.menuItem.delete({ where: { id } });
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("[deleteMenuItem] error:", error);
    return { success: false, error: "Gagal menghapus menu item" };
  }
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

/** Batch update order for multiple menu items */
export async function reorderMenuItems(
  items: ReorderItem[]
): Promise<ActionResult> {
  const parsed = reorderMenuItemsSchema.safeParse(items);
  if (!parsed.success) {
    return { success: false, error: "Data urutan tidak valid" };
  }

  try {
    const start = Date.now();
    await prisma.$transaction(
      parsed.data.map((item) =>
        prisma.menuItem.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );
    const elapsed = Date.now() - start;
    console.log(`[reorderMenuItems] ${parsed.data.length} items reordered in ${elapsed}ms`);

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("[reorderMenuItems] error:", error);
    return { success: false, error: "Gagal menyimpan urutan menu" };
  }
}

// ─── Dropdown helper ──────────────────────────────────────────────────────────

/** Fetch root-level menu items for parent selector dropdown */
export async function getRootMenuItems(): Promise<
  ActionResult<{ id: string; key: string; title: string }[]>
> {
  try {
    const items = await prisma.menuItem.findMany({
      where: { parentKey: null },
      select: { id: true, key: true, title: true },
      orderBy: { order: "asc" },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("[getRootMenuItems] error:", error);
    return { success: false, error: "Gagal memuat parent menu" };
  }
}
