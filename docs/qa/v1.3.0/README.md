# QA/QC v1.3.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.3.0 (MINOR — perubahan fitur Data Analyst: Rencana Pengembangan per rilis, Metrik Rilis per baseline; tanpa menu baru, tanpa langkah manual bagi operator) |
| Rentang | `v1.2.0..chore(release): v1.3.0` (±51 commit; `v1.2.0` = `28319b7` di `main`, `9b95dee` di `mvp`) |
| Migrasi | **ada** — `20260930120000_production_record_parcel_period_idx` (indeks saja, kompatibel mundur); applied `mis-staging` & `mis-prod` 2026-09-30 sebelum merge. Seed label menu `data-analyst-sprint` sesudah deploy prod |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.3.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-09-30-staging.md | Smoke | 0 | 0 | 0 | 0 | 0 |
| 2026-09-30-staging.md | Kasus uji | 4 | 0 | 1 | 1 | 5 |
| 2026-09-30-staging.md | Regresi | 0 | 0 | 0 | 0 | 0 |

_Semua Fail sudah merujuk issue._

Run `2026-09-30-staging` (Claude, sesi SUPERADMIN + log/skrip; TC-342-01 dijalankan owner): **0 Fail**. "Belum diisi" = kasus _(sebagian)_ — langkah per peran (OPERATOR/ber-scope), layar sempit, dan Bulk Upload belum dijalankan; TC-232-01 Blocked (digeser ke v1.4.0); TC-394-01 = deploy prod rilis ini. Smoke per peran & regresi tidak dijalankan. Temuan: 1 minor (label grafik test terpotong pada rentang 1 Minggu, defer).

## Keputusan

**Go / No-go:** **Go** — owner, 2026-09-30 ("lanjut migrasi prod" sesudah TC-342-01 lulus; rilis lebih awal dari target, sisa → v1.4.0). Syarat: migrasi prod applied + snapshot checksum ✅; seed label menu prod sesudah deploy; run prod `--only P0` ≤ 1 jam sesudah deploy (owner).

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #390 | Akun staging/prod yang masih memakai password seed lama (pernah terbuka di repo publik) belum dirotasi | Owner/DevOps — digeser ke v1.4.0 |
| #232 | Rollback aplikasi di staging belum pernah diuji (prosedur & jalur migrasi sudah) | Butuh dua deploy tambahan — v1.4.0 |
| #366 (sisa) | Surat/STDB/luas Detail Lahan Siak belum diimport; import manual berkas Siak kini menolak baris m²/`||` dengan pesan jelas | Skrip penyiapan — v1.4.0 |
| #251 (sisa) | Indeks diukur pada data sintetis; pengukuran di prod menunggu import produksi besar | Tunggu data |
| QA #1 (minor) | Label "+495 (v1.2.0)" terpotong di grafik Jumlah test pada rentang 1 Minggu | Kosmetik |
