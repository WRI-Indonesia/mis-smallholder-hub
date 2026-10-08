import { z } from "zod";

/**
 * Daftar Lembaga untuk sheet Detail ekspor Training Benefit (#402). Server Action =
 * endpoint HTTP: dibatasi agar array raksasa tak menjadi `IN (...)` berat di prod.
 * Batas jauh di atas jumlah Lembaga program (puluhan); duplikat dibuang.
 */
export const trainingBenefitFarmersSchema = z
  .array(z.string().min(1).max(64), { message: "Daftar Lembaga tidak valid" })
  .max(500, "Terlalu banyak Lembaga dalam satu ekspor")
  .transform((ids) => [...new Set(ids)]);
