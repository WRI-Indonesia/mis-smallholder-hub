-- Koreksi backfill #245: baris EXPORT/PRINT yang ikut terisi di menu INDUK membuat
-- revoke per sub-menu tidak efektif — cascade permission bersifat union (induk → anak,
-- tanpa pengurangan), sehingga izin di induk selalu "menang" atas kotak kosong di anak.
-- Batasi hasil backfill ke menu daun: hapus baris EXPORT/PRINT buatan backfill pada menu
-- yang punya anak aktif. Perilaku efektif tidak berubah (menu daun sudah punya barisnya
-- sendiri; satu-satunya anak cascade-only per data prod adalah dashboard-metrics yang
-- tidak punya tombol export/print). Filter created_by menjaga grant manual tetap utuh.

DELETE FROM "rbac_role_permission"
WHERE "permission" IN ('EXPORT', 'PRINT')
  AND "created_by" = 'migration:issue-245'
  AND "menu_key" IN (
    SELECT DISTINCT "parent_key" FROM "tbl_menu_item"
    WHERE "parent_key" IS NOT NULL AND "is_active"
  );

DELETE FROM "rbac_user_permission_override"
WHERE "permission" IN ('EXPORT', 'PRINT')
  AND "created_by" = 'migration:issue-245'
  AND "menu_key" IN (
    SELECT DISTINCT "parent_key" FROM "tbl_menu_item"
    WHERE "parent_key" IS NOT NULL AND "is_active"
  );
