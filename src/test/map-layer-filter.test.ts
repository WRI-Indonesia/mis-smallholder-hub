import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Penjaga prop `filter` pada `<Layer>` react-map-gl.
 *
 * Latar: react-map-gl meneruskan props apa adanya ke `map.addLayer()`
 * (`createLayer`: `{ ...props, id }`), jadi `filter={undefined}` ikut terkirim
 * sebagai kunci bernilai `undefined` dan ditolak validator MapLibre saat layer
 * dibuat — "layers.<id>.filter: array expected, undefined found" (terlihat di
 * `fire-boundary-label`, dibawa sejak #266). Layer itu lalu tidak tergambar.
 *
 * Cara benar: spread bersyarat (`{...(cond ? { filter: X } : {})}`) sehingga
 * kuncinya absen. Melepas filter tetap bekerja — `updateLayer` membandingkan
 * `props.filter` (undefined) dengan sebelumnya lalu memanggil
 * `setFilter(id, undefined)`, yang memang cara MapLibre menghapus filter.
 */
const SRC = join(process.cwd(), "src");

/** `filter={...}` yang salah satu cabangnya `undefined` (ternary dua arah). */
const FILTER_UNDEFINED = /filter=\{[^}]*\bundefined\b/s;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("react-map-gl <Layer> — prop filter tidak boleh bernilai undefined", () => {
  it("tak ada berkas yang menulis filter={... undefined ...}", () => {
    const offenders = tsxFiles(SRC)
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return source.includes("react-map-gl") && FILTER_UNDEFINED.test(source);
      })
      .map((path) => relative(process.cwd(), path));

    expect(offenders).toEqual([]);
  });
});
