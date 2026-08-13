/**
 * Menulis artefak jalur data (#256): `npm run build:lineage`.
 *
 * Artefak sengaja di-commit (bukan dihitung saat build Next) supaya
 * perubahan jalur data — "menu X sekarang menyentuh entitas Y" — terlihat di
 * diff PR, bukan terjadi diam-diam. Kesegarannya dijaga
 * `src/test/data-lineage.test.ts` yang memindai ulang lalu membandingkan.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { scanLineage } from "./lineage-scan";

const OUT = join("src", "lib", "data-lineage.generated.ts");

const { entries, infraModels, unmapped } = scanLineage();

const body = `// BERKAS TURUNAN — JANGAN DISUNTING TANGAN.
// Dihasilkan: npm run build:lineage  (scripts/lineage-scan.ts)
// Dijaga: src/test/data-lineage.test.ts — artefak basi = test gagal.
import type { DataLineage, LineageAccess, UnmappedRoute } from "@/types/data-lineage";

/** Menu → entitas Prisma yang disentuhnya, hasil pindai kode. */
export const DATA_LINEAGE: DataLineage = ${JSON.stringify(entries, null, 2)};

/** Entitas yang dilewati SETIAP menu lewat guard RBAC & scope akses. */
export const INFRA_MODELS: Record<string, LineageAccess> = ${JSON.stringify(infraModels, null, 2)};

/** Rute tanpa requirePermission (halaman induk) — sengaja tak terpetakan. */
export const UNMAPPED_ROUTES: UnmappedRoute[] = ${JSON.stringify(unmapped, null, 2)};
`;

writeFileSync(OUT, body);

const models = new Set(entries.flatMap((e) => Object.keys(e.models)));
console.log(
  `${OUT}: ${entries.length} menu · ${models.size} entitas · ${unmapped.length} rute induk tak terpetakan`
);
