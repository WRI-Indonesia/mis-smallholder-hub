/**
 * Menulis blok dokumen turunan kode di `docs/`: `npm run build:docs`.
 * Dijaga `src/test/docs-generated.test.ts` — blok basi = test gagal.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { renderBlocks, replaceBlock } from "./docs-gen";

for (const block of renderBlocks()) {
  const before = readFileSync(block.file, "utf8");
  const after = replaceBlock(before, block.id, block.body);
  if (after !== before) writeFileSync(block.file, after);
  console.log(`${after === before ? "sama   " : "ditulis"}  ${block.file} [${block.id}]`);
}
