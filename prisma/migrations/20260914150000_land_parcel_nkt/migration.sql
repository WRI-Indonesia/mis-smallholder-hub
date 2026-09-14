-- land_parcel_nkt — #328 (status NKT / HCV per lahan, hasil asesmen manual;
-- langkah pertama modul MD-08). Satelit 1:1 ke tbl_land_parcel_identity —
-- ikut lahan, bukan ikut revisi poligon. Tanpa baris = belum dinilai;
-- NOT_AFFECTED = baris eksplisit "sudah dinilai, tidak terdampak".
-- Tabel baru + 2 enum, tanpa backfill. Kolom affected_area_ha / affected_length_m
-- mengikuti data lapangan HJP (Lampiran III: "Luas NKT Area (ha)", "LENGTH").
--
-- DISUNTING dari hasil `migrate diff`:
--   1. Tiga `DROP INDEX *_geom_idx` DIBUANG (GiST manual pada kolom Unsupported;
--      Prisma akan selalu mengusulkannya — dijaga migration-guards.test.ts).
--   2. `ALTER TABLE tbl_land_parcel ALTER COLUMN geom DROP DEFAULT` DIBUANG —
--      Prisma membaca ekspresi GENERATED (20260914100000) sebagai "default" dan
--      akan selalu mengusulkan pencabutannya; di Postgres pernyataan itu error
--      ("column is a generated column"). Jangan pernah diterima (dijaga test).
--
-- ROLLBACK: DROP TABLE "tbl_land_parcel_nkt"; DROP TYPE "NktCategory"; DROP TYPE "LandNktStatus";

-- CreateEnum
CREATE TYPE "LandNktStatus" AS ENUM ('INCLUDED', 'AFFECTED', 'NOT_AFFECTED');

-- CreateEnum
CREATE TYPE "NktCategory" AS ENUM ('NKT_1', 'NKT_2', 'NKT_3', 'NKT_4', 'NKT_5', 'NKT_6');

-- CreateTable
CREATE TABLE "tbl_land_parcel_nkt" (
    "id" TEXT NOT NULL,
    "parcel_uid" TEXT NOT NULL,
    "status" "LandNktStatus" NOT NULL,
    "categories" "NktCategory"[],
    "affected_area_ha" DOUBLE PRECISION,
    "affected_length_m" DOUBLE PRECISION,
    "assessed_at" TIMESTAMP(3),
    "assessor" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_land_parcel_nkt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_land_parcel_nkt_parcel_uid_key" ON "tbl_land_parcel_nkt"("parcel_uid");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_nkt_status_idx" ON "tbl_land_parcel_nkt"("status");

-- AddForeignKey
ALTER TABLE "tbl_land_parcel_nkt" ADD CONSTRAINT "tbl_land_parcel_nkt_parcel_uid_fkey" FOREIGN KEY ("parcel_uid") REFERENCES "tbl_land_parcel_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
