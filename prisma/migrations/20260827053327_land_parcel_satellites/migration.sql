-- land_parcel_satellites — Decision Log 2026-08-27.
-- Menambah identitas lahan stabil antar revisi (tbl_land_parcel_identity,
-- di-backfill dari baris yang ada) + satelit: dokumen kepemilikan, STDB (M:N),
-- external id vendor, program (demplot PBU).
--
-- DISUNTING dari hasil `migrate dev --create-only`:
--   1. Dua `DROP INDEX *_geom_idx` yang dihasilkan Prisma DIBUANG — index GiST
--      itu dibuat manual pada kolom Unsupported (migrasi 20260819*), Prisma
--      tidak mengenalnya dan akan selalu mengusulkan drop. Jangan pernah
--      menerimanya.
--   2. `parcel_uid` ditambah NULLABLE dulu, di-backfill satu uid per pasangan
--      (farmer_id, parcel_id) LINTAS revisi/status, baru SET NOT NULL.
--
-- ROLLBACK: DROP TABLE tbl_land_parcel_stdb, tbl_land_stdb, tbl_land_parcel_program,
--   tbl_land_parcel_external_id, tbl_land_parcel_document; ALTER TABLE tbl_land_parcel
--   DROP COLUMN parcel_uid; DROP TABLE tbl_land_parcel_identity;
--   DROP TYPE "LandProgramStatus", "LandProgramType", "LandDocumentType";
-- CreateEnum
CREATE TYPE "LandDocumentType" AS ENUM ('SHM', 'SKT', 'SKGR', 'SK', 'SKST', 'SKTC', 'SKGK', 'SPPT', 'SKRPT', 'SKKT', 'SKTB', 'HIBAH', 'JUAL_BELI', 'OTHER');

-- CreateEnum
CREATE TYPE "LandProgramType" AS ENUM ('DEMPLOT_PBU');

-- CreateEnum
CREATE TYPE "LandProgramStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "tbl_land_parcel_document" (
    "id" TEXT NOT NULL,
    "parcel_uid" TEXT NOT NULL,
    "type" "LandDocumentType" NOT NULL,
    "type_raw" TEXT,
    "number" TEXT,
    "holder_name" TEXT,
    "stated_area" DOUBLE PRECISION,
    "issued_year" INTEGER,
    "custody_note" TEXT,
    "file_url" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_land_parcel_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_land_parcel_external_id" (
    "id" TEXT NOT NULL,
    "parcel_uid" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "raw_geometry" JSONB,
    "mapped_at" TIMESTAMP(3),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_land_parcel_external_id_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_land_parcel_identity" (
    "id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_land_parcel_identity_pkey" PRIMARY KEY ("id")
);

-- Backfill identitas: satu baris per pasangan (farmer_id, parcel_id) dari
-- SEMUA baris lahan (aktif maupun nonaktif) agar riwayat revisi ikut tertaut.
-- Id dibuat ber-format cuid-like ('c' + 24 hex) agar seragam dengan Prisma.
INSERT INTO "tbl_land_parcel_identity" ("id", "farmer_id", "parcel_id", "is_active", "created_at", "created_by", "modified_at", "modified_by")
SELECT 'c' || substr(md5(random()::text || clock_timestamp()::text || farmer_id || parcel_id), 1, 24),
       farmer_id, parcel_id,
       bool_or(is_active), min(created_at), 'migration:land_parcel_satellites', now(), 'migration:land_parcel_satellites'
FROM "tbl_land_parcel"
GROUP BY farmer_id, parcel_id;

-- AlterTable (nullable → backfill → NOT NULL)
ALTER TABLE "tbl_land_parcel" ADD COLUMN "parcel_uid" TEXT;

UPDATE "tbl_land_parcel" p
SET "parcel_uid" = i."id"
FROM "tbl_land_parcel_identity" i
WHERE i."farmer_id" = p."farmer_id" AND i."parcel_id" = p."parcel_id";

ALTER TABLE "tbl_land_parcel" ALTER COLUMN "parcel_uid" SET NOT NULL;

-- CreateTable
CREATE TABLE "tbl_land_parcel_program" (
    "id" TEXT NOT NULL,
    "parcel_uid" TEXT NOT NULL,
    "program_type" "LandProgramType" NOT NULL,
    "status" "LandProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_land_parcel_program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_land_stdb" (
    "id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "holder_name" TEXT,
    "stated_area" DOUBLE PRECISION,
    "issued_year" INTEGER,
    "file_url" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_land_stdb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_land_parcel_stdb" (
    "id" TEXT NOT NULL,
    "parcel_uid" TEXT NOT NULL,
    "stdb_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "tbl_land_parcel_stdb_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_land_parcel_document_parcel_uid_is_active_idx" ON "tbl_land_parcel_document"("parcel_uid", "is_active");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_document_type_idx" ON "tbl_land_parcel_document"("type");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_document_number_idx" ON "tbl_land_parcel_document"("number");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_external_id_parcel_uid_is_active_idx" ON "tbl_land_parcel_external_id"("parcel_uid", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_land_parcel_external_id_source_code_key" ON "tbl_land_parcel_external_id"("source", "code");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_identity_is_active_idx" ON "tbl_land_parcel_identity"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_land_parcel_identity_farmer_id_parcel_id_key" ON "tbl_land_parcel_identity"("farmer_id", "parcel_id");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_program_parcel_uid_is_active_idx" ON "tbl_land_parcel_program"("parcel_uid", "is_active");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_program_program_type_status_idx" ON "tbl_land_parcel_program"("program_type", "status");

-- CreateIndex
CREATE INDEX "tbl_land_stdb_number_idx" ON "tbl_land_stdb"("number");

-- CreateIndex
CREATE INDEX "tbl_land_stdb_is_active_idx" ON "tbl_land_stdb"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_land_stdb_farmer_id_number_key" ON "tbl_land_stdb"("farmer_id", "number");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_stdb_stdb_id_idx" ON "tbl_land_parcel_stdb"("stdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_land_parcel_stdb_parcel_uid_stdb_id_key" ON "tbl_land_parcel_stdb"("parcel_uid", "stdb_id");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_parcel_uid_idx" ON "tbl_land_parcel"("parcel_uid");

-- AddForeignKey
ALTER TABLE "tbl_land_parcel_document" ADD CONSTRAINT "tbl_land_parcel_document_parcel_uid_fkey" FOREIGN KEY ("parcel_uid") REFERENCES "tbl_land_parcel_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_land_parcel_external_id" ADD CONSTRAINT "tbl_land_parcel_external_id_parcel_uid_fkey" FOREIGN KEY ("parcel_uid") REFERENCES "tbl_land_parcel_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_land_parcel_identity" ADD CONSTRAINT "tbl_land_parcel_identity_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "tbl_farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_land_parcel_program" ADD CONSTRAINT "tbl_land_parcel_program_parcel_uid_fkey" FOREIGN KEY ("parcel_uid") REFERENCES "tbl_land_parcel_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_land_parcel" ADD CONSTRAINT "tbl_land_parcel_parcel_uid_fkey" FOREIGN KEY ("parcel_uid") REFERENCES "tbl_land_parcel_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_land_stdb" ADD CONSTRAINT "tbl_land_stdb_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "tbl_farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_land_parcel_stdb" ADD CONSTRAINT "tbl_land_parcel_stdb_parcel_uid_fkey" FOREIGN KEY ("parcel_uid") REFERENCES "tbl_land_parcel_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_land_parcel_stdb" ADD CONSTRAINT "tbl_land_parcel_stdb_stdb_id_fkey" FOREIGN KEY ("stdb_id") REFERENCES "tbl_land_stdb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
