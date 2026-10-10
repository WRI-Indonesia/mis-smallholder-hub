# 02 · Kasus uji per issue — v1.6.1

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

## #386 — Anti-eskalasi Settings › Users & Role & Permission

### TC-386-01 · Akun sendiri terkunci di User Management [P0] [regresi] (3 mnt)
Prasyarat: login SUPERADMIN.
Langkah:
1. Settings › User Management → cari akun sendiri.
2. Klik **Edit** pada akun sendiri.
Harapan:
- Baris akun sendiri hanya punya **Edit** (tanpa Nonaktifkan, Akses Data, Hak Akses Menu); baris akun lain lengkap.
- Di form Edit, Role tampil sebagai teks terkunci; ubah nama lalu **Simpan** berhasil dan role tidak berubah.

### TC-386-02 · Pengelola ber-scope & Role & Permission [P1] (4 mnt)
Prasyarat: akun non-SUPERADMIN yang diberi izin Settings › Users / Role & Permission lewat override (opsional; bila tidak ada, cukup diwakili test `user-escalation-guard.test.ts`).
Langkah:
1. Akun ber-scope distrik membuka Settings › User Management.
2. Akun ADMIN tanpa batasan wilayah mencoba mengubah satu sel di Role & Permission.
Harapan:
- Langkah 1: halaman gagal memuat daftar dengan pesan "Pengelolaan pengguna hanya untuk akun tanpa batasan wilayah".
- Langkah 2: sel kembali seperti semula + pemberitahuan "Hanya SUPERADMIN yang dapat mengubah Role & Permission".

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

