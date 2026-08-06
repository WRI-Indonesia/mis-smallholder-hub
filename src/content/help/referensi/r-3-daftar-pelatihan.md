---
title: Halaman Pelatihan — arti kolom & tombol
icon: GraduationCap
menuKey: master-data-training
permission: VIEW
href: /admin/master-data/training
hrefLabel: Buka halaman Pelatihan
---

## Kartu ringkasan

**Total Lembaga Petani** — banyaknya lembaga yang punya sesi pada hasil filter saat ini.

**Total Sesi Training** — jumlah sesi, bukan jumlah orang.

**Total Peserta** — jumlah **kehadiran**. Seorang petani yang mengikuti tiga sesi dihitung tiga kali.

**Total Peserta Unik** — jumlah **orang** berbeda. Selisihnya dengan Total Peserta menunjukkan seberapa sering peserta yang sama mengikuti beberapa sesi.

## Filter

**Distrik**, **Lembaga Petani**, **Paket Pelatihan** — mempersempit daftar. Pilihan Lembaga ikut menyempit bila Distrik sudah dipilih. **Status** hanya untuk SUPERADMIN.

**Kotak pencarian** — menelusuri lokasi, catatan, nama lembaga, dan nama paket.

## Kolom tabel

**Paket Pelatihan** — menentukan kolom mana yang terisi di matriks cakupan Dashboard Pelatihan. Bila satu hari memuat dua modul dari paket berbeda, catat sebagai dua sesi agar cakupan tiap paket terhitung benar.

**Lembaga Petani** — pemilik sesi. Pesertanya **hanya boleh anggota lembaga ini**; sistem menolak peserta dari lembaga lain. Aturan inilah yang membuat angka cakupan tidak mungkin melebihi 100%.

**Tanggal Pelatihan** — tanggal pelaksanaan sebenarnya, bukan tanggal input. Menentukan sesi masuk tahun mana di dashboard.

**Lokasi** — tempat sesi. Bila kosong akan muncul sebagai temuan di panel Kualitas Data.

**Catatan** — keterangan bebas: rentang sesi beberapa hari (tanggal yang tercatat = hari pertama, misalnya `Sesi 3 hari: 11-13 November 2023`) atau pembeda dua kegiatan Paket 1 pada tanggal yang sama (`Modul BMP` vs `Modul PNC & NKT`).

**Total Peserta** — jumlah petani yang tercatat hadir di sesi itu. Nol berarti sesinya sudah dicatat tetapi daftar hadirnya belum dimasukkan.

## Halaman detail sesi

**Peserta Pelatihan** — daftar hadir. **Tambah Peserta** hanya menampilkan anggota lembaga penyelenggara.

**Pre-Test / Post-Test** — boleh dikosongkan. Panel efektivitas dan kelulusan di Dashboard Pelatihan hanya menghitung peserta yang **kedua** skornya terisi; mengisi pre saja membuat peserta itu tidak masuk hitungan kenaikan skor maupun kelulusan (post-test ≥ 60).

**Evidence** — notulen PDF maksimal 10 MB, disimpan di penyimpanan privat dan hanya bisa dibuka lewat tautan bertanda tangan. Sesi tanpa bukti terhitung di panel Kualitas Data.

**Hapus Terpilih** — mengeluarkan peserta yang tercentang dari sesi.
