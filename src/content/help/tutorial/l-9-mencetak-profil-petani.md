---
title: Mencetak Profil Petani (PDF)
icon: Printer
menuKey: master-data-farmers
permission: PRINT
duration: 3
href: /admin/master-data/farmers
hrefLabel: Buka halaman Petani
goal: Satu berkas PDF berisi seluruh data seorang petani — identitas, ringkasan, daftar dan peta sebaran lahan, pelatihan, produksi — beserta lampiran Profil Lahan untuk tiap lahannya.
---

## Sebelum mulai

**Profil Petani** adalah pasangan **Profil Lahan**: kalau Profil Lahan mencetak satu lahan, Profil Petani mencetak *satu orang* — semua data yang berkaitan dengannya dalam satu dokumen. Angkanya sama persis dengan yang tampil di halaman Detail Petani, karena dihitung dari sumber yang sama.

+ Isi dokumen, berurutan: **ringkasan petani** (identitas, lima kartu yang sama dengan layar, tabel **Daftar Lahan** bernomor, **Peta Sebaran Lahan**, tabel **Pelatihan** — paket, tanggal, nilai pre/post —, **Produksi** gabungan semua lahan per tahun plus rekap per lahan, dan **Monev BMP** — skor per tahun beserta radar lima kegiatan tahun terbaru, hanya bila akun Anda boleh melihat menu Monev BMP), lalu **lampiran**: satu Profil Lahan lengkap untuk tiap lahan yang sudah dipetakan, bernomor sama dengan kolom **No** di tabel dan penanda di peta. Nomor halaman berjalan menerus dari awal sampai lampiran terakhir.

> [!penting] NIK dan tanggal lahir tercetak **penuh** di PDF (di layar disensor) karena dokumen ini bersifat resmi dan diserahkan ke petani atau pihak yang berwenang. Perlakukan berkasnya seperti dokumen pribadi — jangan sebar lewat kanal terbuka.

## Langkah

1. Buka **Master Data → Petani**, lalu klik ikon **printer** pada baris petani — atau buka halaman detailnya dan klik **Profil Petani (PDF)** di samping tombol Edit.
+ Kedua tombol menghasilkan berkas yang sama. Dari daftar lebih cepat bila Anda mencetak beberapa petani berurutan; dari halaman detail lebih aman bila Anda ingin memeriksa datanya dulu. Selama satu petani diproses, hanya tombol baris itu yang berputar — baris lain tetap bisa diklik setelahnya.
2. Bila petani punya **lebih dari 10 lahan**, pilih di jendela yang muncul: **Lengkap** (dengan lampiran tiap lahan) atau **Ringkasan saja**.
+ Jendela menyebut perkiraan tebal dokumen — kira-kira dua halaman ringkasan ditambah satu sampai dua halaman per lahan. Petani dengan 40 lahan berarti 40 lampiran; kalau yang dibutuhkan hanya gambaran umum, pilih Ringkasan saja — isinya persis bagian pertama dokumen lengkap, hanya tanpa lampiran, dan jauh lebih cepat.
3. Tunggu pemberitahuan **Menyiapkan Profil Petani…** berganti menjadi **siap diunduh**; berkas tersimpan dengan nama `Profil_Petani_<Lembaga>_<Nama>_<ID Petani>.pdf`.
+ Untuk petani dengan banyak lahan proses bisa memakan beberapa detik karena tiap lampiran memuat peta, legalitas, sepadan, NKT, patok, dan lahan tetangga — sama seperti mencetak Profil Lahan satu per satu.

## Memastikan berhasil

Buka PDF-nya: nomor pada penanda bulat di **Peta Sebaran Lahan** sama dengan kolom **No** di Daftar Lahan dan dengan tulisan *Lampiran n dari N* di pojok kanan atas tiap lampiran. Kartu ringkasan (Lahan, Produksi, Pelatihan, Kelengkapan Profil, Produktivitas) menampilkan angka yang sama dengan halaman Detail Petani.

+ Peta sebaran sengaja hanya menggambar **penanda bulat bernomor** di titik tengah tiap lahan; bentuk poligonnya ikut digambar tetapi baru terbaca bila lahan-lahannya berdekatan. Lahan petani bisa tersebar sampai puluhan kilometer, dan pada skala itu satu hektare hanya setitik di kertas — bentuk dan batas tiap lahan ada di lampirannya. Penanda **merah** menandai lahan NKT.

## Kalau bermasalah

**Tombol atau ikon printer tidak tampil.** Akun Anda tidak punya izin **Print** pada menu Petani. Izin yang sama juga mengatur tombol PDF Profil Lahan di tab Lahan. Hubungi administrator.

**Bagian Monev BMP tidak ada di PDF.** Bagian ini mengikuti izin **View** menu *Monev BMP* — sama seperti tab Monev BMP di halaman detail. Bila akun Anda tidak punya izin itu, dokumen tetap terbit tanpa bagian tersebut.

**Petani belum punya lahan.** Tombol tetap aktif; PDF berisi identitas, pelatihan, dan produksi saja — tanpa peta dan tanpa lampiran. Ini normal untuk petani yang lahannya belum dipetakan.

**Ada lahan di tabel tanpa nomor dan bertuliskan *belum dipetakan*.** Lahan itu belum punya poligon, sehingga tidak bisa digambar di peta dan tidak punya lampiran Profil Lahan. Unggah shapefile-nya lewat Bulk Upload → Upload Data Lahan; setelah itu lahan tersebut mendapat nomor dan lampiran.

**Peta sebaran hanya berisi titik bernomor, poligonnya tak terlihat.** Lahan petani ini tersebar jauh sehingga poligon terlalu kecil pada skala peta. Bentuk dan batas tiap lahan ada di lampirannya (lihat nomor yang sama).

**Muncul pesan gagal membuat PDF.** Muat ulang halaman dan coba lagi; bila berulang untuk petani tertentu, catat ID Petaninya dan laporkan ke administrator — biasanya ada geometri lahan yang tidak valid.
