---
title: Membaca BMP Dashboard (produksi)
icon: TrendingUp
menuKey: dashboard-bmp
permission: VIEW
duration: 6
href: /admin/dashboard/bmp
hrefLabel: Buka BMP Dashboard
goal: Anda bisa membaca angka produksi & produktivitas program, dan tahu batas ketelitiannya.
---

## Sebelum mulai

BMP Dashboard fokus pada **produksi**: produktivitas Ton/Ha, total tonase, luasan terdata, dan berapa petani yang terdata.

Angkanya dibaca dari **snapshot**, sama seperti Main Dashboard.

+ Setelah unggahan produksi besar, snapshot BMP harus dibuat ulang lewat **Tools → Dashboard Snapshot BMP**. Snapshot Main dan BMP terpisah — membuat yang satu tidak memperbarui yang lain.

## Langkah

1. Buka menu **Dashboard → BMP Dashboard (Produksi)**.
2. Atur lima filter di header: **Kategori**, **Distrik**, **Lembaga**, **Tahun**, dan **Kelengkapan Data**.
+ Kelimanya memfilter kartu **dan** grafik sekaligus, diiris dari satu snapshot — jadi terasa seketika tanpa memuat ulang halaman.
3. Perhatikan filter **Tahun**. Bawaannya **tahun berjalan** (atau tahun terbaru yang punya data bila tahun ini belum ada datanya).
+ Opsi **Rataan** ada di paling bawah daftar: rata-rata per tahun, bukan penjumlahan seluruh tahun — angka kumulatif lintas tahun mudah disalahbaca sebagai capaian satu musim. Angka kumulatif tersedia di detail snapshot lewat menu Tools.
4. Baca kartu **Produktivitas (Ton/Ha)** dan kartu **Luasan**.
+ Produktivitas = produksi tahun terpilih dibagi **luas lahan yang terdata** pada tahun itu — bukan dibagi seluruh luas lahan. Kartu Luasan menunjukkan berapa Ha yang terdata dibanding total luas lahan aktif (persennya ikut ditampilkan).
5. Gunakan **Kelengkapan Data** → **Data Full 1 Tahun** bila ingin angka yang lebih jujur.
+ Mode ini hanya menghitung lahan yang punya data **12 bulan penuh Jan–Des** pada tahun tersebut. Tanpa itu, lahan yang hanya terdata dua bulan ikut menurunkan rata-rata seolah produksinya memang rendah. Tahun berjalan tidak akan pernah "full" sampai Desember terisi.
6. Baca dua grafik di bawah kartu: **Tren Produksi & Cakupan Data** (bulanan) dan **Produktivitas per Lembaga — Top 10** (warna bar mengikuti kategori Ex-Plasma/Swadaya).
7. Periksa card **Ex-Plasma vs Swadaya** di paling bawah: ringkasan produksi/produktivitas/luas terdata per kategori, plus analisa **produksi per distrik** dan **produktivitas per umur tanaman**.
+ Umur tanaman dihitung pada tahun produksinya (tahun produksi − tahun tanam), jadi analisa historis tetap akurat. Lahan tanpa tahun tanam dikelompokkan sendiri. Card ini mengikuti semua filter kecuali filter Kategori — ia memang selalu membandingkan keduanya.

> [!hati-hati] Produksi yang dicatat **tanpa ID Lahan** tetap masuk total tonase, tetapi luasnya tidak masuk pembagi produktivitas. Bila banyak data seperti itu, angka Ton/Ha akan tampak lebih tinggi daripada kenyataan.

## Kalau bermasalah

**Tertulis belum ada snapshot** — belum pernah dibuat. Lihat tutorial **Memperbarui angka dashboard**.

**Angka 0 padahal data produksi ada** — snapshot-nya dibuat sebelum data itu masuk. Buat ulang.

**Produktivitas terasa terlalu tinggi** — periksa berapa banyak produksi yang tercatat tanpa ID Lahan, dan bandingkan dengan mode **Data Full 1 Tahun**.

**Analisa umur tanaman kosong / kartu Luasan tanpa persen** — snapshot dibuat sebelum fitur ini ada, sehingga belum memuat tahun tanam dan total luas. Buat ulang snapshot lewat **Tools → Dashboard Snapshot BMP**.
