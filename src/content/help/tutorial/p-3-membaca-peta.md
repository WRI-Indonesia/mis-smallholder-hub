---
title: Membaca peta lahan & peta BMP
icon: Map
menuKey: map-bmp
permission: VIEW
duration: 7
href: /admin/map/bmp
hrefLabel: Buka Peta BMP
goal: Anda bisa membaca sebaran lahan dan menilai kelengkapan data produksi secara spasial.
---

## Sebelum mulai

Ada dua peta dengan tujuan berbeda. **Peta Lahan** menampilkan sebaran poligon beserta overlay pendukung. **Peta BMP** adalah peta tematik: warnanya mewakili data, bukan sekadar lokasi.

Hanya lahan yang berasal dari unggahan shapefile yang muncul di peta.

+ Lahan yang diinput lewat form Master Data tidak punya poligon. Bila sebuah lembaga tampak kosong di peta padahal lahannya banyak, kemungkinan besar lahannya belum pernah diunggah lewat shapefile.

## Langkah — Peta BMP

1. Buka menu **Map → Peta BMP**.
2. Pilih **Lembaga Petani** pada panel kiri, lalu klik **Muat Data**.
+ Lembaga wajib dipilih karena memuat seluruh poligon sekaligus akan berat. Distrik dan provinsi hanya membantu menyaring daftar lembaganya.
3. Pilih layer: **Ketersediaan Data Produksi** atau **Produktivitas (Ton/Ha)**.
+ Layer pertama menjawab "lahan mana yang datanya lengkap", layer kedua "lahan mana yang hasilnya tinggi". Keduanya memakai data yang sama, hanya cara membacanya berbeda.
4. Untuk layer Ketersediaan, baca empat kategori warnanya.
+ Kategori dihitung dari berapa bulan berturut-turut sebuah lahan punya catatan produksi: Baik lebih dari dua tahun, Cukup minimal satu tahun, Kurang di bawah satu tahun, dan abu-abu tanpa data sama sekali. Lahan abu-abu adalah daftar kerja pengumpulan data Anda berikutnya.
5. Untuk layer Produktivitas, pilih **Tahun** atau rata-rata.
+ Produktivitas dihitung sebagai total produksi tahun itu dibagi luas persil. Lahan yang sedang PSR wajar bernilai rendah atau nol.
6. Klik sebuah poligon untuk melihat detailnya.
7. Klik **Cetak** untuk PDF, atau unduh Excel-nya.
+ Keluarannya mengikuti layer yang sedang aktif — termasuk legenda dan tabel datanya, jadi periksa layernya sudah benar sebelum mencetak.

> [!penting] Peta BMP membaca snapshot yang sama dengan BMP Dashboard. Bila data produksi baru saja diunggah tetapi warnanya belum berubah, snapshot-nya perlu dibuat ulang.

## Kalau bermasalah

**Peta kosong setelah Muat Data** — lembaga tersebut belum punya lahan ber-poligon.

**Semua lahan abu-abu** — belum ada data produksi untuk lahan-lahan itu, atau produksinya tercatat tanpa ID Lahan sehingga tak bisa dikaitkan ke persil.

+ Periksa di **Master Data → Produksi** apakah kolom lahannya terisi. Produksi tanpa lahan tetap terhitung sebagai total, tetapi tidak mewarnai peta.

**Poligon berada di lokasi yang salah** — masalahnya ada pada shapefile sumber, bukan pada peta. Lihat tutorial **Mengunggah lahan dari shapefile**.
