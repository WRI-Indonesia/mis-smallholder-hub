import { PrismaClient, BmpIndicatorLevel } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Master indikator Monev BMP (#346) — 32 baris dari `data/bmp-indicators.csv`
 * (dibangkitkan dari sheet Panduan form survei; tanpa PII). Upsert by
 * (code, level) sehingga idempoten dan aman dijalankan ulang di DB berisi data;
 * kolom rubrik/bobot ikut diperbarui, `is_active` tidak disentuh.
 */
export async function seedBmpIndicators(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/bmp-indicators.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true }) as Record<string, string>[];

  for (const row of records) {
    const level = row.level as BmpIndicatorLevel;
    const data = {
      activityCode: row.activity_code,
      activityName: row.activity_name,
      activityWeight: Number(row.activity_weight),
      criteriaCode: row.criteria_code,
      criteriaName: row.criteria_name,
      seq: Number(row.seq),
      name: row.name,
      weight: row.weight ? Number(row.weight) : null,
      inFinalScore: row.in_final_score === "TRUE",
      scoreLabel0: row.score_label_0 || null,
      scoreLabel1: row.score_label_1 || null,
      scoreLabel2: row.score_label_2 || null,
      scoreLabel3: row.score_label_3 || null,
      sortOrder: Number(row.sort_order),
    };
    await prisma.bmpIndicator.upsert({
      where: { code_level: { code: row.code, level } },
      update: data,
      create: { code: row.code, level, ...data },
    });
  }

  console.log(`  ✓ BMP indicators: ${records.length} records`);
}
