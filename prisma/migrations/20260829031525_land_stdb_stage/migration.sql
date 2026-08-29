-- land_stdb_stage — #306 (tahapan penerbitan STDB) + #299 (audit tautan STDB↔lahan).
-- Digabung dalam SATU migrasi karena kedua tabel serumpun; memisahkannya berarti
-- dua siklus `migrate deploy` + dua refresh applied-checksums.json di prod.
--
-- DISUNTING dari hasil `migrate dev --create-only`:
--   1. Dua `DROP INDEX *_geom_idx` yang dihasilkan Prisma DIBUANG — index GiST
--      itu dibuat manual pada kolom Unsupported (migrasi 20260819*), Prisma
--      tidak mengenalnya dan akan selalu mengusulkan drop. Jangan pernah
--      menerimanya. (Sama seperti 20260827053327_land_parcel_satellites.)
--   2. `tbl_land_parcel_stdb.modified_at` ditambah NULLABLE dulu, di-backfill
--      dari `created_at` (baris lama memang belum pernah diubah — lebih jujur
--      daripada NOW()), baru SET NOT NULL. Tanpa DEFAULT permanen supaya tidak
--      menimbulkan drift terhadap model Prisma.
--   3. `tbl_land_stdb_farmer_id_number_key` diganti DUA partial unique index
--      yang ditulis tangan (Prisma tidak bisa mendeklarasikannya). Ini bagian
--      paling berisiko dari #306: begitu `number` boleh NULL, Postgres
--      menganggap NULL ≠ NULL, jadi tanpa index kedua satu petani bisa punya
--      belasan baris pengajuan kembar tanpa ada yang menahan.
--
-- ROLLBACK: DROP INDEX uniq_land_stdb_farmer_open, uniq_land_stdb_farmer_number;
--   CREATE UNIQUE INDEX "tbl_land_stdb_farmer_id_number_key" ON "tbl_land_stdb"("farmer_id","number");
--   ALTER TABLE "tbl_land_stdb" ALTER COLUMN "number" SET NOT NULL,
--     DROP COLUMN "stage", DROP COLUMN "stage_changed_at", DROP COLUMN "stage_note",
--     DROP COLUMN "prepared_at", DROP COLUMN "submitted_at", DROP COLUMN "issued_at",
--     DROP COLUMN "submitted_to";
--   ALTER TABLE "tbl_land_parcel_stdb" DROP COLUMN "modified_at", DROP COLUMN "modified_by";
--   DROP TYPE "LandStdbStage";

-- CreateEnum
CREATE TYPE "LandStdbStage" AS ENUM ('PERSIAPAN_DATA', 'PENGAJUAN', 'REVISI', 'TERBIT', 'DITOLAK');

-- DropIndex
DROP INDEX "tbl_land_stdb_farmer_id_number_key";

-- AlterTable (#299) — audit tautan STDB↔lahan
ALTER TABLE "tbl_land_parcel_stdb" ADD COLUMN     "modified_at" TIMESTAMP(3),
ADD COLUMN     "modified_by" TEXT;

UPDATE "tbl_land_parcel_stdb" SET "modified_at" = "created_at" WHERE "modified_at" IS NULL;

ALTER TABLE "tbl_land_parcel_stdb" ALTER COLUMN "modified_at" SET NOT NULL;

-- AlterTable (#306) — tahapan penerbitan
-- `stage` default TERBIT: seluruh baris lama benar apa adanya, tidak ada
-- backfill yang menebak. 202 baris bernomor pendek Pelalawan SENGAJA tidak
-- dipindah ke PENGAJUAN di sini — itu masih dugaan, menunggu jawaban penyusun
-- berkas sumber (lihat komentar #306).
ALTER TABLE "tbl_land_stdb" ADD COLUMN     "issued_at" TIMESTAMP(3),
ADD COLUMN     "prepared_at" TIMESTAMP(3),
ADD COLUMN     "stage" "LandStdbStage" NOT NULL DEFAULT 'TERBIT',
ADD COLUMN     "stage_changed_at" TIMESTAMP(3),
ADD COLUMN     "stage_note" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "submitted_to" TEXT,
ALTER COLUMN "number" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "tbl_land_stdb_stage_idx" ON "tbl_land_stdb"("stage");

-- CreateIndex (partial unique — pengganti @@unique([farmerId, number]))
-- Nomor resmi tetap unik per petani, tapi hanya untuk baris aktif bernomor.
CREATE UNIQUE INDEX "uniq_land_stdb_farmer_number"
  ON "tbl_land_stdb" ("farmer_id", "number")
  WHERE "number" IS NOT NULL AND "is_active";

-- Satu berkas TERBUKA per petani. DITOLAK sengaja tidak ikut supaya petani
-- yang ditolak bisa mengajukan ulang dengan baris baru; TERBIT juga tidak ikut
-- karena satu petani boleh punya banyak STDB terbit.
CREATE UNIQUE INDEX "uniq_land_stdb_farmer_open"
  ON "tbl_land_stdb" ("farmer_id")
  WHERE "stage" IN ('PERSIAPAN_DATA', 'PENGAJUAN', 'REVISI') AND "is_active";
