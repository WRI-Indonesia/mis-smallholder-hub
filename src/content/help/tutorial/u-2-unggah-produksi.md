---
title: Mengunggah data produksi dari Excel
icon: Upload
menuKey: bulk-upload-production
permission: CREATE
duration: 10
href: /admin/bulk-upload/production
hrefLabel: Buka halaman Upload Produksi
goal: Data panen satu musim atau satu tahun masuk sekaligus dari berkas Excel.
---

## Sebelum mulai

Berbeda dari unggah petani, di sini **tidak perlu memilih lembaga** lebih dulu — petani dikenali dari **ID Petani** di dalam berkas. Jadi pastikan ID Petani di Excel Anda sama persis dengan yang ada di sistem.

+ Konsekuensinya satu berkas boleh memuat petani lintas lembaga sekaligus. Tapi juga berarti satu ID salah ketik langsung jadi baris error — tak ada lembaga yang bisa dipakai menebak petani mana yang Anda maksud.

Tersedia berkas contoh: tombol **Unduh Template Excel** di kanan atas Langkah 1.

## Langkah

1. Buka menu **Bulk Upload → Upload Produksi**.
2. Klik **Unduh Template Excel** bila Anda ingin memakai format bawaan.
3. Pada **Langkah 1**, pilih berkas `.xlsx` atau `.csv`.
4. Pada **Langkah 2 — Petakan Atribut Kolom**, cocokkan kolom berkas dengan kolom sistem: ID Petani, Periode, Tanggal Panen, Panen Ke-, Hasil (kg), dan ID Lahan.
+ ID Lahan bersifat opsional di sini, tetapi sangat dianjurkan. Tanpa itu produksinya tidak bisa dikaitkan ke luas lahan, sehingga tak muncul pada perhitungan produktivitas per persil.
5. Klik **Validasi Data Produksi**.
6. Pada **Langkah 3**, periksa ringkasan dan tabel tinjauan. Kolom **Nama Petani (DB)** memperlihatkan nama yang berhasil dicocokkan sistem — gunakan itu untuk memastikan ID Petani menunjuk orang yang benar.
+ Ini pemeriksaan paling berharga di halaman ini. Sebuah baris bisa berstatus valid tetapi menunjuk **petani yang keliru** bila ID-nya kebetulan cocok dengan orang lain — dan itu hanya ketahuan dari kolom nama ini.
7. Perbaiki error bila ada, lalu klik **Simpan N Data Valid**.

> [!hati-hati] Isi kolom **ID Lahan** bila memungkinkan. Produksi tanpa lahan tetap tersimpan dan tetap dihitung sebagai total produksi, tetapi tidak bisa dikaitkan ke luas lahan — sehingga tidak muncul pada perhitungan produktivitas per persil.

## Hasil

Catatan panen muncul di **Master Data → Produksi**. Dashboard BMP dan Peta BMP baru berubah setelah snapshot diperbarui.

## Kalau bermasalah

**Error "petani tidak ditemukan"** — ID Petani di berkas tidak cocok dengan yang ada di sistem. Periksa spasi berlebih, nol di depan yang hilang, atau format sel Excel yang berubah jadi angka.

+ Cara memastikannya: ubah format kolom ID di Excel jadi **Teks** sebelum menempel data, lalu bandingkan satu ID dengan yang tampil di Master Data → Petani. Nol di depan yang hilang (`007` jadi `7`) adalah penyebab paling sering.

**Error pada kolom Periode** — formatnya harus tahun-bulan seperti `2026-06`.

**Ada data panen ganda** — satu petani boleh punya beberapa panen dalam satu bulan, dibedakan oleh **Panen Ke-**. Kalau nomornya sama persis, sistem menganggapnya duplikat.

+ Bila sumber data Anda tidak punya kolom Panen Ke-, isi `1` untuk semua baris — asalkan memang hanya ada satu catatan panen per petani per bulan.
