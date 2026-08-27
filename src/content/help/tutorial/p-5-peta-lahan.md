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

Peta Lahan menampilkan sebaran poligon lahan beserta lapisan pendukung: peta referensi **Kawasan Hutan** dan **Fungsi Ekosistem Gambut**, titik panas kebakaran, dan lapisan GIS tambahan.

Hanya lahan dari unggahan **shapefile** yang tergambar di sini.

+ Lahan yang diinput lewat form Master Data tidak punya poligon. Bila sebuah lembaga tampak kosong padahal lahannya banyak, kemungkinan besar poligonnya memang belum pernah diunggah.

## Langkah

1. Buka menu **Map → Peta Lahan**.
2. Pada panel kiri, pilih **Distrik** (wajib) lalu klik **Muat Data**.
+ Provinsi dan Lembaga Petani opsional untuk mempersempit. Tombol Muat Data tetap nonaktif sampai Distrik dipilih.
3. Gunakan panel **daftar lahan** untuk mencari persil, lalu klik hasilnya — peta akan memperbesar ke lokasinya.
+ Jauh lebih cepat daripada mencari manual dengan menggeser peta, terutama untuk lembaga dengan ratusan persil.
4. Klik sebuah poligon untuk membuka info detailnya.
+ Berisi identitas petani, luas, komoditas, legalitas (surat kepemilikan, STDB, kode vendor, program), pelatihan, dan data produksi bila ada; bisa lebih dari satu halaman. Dari popup ini Anda bisa mencetak **Profil Lahan** (PDF, hanya tampil bila punya izin **Print**), membuka **Lihat Detail** halaman lahan (terbuka di tab baru, jadi posisi peta Anda tidak hilang), atau **Edit Lahan** langsung dari peta bila akun Anda punya izin ubah pada menu Lahan. Perubahan mengikuti mekanisme revisi biasa, dan peta ikut menyegar setelah disimpan. Tombol yang sama tersedia di popup **Sebaran Lahan** (di detail Lembaga Petani/Petani) dan **Peta BMP**.
5. Aktifkan lapisan tambahan lewat panel kiri bila perlu — **Peta Lainnya** (Kawasan Hutan, Fungsi Ekosistem Gambut) atau **titik panas** untuk memeriksa indikasi kebakaran di sekitar kebun; rentang titik panas bisa dipilih **24 jam**, **5**, **10**, atau **30 hari** terakhir.
+ Saat sebuah peta referensi diaktifkan, di bawah namanya muncul **legenda warna kelas** (mis. HL, HP, HPT untuk Kawasan Hutan; fungsi lindung/budidaya untuk Gambut) beserta **sumber datanya**. Peta referensi ini adalah **acuan visual, bukan dasar penetapan resmi** — untuk kepastian status kawasan, rujuk dokumen resmi instansinya. Titik panas berasal dari satelit NASA FIRMS dan merupakan **deteksi anomali panas, bukan konfirmasi kebakaran** — warna titiknya menunjukkan tingkat keyakinan deteksi (merah tua = tinggi, oranye = nominal, kuning = rendah). Setelah titik panas dimuat, sistem menghitung jaraknya ke tiap Lembaga Petani dan menampilkan **ringkasan**: daftar titik dalam radius 15 km, bisa diklik untuk menuju lokasinya, plus tombol **Unduh SHP** dan **Cetak PDF** untuk membawa datanya keluar — Unduh SHP hanya tampil bila akun Anda punya izin **Export**, dan Cetak PDF bila punya izin **Print**, pada menu ini. Perlakukan semua ini sebagai petunjuk untuk diverifikasi ke lapangan, bukan kesimpulan. Untuk titik panas, rentang 10/30 hari digabung dari beberapa potongan 5 hari layanan NASA FIRMS — muat pertamanya sedikit lebih lama, dan bila salah satu potongan gagal diambil sistem sengaja menolak menampilkan sebagian agar jumlahnya tidak diam-diam bolong (coba lagi beberapa saat).
6. Gunakan alat **ukur jarak** bila perlu memperkirakan jarak antar titik.

> [!tip] Untuk kebutuhan verifikasi lapangan yang butuh cetakan ber-grid dan tabel, pakai **Report → Lahan** — bukan cetak layar dari peta ini.

## Kalau bermasalah

**Peta kosong** — belum ada lahan ber-poligon dalam cakupan akun Anda, atau filternya terlalu sempit.

**Poligon berada di lokasi yang salah** — masalahnya pada shapefile sumber, bukan pada peta. Lihat tutorial **Mengunggah lahan dari shapefile**.

**Lapisan tambahan tidak muncul** — peta referensi (Kawasan Hutan, Gambut) dan titik panas diambil langsung dari server pemerintah/NASA di luar MIS, yang bisa lambat atau sedang tak tersedia; ini bukan masalah pada data MIS Anda. Coba muat ulang halaman — bila tetap gagal berhari-hari, laporkan ke admin (alamat layanannya mungkin berubah).
