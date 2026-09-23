-- Keputusan owner 2026-09-23: UL Parcel Code yang sama boleh menempel di >1
-- lahan (klaim ganda vendor dicatat dulu, dicek silang belakangan).
-- Unik (source, code) → unik (parcel_uid, source, code) + indeks biasa
-- (source, code) untuk mencari pemakai lain sebuah kode.

-- DropIndex
DROP INDEX "tbl_land_parcel_external_id_source_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "tbl_land_parcel_external_id_parcel_uid_source_code_key" ON "tbl_land_parcel_external_id"("parcel_uid", "source", "code");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_external_id_source_code_idx" ON "tbl_land_parcel_external_id"("source", "code");
