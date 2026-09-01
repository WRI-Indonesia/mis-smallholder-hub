---
title: Mengunduh data spasial lahan
icon: Download
menuKey: map-parcel
permission: EXPORT
duration: 4
href: /admin/map/parcel
hrefLabel: Buka Peta Lahan
goal: Anda bisa mengunduh poligon lahan beratribut lengkap sebagai Shapefile, GeoJSON, atau KML untuk diolah di QGIS/ArcGIS.
---

## Sebelum mulai

Tombol **Unduh Lahan** tersedia di dua tempat: panel kiri **Peta Lahan** (di bawah tombol Muat Data) dan toolbar **Master Data → Lahan**. Keduanya menghasilkan berkas yang sama; pilih yang alurnya paling dekat dengan pekerjaan Anda.

Unduhan selalu mengikuti **filter aktif** — per Distrik atau per Lembaga Petani. Tidak ada mode "semua wilayah sekaligus"; ini disengaja agar berkasnya tetap ringan dan cakupannya jelas.

+ Tombol hanya tampil bila akun Anda punya izin **Export** pada menu tempat tombolnya berada. Di Master Data → Lahan, tombol nonaktif selama filter Distrik dan Lembaga Petani masih "Semua".

## Langkah

1. Pilih filter: di Peta Lahan minimal **Distrik**; di Master Data → Lahan pilih **Distrik** atau **Lembaga Petani**.
2. Klik **Unduh Lahan** lalu pilih format: **Shapefile (ZIP)**, **GeoJSON**, atau **KML**.
+ Shapefile untuk QGIS/ArcGIS; GeoJSON untuk olah data/web; KML untuk Google Earth. Ketiganya memakai koordinat WGS84 (EPSG:4326).
3. Buka berkas hasil unduhan di aplikasi GIS Anda.
+ ZIP Shapefile berisi `lahan.shp/.shx/.dbf/.prj/.cpg` — buka langsung ZIP-nya di QGIS tanpa perlu diekstrak. Nama berkas mengikuti pola `lahan_<lembaga-atau-distrik>_<tanggal-jam>`.

## Isi atribut

Setiap poligon membawa atribut lengkap: ID Lahan, **Parcel Code** (kode dari pemeta luar), ID & nama petani, NIK, Lembaga Petani, Kelompok Tani, Distrik, blok, luas (ha), status lahan, komoditas & species, PSR, tahun tanam, revisi, serta legalitas — surat kepemilikan (jenis & nomor, nama tertera, total luas tertera), STDB, dan program.

+ **Parcel Code dan pemetanya adalah dua kolom terpisah**, bukan satu kolom gabungan: `parcel_cod` (`parcelCode`) berisi **kode mentah saja**, mis. `ID080d781b4`, siap dipakai sebagai kunci **join** ke dataset pemeta di QGIS/ArcGIS; `pemeta` berisi penerbitnya, mis. `Meridia`. Di layar aplikasi (Detail Lahan, laporan) keduanya memang tampil menyatu sebagai `ID080d781b4 (Meridia)` karena di sana dibaca manusia — di berkas GIS sengaja dipisah supaya kodenya bisa langsung dipakai. Lahan yang punya kode dari lebih dari satu pemeta menampilkan semuanya dipisah `;` pada kedua kolom, urutannya sejajar — periksa dulu sebelum menjadikannya kunci join.

+ Pada Shapefile nama kolom dipendekkan maksimal 10 karakter (batas format DBF), mis. `nm_petani`, `sts_lahan`, `thn_tanam`, dan `parcel_code` menjadi **`parcel_cod`** — pemenggalan yang sama dengan yang dilakukan QGIS/ArcGIS sendiri. GeoJSON dan KML memakai nama panjang. Lahan dengan lebih dari satu surat/STDB digabung dalam satu kolom dipisah `;` — sama seperti Report → Lahan.

## Kalau bermasalah

**Tombol tidak tampil** — akun Anda tidak punya izin Export pada menu tersebut; hubungi admin.

**"Tidak ada lahan ber-poligon pada filter ini"** — hanya lahan dari unggahan shapefile yang punya poligon; lahan yang diinput lewat form tidak ikut terunduh.

**Sebagian lahan dilewati (geometri tidak valid)** — poligon sumbernya rusak sejak diunggah. Periksa lahan tersebut di Master Data, lalu unggah ulang shapefile-nya bila perlu.

**Huruf berbeda dengan di aplikasi** — atribut Shapefile disederhanakan ke huruf latin dasar (batas format DBF): huruf beraksen kehilangan aksennya (é→e), karakter di luar itu menjadi `?`. Perlu teks persis apa adanya? Pakai format **GeoJSON** atau **KML**.
