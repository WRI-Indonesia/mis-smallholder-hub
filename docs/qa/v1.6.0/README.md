# QA/QC v1.6.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.6.0 (MINOR — ada `feat:` sejak v1.5.0: perluasan prototipe Rantai Pasok; keputusan owner 2026-10-10) |
| Rentang | `v1.5.0..mvp` — saat merge ke staging 2026-10-10: `34545a7..` sampai commit docs v1.6.0 (lihat `00-scope.md`) |
| Migrasi | **tidak** (juga tanpa seed & menu/izin baru) |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.6.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-10-10-local.md | Smoke | 14 | 0 | 2 | 1 | 0 |
| 2026-10-10-local.md | Kasus uji | 10 | 0 | 1 | 0 | 0 |
| 2026-10-10-local.md | Regresi | 0 | 0 | 3 | 0 | 0 |
| 2026-10-10-staging.md | Smoke | 17 | 0 | 0 | 1 | 0 |
| 2026-10-10-staging.md | Kasus uji | 11 | 0 | 0 | 0 | 0 |
| 2026-10-10-staging.md | Regresi | 0 | 0 | 3 | 0 | 0 |
| 2026-10-10-prod.md | Smoke | 12 | 0 | 2 | 0 | 0 |
| 2026-10-10-prod.md | Kasus uji | 3 | 0 | 0 | 0 | 0 |
| 2026-10-10-prod.md | Regresi | 0 | 0 | 3 | 0 | 0 |

Run staging 2026-10-10 (`b6f53b9`, sesi owner SUPERADMIN): 0 Fail; 1 temuan minor baru — popup peta tak di-auto-pan dari tepi kanan/atas/bawah sejak v1.5.0 (diperbaiki `4e218cf`, cek ulang staging `c4211fb` lulus) dan koreksi spesifikasi TC-381-04 (temuan 4). Unduhan Excel tanpa filter & Siak lulus. SM-28 OPERATOR (BY_FARMER_GROUP) · SM-29 DONOR · bagian DONOR TC-381-04 lulus (login oleh owner); temuan 5 = teks Bantuan `t-9` (kaskade izin Target Program), diperbaiki. Sisa Blocked hanya regresi TC-REV-03/05/06 (area tak tersentuh, dijaga test). Run lokal (build produksi `:3100`, SUPERADMIN): 2 temuan minor — strip legenda Peta melipat (diperbaiki), spesifikasi SM-24 (dikoreksi). Blocked = butuh login OPERATOR/DONOR (SM-28, SM-29, bagian DONOR TC-381-04) atau unduhan berkas; TC-REV-03/05/06 tidak dijalankan (area tak tersentuh rilis). **Run staging oleh owner belum ada.**

## Keputusan

**Go / No-go:** **Go** — 2026-10-10, owner (rilis hari yang sama dengan v1.5.1, pengecualian tercatat di Decision Log). Tanpa migrasi; run prod P0 `runs/2026-10-10-prod.md` (< 1 jam sesudah deploy): smoke 12 · kasus 3 Pass · 0 Fail; SM-28/SM-29 Blocked (akun lain, lulus di staging).

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #386 butir 2 · #409 | Pemegang izin tulis Settings Users / Lembaga yang ber-scope bisa menulis di luar batasnya (bukan baca) | dijadwalkan v1.8.0 (PLATFORM-08) |
| #384 | Filter Peta BMP memakai izin Peta Lahan | v1.8.0 |
| #410 | Pohon menu bisa terbaca tanpa login (judul/URL saja) | rendah, Backlog |
| TD-057 | Izin EXPORT Dashboard Rantai Pasok hanya menyembunyikan tombol (data CSV prototipe) | sampai versi DB #381 (v1.7.0) |
