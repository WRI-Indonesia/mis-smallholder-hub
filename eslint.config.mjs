import { fileURLToPath } from "node:url";
import { includeIgnoreFile } from "@eslint/compat";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// TD-059 (#412): daftar abaikan diturunkan dari `.gitignore` — folder lokal yang
// di-ignore git (bahan laporan, dump, dsb.) tidak lagi memerahkan gate lint.
const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  includeIgnoreFile(gitignorePath),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // CLI / local maintenance scripts — not application code (issue #126).
    "scripts/**",
  ]),
]);

export default eslintConfig;
