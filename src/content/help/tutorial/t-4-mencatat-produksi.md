---
title: Mencatat hasil panen
icon: TrendingUp
menuKey: master-data-production
permission: CREATE
duration: 4
href: /admin/master-data/production
hrefLabel: Buka halaman Produksi
goal: Satu catatan panen tersimpan untuk seorang petani pada periode tertentu.
---

## Sebelum mulai

Produksi dicatat **per petani, per lahan, per bulan**. Satu bulan boleh punya beberapa catatan bila panen terjadi lebih dari sekali — itulah gunanya kolom **Panen Ke-**.

Isi lahannya bila memungkinkan; tanpa lahan, produksi tetap tersimpan tapi tidak bisa dikaitkan ke luas untuk perhitungan produktivitas.

+ Tonasenya tetap masuk total produksi, tetapi luasnya tidak masuk penyebut Ton/Ha — sehingga angka produktivitas jadi lebih tinggi daripada seharusnya. Lahannya juga akan terbaca "tanpa data produksi" di Peta BMP.

## Langkah

1. Buka menu **Master Data → Produksi**, lalu klik **Tambah Data**.
+ Anda dibawa ke halaman tersendiri berjudul "Tambah Data Produksi", bukan jendela isian.
2. Pada seksi **Informasi Petani & Lahan**, pilih **Petani** lalu **Lahan** miliknya.
+ Daftar lahan baru terisi setelah petaninya dipilih, dan hanya memuat lahan milik petani itu — jadi tak mungkin salah menempelkan panen ke lahan orang lain.
3. Pilih **Periode** — bulan dan tahun panen.
+ Kolomnya pemilih bulan bawaan peramban, jadi Anda memilih (mis. Juni 2026), bukan mengetik `2026-06`. Format tahun-bulan itu dipakai pada jalur **unggah massal**, bukan di form ini. Periode adalah sumbu waktu seluruh grafik produksi, sekaligus dasar hitungan berapa bulan berturut-turut sebuah lahan punya data — kategori Ketersediaan Data di Peta BMP.
4. Isi **Tanggal Panen** — tanggal sebenarnya panen dilakukan, harus berada dalam periode yang sama.
+ Tanggal di luar periode akan ditolak. Ini penjagaan sederhana agar panen Juni tidak tercatat pada periode Mei hanya karena salah ketik.
5. Pilih **Panen Ke-**: `1` untuk panen pertama di bulan itu, `2` untuk berikutnya. Tersedia sampai **Panen Ke-4**.
+ Nomor ini yang membedakan beberapa panen dalam bulan yang sama. Bila nomornya diulang untuk kombinasi petani, lahan, dan periode yang sama, sistem menganggapnya duplikat dan menolak. Batas empat panen per bulan adalah aturan sistem — bila di lapangan benar-benar lebih dari itu, laporkan ke administrator.
6. Isi **Hasil Panen (kg)** dalam kilogram, bukan ton.
+ Dashboard menampilkannya dalam ton, tetapi konversinya dilakukan sistem. Memasukkan angka dalam ton akan membuat produksi terbaca seribu kali lebih kecil.
7. Klik **Simpan**.

> [!tip] Punya data satu musim penuh dalam Excel? Pakai **Bulk Upload → Upload Produksi** — jauh lebih cepat dan tervalidasi sebelum tersimpan.

## Memastikan berhasil

Catatan muncul di daftar Produksi. Angkanya masuk ke Dashboard BMP dan Peta BMP **setelah snapshot diperbarui** — lihat tutorial **Memperbarui angka dashboard**.

## Kalau bermasalah

**Lahan tidak muncul setelah memilih petani.** Petani itu belum punya lahan terdaftar. Daftarkan lahannya lebih dulu.

**Muncul pesan data duplikat.** Kombinasi petani, lahan, periode, dan Panen Ke- yang sama sudah ada. Pilih nomor Panen Ke- berikutnya bila ini memang panen berbeda — tersedia sampai 4.

**Angka tidak berubah di dashboard.** Bukan kegagalan penyimpanan — Dashboard Main dan BMP membaca snapshot berkala, bukan menghitung ulang tiap dibuka.

+ Untuk memastikan data benar-benar tersimpan, periksa saja daftar di Master Data → Produksi; daftar itu selalu membaca data terkini. Snapshot dibuat lewat menu Tools — lihat tutorial **Memperbarui angka dashboard**.
