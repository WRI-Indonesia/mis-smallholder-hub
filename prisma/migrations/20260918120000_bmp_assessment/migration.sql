-- bmp_assessment — #344: hasil Monev BMP (Monitoring & Evaluasi Best Management
-- Practices) per PETANI per tahun survei (keputusan owner 2026-09-18). Skor akhir
-- saja (0–3); kategori Teladan/Praktisi/Perintis/Belum TIDAK disimpan — dihitung
-- dari skor lewat konstanta di src/lib/bmp-assessment.ts.
-- FK utama ke tbl_farmer (penilaian praktik petani), `parcel_uid` opsional =
-- lahan yang dikunjungi (identitas stabil antar revisi). Tanpa UNIQUE
-- (farmer_id, survey_year): satu penilaian AKTIF per petani-tahun dijaga di
-- server action (baris nonaktif tidak boleh memblokir isi ulang — pelajaran
-- #306/#326; partial index dihindari karena Prisma selalu mengusulkan DROP-nya).
-- Tanpa backfill; additive.
-- DISUNTING dari `migrate diff`: `DROP INDEX *_geom_idx` & `ALTER COLUMN geom DROP
-- DEFAULT` dibuang (pola #328/#329; dijaga migration-guards.test.ts).
--
-- ROLLBACK: DROP TABLE "tbl_bmp_assessment";

-- CreateTable
CREATE TABLE "tbl_bmp_assessment" (
    "id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "survey_year" INTEGER NOT NULL,
    "survey_date" TIMESTAMP(3),
    "score" DOUBLE PRECISION NOT NULL,
    "parcel_uid" TEXT,
    "assessor" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_bmp_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_bmp_assessment_farmer_id_survey_year_idx" ON "tbl_bmp_assessment"("farmer_id", "survey_year");

-- CreateIndex
CREATE INDEX "tbl_bmp_assessment_survey_year_idx" ON "tbl_bmp_assessment"("survey_year");

-- CreateIndex
CREATE INDEX "tbl_bmp_assessment_is_active_idx" ON "tbl_bmp_assessment"("is_active");

-- AddForeignKey
ALTER TABLE "tbl_bmp_assessment" ADD CONSTRAINT "tbl_bmp_assessment_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "tbl_farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_bmp_assessment" ADD CONSTRAINT "tbl_bmp_assessment_parcel_uid_fkey" FOREIGN KEY ("parcel_uid") REFERENCES "tbl_land_parcel_identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
