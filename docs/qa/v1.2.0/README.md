# QA/QC v1.2.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.2.0 (MINOR — 2 menu baru: Tumpang Tindih Lahan, Sprint Mingguan) |
| Rentang | `v1.1.0..0ec7635` (`49` commit; `v1.1.0` = `6bae57e`) |
| Migrasi | **tidak ada** — seed menu per menu (`seed-menu-key.mjs`), lihat `00-scope.md` |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.2.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-09-29-local.md | Smoke | 6 | 0 | 0 | 0 | 27 |
| 2026-09-29-local.md | Kasus uji | 22 | 0 | 0 | 0 | 0 |
| 2026-09-29-local.md | Regresi | 0 | 0 | 0 | 0 | 9 |

_Semua Fail sudah merujuk issue._

Run `2026-09-29-local`: seluruh **22 kasus uji Pass** (lintas SUPERADMIN, ADMIN ber-scope Lembaga + override Menu Management, OPERATOR Rokan Hulu, DONOR). Smoke: 6 Pass, 8 sebagian (halaman & scope dicek, unduhan/aksi lengkap belum), sisanya belum; regresi belum dijalankan — keduanya untuk run staging.

## Keputusan

**Go / No-go:** … (tanggal, oleh siapa) — syarat: semua P0 Pass di staging.

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #390 | Email staf + password teks polos di `users.csv` (repo publik); akun yang belum dirotasi bisa dimasuki | Keputusan owner 2026-09-29 — rotasi oleh owner/DevOps, di luar rilis |
| #342 | Perubahan role/nonaktif baru berlaku setelah login ulang (izin menu); scope data sudah fail-closed sejak #252 | Tidak wajib setelah #364 memilih opsi (b) |
| #317 (sisa) | Tab Luar Boundary & Selisih Luas, guard upload, layer peta belum ada | Fase lanjutan |
