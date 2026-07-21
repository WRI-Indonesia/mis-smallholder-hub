---
title: Mengunggah lahan dari shapefile
icon: Map
menuKey: bulk-upload-parcels
permission: CREATE
duration: 15
href: /admin/bulk-upload/parcels
hrefLabel: Buka halaman Upload Lahan
goal: Poligon lahan masuk ke sistem sehingga bisa tampil di peta dan dipakai laporan ber-peta.
---

## Sebelum mulai

Ini **satu-satunya** cara memasukkan bentuk poligon lahan. Lahan yang diinput lewat form Master Data tidak punya poligon dan tak akan tampil di peta.

+ Lahan tanpa poligon tetap terhitung penuh di kartu Total Luas, laporan, dan produktivitas. Yang tidak bisa hanyalah menampilkannya di peta dan menyertakannya di Laporan Lahan ber-peta.

Siapkan **satu berkas ZIP** berisi shapefile lengkap: `.shp`, `.dbf`, `.shx`, dan `.prj`.

+ Keempatnya harus berada langsung di dalam ZIP, bukan di dalam folder bertingkat. Berkas `.prj` sering dianggap pelengkap dan tidak ikut diekspor — padahal justru itu yang memberi tahu sistem koordinat apa yang dipakai. Tanpanya, poligon bisa mendarat di tempat yang sama sekali salah.

Tabel atribut `.dbf` harus memuat **ID Petani** dan **ID Lahan**, karena dari situlah poligon dicocokkan ke petani yang sudah terdaftar.

## Langkah

1. Buka menu **Bulk Upload → Lahan**.
2. Pada **Langkah 1**, pilih berkas `.zip`. Sistem membaca isinya dan menyebut jumlah fitur yang terdeteksi.
+ Bila jumlah fitur jauh berbeda dari yang Anda harapkan, hentikan di sini — biasanya berarti ZIP-nya memuat layer yang salah.
3. Pada **Langkah 2 — Petakan Atribut Kolom**, cocokkan kolom tabel atribut dengan kolom sistem.
+ Nama kolom di shapefile sering terpotong menjadi 10 karakter (batas format DBF), misalnya `ID_PETANI` jadi `ID_PETAN`. Itu normal — cocokkan berdasarkan isinya, bukan namanya.
4. Klik **Validasi Data Shapefile**.
5. Periksa **peta pratinjau**: poligon hijau berarti valid, merah bermasalah. Klik sebuah poligon untuk melihat detail dan alasan errornya.
+ Peta ini pemeriksaan terpenting di halaman ini. Tabel bisa menyatakan seluruh baris valid, tetapi hanya peta yang memperlihatkan bahwa poligonnya mendarat di lokasi yang keliru.
6. Klik **Fokus Semua** untuk memastikan semua poligon berada di wilayah yang masuk akal.
+ Bila peta melompat ke tengah laut atau ke belahan bumi lain, hampir pasti `.prj` tidak terbaca. Perbaiki di perangkat lunak GIS asal lalu ekspor ulang — jangan diteruskan.
7. Perbaiki bila perlu, lalu klik **Simpan N Lahan Valid**.

> [!penting] Bila sebuah ID Lahan sudah ada **dengan bentuk poligon berbeda**, sistem memperlakukannya sebagai **revisi**: data lama dinonaktifkan, data baru disimpan dengan nomor revisi berikutnya, dan catatan produksinya ikut dipindahkan. Riwayat tidak hilang.

+ Bila poligonnya sama persis, sistem menolak dengan pesan bahwa data itu sudah terdaftar. Itu bukan kegagalan — memang tidak ada yang perlu diubah.

## Memastikan berhasil

Lahan tampil di **Peta Lahan**, dan bisa dipakai di **Laporan Lahan** yang menyertakan peta cetak.

## Kalau bermasalah

**ZIP ditolak atau terbaca kosong** — pastikan `.shp`, `.dbf`, `.shx`, `.prj` berada langsung di dalam ZIP, bukan di dalam folder.

**Semua baris error "petani tidak ditemukan"** — kolom ID Petani salah dipetakan, atau petaninya memang belum terdaftar.

+ Bila petaninya belum ada, daftarkan lebih dulu — lewat form Master Data untuk beberapa orang, atau **Upload Petani** bila jumlahnya banyak. Unggahan lahan tidak bisa membuat petani baru.

**Poligon tampil tapi bentuknya aneh atau bertumpuk** — geometri belum tertutup rapi di perangkat lunak GIS asal. Perbaiki di sana lalu ekspor ulang.
