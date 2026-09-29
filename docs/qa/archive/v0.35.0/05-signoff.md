# 05 · Sign-off v0.35.0

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Sofyan (+Claude) | 2026-09-15 | **Go** | gate lokal hijau (lint 0 · tsc 0 · test 1.507 · build ✓); `02` lengkap (42 kasus + 3 regresi baru); review rentang penuh #339 13 perbaikan; smoke 5 halaman `mis-dev` (snapshot prod) |
| QA | — | — | **Dilewati** | Run staging **tidak dijalankan**: deploy `staging` di-kill OOM 2× (#340) dan owner memutuskan rilis `mvp → main` langsung. Attempt 3 hijau 19:02 WIB setelah DevOps mengecek server — run staging bisa dijalankan **setelah** rilis sebagai pembanding; run prod `--only P0` tetap wajib ≤ 1 jam setelah deploy |
| Owner | Sofyan | 2026-09-15 | **Go** | "skip staging untuk saat ini langsung ke main" — known issues #334, #335, #340, TD-040, TD-041 diterima; `data-qc.ts` A–C hijau di `mis-prod` pra-merge |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v0.35.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
