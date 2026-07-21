---
title: Mencatat pelatihan & pesertanya
icon: GraduationCap
menuKey: master-data-training
permission: CREATE
duration: 7
href: /admin/master-data/training
hrefLabel: Buka halaman Pelatihan
goal: Satu kegiatan pelatihan tercatat lengkap dengan daftar peserta dan nilai pre/post-test.
---

## Sebelum mulai

Satu kegiatan dimiliki satu **Lembaga Petani**, dan pesertanya **hanya boleh anggota lembaga itu** — sistem menolak peserta dari lembaga lain.

+ Aturan ini yang membuat angka cakupan pelatihan bisa dipercaya: karena peserta selalu anggota lembaga penyelenggara, hitungan "berapa persen petani lembaga ini sudah dilatih" tidak mungkin melebihi 100%. Bila satu petani benar-benar hadir di kegiatan lembaga lain, catat sebagai kegiatan terpisah di lembaganya sendiri.

Siapkan: paket pelatihan, tanggal, lokasi, daftar hadir, dan notulen PDF (maksimal 10 MB).

## Langkah — membuat kegiatan

1. Buka menu **Master Data → Pelatihan**, lalu klik **Tambah Pelatihan**.
+ Daftar kegiatan bisa disaring per Distrik, Lembaga, dan Paket Pelatihan — berguna saat memeriksa kegiatan mana yang belum lengkap datanya.
2. Pilih **Paket Pelatihan** dan **Lembaga Petani**.
+ Paket menentukan kolom mana yang terisi di matriks cakupan Dashboard Pelatihan. Bila satu hari memuat dua modul berbeda yang termasuk paket berbeda, catat sebagai dua kegiatan agar cakupan tiap paket terhitung benar.
3. Isi **Tanggal Pelatihan** dan **Lokasi** (misalnya `Balai Desa`).
+ Tanggal menentukan kegiatan ini masuk tahun mana di dashboard, jadi isi tanggal pelaksanaan sebenarnya — bukan tanggal Anda menginput. Lokasi yang kosong akan muncul sebagai temuan di panel Kualitas Data.
4. Unggah **Evidence (Notulen PDF, maks 10MB)** bila sudah ada — boleh menyusul lewat Edit.
+ Berkas disimpan di penyimpanan privat dan hanya bisa dibuka lewat tautan bertanda tangan yang dibuat saat Anda mengkliknya. Kegiatan tanpa bukti akan terhitung di panel Kualitas Data sebagai pekerjaan yang belum tuntas — berguna saat menyiapkan audit.
5. Klik **Buat**.

## Langkah — menambahkan peserta

1. Klik kegiatan yang baru dibuat untuk membuka halaman detailnya.
2. Pada seksi **Peserta Pelatihan**, klik **Tambah Peserta**.
3. Centang petani yang hadir. Daftar yang muncul hanya anggota lembaga penyelenggara.
+ Bila seorang petani hadir tapi belum terdaftar, daftarkan dia dulu di Master Data → Petani lalu kembali ke sini. Menambahkannya ke lembaga lain hanya agar bisa dicentang akan merusak angka cakupan kedua lembaga.
4. Isi **Pre-Test** dan **Post-Test** bila tesnya dilakukan. Boleh dikosongkan dan dilengkapi belakangan.
+ Panel efektivitas di Dashboard Pelatihan hanya menghitung peserta yang **kedua** skornya terisi. Mengisi pre saja tanpa post membuat peserta itu tidak masuk hitungan kenaikan skor, meski kehadirannya tetap terhitung.
5. Simpan.

> [!hati-hati] Nilai post-test yang lebih rendah dari pre-test akan ditandai "turun" di Dashboard Pelatihan sebagai indikasi salah input. Periksa ulang sebelum menyimpan.

## Memastikan berhasil

Jumlah peserta muncul di daftar pelatihan. Petani tersebut **langsung** terhitung sudah dilatih pada paket itu di Dashboard Pelatihan — dashboard ini tidak memakai snapshot, jadi tidak perlu proses tambahan.

+ Berbeda dengan Main Dashboard dan BMP Dashboard yang membaca snapshot berkala. Jadi bila Anda ingin memeriksa hasil input pelatihan seketika, bukalah Dashboard Pelatihan, bukan Main Dashboard.

## Kalau bermasalah

**Petani yang dicari tidak ada di daftar peserta.** Dia bukan anggota lembaga penyelenggara. Bila memang hadir, perbaiki dulu keanggotaannya di data Petani.

+ Sistem menolak **seluruh** batch bila ada satu peserta yang tak valid, bukan melewatinya diam-diam. Jadi bila penyimpanan gagal, periksa satu per satu — bukan berarti semua pesertanya bermasalah.

**Unggahan notulen ditolak.** Hanya PDF di bawah 10 MB yang diterima.

**Peserta salah dimasukkan.** Centang barisnya lalu klik **Hapus Terpilih**, atau pakai tombol hapus di baris tersebut.
