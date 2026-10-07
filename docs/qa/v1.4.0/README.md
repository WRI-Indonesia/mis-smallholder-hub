# QA/QC v1.4.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.4.0 (MINOR — 4 menu baru, 1 tabel baru; dipercepat untuk diskusi manajemen 2026-10-08) |
| Rentang | `v1.3.0..mvp` (`44` commit per 2026-10-07) |
| Migrasi | ada — `20261007125744_program_target` (aditif: tabel + 2 enum); staging applied 2026-10-07 (dump `scripts/dump-prod/2026-10-07/`) |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.4.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-10-07-staging.md | Smoke | 5 | 1 | 0 | 0 | 29 |
| 2026-10-07-staging.md | Kasus uji | 9 | 0 | 0 | 3 | 0 |
| 2026-10-07-staging.md | Regresi | 0 | 0 | 0 | 0 | 9 |

Smoke Fail (SM-35) = temuan #2 minor: CSV prototipe belum di S3 staging (bucket server `mis-staging` ≠ `.env.staging` lokal `mis-dev`); pesan kosong diperbaiki. Smoke menu lama, peran OPERATOR/DONOR, dan regresi **tidak dijalankan**.

## Keputusan

**Go — terbatas** (2026-10-07, owner): rilis v1.4.0 sekarang untuk diskusi manajemen; migrasi prod applied + checksum disegarkan; syarat sesudah deploy: seed menu prod (H4–H6 ✓) dan run prod `--only P0`.

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #366 | Detail Lahan APKASDU belum terisi | berkas sumber masih memakai ID lahan lama |
| #317 | Belum ada peringatan tumpang tindih saat upload shapefile (Fase 3) | digeser ke v1.5.0 |
| — | Prototipe Rantai Pasok kosong di staging/prod sampai CSV diunggah ke bucket env | bucket server staging perlu dicek owner |
