/**
 * Menulis artefak peta skema (#256): `npm run build:schema`.
 *
 * Sama seperti artefak jalur data, hasilnya di-commit supaya perubahan
 * struktur — entitas/field/relasi baru — terlihat di diff PR, dan dijaga
 * `src/test/data-schema.test.ts` yang memindai ulang lalu membandingkan.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { scanSchema } from "./schema-scan";

const OUT = join("src", "lib", "data-schema.generated.ts");

const schema = scanSchema();

writeFileSync(
  OUT,
  `// BERKAS TURUNAN — JANGAN DISUNTING TANGAN.
// Dihasilkan: npm run build:schema  (scripts/schema-scan.ts ← prisma/schema/*.prisma)
// Dijaga: src/test/data-schema.test.ts — artefak basi = test gagal.
import type { SchemaMap } from "@/types/data-schema";

export const DATA_SCHEMA: SchemaMap = ${JSON.stringify(schema, null, 2)};
`
);

const domains = new Set(schema.entities.map((e) => e.domain));
console.log(
  `${OUT}: ${schema.entities.length} entitas · ${schema.relations.length} relasi · ${schema.enums.length} enum · ${domains.size} domain`
);
