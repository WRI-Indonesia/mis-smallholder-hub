# QA/QC v1.5.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.5.0 (MINOR — fitur baru: peringatan tumpang tindih saat upload lahan, latar satelit GIBS, produktivitas disetahunkan; tanpa menu/tabel baru) |
| Rentang | `chore(release): v1.4.0` (`0530072`)..`mvp` (`28` commit per 2026-10-09) |
| Migrasi | **tidak ada** — tidak ada seed menu/izin; snapshot BMP **tidak** perlu dibuat ulang (penyetahunan dihitung dari seri bulanan yang sudah ada) |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.5.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-10-09-local.md | Smoke | 12 | 0 | 2 | 1 | 0 |
| 2026-10-09-local.md | Kasus uji | 8 | 0 | 2 | 0 | 0 |
| 2026-10-09-local.md | Regresi | 0 | 0 | 3 | 0 | 0 |
| 2026-10-09-staging.md | Smoke | 0 | 0 | 0 | 0 | 35 |
| 2026-10-09-staging.md | Kasus uji | 0 | 0 | 0 | 0 | 19 |
| 2026-10-09-staging.md | Regresi | 0 | 0 | 0 | 0 | 9 |

Run lokal (P0, SUPERADMIN, `mis-dev`): Blocked = butuh login OPERATOR/DONOR (SM-28/29, TC-317-04), unduhan Excel (TC-402-04), dan regresi area tak tersentuh — semuanya dialihkan ke run staging oleh owner.

## Keputusan

**Go** (2026-10-09, owner) — atas dasar run lokal P0 (20 Pass · 0 Fail · 7 Blocked) + data-qc staging ✓ + deploy staging hijau; uji browser staging peran OPERATOR/DONOR **tidak dijalankan** — kasus Blocked dibawa ke run prod `--only P0`. Syarat: pembaca dashboard diberi tahu bahwa angka produktivitas berubah (Ton/Ha → Ton/Ha/tahun).

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #366 | Detail Lahan APKASDU belum terisi | berkas sumber masih memakai ID lahan lama |
| #317 | Belum ada layer tumpang tindih di Peta Lahan (Fase 4) | v1.7.0 |
| TD-055 | Bulan yang baru terisi sebagian dihitung bulan penuh → produktivitas tahun berjalan bisa terbaca lebih rendah | batasan definisi; praktik "tahan bulan belum lengkap" tetap berlaku |
| TD-056 | Opsi "Semua …" di beberapa filter dashboard masih ikut tersaring pencarian (beda dengan peta/master data) | kerapian, P3 |
