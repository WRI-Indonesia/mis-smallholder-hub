/**
 * Blok dokumen turunan kode (keputusan docs/decisions/0007): fakta yang bisa
 * dihitung dari repo — enum, menu, angka ringkasan — tidak ditulis tangan di
 * `docs/`, melainkan di-generate ke antara penanda
 *
 *   <!-- GENERATED:<id> — npm run build:docs; jangan sunting tangan -->
 *   ...
 *   <!-- /GENERATED:<id> -->
 *
 * `scripts/build-docs.ts` menulis blok; `src/test/docs-generated.test.ts`
 * membandingkan isi berkas dengan `renderBlocks()` — basi = test gagal.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { scanSchema } from "./schema-scan";

export type DocBlock = { id: string; file: string; body: string };

type MenuRow = { key: string; parent_key: string; title: string; url: string; order: string };

const countFiles = (dir: string, pred: (name: string) => boolean): number =>
  readdirSync(dir).reduce((n, name) => {
    const p = join(dir, name);
    return n + (statSync(p).isDirectory() ? countFiles(p, pred) : pred(name) ? 1 : 0);
  }, 0);

function readMenus(root: string): MenuRow[] {
  return parse(readFileSync(join(root, "prisma/seeds/data/menu.csv"), "utf8"), { columns: true, skip_empty_lines: true }) as MenuRow[];
}

const schemaFile = (root: string, domain: string) =>
  existsSync(join(root, "prisma/schema", `_${domain}.prisma`)) ? `_${domain}.prisma` : `${domain}.prisma`;

function enumsBlock(root: string): string {
  const { enums } = scanSchema(root);
  const rows = enums.map((e) => `| \`${e.name}\` | ${e.values.join(" · ")} | \`${schemaFile(root, e.domain)}\` |`);
  return [`${enums.length} enum di \`prisma/schema/\`.`, "", "| Enum | Nilai | Berkas |", "|---|---|---|", ...rows].join("\n");
}

function menuTopBlock(root: string): string {
  const menus = readMenus(root);
  const top = menus.filter((m) => !m.parent_key).sort((a, b) => Number(a.order) - Number(b.order));
  const rows = top.map((m) => {
    const children = menus.filter((c) => c.parent_key === m.key).length;
    const folder = m.url.replace(/^\/admin\//, "");
    const doc = existsSync(join(root, "docs/product/pages", folder, "README.md")) ? `[${folder}/](./${folder}/README.md)` : "—";
    const sub = m.key === "help" ? "— (tree bab/topik)" : String(children);
    return `| ${m.order} | ${m.title} | \`${m.key}\` | \`${m.url}\` | ${sub} | ${doc} |`;
  });
  return ["| Order | Menu | Key | URL | Sub menu | Dokumen |", "|---|------|-----|-----|----------|---------|", ...rows].join("\n");
}

function menuCounts(root: string) {
  const menus = readMenus(root);
  const topKeys = new Set(menus.filter((m) => !m.parent_key).map((m) => m.key));
  const sub = menus.filter((m) => m.parent_key && topKeys.has(m.parent_key));
  const level3 = menus.filter((m) => m.parent_key && !topKeys.has(m.parent_key));
  return { menus, top: topKeys.size, sub: sub.length, level3: level3.length };
}

function menuSummaryBlock(root: string): string {
  const { menus, top, sub, level3 } = menuCounts(root);
  const lines = menus
    .filter((m) => !m.parent_key)
    .sort((a, b) => Number(a.order) - Number(b.order))
    .map((m) => {
      const children = menus.filter((c) => c.parent_key === m.key);
      const grand = menus.filter((c) => children.some((ch) => ch.key === c.parent_key));
      const extra = grand.length ? ` + ${grand.map((g) => g.title).join(", ")} (level 3)` : "";
      return `- **${m.title}** (\`${m.key}\`, order ${m.order}) — ${children.length ? `${children.length} sub menu${extra}` : "tanpa sub menu"}`;
    });
  return [`**${top} menu top-level · ${sub} sub menu · ${level3} menu level-3** (\`prisma/seeds/data/menu.csv\`, urut kolom \`order\`):`, "", ...lines].join("\n");
}

function techSummaryBlock(root: string): string {
  const schema = scanSchema(root);
  const { top, sub, level3 } = menuCounts(root);
  const migrations = readdirSync(join(root, "prisma/migrations")).filter((d) => statSync(join(root, "prisma/migrations", d)).isDirectory());
  const schemaFiles = readdirSync(join(root, "prisma/schema")).filter((f) => f.endsWith(".prisma")).length;
  const actions = readdirSync(join(root, "src/server/actions")).filter((f) => /\.tsx?$/.test(f)).length;
  const tests = countFiles(join(root, "src/test"), (n) => /\.test\.tsx?$/.test(n));
  const help = countFiles(join(root, "src/content/help"), (n) => n.endsWith(".md"));
  return [
    "| Aspek | Angka | Sumber |",
    "|---|---|---|",
    `| Berkas test | **${tests}** | \`src/test/**/*.test.ts(x)\` — jumlah kasus uji per rilis di [metrics.md](../project/metrics.md) |`,
    `| Server Actions | **${actions} berkas** | \`src/server/actions/\` — satu berkas per domain, seluruh akses data lewat sini |`,
    `| Prisma | **${schemaFiles} berkas skema · ${schema.entities.length} model · ${schema.enums.length} enum · ${migrations.length} migrasi** | \`prisma/schema/\`, \`prisma/migrations/\` |`,
    `| Menu | **${top} top-level · ${sub} sub menu · ${level3} level-3** | \`prisma/seeds/data/menu.csv\` |`,
    `| Materi Bantuan | **${help} berkas Markdown** | \`src/content/help/**\` |`,
  ].join("\n");
}

export function renderBlocks(root: string = process.cwd()): DocBlock[] {
  return [
    { id: "enums", file: "docs/database/models.md", body: enumsBlock(root) },
    { id: "menu-top", file: "docs/product/pages/README.md", body: menuTopBlock(root) },
    { id: "menu-summary", file: "docs/product/navigation.md", body: menuSummaryBlock(root) },
    { id: "tech-summary", file: "docs/standards/architecture.md", body: techSummaryBlock(root) },
  ];
}

const open = (id: string) => `<!-- GENERATED:${id} — npm run build:docs; jangan sunting tangan -->`;
const close = (id: string) => `<!-- /GENERATED:${id} -->`;

/** Isi blok `id` di teks berkas, atau null bila penandanya tidak ada. */
export function extractBlock(text: string, id: string): string | null {
  const start = text.indexOf(open(id));
  const end = text.indexOf(close(id));
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start + open(id).length, end).trim();
}

/** Ganti isi blok `id`; melempar bila penanda tidak ada (blok wajib dipasang tangan sekali). */
export function replaceBlock(text: string, id: string, body: string): string {
  const start = text.indexOf(open(id));
  const end = text.indexOf(close(id));
  if (start === -1 || end === -1 || end < start) throw new Error(`docs-gen: penanda GENERATED:${id} tidak ditemukan`);
  return `${text.slice(0, start)}${open(id)}\n${body}\n${text.slice(end)}`;
}
