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

Siapkan **ID Lahan** dan luasnya. ID Lahan harus unik untuk petani tersebut, dan inilah yang dipakai mencocokkan data produksi nanti.

## Langkah

1. Buka menu **Master Data → Lahan**, lalu klik **Tambah Lahan**.
2. Pilih **Petani** lewat kotak pencarian. Yang muncul hanya petani dalam wilayah kerja akun Anda.
3. Isi **ID Lahan** dan **Luas (Hektar)**. Luas boleh berdesimal, misalnya `1.75`.
4. Pilih **Status Kepemilikan**: Milik Sendiri, Sewa, atau Bagi Hasil.
5. Isi **Komoditas** dan **Tahun Tanam** bila datanya ada. Tahun tanam dipakai memperkirakan umur tanaman.
6. Centang **PSR** bila lahan sedang diremajakan — ini menjelaskan mengapa produksinya rendah atau nol.
7. Isi **Gapoktan/KUD** dan **Kelompok Tani** kalau petani tergabung di sub-kelompok. Dua kolom inilah yang menghasilkan angka Kelompok Tani di dashboard dan laporan.
8. Klik **Buat**.

> [!penting] Kolom **Revisi** terisi otomatis dan bertambah setiap kali data lahan diperbarui. Itu jejak riwayat, bukan kolom yang perlu Anda isi.

## Memastikan berhasil

Lahan muncul di tabel, dan kartu **Total Persil Lahan** serta **Total Luas Lahan** ikut bertambah.

> [!hati-hati] Form ini **tidak** membuat poligon peta. Lahan yang diinput di sini tidak akan tampil di Peta Lahan — bentuk poligon hanya bisa masuk lewat unggah shapefile.

## Kalau bermasalah

**Petani yang dicari tidak muncul.** Petani itu di luar wilayah kerja akun Anda, atau statusnya nonaktif.

**Muncul pesan ID Lahan sudah terdaftar.** Persil dengan ID itu sudah ada untuk petani tersebut. Periksa daftarnya dulu; bila memang persil yang sama, perbarui datanya alih-alih membuat baru.

**Lahan tidak tampil di peta.** Wajar — lahan dari form belum punya poligon. Lihat tutorial **Mengunggah lahan dari shapefile**.
