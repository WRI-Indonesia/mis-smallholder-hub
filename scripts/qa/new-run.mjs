// Buat lembar run QA dari spesifikasi (docs/qa/README.md §Skrip).
//
//   node scripts/qa/new-run.mjs --version v0.35.0 --env staging
//   node scripts/qa/new-run.mjs --version v0.35.0 --env prod --only P0
//   node scripts/qa/new-run.mjs --version v0.35.0 --env staging --label ulang --only TC-328-04,TC-331-07,SM-13
//
// Membaca blok `### <ID> · <judul> [P0] [regresi] (n mnt)` dari 00-scope (TC-PREP),
// 01-smoke (SM-nn), 02-test-cases (TC-*), dan docs/qa/regression.md; menulis
// runs/<tanggal>-<env>[-label].md dari runs/_template-run.md dengan baris kosong
// untuk diisi tester. Tidak menimpa berkas yang sudah ada.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const version = opt("--version");
const env = opt("--env");
const only = opt("--only");
const label = opt("--label");
if (!version || !env) { console.error("Pakai: --version vX.Y.Z --env staging|prod [--only P0|ID,ID] [--label ulang]"); process.exit(1); }

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = join(root, "docs", "qa", version);
if (!existsSync(dir)) { console.error(`Folder tidak ada: ${dir}`); process.exit(1); }

const HEAD = /^### (SM-\d+|TC-[A-Z0-9]+-\d+) · (.+?)((?:\s\[[^\]]+\])*)\s*(?:\((\d+) mnt\))?\s*$/;
function parse(file, section) {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").map((l) => l.match(HEAD)).filter(Boolean).map((m) => ({
    id: m[1], title: m[2].trim(), tags: [...m[3].matchAll(/\[([^\]]+)\]/g)].map((t) => t[1]), minutes: Number(m[4] ?? 0), section,
  }));
}
const items = [
  ...parse(join(dir, "01-smoke.md"), "smoke"),
  ...parse(join(dir, "00-scope.md"), "case"),
  ...parse(join(dir, "02-test-cases.md"), "case"),
  ...parse(join(root, "docs", "qa", "regression.md"), "regresi"),
];
const seen = new Set();
const selected = items.filter((it) => {
  if (seen.has(it.id)) return false;
  seen.add(it.id);
  if (!only) return true;
  if (/^P[0-2]$/i.test(only)) return it.tags.some((t) => t.toUpperCase() === only.toUpperCase());
  return only.split(",").map((s) => s.trim()).includes(it.id);
});
if (selected.length === 0) { console.error("Tidak ada kasus terpilih — cek --only atau format judul blok."); process.exit(1); }

const date = new Date().toISOString().slice(0, 10);
const name = `${date}-${env}${label ? `-${label}` : ""}.md`;
const outFile = join(dir, "runs", name);
if (existsSync(outFile)) { console.error(`Sudah ada: ${outFile} — pakai --label lain.`); process.exit(1); }
mkdirSync(join(dir, "runs"), { recursive: true });

const tpl = readFileSync(join(root, "docs", "qa", "_template", "runs", "_template-run.md"), "utf8")
  .replaceAll("vX.Y.Z", version).replaceAll("<env>", env).replace("<YYYY-MM-DD>", date).replace("[ · <label>]", label ? ` · ${label}` : "")
  .replace("`penuh / P0 / ulang: TC-…`", `\`${only ? (/^P[0-2]$/i.test(only) ? only.toUpperCase() : `ulang: ${only}`) : "penuh"}\``);
const tagStr = (it) => it.tags.map((t) => `[${t}]`).join(" ");
const row = (it) => it.section === "smoke"
  ? `| ${it.id} | ${it.title} ${tagStr(it)} |  |  |  |`
  : `| ${it.id} | ${it.title} ${tagStr(it)} |  |  |`;
const fill = (text, heading, rows) => text.replace(new RegExp(`(## ${heading}\\n\\n\\|[^\\n]*\\n\\|[-|]*\\n)`), `$1${rows.join("\n")}${rows.length ? "\n" : ""}`);
let out = tpl;
out = fill(out, "Smoke", selected.filter((i) => i.section === "smoke").map(row));
out = fill(out, "Kasus uji", selected.filter((i) => i.section === "case").map(row));
out = fill(out, "Regresi", selected.filter((i) => i.section === "regresi").map(row));
writeFileSync(outFile, out);

const total = selected.reduce((s, i) => s + i.minutes, 0);
const by = (s) => selected.filter((i) => i.section === s).length;
console.log(`✓ ${outFile}`);
console.log(`  smoke ${by("smoke")} · kasus ${by("case")} · regresi ${by("regresi")} · perkiraan ${total} menit`);
