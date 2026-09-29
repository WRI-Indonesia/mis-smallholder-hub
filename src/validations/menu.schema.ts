import { z } from "zod";

/**
 * Menu Management hanya mengubah **Aktif** & **Visible** (#364, keputusan owner
 * 2026-09-29). Struktur menu — judul, urutan, induk, URL, ikon, dan menu baru —
 * hanya lewat `prisma/seeds/data/menu.csv` + seed: seed rilis menimpa kelima
 * kolom itu (`seedMenu`), dan akun demo pernah mengubah label/urutan prod tanpa
 * jejak di repo. Field lain yang dikirim klien dibuang Zod (objek non-strict).
 */
export const updateMenuItemSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
  isVisible: z.boolean(),
});

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
