# 00 · Lingkup rilis v1.8.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Sumber: `git log <tag>..HEAD`, `gh issue list --state closed`, `docs/project/changelog/YYYY-MM.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #425 | Dashboard BMP: filter Semua Data / Data Full 1 Tahun dihapus | Dashboard › BMP Dashboard (Produksi) · Tools › Snapshot BMP | — | — | p-4, 3-1 | `TC-425-01` |
| 2 | #426 | Dashboard BMP: unduh Excel produktivitas per umur tanaman | Dashboard › BMP Dashboard (Produksi) | — | — (EXPORT `dashboard-bmp` sudah ada) | p-4, 3-1 | `TC-426-01..02` |
| 3 | #427 | Tombol Reset filter seragam + filter Produksi dari URL | 14 halaman ber-filter (Master Data · Report · Data Analyst · Dashboard Rantai Pasok · Settings › Role) · Master Data › Produksi | — | — | 2-1, 3-1, 3-3, l-7, p-6, p-16, p-18, p-19 | `TC-427-01..03` |
| 4 | #428 | Batas umur tanaman TBM < 3 thn, TM muda 3–8 thn | Dashboard › BMP Dashboard (Produksi) · Tools › Snapshot BMP | — | — | p-4, r-2, t-2 | `TC-428-01` |
| 5 | #424 (bagian kecil) | Penanda Estimasi dibuang | Data Analyst › Ketersediaan Data › Produksi · Kelengkapan Data | — | — | p-18, r-5, 3-3 | `TC-424-01` |
| 6 | #429 | Daftar Issue GitHub (List · Kalender · Tren · Kanban · Excel) | Platform Developer › **Daftar Issue** | — | `platform-developer-issues` (VIEW/EXPORT: SUPERADMIN · ADMIN · MANAGEMENT) | p-19 (baru), 3-4 | `TC-429-01..04` |
| 7 | #430 | `seed-menu-key.ts` jalan lagi | — (skrip rilis) | — | — | — | dipakai langsung saat seed menu staging/prod (prasyarat rilis); baseline `scripts-cjs.test.ts` |
| 8 | #431 | `/audit` 2026-10-12 F1–F5 (`modifiedBy`, rename modul, export mati, test penjaga) | Bulk Upload › Lahan · Profil (modifiedBy) · modul Report KT & Bulk Upload Petani (rename) | — | — | — (F4 Bantuan: revisi lahan dua jalur, kutipan error unggah, Bahan patok) | SM navigasi + unggah lahan; baseline test dev |
| 9 | #433 | Layer hutan & deforestasi (Kemenhut + EUDR/GFW) di Peta Lahan & Peta Rantai Pasok | Map › Peta Lahan · Peta Rantai Pasok (Peta Lainnya) · proxy `/api/map-overlay` | — | — (guard proxy + `map-supply-chain` VIEW) | p-5, p-17, 3-2 | `TC-433-01..04` |

## Di luar lingkup pengujian (sengaja)

- **Prod**: run P0 di prod dilakukan sesudah rilis (lembar run terpisah); generate ulang snapshot BMP prod (#428) sesudah deploy.
- **Akurasi isi layer EUDR/Kemenhut** (#433) — data pihak ketiga; yang diuji tampil, urutan, legenda/sumber, dan izin. Analisis per lahan = #434 (di luar rilis).
- **TC-433-03 jalur "hanya `map-supply-chain`"** — tak ada peran bawaan tanpa `map-parcel`; butuh override revoke `map-parcel` VIEW pada akun uji. Bila tak tersedia: N/A, baseline `map-overlay-route.test.ts`.
- **#430/#431** tanpa kasus uji sendiri — #430 teruji langsung oleh seed menu rilis, #431 perubahan internal (rename/`modifiedBy`) dijaga test dev.

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | | semua | migrasi/izin, Settings, halaman admin |
| OPERATOR ter-scope | | 1 Distrik | **seluruh** kasus uji fungsional (bug scope hanya terlihat dari sini) |
| DONOR | | — | smoke read-only, menu yang tidak boleh tampil |

## Persiapan data uji (`TC-PREP-*`, dijalankan sebelum run pertama)

Tabel baru kosong pasca-migrasi; kasus uji membutuhkan data yang **dibuat lewat aplikasi** agar jalur tulisnya ikut teruji. Berkas masukan disimpan di `scripts/local/QA-QC/v1.8.0/evidence/input/`.

### TC-PREP-01 · … [P0] (5 mnt)
Prasyarat: …
Langkah:
1. …
Harapan:
- …
