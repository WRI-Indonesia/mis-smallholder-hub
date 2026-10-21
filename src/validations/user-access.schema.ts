import { z } from "zod";
import { ROLES } from "@/lib/roles";
import { ALL_PERMISSIONS } from "@/lib/permission-levels";

/**
 * Validasi aksi hak akses user (#440 F2): override menu per-user
 * (`user-menu-access.ts`), penugasan wilayah/Lembaga (`user-data-access.ts`),
 * dan matriks Role & Permission (`role-permission.ts`). Aksi ini menerima
 * argumen mentah dari klien — Zod menolak tipe/enum asing sebelum Prisma
 * disentuh. Id = string non-kosong (pola `menu.schema.ts`; tidak dipaksa cuid).
 * Keberadaan `menuKey` dijaga FK `menu_key → tbl_menu_item.key` di DB.
 */
const idSchema = z.string().min(1);
const menuKeySchema = z.string().min(1);
const permissionSchema = z.enum(ALL_PERMISSIONS);

export const userMenuOverrideSchema = z.object({
  userId: idSchema,
  menuKey: menuKeySchema,
  permission: permissionSchema,
  granted: z.boolean(),
});

export const removeUserMenuOverrideSchema = userMenuOverrideSchema.omit({ granted: true });

/** Pasangan (user, wilayah/Lembaga) untuk assign/remove Provinsi, Kabupaten, Lembaga. */
export const userDataAccessSchema = z.object({
  userId: idSchema,
  targetId: idSchema,
});

export const rolePermissionUpdatesSchema = z.array(
  z.object({
    role: z.enum(ROLES),
    menuKey: menuKeySchema,
    permission: permissionSchema,
    granted: z.boolean(),
  })
);

/** Pesan galat tunggal (string) — pemanggil di `src/app` menampilkan `result.error` sebagai toast. */
export const USER_ACCESS_INVALID_INPUT = "Data hak akses tidak valid";
