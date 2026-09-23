# 05 · Sign-off v1.1.0

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude (sesi wrap-up) | 2026-09-23 | **Go** | gate lokal hijau (lint 0 · build ✓ · tsc 0 · test 1.868); `02` lengkap (TC-370…375, +TC-374-04); review rentang penuh 1 temuan valid sebagian → diperbaiki `00bcc2f`; smoke lokal TC-373-02 sisi A ✓ (SUPERADMIN) |
| QA | tester (disampaikan owner) | 2026-09-23 | **Go** | disampaikan owner di sesi: "QA staging selesai, sign-off Go". ⚠️ **Hasil per kasus tidak tercatat di repo** — `runs/2026-09-23-staging.md` 0/62 baris terisi saat tag; status tiap SM/TC (termasuk TC-373-02 sisi B) tidak bisa diverifikasi dari dosir ini |
| Owner | Sofyan | 2026-09-23 | **Go** | known issues diterima; rilis hari yang sama dengan v1.0.0 sebagai **hotfix kritis** (TD-045); data #374 prod dibersihkan **sesudah** deploy |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v1.1.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
