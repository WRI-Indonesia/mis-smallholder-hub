---
title: Mencetak Laporan Kelompok Tani
icon: ListChecks
menuKey: report-kelompok-tani
permission: VIEW
duration: 7
href: /admin/report/kelompok-tani
hrefLabel: Buka Laporan Kelompok Tani
goal: Rekap Kelompok Tani lintas lembaga — jumlah petani, lahan, dan luas per KT — terunduh sebagai Excel atau PDF.
---

## Sebelum mulai

Ada dua menu laporan Kelompok Tani dengan tujuan berbeda: **Ringkasan** untuk rekap jumlah lintas lembaga, **Detail** untuk daftar nama anggota per KT dalam satu lembaga — misalnya untuk verifikasi keanggotaan atau daftar hadir.

Kelompok Tani di sini dibaca dari **data lahan** (field Kelompok Tani pada tiap persil), bukan dari daftar tersendiri.

+ Konsekuensinya: petani yang belum punya lahan aktif tidak muncul di kedua laporan ini, dan lahan yang field Kelompok Tani-nya kosong dikelompokkan sebagai baris "(tidak diketahui)" di urutan paling bawah. Isian "Tidak Ada" atau "-" tidak lagi diterima sebagai nama KT — sistem menyimpannya kosong, jadi lahannya masuk "(tidak diketahui)". Penulisan nama dinormalkan — "KT Melati" dan "kt melati" dihitung satu KT.

## Langkah

1. Buka menu **Report → Kelompok Tani (Ringkasan)**. Data langsung dimuat tanpa tombol.
2. Persempit dengan filter **Distrik** dan **Lembaga Petani** bila perlu — keduanya opsional.
3. Baca enam kartu ringkasan (termasuk **Lahan NKT**), lalu tabelnya: satu baris per pasangan Lembaga × KT, dengan jumlah petani, lahan, dan luas.
+ Lewat tombol **Kolom** Anda bisa menyalakan dua kolom tambahan yang mati bawaan: **Lahan NKT** (berapa lahan di KT itu termasuk/terdampak NKT — merah bila ada) dan **Patok** (jumlah tautan patok di lahan-lahan KT itu; patok yang dipakai bersama dua lahan dihitung dua kali karena dihitung per lahan, bukan per patok fisik). Keduanya ikut ke Excel/PDF bila dinyalakan.
+ Kotak **Cari** menyaring baris berdasarkan nama lembaga/KT; baris "Total" di bawah tabel mengikuti hasil pencarian, sedangkan kartu di atas tetap menghitung semuanya — jadi keduanya bisa berbeda saat pencarian aktif.
4. Unduh lewat **Excel** atau **PDF**.
+ Hasil unduhan mengikuti pencarian dan pengaturan kolom yang sedang aktif. Kosongkan kotak Cari dulu bila ingin berkas lengkap.
5. Butuh daftar namanya, bukan jumlahnya? Lanjutkan ke **Report → Kelompok Tani (Detail)** — langkahnya ada di [Menyusun roster anggota per Kelompok Tani](/admin/help/tutorial-laporan/roster-kelompok-tani).

## Kalau bermasalah

**Muncul KT dengan nama aneh seperti "Blok 1"** — operator mengetikkan nama blok ke field Kelompok Tani saat input lahan. Perbaiki di Master Data → Lahan (atau lewat unggah ulang shapefile), bukan di laporan; laporan langsung mengikuti begitu datanya dibetulkan.

**Ada petani yang tidak muncul** — ia belum punya lahan aktif. Gunakan **Ringkasan Petani → tab Petani Tanpa Lahan** untuk menemukan siapa saja mereka.

**Angka kartu KT tidak sama dengan jumlah baris** — baris "(tidak diketahui)" sengaja tidak dihitung sebagai Kelompok Tani.

**Tabel kosong** — lembaga/cakupan itu belum punya lahan aktif dengan data Kelompok Tani, atau di luar wilayah akses akun Anda.
