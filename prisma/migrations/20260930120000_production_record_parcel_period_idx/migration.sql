-- #251 Indeks ProductionRecord sebelum import produksi massal (1 baris/lahan/bulan, ±900k baris 2028).
-- Diukur EXPLAIN ANALYZE pada 840.960 baris sintetis (salinan snapshot prod, DB terpisah):
--   Peta BMP 1 Lembaga 182 → 116 ms · lahan+periode 0,22 → 0,005 ms · insert 20k baris +±10%.
-- Pada ukuran prod saat ini (±20k baris) CREATE INDEX berlangsung dalam milidetik.
-- ROLLBACK: DROP INDEX "tbl_production_record_parcel_id_period_idx";
--   CREATE INDEX "tbl_production_record_parcel_id_idx" ON "tbl_production_record"("parcel_id");
--   CREATE INDEX "tbl_production_record_is_active_idx" ON "tbl_production_record"("is_active");

-- DropIndex
DROP INDEX "tbl_production_record_is_active_idx";

-- DropIndex
DROP INDEX "tbl_production_record_parcel_id_idx";

-- CreateIndex
CREATE INDEX "tbl_production_record_parcel_id_period_idx" ON "tbl_production_record"("parcel_id", "period");
