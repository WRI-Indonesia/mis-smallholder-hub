# 05 · Sign-off v1.4.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude (Opus 5.5) | 2026-10-07 | **Go** | Gate lokal hijau (lint · build · typecheck · test **2.560** · docs sinkron). `/code-review` #402/#403 (`ba5b90c..HEAD`): 9 temuan diperbaiki `555dd05` + test regresi, 1 positif palsu. `02` memuat TC #402 #403 #317 #400 + Platform Developer; tidak ada temuan blocker/major |
| QA | Claude (login oleh owner) | 2026-10-07 | **Go — terbatas** | Run staging `2026-10-07-staging`: kasus uji 9 Pass · 3 N/A; smoke 5 Pass · 1 Fail minor (SM-35, data prototipe). 2 temuan minor diperbaiki & diverifikasi di deploy kedua. Peran OPERATOR/DONOR, smoke menu lama & regresi **tidak** dijalankan |
| Owner | Sofyan Agus Salim | 2026-10-07 | **Go** | Rilis v1.4.0 dipercepat untuk diskusi manajemen 2026-10-08; menyetujui migrasi + seed staging, migrasi prod ("Dump, migrate, snapshot checksum"); DONOR melihat vs Kontrak & prototipe Rantai Pasok untuk semua peran (keputusan). Known issues di `README.md` |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v1.4.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
