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

BMP Dashboard fokus pada **produksi**: total tonase, produktivitas Ton/Ha, berapa lahan yang punya data, dan berapa petani yang melapor.

Angkanya dibaca dari **snapshot**, sama seperti Main Dashboard.

+ Setelah unggahan produksi besar, snapshot BMP harus dibuat ulang lewat **Tools → Dashboard Snapshot BMP**. Snapshot Main dan BMP terpisah — membuat yang satu tidak memperbarui yang lain.

## Langkah

1. Buka menu **Dashboard → BMP Dashboard (Produksi)**.
2. Atur lima filter di header: **Kategori**, **Distrik**, **Lembaga**, **Tahun**, dan **Kelengkapan Data**.
+ Kelimanya memfilter kartu **dan** grafik sekaligus, diiris dari satu snapshot — jadi terasa seketika tanpa memuat ulang halaman.
3. Perhatikan filter **Tahun**. Bawaannya **Rataan**.
+ "Rataan" berarti rata-rata per tahun, bukan penjumlahan seluruh tahun. Ini keputusan pemilik program: angka kumulatif lintas tahun mudah disalahbaca sebagai capaian satu musim. Angka kumulatif tersedia di detail snapshot lewat menu Tools.
4. Baca kartu **Produktivitas (Ton/Ha)**.
+ Dihitung sebagai produksi tahun terpilih dibagi **luas lahan yang melapor** pada tahun itu — bukan dibagi seluruh luas lahan. Jadi ia menggambarkan lahan yang datanya ada, bukan seluruh kebun program.
5. Gunakan **Kelengkapan Data** → **Data Full 1 Tahun** bila ingin angka yang lebih jujur.
+ Mode ini hanya menghitung lahan yang punya data **12 bulan penuh Jan–Des** pada tahun tersebut. Tanpa itu, lahan yang hanya melapor dua bulan ikut menurunkan rata-rata seolah produksinya memang rendah. Tahun berjalan tidak akan pernah "full" sampai Desember terisi.
6. Periksa panel **Ketersediaan Data Produksi** di bawah, lalu klik **Lihat sebaran di Peta BMP** untuk melihat lahannya secara spasial.

> [!hati-hati] Produksi yang dicatat **tanpa ID Lahan** tetap masuk total tonase, tetapi luasnya tidak masuk pembagi produktivitas. Bila banyak data seperti itu, angka Ton/Ha akan tampak lebih tinggi daripada kenyataan.

## Kalau bermasalah

**Tertulis belum ada snapshot** — belum pernah dibuat. Lihat tutorial **Memperbarui angka dashboard**.

**Angka 0 padahal data produksi ada** — snapshot-nya dibuat sebelum data itu masuk. Buat ulang.

**Produktivitas terasa terlalu tinggi** — periksa berapa banyak produksi yang tercatat tanpa ID Lahan, dan bandingkan dengan mode **Data Full 1 Tahun**.
