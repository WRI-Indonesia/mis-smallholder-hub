# QA/QC v1.5.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.5.0 (MINOR — fitur baru: peringatan tumpang tindih saat upload lahan, latar satelit GIBS, produktivitas disetahunkan; tanpa menu/tabel baru) |
| Rentang | `chore(release): v1.4.0` (`0530072`)..`mvp` (`28` commit per 2026-10-09) |
| Migrasi | **tidak ada** — tidak ada seed menu/izin; snapshot BMP **tidak** perlu dibuat ulang (penyetahunan dihitung dari seri bulanan yang sudah ada) |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.5.0`)

_(belum ada run)_

## Keputusan

**Go / No-go:** … (tanggal, oleh siapa) — syarat: run staging semua P0 Pass; pembaca dashboard diberi tahu bahwa angka produktivitas berubah (Ton/Ha → Ton/Ha/tahun).

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #366 | Detail Lahan APKASDU belum terisi | berkas sumber masih memakai ID lahan lama |
| #317 | Belum ada layer tumpang tindih di Peta Lahan (Fase 4) | v1.7.0 |
| TD-055 | Bulan yang baru terisi sebagian dihitung bulan penuh → produktivitas tahun berjalan bisa terbaca lebih rendah | batasan definisi; praktik "tahan bulan belum lengkap" tetap berlaku |
| TD-056 | Opsi "Semua …" di beberapa filter dashboard masih ikut tersaring pencarian (beda dengan peta/master data) | kerapian, P3 |
