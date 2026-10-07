-- #403 Target kontrak / trayektori program: tabel baru + 2 enum, tanpa mengubah tabel lain.
-- Usulan Prisma DROP INDEX *_geom_idx & ALTER COLUMN geom DROP DEFAULT DIBUANG (GiST & kolom
-- generated sengaja di luar pengetahuan Prisma — dijaga migration-guards.test.ts).
-- Kompatibel mundur: kode v1.3.0 tidak menyentuh tabel ini.
-- ROLLBACK: DROP TABLE "tbl_program_target"; DROP TYPE "ProgramTargetPeriod"; DROP TYPE "ProgramTargetIndicator";

-- CreateEnum
CREATE TYPE "ProgramTargetIndicator" AS ENUM ('TRAINING_BMP_GROUP_MANAGEMENT', 'TRAINING_GEDSI_LIVELIHOOD');

-- CreateEnum
CREATE TYPE "ProgramTargetPeriod" AS ENUM ('BASELINE', 'ANNUAL');

-- CreateTable
CREATE TABLE "tbl_program_target" (
    "id" TEXT NOT NULL,
    "indicator" "ProgramTargetIndicator" NOT NULL,
    "period_type" "ProgramTargetPeriod" NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_program_target_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_program_target_is_active_idx" ON "tbl_program_target"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_program_target_indicator_period_type_year_key" ON "tbl_program_target"("indicator", "period_type", "year");
