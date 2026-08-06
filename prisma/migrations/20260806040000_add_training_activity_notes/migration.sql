-- Kolom catatan sesi pelatihan: label modul Paket 1, sesi multi-hari
-- ("Sesi 3 hari: 11-13 November 2023"), dsb.
ALTER TABLE "tbl_training_activity" ADD COLUMN "notes" TEXT;

-- Pindahkan label "Modul ..." (pembeda BMP vs PNC & NKT dalam Paket 1) dari
-- kolom lokasi ke catatan — "Modul BMP" bukan lokasi sebenarnya.
UPDATE "tbl_training_activity"
SET "notes" = "location", "location" = NULL
WHERE "location" ILIKE 'Modul%';
