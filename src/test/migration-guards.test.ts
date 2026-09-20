import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

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

/** SQL tanpa komentar baris `--` — header migrasi memuat petunjuk ROLLBACK
 *  (mis. `DROP INDEX "..._geom_idx"`) yang bukan DDL dan tak boleh dihitung. */
function ddlOnly(sql: string) {
  return sql.replace(/--[^\n]*/g, "");
}

describe("migrasi Prisma — index GiST manual tidak boleh di-drop", () => {
  it("tidak ada migrasi yang menjatuhkan *_geom_idx", () => {
    const offenders = migrationFiles()
      .filter((m) => /DROP\s+INDEX\s+(IF\s+EXISTS\s+)?"?[a-z_]*_geom_idx"?/i.test(ddlOnly(m.sql)))
      .map((m) => m.name);
    expect(offenders).toEqual([]);
  });

  it("setiap index GiST yang pernah dibuat masih ada di riwayat (tidak dihapus setelahnya)", () => {
    const files = migrationFiles();
    const created = files.flatMap((m) => [...m.sql.matchAll(/CREATE INDEX "([a-z_]+_geom_idx)"/gi)].map((x) => x[1]));
    expect(created.length).toBeGreaterThan(0);
    for (const idx of created) {
      const dropped = files.some((m) => new RegExp(`DROP\\s+INDEX\\s+(IF\\s+EXISTS\\s+)?"?${idx}"?`, "i").test(ddlOnly(m.sql)));
      expect(dropped, `${idx} di-drop oleh sebuah migrasi`).toBe(false);
    }
  });
});

describe("migrasi Prisma — kolom generated `geom` tidak boleh disentuh migrasi berikutnya", () => {
  it("tidak ada `ALTER COLUMN geom DROP DEFAULT` (Prisma membaca ekspresi GENERATED sebagai default; di Postgres pernyataan itu error)", () => {
    const offenders = migrationFiles()
      .filter((m) => /ALTER\s+COLUMN\s+"?geom"?\s+(DROP|SET)\s+DEFAULT/i.test(ddlOnly(m.sql)))
      .map((m) => m.name);
    expect(offenders).toEqual([]);
  });
});

describe("migrasi land_parcel_nkt — satelit status NKT 1:1 (#328)", () => {
  const m = migrationFiles().find((f) => f.name.endsWith("_land_parcel_nkt"));

  it("berkas migrasi ada; FK ke tbl_land_parcel_identity; unique parcel_uid; enum status & kategori", () => {
    expect(m).toBeDefined();
    expect(m!.sql).toMatch(/REFERENCES "tbl_land_parcel_identity"\("id"\)/);
    expect(m!.sql).toMatch(/CREATE UNIQUE INDEX "tbl_land_parcel_nkt_parcel_uid_key"/);
    expect(m!.sql).toMatch(/CREATE TYPE "LandNktStatus" AS ENUM \('INCLUDED', 'AFFECTED', 'NOT_AFFECTED'\)/);
    expect(m!.sql).toMatch(/CREATE TYPE "NktCategory" AS ENUM \('NKT_1', 'NKT_2', 'NKT_3', 'NKT_4', 'NKT_5', 'NKT_6'\)/);
  });
});

describe("migrasi land_marker — patok batas: geom generated + GiST + partial unique nomor urut (#329)", () => {
  const m = migrationFiles().find((f) => f.name.endsWith("_land_marker"));

  it("berkas migrasi ada; geom patok GENERATED dari lon/lat; GiST pola *_geom_idx", () => {
    expect(m).toBeDefined();
    expect(m!.sql).toMatch(/"geom" geometry\(Point, 4326\) GENERATED ALWAYS AS \(ST_SetSRID\(ST_MakePoint\("longitude", "latitude"\), 4326\)\) STORED/);
    expect(m!.sql).toMatch(/CREATE INDEX "tbl_land_marker_geom_idx" ON "tbl_land_marker" USING GIST \("geom"\)/);
  });

  it("tautan: FK ke tbl_land_parcel_identity (utuh lintas revisi) + unique (parcel_uid, marker_id) + partial unique nomor urut aktif", () => {
    expect(m!.sql).toMatch(/"tbl_land_parcel_marker_parcel_uid_fkey" FOREIGN KEY \("parcel_uid"\) REFERENCES "tbl_land_parcel_identity"\("id"\)/);
    expect(m!.sql).toMatch(/CREATE UNIQUE INDEX "tbl_land_parcel_marker_parcel_uid_marker_id_key"/);
    expect(m!.sql).toMatch(/CREATE UNIQUE INDEX "uniq_land_parcel_marker_seq" ON "tbl_land_parcel_marker"\("parcel_uid", "sequence_no"\) WHERE "is_active"/);
  });

  it("tidak menyentuh tbl_land_parcel (drop index/default geom dibuang)", () => {
    expect(ddlOnly(m!.sql)).not.toMatch(/tbl_land_parcel"?\s+(ALTER|DROP)/i);
  });
});

describe("migrasi land_marker_code — kode patok unik + counter, backfill sebelum NOT NULL (#331)", () => {
  const m = migrationFiles().find((f) => f.name.endsWith("_land_marker_code"));

  it("kolom code nullable dulu → backfill dua tahap → NOT NULL → unique; counter diisi nomor terbesar per awalan", () => {
    expect(m).toBeDefined();
    const sql = m!.sql;
    const addCol = sql.indexOf('ADD COLUMN "code" TEXT');
    const backfill = sql.indexOf("UPDATE tbl_land_marker m");
    const notNull = sql.indexOf('ALTER COLUMN "code" SET NOT NULL');
    const unique = sql.indexOf('CREATE UNIQUE INDEX "tbl_land_marker_code_key"');
    expect(addCol).toBeGreaterThan(-1);
    expect(backfill).toBeGreaterThan(addCol);
    expect(notNull).toBeGreaterThan(backfill);
    expect(unique).toBeGreaterThan(notNull);
    expect(sql).toMatch(/INSERT INTO tbl_land_marker_counter \(prefix, last_no\)/);
    // Bentuk kode <AWALAN>-PTK-000123: awalan = singkatan Lembaga tanpa spasi/tanda baca, 6 digit.
    expect(sql).toMatch(/regexp_replace\(upper\(coalesce\(nullif\(trim\(g\.abrv\), ''\), g\.code, 'MIS'\)\), '\[\^A-Z0-9\]', '', 'g'\)/);
    expect(sql).toMatch(/\|\| '-PTK-' \|\| lpad\(numbered\.n::text, 6, '0'\)/);
  });

  it("tidak menyentuh tbl_land_parcel / index geom", () => {
    expect(ddlOnly(m!.sql)).not.toMatch(/tbl_land_parcel"?\s+(ALTER|DROP)/i);
    expect(ddlOnly(m!.sql)).not.toMatch(/DROP INDEX/i);
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

/**
 * Guard checksum migrasi ter-apply (#303, akar #270).
 *
 * `prisma/migrations/applied-checksums.json` = snapshot `_prisma_migrations`
 * mis-prod (sha256 isi file, cara hitung Prisma). Mengedit file migrasi yang
 * sudah applied membuat `migrate dev` menuntut reset di setiap mesin dev —
 * test ini menangkapnya di gate, murni file-vs-file tanpa DB.
 */
describe("migrasi Prisma — file yang sudah applied di prod tidak boleh berubah (#303)", () => {
  const list = JSON.parse(readFileSync(join(MIGRATIONS_DIR, "applied-checksums.json"), "utf8")) as {
    checksums: Record<string, string>;
  };
  const applied = Object.entries(list.checksums);
  const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

  it("daftar tidak kosong dan setiap entri punya folder migrasi", () => {
    expect(applied.length).toBeGreaterThan(0);
    const missing = applied.map(([name]) => name).filter((name) => !existsSync(join(MIGRATIONS_DIR, name, "migration.sql")));
    expect(missing, "entri applied tanpa folder migrasi — folder dihapus/diganti nama?").toEqual([]);
  });

  it("sha256 file lokal = checksum applied (file migrasi lama tidak diedit)", () => {
    const files = new Map(migrationFiles().map((m) => [m.name, m.sql]));
    const changed = applied
      .filter(([name, checksum]) => files.has(name) && sha256(files.get(name)!) !== checksum)
      .map(([name]) => name);
    expect(
      changed,
      `file migrasi yang sudah applied di prod tidak boleh diedit — buat migrasi baru. Bila checksum prod memang disamakan, segarkan daftar: npx dotenv -e .env.prod -- npx tsx scripts/migrations/refresh-applied-checksums.ts`,
    ).toEqual([]);
  });

  it("migrasi di luar daftar hanya boleh yang lebih baru dari entri terakhir (pending sah)", () => {
    const last = applied.map(([name]) => name).sort().at(-1)!;
    const stale = migrationFiles()
      .map((m) => m.name)
      .filter((name) => !(name in list.checksums) && name < last);
    expect(stale, "migrasi lama yang tidak tercatat applied — daftar belum disegarkan atau folder liar").toEqual([]);
  });
});

/**
 * Migrasi land_stdb_stage — #306/#299. Bagian paling berisiko: melepas
 * `@@unique([farmerId, number])` tanpa penggantinya berarti satu petani bisa
 * punya belasan baris pengajuan kembar (di Postgres NULL ≠ NULL), dan Prisma
 * tidak bisa mendeklarasikan partial unique index sehingga SQL-nya ditulis
 * tangan — tepat jenis kode yang diam-diam hilang saat migrasi diregenerasi.
 */
describe("migrasi land_stdb_stage — partial unique index pengganti @@unique (#306)", () => {
  const m = migrationFiles().find((f) => f.name.endsWith("_land_stdb_stage"));

  it("berkas migrasi ada", () => {
    expect(m).toBeDefined();
  });

  it("kunci unik lama dilepas", () => {
    expect(m!.sql).toMatch(/DROP INDEX "tbl_land_stdb_farmer_id_number_key"/);
  });

  it("nomor tetap unik per petani — hanya pada baris aktif bernomor", () => {
    expect(m!.sql).toMatch(
      /CREATE UNIQUE INDEX "uniq_land_stdb_farmer_number"[\s\S]*?WHERE "number" IS NOT NULL AND "is_active"/,
    );
  });

  it("satu berkas TERBUKA per petani; DITOLAK & TERBIT sengaja di luar index", () => {
    const stmt = m!.sql.slice(m!.sql.indexOf('CREATE UNIQUE INDEX "uniq_land_stdb_farmer_open"'));
    const where = stmt.slice(0, stmt.indexOf(";"));
    expect(where).toMatch(/'PERSIAPAN_DATA'/);
    expect(where).toMatch(/'PENGAJUAN'/);
    expect(where).toMatch(/'REVISI'/);
    expect(where).not.toMatch(/'DITOLAK'/);
    expect(where).not.toMatch(/'TERBIT'/);
    expect(where).toMatch(/"is_active"/);
  });

  it("baris lama jadi TERBIT lewat DEFAULT, bukan backfill yang menebak", () => {
    expect(m!.sql).toMatch(/ADD COLUMN\s+"stage" "LandStdbStage" NOT NULL DEFAULT 'TERBIT'/);
    // 202 baris bernomor pendek Pelalawan belum boleh dipindah — masih dugaan.
    expect(m!.sql).not.toMatch(/UPDATE "tbl_land_stdb"\s+SET\s+"stage"/i);
  });

  it("modified_at (#299) ditambah nullable → backfill → NOT NULL (tabel berisi 1.596 baris)", () => {
    const sql = m!.sql;
    const add = sql.search(/ALTER TABLE "tbl_land_parcel_stdb" ADD COLUMN\s+"modified_at" TIMESTAMP\(3\),/);
    const backfill = sql.search(/UPDATE "tbl_land_parcel_stdb" SET "modified_at" = "created_at"/);
    const notNull = sql.search(/ALTER COLUMN "modified_at" SET NOT NULL/);
    expect(add).toBeGreaterThanOrEqual(0);
    expect(add).toBeLessThan(backfill);
    expect(backfill).toBeLessThan(notNull);
    // NOT NULL langsung tanpa default gagal pada tabel berisi.
    expect(sql).not.toMatch(/ADD COLUMN\s+"modified_at" TIMESTAMP\(3\) NOT NULL,/);
  });
});

describe("migrasi land_parcel_geom — kolom generated + GiST (#317 Fase 1 via #327)", () => {
  const m = migrationFiles().find((f) => f.name.endsWith("_land_parcel_geom"));

  it("berkas migrasi ada", () => {
    expect(m).toBeDefined();
  });

  it("geom adalah GENERATED ... STORED dari geometry (bukan kolom biasa yang harus dijaga aplikasi)", () => {
    expect(m!.sql).toMatch(
      /ADD COLUMN "geom" geometry\(MultiPolygon, 4326\)\s+GENERATED ALWAYS AS \([\s\S]*?ST_GeomFromGeoJSON\("geometry"::text\)[\s\S]*?\) STORED/,
    );
  });

  it("ekspresi dijaga CASE pada type + coordinates — ST_GeomFromGeoJSON melempar error untuk JSON null/objek asing", () => {
    const stmt = m!.sql.slice(m!.sql.indexOf('ADD COLUMN "geom"'));
    const expr = stmt.slice(0, stmt.indexOf("STORED"));
    expect(expr).toMatch(/CASE[\s\S]*?WHEN \("geometry" ->> 'type'\) IN \('Polygon', 'MultiPolygon'\)/);
    expect(expr).toMatch(/jsonb_typeof\("geometry" -> 'coordinates'\) = 'array'/);
  });

  it("hasil selalu (Multi)Polygon: ST_CollectionExtract(…, 3) membungkus ST_MakeValid — ring kolinear tak boleh menggagalkan INSERT", () => {
    const stmt = m!.sql.slice(m!.sql.indexOf('ADD COLUMN "geom"'));
    const expr = stmt.slice(0, stmt.indexOf("STORED"));
    expect(expr).toMatch(/ST_Multi\(ST_CollectionExtract\(ST_MakeValid\(ST_SetSRID\([\s\S]*?\), 3\)\)/);
  });

  it("GiST dibuat manual dengan nama pola *_geom_idx yang dijaga test di atas", () => {
    expect(m!.sql).toMatch(/CREATE INDEX "tbl_land_parcel_geom_idx" ON "tbl_land_parcel" USING GIST \("geom"\)/);
  });

  it("tidak menyentuh jalur tulis: tanpa UPDATE/backfill (Postgres mengisi saat ALTER)", () => {
    expect(ddlOnly(m!.sql)).not.toMatch(/\bUPDATE\b/i);
  });
});

describe("migrasi land_parcel_border — satelit sepadan 1:1 (#326)", () => {
  const m = migrationFiles().find((f) => f.name.endsWith("_land_parcel_border"));

  it("berkas migrasi ada", () => {
    expect(m).toBeDefined();
  });

  it("FK menunjuk tbl_land_parcel_identity, bukan tbl_land_parcel (utuh lintas revisi)", () => {
    expect(m!.sql).toMatch(/REFERENCES "tbl_land_parcel_identity"\("id"\)/);
    expect(m!.sql).not.toMatch(/REFERENCES "tbl_land_parcel"\(/);
  });

  it("satu baris per identitas lahan (unique parcel_uid)", () => {
    expect(m!.sql).toMatch(/CREATE UNIQUE INDEX "tbl_land_parcel_border_parcel_uid_key" ON "tbl_land_parcel_border"\("parcel_uid"\)/);
  });
});

/**
 * Monev BMP (#344): partial unique index satu penilaian aktif per petani-tahun
 * ditulis tangan (temuan review 2026-09-20) — pola #306/#329. Migrasi pertama
 * sengaja tanpa UNIQUE; jangan ada yang "merapikan" menjadi @@unique penuh
 * (baris nonaktif akan memblokir isi ulang).
 */
describe("migrasi bmp_assessment — partial unique aktif per petani-tahun (#344)", () => {
  const first = migrationFiles().find((m) => m.name.endsWith("_bmp_assessment"));
  const second = migrationFiles().find((m) => m.name.endsWith("_bmp_assessment_unique_active"));

  it("migrasi tabel: tanpa UNIQUE penuh (farmer_id, survey_year), FK ke farmer & identitas lahan", () => {
    expect(first).toBeDefined();
    expect(ddlOnly(first!.sql)).not.toMatch(/CREATE UNIQUE INDEX[^\n]*tbl_bmp_assessment/);
    expect(first!.sql).toMatch(/REFERENCES "tbl_farmer"\("id"\) ON DELETE RESTRICT/);
    expect(first!.sql).toMatch(/REFERENCES "tbl_land_parcel_identity"\("id"\) ON DELETE SET NULL/);
  });

  it("migrasi index: partial unique WHERE is_active, bukan unique penuh", () => {
    expect(second).toBeDefined();
    expect(second!.sql).toMatch(/CREATE UNIQUE INDEX "uniq_bmp_assessment_farmer_year_active" ON "tbl_bmp_assessment"\("farmer_id", "survey_year"\) WHERE "is_active"/);
  });
});
