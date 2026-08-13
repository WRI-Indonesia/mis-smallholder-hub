/**
 * Menulis ulang `prisma/seeds/data/role-permissions.csv` dari izin AKTIF di
 * database (#263). READ-ONLY terhadap database — yang ditulis hanya berkas seed.
 *
 * Kenapa ada: izin di produksi disesuaikan lewat UI Role & Permission, dan
 * sampai #263 tidak ada jalan pulang ke repo — selisihnya sempat 115 baris.
 * `npm run rbac:compare` menunjukkan selisihnya; perkakas ini menutupnya ke arah
 * "produksi sebagai acuan", arah yang sama dengan keputusan penempatan menu di
 * #256.
 *
 * **Pakai dengan sadar.** Ini menyalin keadaan apa adanya, termasuk baris yang
 * sebenarnya tidak berpengaruh (duplikat pewarisan induk, atau izin yang tak
 * pernah diperiksa kode — sisa preset "Akses penuh" #245). Setelah menjalankan
 * ini, `npm test` wajib hijau: `src/test/menu-access.test.ts` menegakkan
 * Inventaris Role, jadi ia akan menolak bila keadaan produksi melanggar
 * spesifikasi peran.
 *
 * Jalankan:  npm run rbac:export           (dry-run — hanya melihat selisih)
 *            npm run rbac:export -- --apply
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const OUT = join("prisma", "seeds", "data", "role-permissions.csv");
const HEADER = "role,menu_key,permission";

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL ?? "";
  const host = /@([^/]+)\/([^?]+)/.exec(url);
  console.log(`Sumber : ${host ? `${host[1]}/${host[2]}` : "(tidak terbaca)"}`);
  console.log(`Mode   : ${apply ? "APPLY (menulis berkas seed)" : "DRY-RUN"}\n`);

  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const rows = await prisma.rolePermission.findMany({
      where: { isActive: true },
      select: { role: true, menuKey: true, permission: true },
    });

    // Urutan deterministik supaya diff antar-ekspor bermakna.
    const baris = rows
      .map((r) => `${r.role},${r.menuKey},${r.permission}`)
      .sort((a, b) => a.localeCompare(b));

    const lama = readFileSync(OUT, "utf-8").trim().split("\n").slice(1);
    const setLama = new Set(lama);
    const setBaru = new Set(baris);
    const ditambah = baris.filter((b) => !setLama.has(b));
    const dihapus = lama.filter((l) => !setBaru.has(l));

    console.log(`Seed sekarang : ${lama.length} baris`);
    console.log(`Dari database : ${baris.length} baris`);
    console.log(`  + ${ditambah.length} ditambahkan`);
    console.log(`  − ${dihapus.length} dihapus`);

    if (!apply) {
      for (const x of ditambah.slice(0, 15)) console.log("  +", x);
      if (ditambah.length > 15) console.log(`  … ${ditambah.length - 15} lagi`);
      for (const x of dihapus.slice(0, 15)) console.log("  −", x);
      if (dihapus.length > 15) console.log(`  … ${dihapus.length - 15} lagi`);
      console.log("\nDRY-RUN selesai. Jalankan ulang dengan --apply, lalu WAJIB `npm test`.");
      return;
    }

    writeFileSync(OUT, [HEADER, ...baris].join("\n") + "\n");
    console.log(`\n${OUT} ditulis ulang. Jalankan \`npm test\` — menu-access.test.ts menegakkan Inventaris Role.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
