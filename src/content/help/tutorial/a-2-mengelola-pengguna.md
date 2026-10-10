---
title: Menambah pengguna & mengatur haknya
icon: Shield
menuKey: settings-users
permission: CREATE
duration: 8
href: /admin/settings/users
hrefLabel: Buka User Management
goal: Satu akun baru bisa masuk dan hanya melihat data yang menjadi tanggung jawabnya.
---

## Sebelum mulai

Hak akses seorang pengguna ditentukan **dua lapis** yang bekerja bersama:

+ **Peran** menentukan *menu apa* yang bisa dibuka (Petani, Laporan, Tools, dan seterusnya). **Cakupan data** menentukan *data siapa* yang terlihat di dalam menu itu — dibatasi per distrik atau per Lembaga Petani. Peran tanpa cakupan berarti melihat seluruh data; itu jarang yang diinginkan untuk staf lapangan.

Menu ini hanya dipegang SUPERADMIN — peran lain, termasuk ADMIN, tidak punya izin di menu Settings.

## Langkah

1. Buka menu **Settings → User Management**, lalu klik **Tambah User**.
2. Isi **Nama**, **Email**, dan **Password**.
3. Pilih **Role** sesuai tugasnya, lalu klik **Buat**.
+ ADMIN untuk yang menginput dan mengunggah data (tanpa hak menonaktifkan data master — itu dipegang SUPERADMIN; pengecualiannya mengosongkan angka di Target Program); OPERATOR dan MANAGEMENT hanya membaca, mengunduh, dan mencetak (tanpa input, tanpa Bulk Upload); MANAGEMENT juga melihat Metrik Rilis, Peta Data & Skema, dan Rencana Pengembangan; DONOR untuk pihak donor/funder yang hanya melihat dan mencetak (read-only, tanpa unduh Excel): dashboard, peta, laporan Petani/Pelatihan/Produksi/Lahan, dan master data Lembaga, Petani, Pelatihan, Lahan, dan Monev BMP; SUPERADMIN hanya untuk pengelola sistem — peran ini melewati seluruh pembatasan.
4. Klik ikon **Akses Data** pada baris pengguna itu, lalu tetapkan **cakupan data**: provinsi, distrik, atau Lembaga Petani tertentu.
+ Inilah yang membuat dua pengguna dengan peran sama melihat angka berbeda — dan itu memang dikehendaki. Bila cakupan dikosongkan, pengguna melihat seluruh data organisasi.
+ Perubahan di dialog ini langsung tersimpan; ringkasannya tampil di bagian **Ringkasan Akses** ("Belum dibatasi (akses semua data)" berarti cakupan masih kosong).
5. Minta pengguna mencoba masuk.
6. Bila ada kebutuhan khusus untuk satu orang, klik ikon **Hak Akses Menu** pada barisnya untuk memberi atau mencabut izin menu tertentu.
+ Pengaturan per pengguna menimpa pengaturan peran — berguna untuk pengecualian, tetapi bila dipakai berlebihan akan sulit ditelusuri. Ubah perannya bila polanya berulang untuk banyak orang.
+ Izin bawaan per peran diatur di **Settings → Role & Permission**. Di matriks itu Anda bisa memilih role yang ditampilkan, mencari menu, serta membuka/menutup kelompok menu. Ikon daftar-ceklis di tiap baris membuka pilihan **preset** (Lihat saja · Lihat + Unduh · Akses penuh · Kosongkan) untuk menyetel seluruh izin menu itu sekaligus — dengan opsi ikut diterapkan ke sub-menunya. SUPERADMIN tidak ditampilkan karena selalu berakses penuh.

> [!hati-hati] Menonaktifkan pengguna **tidak** menghapus data yang pernah ia input. Riwayat siapa membuat dan mengubah apa tetap tersimpan — memang begitu seharusnya untuk keperluan audit.

## Kalau bermasalah

**Pengguna baru melihat menu kosong** — perannya belum diberi izin menu apa pun, atau izinnya dicabut lewat **Hak Akses Menu**.

**Pengguna melihat lebih banyak data dari seharusnya** — cakupan datanya kosong. Isi distrik atau lembaga yang menjadi tanggung jawabnya.

**Perubahan peran belum terasa, atau akun yang dinonaktifkan masih terbuka** — peran dan status aktif diperiksa ulang paling lama **1 menit** sekali. Setelah itu menu mengikuti peran baru saat halaman dimuat ulang, dan akun nonaktif otomatis keluar ke halaman login. Pengguna tidak perlu keluar lalu masuk lagi.

**Angka dashboard pengguna berbeda dengan Anda** — normal. Setiap orang hanya melihat cakupannya sendiri.

**Muncul "Tidak dapat mengubah … akun Anda sendiri"** — demi keamanan, tidak seorang pun bisa mengubah peran, status aktif, cakupan data, atau hak akses menu akunnya sendiri (nama, email, dan password tetap bisa). Minta pengelola lain yang melakukannya.

**Muncul "Hanya SUPERADMIN yang dapat …"** — memberi peran SUPERADMIN serta mengubah atau menonaktifkan akun SUPERADMIN hanya bisa dilakukan oleh SUPERADMIN.

**Muncul "Wilayah atau Lembaga di luar akses Anda" / "Tidak dapat mencabut penugasan terakhir"** — pengelola yang wilayahnya dibatasi hanya bisa memberi cakupan di dalam wilayahnya sendiri, dan tidak bisa mencabut cakupan terakhir seseorang (pengguna tanpa cakupan justru melihat semua data).
