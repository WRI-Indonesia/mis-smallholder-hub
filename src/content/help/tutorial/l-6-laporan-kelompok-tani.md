---
title: Mencetak Laporan Kelompok Tani
icon: ListChecks
menuKey: report-kelompok-tani
permission: VIEW
duration: 7
href: /admin/report/kelompok-tani
hrefLabel: Buka Laporan Kelompok Tani
goal: Rekap Kelompok Tani lintas lembaga (Ringkasan) atau roster anggota per KT satu lembaga (Detail), terunduh sebagai Excel atau PDF.
---

## Sebelum mulai

Ada dua menu laporan Kelompok Tani dengan tujuan berbeda: **Ringkasan** untuk rekap jumlah lintas lembaga, **Detail** untuk daftar nama anggota per KT dalam satu lembaga — misalnya untuk verifikasi keanggotaan atau daftar hadir.

Kelompok Tani di sini dibaca dari **data lahan** (field Kelompok Tani pada tiap persil), bukan dari daftar tersendiri.

+ Konsekuensinya: petani yang belum punya lahan aktif tidak muncul di kedua laporan ini, dan lahan yang field Kelompok Tani-nya kosong dikelompokkan sebagai baris "(tidak diketahui)" di urutan paling bawah. Penulisan nama dinormalkan — "KT Melati" dan "kt melati" dihitung satu KT.

## Langkah

1. Buka menu **Report → Kelompok Tani (Ringkasan)**. Data langsung dimuat tanpa tombol.
2. Persempit dengan filter **Distrik** dan **Lembaga Petani** bila perlu — keduanya opsional.
3. Baca lima kartu ringkasan, lalu tabelnya: satu baris per pasangan Lembaga × KT, dengan jumlah petani, lahan, dan luas.
+ Kotak **Cari** menyaring baris berdasarkan nama lembaga/KT; baris "Total" di bawah tabel mengikuti hasil pencarian, sedangkan kartu di atas tetap menghitung semuanya — jadi keduanya bisa berbeda saat pencarian aktif.
4. Unduh lewat **Excel** atau **PDF**.
+ Hasil unduhan mengikuti pencarian dan pengaturan kolom yang sedang aktif. Kosongkan kotak Cari dulu bila ingin berkas lengkap.
5. Untuk roster anggota, buka **Report → Kelompok Tani (Detail)** lalu pilih **Lembaga Petani** (wajib).
+ Tampil satu seksi per KT yang bisa dibuka-tutup (ada tombol "Buka semua"), berisi tabel petani beserta ID, jumlah lahan, dan luas. Unduhan Excel/PDF selalu memuat seluruh roster, terlepas seksi mana yang sedang terbuka.

> [!penting] Satu petani yang lahannya tercatat di dua KT berbeda muncul di kedua seksi (lahannya dipecah per KT). Karena itu menjumlahkan angka per seksi bisa melebihi kartu Total Petani, yang menghitung orang unik.

## Kalau bermasalah

**Muncul KT dengan nama aneh seperti "Blok 1"** — operator mengetikkan nama blok ke field Kelompok Tani saat input lahan. Perbaiki di Master Data → Lahan (atau lewat unggah ulang shapefile), bukan di laporan; laporan langsung mengikuti begitu datanya dibetulkan.

**Ada petani yang tidak muncul** — ia belum punya lahan aktif. Gunakan **Ringkasan Petani → tab Petani Tanpa Lahan** untuk menemukan siapa saja mereka.

**Angka kartu KT tidak sama dengan jumlah baris** — baris "(tidak diketahui)" sengaja tidak dihitung sebagai Kelompok Tani.

**Tabel kosong** — lembaga/cakupan itu belum punya lahan aktif dengan data Kelompok Tani, atau di luar wilayah akses akun Anda.
