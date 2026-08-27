import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Penjaga isi berkas migrasi Prisma (#296/#297).
 *
 * Latar: `prisma migrate dev` tidak mengenal index GiST yang dibuat manual pada
 * kolom `Unsupported` (geom) dan SELALU mengusulkan `DROP INDEX *_geom_idx`
 * di setiap migrasi baru. Bila usulan itu lolos, analisa spasial Fire Alert
 * kehilangan indeksnya diam-diam. Test ini gagal keras sebelum migrasi seperti
 * itu sempat di-commit.
 */
const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, path: join(MIGRATIONS_DIR, d.name, "migration.sql") }))
    .filter((m) => existsSync(m.path))
    .map((m) => ({ ...m, sql: readFileSync(m.path, "utf8") }));
}

describe("migrasi Prisma — index GiST manual tidak boleh di-drop", () => {
  it("tidak ada migrasi yang menjatuhkan *_geom_idx", () => {
    const offenders = migrationFiles()
      .filter((m) => /DROP\s+INDEX\s+(IF\s+EXISTS\s+)?"?[a-z_]*_geom_idx"?/i.test(m.sql))
      .map((m) => m.name);
    expect(offenders).toEqual([]);
  });

  it("setiap index GiST yang pernah dibuat masih ada di riwayat (tidak dihapus setelahnya)", () => {
    const files = migrationFiles();
    const created = files.flatMap((m) => [...m.sql.matchAll(/CREATE INDEX "([a-z_]+_geom_idx)"/gi)].map((x) => x[1]));
    expect(created.length).toBeGreaterThan(0);
    for (const idx of created) {
      const dropped = files.some((m) => new RegExp(`DROP\\s+INDEX\\s+(IF\\s+EXISTS\\s+)?"?${idx}"?`, "i").test(m.sql));
      expect(dropped, `${idx} di-drop oleh sebuah migrasi`).toBe(false);
    }
  });
});

describe("migrasi land_parcel_satellites — backfill parcel_uid sebelum NOT NULL", () => {
  const m = migrationFiles().find((f) => f.name.endsWith("_land_parcel_satellites"));

  it("berkas migrasi ada", () => {
    expect(m).toBeDefined();
  });

  it("urutan: CREATE identity → INSERT backfill → ADD COLUMN nullable → UPDATE → SET NOT NULL", () => {
    const sql = m!.sql;
    const pos = (re: RegExp) => {
      const i = sql.search(re);
      expect(i, `pola tidak ditemukan: ${re}`).toBeGreaterThanOrEqual(0);
      return i;
    };
    const createIdentity = pos(/CREATE TABLE "tbl_land_parcel_identity"/);
    const backfill = pos(/INSERT INTO "tbl_land_parcel_identity"/);
    const addColumn = pos(/ALTER TABLE "tbl_land_parcel" ADD COLUMN "parcel_uid" TEXT;/);
    const update = pos(/UPDATE "tbl_land_parcel" p\s+SET "parcel_uid" = i\."id"/);
    const notNull = pos(/ALTER COLUMN "parcel_uid" SET NOT NULL/);
    expect(createIdentity).toBeLessThan(backfill);
    expect(backfill).toBeLessThan(addColumn);
    expect(addColumn).toBeLessThan(update);
    expect(update).toBeLessThan(notNull);
  });

  it("tidak menambah parcel_uid langsung NOT NULL tanpa default (gagal pada tabel berisi)", () => {
    expect(m!.sql).not.toMatch(/ADD COLUMN\s+"parcel_uid" TEXT NOT NULL/);
  });

  it("backfill mencakup baris nonaktif (GROUP BY pasangan, tanpa filter is_active) agar riwayat revisi tertaut", () => {
    const insert = m!.sql.slice(m!.sql.indexOf('INSERT INTO "tbl_land_parcel_identity"'));
    const stmt = insert.slice(0, insert.indexOf(";"));
    expect(stmt).toMatch(/GROUP BY farmer_id, parcel_id/);
    expect(stmt).not.toMatch(/WHERE\s+.*is_active/i);
  });

  it("FK satelit menunjuk tbl_land_parcel_identity, bukan tbl_land_parcel (agar tak perlu repoint saat revisi)", () => {
    const sql = m!.sql;
    for (const t of ["tbl_land_parcel_document", "tbl_land_parcel_external_id", "tbl_land_parcel_program", "tbl_land_parcel_stdb"]) {
      const fk = new RegExp(`ALTER TABLE "${t}" ADD CONSTRAINT "${t}_parcel_uid_fkey" FOREIGN KEY \\("parcel_uid"\\) REFERENCES "tbl_land_parcel_identity"`);
      expect(sql, `${t} harus FK ke identity`).toMatch(fk);
    }
  });
});
