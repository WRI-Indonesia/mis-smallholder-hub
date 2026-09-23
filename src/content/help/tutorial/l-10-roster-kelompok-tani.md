---
title: Menyusun roster anggota per Kelompok Tani
icon: Users
menuKey: report-kelompok-tani-detail
permission: VIEW
duration: 6
href: /admin/report/kelompok-tani-detail
hrefLabel: Buka Kelompok Tani (Detail)
goal: Daftar nama anggota tiap Kelompok Tani dalam satu Lembaga Petani — untuk verifikasi keanggotaan atau daftar hadir — terunduh sebagai Excel atau PDF.
---

## Sebelum mulai

Menu ini menjawab pertanyaan **"siapa saja anggota KT ini?"**. Bila yang Anda butuhkan justru rekap jumlah lintas lembaga, pakai [Laporan Kelompok Tani (Ringkasan)](/admin/help/tutorial-laporan/laporan-kelompok-tani) — menunya berbeda, isinya berbeda.

Keanggotaan KT di sini **diturunkan dari data lahan**, bukan dari daftar anggota tersendiri: seorang petani masuk ke sebuah KT karena salah satu persilnya mencantumkan nama KT itu.

+ Tiga konsekuensi yang perlu Anda sadari sebelum memakai hasilnya sebagai daftar resmi: petani yang belum punya lahan aktif **tidak akan muncul sama sekali**; lahan yang field Kelompok Tani-nya kosong dikumpulkan ke seksi **"(tidak diketahui)"**; dan penulisan nama dinormalkan, sehingga "KT Melati" dan "kt melati" dihitung satu KT yang sama.

Laporan ini hanya memuat **satu Lembaga Petani** sekali jalan — itu memang bentuknya, bukan batasan yang bisa dilonggarkan lewat filter.

## Langkah

1. Buka menu **Report → Kelompok Tani (Detail)**.
+ Berbeda dengan Ringkasan, halaman ini tidak memuat apa pun sampai Anda memilih lembaga. Yang tampil lebih dulu hanya kartu kosong bertuliskan "Pilih Lembaga Petani".
2. Pilih **Distrik** bila perlu — opsional, gunanya hanya mempersempit daftar lembaga di sebelahnya.
+ Mengganti Distrik akan **mengosongkan** pilihan Lembaga dan roster yang sedang tampil. Isi dulu Distrik, baru Lembaga, supaya tidak memilih dua kali. Distrik yang terpilih juga ikut tercetak di header PDF; bila dibiarkan kosong, PDF menulis "—" di sana.
3. Pilih **Lembaga Petani** (wajib, bertanda `*`). Roster langsung dimuat begitu dipilih — tidak ada tombol "Tampilkan".
4. Baca lima kartu ringkasan: **Kelompok Tani**, **Total Petani**, **Total Lahan**, **Total Luas**, dan **Lahan NKT**.
+ Kartu Kelompok Tani tidak menghitung seksi "(tidak diketahui)" sebagai satu KT — jadi wajar bila angkanya satu lebih kecil daripada jumlah seksi yang Anda lihat di bawah.
5. Buka seksi KT yang Anda perlukan dengan mengkliknya. Semua seksi tertutup saat pertama dimuat; tombol **Buka semua** / **Tutup semua** ada di sebelah nama lembaga.
+ Baris judul tiap seksi sudah memuat angkanya tanpa perlu dibuka: jumlah petani, lahan, dan luas — ditambah "n Lahan NKT" dan "n Patok" yang **hanya muncul bila nilainya di atas nol**, supaya judul KT biasa tetap ringkas.
6. Di dalam seksi, baca tabel anggotanya: **Nama Petani**, **ID Petani**, **Jml Lahan**, **Luas (Ha)**, **Lahan NKT**, dan **Patok**.
+ Angka Lahan NKT yang tidak nol ditulis **merah tebal** — itu penanda cepat siapa yang lahannya bersinggungan dengan area bernilai konservasi tinggi. Sel bernilai nol ditulis "—", bukan "0", agar mata tidak tertahan di angka yang tidak perlu ditindaklanjuti.
7. Unduh lewat tombol **Excel** atau **PDF** di kanan atas daftar.
+ Berkasnya **datar**, bukan bertingkat seperti di layar: satu baris per petani dengan kolom Kelompok Tani di depannya, lalu baris **Total** di paling bawah. Nama berkas mengikuti nama lembaga, mis. `Laporan_Kelompok_Tani_Detail_KUD_Makmur`.

> [!penting] Unduhan selalu memuat **seluruh roster**, terlepas seksi mana yang sedang terbuka di layar. Tidak perlu menekan "Buka semua" sebelum mengunduh.

> [!penting] Petani yang lahannya tercatat di dua KT berbeda akan muncul di **kedua** seksi, karena yang dikelompokkan adalah lahannya. Karena itu menjumlahkan angka per seksi bisa melebihi kartu **Total Petani**, yang menghitung orang unik. Untuk daftar hadir, hilangkan dulu nama gandanya.

## Kalau bermasalah

**Daftar Lembaga Petani kosong** — filter Distrik sedang menyaring habis, atau lembaga itu di luar cakupan akses akun Anda. Kosongkan Distrik lebih dulu untuk memastikan.

**Muncul seksi "(tidak diketahui)"** — lahan-lahan itu belum diisi field Kelompok Tani. Perbaiki di Master Data → Lahan atau lewat unggah ulang, bukan di laporan ini.

**Sudah memperbaiki data lahan, tapi roster masih sama** — laporan hanya diambil sekali saat lembaga dipilih. Pilih ulang Lembaga Petani (atau muat ulang halaman) agar datanya ditarik lagi.

**Tombol Excel atau PDF tidak ada** — keduanya izin terpisah: Excel butuh izin EXPORT, PDF butuh PRINT pada menu ini. Hubungi administrator bila memang Anda perlukan.

+ Ini bukan kerusakan: banyak akun sengaja hanya diberi VIEW supaya data anggota tidak mudah keluar dari sistem.

**"Tidak Ada Data" padahal lembaganya benar** — lembaga itu belum punya satu pun lahan aktif yang mencantumkan Kelompok Tani. Periksa lewat Master Data → Lahan dengan filter lembaga yang sama.

**Nama KT tampak aneh, mis. "Blok 1" atau "33 F"** — kode blok terlanjur diketikkan ke field Kelompok Tani saat input lahan. Laporan menampilkan apa adanya; perbaikannya di data lahan.
