/**
 * Seed HANYA menu + role-permissions, tanpa `prisma db seed` penuh.
 *
 * `db seed` menjalankan seluruh seeder termasuk data master — tidak idempotent
 * dan berbahaya pada DB yang sudah terisi. Skrip ini dipakai saat menu baru
 * perlu didaftarkan ke staging/prod setelah rilis.
 *
 * Menulis DB, jadi mengikuti pakem yang sama dengan dua skrip seed lainnya:
 * mencetak DB efektif lebih dulu dan **tidak menulis apa pun tanpa `--apply`**.
 * Dry-run mencetak DIFF menu (dibuat / diperbarui: kolom lama → baru) supaya
 * perubahan label/order (mis. #352 P4) terlihat sebelum menulis ke prod;
 * RBAC tetap hanya dinyatakan (upsert `update: {}` = tidak mengubah yang ada).
 *
 * Jalankan (dry-run default, tulis dengan --apply):
 *   npx dotenv -e .env -- npx tsx scripts/seed/seed-menu-only.ts
 *   npx dotenv -e .env -- npx tsx scripts/seed/seed-menu-only.ts --apply
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { diffMenuSeed, seedMenu } from "../../prisma/seeds/seed-menu";
import { seedRolePermissions } from "../../prisma/seeds/seed-role-permissions";

const APPLY = process.argv.includes("--apply");

function dbLabel(url: string | undefined): string {
  if (!url) return "(DATABASE_URL kosong)";
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}/${u.pathname.replace("/", "")}`;
  } catch {
    return "(DATABASE_URL tidak valid)";
  }
}

async function main() {
  console.log(`DB efektif : ${dbLabel(process.env.DATABASE_URL)}`);
  console.log(
    `Mode       : ${APPLY ? "APPLY (menulis DB)" : "DRY-RUN (tanpa menulis; tambah --apply untuk menulis)"}\n`
  );

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    if (!APPLY) {
      console.log("Akan meng-upsert seluruh baris menu + role-permission dari");
      console.log("prisma/seeds/data/{menu,role-permissions}.csv ke DB di atas.\n");
      const diff = await diffMenuSeed(prisma);
      console.log(`--- Menu (diff, baca-saja) --- ${diff.create.length} dibuat · ${diff.update.length} diperbarui · ${diff.unchanged} sama`);
      for (const r of diff.create) console.log(`  + ${r.key} — "${r.title}" (${r.parentKey ?? "induk"} · order ${r.order})`);
      for (const u of diff.update) console.log(`  ~ ${u.key}: ${u.changes.join(" · ")}`);
      // `seedRolePermissions` memakai upsert dengan `update: {}`, sehingga baris
      // yang sengaja DIHAPUS admin akan hidup kembali — pemberian akses diam-diam
      // bila skrip ini dijalankan ke prod tanpa disadari.
      console.log("\nCatatan: baris permission yang sebelumnya dihapus admin akan DIPULIHKAN (cek `npm run rbac:compare`).");
      console.log("DRY-RUN selesai. Jalankan ulang dengan --apply untuk menulis.");
      return;
    }

    console.log("--- Menu ---");
    await seedMenu(prisma);

    console.log("\n--- RBAC ---");
    await seedRolePermissions(prisma);

    console.log("\n✅ Menu-only seed completed.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Gagal:", e);
  process.exit(1);
});
