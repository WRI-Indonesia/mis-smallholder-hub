// Rekap hasil run QA (docs/qa/README.md §Skrip).
//
//   node scripts/qa/summary.mjs docs/qa/v0.35.0
//
// Membaca semua runs/*.md (kecuali _template-run.md), menghitung Pass/Fail/
// Blocked/N/A per run & bagian, dan mendaftar baris Fail yang belum menyebut
// nomor issue (#nnn) di kolom catatan. Keluaran markdown siap tempel ke README.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, "runs"))) { console.error("Pakai: node scripts/qa/summary.mjs docs/qa/vX.Y.Z"); process.exit(1); }
const runs = readdirSync(join(dir, "runs")).filter((f) => f.endsWith(".md") && !f.startsWith("_")).sort();
if (runs.length === 0) { console.log("_(belum ada run)_"); process.exit(0); }

const STATUS = ["Pass", "Fail", "Blocked", "N/A"];
const norm = (s) => {
  const t = s.trim().toLowerCase();
  if (["pass", "ok", "✓", "lulus"].includes(t)) return "Pass";
  if (["fail", "✗", "gagal"].includes(t)) return "Fail";
  if (["blocked", "blok", "terhalang"].includes(t)) return "Blocked";
  if (["n/a", "na", "-", "—"].includes(t)) return t === "-" || t === "—" ? "" : "N/A";
  return "";
};

const lines = ["| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |", "|---|---|---:|---:|---:|---:|---:|"];
const openFails = [];
for (const f of runs) {
  const text = readFileSync(join(dir, "runs", f), "utf8");
  let section = "";
  const counts = {};
  for (const line of text.split("\n")) {
    const h = line.match(/^## (Smoke|Kasus uji|Regresi)/);
    if (h) { section = h[1]; counts[section] ??= { Pass: 0, Fail: 0, Blocked: 0, "N/A": 0, kosong: 0 }; continue; }
    if (!section || !line.startsWith("|") || line.startsWith("|---") || line.startsWith("| ID")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    const id = cells[0]; const st = norm(cells[2]); const note = cells.slice(3).join(" ");
    if (!st) { counts[section].kosong++; continue; }
    counts[section][st]++;
    if (st === "Fail" && !/#\d+/.test(note)) openFails.push(`${f} · ${id} — ${note || "(tanpa catatan)"}`);
  }
  for (const [sec, c] of Object.entries(counts)) lines.push(`| ${f} | ${sec} | ${c.Pass} | ${c.Fail} | ${c.Blocked} | ${c["N/A"]} | ${c.kosong} |`);
}
console.log(lines.join("\n"));
if (openFails.length) { console.log(`\n**Fail tanpa nomor issue (${openFails.length}):**`); for (const x of openFails) console.log(`- ${x}`); }
else console.log("\n_Semua Fail sudah merujuk issue._");
