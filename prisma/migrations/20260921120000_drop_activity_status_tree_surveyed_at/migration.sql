-- drop_activity_status_tree_surveyed_at — #353 bagian E (keputusan owner
-- 2026-09-21): dua sisa skema yang tidak pernah dipakai.
--
-- 1. enum "ActivityStatus" — dibuat di init (20260521232859) untuk modul
--    aktivitas yang tak pernah lahir; 0 kolom memakainya, 0 rujukan kode/seed.
-- 2. tbl_tree.surveyed_at — ditambah #238 (20260808110000_add_tree) sebagai
--    "tanggal ekspor/survei sumber", tetapi shapefile pohon tidak punya atribut
--    tanggal (kontrak DBF: parcel_id/tree_id/lon/lat/category/vigor/source/
--    model_ver), pengunggah tidak memetakannya, tak ada pembaca. Jejak waktu
--    set pohon tetap ada di created_at + source_file.
--
-- Prasyarat (cek baca-saja sebelum deploy; hasil mis-prod 2026-09-21: 286 baris, 0 terisi):
--   SELECT count(*), count(surveyed_at) FROM tbl_tree;
--   SELECT count(*) FROM pg_attribute a JOIN pg_type t ON t.oid = a.atttypid
--    WHERE t.typname = 'ActivityStatus' AND a.attnum > 0;   -- harus 0
--
-- Ditulis tangan dari `migrate diff` (4 DROP INDEX *_geom_idx + 2 DROP DEFAULT
-- geom usulan Prisma dibuang — pola #328/#329, dijaga migration-guards.test.ts).
--
-- ROLLBACK:
--   ALTER TABLE "tbl_tree" ADD COLUMN "surveyed_at" TIMESTAMP(3);
--   CREATE TYPE "ActivityStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "tbl_tree" DROP COLUMN "surveyed_at";

-- DropEnum
DROP TYPE "ActivityStatus";
