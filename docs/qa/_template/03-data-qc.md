# 03 · QC data & DB

Kueri **read-only** (`psql`/`prisma studio`), dijalankan **sebelum** dan **sesudah** migrasi di tiap env. Cetak DB efektif dulu (`docs/standards/environments.md`). Harapan diambil dari DB lokal yang identik prod (`mis-staging-local`).

## A. Migrasi & skema

| # | Pemeriksaan | Kueri / perintah | Harapan | staging sebelum | staging sesudah | prod sebelum | prod sesudah |
|---|---|---|---|---|---|---|---|
| A1 | Migrasi pending | `npx dotenv -e .env.<env> -- npx prisma migrate status` | daftar = `00-scope.md` | | | | |
| A2 | Checksum | `migration-guards.test.ts` hijau setelah `refresh-applied-checksums` | ✓ | | | | |

## B. Angka bisnis (tidak boleh berubah karena migrasi)

| # | Pemeriksaan | Kueri | Harapan | staging | prod |
|---|---|---|---|---|---|
| B1 | Lahan aktif | `select count(*) from tbl_land_parcel where is_active` | | | |
| B2 | Petani aktif | `select count(*) from tbl_farmer where is_active` | | | |

## C. Izin & menu

| # | Pemeriksaan | Perintah | Harapan | staging | prod |
|---|---|---|---|---|---|
| C1 | Seed ↔ DB selaras | `npm run rbac:compare` | 0 selisih tak disengaja | | |
| C2 | Menu baru tampil per peran | Settings › Roles matriks | sesuai `role-permissions.csv` | | |
