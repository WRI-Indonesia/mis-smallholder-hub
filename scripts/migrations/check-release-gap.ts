/**
 * Cek jendela migrasi prod ↔ tag rilis terakhir (#376, TD-045). TANPA DB:
 * membaca snapshot `prisma/migrations/applied-checksums.json` (mis-prod, #303)
 * dan isi `prisma/migrations/` pada tag rilis via git.
 *
 * Pakai:  npm run migrations:release-gap [-- --tag vX.Y.Z]
 *
 * Keluar 1 bila ada selisih:
 *  - applied di prod tetapi belum ada di tag → migrasi mendahului rilis kode
 *    (sah hanya bila kompatibel mundur atau rilis menyusul hari yang sama —
 *    docs/database/migrations.md §Migrasi prod di luar rilis);
 *  - ada di tag tetapi belum applied → kode prod menuntut skema yang tak ada
 *    (atau snapshot checksum belum disegarkan sesudah migrate deploy).
 * Snapshot bisa basi: kebenarannya sebatas `refreshedAt` yang dicetak.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  appliedMigrations,
  latestReleaseTag,
  migrationNames,
  migrationReleaseGap,
} from "../../src/lib/migration-release-gap";

// stderr git diredam: pesan "fatal:" diganti pesan sendiri yang menyebut solusinya.
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const tagArg = process.argv.indexOf("--tag");
const tag = tagArg > -1 ? process.argv[tagArg + 1] : latestReleaseTag(git("tag", "--list", "v*").split("\n"));
if (!tag) {
  console.error("Tidak ada tag rilis vX.Y.Z — jalankan `git fetch --tags` dulu.");
  process.exit(2);
}

let tagEntries: string;
try {
  tagEntries = git("ls-tree", "--name-only", `${tag}:prisma/migrations`);
} catch {
  console.error(`Tag ${tag} tidak ditemukan / tanpa prisma/migrations — jalankan \`git fetch --tags\` dulu.`);
  process.exit(2);
}

const snapshot = appliedMigrations(
  readFileSync(join(process.cwd(), "prisma", "migrations", "applied-checksums.json"), "utf8")
);
const gap = migrationReleaseGap(snapshot.names, migrationNames(tagEntries.split("\n")));

console.log(`Tag rilis: ${tag} · snapshot ${snapshot.source} per ${snapshot.refreshedAt} (${snapshot.names.length} migrasi applied)`);
if (tagArg === -1) console.log("  (tag terbaru di repo LOKAL — jalankan `git fetch --tags` dulu bila ragu)");
if (gap.appliedNotInTag.length === 0 && gap.inTagNotApplied.length === 0) {
  console.log("✓ Tidak ada jendela terbuka — migrasi prod = migrasi di tag.");
  process.exit(0);
}
if (gap.appliedNotInTag.length > 0) {
  console.log(`\n✗ Applied di prod, BELUM ada di ${tag} (kode prod belum mengenalnya):`);
  for (const n of gap.appliedNotInTag) console.log(`  - ${n}`);
  console.log("  → Sah hanya bila kompatibel mundur (bukti pemakai lama di tag) atau rilis menyusul hari ini; catat baris 'jendela terbuka' di sprint.md.");
}
if (gap.inTagNotApplied.length > 0) {
  console.log(`\n✗ Ada di ${tag}, BELUM applied di prod menurut snapshot:`);
  for (const n of gap.inTagNotApplied) console.log(`  - ${n}`);
  console.log("  → Terapkan migrasi ke mis-prod, atau segarkan snapshot (refresh-applied-checksums.ts) bila sudah diterapkan.");
}
process.exit(1);
