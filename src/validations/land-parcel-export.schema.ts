import { z } from "zod";

// Unduh data spasial lahan (#313). Sesuai keputusan lingkup: TANPA mode "all"
// lintas-wilayah — Distrik ATAU Lembaga Petani wajib dipilih agar unduhan
// selalu terikat konteks filter. Toleransi id non-CUID sama dengan map.schema
// (Province/District memakai kode BPS numerik).
export const parcelExportFilterSchema = z
  .object({
    provinceId: z.string().min(1).nullish(),
    districtId: z.string().min(1).nullish(),
    farmerGroupId: z.string().min(1).nullish(),
  })
  .refine((v) => Boolean(v.districtId) || Boolean(v.farmerGroupId), {
    message: "Pilih Distrik atau Lembaga Petani terlebih dahulu",
  });

export type ParcelExportFilterInput = z.infer<typeof parcelExportFilterSchema>;
