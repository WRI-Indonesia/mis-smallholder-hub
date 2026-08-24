---
title: Peta
icon: Map
---

**Peta Lahan** — Sebaran poligon lahan dengan berbagai overlay (mis. Kawasan Hutan, Fungsi Ekosistem Gambut, titik panas/hotspot), alat ukur jarak, label, serta pencarian lahan dengan zoom otomatis.

**Tambah Data GIS Lain** — Di panel Peta Lahan Anda dapat menambahkan data GIS sendiri: WMS URL, Shapefile (ZIP/RAR), atau GeoJSON — diproses di browser, tidak diunggah ke server. Untuk layer Shapefile/GeoJSON: klik nama layer atau ikon zoom di daftar untuk menuju lokasinya, dan klik fiturnya di peta untuk melihat popup atribut. Layer juga bisa diwarnai per nilai atribut (symbology): pilih atributnya pada kotak "Warna tunggal / Warna per ..." di bawah nama layer — legend warna tampil otomatis.

**Titik Api (Hotspot)** — Muat data lahan lebih dulu (pilih Distrik lalu Muat Data), kemudian centang "Tampilkan titik api" untuk memuat deteksi anomali panas NASA FIRMS (VIIRS 375 m); pilih rentang **24 jam** (24 jam terakhir bergulir), **5 hari**, **10 hari**, atau **30 hari** (hari kalender UTC termasuk hari ini; rentang 10/30 hari digabung dari beberapa potongan 5 hari sehingga muat pertamanya sedikit lebih lama). Layanan FIRMS mengambil data per kotak persegi yang ikut mencakup wilayah tetangga (Malaysia, Sumbar, Jambi, Kepri) — titik di luar batas administrasi **Provinsi Riau** otomatis disaring sebelum ditampilkan, jadi peta, legenda, Unduh SHP, dan Cetak PDF semuanya benar-benar se-Riau dan angkanya sejalan dengan Dashboard Fire Alert. Warna titik dan jumlah pada legenda dibedakan per keyakinan deteksi: Tinggi (merah tua), Nominal (Medium) (oranye), Rendah (kuning). Setelah kalkulasi jarak selesai, muncul **modal ringkasan**: total titik per keyakinan, jumlah yang berjarak < 15 km dari Lembaga Petani, dan tabelnya (klik baris untuk zoom ke titiknya di peta); buka ulang lewat tombol **Lihat Ringkasan**. Tombol **Unduh SHP** menyimpan titik sebagai ZIP Shapefile; **Cetak PDF** membuat laporan landscape berisi titik < 15 km beserta lembaga terdekat dan jaraknya — kedua tombol juga tersedia di dalam modal (Unduh SHP butuh izin **Export**, Cetak PDF butuh izin **Print**). Ini deteksi satelit, bukan konfirmasi kebakaran — data tampil dengan jeda ±3 jam.

**Zoom lewat panel kiri** — Klik teks label pada Legenda (Point Lembaga Petani, Point/Area Lahan Petani) atau label "Tampilkan titik api" untuk langsung zoom ke sebaran data layer tersebut; kotak centangnya tetap untuk menampilkan/menyembunyikan layer.

**Peta BMP** — Peta tematik: pilih layer Ketersediaan Data Produksi atau Produktivitas (Ton/Ha). Pilih Lembaga terlebih dulu, lalu klik Muat Data.

**Cetak peta** — Tombol Cetak menghasilkan PDF sesuai tampilan layer aktif (peta, legenda, dan tabel data), dan tersedia juga unduhan Excel. Tombol Cetak hanya tampil bila akun Anda punya izin **Print**, dan unduhan Excel bila punya izin **Export**, pada menu peta tersebut.

**Profil Lahan (PDF)** — Dari peta atau halaman detail Petani, Anda dapat mencetak Profil Lahan satu persil: identitas petani, layout kebun, pelatihan, dan produksi. Tombolnya hanya tampil bila akun Anda punya izin **Print** pada menu halaman tersebut.
