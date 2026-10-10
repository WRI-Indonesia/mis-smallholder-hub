# 05 · Sign-off v1.6.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude | 2026-10-10 | Go | gate lokal hijau (2.804 test, build); `02` lengkap (11 kasus); 5 temuan minor — 2 kode diperbaiki (strip legenda, auto-pan popup), 3 spesifikasi/teks dikoreksi |
| QA | Claude (run staging) | 2026-10-10 | Go | run staging `1140261`: smoke 17 · kasus 11 Pass · 0 Fail; OPERATOR & DONOR (login owner); regresi TC-REV-03/05/06 tidak dijalankan (area tak tersentuh, dijaga test) |
| Owner | Sofyan | 2026-10-10 | Go | rilis hari ini (pengecualian 1 rilis/hari, Decision Log); known issues (README) diterima; Target Program baca-saja untuk MANAGEMENT/OPERATOR dibiarkan |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v1.6.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
