# QA/QC v0.35.0

| | |
|---|---|
| Versi | v0.35.0 (MINOR — menu baru Report › Patok, 6 tabel/kolom baru, 5 enum, 5 migrasi) |
| Rentang | `fac9078` (v0.34.1, 2026-09-02) .. HEAD `mvp` — 26 commit (#317 F1, #326–#332, review 2026-09-15, #336–#338) |
| Migrasi | **5** — `20260914100000_land_parcel_geom` · `…100100_land_parcel_border` · `…150000_land_parcel_nkt` · `…170000_land_marker` · `…200000_land_marker_code` (lihat #333) |
| Seed | menu `report-marker` + 16 izin — `scripts/seed/seed-menu-report-marker.mjs` (dry-run → `--apply`) |
| Run | lihat `runs/` — satu berkas per eksekusi (`node scripts/qa/new-run.mjs --version v0.35.0 --env staging`) |

Baseline dev (`mis-dev` = snapshot prod 2026-09-14 + 5 migrasi): smoke 7 halaman 2026-09-15 tanpa error konsol — HJP 559 lahan · 21 NKT · 1.015 patok · 62 patok NKT (Decision Log 2026-09-15).

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v0.35.0`)

_(belum ada run)_

## Keputusan

**Go / No-go:** — 

## Known issues yang dibawa (kandidat)

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #334 | KPI Kelompok Tani = 0 untuk HJP & SSJ (KT NULL di semua lahan); kolom "KT / Blok" di Report Patok & Laporan NKT hanya berisi blok | Keputusan data (KT+Blok tergabung atau kode blok?) menunggu owner/lapangan |
| #335 | Detail Lembaga/Petani memuat seluruh titik patok di setiap render (HJP ±1.015) — latensi, bukan kesalahan angka | Perbaikan perf, pola lazy `getMapMarkers` |
| TD-040 | Enum `INCLUDED` tetap di DB tetapi tersembunyi dari UI ("termasuk = terdampak") | Data prod 0 baris; migrasi kecil bila tetap tak dipakai |
