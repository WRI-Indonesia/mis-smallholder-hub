---
title: Membedah kelengkapan data satu Lembaga
icon: BarChart3
menuKey: data-analyst-data-completeness
permission: VIEW
duration: 8
href: /admin/data-analyst/data-completeness
hrefLabel: Buka Ketersediaan Data — Per Lembaga
goal: Anda punya daftar kerja temuan data yang perlu dilengkapi untuk satu Lembaga Petani, lengkap dengan menu tempat memperbaikinya.
---

## Sebelum mulai

Menu Data Analyst menjawab pertanyaan yang berbeda dari dashboard. Dashboard menunjukkan **capaian**; menu ini menunjukkan **apa yang belum lengkap**.

Ketersediaan Data punya dua halaman yang berurutan: **Semua Lembaga** (ringkasan — Lembaga mana yang paling tertinggal) lalu **Per Lembaga** (halaman ini — rincian dan daftar kerjanya). Yang paling praktis: mulai dari halaman Semua Lembaga, klik nama Lembaga, dan Anda mendarat di sini dengan Lembaga itu sudah terpilih.

+ Gunakan menu ini sebelum menyiapkan laporan untuk donor atau audit sertifikasi. Menemukan data bolong dari sini jauh lebih murah daripada menemukannya saat laporan sudah di tangan pihak ketiga.

## Langkah

1. Buka menu **Data Analyst → Ketersediaan Data — Per Lembaga**, atau klik nama Lembaga di halaman **Semua Lembaga** / kartu **Kelengkapan Data** di Detail Lembaga.
2. Pilih **Lembaga Petani** — analisa berjalan **otomatis**; tombol **Muat ulang** hanya untuk menghitung ulang setelah data diperbaiki.
+ Lembaga terpilih tersimpan di alamat halaman (`?lembaga=…`), jadi tautannya bisa di-bookmark atau dikirim ke rekan. Bila tautan menunjuk Lembaga di luar akses Anda, halaman memberi tahu dan meminta memilih Lembaga lain.
3. Baca **cincin Index** dan lima kartu domain di sebelahnya, masing-masing dengan bobotnya — Profil 10 %, Petani 25 %, Lahan 25 %, Pelatihan 20 %, Produksi 20 %. Arahkan kursor ke cincin untuk melihat perhitungannya; klik kartu domain untuk melompat ke seksinya.
+ Tiap domain dinilai terpisah karena penyebab dan penanggung jawabnya berbeda — lahan bolong biasanya urusan pemetaan, produksi bolong urusan pencatatan bulanan. Rumus tiap domain ada di **Referensi → Ketersediaan Data — cara skor dihitung**.
4. Lihat **Prioritas perbaikan**: enam tindakan yang paling menaikkan Index bila dilengkapi, lengkap dengan perkiraan kenaikan poin, jumlah entitas, dan menu tempat memperbaikinya. Mulailah dari yang teratas.
5. Buka seksi domain yang skornya terendah (dibuka otomatis) dan baca **Checklist**-nya: satu baris per hal yang dicek, dengan bar % OK dan jumlah yang bermasalah. Chip di kiri menyebut jenisnya:
+ **Inti / Lapangan / Validitas** — masuk skor domain (Lapangan berbobot sepertiga: tahun tanam, status lahan, blok). **Relasi** — hubungan antar data (petani tanpa lahan, lahan tanpa produksi), tidak mengubah skor.
+ **Kualitas** — konsistensi & kewajaran data, tidak mengubah skor: tanggal lahir vs NIK, jenis kelamin vs NIK, umur tidak wajar, kemungkinan petani ganda, persil di luar boundary ICS, luas kolom vs luas poligon, luas & tahun tanam tidak wajar, nilai post-test turun, produksi 0 kg, bulan produksi bolong, Monev tanpa rincian, sertifikasi tak konsisten.
+ **Modul** — cakupan modul tambahan, tidak mengubah skor: surat tanah, STDB terbit, kode vendor (UL Parcel Code), status NKT, sepadan, patok, titik pohon, program, STDB per petani, Monev BMP tahun berjalan, boundary ICS, acuan MD, penilaian Lembaga Monev. Baris bergaris "belum ada di Lembaga ini" berarti modul itu belum dimulai di sana dan sengaja tidak dihitung.
6. Klik baris yang bermasalah untuk membuka **daftar kerjanya**: nama petani menuju **Detail Petani**, ID lahan menuju **Detail Lahan**, dan baris **Perbaiki lewat** menyebut menu serta kolom yang harus diisi.
+ Baris berlabel **sistemik** (kotak kuning) adalah kolom yang praktis belum pernah diisi di Lembaga ini (≥ 95 % kosong), misalnya status lahan atau tahun tanam. Ini bukan anomali yang dikejar per petani, melainkan alur pengisian yang belum berjalan, jadi dihitung sebagai **satu** temuan. Daftar lengkapnya tetap bisa dibuka dan ada di Excel.
7. Di seksi Lahan, lihat tabel **Per Kelompok Tani**: skor lahan, skor petani, dan persil berproduksi per KT — untuk tahu KT mana yang paling perlu didatangi.
8. Gunakan **Buka semua / Tutup semua** bila ingin membaca seluruh seksi sekaligus. Perbaiki datanya lewat menu yang disebut, lalu klik **Muat ulang** — angka langsung berubah.
9. Klik **Excel** untuk mengunduh semuanya: sheet Ringkasan, Prioritas, Checklist, Per Kelompok Tani, satu sheet per domain (temuan + daftar kerja modul, kolom *Perbaiki lewat*), dan matriks pelatihan.

> [!penting] Halaman ini membaca **data terkini**, bukan snapshot. Jadi perbaikan yang Anda lakukan langsung tercermin di sini — tidak perlu menunggu proses apa pun.

> [!tip] Anomali di sini berarti "perlu diperiksa", bukan pasti salah. Contohnya petani tanpa lahan sama sekali — bisa jadi memang penggarap, bisa jadi lahannya belum didaftarkan. Lahan **PSR** (peremajaan) sengaja tidak dihitung sebagai "berlahan tanpa produksi".

## Kalau bermasalah

**Semua tampak kosong** — Lembaga Petani belum dipilih, atau lembaga itu memang belum punya data.

**"Lembaga Petani pada tautan ini tidak ditemukan atau di luar akses Anda"** — tautan yang Anda buka menunjuk Lembaga di luar wilayah kerja akun Anda, atau Lembaga itu sudah dinonaktifkan. Pilih Lembaga lain dari daftar.

**Temuan tidak berkurang setelah data diperbaiki** — klik **Muat ulang**. Bila masih sama, periksa apakah perbaikannya benar-benar tersimpan di Master Data.

**Skor Lahan tidak naik walau poligon lengkap** — cek seksi Lahan: Kelompok Tani, tahun tanam, status lahan, dan blok juga dinilai (tiga yang terakhir berbobot lebih ringan). Kelompok Tani & blok bisa diisi massal lewat **Bulk Upload › Lahan › Detail Lahan**.

**Banyak petani "tanggal lahir tidak cocok dengan NIK" berkomentar "hari/bulan tertukar?"** — tanggal lahirnya kemungkinan terbalik hari/bulannya saat diimpor dulu (NIK menyimpan hari-bulan-tahun di digit 7–12). Perbaiki lewat Master Data › Petani atau unggah ulang kolom Tanggal Lahir; bila NIK-nya yang salah, perbaiki NIK-nya.
