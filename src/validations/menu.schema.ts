import { z } from "zod";

export const menuItemSchema = z.object({
  key: z.string().min(2, "Key minimal 2 karakter").regex(/^[a-z0-9-]+$/, "Key hanya huruf kecil, angka, dan dash"),
  parentKey: z.string().nullable().optional(),
  title: z.string().min(2, "Title minimal 2 karakter"),
  url: z.string().min(1, "URL wajib diisi"),
  icon: z.string().nullable().optional(),
  order: z.number().int().min(0),
  isActive: z.boolean(),
  isVisible: z.boolean(),
});

/**
 * Edit menu dari UI TIDAK memuat `title` & `order` (#364 opsi b, keputusan owner
 * 2026-09-29): label & urutan menu hanya berubah lewat `menu.csv` + seed —
 * akun demo pernah mengubah label/urutan prod tanpa jejak di repo. Field yang
 * tetap dikirim klien dibuang Zod (objek non-strict), jadi POST langsung ke
 * action pun tidak bisa mengubahnya.
 */
export const updateMenuItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  parentKey: z.string().nullable().optional(),
  url: z.string().min(1, "URL wajib diisi"),
  icon: z.string().nullable().optional(),
  isActive: z.boolean(),
  isVisible: z.boolean(),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
