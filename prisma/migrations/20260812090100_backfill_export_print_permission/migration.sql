-- Backfill #245: role/user yang saat ini punya VIEW dianggap tetap boleh EXPORT (Excel)
-- dan PRINT (PDF) agar perilaku existing tidak berubah; pencabutan diatur admin lewat matriks.

INSERT INTO "rbac_role_permission" ("id", "role", "menu_key", "permission", "is_active", "created_at", "created_by", "modified_at", "modified_by")
SELECT gen_random_uuid()::text, rp."role", rp."menu_key", p.perm::"PermissionLevel", rp."is_active", now(), 'migration:issue-245', now(), 'migration:issue-245'
FROM "rbac_role_permission" rp
CROSS JOIN (VALUES ('EXPORT'), ('PRINT')) AS p(perm)
WHERE rp."permission" = 'VIEW' AND rp."is_active" = true
ON CONFLICT ("role", "menu_key", "permission") DO NOTHING;

-- Override per-user: salin granted (grant maupun revoke) dari baris VIEW aktif,
-- supaya efek override existing konsisten untuk EXPORT/PRINT.
INSERT INTO "rbac_user_permission_override" ("id", "user_id", "menu_key", "permission", "granted", "is_active", "created_at", "created_by", "modified_at", "modified_by")
SELECT gen_random_uuid()::text, uo."user_id", uo."menu_key", p.perm::"PermissionLevel", uo."granted", uo."is_active", now(), 'migration:issue-245', now(), 'migration:issue-245'
FROM "rbac_user_permission_override" uo
CROSS JOIN (VALUES ('EXPORT'), ('PRINT')) AS p(perm)
WHERE uo."permission" = 'VIEW' AND uo."is_active" = true
ON CONFLICT ("user_id", "menu_key", "permission") DO NOTHING;
