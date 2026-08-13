/**
 * Pembanding izin menu: seed repo vs database (#263). READ-ONLY — tidak pernah
 * menulis apa pun.
 *
 * Kenapa perlu: izin di produksi disesuaikan lewat UI Role & Permission, dan
 * penyesuaian itu tidak punya jalan pulang ke `prisma/seeds/data/*.csv`. Akibatnya
 * database yang di-seed dari repo lama-lama menguji aturan akses yang berbeda
 * dari yang sebenarnya berlaku — dan analisis yang dibaca dari salah satu sisi
 * saja bisa menyimpulkan hal yang salah dengan meyakinkan (lihat #262).
 *
 * `src/test/menu-access.test.ts` menjaga sisi kode (izin efektif hasil kaskade
 * dari CSV). Jarak ke produksi tidak bisa dijadikan unit test karena butuh
 * koneksi database, jadi bentuknya skrip ini — dijalankan saat rilis.
 *
 * Jalankan:  npm run rbac:compare
 *            npm run rbac:compare -- --menu
 *
 * Sengaja ditaruh di `scripts/` (ter-track), bukan `scripts/local/` yang
 * di-gitignore: ia dimaksudkan sebagai gerbang bersama saat rilis, bukan
 * perkakas pribadi satu mesin.
 *
 * Keluar dengan kode 1 bila ada selisih, supaya bisa dipakai sebagai gerbang.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const SEED_DIR = join("prisma", "seeds", "data");

const bacaCsv = (file: string) =>
  readFileSync(join(SEED_DIR, file), "utf-8").trim().split("\n").slice(1);

type Selisih = { hanyaSeed: string[]; hanyaDb: string[] };

function bandingkan(seed: string[], db: string[]): Selisih {
  const setSeed = new Set(seed);
  const setDb = new Set(db);
  return {
    hanyaSeed: [...setSeed].filter((x) => !setDb.has(x)).sort(),
    hanyaDb: [...setDb].filter((x) => !setSeed.has(x)).sort(),
  };
}

/** Kelompokkan baris `ROLE|menuKey|PERMISSION` per peran, lalu per jenis izin. */
function ringkas(baris: string[]) {
  const perPeran = new Map<string, Map<string, string[]>>();
  for (const b of baris) {
    const [role, menuKey, permission] = b.split("|");
    const perIzin = perPeran.get(role) ?? new Map<string, string[]>();
    const daftar = perIzin.get(permission) ?? [];
    daftar.push(menuKey);
    perIzin.set(permission, daftar);
    perPeran.set(role, perIzin);
  }
  return perPeran;
}

function cetak(judul: string, baris: string[]) {
  console.log(`\n${judul}: ${baris.length} baris`);
  if (baris.length === 0) return;
  for (const [role, perIzin] of [...ringkas(baris).entries()].sort()) {
    for (const [permission, menus] of [...perIzin.entries()].sort()) {
      console.log(`  ${role.padEnd(11)} ${permission.padEnd(7)} ${menus.sort().join(", ")}`);
    }
  }
}

async function main() {
  const bandingMenu = process.argv.includes("--menu");

  const url = process.env.DATABASE_URL ?? "";
  const host = /@([^/]+)\/([^?]+)/.exec(url);
  console.log(`DB dibandingkan : ${host ? `${host[1]}/${host[2]}` : "(tidak terbaca)"}`);
  console.log("Mode            : READ-ONLY\n");

  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const seedPerm = bacaCsv("role-permissions.csv").map((l) => {
      const [role, menuKey, permission] = l.split(",");
      return `${role}|${menuKey}|${permission}`;
    });
    const dbPerm = (
      await prisma.rolePermission.findMany({
        where: { isActive: true },
        select: { role: true, menuKey: true, permission: true },
      })
    ).map((r) => `${r.role}|${r.menuKey}|${r.permission}`);

    const perm = bandingkan(seedPerm, dbPerm);
    console.log(`RolePermission — seed ${seedPerm.length} baris · DB ${dbPerm.length} baris`);
    cetak("HANYA DI SEED (DB baru dapat izin yang produksi tidak punya)", perm.hanyaSeed);
    cetak("HANYA DI DB (produksi punya, DB baru tidak akan punya)", perm.hanyaDb);

    let menuSelisih = 0;
    if (bandingMenu) {
      const seedMenu = bacaCsv("menu.csv").map((l) => {
        const [key, parentKey, title, url2, icon, order] = l.split(",");
        return `${key}|${parentKey}|${title}|${url2}|${icon}|${order}`;
      });
      const dbMenu = (
        await prisma.menuItem.findMany({
          where: { isActive: true },
          select: { key: true, parentKey: true, title: true, url: true, icon: true, order: true },
        })
      ).map((m) => `${m.key}|${m.parentKey ?? ""}|${m.title}|${m.url ?? ""}|${m.icon ?? ""}|${m.order}`);

      const menu = bandingkan(seedMenu, dbMenu);
      menuSelisih = menu.hanyaSeed.length + menu.hanyaDb.length;
      console.log(`\n\nMenuItem — seed ${seedMenu.length} baris · DB ${dbMenu.length} baris`);
      console.log(`\nHANYA DI SEED: ${menu.hanyaSeed.length}`);
      for (const x of menu.hanyaSeed) console.log("  +", x);
      console.log(`\nHANYA DI DB: ${menu.hanyaDb.length}`);
      for (const x of menu.hanyaDb) console.log("  -", x);
    }

    const total = perm.hanyaSeed.length + perm.hanyaDb.length + menuSelisih;
    console.log(`\n${"—".repeat(60)}`);
    console.log(total === 0 ? "SELARAS — tidak ada selisih." : `SELISIH: ${total} baris.`);
    if (total > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
