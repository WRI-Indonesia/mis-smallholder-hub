// Seed parsial #344: HANYA dua menu Monev BMP + role-permission mengikuti
// prisma/seeds/data/role-permissions.csv (cermin Pelatihan: ADMIN tanpa DELETE;
// DONOR hanya VIEW/PRINT dashboard). Juga menggeser `order` Dashboard Pelatihan
// 3→4 dan Risk Management 4→5 agar Monev BMP (order 3) tepat di bawah BMP
// Dashboard (Produksi) — seed-menu.ts memakai upsert `update: {}` sehingga
// order baris yang sudah ada tidak ikut berubah.
// Dry-run default; --apply untuk menulis. Jangan pakai full `prisma db seed`.
//   npx dotenv -e .env.<env> -- node scripts/seed/seed-menu-bmp-monev.mjs [--apply]
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL ?? "";
console.log(`DB efektif : ${url.replace(/\/\/([^:]+):[^@]*@/, "//$1:***@")}`);
console.log(`Mode       : ${APPLY ? "APPLY (menulis)" : "DRY-RUN (tidak menulis)"}\n`);

const MENUS = [
  { key: "master-data-bmp-monev", parentKey: "master-data", title: "Monev BMP", url: "/admin/master-data/bmp-monev", icon: "ClipboardCheck", order: 6, isActive: true, isVisible: true },
  { key: "dashboard-bmp-monev", parentKey: "dashboard", title: "Monev BMP", url: "/admin/dashboard/bmp-monev", icon: "ClipboardCheck", order: 3, isActive: true, isVisible: true },
];
const REORDER = [
  { key: "dashboard-training", order: 4 },
  { key: "dashboard-risk", order: 5 },
];
const PERMS = {
  "master-data-bmp-monev": {
    SUPERADMIN: ["CREATE", "DELETE", "EDIT", "EXPORT", "PRINT", "VIEW"],
    ADMIN: ["CREATE", "EDIT", "EXPORT", "PRINT", "VIEW"],
    OPERATOR: ["EXPORT", "PRINT", "VIEW"],
    MANAGEMENT: ["EXPORT", "PRINT", "VIEW"],
  },
  "dashboard-bmp-monev": {
    SUPERADMIN: ["EXPORT", "PRINT", "VIEW"],
    ADMIN: ["CREATE", "EDIT", "EXPORT", "PRINT", "VIEW"],
    OPERATOR: ["EXPORT", "PRINT", "VIEW"],
    MANAGEMENT: ["EXPORT", "PRINT", "VIEW"],
    DONOR: ["PRINT", "VIEW"],
  },
};

const pool = new Pool({ connectionString: url });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  for (const menu of MENUS) {
    const parent = await prisma.menuItem.findUnique({ where: { key: menu.parentKey } });
    if (!parent) throw new Error(`Parent menu "${menu.parentKey}" tidak ditemukan — DB salah?`);
    const existingMenu = await prisma.menuItem.findUnique({ where: { key: menu.key } });
    console.log(existingMenu ? `Menu ${menu.key}: SUDAH ADA — skip` : `Menu ${menu.key}: BELUM ADA — akan dibuat (parent ${menu.parentKey}, order ${menu.order}, ikon ${menu.icon})`);
    const existing = await prisma.rolePermission.findMany({ where: { menuKey: menu.key } });
    const have = new Set(existing.map((p) => `${p.role}:${p.permission}`));
    const missing = [];
    for (const [role, perms] of Object.entries(PERMS[menu.key])) for (const permission of perms) if (!have.has(`${role}:${permission}`)) missing.push({ role, permission });
    console.log(`  Permission: ada ${existing.length}, akan dibuat ${missing.length}: ${missing.map((m) => `${m.role}/${m.permission}`).join(", ") || "-"}`);
    if (APPLY) {
      if (!existingMenu) { await prisma.menuItem.create({ data: menu }); console.log(`  ✓ Menu ${menu.key} dibuat`); }
      for (const m of missing) await prisma.rolePermission.create({ data: { role: m.role, menuKey: menu.key, permission: m.permission } });
      if (missing.length) console.log(`  ✓ ${missing.length} permission dibuat`);
    }
  }
  for (const r of REORDER) {
    const row = await prisma.menuItem.findUnique({ where: { key: r.key } });
    if (!row) { console.log(`Reorder ${r.key}: TIDAK ADA — skip`); continue; }
    if (row.order === r.order) { console.log(`Reorder ${r.key}: sudah ${r.order} — skip`); continue; }
    console.log(`Reorder ${r.key}: ${row.order} → ${r.order}`);
    if (APPLY) await prisma.menuItem.update({ where: { key: r.key }, data: { order: r.order } });
  }
  if (!APPLY) console.log("\nDRY-RUN — tidak ada yang ditulis. Jalankan ulang dengan --apply.");
} finally {
  await prisma.$disconnect();
  await pool.end();
}
