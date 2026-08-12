-- AlterEnum
-- Nilai baru tidak boleh dipakai di transaksi yang sama (PG) — backfill ada di migrasi berikutnya.
ALTER TYPE "PermissionLevel" ADD VALUE 'EXPORT';
ALTER TYPE "PermissionLevel" ADD VALUE 'PRINT';
