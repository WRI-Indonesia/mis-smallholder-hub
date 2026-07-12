"use server";
 
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { menuItemSchema, updateMenuItemSchema } from "@/validations/menu.schema";
import type { MenuItemInput, UpdateMenuItemInput } from "@/validations/menu.schema";
import { buildMenuTree, validateMenuDepth } from "@/lib/menu-utils";
import type { MenuItem } from "@/lib/menu-utils";
 
export async function getMenuItems(): Promise<{ success: boolean; data?: MenuItem[] }> {
  try {
    const items = await prisma.menuItem.findMany({
      where: { isActive: true, isVisible: true },
      orderBy: { order: "asc" },
    });

    const tree = buildMenuTree(items);
    return { success: true, data: tree };
  } catch {
    return { success: false };
  }
}
 
export async function getAllMenuItems() {
  // Dipakai halaman Menu Management (settings-menu) & Role & Permission (settings-roles).
  if (
    !(await hasPermission("settings-menu", "VIEW")) &&
    !(await hasPermission("settings-roles", "VIEW"))
  ) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.menuItem.findMany({
    orderBy: [{ order: "asc" }, { title: "asc" }],
  });
}
 
export async function createMenuItem(input: MenuItemInput) {
  if (!(await hasPermission("settings-menu", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah menu" };
  }

  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
 
  const existing = await prisma.menuItem.findUnique({ where: { key: parsed.data.key } });
  if (existing) return { success: false, error: { key: ["Key sudah digunakan"] } };
 
  const allItems = await prisma.menuItem.findMany({ where: { isActive: true } });
  if (!validateMenuDepth(parsed.data.key, parsed.data.parentKey ?? null, allItems)) {
    return { success: false, error: { parentKey: ["Menu depth tidak boleh lebih dari 3 level"] } };
  }

  await prisma.menuItem.create({
    data: {
      key: parsed.data.key,
      parentKey: parsed.data.parentKey,
      title: parsed.data.title,
      url: parsed.data.url,
      icon: parsed.data.icon,
      order: parsed.data.order,
      isActive: parsed.data.isActive,
      isVisible: parsed.data.isVisible,
    },
  });
 
  return { success: true };
}
 
export async function updateMenuItem(input: UpdateMenuItemInput) {
  if (!(await hasPermission("settings-menu", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah menu" };
  }

  const parsed = updateMenuItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
 
  const allItems = await prisma.menuItem.findMany({ where: { isActive: true } });
  const otherItems = allItems.filter(item => item.id !== parsed.data.id);
  if (!validateMenuDepth(parsed.data.key, parsed.data.parentKey ?? null, otherItems)) {
    return { success: false, error: { parentKey: ["Menu depth tidak boleh lebih dari 3 level"] } };
  }

  await prisma.menuItem.update({
    where: { id: parsed.data.id },
    data: {
      parentKey: parsed.data.parentKey,
      title: parsed.data.title,
      url: parsed.data.url,
      icon: parsed.data.icon,
      order: parsed.data.order,
      isActive: parsed.data.isActive,
      isVisible: parsed.data.isVisible,
    },
  });
 
  return { success: true };
}
 
export async function deleteMenuItem(id: string) {
  if (!(await hasPermission("settings-menu", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menghapus menu" };
  }

  await prisma.menuItem.update({
    where: { id },
    data: { isActive: false, isVisible: false },
  });
  return { success: true };
}

