# 00 · Lingkup rilis v1.3.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Sumber: `git log <tag>..HEAD`, `gh issue list --state closed`, `docs/project/changelog/YYYY-MM.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #342 | Role & status aktif dibaca ulang dari DB (≤ 1 menit) | semua halaman admin, `/login` | — | — | `a-2` | `TC-342-01` |
| 2 | #390 | Seed akun fiktif + `SEED_USER_PASSWORD` | — (seed) | — | — | — | — |
| 3 | #277 · #394 | Guard `migrate status` deploy staging & prod | — (CI) | — | — | — | `TC-277-01` · `TC-394-01` |
| 4 | #376 | Cek jendela migrasi prod ↔ tag | — (skrip) | — | — | — | `TC-376-01` |
| 5 | #232 | Prosedur rollback | — (docs) | — | — | — | `TC-232-01` (→ v1.4.0) |
| 6 | #251 | Indeks `ProductionRecord (parcel_id, period)` | Map › Peta BMP · Report › Produksi · Detail Lahan · Bulk Upload › Produksi | `20260930120000_production_record_parcel_period_idx` | — | — | `TC-251-01` |
| 7 | #335 | Titik patok dimuat malas, KPI dari hitungan | Master Data › Lembaga Petani / Petani › detail | — | — | `3-2` | `TC-335-01` |
| 8 | #253 | Ringkasan Petani di SQL | Data Analyst › Ringkasan Petani | — | — | — | (unit test) |
| 9 | #320 | Memo izin tile basemap | Report › Lahan (cetak peta) | — | — | — | (unit test) |
| 10 | #366 | Validasi Bulk Upload Detail Lahan | Bulk Upload › Lahan › Detail Lahan | — | — | `u-5` | (unit test) |
| 11 | #392 | Metrik Rilis per baseline roadmap | Data Analyst › Metrik Rilis | — | — | `p-8` | `TC-392-01…03` |
| 12 | #396 | Rencana Pengembangan per rilis + `/pagi` | Data Analyst › Rencana Pengembangan | — | label `data-analyst-sprint` | `p-15` · `1-3` · `a-2` · `3-3` | `TC-396-01` |

## Di luar lingkup pengujian (sengaja)

- Butir yang digeser ke v1.4.0 (#354 · #317 · #290 · #319 · #315 · #310 · sisa #366 · rotasi #390).
- #393 (docs roadmap) dan #363 (RAM staging, infrastruktur).

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | | semua | migrasi/izin, Settings, halaman admin |
| OPERATOR ter-scope | | 1 Distrik | **seluruh** kasus uji fungsional (bug scope hanya terlihat dari sini) |
| DONOR | | — | smoke read-only, menu yang tidak boleh tampil |

## Persiapan data uji (`TC-PREP-*`, dijalankan sebelum run pertama)

Tabel baru kosong pasca-migrasi; kasus uji membutuhkan data yang **dibuat lewat aplikasi** agar jalur tulisnya ikut teruji. Berkas masukan disimpan di `scripts/local/QA-QC/v1.3.0/evidence/input/`.

### TC-PREP-01 · … [P0] (5 mnt)
Prasyarat: …
Langkah:
1. …
Harapan:
- …
