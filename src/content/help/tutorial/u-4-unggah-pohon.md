---
title: Mengunggah titik pohon sawit
icon: TreePine
menuKey: bulk-upload-trees
permission: CREATE
duration: 10
href: /admin/bulk-upload/trees
hrefLabel: Buka halaman Upload Pohon Sawit
goal: Titik pohon per lahan masuk ke sistem sehingga jumlah pohon dan kerapatan tanam tampil di detail lahan dan detail petani.
---

## Sebelum mulai

Data pohon berasal dari hasil deteksi model (citra satelit/drone) yang sudah dikoreksi manusia, diekspor sebagai **shapefile titik (point)** — satu titik satu pohon.

+ Kolom `source` pada data menjelaskan asal tiap titik: `auto` = draf model, `moved` = digeser manusia, `added` = ditambah manusia, `verified` = diperiksa manusia. Sistem menyimpannya apa adanya sebagai atribut tiap titik.

Siapkan **satu berkas ZIP** berisi shapefile lengkap: `.shp`, `.dbf`, `.shx`, dan `.prj` (WGS84).

+ Keempatnya harus berada langsung di dalam ZIP, bukan di dalam folder bertingkat — sama seperti unggah lahan.

Tabel atribut `.dbf` wajib memuat kolom `parcel_id` berisi **ID Lahan** persis seperti yang terdaftar di Master Data Lahan — dari situlah titik dicocokkan ke lahannya. Satu ZIP boleh memuat titik untuk beberapa lahan sekaligus; sistem mengelompokkannya otomatis.

> [!penting] Lahannya harus **sudah terdaftar dan aktif** lebih dulu. Unggahan pohon tidak bisa membuat lahan baru — daftarkan lahannya lewat Master Data atau Upload Lahan sebelum mengunggah pohonnya.

## Langkah

1. Buka menu **Bulk Upload → Pohon Sawit**.
2. Pilih berkas `.zip`. Sistem membaca isinya dan menyebut jumlah titik serta jumlah lahan yang terdeteksi.
3. Periksa tabel pratinjau per lahan: nama petani, jumlah titik, luas, dan **kerapatan tanam** (pohon/ha) hasil hitung.
+ Kerapatan yang jauh dari rujukan umum ± 136 pohon/ha patut dicurigai — bisa jadi titiknya bukan milik lahan itu, atau luas lahannya belum diisi dengan benar.
4. Perhatikan kolom **Status**: `Baru` berarti lahan itu belum punya data pohon; `Revisi` berarti unggahan ini akan **mengganti seluruh set** titik lama lahan tersebut.
+ `Lahan tidak ditemukan` berarti `parcel_id` di file tidak cocok dengan ID Lahan aktif mana pun dalam akses Anda — baris itu otomatis dilewati saat menyimpan, sisanya tetap bisa disimpan.
5. Klik **Simpan N Pohon**.

> [!penting] Upload ulang untuk lahan yang sama bekerja per **set**, bukan per titik: seluruh titik lama lahan itu dinonaktifkan dan set baru disimpan dengan nomor revisi berikutnya. Tidak ada penggabungan — kirimkan selalu ekspor lengkap satu lahan, bukan hanya titik yang berubah.

## Memastikan berhasil

Buka **Master Data → Lahan → detail lahan** yang bersangkutan: kartu **Pohon Sawit** menampilkan jumlah pohon dan kerapatan, dan titik-titik kuning tampil langsung di peta **Informasi Lahan** di atas poligon. Di detail petani (tab **Lahan**), kolom **Jumlah Pohon** terisi dan titik kuningnya tampil di peta Sebaran Lahan.

## Kalau bermasalah

**ZIP ditolak atau terbaca kosong** — pastikan `.shp`, `.dbf`, `.shx`, `.prj` berada langsung di dalam ZIP, dan layer-nya bertipe **Point** (bukan poligon).

**Semua lahan berstatus "tidak ditemukan"** — isi kolom `parcel_id` tidak persis sama dengan ID Lahan di Master Data (perhatikan titik dan huruf besar-kecil), atau lahannya di luar wilayah akses akun Anda.

**Status "ID Lahan ganda (lintas petani)"** — ID Lahan itu terdaftar pada lebih dari satu petani, sehingga sistem tidak bisa menentukan lahan mana yang dimaksud. Rapikan dulu ID Lahan yang kembar di Master Data Lahan, baru unggah ulang.

**Status "Melebihi batas 50.000 titik per lahan"** — satu `parcel_id` di file memuat lebih dari 50.000 titik; baris itu dilewati saat menyimpan. Jumlah sebesar itu hampir pasti berarti titik beberapa lahan tergabung ke satu `parcel_id` (lahan sawit rakyat normalnya ratusan titik) — perbaiki atribut `parcel_id` di data sumber, lalu unggah ulang.

**Titik dilewati karena koordinat tidak valid** — shapefile tidak dalam WGS84 (EPSG:4326). Ekspor ulang dari perangkat lunak GIS dengan sistem koordinat itu.
