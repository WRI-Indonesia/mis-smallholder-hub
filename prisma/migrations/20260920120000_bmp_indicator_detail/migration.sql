-- bmp_indicator_detail — #346: rincian Monev BMP. Master indikator
-- `ref_bmp_indicator` (32 baris, di-seed dari prisma/seeds/data/bmp-indicators.csv),
-- skor per indikator INDIVIDU per penilaian petani `tbl_bmp_assessment_detail`,
-- penilaian LEMBAGA per tahun `tbl_bmp_group_assessment` + rinciannya (14
-- indikator level LEMBAGA). Additive, tanpa backfill; `BmpAssessment.score`
-- tetap angka resmi (rincian untuk verifikasi & tampilan per kegiatan).
-- Partial unique tulis tangan: satu penilaian Lembaga AKTIF per (Lembaga, tahun)
-- (pola #306/#329/#344 — Prisma akan mengusulkan DROP-nya, jangan diterima).
-- DISUNTING dari `migrate diff`: 4 `DROP INDEX *_geom_idx` + 2 `ALTER COLUMN geom
-- DROP DEFAULT` dibuang (dijaga migration-guards.test.ts).
--
-- ROLLBACK: DROP TABLE "tbl_bmp_group_assessment_detail"; DROP TABLE "tbl_bmp_group_assessment";
--   DROP TABLE "tbl_bmp_assessment_detail"; DROP TABLE "ref_bmp_indicator"; DROP TYPE "BmpIndicatorLevel";

-- CreateEnum
CREATE TYPE "BmpIndicatorLevel" AS ENUM ('LEMBAGA', 'INDIVIDU');

-- CreateTable
CREATE TABLE "ref_bmp_indicator" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "activity_code" TEXT NOT NULL,
    "activity_name" TEXT NOT NULL,
    "activity_weight" DOUBLE PRECISION NOT NULL,
    "criteria_code" TEXT NOT NULL,
    "criteria_name" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "level" "BmpIndicatorLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "in_final_score" BOOLEAN NOT NULL DEFAULT false,
    "score_label_0" TEXT,
    "score_label_1" TEXT,
    "score_label_2" TEXT,
    "score_label_3" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "ref_bmp_indicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_bmp_assessment_detail" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "indicator_id" TEXT NOT NULL,
    "score" INTEGER,
    "weight_used" DOUBLE PRECISION,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_bmp_assessment_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_bmp_group_assessment" (
    "id" TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,
    "survey_year" INTEGER NOT NULL,
    "survey_date" TIMESTAMP(3),
    "assessor" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_bmp_group_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_bmp_group_assessment_detail" (
    "id" TEXT NOT NULL,
    "group_assessment_id" TEXT NOT NULL,
    "indicator_id" TEXT NOT NULL,
    "score" INTEGER,
    "weight_used" DOUBLE PRECISION,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_bmp_group_assessment_detail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ref_bmp_indicator_activity_code_idx" ON "ref_bmp_indicator"("activity_code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_bmp_indicator_code_level_key" ON "ref_bmp_indicator"("code", "level");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_bmp_assessment_detail_assessment_id_indicator_id_key" ON "tbl_bmp_assessment_detail"("assessment_id", "indicator_id");

-- CreateIndex
CREATE INDEX "tbl_bmp_group_assessment_farmer_group_id_survey_year_idx" ON "tbl_bmp_group_assessment"("farmer_group_id", "survey_year");

-- CreateIndex
CREATE INDEX "tbl_bmp_group_assessment_is_active_idx" ON "tbl_bmp_group_assessment"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_bmp_group_assessment_detail_group_assessment_id_indicat_key" ON "tbl_bmp_group_assessment_detail"("group_assessment_id", "indicator_id");

-- AddForeignKey
ALTER TABLE "tbl_bmp_assessment_detail" ADD CONSTRAINT "tbl_bmp_assessment_detail_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "tbl_bmp_assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_bmp_assessment_detail" ADD CONSTRAINT "tbl_bmp_assessment_detail_indicator_id_fkey" FOREIGN KEY ("indicator_id") REFERENCES "ref_bmp_indicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_bmp_group_assessment" ADD CONSTRAINT "tbl_bmp_group_assessment_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl_farmer_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_bmp_group_assessment_detail" ADD CONSTRAINT "tbl_bmp_group_assessment_detail_group_assessment_id_fkey" FOREIGN KEY ("group_assessment_id") REFERENCES "tbl_bmp_group_assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_bmp_group_assessment_detail" ADD CONSTRAINT "tbl_bmp_group_assessment_detail_indicator_id_fkey" FOREIGN KEY ("indicator_id") REFERENCES "ref_bmp_indicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Satu penilaian Lembaga aktif per (Lembaga, tahun) — tulis tangan (partial unique)
CREATE UNIQUE INDEX "uniq_bmp_group_assessment_group_year_active" ON "tbl_bmp_group_assessment"("farmer_group_id", "survey_year") WHERE "is_active";
