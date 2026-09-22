# 05 · Sign-off v0.38.0

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | | | Go / No-go | gate lokal hijau; `02` lengkap; temuan blocker/major diperbaiki |
| QA | | | Go / No-go | run staging: semua P0 Pass; Fail tersisa hanya minor ber-issue |
| Owner | | | Go / No-go | known issues diterima |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v0.38.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
