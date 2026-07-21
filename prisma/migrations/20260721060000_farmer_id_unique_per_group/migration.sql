-- TD-024: ID Petani unik PER LEMBAGA (keputusan owner 2026-07-21).
--
-- Sebelumnya tidak ada penjaga sama sekali di jalur form: dua petani dengan
-- farmer_id sama bisa tersimpan diam-diam, memecah riwayat pelatihan & lahan.
-- Sementara bulk upload justru menolak berdasarkan seluruh database.
--
-- Constraint ini TIDAK mengenal soft delete — baris nonaktif tetap memakai
-- slotnya. Itu dikehendaki: memakai ulang ID milik petani nonaktif akan
-- memecah riwayatnya alih-alih menyambungkannya kembali.
--
-- Prasyarat sudah diverifikasi read-only pada mis-prod 2026-07-21
-- (scripts/local/audit-farmer-id-duplicates.ts): 3.448 baris, 0 duplikat
-- (farmer_group_id, farmer_id). Jalankan ulang skrip itu sebelum menerapkan
-- di lingkungan lain.
CREATE UNIQUE INDEX "tbl_farmer_farmer_group_id_farmer_id_key"
  ON "tbl_farmer"("farmer_group_id", "farmer_id");
