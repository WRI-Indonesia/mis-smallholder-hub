# 02 · Kasus uji per issue — v1.6.1

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

## #409 — Distrik tujuan Lembaga wajib dalam scope

Prasyarat umum: akun **ADMIN** yang dibatasi per distrik (UserDistrict/UserProvince) dan akun **ADMIN** yang dibatasi per Lembaga (UserFarmerGroup), keduanya ber-izin CREATE/EDIT Master Data › Lembaga Petani. Login akun dilakukan owner.

### TC-409-01 · ADMIN per distrik: buat & ubah Lembaga hanya di distrik scope [P0] [regresi] (4 mnt)
Langkah:
1. Master Data › Lembaga Petani → **Tambah Lembaga Petani**; buka dropdown Distrik.
2. Ubah satu Lembaga dalam scope; buka dropdown Distrik.
Harapan:
- Kedua dropdown hanya berisi distrik scope akun.
- Simpan dengan distrik scope berhasil; Lembaga tetap tampil di daftar.
- (Dev, tanpa UI) pemanggilan langsung dengan distrik di luar scope ditolak "Distrik tidak dalam akses Anda" — dijaga `farmer-group-guard.test.ts`.

### TC-409-02 · ADMIN per Lembaga: tanpa Tambah, Distrik terkunci [P1] (3 mnt)
Langkah:
1. Master Data › Lembaga Petani.
2. Klik pensil pada Lembaga milik akun.
Harapan:
- Tombol **Tambah Lembaga Petani** tidak tampil.
- Kolom Distrik di form ubah tampil sebagai teks terkunci (bukan dropdown); ubah nama lalu **Simpan** berhasil dan distrik tidak berubah.

