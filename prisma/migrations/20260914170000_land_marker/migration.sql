-- land_marker — #329 patok batas lahan. Dua tabel: tbl_land_marker (patok fisik,
-- SATU baris per patok) + tbl_land_parcel_marker (tautan M:N ke identitas lahan
-- dengan nomor urut per lahan). Tanpa backfill (patok belum ada di sistem).
--
-- DISUNTING dari hasil `migrate diff`:
--   1. Tiga `DROP INDEX *_geom_idx` dan `ALTER COLUMN geom DROP DEFAULT` pada
--      tbl_land_parcel DIBUANG (GiST manual + ekspresi GENERATED yang dibaca
--      Prisma sebagai default; dijaga migration-guards.test.ts).
--   2. `geom` patok diberi klausa GENERATED dari lon/lat (pola 20260914100000):
--      mustahil divergen, tanpa perubahan jalur tulis. ST_MakePoint & ST_SetSRID
--      IMMUTABLE. + GiST `tbl_land_marker_geom_idx` untuk snap ≤ 5 m.
--   3. Partial unique index `uniq_land_parcel_marker_seq` (parcel_uid,
--      sequence_no) WHERE is_active — nomor urut unik per lahan hanya untuk
--      tautan aktif (Prisma tak bisa mendeklarasikannya, pola #306); tautan
--      yang dilepas (is_active=false) tidak menghalangi nomor dipakai ulang.
--
-- ROLLBACK: DROP TABLE "tbl_land_parcel_marker"; DROP TABLE "tbl_land_marker";
--   DROP TYPE "LandMarkerSource"; DROP TYPE "LandMarkerType"; DROP TYPE "LandMarkerCondition";

-- CreateEnum
CREATE TYPE "LandMarkerCondition" AS ENUM ('PRESENT', 'MISSING', 'DAMAGED', 'NOT_INSTALLED');

-- CreateEnum
CREATE TYPE "LandMarkerType" AS ENUM ('CONCRETE', 'WOOD', 'PIPE', 'NATURAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LandMarkerSource" AS ENUM ('POLYGON_VERTEX', 'GPS', 'MANUAL');

-- CreateTable (geom generated dari lon/lat)
CREATE TABLE "tbl_land_marker" (
    "id" TEXT NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "geom" geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)) STORED,
    "source" "LandMarkerSource" NOT NULL,
    "condition" "LandMarkerCondition" NOT NULL DEFAULT 'NOT_INSTALLED',
    "type" "LandMarkerType",
    "installed_at" TIMESTAMP(3),
    "installed_by" TEXT,
    "photo_key" TEXT,
    "photo_name" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_land_marker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_land_parcel_marker" (
    "id" TEXT NOT NULL,
    "parcel_uid" TEXT NOT NULL,
    "marker_id" TEXT NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "source_revision" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_land_parcel_marker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_land_marker_is_active_idx" ON "tbl_land_marker"("is_active");

-- CreateIndex (spatial): GiST untuk snap ≤ 5 m — manual pada kolom Unsupported, nama pola *_geom_idx.
CREATE INDEX "tbl_land_marker_geom_idx" ON "tbl_land_marker" USING GIST ("geom");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_marker_marker_id_idx" ON "tbl_land_parcel_marker"("marker_id");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_marker_parcel_uid_is_active_idx" ON "tbl_land_parcel_marker"("parcel_uid", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_land_parcel_marker_parcel_uid_marker_id_key" ON "tbl_land_parcel_marker"("parcel_uid", "marker_id");

-- CreateIndex (partial unique, tulis tangan): nomor urut unik per lahan untuk tautan AKTIF saja.
CREATE UNIQUE INDEX "uniq_land_parcel_marker_seq" ON "tbl_land_parcel_marker"("parcel_uid", "sequence_no") WHERE "is_active";

-- AddForeignKey
ALTER TABLE "tbl_land_parcel_marker" ADD CONSTRAINT "tbl_land_parcel_marker_parcel_uid_fkey" FOREIGN KEY ("parcel_uid") REFERENCES "tbl_land_parcel_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_land_parcel_marker" ADD CONSTRAINT "tbl_land_parcel_marker_marker_id_fkey" FOREIGN KEY ("marker_id") REFERENCES "tbl_land_marker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
