import { z } from "zod";

/**
 * Filter Laporan Lahan dari klien (#305/#319). `coverage` WAJIB (`all`/`mapped`) —
 * tanpa default yang bisa berbeda dengan teks cetakan. Field lain hanya divalidasi
 * BENTUKNYA (string/array); nilai enum yang tak dikenal tetap diabaikan per field di
 * `landParcelLegalWhere`, bukan menggagalkan laporan.
 */
export const landParcelReportFiltersSchema = z.object({
  coverage: z.enum(["all", "mapped"], { message: "Filter Cakupan Pendataan wajib diisi" }),
  documentStatus: z.enum(["all", "with", "without"]).optional(),
  documentTypes: z.array(z.string().max(50)).max(50).optional(),
  stdbStatus: z.string().max(50).optional(),
  areaDiff: z.enum(["all", "gte"]).optional(),
  nktStatus: z.string().max(50).optional(),
  marker: z.string().max(50).optional(),
  districtId: z.string().max(100).nullish(),
  farmerGroupId: z.string().max(100).nullish(),
});
