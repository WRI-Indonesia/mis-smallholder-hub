/**
 * Seed HANYA master indikator Monev BMP (#346) — idempoten (upsert by code+level),
 * tanpa `prisma db seed` penuh (yang tidak idempoten pada DB berisi data).
 * Mencetak DB efektif dulu; tidak menulis tanpa `--apply`.
 *   npx dotenv -e .env.<env> -- npx tsx scripts/seed/seed-bmp-indicators.ts [--apply]
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { seedBmpIndicators } from "../../prisma/seeds/seed-bmp-indicators";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL ?? "";
console.log(`DB efektif : ${url.replace(/\/\/([^:]+):[^@]*@/, "//$1:***@")}`);
console.log(`Mode       : ${APPLY ? "APPLY (menulis)" : "DRY-RUN (tidak menulis)"}\n`);

async function main() {
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const existing = await prisma.bmpIndicator.count();
    console.log(`ref_bmp_indicator saat ini: ${existing} baris; CSV: 32 baris (upsert by code+level).`);
    if (!APPLY) {
      console.log("\nDRY-RUN — tidak ada yang ditulis. Jalankan ulang dengan --apply.");
      return;
    }
    await seedBmpIndicators(prisma);
    console.log(`ref_bmp_indicator sesudah: ${await prisma.bmpIndicator.count()} baris`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
