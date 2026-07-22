---
title: Halaman Lahan — arti kolom & tombol
icon: Map
menuKey: master-data-parcels
permission: VIEW
href: /admin/master-data/parcels
hrefLabel: Buka halaman Lahan
---

## Catatan penting

Halaman ini **tidak punya kartu ringkasan**. Angka Total Persil dan Total Luas ada di daftar **Lembaga Petani** dan di Main Dashboard.

Lahan yang diinput lewat form di halaman ini **tidak punya poligon**, sehingga tidak tampil di peta. Poligon hanya bisa masuk lewat unggah shapefile.

## Filter & pencarian

**Lembaga Petani** — mempersempit ke satu lembaga.

**Status** — hanya untuk SUPERADMIN.

**Kotak pencarian** — menelusuri ID Lahan, nama petani, dan ID Petani sekaligus.

## Kolom tabel

**ID Lahan** — nomor persil milik organisasi Anda. Unik untuk seorang petani, dan dipakai mencocokkan data produksi maupun shapefile.

**Petani** — pemilik/penggarap persil. Satu petani boleh punya banyak persil.

**Luas (ha)** — luas persil dalam hektar. Ini **penyebut** perhitungan produktivitas Ton/Ha di Dashboard BMP, jadi luas yang keliru membuat produktivitas ikut keliru meski data panennya benar.

**Status Kepemilikan** — Milik Sendiri, Sewa, atau Bagi Hasil. Sering diminta saat audit sertifikasi untuk memastikan hak garap jelas.

**Komoditas / Species** — jenis tanaman. Species diisi nama ilmiah bila diperlukan laporan teknis.

**PSR** — penanda lahan sedang diremajakan. Tanpa penanda ini, lahan PSR akan terbaca sebagai lahan bermasalah pada analisa ketersediaan data, padahal nol hasil memang wajar selama peremajaan.

**Tahun Tanam** — dasar memperkirakan umur tanaman. Sawit di bawah 4 tahun belum berbuah optimal; di atas 25 tahun hasilnya menurun.

**Kelompok Tani** — kelompok di bawah Lembaga Petani. Untuk sementara disimpan **per lahan**, belum sebagai tabel tersendiri. Tulis namanya persis sama untuk semua lahan di kelompok yang sama — beda satu spasi akan terhitung sebagai dua kelompok berbeda.

**Blok** — penanda blok kebun bila organisasi Anda memakainya.

**Revisi** — bertambah otomatis setiap data lahan diperbarui. Jejak riwayat, bukan kolom yang perlu diisi.
