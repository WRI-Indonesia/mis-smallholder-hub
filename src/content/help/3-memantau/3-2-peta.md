---
title: Peta
icon: Map
---

**Peta Lahan** — Sebaran poligon lahan dengan berbagai overlay (mis. Kawasan Hutan, Fungsi Ekosistem Gambut, titik panas/hotspot), alat ukur jarak, label, serta pencarian lahan dengan zoom otomatis.

**Tambah Data GIS Lain** — Di panel Peta Lahan Anda dapat menambahkan data GIS sendiri: WMS URL, Shapefile (ZIP/RAR), atau GeoJSON — diproses di browser, tidak diunggah ke server. Untuk layer Shapefile/GeoJSON: klik nama layer atau ikon zoom di daftar untuk menuju lokasinya, dan klik fiturnya di peta untuk melihat popup atribut. Layer juga bisa diwarnai per nilai atribut (symbology): pilih atributnya pada kotak "Warna tunggal / Warna per ..." di bawah nama layer — legend warna tampil otomatis.

**Titik Api (Hotspot)** — Muat data lahan lebih dulu (pilih Distrik lalu Muat Data), kemudian centang "Tampilkan titik api" untuk memuat deteksi anomali panas NASA FIRMS (VIIRS 375 m, area Riau); pilih rentang **24 jam** (24 jam terakhir bergulir) atau **5 hari**. Warna titik dan jumlah pada legenda dibedakan per keyakinan deteksi: Tinggi (merah tua), Nominal (oranye), Rendah (kuning). Setelah kalkulasi jarak selesai, muncul **modal ringkasan**: total titik per keyakinan, jumlah yang berjarak < 15 km dari Lembaga Petani, dan tabelnya (klik baris untuk zoom ke titiknya di peta); buka ulang lewat tombol **Lihat Ringkasan**. Tombol **Unduh SHP** menyimpan titik sebagai ZIP Shapefile; **Cetak PDF** membuat laporan landscape berisi titik < 15 km beserta lembaga terdekat dan jaraknya — kedua tombol juga tersedia di dalam modal. Ini deteksi satelit, bukan konfirmasi kebakaran — data tampil dengan jeda ±3 jam.

**Zoom lewat panel kiri** — Klik teks label pada Legenda (Point Lembaga Petani, Point/Area Lahan Petani) atau label "Tampilkan titik api" untuk langsung zoom ke sebaran data layer tersebut; kotak centangnya tetap untuk menampilkan/menyembunyikan layer.

**Peta BMP** — Peta tematik: pilih layer Ketersediaan Data Produksi atau Produktivitas (Ton/Ha). Pilih Lembaga terlebih dulu, lalu klik Muat Data.

**Cetak peta** — Tombol Cetak menghasilkan PDF sesuai tampilan layer aktif (peta, legenda, dan tabel data), dan tersedia juga unduhan Excel.

**Profil Lahan (PDF)** — Dari peta atau halaman detail Petani, Anda dapat mencetak Profil Lahan satu persil: identitas petani, layout kebun, pelatihan, dan produksi.
