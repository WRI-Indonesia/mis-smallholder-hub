# QA/QC v0.35.0

| | |
|---|---|
| Versi | v0.35.0 (MINOR — menu baru Report › Patok, 6 tabel/kolom baru, 5 enum, 5 migrasi) |
| Rentang | `fac9078` (v0.34.1, 2026-09-02) .. HEAD `mvp` — 32+ commit (#317 F1, #326–#332, review 2026-09-15, #336–#338, QA/QC v2, revisi owner `21dcd01` pintu kedua Laporan NKT + ikon Milestone, review pra-rilis #339) |
| Migrasi | **5** — `20260914100000_land_parcel_geom` · `…100100_land_parcel_border` · `…150000_land_parcel_nkt` · `…170000_land_marker` · `…200000_land_marker_code` (lihat #333) |
| Seed | menu `report-marker` + 16 izin — `scripts/seed/seed-menu-report-marker.mjs` (dry-run → `--apply`) |
| Run | lihat `runs/` — satu berkas per eksekusi (`node scripts/qa/new-run.mjs --version v0.35.0 --env staging`) |

Baseline dev (`mis-dev` = snapshot prod 2026-09-14 + 5 migrasi): smoke 7 halaman 2026-09-15 tanpa error konsol — HJP 559 lahan · 21 NKT · 1.015 patok · 62 patok NKT (Decision Log 2026-09-15). Smoke ulang pasca-review #339 (2026-09-15 sore): Laporan Lahan (Excel kolom Patok terisi — TC-REV-06), Peta Lahan, Detail Lembaga (Laporan NKT pintu kedua → PDF 7 hal.), Report › Patok, Bantuan 10.1 — tanpa error konsol; `data-qc.ts` A1–A6 · B8–B9 · C2 · C4 ✓.

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v0.35.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-09-15-prod.md | Smoke | 8 | 0 | 4 | 0 | 0 |
| 2026-09-15-prod.md | Kasus uji | 10 | 0 | 11 | 0 | 0 |
| 2026-09-15-prod.md | Regresi | 1 | 0 | 2 | 0 | 0 |

Run prod `--only P0` (2026-09-15 21:20–21:45, ≤ 1 jam setelah deploy): **19 Pass · 0 Fail · 17 Blocked**. Blocked = kasus yang **menulis** data (TC-PREP, import NKT, generate/unggah patok, form — prod tidak diisi data uji) atau butuh akun OPERATOR/DONOR/SUPERADMIN yang sesinya segar (#342). Kasus NKT/patok di prod terverifikasi pada empty state; verifikasi isi sudah dilakukan di `mis-dev` 2026-09-15 dan bisa diulang di staging (kode = v0.35.0, DB = 34 migrasi). Temuan: **#342** (role JWT beku — perilaku lama, bukan regresi). `data-qc.ts` prod A1–A6 · B8–B9 · C2 · C4 ✓.

## Keputusan

**Go / No-go:** **Go** (owner, 2026-09-15) — **tanpa run QA staging** (deploy staging OOM #340, diputuskan `mvp → main` langsung; lihat `05-signoff.md`). Pengganti: review rentang penuh #339, smoke `mis-dev`, `data-qc.ts` A–C ✓ di `mis-staging` & `mis-prod` pra-merge. Wajib setelah deploy prod: `node scripts/qa/new-run.mjs --version v0.35.0 --env prod --only P0`. 

## Known issues yang dibawa (kandidat)

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #334 | KPI Kelompok Tani = 0 untuk HJP & SSJ (KT NULL di semua lahan); kolom "KT / Blok" di Report Patok & Laporan NKT hanya berisi blok | Keputusan data (KT+Blok tergabung atau kode blok?) menunggu owner/lapangan |
| #335 | Detail Lembaga/Petani memuat seluruh titik patok di setiap render (HJP ±1.015) — latensi, bukan kesalahan angka | Perbaikan perf, pola lazy `getMapMarkers` |
| TD-041 | Tidak ada dampak pengguna — tiga salinan helper gambar peta PDF (Profil Lahan vs Laporan layer) yang bisa menyimpang | Menyatukannya mengubah render PDF → butuh verifikasi visual tersendiri (review #339) |
| TD-040 | Enum `INCLUDED` tetap di DB tetapi tersembunyi dari UI ("termasuk = terdampak") | Data prod 0 baris; migrasi kecil bila tetap tak dipakai |
