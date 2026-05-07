import { z } from "zod";

export const menuItemSchema = z.object({
  id: z.string().optional(),
  key: z
    .string()
    .min(1, "Key wajib diisi")
    .regex(/^[a-z0-9-]+$/, "Key hanya boleh huruf kecil, angka, dan tanda hubung"),
  parentKey: z.string().nullable().optional(),
  title: z.string().min(1, "Title wajib diisi"),
  url: z.string().min(1, "URL wajib diisi"),
  icon: z.string().optional().nullable(),
  order: z.number().int().min(0, "Order harus >= 0"),
  isActive: z.boolean(),
  isVisible: z.boolean(),
  roles: z.string(),
  groups: z.string(),
  jobDescs: z.string(),
  regions: z.string(),
});

export const reorderMenuItemSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(0),
});

export const reorderMenuItemsSchema = z.array(reorderMenuItemSchema).min(1);

export type MenuItemFormValues = z.infer<typeof menuItemSchema>;
export type ReorderItem = z.infer<typeof reorderMenuItemSchema>;
