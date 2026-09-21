---
title: Mengelola patok batas lahan
icon: Map
menuKey: master-data-parcels
permission: CREATE
duration: 5
href: /admin/master-data/parcels
hrefLabel: Buka halaman Lahan
goal: Setiap sudut lahan punya patok bernomor dengan koordinat, kondisi, dan foto — patok yang berdiri di batas dua lahan tercatat satu kali dan dipakai bersama.
---

## Sebelum mulai

**Patok** adalah tanda batas fisik di sudut lahan (beton, kayu, pipa, atau tanda alam). Sistem menyimpannya terpisah dari poligon: poligon boleh direvisi lewat unggah shapefile, patoknya tetap.

+ Satu patok fisik biasanya berdiri di pertemuan **dua sampai empat lahan**. Karena itu patok dicatat **sekali** dan ditautkan ke semua lahan pemakainya — mengubah koordinat, kondisi, atau fotonya berlaku untuk semua lahan itu. Tabel patok menyebut lahan lain pemakainya di bawah koordinat ("Juga patok lahan …").
+ Nomor patok berlaku **per lahan** (lahan A menyebutnya patok #2, lahan tetangga mungkin #4). Nomor yang sama dipakai di peta, tabel, unduhan koordinat, dan Profil Lahan PDF. Selain nomor, tiap patok fisik punya **kode unik** seperti `HJP-PTK-000123` (singkatan Lembaga · PTK · nomor urut) yang sama di semua lahan pemakainya — kode inilah yang ditulis di patok fisik dan dipakai saat mengunggah ulang koordinat.

Tombol yang tampil mengikuti izin Anda pada menu Lahan: **Buat patok dari poligon** dan **Tambah patok** butuh izin tambah, pensil & panah urutan butuh izin ubah, ikon lepas tautan butuh izin hapus.

## Langkah

1. Buka **Master Data → Lahan**, klik tombol detail pada baris lahan, lalu buka tab **Patok**.
+ Peta menampilkan patok sebagai persegi **kuning** bernomor. Semua patok di tab ini adalah *patok lahan* (batas kebun) — status NKT lahan tidak mengubah warnanya; patok NKT (batas area NKT, mis. sempadan sungai) akan menjadi jenis data tersendiri. Lahan tetangga dalam 25 m ikut tergambar putus-putus, dengan daftarnya di bawah peta.
2. Klik **Buat patok dari poligon** untuk menurunkan patok dari sudut-sudut poligon.
+ Sistem menyederhanakan garis batas (±1 m) supaya lengkung hasil digitasi tidak jadi puluhan patok, lalu menomori sudut **searah jarum jam mulai dari yang paling utara**.
+ Pada dialog pratinjau, kolom **Hasil** memberi tahu: *Patok baru*, *Tautkan ke patok lahan X (d m)* — sudut ini ≤ 5 m dari patok yang sudah dibuat di lahan tetangga, jadi ditautkan bukan digandakan — atau *Sudah ada di lahan ini* (dilewati). Hilangkan centang pada sudut yang di lapangan bukan patok, lalu klik **Simpan**.
+ Aman dijalankan berulang: sudut yang sudah punya patok tidak dibuat dua kali.
3. Untuk patok yang tidak ada di sudut poligon (mis. di tengah sisi), klik **Tambah patok** dan isi lintang/bujur hasil GPS.
+ Koordinat harus berada ≤ 100 m dari batas lahan. Lintang dan bujur yang tertukar ditolak dengan petunjuk — periksa kolomnya.
4. Klik ikon **pensil** pada baris patok untuk mencatat **kondisi** (Ada / Hilang / Rusak / Belum dipasang), **bahan** (beton / kayu / pipa / tanda alam / lainnya), tanggal & petugas pemasangan, keterangan, dan **foto** (JPG/PNG/WebP ≤ 5 MB; foto tersimpan langsung saat dipilih).
+ Bila patok itu dipakai lahan lain, formulir menampilkan peringatan — perubahan berlaku untuk semuanya.
5. Pakai panah **↑ ↓** untuk mengubah urutan nomor bila penomoran lapangan berbeda; klik **Unduh koordinat** untuk berkas Excel patok lahan ini.
6. Ikon **lepas tautan** melepas patok dari lahan ini saja. Patok yang masih dipakai lahan lain tetap ada; patok tanpa pemakai dinonaktifkan (koordinatnya tersimpan sebagai riwayat).

> [!info] Banyak lahan sekaligus? Titik GPS lapangan bisa diunggah lewat **Bulk Upload → Upload Data Lahan → tab Patok** (Excel/CSV atau shapefile titik) — lihat tutorial *Mengunggah titik patok*.

## Hasil

Tab **Patok** menampilkan jumlah patok di judul tabnya. **Profil Lahan (PDF)** menggambar patok sebagai persegi kuning bernomor di peta dan menambahkan tabel **Patok Batas** (koordinat 6 desimal, kondisi, bahan, tanggal, lahan lain pemakai). Pada **Detail Lembaga Petani → tab Lahan**, menu **Unduh Lahan** punya pilihan **Patok batas (Excel)** untuk seluruh lahan lembaga itu.

## Kalau bermasalah

**Tombol "Buat patok dari poligon" nonaktif** — lahan belum punya poligon. Unggah shapefile-nya dulu lewat Bulk Upload → Upload Data Lahan.

**"Koordinat N m dari batas lahan — lat/long tampaknya tertukar"** — nilai lintang dan bujur terbalik di formulir. Di Riau lintang sekitar 0–2 dan bujur sekitar 100–103.

**Sudut poligon tidak muncul di pratinjau** — sudut itu berada pada garis yang hampir lurus sehingga dihilangkan oleh penyederhanaan ±1 m. Tambahkan lewat **Tambah patok** dengan koordinat GPS.

**Banner "Poligon lahan sudah direvisi sejak patok dibuat"** — poligon diunggah ulang setelah patok diturunkan. Patok lama tidak digeser; jalankan **Buat patok dari poligon** lagi untuk sudut yang baru, lalu lepas patok yang sudah tidak relevan.
