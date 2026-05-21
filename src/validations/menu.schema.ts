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

export const updateMenuItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  parentKey: z.string().nullable().optional(),
  title: z.string().min(2, "Title minimal 2 karakter"),
  url: z.string().min(1, "URL wajib diisi"),
  icon: z.string().nullable().optional(),
  order: z.number().int().min(0),
  isActive: z.boolean(),
  isVisible: z.boolean(),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
