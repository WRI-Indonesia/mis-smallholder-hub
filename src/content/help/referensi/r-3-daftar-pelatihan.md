---
title: Halaman Pelatihan — arti kolom & tombol
icon: GraduationCap
menuKey: master-data-training
permission: VIEW
href: /admin/master-data/training
hrefLabel: Buka halaman Pelatihan
---

## Kartu ringkasan

**Total Lembaga Petani** — banyaknya lembaga yang punya kegiatan pada hasil filter saat ini.

**Total Kegiatan Training** — jumlah kegiatan, bukan jumlah orang.

**Total Peserta** — jumlah **kehadiran**. Seorang petani yang mengikuti tiga kegiatan dihitung tiga kali.

**Total Peserta Unik** — jumlah **orang** berbeda. Selisihnya dengan Total Peserta menunjukkan seberapa sering peserta yang sama mengikuti beberapa kegiatan.

## Filter

**Distrik**, **Lembaga Petani**, **Paket Pelatihan** — mempersempit daftar. **Status** hanya untuk SUPERADMIN.

**Kotak pencarian** — menelusuri lokasi, nama lembaga, dan nama paket.

## Kolom tabel

**Paket Pelatihan** — menentukan kolom mana yang terisi di matriks cakupan Dashboard Pelatihan. Bila satu hari memuat dua modul dari paket berbeda, catat sebagai dua kegiatan agar cakupan tiap paket terhitung benar.

**Lembaga Petani** — pemilik kegiatan. Pesertanya **hanya boleh anggota lembaga ini**; sistem menolak peserta dari lembaga lain. Aturan inilah yang membuat angka cakupan tidak mungkin melebihi 100%.

**Tanggal Pelatihan** — tanggal pelaksanaan sebenarnya, bukan tanggal input. Menentukan kegiatan masuk tahun mana di dashboard.

**Lokasi** — tempat kegiatan. Bila kosong akan muncul sebagai temuan di panel Kualitas Data.

**Total Peserta** — jumlah petani yang tercatat hadir di kegiatan itu. Nol berarti kegiatannya sudah dicatat tetapi daftar hadirnya belum dimasukkan.

## Halaman detail kegiatan

**Peserta Pelatihan** — daftar hadir. **Tambah Peserta** hanya menampilkan anggota lembaga penyelenggara.

**Pre-Test / Post-Test** — boleh dikosongkan. Panel efektivitas di Dashboard Pelatihan hanya menghitung peserta yang **kedua** skornya terisi; mengisi pre saja membuat peserta itu tidak masuk hitungan kenaikan skor.

**Evidence** — notulen PDF maksimal 10 MB, disimpan di penyimpanan privat dan hanya bisa dibuka lewat tautan bertanda tangan. Kegiatan tanpa bukti terhitung di panel Kualitas Data.

**Hapus Terpilih** — mengeluarkan peserta yang tercentang dari kegiatan.
