import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Penjaga statis (review pra-rilis v1.7.0): `farmerGroupAccessFilter` di mode
 * BY_FARMER_GROUP mengembalikan `{ id: { in: scope } }`. Bila di-spread ke objek
 * `where` yang juga memuat `id: x`, spread MENIMPA `id: x` — pengecekan "Lembaga
 * ini dalam scope?" selalu lolos dan data Lembaga di luar scope ikut termuat
 * (terjadi di production-availability #416). Gabungkan dengan `AND: [...]`.
 *
 * Kelas yang sama (#440): `farmerAccessFilter` di mode BY_FARMER_GROUP
 * mengembalikan `{ farmerGroupId: { in: scope } }`. Objek yang juga memuat kunci
 * `farmerGroupId` (literal atau spread bersyarat `...(x ? { farmerGroupId } : {})`)
 * — urutan mana pun — kehilangan salah satunya: parameter menimpa scope (data
 * Lembaga lain termuat, getFarmers/getTrainingActivities) atau sebaliknya.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "test" ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

/** Kunci level-atas objek literal yang membungkus posisi `at`. */
function enclosingTopLevelText(src: string, at: number): string {
  let depth = 0;
  let start = at;
  while (start > 0) {
    start--;
    const ch = src[start];
    if (ch === "}") depth++;
    else if (ch === "{") {
      if (depth === 0) break;
      depth--;
    }
  }
  let top = "";
  let d = 0;
  for (const ch of src.slice(start + 1, at)) {
    if ("{[(".includes(ch)) d++;
    else if ("}])".includes(ch)) d--;
    else if (d === 0) top += ch;
  }
  return top;
}

/**
 * Kunci objek literal yang membungkus posisi `at` — seluruh objek (sebelum DAN
 * sesudah `at`), termasuk kunci di dalam spread bersyarat `...(c ? { k } : {})`.
 * Antar-segmen dipisah koma agar kunci shorthand terbaca.
 */
function enclosingObjectKeysText(src: string, at: number): string {
  let depth = 0;
  let start = at;
  while (start > 0) {
    start--;
    const ch = src[start];
    if (ch === "}") depth++;
    else if (ch === "{") {
      if (depth === 0) break;
      depth--;
    }
  }
  const stack: string[] = [];
  let keys = "";
  for (const ch of src.slice(start + 1)) {
    if ("{[(".includes(ch)) {
      stack.push(ch);
      keys += ",";
    } else if ("}])".includes(ch)) {
      if (stack.length === 0) break; // penutup objek pembungkus
      stack.pop();
      keys += ",";
    } else if (stack.length === 0 || (stack.length === 2 && stack[0] === "(" && stack[1] === "{")) {
      keys += ch;
    }
  }
  return keys;
}

const lineOf = (file: string, src: string, at: number) =>
  `${file.replace(process.cwd() + "/", "")}:${src.slice(0, at).split("\n").length}`;

describe("scope spread tidak menimpa id", () => {
  it("tak ada objek `{ id: …, ...farmerGroupAccessFilter(…) }` di src", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/\.\.\.farmerGroupAccessFilter\(/g)) {
        if (/(^|[\s,])id\s*:/.test(enclosingTopLevelText(src, m.index!))) {
          offenders.push(`${file.replace(process.cwd() + "/", "")}:${src.slice(0, m.index).split("\n").length}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * Spread scope bertabrakan bila objek yang sama juga memuat kunci milik fragment
 * scope (`farmerGroupId`/`farmerGroup` untuk `farmerAccessFilter`, `farmer` untuk
 * `farmerRelationAccessFilter`) atau men-spread variabel yang isinya tak terlihat
 * (bentuk bocor `getProductionRecords` sebelum #440). Pola aman: `scopeAnd(…)`.
 */
const SCOPE_KEYS: Record<string, RegExp> = {
  farmerAccessFilter: /(^|[\s,])farmerGroup(Id)?\s*(:|,|$)/,
  farmerRelationAccessFilter: /(^|[\s,])farmer\s*(:|,|$)/,
};
/** Spread identifier biasa (bukan panggilan/ekspresi): di teks kunci, `(…)` menjadi `,,`. */
const VARIABLE_SPREAD = /\.\.\.[A-Za-z_$][\w$]*\s*(?:,(?!,)|$)/;

function collides(src: string, at: number, helper: string): boolean {
  const keys = enclosingObjectKeysText(src, at);
  return SCOPE_KEYS[helper].test(keys) || VARIABLE_SPREAD.test(keys);
}

describe("scope spread tidak bertabrakan dengan kunci scope (#440)", () => {
  it("tak ada objek yang men-spread farmerAccessFilter/farmerRelationAccessFilter bersama kunci scope atau spread variabel", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/\.\.\.(farmerAccessFilter|farmerRelationAccessFilter)\(/g)) {
        if (collides(src, m.index!, m[1])) offenders.push(lineOf(file, src, m.index!));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("detektor menangkap pola bocor dan meloloskan pola aman", () => {
    const hit = (src: string, helper = "farmerAccessFilter") => collides(src, src.indexOf(`...${helper}(`), helper);
    expect(hit("const w = { ...farmerAccessFilter(a), isActive: true, ...(g ? { farmerGroupId: g } : {}) };")).toBe(true);
    expect(hit("const w = { ...farmerAccessFilter(a), ...(farmerGroupId ? { farmerGroupId } : {}) };")).toBe(true);
    expect(hit("const w = { farmerGroupId, ...farmerAccessFilter(a) };")).toBe(true);
    // BY_DISTRICT: fragment = `{ farmerGroup: { districtId } }` → kunci farmerGroup menimpanya.
    expect(hit("const w = { id, ...farmerAccessFilter(a), farmerGroup: { isActive: true } };")).toBe(true);
    // Bentuk production.ts sebelum #440: spread variabel yang memuat farmerGroupId.
    expect(hit("const f = {\n  ...farmerAccessFilter(access),\n  ...farmerGroupFilter,\n};")).toBe(true);
    expect(hit("const w = { ...farmerRelationAccessFilter(a), farmer: { isActive: true } };", "farmerRelationAccessFilter")).toBe(true);
    expect(hit("const w = { id, ...farmerAccessFilter(a), isActive: true };")).toBe(false);
    expect(hit("const w = { ...farmerRelationAccessFilter(a), parcelId: { not: null } };", "farmerRelationAccessFilter")).toBe(false);
    expect(hit("const w = { ...farmerAccessFilter(a), ...(q ? { OR: [{ name: q }] } : {}) };")).toBe(false);
  });
});
