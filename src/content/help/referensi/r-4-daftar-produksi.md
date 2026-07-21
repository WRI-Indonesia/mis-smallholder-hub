---
title: Halaman Produksi — arti kolom & tombol
icon: TrendingUp
menuKey: master-data-production
permission: VIEW
href: /admin/master-data/production
hrefLabel: Buka halaman Produksi
---

## Catatan penting

Data di halaman ini **selalu terkini**. Yang membaca snapshot berkala adalah Main Dashboard, BMP Dashboard, dan Peta BMP — jadi angka di sana bisa tertinggal meski data di sini sudah benar.

## Kolom tabel

**Petani** — pemilik data panen.

**Lahan** — persil asal panen. **Boleh kosong**, tetapi sebaiknya diisi: tanpa lahan, tonasenya tetap masuk total produksi namun luasnya tidak masuk pembagi produktivitas Ton/Ha, sehingga angka produktivitas jadi lebih tinggi daripada kenyataan. Lahan tersebut juga akan terbaca "tanpa data produksi" di Peta BMP.

**Periode** — bulan panen dalam format tahun-bulan. Ini sumbu waktu seluruh grafik produksi, sekaligus dasar hitungan berapa bulan berturut-turut sebuah lahan punya data — yang menentukan kategori Ketersediaan Data di Peta BMP.

**Tanggal Panen** — tanggal sebenarnya panen dilakukan. Harus berada di dalam periode yang dipilih.

**Panen Ke-** — pembeda beberapa panen dalam bulan yang sama. Tersedia **1 sampai 4**. Kombinasi petani + lahan + periode + Panen Ke- yang sama dianggap duplikat dan ditolak.

**Hasil (kg)** — tonase dalam **kilogram**, bukan ton. Dashboard menampilkannya dalam ton, konversinya dilakukan sistem.

## Tombol

**Tambah Data** — membuka halaman tersendiri berjudul "Tambah Data Produksi", bukan jendela isian.

**Excel** — mengunduh data sesuai filter yang sedang aktif.

> [!tip] Untuk data satu musim penuh, pakai **Bulk Upload → Upload Produksi** — jauh lebih cepat dan tervalidasi sebelum tersimpan.
