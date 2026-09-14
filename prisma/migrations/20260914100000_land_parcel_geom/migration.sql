-- land_parcel_geom — #317 Fase 1 (fondasi kueri spasial lahan), dikerjakan lewat
-- #327 (lahan tetangga di Profil Lahan & Detail Lahan) — keputusan owner 2026-09-14.
--
-- Kolom `geom` adalah TURUNAN `geometry` (JSONB) yang dihitung Postgres sendiri
-- (GENERATED ... STORED): tanpa backfill (14.003 baris terisi saat ALTER), tanpa
-- perubahan jalur tulis (bulk upload / revisi tidak tersentuh), dan mustahil
-- divergen — beda dengan dual-column manual tbl_farmer_group_boundary (#266)
-- yang harus dijaga lewat $executeRaw. `geometry` tetap sumber kebenaran & jalur
-- render; `geom` murni untuk ST_DWithin/ST_Intersects via $queryRaw.
--
-- DISUNTING dari hasil `migrate diff`:
--   1. Dua `DROP INDEX *_geom_idx` (administrative_boundary, farmer_group_boundary)
--      DIBUANG — GiST manual pada kolom Unsupported; Prisma akan selalu
--      mengusulkannya, jangan pernah diterima (dijaga migration-guards.test.ts).
--   2. `ADD COLUMN geom` diberi klausa GENERATED (Prisma tidak bisa menulisnya).
--      Ekspresi dijaga CASE pada `type`: ST_GeomFromGeoJSON MELEMPAR ERROR untuk
--      JSON null / objek bukan-geometri ("invalid GeoJSON representation",
--      dicek mis-dev 2026-09-14) — tanpa guard, satu baris JSON aneh membuat
--      INSERT/UPDATE lahan gagal keras. Dengan guard, baris seperti itu cukup
--      geom = NULL (tak tampak di fitur spasial), sama seperti hari ini.
--      Semua fungsi IMMUTABLE (prasyarat GENERATED), diverifikasi #317.
--   3. GiST ditulis manual, nama mengikuti pola `*_geom_idx` yang dijaga test.
--
-- Prasyarat (dicek baca-saja mis-dev 2026-09-14, salinan prod): 14.003 baris,
-- 0 geometry SQL NULL, semua jsonb object bertipe Polygon (13.655) /
-- MultiPolygon (348); ekspresi dievaluasi untuk SEMUA baris tanpa error →
-- 14.003 MULTIPOLYGON SRID 4326, 0 invalid.
--
-- ROLLBACK: DROP INDEX "tbl_land_parcel_geom_idx";
--   ALTER TABLE "tbl_land_parcel" DROP COLUMN "geom";

-- AlterTable (generated, STORED — Postgres mengisi seluruh baris saat ALTER)
ALTER TABLE "tbl_land_parcel" ADD COLUMN "geom" geometry(MultiPolygon, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN ("geometry" ->> 'type') IN ('Polygon', 'MultiPolygon')
      THEN ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON("geometry"::text), 4326)))
      ELSE NULL
    END
  ) STORED;

-- CreateIndex (spatial): GiST untuk ST_DWithin/ST_Intersects — di luar
-- kemampuan deklarasi Prisma pada kolom Unsupported, ditulis manual di sini.
CREATE INDEX "tbl_land_parcel_geom_idx" ON "tbl_land_parcel" USING GIST ("geom");
