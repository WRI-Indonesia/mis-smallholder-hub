# 05 · Sign-off v1.5.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude | 2026-10-09 | Go | gate lokal hijau (2.621 test, build); `02` lengkap (19 kasus); review rentang penuh: 7 dari 10 temuan diperbaiki, 3 → TD-055/pola aksi baca |
| QA | Claude (run lokal) | 2026-10-09 | Go terbatas | run lokal P0: 20 Pass · 0 Fail · 7 Blocked; data-qc staging ✓; run staging browser tidak dijalankan |
| Owner | Sofyan | 2026-10-09 | Go | minta push `mvp` + PR `staging → main`; known issues (README) diterima |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v1.5.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
