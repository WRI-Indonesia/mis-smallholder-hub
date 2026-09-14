-- land_marker_code — #331: kode unik patok fisik `<SINGKATAN LEMBAGA>-PTK-000123`
-- (keputusan owner 2026-09-14) + tabel counter per awalan.
--
-- Backfill (patok yang sudah ada, mis. 1.014 patok HJP di mis-dev):
--   awalan  = singkatan Lembaga (abrv; fallback code Lembaga) dari lahan pemakai
--             PERTAMA (tautan aktif tertua; bila tak ada tautan aktif, tautan mana pun;
--             sisanya 'MIS'), huruf besar tanpa spasi/tanda baca;
--   nomor   = urut Kelompok Tani → Blok → ID Lahan → nomor patok (sama dengan
--             urutan unduhan), per awalan, mulai 1;
--   counter = nomor terbesar tiap awalan.
-- DISUNTING dari `migrate diff`: `DROP INDEX *_geom_idx` & `ALTER COLUMN geom DROP
-- DEFAULT` dibuang (pola #328/#329; dijaga migration-guards.test.ts).
--
-- ROLLBACK: DROP INDEX "tbl_land_marker_code_key"; ALTER TABLE "tbl_land_marker" DROP COLUMN "code";
--   DROP TABLE "tbl_land_marker_counter";

-- CreateTable
CREATE TABLE "tbl_land_marker_counter" (
    "prefix" TEXT NOT NULL,
    "last_no" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tbl_land_marker_counter_pkey" PRIMARY KEY ("prefix")
);

-- AlterTable (nullable dulu → backfill → NOT NULL)
ALTER TABLE "tbl_land_marker" ADD COLUMN "code" TEXT;

-- Backfill 1: awalan dari lahan pemakai pertama (tautan aktif tertua)
WITH first_link AS (
    SELECT DISTINCT ON (l.marker_id)
           l.marker_id,
           regexp_replace(upper(coalesce(nullif(trim(g.abrv), ''), g.code, 'MIS')), '[^A-Z0-9]', '', 'g') AS prefix,
           p.sub_group_lv2, p.blok, i.parcel_id, l.sequence_no
    FROM tbl_land_parcel_marker l
    JOIN tbl_land_parcel_identity i ON i.id = l.parcel_uid
    JOIN tbl_land_parcel p ON p.parcel_uid = i.id AND p.is_active
    JOIN tbl_farmer f ON f.id = p.farmer_id
    JOIN tbl_farmer_group g ON g.id = f.farmer_group_id
    WHERE l.is_active
    ORDER BY l.marker_id, l.created_at, i.parcel_id
),
numbered AS (
    SELECT marker_id, prefix,
           row_number() OVER (PARTITION BY prefix ORDER BY sub_group_lv2 NULLS LAST, blok NULLS LAST, parcel_id, sequence_no) AS n
    FROM first_link
)
UPDATE tbl_land_marker m
   SET code = numbered.prefix || '-PTK-' || lpad(numbered.n::text, 6, '0')
  FROM numbered
 WHERE numbered.marker_id = m.id;

-- Backfill 2: patok tanpa tautan aktif (semua tautannya pernah dilepas) — tautan mana pun, lalu 'MIS'
WITH any_link AS (
    SELECT DISTINCT ON (l.marker_id)
           l.marker_id,
           regexp_replace(upper(coalesce(nullif(trim(g.abrv), ''), g.code, 'MIS')), '[^A-Z0-9]', '', 'g') AS prefix
    FROM tbl_land_parcel_marker l
    JOIN tbl_land_parcel_identity i ON i.id = l.parcel_uid
    JOIN tbl_land_parcel p ON p.parcel_uid = i.id
    JOIN tbl_farmer f ON f.id = p.farmer_id
    JOIN tbl_farmer_group g ON g.id = f.farmer_group_id
    ORDER BY l.marker_id, l.created_at
),
base AS (
    SELECT m.id AS marker_id, coalesce(a.prefix, 'MIS') AS prefix, m.created_at
    FROM tbl_land_marker m
    LEFT JOIN any_link a ON a.marker_id = m.id
    WHERE m.code IS NULL
),
offsets AS (
    SELECT split_part(code, '-PTK-', 1) AS prefix, max(split_part(code, '-PTK-', 2)::int) AS last_no
    FROM tbl_land_marker WHERE code IS NOT NULL GROUP BY 1
),
numbered AS (
    SELECT b.marker_id, b.prefix,
           coalesce(o.last_no, 0) + row_number() OVER (PARTITION BY b.prefix ORDER BY b.created_at, b.marker_id) AS n
    FROM base b LEFT JOIN offsets o ON o.prefix = b.prefix
)
UPDATE tbl_land_marker m
   SET code = numbered.prefix || '-PTK-' || lpad(numbered.n::text, 6, '0')
  FROM numbered
 WHERE numbered.marker_id = m.id;

-- Counter = nomor terbesar tiap awalan
INSERT INTO tbl_land_marker_counter (prefix, last_no)
SELECT split_part(code, '-PTK-', 1), max(split_part(code, '-PTK-', 2)::int)
  FROM tbl_land_marker
 GROUP BY 1;

ALTER TABLE "tbl_land_marker" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tbl_land_marker_code_key" ON "tbl_land_marker"("code");
