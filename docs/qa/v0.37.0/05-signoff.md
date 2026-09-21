# 05 · Sign-off v0.37.0

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude (dev) | 2026-09-21 | **Go (lokal)** | gate lokal hijau (lint · build · typecheck · 1.702 tes); `02` lengkap (31 kasus); run lokal 35 Pass · 0 Fail; 3 temuan run diperbaiki & di-commit |
| QA | owner (login peran di run lokal) | 2026-09-21 | Go (lokal) · staging: — | run lokal ulang 10/10 Pass; run staging `--only P0` + TC-REV-* menyusul setelah #357 |
| Owner | | | Go / No-go | known issues #354, #311 diterima? — isi setelah staging |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `vX.Y.Z`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
