# 00 · Lingkup rilis v0.38.0

Sumber: `git log 57dc846..HEAD` (v0.37.0 → `mvp`), `gh issue list --state closed`, `docs/project/changelog.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #343 | Profil Petani (PDF): ringkasan petani (identitas, 5 kartu, Daftar Lahan bernomor, peta sebaran, pelatihan, produksi + rekap per lahan, Monev BMP + radar) + lampiran Profil Lahan per lahan; tombol header Detail Petani & aksi baris Daftar Petani; dialog Lengkap/Ringkasan bila lahan > 10 | Master Data › **Petani** (daftar + detail) · PDF Profil Lahan (kolom patok "Patok Bersama Lahan Tetangga") | — | — (izin PRINT `master-data-farmers` yang sudah ada; section Monev BMP ikut VIEW `master-data-bmp-monev`) | `l-9` baru + 2-1 · r-1 · t-1 · a-3 · t-6 | `TC-343-01…05` |
| 2 | #360 | Dashboard Monev BMP: "Menerapkan BMP" = Perintis + Praktisi + Teladan; tooltip arti kategori di ubin; kegiatan 1.1 → Knowledge | Dashboard › **Monev BMP** · Master Data › **Monev BMP** (KPI Rerata Skor) | — | — | p-13 · t-8 | `TC-360-01…02` |
| 3 | seed | `bmp-indicators.csv`: nama kegiatan 1.1 "Training (Petani dan Pekerja)" → "Knowledge (Petani dan Pekerja)" (2 baris) — `scripts/seed/seed-bmp-indicators.ts --apply` per env | radar/label kegiatan di Dashboard & detail Monev BMP, PDF Profil Petani | — | seed parsial indikator (mis-dev ✓ 2026-09-21; **staging & prod saat deploy**) | — | `TC-SEED-01` |

## Di luar lingkup pengujian (sengaja)

- Fitur lanjutan #343 yang dipisah: cetak massal Profil Petani (ZIP), Profil Lembaga (PDF), slot foto petani (TD-017) — belum dibangun.
- Deploy staging/prod — QA ini **lokal** (`mis-dev`); run staging/prod menyusul setelah issue deploy rilis dibuat.
- Unduhan berkas (PDF) hanya bila izin unduh browser tersedia; bila tidak → **Blocked** dengan catatan.

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | | semua | migrasi/izin, Settings, halaman admin |
| OPERATOR ter-scope | | 1 Distrik | **seluruh** kasus uji fungsional (bug scope hanya terlihat dari sini) |
| DONOR | | — | smoke read-only, menu yang tidak boleh tampil |

## Persiapan data uji (`TC-PREP-*`, dijalankan sebelum run pertama)

Tabel baru kosong pasca-migrasi; kasus uji membutuhkan data yang **dibuat lewat aplikasi** agar jalur tulisnya ikut teruji. Berkas masukan disimpan di `scripts/local/QA-QC/v0.38.0/evidence/input/`.

### TC-PREP-01 · … [P0] (5 mnt)
Prasyarat: …
Langkah:
1. …
Harapan:
- …
