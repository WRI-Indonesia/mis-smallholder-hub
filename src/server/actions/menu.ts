"use server";

import { prisma } from "@/lib/prisma";

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

    // Build tree: parents first, then attach children
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
