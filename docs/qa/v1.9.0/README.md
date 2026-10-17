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
| 2026-10-17-staging.md | Smoke | 2 | 0 | 11 | 0 | 0 |
| 2026-10-17-staging.md | Kasus uji | 10 | 0 | 1 | 0 | 0 |

Blocked = bagian peran OPERATOR/DONOR (akun tak tersedia di sesi lokal maupun staging 2026-10-17); bagian SUPERADMIN lulus. Rilis hanya menambah 1 menu ber-VIEW 3 peran (dijaga `menu-access.test.ts`).

## Keputusan

**Go / No-go:** **Go dengan catatan** 2026-10-17 — Developer & QA (Claude), Owner (Sofyan); lihat [05-signoff.md](05-signoff.md). Catatan: bagian peran OPERATOR/DONOR Blocked (akun tak tersedia). Syarat tag: bump + merge staging + PR `main` **hari ini 2026-10-17** (owner: "kalau sudah aman semua boleh rilis hari ini"; semula Senin), seed menu `platform-developer-sitemap` prod (dry-run → `--apply`), run prod `--only P0` ≤ 1 jam setelah deploy.

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #381 | Aliran TBS masih prototipe dari tabel CSV survei 2025, bukan data DB | Versi DB = butir v1.10.0 (bergantung #380) |
| #437 | Board Miro Peta Fitur belum dibuat | Menunggu review berkas MD `docs/product/sitemap/` oleh owner |
