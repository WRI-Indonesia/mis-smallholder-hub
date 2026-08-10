---
title: Menambah wilayah administratif
icon: Map
menuKey: settings-regions
permission: CREATE
duration: 4
href: /admin/settings/regions
hrefLabel: Buka Region Management
goal: Wilayah yang tadinya tidak ada di pilihan (distrik, kecamatan, atau desa) kini bisa dipilih di formulir petani, lembaga, dan cakupan akses.
---

## Sebelum mulai

Wilayah tersusun empat tingkat: **Provinsi → Distrik → Kecamatan → Desa / Kelurahan**. Formulir lain di sistem hanya menawarkan wilayah yang sudah terdaftar **dan aktif** di halaman ini.

+ Menu ini biasanya hanya dipegang SUPERADMIN. Kalau saat mengisi alamat petani desanya tidak ada di pilihan, dari sinilah desa itu ditambahkan — pada kecamatan induk yang benar.

## Langkah

1. Buka menu **Settings → Regions**.
2. Pastikan wilayahnya benar-benar belum ada lewat kotak **Cari nama atau kode...**.
+ Pencarian mencocokkan nama dan kode di semua tingkat, dan induk dari hasil yang cocok terbuka otomatis. Set juga filter status ke **Semua Status** — bisa jadi wilayahnya sudah ada tetapi nonaktif (barisnya tampak redup).
3. Bentangkan pohon sampai baris induknya, lalu klik ikon tambah di kolom **Aksi** — misalnya **Tambah Desa** pada baris kecamatannya.
+ Provinsi baru ditambah lewat tombol **Tambah Provinsi** di kanan atas. Baris desa tidak punya ikon tambah karena desa adalah tingkat terakhir.
4. Isi **Kode** dan **Nama**, lalu klik **Simpan**.
+ Gunakan kode wilayah resmi (mis. `3201`) dan ejaan nama yang baku agar konsisten dengan data pemerintah dan tidak menimbulkan kembaran beda ejaan.
5. Periksa hasilnya di formulir yang tadi membutuhkannya — wilayah baru kini muncul sebagai pilihan.

> [!hati-hati] Jangan membuat wilayah kembar dengan ejaan berbeda. Data petani yang menunjuk dua baris wilayah untuk tempat yang sama akan terpecah di daftar, laporan, dan peta.

## Kalau bermasalah

**Wilayah tidak muncul di formulir lain** — pastikan statusnya **Aktif**. Cari dengan filter **Semua Status**, lalu aktifkan kembali lewat ikon di kolom Aksi.

**Tombol atau ikon tambah tidak tampil** — akun Anda tidak punya izin CREATE untuk menu ini; hubungi SUPERADMIN.

**Salah ketik kode atau nama** — perbaiki lewat ikon pensil (**Edit**) pada barisnya. Jangan membuat baris baru untuk mengganti yang salah.

**Terlanjur dobel** — nonaktifkan baris yang keliru agar tidak terpilih lagi, dan pindahkan data yang sudah menunjuk ke sana lewat menu masing-masing.
