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

describe("scope spread tidak bertabrakan dengan farmerGroupId (#440)", () => {
  it("tak ada objek `{ ...farmerAccessFilter(…), farmerGroupId … }` di src", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/\.\.\.farmerAccessFilter\(/g)) {
        if (/(^|[\s,])farmerGroupId\s*(:|,|$)/.test(enclosingObjectKeysText(src, m.index!))) {
          offenders.push(lineOf(file, src, m.index!));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("detektor menangkap pola bocor (literal & spread bersyarat) dan meloloskan pola AND", () => {
    const hit = (src: string) =>
      /(^|[\s,])farmerGroupId\s*(:|,|$)/.test(enclosingObjectKeysText(src, src.indexOf("...farmerAccessFilter(")));
    expect(hit("const w = { ...farmerAccessFilter(a), isActive: true, ...(g ? { farmerGroupId: g } : {}) };")).toBe(true);
    expect(hit("const w = { ...farmerAccessFilter(a), ...(farmerGroupId ? { farmerGroupId } : {}) };")).toBe(true);
    expect(hit("const w = { farmerGroupId, ...farmerAccessFilter(a) };")).toBe(true);
    expect(hit("const w = { id, ...farmerAccessFilter(a), farmerGroup: { farmerGroupId: x } };")).toBe(false);
    expect(hit("const w = { id, ...farmerAccessFilter(a), isActive: true };")).toBe(false);
  });
});
