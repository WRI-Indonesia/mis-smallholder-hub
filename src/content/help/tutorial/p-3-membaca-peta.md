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
3. Pilih layer: **Ketersediaan Data Produksi** atau **Produktivitas (Ton/Ha/tahun)**.
+ Layer pertama menjawab "lahan mana yang datanya lengkap", layer kedua "lahan mana yang hasilnya tinggi". Keduanya memakai data yang sama, hanya cara membacanya berbeda.
4. Untuk layer Ketersediaan, baca empat kategori warnanya.
+ Kategori dihitung dari berapa bulan berturut-turut sebuah lahan punya catatan produksi: Baik lebih dari dua tahun, Cukup minimal satu tahun, Kurang di bawah satu tahun, dan abu-abu tanpa data sama sekali. Lahan abu-abu adalah daftar kerja pengumpulan data Anda berikutnya.
5. Untuk layer Produktivitas, pilih **Tahun** atau rata-rata.
+ Produktivitas dihitung sebagai produksi tahun itu yang **disetahunkan**, dibagi luas persil. Disetahunkan artinya tahun yang datanya belum 12 bulan diproyeksikan: produksi × 12 ÷ jumlah bulan yang ada datanya di **Lembaga** itu (mis. data Jan–Jul dikali 12/7) — aturan yang sama dengan BMP Dashboard, jadi angka sebuah lahan di peta bisa dibandingkan langsung dengan Top 10 Lembaga di sana. Lahan yang melapor lebih sedikit bulan daripada Lembaganya tidak ikut diproyeksikan penuh, sehingga tetap terlihat rendah. Lahan yang sedang PSR wajar bernilai rendah atau nol.
6. Klik sebuah poligon untuk melihat detailnya.
7. Klik **Cetak Peta …** untuk PDF, atau **Download … (Excel)** untuk tabelnya.
+ Label tombolnya mengikuti layer aktif (mis. **Cetak Peta dan Matriks Ketersediaan Data** / **Download Produktivitas (Excel)**), begitu pula isi keluarannya — termasuk legenda dan tabel datanya, jadi periksa layernya sudah benar sebelum mencetak. Tombol Cetak hanya tampil bila akun Anda punya izin **Print**, dan Download bila punya izin **Export**, pada menu ini.

> [!penting] Berbeda dari BMP Dashboard, Peta BMP **tidak memakai snapshot** — warnanya dihitung langsung dari data produksi saat Anda klik **Muat Data**. Bila data produksi baru saja diunggah, cukup klik Muat Data lagi.

## Memilih peta dasar

Deretan tombol di pojok kanan peta (kanan-bawah di Peta Lahan, Peta BMP, dan Fire Alert; kanan-atas di peta lainnya; di Peta Rantai Pasok kelima pilihan ada di balik tombol **Basemap** di kanan atas) mengganti **peta dasar** — latar di belakang data Anda. Pilihannya sama di semua halaman peta:

| Tombol | Isinya | Paling cocok untuk |
| --- | --- | --- |
| **STREET** | OpenStreetMap lengkap: jalan, nama tempat, fasilitas umum | Mencari lokasi, menjelaskan posisi ke orang lain |
| **LIGHT** | Terang, label secukupnya | Membaca poligon dan warna kategori tanpa gangguan |
| **DARK** | Gelap, label secukupnya | Layar gelap, atau menonjolkan titik terang seperti titik api |
| **SAT** | Citra satelit tanpa label | Melihat tutupan lahan sebenarnya |
| **HYBRID** | Citra satelit + nama jalan/tempat | Mencocokkan poligon dengan kondisi lapangan |

+ Light dan Dark sengaja dibuat sepi supaya data Anda yang menonjol, bukan latarnya. Kalau Anda justru butuh nama desa dan jalan, pakai **STREET**. Pilihan Anda hanya berlaku selama halaman itu dibuka; saat dibuka kembali, peta memakai bawaannya lagi.

## Kalau bermasalah

**Peta kosong setelah Muat Data** — lembaga tersebut belum punya lahan ber-poligon.

**Semua lahan abu-abu** — belum ada data produksi untuk lahan-lahan itu, atau produksinya tercatat tanpa ID Lahan sehingga tak bisa dikaitkan ke persil.

+ Periksa di **Master Data → Produksi** apakah kolom lahannya terisi. Produksi tanpa lahan tetap terhitung sebagai total, tetapi tidak mewarnai peta.

**Poligon berada di lokasi yang salah** — masalahnya ada pada shapefile sumber, bukan pada peta. Lihat tutorial **Mengunggah lahan dari shapefile**.

**Cetak gagal mengambil gambar peta** — peta dasar citra (**SAT** dan **HYBRID**) tidak bisa di-capture. Pindah ke **STREET**, **LIGHT**, atau **DARK** lalu cetak ulang.
