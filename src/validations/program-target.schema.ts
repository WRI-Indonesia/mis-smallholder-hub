import { z } from "zod";
import { PROGRAM_TARGET_INDICATORS, PROGRAM_TARGET_YEAR_MAX, PROGRAM_TARGET_YEAR_MIN } from "@/lib/program-target";

const year = z
  .number({ message: "Tahun harus berupa angka" })
  .int("Tahun harus bilangan bulat")
  .min(PROGRAM_TARGET_YEAR_MIN, `Tahun minimal ${PROGRAM_TARGET_YEAR_MIN}`)
  .max(PROGRAM_TARGET_YEAR_MAX, `Tahun maksimal ${PROGRAM_TARGET_YEAR_MAX}`);

/** Satu sel grid Target Program (#403); `value` null = kosongkan (soft delete). */
export const programTargetCellSchema = z.object({
  indicator: z.enum(PROGRAM_TARGET_INDICATORS),
  periodType: z.enum(["BASELINE", "ANNUAL"]),
  year,
  value: z
    .number({ message: "Target harus berupa angka" })
    .int("Target harus bilangan bulat")
    .min(0, "Target tidak boleh negatif")
    .max(1_000_000, "Target terlalu besar")
    .nullable(),
});

/** Simpan seluruh grid sekaligus. Satu tahun baseline untuk semua baris. */
export const programTargetSaveSchema = z
  .array(programTargetCellSchema)
  .min(1, "Tidak ada perubahan untuk disimpan")
  .max(200)
  .refine(
    (cells) => new Set(cells.filter((c) => c.periodType === "BASELINE" && c.value != null).map((c) => c.year)).size <= 1,
    "Tahun Start of the Program harus sama untuk semua baris"
  )
  .refine(
    (cells) => new Set(cells.map((c) => `${c.indicator}|${c.periodType}|${c.year}`)).size === cells.length,
    "Sel ganda dalam isian"
  );

export type ProgramTargetCellInput = z.infer<typeof programTargetCellSchema>;
