"use server";
 
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { menuIdSchema, updateMenuItemSchema } from "@/validations/menu.schema";
import type { UpdateMenuItemInput } from "@/validations/menu.schema";
import { buildMenuTree } from "@/lib/menu-utils";
import type { MenuItem } from "@/lib/menu-utils";
import type { ActionResult } from "@/types/action-result";

const NO_ACTIVE_PERMISSION = "Tidak memiliki izin untuk menonaktifkan/mengaktifkan menu";
 
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

  const current = await prisma.menuItem.findUnique({ where: { id: parsed.data.id }, select: { isActive: true, parentKey: true } });
  if (!current) return { success: false, error: "Menu tidak ditemukan — muat ulang halaman" };
  // Mengubah Aktif = soft delete / reaktivasi → level DELETE, sama dengan
  // `deleteMenuItem`; EDIT saja hanya boleh mengubah Visible.
  if (current.isActive !== parsed.data.isActive && !(await hasPermission("settings-menu", "DELETE"))) {
    return { success: false, error: NO_ACTIVE_PERMISSION };
  }
  // Aturan induk nonaktif sama dengan tombol "Aktifkan kembali" (review wrap-up).
  if (!current.isActive && parsed.data.isActive) {
    const blocked = await inactiveParentError(current.parentKey);
    if (blocked) return { success: false, error: blocked };
  }

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
 
/**
 * Nonaktifkan (soft delete) / aktifkan kembali satu menu — satu jalur untuk
 * kedua arah (#237) agar guard, cek id basi, dan aturan Visible tidak
 * menyimpang. Level DELETE. Nonaktif mematikan Aktif + Visible; aktif kembali
 * menyalakan keduanya (kalau tidak, menu tetap tak tampil) dan ditolak bila
 * induknya masih nonaktif — anak tak terjangkau dari sidebar/izin berjenjang.
 */
/** Pesan penolakan bila induk menu masih nonaktif (anak tak terjangkau dari sidebar/izin berjenjang). */
async function inactiveParentError(parentKey: string | null): Promise<string | null> {
  if (!parentKey) return null;
  const parent = await prisma.menuItem.findUnique({ where: { key: parentKey }, select: { title: true, isActive: true } });
  return parent && !parent.isActive ? `Induk menu "${parent.title}" masih nonaktif — aktifkan induknya dulu` : null;
}

async function setMenuItemActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await hasPermission("settings-menu", "DELETE"))) {
    return { success: false, error: NO_ACTIVE_PERMISSION };
  }
  if (!menuIdSchema.safeParse(id).success) return { success: false, error: "Menu tidak valid" };

  const current = await prisma.menuItem.findUnique({ where: { id }, select: { parentKey: true } });
  if (!current) return { success: false, error: "Menu tidak ditemukan — muat ulang halaman" };
  if (active) {
    const blocked = await inactiveParentError(current.parentKey);
    if (blocked) return { success: false, error: blocked };
  }

  const session = await auth();
  await prisma.menuItem.update({
    where: { id },
    data: { isActive: active, isVisible: active, modifiedBy: session?.user?.id ?? null },
  });
  return { success: true };
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  return setMenuItemActive(id, false);
}

/** Tombol "Aktifkan kembali" (#237) — dulu memanggil `deleteMenuItem`. */
export async function reactivateMenuItem(id: string): Promise<ActionResult> {
  return setMenuItemActive(id, true);
}
