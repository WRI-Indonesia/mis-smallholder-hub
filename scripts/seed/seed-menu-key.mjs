// Seed parsial SATU menu dari CSV seed (#378, pengganti pola skrip per menu):
// baris `<key>` di prisma/seeds/data/menu.csv + semua izinnya di
// prisma/seeds/data/role-permissions.csv. Hanya MENAMBAH yang belum ada — tidak
// menimpa label/urutan/aktif menu yang sudah ada (itu wewenang seed-menu-only /
// Menu Management) dan tidak memulihkan izin yang sengaja dihapus admin.
// Dry-run bawaan; --apply untuk menulis. Jangan pakai full `prisma db seed`.
//   npx dotenv -e .env.<env> -- node scripts/seed/seed-menu-key.mjs <menu-key> [--apply]
import "dotenv/config";
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const KEY = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!KEY) {
  console.error("Pemakaian: node scripts/seed/seed-menu-key.mjs <menu-key> [--apply]");
  process.exit(1);
}

const csv = (f) => parse(readFileSync(`prisma/seeds/data/${f}`, "utf8"), { columns: true, skip_empty_lines: true });
const row = csv("menu.csv").find((r) => r.key === KEY);
if (!row) throw new Error(`Menu "${KEY}" tidak ada di menu.csv`);
const MENU = {
  key: row.key,
  parentKey: row.parent_key || null,
  title: row.title,
  url: row.url,
  icon: row.icon || null,
  order: Number(row.order),
  isActive: row.is_active === "TRUE",
  isVisible: row.is_visible === "TRUE",
};
const PERMS = csv("role-permissions.csv").filter((r) => r.menu_key === KEY);
if (PERMS.length === 0) throw new Error(`Tidak ada izin untuk "${KEY}" di role-permissions.csv`);

const url = process.env.DATABASE_URL ?? "";
console.log(`DB efektif : ${url.replace(/\/\/([^:]+):[^@]*@/, "//$1:***@")}`);
console.log(`Mode       : ${APPLY ? "APPLY (menulis)" : "DRY-RUN (tidak menulis)"}\n`);

const pool = new Pool({ connectionString: url });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  if (MENU.parentKey && !(await prisma.menuItem.findUnique({ where: { key: MENU.parentKey } }))) {
    throw new Error(`Parent menu "${MENU.parentKey}" tidak ditemukan — DB salah?`);
  }
  const existingMenu = await prisma.menuItem.findUnique({ where: { key: MENU.key } });
  console.log(
    existingMenu
      ? `Menu ${MENU.key}: SUDAH ADA — tidak disentuh`
      : `Menu ${MENU.key}: BELUM ADA — akan dibuat ("${MENU.title}", parent ${MENU.parentKey}, order ${MENU.order}, ikon ${MENU.icon})`
  );
  const have = new Set((await prisma.rolePermission.findMany({ where: { menuKey: MENU.key } })).map((p) => `${p.role}:${p.permission}`));
  const missing = PERMS.filter((p) => !have.has(`${p.role}:${p.permission}`));
  console.log(`Permission: CSV ${PERMS.length}, ada ${have.size}, akan dibuat ${missing.length}: ${missing.map((m) => `${m.role}/${m.permission}`).join(", ") || "-"}`);
  if (APPLY) {
    if (!existingMenu) {
      await prisma.menuItem.create({ data: MENU });
      console.log(`\n✓ Menu ${MENU.key} dibuat`);
    }
    for (const m of missing) await prisma.rolePermission.create({ data: { role: m.role, menuKey: MENU.key, permission: m.permission } });
    if (missing.length) console.log(`✓ ${missing.length} permission dibuat`);
  } else {
    console.log("\nDRY-RUN — tidak ada yang ditulis. Jalankan ulang dengan --apply.");
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
