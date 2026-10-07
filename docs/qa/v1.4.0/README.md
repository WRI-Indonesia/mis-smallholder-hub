# QA/QC v1.4.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.4.0 (MINOR — 4 menu baru, 1 tabel baru; dipercepat untuk diskusi manajemen 2026-10-08) |
| Rentang | `v1.3.0..mvp` (`44` commit per 2026-10-07) |
| Migrasi | ada — `20261007125744_program_target` (aditif: tabel + 2 enum); staging applied 2026-10-07 (dump `scripts/dump-prod/2026-10-07/`) |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.4.0`)

_(belum ada run)_

## Keputusan

**Go / No-go:** … (tanggal, oleh siapa) — syarat: semua P0 Pass di staging; migrasi prod applied + checksum; seed menu prod (H4–H6 ✓).

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #366 | Detail Lahan APKASDU belum terisi | berkas sumber masih memakai ID lahan lama |
| #317 | Belum ada peringatan tumpang tindih saat upload shapefile (Fase 3) | digeser ke v1.5.0 |
