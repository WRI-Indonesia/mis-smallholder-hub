---
title: Mendaftarkan lahan petani
icon: Map
menuKey: master-data-parcels
permission: CREATE
duration: 4
href: /admin/master-data/parcels
hrefLabel: Buka halaman Lahan
goal: Satu persil lahan tercatat atas nama seorang petani, siap dipakai untuk data produksi.
---

## Sebelum mulai

Lahan selalu melekat pada seorang **petani** — daftarkan petaninya lebih dulu bila belum ada.

+ Satu petani boleh punya banyak persil. Karena itu luas kebun seorang petani adalah penjumlahan seluruh persilnya, bukan angka tunggal di data petani.

Siapkan **ID Lahan** dan luasnya. ID Lahan harus unik untuk petani tersebut, dan inilah yang dipakai mencocokkan data produksi nanti.

+ Kombinasi **ID Petani + ID Lahan** adalah kunci pencocokan pada unggah massal produksi maupun shapefile. Bila ID Lahan diubah setelah produksi tercatat, hubungannya tidak putus — tapi berkas unggahan lama Anda tidak akan cocok lagi.

## Langkah

1. Buka menu **Master Data → Lahan**, lalu klik **Tambah Lahan**.
+ Tabelnya memuat kolom Luas, Status Kepemilikan, Komoditas, dan Tahun Tanam. Gunakan tombol **Kolom** untuk menyembunyikan yang tak Anda perlukan — pengaturannya bertahan selama sesi.
2. Pilih **Petani** lewat kotak pencarian. Yang muncul hanya petani dalam wilayah kerja akun Anda.
+ Ketik ID Petani bila ada beberapa nama yang mirip — pencarian menelusuri nama dan ID sekaligus, sehingga lebih pasti daripada menebak dari nama saja.
3. Isi **ID Lahan** dan **Luas (Hektar)**. Luas boleh berdesimal, misalnya `1.75`.
+ Gunakan titik sebagai pemisah desimal, bukan koma. Luas inilah penyebut perhitungan produktivitas (Ton/Ha) di Dashboard BMP — luas yang keliru membuat produktivitas ikut keliru meski data panennya benar.
4. Pilih **Status Kepemilikan**: Milik Sendiri, Sewa, atau Bagi Hasil.
+ Kolom ini kerap diminta saat audit sertifikasi RSPO/ISPO untuk memastikan hak garap petani jelas.
5. Isi **Komoditas** dan **Tahun Tanam** bila datanya ada. Tahun tanam dipakai memperkirakan umur tanaman.
+ Umur tanaman menjelaskan banyak hal saat membaca produktivitas: sawit muda di bawah 4 tahun belum berbuah optimal, sementara di atas 25 tahun hasilnya menurun dan biasanya masuk rencana peremajaan.
6. Centang **PSR** bila lahan sedang diremajakan — ini menjelaskan mengapa produksinya rendah atau nol.
+ Tanpa penanda ini, lahan PSR akan terbaca sebagai lahan bermasalah pada analisa ketersediaan data produksi, padahal nol hasil memang wajar selama peremajaan.
7. Isi **Gapoktan/KUD** dan **Kelompok Tani** kalau petani tergabung di sub-kelompok. Dua kolom inilah yang menghasilkan angka Kelompok Tani di dashboard dan laporan.
+ Kedua level ini untuk sementara disimpan **per lahan**, belum sebagai tabel tersendiri. Tulis namanya persis sama untuk semua lahan di kelompok yang sama — perbedaan satu spasi atau huruf besar-kecil akan terhitung sebagai dua kelompok berbeda.
8. Klik **Buat**.

> [!penting] Kolom **Revisi** terisi otomatis dan bertambah setiap kali data lahan diperbarui. Itu jejak riwayat, bukan kolom yang perlu Anda isi.

## Memastikan berhasil

Lahan muncul di tabel, dan kartu **Total Persil Lahan** serta **Total Luas Lahan** ikut bertambah.

> [!hati-hati] Form ini **tidak** membuat poligon peta. Lahan yang diinput di sini tidak akan tampil di Peta Lahan — bentuk poligon hanya bisa masuk lewat unggah shapefile.

## Kalau bermasalah

**Petani yang dicari tidak muncul.** Petani itu di luar wilayah kerja akun Anda, atau statusnya nonaktif.

+ Periksa di **Master Data → Petani**. Bila di sana pun tak ada, berarti di luar wilayah kerja Anda; bila ada tapi Nonaktif, aktifkan kembali lebih dulu.

**Muncul pesan ID Lahan sudah terdaftar.** Persil dengan ID itu sudah ada untuk petani tersebut. Periksa daftarnya dulu; bila memang persil yang sama, perbarui datanya alih-alih membuat baru.

**Lahan tidak tampil di peta.** Wajar — lahan dari form belum punya poligon. Lihat tutorial **Mengunggah lahan dari shapefile**.

+ Lahan tanpa poligon tetap dihitung penuh di kartu Total Luas Lahan, laporan, dan produktivitas. Yang tidak bisa hanyalah menampilkannya di peta dan menyertakannya di Laporan Lahan ber-peta.
