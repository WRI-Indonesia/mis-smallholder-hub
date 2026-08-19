---
title: Memantau titik api (Fire Alert)
icon: Map
menuKey: dashboard-risk-fire
permission: VIEW
duration: 5
href: /admin/dashboard/risk/fire
hrefLabel: Buka Fire Alert
goal: Anda bisa melihat lembaga mana yang wilayahnya memuat titik api, dan mencetak petanya sebagai PDF.
---

## Sebelum mulai

Fire Alert menampilkan **titik api (hotspot)** deteksi satelit VIIRS (NASA FIRMS) di seluruh Riau, lalu memisahkannya menjadi titik **di dalam boundary lembaga** dan **di luar boundary**.

+ Boundary lembaga adalah poligon wilayah kerja tiap ICS/lembaga petani yang diunggah admin dari shapefile. Ini berbeda dengan fitur Titik Api di **Peta Lahan** yang mengukur *jarak* ke titik kantor lembaga (radius 15 km) — Fire Alert menguji apakah titiknya benar-benar jatuh *di dalam* wilayah lembaga.

Data satelit bersifat *near-real-time* dengan jeda ± 3 jam, dan paling jauh hanya bisa melihat **5 hari ke belakang** (batas layanan FIRMS). Halaman ini tidak menyimpan riwayat.

+ Layanan FIRMS mengambil data per kotak persegi yang ikut mencakup wilayah tetangga (Malaysia, Sumbar, Jambi) — titik di luar batas administrasi Provinsi Riau otomatis disaring sebelum ditampilkan, jadi semua angka di halaman ini benar-benar se-Riau.

## Langkah

1. Buka menu **Dashboard → Risk Management → Fire Alert**.
2. Baca peta (¾ layar kiri): poligon ungu = boundary lembaga; garis putus-putus abu = batas kabupaten; titik = hotspot.
+ Titik **berikon api** berada di dalam boundary lembaga; titik berbentuk **lingkaran kecil** di luar. Warna keduanya menunjukkan confidence deteksi: merah tua = Tinggi, oranye = Nominal, kuning = Rendah. Legenda lengkap ada di pojok kiri-bawah peta.
3. Klik sebuah titik untuk melihat detailnya: waktu deteksi (WIB), confidence, satelit, dan lembaga pemilik boundary-nya. Klik poligon boundary untuk melihat jumlah titik di dalamnya.
4. Baca panel kanan: kartu ringkasan (titik dalam boundary, lembaga terdampak, titik luar, total se-Riau) dan tabel **titik api per lembaga**, urut dari yang terbanyak.
+ Hanya lembaga yang **memiliki** titik api yang ditampilkan — lembaga aman (0 titik) tidak memenuhi daftar. Aturan yang sama berlaku pada tabel di PDF hasil cetak. Klik sebuah baris untuk **zoom peta ke boundary** lembaga tersebut. Arahkan kursor ke kartu **Dalam Boundary** untuk rincian per distrik program, dan kartu **Luar Boundary** untuk rincian per kabupaten (+ Kab. Lainnya).
5. Ganti **Rentang waktu** bila perlu: **5 hari terakhir** (bawaan) atau **24 jam terakhir** untuk fokus ke kejadian paling baru.
6. Untuk mencetak, pilih cakupan pada **Print Map** — **Full Riau** atau langsung nama **Distrik** — lalu klik **Cetak Peta (PDF)**.
+ Hasilnya **Laporan Titik Api (Hotspot)**: halaman ber-logo WRI berisi kartu ringkasan, peta sebaran (peta otomatis di-zoom ke cakupan terpilih), tabel detail tiap titik dalam boundary (waktu, satelit, keyakinan, koordinat, lembaga), lalu lampiran **peta per lembaga** yang ada titik apinya. Proses agak lama karena peta di-capture per lembaga — tunggu sampai tombol kembali normal. Tombol ini hanya muncul bila Anda punya izin Print.

> [!hati-hati] Confidence **Rendah** kerap berupa pantulan permukaan panas (bukan api), dan sebaliknya kebakaran kecil di bawah tutupan bisa lolos deteksi. Jadikan Fire Alert sinyal awal untuk verifikasi lapangan, bukan bukti akhir.

## Kalau bermasalah

**"Gagal memuat titik api"** — layanan NASA FIRMS sedang tidak merespons. Muat ulang halaman beberapa menit kemudian.

**Tabel lembaga kosong ("Tidak ada titik api dalam boundary…")** — belum tentu galat; artinya memang tidak ada deteksi dalam boundary pada rentang terpilih. Bandingkan dengan kartu **Total se-Riau**.

**Cetak gagal mengambil gambar peta** — basemap **Hybrid** tidak bisa di-capture. Pindah ke basemap **Light** atau **Dark** (tombol kanan-bawah peta) lalu cetak ulang.

**Tabel kosong / lembaga tidak lengkap** — Anda hanya melihat lembaga dalam cakupan akses akun Anda. Bila seharusnya lebih luas, hubungi admin untuk menyesuaikan hak akses wilayah.
