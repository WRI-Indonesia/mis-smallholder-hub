---
title: Menjelajah Peta Lahan
icon: Map
menuKey: map-parcel
permission: VIEW
duration: 6
href: /admin/map/parcel
hrefLabel: Buka Peta Lahan
goal: Anda bisa menemukan sebuah persil di peta, mengukur jaraknya, dan mencetak Profil Lahan.
---

## Sebelum mulai

Peta Lahan menampilkan sebaran poligon lahan beserta lapisan pendukung: batas wilayah, titik panas kebakaran, dan lapisan GIS tambahan.

Hanya lahan dari unggahan **shapefile** yang tergambar di sini.

+ Lahan yang diinput lewat form Master Data tidak punya poligon. Bila sebuah lembaga tampak kosong padahal lahannya banyak, kemungkinan besar poligonnya memang belum pernah diunggah.

## Langkah

1. Buka menu **Map → Peta Lahan**.
2. Gunakan panel **daftar lahan** untuk mencari persil, lalu klik hasilnya — peta akan memperbesar ke lokasinya.
+ Jauh lebih cepat daripada mencari manual dengan menggeser peta, terutama untuk lembaga dengan ratusan persil.
3. Klik sebuah poligon untuk membuka info detailnya.
+ Berisi identitas petani, luas, komoditas, dan data produksi bila ada. Dari popup ini Anda bisa mencetak **Profil Lahan** (PDF), membuka **Lihat Detail** halaman lahan, atau **Edit Lahan** langsung dari peta bila akun Anda punya izin ubah pada menu Lahan. Perubahan mengikuti mekanisme revisi biasa, dan peta ikut menyegar setelah disimpan. Tombol yang sama tersedia di popup **Sebaran Lahan** (di detail Lembaga Petani/Petani) dan **Peta BMP**.
4. Aktifkan lapisan tambahan lewat panel kiri bila perlu — misalnya **titik panas** untuk memeriksa indikasi kebakaran di sekitar kebun.
+ Titik panas berasal dari satelit NASA FIRMS dan merupakan **deteksi anomali panas, bukan konfirmasi kebakaran**. Perlakukan sebagai petunjuk untuk diverifikasi ke lapangan, bukan kesimpulan.
5. Gunakan alat **ukur jarak** bila perlu memperkirakan jarak antar titik.

> [!tip] Untuk kebutuhan verifikasi lapangan yang butuh cetakan ber-grid dan tabel, pakai **Report → Lahan** — bukan cetak layar dari peta ini.

## Kalau bermasalah

**Peta kosong** — belum ada lahan ber-poligon dalam cakupan akun Anda, atau filternya terlalu sempit.

**Poligon berada di lokasi yang salah** — masalahnya pada shapefile sumber, bukan pada peta. Lihat tutorial **Mengunggah lahan dari shapefile**.

**Lapisan tambahan tidak muncul** — beberapa lapisan mengambil data dari layanan luar dan bisa lambat atau sedang tak tersedia. Coba muat ulang halaman.
