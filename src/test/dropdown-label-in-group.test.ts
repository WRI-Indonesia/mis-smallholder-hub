import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Penjaga QA staging v1.7.0: `DropdownMenuLabel` = Base UI `Menu.GroupLabel`,
 * yang melempar "Base UI error #31" (halaman jatuh ke error boundary) bila
 * dirender di luar `DropdownMenuGroup`. Ditemukan di filter Jenis Surat Laporan
 * Lahan dan menu Preset Role & Permission. Cek statis: setiap label harus
 * didahului `<DropdownMenuGroup>` yang belum ditutup di dalam konten yang sama.
 */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? tsxFiles(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

describe("DropdownMenuLabel selalu di dalam DropdownMenuGroup", () => {
  it("tak ada label di luar group", () => {
    const offenders: string[] = [];
    for (const f of tsxFiles("src")) {
      if (f.endsWith("components/ui/dropdown-menu.tsx")) continue;
      const src = readFileSync(f, "utf8");
      let idx = src.indexOf("<DropdownMenuLabel");
      while (idx !== -1) {
        const contentStart = src.lastIndexOf("<DropdownMenuContent", idx);
        const before = src.slice(contentStart, idx);
        const open = (before.match(/<DropdownMenuGroup[\s>]/g) ?? []).length;
        const close = (before.match(/<\/DropdownMenuGroup>/g) ?? []).length;
        if (open <= close) offenders.push(`${f}:${src.slice(0, idx).split("\n").length}`);
        idx = src.indexOf("<DropdownMenuLabel", idx + 1);
      }
    }
    expect(offenders).toEqual([]);
  });
});
