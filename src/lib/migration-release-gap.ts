/**
 * Selisih migrasi prod ↔ tag rilis terakhir (#376, TD-045).
 *
 * Migrasi boleh diterapkan ke mis-prod DI LUAR rilis (kebutuhan import data,
 * mis. #373) — tetapi selama tag rilis yang sedang live belum memuat migrasi
 * itu, kode prod tidak mengenal skemanya. Sebaliknya, migrasi yang ada di tag
 * tetapi belum applied berarti kode prod menuntut skema yang tidak ada.
 * Keduanya "jendela terbuka" yang harus kelihatan, bukan diingat.
 *
 * Murni (tanpa git/fs/DB) supaya bisa diuji dengan fixture; pembaca git &
 * berkas ada di `scripts/migrations/check-release-gap.ts`.
 */

/**
 * Nama folder migrasi Prisma: `YYYYMMDDHHMMSS_<apa saja>`. Sengaja longgar di
 * bagian nama — aturan yang lebih ketat akan membuang folder bernama tak lazim
 * dari KEDUA sisi tanpa jejak, dan selisihnya tak pernah terlihat.
 */
const MIGRATION_NAME = /^\d{14}_.+$/;

/** Tag rilis resmi saja — `v1.2.0`, bukan `v1.8-complete` atau `v1.2.0-rc1`. */
const RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

export type ReleaseGap = {
  /** Applied di prod (snapshot checksum) tetapi tak ada di tag → kode prod belum mengenalnya. */
  appliedNotInTag: string[];
  /** Ada di tag tetapi belum applied di prod → kode prod menuntut skema yang tidak ada. */
  inTagNotApplied: string[];
};

/** Tag rilis tertinggi menurut SemVer; null bila belum ada tag rilis. */
export function latestReleaseTag(tags: string[]): string | null {
  const cmp = (a: number[], b: number[]) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  let best: { tag: string; v: number[] } | null = null;
  for (const tag of tags.map((t) => t.trim())) {
    const m = tag.match(RELEASE_TAG);
    if (!m) continue;
    const v = m.slice(1).map(Number);
    if (!best || cmp(v, best.v) > 0) best = { tag, v };
  }
  return best?.tag ?? null;
}

/** Nama migrasi dari daftar entri folder (mis. keluaran `git ls-tree --name-only`). */
export function migrationNames(entries: string[]): string[] {
  return entries
    .map((e) => e.trim().replace(/\/$/, "").split("/").pop() ?? "")
    .filter((n) => MIGRATION_NAME.test(n))
    .sort();
}

/** Nama migrasi applied dari isi `applied-checksums.json` (#303); gagal keras bila formatnya berubah. */
export function appliedMigrations(json: string): { names: string[]; source: string; refreshedAt: string } {
  const data = JSON.parse(json) as { source?: unknown; refreshedAt?: unknown; checksums?: unknown };
  if (!data.checksums || typeof data.checksums !== "object") {
    throw new Error("applied-checksums.json: field `checksums` tidak ada / bukan objek");
  }
  return {
    names: migrationNames(Object.keys(data.checksums as Record<string, string>)),
    source: String(data.source ?? "?"),
    refreshedAt: String(data.refreshedAt ?? "?"),
  };
}

export function migrationReleaseGap(applied: string[], inTag: string[]): ReleaseGap {
  const a = new Set(applied);
  const t = new Set(inTag);
  return {
    appliedNotInTag: [...a].filter((n) => !t.has(n)).sort(),
    inTagNotApplied: [...t].filter((n) => !a.has(n)).sort(),
  };
}
