# QA/QC v1.2.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.2.0 (MINOR — 2 menu baru: Tumpang Tindih Lahan, Sprint Mingguan) |
| Rentang | `v1.1.0..0ec7635` (`49` commit; `v1.1.0` = `6bae57e`) |
| Migrasi | **tidak ada** — seed menu per menu (`seed-menu-key.mjs`), lihat `00-scope.md` |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.2.0`)

_(belum ada run)_

## Keputusan

**Go / No-go:** … (tanggal, oleh siapa) — syarat: semua P0 Pass di staging.

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #390 | Email staf + password teks polos di `users.csv` (repo publik); akun yang belum dirotasi bisa dimasuki | Keputusan owner 2026-09-29 — rotasi oleh owner/DevOps, di luar rilis |
| #342 | Perubahan role/nonaktif baru berlaku setelah login ulang (izin menu); scope data sudah fail-closed sejak #252 | Tidak wajib setelah #364 memilih opsi (b) |
| #317 (sisa) | Tab Luar Boundary & Selisih Luas, guard upload, layer peta belum ada | Fase lanjutan |
