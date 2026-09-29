"use server";
 
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { updateMenuItemSchema } from "@/validations/menu.schema";
import type { UpdateMenuItemInput } from "@/validations/menu.schema";
import { buildMenuTree } from "@/lib/menu-utils";
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
 
/**
 * Satu-satunya perubahan menu dari UI: Aktif & Visible (#364). Struktur menu
 * (judul, urutan, induk, URL, ikon) dan menu baru hanya lewat `menu.csv` + seed —
 * sengaja tidak ada aksi tambah menu.
 */
export async function updateMenuItem(input: UpdateMenuItemInput) {
  if (!(await hasPermission("settings-menu", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah menu" };
  }

  const parsed = updateMenuItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();
  await prisma.menuItem.update({
    where: { id: parsed.data.id },
    data: {
      isActive: parsed.data.isActive,
      isVisible: parsed.data.isVisible,
      modifiedBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}
 
export async function deleteMenuItem(id: string) {
  if (!(await hasPermission("settings-menu", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menghapus menu" };
  }

  const session = await auth();
  await prisma.menuItem.update({
    where: { id },
    data: { isActive: false, isVisible: false, modifiedBy: session?.user?.id ?? null },
  });
  return { success: true };
}

