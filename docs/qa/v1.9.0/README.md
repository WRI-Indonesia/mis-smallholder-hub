# QA/QC v1.9.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.9.0 (MINOR — fitur baru: sub menu Peta Fitur + perluasan prototipe Aliran TBS; owner 2026-10-17, bukan PATCH v1.8.1) |
| Rentang | `v1.8.0 (1103b8b)..d99d32a` (14 commit) |
| Migrasi | tidak — 1 menu baru `platform-developer-sitemap` (seed menu + 3 izin VIEW di staging & prod) |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.9.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-10-17-lokal.md | Kasus uji | 10 | 0 | 1 | 0 | 0 |

Blocked = TC-437-01 bagian OPERATOR/DONOR (akun lain tak tersedia di lokal) — wajib di run staging.

## Keputusan

**Go / No-go:** … (tanggal, oleh siapa) — syarat: P0 0 Fail di staging; seed menu `platform-developer-sitemap` staging & prod; deploy staging lolos `npm ci` + build dengan 11 dependensi klien baru (RAM staging, #363).

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #381 | Aliran TBS masih prototipe dari tabel CSV survei 2025, bukan data DB | Versi DB = butir v1.10.0 (bergantung #380) |
| #437 | Board Miro Peta Fitur belum dibuat | Menunggu review berkas MD `docs/product/sitemap/` oleh owner |
