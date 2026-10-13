import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";

/**
 * Skrip `.ts` yang dijalankan lewat `npx tsx` (#430). Repo ini tanpa
 * `"type": "module"`, jadi tsx mengompilasi `.ts` sebagai CJS — dan CJS tak
 * mengenal top-level await. `scripts/seed/seed-menu-key.ts` sempat gagal
 * kompilasi sejak TD-053b (#412) tanpa tertangkap typecheck/test, karena
 * `tsc` menerima top-level await dan tak ada test yang menjalankan skripnya.
 *
 * Transformasi memakai esbuild (mesin yang sama di balik tsx) dengan format
 * CJS — hanya kompilasi, skrip tidak dijalankan (banyak yang menulis DB).
 */
const tracked = execFileSync("git", ["ls-files", "scripts/*.ts", "scripts/**/*.ts", "prisma/*.ts", "prisma/**/*.ts"], {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

describe("skrip tsx terkompilasi sebagai CJS", () => {
  it("menemukan skrip untuk diperiksa", () => {
    expect(tracked).toContain("scripts/seed/seed-menu-key.ts");
  });

  it.each(tracked)("%s", (file) => {
    expect(() =>
      transformSync(readFileSync(file, "utf8"), { loader: "ts", format: "cjs", sourcefile: file, logLevel: "silent" }),
    ).not.toThrow();
  });
});

describe("scripts/seed/seed-menu-key.ts", () => {
  it("tanpa argumen → pesan Pemakaian (berhenti sebelum menyentuh DB), bukan galat kompilasi", () => {
    // DATABASE_URL dikosongkan: andai skrip lolos dari cek argumen, ia tetap tak bisa menulis.
    const res = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/seed/seed-menu-key.ts"], {
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: "" },
      timeout: 30_000,
    });
    expect(res.stderr).toContain("Pemakaian:");
    expect(res.stderr).not.toMatch(/TransformError|Top-level await/);
    expect(res.status).toBe(1);
  }, 30_000);
});
