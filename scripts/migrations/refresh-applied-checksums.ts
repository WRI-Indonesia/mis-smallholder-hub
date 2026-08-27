/**
 * Segarkan `prisma/migrations/applied-checksums.json` dari `_prisma_migrations`
 * DB target (#303). HANYA SELECT — tidak menulis apa pun ke DB.
 *
 * Pakai:  npx dotenv -e .env.prod -- npx tsx scripts/migrations/refresh-applied-checksums.ts
 *
 * Daftar ini adalah snapshot migrasi yang SUDAH diterapkan di prod; test
 * `src/test/migration-guards.test.ts` membandingkan sha256 file lokal dengan
 * daftar ini sehingga pengeditan file migrasi lama langsung merah di gate
 * (akar #270). Jalankan ulang setelah setiap `migrate deploy` ke prod.
 */
import { Client } from "pg";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "prisma", "migrations", "applied-checksums.json");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL kosong — jalankan lewat `npx dotenv -e .env.prod --`");
  const safe = url.replace(/(:\/\/[^:]+:)[^@]+@/, "$1***@");
  console.log(`DB efektif: ${safe}`);

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ migration_name: string; checksum: string }>(
      `SELECT migration_name, checksum
         FROM _prisma_migrations
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
        ORDER BY migration_name`,
    );
    const checksums: Record<string, string> = {};
    for (const r of rows) checksums[r.migration_name] = r.checksum;
    const payload = {
      _comment:
        "Snapshot checksum migrasi yang sudah APPLIED di mis-prod (#303). Jangan edit manual — " +
        "segarkan dengan scripts/migrations/refresh-applied-checksums.ts setelah setiap migrate deploy.",
      source: "mis-prod",
      refreshedAt: new Date().toISOString().slice(0, 10),
      checksums,
    };
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
    console.log(`${rows.length} migrasi applied → ${OUT}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
