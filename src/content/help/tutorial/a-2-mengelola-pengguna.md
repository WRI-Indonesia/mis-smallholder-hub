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

Menu ini biasanya hanya dipegang SUPERADMIN.

## Langkah

1. Buka menu **Settings → User Management**, lalu tambahkan pengguna baru.
2. Isi identitas dan kredensial masuknya.
3. Pilih **Peran** sesuai tugasnya.
+ OPERATOR untuk staf lapangan yang menginput data; ADMIN untuk koordinator wilayah; MANAGEMENT untuk yang hanya perlu membaca; DONOR untuk pihak donor/funder yang hanya melihat dashboard, laporan, dan peta (read-only, tanpa master data); SUPERADMIN hanya untuk pengelola sistem — peran ini melewati seluruh pembatasan.
4. Tetapkan **cakupan data**: distrik, atau Lembaga Petani tertentu.
+ Inilah yang membuat dua pengguna dengan peran sama melihat angka berbeda — dan itu memang dikehendaki. Bila cakupan dikosongkan, pengguna melihat seluruh data organisasi.
5. Simpan, lalu minta pengguna mencoba masuk.
6. Bila ada kebutuhan khusus, sesuaikan izin per menu lewat **Role & Permission**.
+ Pengaturan per pengguna menimpa pengaturan peran — berguna untuk pengecualian, tetapi bila dipakai berlebihan akan sulit ditelusuri. Ubah perannya bila polanya berulang untuk banyak orang.

> [!hati-hati] Menonaktifkan pengguna **tidak** menghapus data yang pernah ia input. Riwayat siapa membuat dan mengubah apa tetap tersimpan — memang begitu seharusnya untuk keperluan audit.

## Kalau bermasalah

**Pengguna baru melihat menu kosong** — perannya belum diberi izin menu apa pun, atau cakupan datanya kosong sehingga tak ada lembaga yang terlihat.

**Pengguna melihat lebih banyak data dari seharusnya** — cakupan datanya kosong. Isi distrik atau lembaga yang menjadi tanggung jawabnya.

**Angka dashboard pengguna berbeda dengan Anda** — normal. Setiap orang hanya melihat cakupannya sendiri.
