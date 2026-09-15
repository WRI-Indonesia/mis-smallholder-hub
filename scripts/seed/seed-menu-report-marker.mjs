// Seed parsial #331: HANYA menu `report-marker` (Report › Patok) + role-permission
// mengikuti prisma/seeds/data/role-permissions.csv (ADMIN: CREATE/EDIT/EXPORT/PRINT/VIEW;
// OPERATOR/MANAGEMENT/SUPERADMIN: EXPORT/PRINT/VIEW; DONOR: PRINT/VIEW).
// Dry-run default; --apply untuk menulis. Jangan pakai full `prisma db seed`
// (DB berisi data, seed lain tidak idempotent).
//   npx dotenv -e .env.<env> -- node scripts/seed/seed-menu-report-marker.mjs [--apply]
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL ?? "";
console.log(`DB efektif : ${url.replace(/\/\/([^:]+):[^@]*@/, "//$1:***@")}`);
console.log(`Mode       : ${APPLY ? "APPLY (menulis)" : "DRY-RUN (tidak menulis)"}\n`);

const MENU = { key: "report-marker", parentKey: "report", title: "Patok", url: "/admin/report/marker", icon: "Milestone", order: 7, isActive: true, isVisible: true };
const PERMS = {
  ADMIN: ["CREATE", "EDIT", "EXPORT", "PRINT", "VIEW"],
  OPERATOR: ["EXPORT", "PRINT", "VIEW"],
  MANAGEMENT: ["EXPORT", "PRINT", "VIEW"],
  SUPERADMIN: ["EXPORT", "PRINT", "VIEW"],
  DONOR: ["PRINT", "VIEW"],
};

const pool = new Pool({ connectionString: url });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  const parent = await prisma.menuItem.findUnique({ where: { key: MENU.parentKey } });
  if (!parent) throw new Error(`Parent menu "${MENU.parentKey}" tidak ditemukan — DB salah?`);
  const existingMenu = await prisma.menuItem.findUnique({ where: { key: MENU.key } });
  // Ikon disinkronkan bila berbeda (mis. Landmark → Milestone, revisi owner 2026-09-15); kolom lain tak disentuh.
  const iconDiff = existingMenu && existingMenu.icon !== MENU.icon;
  console.log(existingMenu ? `Menu ${MENU.key}: SUDAH ADA — ${iconDiff ? `ikon ${existingMenu.icon} → ${MENU.icon}` : "skip"}` : `Menu ${MENU.key}: BELUM ADA — akan dibuat (parent ${MENU.parentKey}, order ${MENU.order}, ikon ${MENU.icon})`);
  const existing = await prisma.rolePermission.findMany({ where: { menuKey: MENU.key } });
  const have = new Set(existing.map((p) => `${p.role}:${p.permission}`));
  const missing = [];
  for (const [role, perms] of Object.entries(PERMS)) for (const permission of perms) if (!have.has(`${role}:${permission}`)) missing.push({ role, permission });
  console.log(`Permission: ada ${existing.length}, akan dibuat ${missing.length}: ${missing.map((m) => `${m.role}/${m.permission}`).join(", ") || "-"}`);
  if (APPLY) {
    if (!existingMenu) { await prisma.menuItem.create({ data: MENU }); console.log(`\n✓ Menu ${MENU.key} dibuat`); }
    else if (iconDiff) { await prisma.menuItem.update({ where: { key: MENU.key }, data: { icon: MENU.icon } }); console.log(`\n✓ Ikon ${MENU.key} → ${MENU.icon}`); }
    for (const m of missing) await prisma.rolePermission.create({ data: { role: m.role, menuKey: MENU.key, permission: m.permission } });
    if (missing.length) console.log(`✓ ${missing.length} permission dibuat`);
  } else {
    console.log("\nDRY-RUN — tidak ada yang ditulis. Jalankan ulang dengan --apply.");
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
