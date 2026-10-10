# 00 · Lingkup rilis v1.6.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Sumber: `git log 59f703e..ffd70ac` (dari `chore(release): v1.5.0` di `mvp`), `/scope` & wrap-up 2026-10-10, `docs/project/changelog/2026-10.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #381 (prototipe) | Dashboard Rantai Pasok: tab Diagram Alur · Jalur · Tabel Pohon, chip filter global, tampilan bawaan Distrik · Per jenis · UL/Non-UL · Ton, Volume per Mill & per Lembaga, **Unduh Excel 3 sheet** | Dashboard › Rantai Pasok | — | — (tombol Excel memakai izin EXPORT yang sudah ada) | `p-16` | `TC-381-01…04` |
| 2 | #381 (prototipe) | Peta Rantai Pasok dirombak: panel lipat, garis lengkung beranimasi, hover, popup Jadikan filter · Lihat di Dashboard, kontrol kanan atas, legenda strip, tak tergambar bernama | Map › Peta Rantai Pasok | — | — | `p-17` | `TC-381-05…08` |
| 3 | #382 (prototipe) | Sorotan: konsentrasi Mill, ketergantungan ≥ 80% ke pembeli luar, kepastian Mill, jarak garis lurus; kolom Jarak | Dashboard › Rantai Pasok · Map › Peta Rantai Pasok (popup) | — | — | `p-16` `p-17` | `TC-382-01…03` |
| 4 | #406 | Istilah "petani aktif" → "petani terdaftar" (teks saja; judul kolom Excel Monev BMP berubah) | Dashboard › Pelatihan · Monev BMP · Data Analyst › Kelengkapan & Ketersediaan Data | — | — | `3-1` `l-4` `p-1` `p-13` `p-2` `p-7` `p-9` | smoke SM menu terkait (cek teks + header Excel Monev BMP) |

## Di luar lingkup pengujian (sengaja)

- Supply Chain versi DB (#380 model + import, #381/#382 final) → **v1.7.0**. Halaman Rantai Pasok di rilis ini tetap **prototipe CSV** (bukan DB).
- #366 sisa APKASDU (menunggu berkas ber-ID baru) → v1.7.0.
- Tidak ada migrasi, seed, atau menu/izin baru → `rbac:compare` diharapkan tanpa selisih baru.

## Prasyarat server

- Tabel CSV prototipe tersedia di S3 dev (staging) / S3 prod (`<bucket>/prototype/supply-chain/`). Format tabel **tidak berubah** sejak v1.5.0 (`src/lib/supply-chain-tables.ts` tak tersentuh) → tak perlu unggah ulang; cukup pastikan Dashboard Rantai Pasok tidak menampilkan "Data prototipe rantai pasok belum tersedia".

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | | semua | semua kasus Rantai Pasok + Unduh Excel |
| OPERATOR ter-scope | | 1 Distrik | Dashboard & Peta Rantai Pasok hanya memuat Lembaga dalam scope; Unduh Excel tersedia |
| DONOR | | — | **TC-381-04**: tombol Unduh Excel tidak tampil; halaman tetap terbaca |

## Persiapan data uji (`TC-PREP-*`)

Tidak ada — semua kasus memakai data prototipe CSV 2025 yang sudah ada.
