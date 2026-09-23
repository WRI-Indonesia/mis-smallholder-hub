---
title: Mencetak Laporan Lahan ber-peta
icon: Printer
menuKey: report-land-parcel
permission: VIEW
duration: 10
href: /admin/report/land-parcel
hrefLabel: Buka Laporan Lahan
goal: PDF berisi peta poligon ber-grid dan tabel lahan satu lembaga, siap dipakai verifikasi lapangan.
---

## Sebelum mulai

Tutorial ini tentang **mencetak** roster satu lembaga beserta petanya. Untuk memakai halaman yang sama sebagai **daftar kerja** — menyaring lahan yang belum bersurat atau belum ber-STDB — lihat *Menyaring lahan yang belum punya surat atau STDB*.

Ini laporan paling rumit sekaligus paling berguna di lapangan: peta poligon dengan grid indeks, label per persil, skala, dan penunjuk utara — ditambah tabel rincian lahannya.

Hanya lahan ber-poligon yang muncul di petanya.

+ Lahan tanpa poligon tetap masuk tabel dan tetap dijumlahkan luasnya, hanya tidak tergambar. Jadi jumlah baris tabel bisa lebih banyak daripada poligon yang terlihat, dan itu bukan kesalahan.

## Langkah

1. Buka menu **Report → Lahan**.
2. Pilih **Distrik** lalu **Lembaga Petani**. Lembaga wajib dipilih.
3. Periksa empat kartu ringkasan: Total Petani, Kelompok Tani, Total Lahan, Total Luas.
+ Tombol **Kolom** mengatur kolom tabel & ekspor. Selain atribut lahan, tersedia kolom legalitas — **Surat Kepemilikan**, **Nama di Surat**, **Luas Tertera**, **STDB** — yang bawaannya mati; nyalakan bila laporan dipakai untuk verifikasi kepemilikan. Luas Tertera adalah angka di surat, sengaja terpisah dari Luas poligon dan tidak ikut baris Total.
+ Kolom **Koordinat (Excel)** (bawaannya menyala) hanya terbit di unduhan **Excel** — tidak di tabel layar maupun PDF. Isinya dua kolom di ujung kanan: **Jumlah Node** lalu **Koordinat** (seluruh titik sudut poligon sebagai `Lintang,Bujur` dipisah `; `, bisa ditempel ke Google Maps). Matikan bila tidak perlu agar berkas lebih ringan.
+ Gunakan kartu ini sebagai pemeriksaan cepat. Bila Total Lahan jauh lebih kecil dari yang Anda tahu, kemungkinan sebagian lahan lembaga itu belum diunggah.
4. Atur **Grid Index** — jumlah Baris × Kolom peta cetak.
+ Grid membagi wilayah lembaga menjadi sel-sel yang dicetak satu per satu, sehingga poligon tetap terbaca di kertas A4. Wilayah luas butuh grid lebih rapat; lembaga kecil cukup 1×1.
5. Pilih **Latar Peta**: *Polos*, *StreetMap*, *Satellite*, atau *Hybrid*.
+ *Polos* (bawaan) mencetak poligon di atas kertas putih — paling hemat tinta dan paling tajam untuk dicoret di lapangan. *Satellite* dan *Hybrid* memperlihatkan tutupan lahan sebenarnya, berguna saat memeriksa apakah poligon benar-benar jatuh di kebun. *StreetMap* memberi jalan dan nama tempat sebagai orientasi menuju lokasi.
+ Saat latar aktif, poligon digambar sebagai **garis tanpa isian** supaya kebun di dalamnya tetap terlihat. Slider **Kepekatan Latar** mengatur seberapa tegas latarnya dicetak — turunkan bila label mulai sulit dibaca, naikkan bila citranya terlalu samar. Bawaannya 65%; 0% berarti latar hilang sama sekali (putih polos).
+ Latar hanya tersedia sampai 30 sel grid. Di atas itu pilihannya terkunci ke *Polos*, karena tiap sel menambah satu gambar ke berkas dan PDF-nya membengkak sampai belasan MB.
6. Pilih **Label Poligon** yang ingin ditampilkan: No, Nama, ID Petani, ID Lahan, atau Kelompok Tani.
+ Jangan mencentang semuanya. Label bertumpuk membuat peta justru sulit dibaca — untuk verifikasi lapangan biasanya No dan ID Lahan sudah cukup, karena rinciannya bisa dilihat di tabel.
7. Perhatikan **preview peta** di layar dan sesuaikan grid bila perlu.
+ Preview memperlihatkan hasil cetak yang sebenarnya, termasuk halaman ikhtisar dan tiap sel grid. Menyesuaikan di sini jauh lebih cepat daripada mencetak lalu mengulang.
8. Unduh **PDF** atau **Excel**.
+ PDF berformat landscape: halaman pertama ikhtisar, disusul peta per sel, lalu tabel. Excel-nya multi-sheet dan turut menyertakan gambar peta.
+ Pilihan **Urut** di sebelah tombol Kolom menentukan nomor urut lahan — di tabel, peta, PDF, dan Excel sekaligus: **Abjad pemilik** (bawaan: Kelompok Tani lalu nama petani) atau **Posisi lahan** (lahan paling utara dulu dari kiri ke kanan, lalu baris lahan di bawahnya — cocok untuk menyusuri kebun di lapangan). Di sheet per KT/Blok, urutan posisi dihitung ulang di dalam tiap sheet.
+ Pilihan **Sheet per** di sebelah tombol Excel menentukan pecahan sheet: **Grid peta** (bawaan — satu sheet per sel grid, ber-gambar peta), **Kelompok Tani** (satu sheet per KT, bernama KT-nya), atau **Blok** (satu sheet per Blok, bernama Blok-nya — lahan se-Blok terkumpul walau KT-nya berbeda; KT tiap lahan tetap terbaca di kolom Kelompok Tani). Tiap sheet KT/Blok berisi tabel + gambar peta lahan grup itu (nomor di peta = kolom No sheet, mulai 1 lagi) dan punya baris Total sendiri. Latar peta hanya dipasang bila sheet-nya paling banyak 30; lebih dari itu poligon tetap digambar tanpa latar; lahan tanpa KT/Blok (termasuk yang KT-nya tertulis "Tidak Ada") masuk sheet **Tanpa KT** / **Tanpa Blok**. Nama yang lebih dari 31 karakter dipendekkan dengan "…" (batas Excel). Sheet **Lahan** tetap berisi seluruh baris. Pilihan ini tidak memengaruhi PDF.
+ Bila latar peta dipakai, tombolnya berubah jadi **Menyiapkan peta…** sebentar: berkas menunggu sampai semua halaman punya latarnya. Tidak perlu menunggu preview selesai sebelum menekan unduh.
9. Perlu laporan khusus NKT untuk Lembaga ini? Klik tombol merah **Laporan NKT** di samping PDF (tombol yang sama juga ada di detail Lembaga Petani → tab Lahan).
+ Berkas ini **tidak mengikuti filter** — isinya seluruh lahan aktif Lembaga: kop dengan sumber asesmen, tiga angka ringkasan (total lahan, lahan NKT, luas NKT), peta seluruh lahan dengan lahan NKT merah bernomor (plus peta rinci per gugus bila persilnya kecil), tabel **hanya lahan NKT**, dan ringkasan per kategori NKT 1–6. Nama berkasnya `Laporan_NKT_<kode Lembaga>_<tanggal>.pdf`. Rinciannya di tutorial *Menyaring lahan yang belum punya surat atau STDB* (bagian Laporan NKT).

## Kalau bermasalah

**Peta kosong tapi tabel terisi** — lahan lembaga itu belum punya poligon. Lihat tutorial **Mengunggah lahan dari shapefile**.

**Label bertumpuk dan tak terbaca** — kurangi jenis label yang dicentang, atau perapat grid agar tiap sel memuat lebih sedikit poligon.

**PDF terasa lama dibuat** — wajar untuk lembaga dengan ratusan persil, karena tiap sel grid digambar satu per satu. Dengan latar peta aktif lebih lama lagi, karena tiap halaman menarik puluhan potongan peta. Tunggu sampai selesai, jangan mengklik berulang.

**Latar peta tidak muncul atau sebagian putih** — latar diambil dari penyedia peta lewat internet. Periksa koneksi, tunggu tulisan "Menyiapkan latar peta…" di bawah panel hilang, lalu unduh ulang.

**Pilihan Latar Peta tidak bisa diklik** — grid Anda melebihi 30 sel. Kecilkan jumlah baris atau kolom.

**Sumber peta di pojok kanan bawah** — tulisan "Map data © Google" atau "© OpenStreetMap contributors" wajib ikut tercetak sebagai atribusi penyedia peta. Jangan dipotong atau ditutup saat menggandakan cetakan.
