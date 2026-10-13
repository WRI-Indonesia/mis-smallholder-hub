import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

/**
 * Skrip `.ts` yang dijalankan lewat `npx tsx` (#430). Repo ini tanpa
 * `"type": "module"`, jadi tsx mengompilasi `.ts` sebagai CJS — dan CJS tak
 * mengenal top-level await. `scripts/seed/seed-menu-key.ts` sempat gagal
 * kompilasi sejak TD-053b (#412) tanpa tertangkap typecheck/test, karena
 * `tsc` menerima top-level await dan tak ada test yang menjalankan skripnya.
 *
 * Transformasi memakai esbuild MILIK tsx (bukan dependensi langsung repo, jadi
 * di-resolve lewat tsx — kompiler yang sama dengan saat skrip dijalankan)
 * dengan format CJS. Hanya kompilasi; skrip tidak dijalankan (banyak yang
 * menulis DB). Peringatan juga dianggap gagal: mis. `import.meta` di CJS hanya
 * diperingatkan esbuild lalu diganti `{}`, dan baru meledak saat dijalankan.
 * Skrip lokal yang tidak di-track (`scripts/local/`) di luar jangkauan guard ini.
 */
const require = createRequire(import.meta.url);
const tsxRequire = createRequire(require.resolve("tsx/package.json"));
const esbuild = tsxRequire("esbuild") as typeof import("esbuild");

// Pathspec git: `*` juga melewati `/`, jadi ini mencakup semua subfolder.
const tracked = execFileSync("git", ["ls-files", "scripts/*.ts", "prisma/*.ts"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

describe("skrip tsx terkompilasi sebagai CJS", () => {
  it("menemukan skrip untuk diperiksa, termasuk subfolder", () => {
    expect(tracked).toContain("scripts/seed/seed-menu-key.ts");
  });

  it.each(tracked)("%s", (file) => {
    const result = esbuild.transformSync(readFileSync(file, "utf8"), {
      loader: "ts",
      format: "cjs",
      sourcefile: file,
      logLevel: "silent",
    });
    expect(result.warnings.map((w) => w.text)).toEqual([]);
  });
});

describe("scripts/seed/seed-menu-key.ts", () => {
  it("tanpa argumen → pesan Pemakaian (berhenti sebelum menyentuh DB), bukan galat kompilasi", () => {
    // DATABASE_URL dikosongkan: andai skrip lolos dari cek argumen, ia tetap tak bisa menulis.
    // Batas waktu proses < batas waktu test, agar macet terbaca sebagai status/stderr, bukan timeout test.
    const res = spawnSync(process.execPath, [require.resolve("tsx/cli"), "scripts/seed/seed-menu-key.ts"], {
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: "" },
      timeout: 20_000,
    });
    expect(res.stderr).toContain("Pemakaian:");
    expect(res.stderr).not.toMatch(/TransformError|Top-level await/);
    expect(res.status).toBe(1);
  }, 30_000);
});
