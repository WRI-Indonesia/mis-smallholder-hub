/**
 * Pemindai jalur data menu → entitas Prisma (#256).
 *
 * Rantainya: `requirePermission("<menuKey>")` pada page.tsx menandai rute →
 * import berkas rute ditelusuri ke dalam `src/` → tiap fungsi yang memanggil
 * `prisma.<model>.<op>` / `tx.<model>.<op>` menyumbang entitas + jenis akses.
 *
 * Dua keputusan yang menentukan ketelitiannya:
 *
 * 1. **Penelusuran per FUNGSI, bukan per berkas.** Satu berkas action memuat
 *    banyak fungsi (`farmer.ts` punya baca dan tulis); kalau granularitasnya
 *    berkas, halaman yang cuma memanggil satu getter akan tercatat "menulis".
 *    Yang ditelusuri adalah simbol yang benar-benar diimpor, lalu fungsi lokal
 *    yang dipanggilnya. Seragamnya bentuk `export async function` di 146 action
 *    membuat ini bisa diandalkan tanpa AST penuh.
 * 2. **Modul infrastruktur dikeluarkan dari atribusi per menu.** `rbac.ts`,
 *    `auth.ts`, dan `access-context.ts` dilewati SETIAP menu (guard + scope
 *    akses), jadi mencantumkan `menuItem`/`rolePermission`/`user` di semua baris
 *    hanya menenggelamkan sinyalnya. Entitas itu dikumpulkan terpisah sebagai
 *    `infraModels` dan dijelaskan sekali di UI.
 *
 * Kenapa memindai kode, bukan mencatat manual: ada ratusan pemanggilan Prisma di
 * 29 berkas action; daftar tangan pasti ketinggalan. Kenapa `requirePermission`
 * sebagai kunci menu, bukan tabel `MenuItem`: pemindaian harus jalan tanpa
 * database — isi DB berbeda antar environment, sedangkan guard ada di kode.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { LineageAccess, LineageEntry, LineageScanResult } from "../src/types/data-lineage";

const APP_ROOT = join("src", "app", "(admin)", "admin");
const SRC_ROOT = "src";

/**
 * Modul yang dilewati setiap menu — dicatat terpisah, tidak diatribusikan.
 * `prisma.ts` hanya membuat client (tanpa kueri) dan ikut agar telusur berhenti.
 */
const INFRA_MODULES = [
  join("src", "lib", "rbac.ts"),
  join("src", "lib", "auth.ts"),
  join("src", "lib", "access-context.ts"),
  join("src", "lib", "prisma.ts"),
].map((p) => p.split("\\").join("/"));

/** Operasi Prisma → jenis akses. Daftar tertutup: operasi asing tidak terhitung. */
const READ_OPS = [
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
] as const;
const WRITE_OPS = ["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"] as const;

/** `prisma.farmer.findMany` maupun `tx.farmer.create` (di dalam $transaction). */
const CALL_RE = new RegExp(
  String.raw`\b(?:prisma|tx)\.([a-z][a-zA-Z0-9]*)\.(${[...READ_OPS, ...WRITE_OPS].join("|")})\b`,
  "g"
);
/** Pemanggilan identifier apa pun — dipakai menelusuri helper lokal & simbol impor. */
const IDENT_CALL_RE = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
const IMPORT_RE = /import\s+(type\s+)?(?:\{([\s\S]*?)\}|(\w+)|\*\s+as\s+(\w+))\s+from\s+"([^"]+)"/g;
const FUNCTION_RE = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[(<]/g;
const GUARD_RE = /requirePermission\(\s*"([a-z0-9-]+)"/;

const posix = (path: string) => path.split("\\").join("/");

const fileCache = new Map<string, string>();
const read = (path: string): string => {
  let text = fileCache.get(path);
  if (text === undefined) {
    text = readFileSync(path, "utf-8");
    fileCache.set(path, text);
  }
  return text;
};

const isSource = (name: string) => name.endsWith(".ts") || name.endsWith(".tsx");

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...listFiles(path));
    else if (isSource(name)) out.push(path);
  }
  return out;
}

/** `@/lib/x` atau `./y` → path berkas nyata di dalam `src/`; null bila di luar. */
function resolveImport(spec: string, fromFile: string, root: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(root, SRC_ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(join(root, fromFile)), spec);
  else return null; // paket node_modules — tidak ditelusuri

  if (!resolve(base).startsWith(resolve(root, SRC_ROOT))) return null;

  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return posix(relative(root, candidate));
  }
  return null;
}

type Unit = {
  /** Entitas yang disentuh langsung di dalam unit ini. */
  models: Record<string, LineageAccess>;
  /** Identifier yang dipanggil — dicocokkan ke fungsi lokal atau simbol impor. */
  calls: Set<string>;
};

type ModuleFacts = {
  /** Fungsi top-level (termasuk helper non-export, yang dipanggil dari export). */
  functions: Map<string, Unit>;
  /** Kode di luar fungsi (konstanta modul) — selalu ikut bila modul disentuh. */
  moduleLevel: Unit;
  /** Nama simbol impor → berkas asalnya. */
  importedFrom: Map<string, string>;
  /** Berkas yang diimpor tanpa nama simbol jelas (default / namespace / rute). */
  wildcard: string[];
};

const merge = (previous: LineageAccess | undefined, next: LineageAccess): LineageAccess =>
  previous === undefined || previous === next ? next : "RW";

function collectUnit(text: string): Unit {
  const models: Record<string, LineageAccess> = {};
  for (const [, model, op] of text.matchAll(CALL_RE)) {
    models[model] = merge(models[model], (READ_OPS as readonly string[]).includes(op) ? "R" : "W");
  }
  const calls = new Set<string>();
  for (const [, name] of text.matchAll(IDENT_CALL_RE)) calls.add(name);
  return { models, calls };
}

/** Potong badan fungsi dengan pencocokan kurung kurawal dari `{` pertama. */
function functionBody(text: string, startIndex: number): { body: string; end: number } {
  const open = text.indexOf("{", startIndex);
  if (open === -1) return { body: "", end: startIndex };
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return { body: text.slice(open, i + 1), end: i + 1 };
    }
  }
  return { body: text.slice(open), end: text.length };
}

const moduleCache = new Map<string, ModuleFacts>();

function parseModule(file: string, root: string): ModuleFacts {
  const cached = moduleCache.get(file);
  if (cached) return cached;

  const text = read(join(root, file));
  const functions = new Map<string, Unit>();
  const spans: [number, number][] = [];

  for (const match of text.matchAll(FUNCTION_RE)) {
    const start = match.index ?? 0;
    const { body, end } = functionBody(text, start);
    functions.set(match[1], collectUnit(body));
    spans.push([start, end]);
  }

  // Sisa teks di luar badan fungsi = kode level modul.
  let rest = "";
  let cursor = 0;
  for (const [start, end] of spans.sort((a, b) => a[0] - b[0])) {
    rest += text.slice(cursor, start);
    cursor = Math.max(cursor, end);
  }
  rest += text.slice(cursor);

  const importedFrom = new Map<string, string>();
  const wildcard: string[] = [];
  for (const [, typeOnly, named, defaultName, namespaceName, spec] of text.matchAll(IMPORT_RE)) {
    if (typeOnly) continue; // impor tipe tidak membawa perilaku runtime
    const target = resolveImport(spec, file, root);
    if (!target) continue;
    if (named) {
      for (const raw of named.split(",")) {
        const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
        if (name) importedFrom.set(name, target);
      }
    } else if (defaultName || namespaceName) {
      wildcard.push(target);
    }
  }

  const facts: ModuleFacts = { functions, moduleLevel: collectUnit(rest), importedFrom, wildcard };
  moduleCache.set(file, facts);
  return facts;
}

type Request = { file: string; symbol: string | "*" };

/**
 * Telusuri satu rute: mulai dari seluruh berkas rute (mode `*` — semua importnya
 * dianggap dipakai), lalu presisi per simbol begitu masuk ke action/lib.
 */
function walkRoute(seeds: string[], root: string) {
  const models: Record<string, LineageAccess> = {};
  const infraModels: Record<string, LineageAccess> = {};
  const modules = new Set<string>();
  const visited = new Set<string>();
  const queue: Request[] = seeds.map((file) => ({ file, symbol: "*" }));

  const absorb = (unit: Unit, file: string) => {
    const isInfra = INFRA_MODULES.includes(file);
    const sink = isInfra ? infraModels : models;
    for (const [model, access] of Object.entries(unit.models)) {
      sink[model] = merge(sink[model], access);
    }
    if (!isInfra && Object.keys(unit.models).length > 0) modules.add(file);
  };

  while (queue.length > 0) {
    const { file, symbol } = queue.shift() as Request;
    const key = `${file}#${symbol}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const facts = parseModule(file, root);
    // Modul infrastruktur: catat entitasnya, jangan telusuri lebih dalam.
    if (INFRA_MODULES.includes(file)) {
      for (const unit of [facts.moduleLevel, ...facts.functions.values()]) absorb(unit, file);
      continue;
    }

    const units: Unit[] = [facts.moduleLevel];
    if (symbol === "*") units.push(...facts.functions.values());
    else {
      const unit = facts.functions.get(symbol);
      if (unit) units.push(unit);
      else units.push(...facts.functions.values()); // simbol bukan fungsi → konservatif
    }

    for (const unit of units) {
      absorb(unit, file);
      for (const called of unit.calls) {
        if (facts.functions.has(called) && symbol !== "*") {
          queue.push({ file, symbol: called }); // helper lokal
        }
        const from = facts.importedFrom.get(called);
        if (from) queue.push({ file: from, symbol: called });
      }
      if (symbol === "*") {
        // Berkas rute: ikuti seluruh simbol yang diimpornya.
        for (const [name, from] of facts.importedFrom) queue.push({ file: from, symbol: name });
      }
    }
    for (const target of facts.wildcard) queue.push({ file: target, symbol: "*" });
  }

  return { models, infraModels, modules: [...modules].sort() };
}

const toRoute = (dir: string) => posix(relative(join("src", "app"), dir));

function sortRecord(record: Record<string, LineageAccess>): Record<string, LineageAccess> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Pindai seluruh rute admin. `root` = akar repo (default: cwd) supaya test bisa
 * memanggilnya dari direktori mana pun.
 */
export function scanLineage(root: string = process.cwd()): LineageScanResult {
  fileCache.clear();
  moduleCache.clear();

  const files = listFiles(join(root, APP_ROOT)).map((path) => posix(relative(root, path)));

  // 1. Rute ber-guard: page.tsx yang memanggil requirePermission("…").
  const guarded = new Map<string, string>(); // dir rute → menuKey
  const unmapped: LineageScanResult["unmapped"] = [];
  for (const file of files) {
    if (!file.endsWith("page.tsx")) continue;
    const menuKey = GUARD_RE.exec(read(join(root, file)))?.[1];
    const dir = posix(dirname(file));
    if (menuKey) guarded.set(dir, menuKey);
    else unmapped.push({ route: toRoute(dir), reason: "tanpa-requirePermission" });
  }

  // 2. Tiap berkas milik rute ber-guard TERDEKAT (prefix terpanjang) — rute anak
  //    yang ber-guard sendiri tidak boleh tertelan induknya.
  const seedsByDir = new Map<string, string[]>();
  for (const file of files) {
    let owner: string | null = null;
    for (const dir of guarded.keys()) {
      const inside = file === `${dir}/page.tsx` || file.startsWith(`${dir}/`);
      if (inside && (owner === null || dir.length > owner.length)) owner = dir;
    }
    if (owner === null) continue;
    const list = seedsByDir.get(owner);
    if (list) list.push(file);
    else seedsByDir.set(owner, [file]);
  }

  // 3. Telusur per rute, lalu gabung per menuKey (satu menu bisa punya beberapa
  //    rute: halaman daftar + halaman detail memakai guard yang sama).
  const byMenu = new Map<string, LineageEntry>();
  const infra: Record<string, LineageAccess> = {};
  for (const [dir, seeds] of [...seedsByDir.entries()].sort()) {
    const menuKey = guarded.get(dir) as string;
    const { models, infraModels, modules } = walkRoute(seeds, root);
    for (const [model, access] of Object.entries(infraModels)) infra[model] = merge(infra[model], access);

    const existing = byMenu.get(menuKey);
    if (!existing) {
      byMenu.set(menuKey, { menuKey, route: toRoute(dir), models, modules });
      continue;
    }
    for (const [model, access] of Object.entries(models)) {
      existing.models[model] = merge(existing.models[model], access);
    }
    existing.modules = [...new Set([...existing.modules, ...modules])].sort();
  }

  const entries = [...byMenu.values()]
    .map((entry) => ({ ...entry, models: sortRecord(entry.models) }))
    .sort((a, b) => a.menuKey.localeCompare(b.menuKey));

  if (entries.length === 0) {
    throw new Error("lineage-scan: tidak ada rute ber-requirePermission — pola guard berubah?");
  }

  return {
    entries,
    infraModels: sortRecord(infra),
    unmapped: unmapped.sort((a, b) => a.route.localeCompare(b.route)),
  };
}
