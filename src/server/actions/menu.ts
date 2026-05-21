"use server";

import { prisma } from "@/lib/prisma";
import { menuItemSchema, updateMenuItemSchema } from "@/validations/menu.schema";
import type { MenuItemInput, UpdateMenuItemInput } from "@/validations/menu.schema";

interface MenuItem {
  key: string;
  title: string;
  url: string;
  icon: string | null;
  children: MenuItem[];
}

export async function getMenuItems(): Promise<{ success: boolean; data?: MenuItem[] }> {
  try {
    const items = await prisma.menuItem.findMany({
      where: { isActive: true, isVisible: true },
      orderBy: { order: "asc" },
    });

    const parents = items.filter((i) => !i.parentKey);
    const tree: MenuItem[] = parents.map((p) => ({
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

    return { success: true, data: tree };
  } catch {
    return { success: false };
  }
}

export async function getAllMenuItems() {
  return prisma.menuItem.findMany({
    orderBy: [{ order: "asc" }, { title: "asc" }],
  });
}

export async function createMenuItem(input: MenuItemInput) {
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const existing = await prisma.menuItem.findUnique({ where: { key: parsed.data.key } });
  if (existing) return { success: false, error: { key: ["Key sudah digunakan"] } };

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
  const parsed = updateMenuItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

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
  await prisma.menuItem.update({
    where: { id },
    data: { isActive: false, isVisible: false },
  });
  return { success: true };
}
