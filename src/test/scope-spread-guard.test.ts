import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Penjaga statis (review pra-rilis v1.7.0): `farmerGroupAccessFilter` di mode
 * BY_FARMER_GROUP mengembalikan `{ id: { in: scope } }`. Bila di-spread ke objek
 * `where` yang juga memuat `id: x`, spread MENIMPA `id: x` — pengecekan "Lembaga
 * ini dalam scope?" selalu lolos dan data Lembaga di luar scope ikut termuat
 * (terjadi di production-availability #416). Gabungkan dengan `AND: [...]`.
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
