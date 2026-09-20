-- bmp_assessment_unique_active — #344 (temuan review 2026-09-20): satu penilaian
-- Monev BMP AKTIF per (petani, tahun) kini dijaga DB, bukan hanya cek di action
-- (findFirst → create tidak atomik; dua operator mengimpor Lembaga yang sama
-- bersamaan bisa menghasilkan dua baris aktif). Partial unique index tulis
-- tangan (pola #306/#329 — Prisma tak bisa mendeklarasikannya; jangan pernah
-- terima usulan DROP-nya dari `migrate diff`). Baris nonaktif TIDAK memegang
-- slot, sehingga isi ulang setelah soft delete tetap sah.
--
-- Prasyarat (cek baca-saja sebelum deploy): tidak ada duplikat aktif —
--   SELECT farmer_id, survey_year, count(*) FROM tbl_bmp_assessment
--   WHERE is_active GROUP BY 1,2 HAVING count(*) > 1;
--
-- ROLLBACK: DROP INDEX "uniq_bmp_assessment_farmer_year_active";

CREATE UNIQUE INDEX "uniq_bmp_assessment_farmer_year_active" ON "tbl_bmp_assessment"("farmer_id", "survey_year") WHERE "is_active";
