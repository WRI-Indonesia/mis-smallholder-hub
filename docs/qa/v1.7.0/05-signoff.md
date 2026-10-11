# 05 · Sign-off v1.7.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude | 2026-10-12 | Go | gate lokal hijau (2.937 test, build); `02` lengkap (18 kasus + TC-PREP N/A); 3 temuan diperbaiki — #418 major, glyph PDF & kolom Override minor |
| QA | Claude (run staging) | 2026-10-12 | Go | run staging `2026-10-11-staging.md` (s.d. `e9e6f7f`): smoke 34 · kasus 18 · regresi 9 Pass · 0 Fail; ketiga temuan diuji ulang Pass; TC berakun memakai akun uji owner (dikembalikan ke OPERATOR · Rokan Hulu · tanpa override) |
| Owner | Sofyan | 2026-10-12 | Go | known issues (README) diterima |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v1.7.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
