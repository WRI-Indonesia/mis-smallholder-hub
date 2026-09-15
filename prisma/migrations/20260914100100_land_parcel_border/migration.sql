-- land_parcel_border — #326 (sepadan lahan: batas Utara/Timur/Selatan/Barat).
-- Satelit 1:1 dari tbl_land_parcel_identity (bukan kolom di tbl_land_parcel):
-- upload ulang shapefile membuat baris lahan BARU dari atribut DBF, kolom yang
-- tak ada di DBF hilang di revisi berikutnya — menempel ke identitas membuat
-- sepadan utuh lintas revisi (Decision Log 2026-08-27). Tabel baru, tanpa
-- backfill. Ikut satu siklus deploy dengan 20260914100000_land_parcel_geom.
--
-- Hasil `migrate diff` dipakai apa adanya; dua `DROP INDEX *_geom_idx` yang
-- ikut diusulkan DIBUANG (lihat migrasi sebelumnya).
--
-- ROLLBACK: DROP TABLE "tbl_land_parcel_border";

-- CreateTable
CREATE TABLE "tbl_land_parcel_border" (
    "id" TEXT NOT NULL,
    "parcel_uid" TEXT NOT NULL,
    "north" TEXT,
    "east" TEXT,
    "south" TEXT,
    "west" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_land_parcel_border_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_land_parcel_border_parcel_uid_key" ON "tbl_land_parcel_border"("parcel_uid");

-- AddForeignKey
ALTER TABLE "tbl_land_parcel_border" ADD CONSTRAINT "tbl_land_parcel_border_parcel_uid_fkey" FOREIGN KEY ("parcel_uid") REFERENCES "tbl_land_parcel_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
