---
title: Membuat & menelusuri Snapshot BMP
icon: Camera
menuKey: dashboard-snapshot-bmp
permission: CREATE
duration: 5
href: /admin/tools/snapshot-bmp
hrefLabel: Buka Dashboard Snapshot BMP
goal: BMP Dashboard menampilkan angka produksi terbaru, dan setiap rekaman lama tetap bisa dibuka untuk membandingkan.
---

## Sebelum mulai

BMP Dashboard **tidak menghitung dari data langsung** — ia membaca snapshot, yaitu rekaman angka pada satu waktu. Halaman ini tempat rekaman itu dibuat dan disimpan.

Snapshot BMP **terpisah** dari Dashboard Snapshot (Main Dashboard) dan tidak saling memperbarui. Setelah unggah produksi besar, yang perlu dibuat ulang adalah yang di halaman ini. Langkah dasarnya dijelaskan di [Memperbarui angka dashboard](/admin/help/tutorial-laporan/memperbarui-dashboard); topik ini masuk ke hal-hal yang khusus BMP.

+ Satu snapshot BMP merangkum seluruh Lembaga Petani beserta petani, lahan (luas dan tahun tanam), dan produksinya. Tahun tanam itulah yang kelak mengisi analisa umur tanaman, dan total luas yang mengisi kartu Luasan — keduanya tidak ada di snapshot yang dibuat sebelum kolom itu ditambahkan.

Membuat snapshot butuh izin CREATE pada menu Tools; tanpa itu Anda tetap bisa membaca daftar dan membuka rekaman lama.

## Langkah

1. Buka menu **Tools → Dashboard Snapshot BMP**.
2. Klik **Generate Snapshot** pada kartu "Buat Snapshot Baru".
+ Snapshot selalu dibuat untuk **Semua Data** — tidak ada pilihan distrik di sini, dan itu disengaja. Penyaringan Distrik/Lembaga/Kategori/Tahun dilakukan nanti di BMP Dashboard, langsung di browser pembacanya, sehingga satu rekaman melayani semua kombinasi filter.
3. Tunggu sampai muncul notifikasi berhasil dan baris baru di tabel di bawahnya. Jangan mengklik berulang.
+ Sistem membulatkan waktu snapshot ke detik terdekat, jadi klik ganda dalam detik yang sama akan ditolak dengan pesan "Snapshot dengan filter yang sama sudah dibuat pada waktu ini" — itu penjaga, bukan kegagalan. Klik yang berjarak beberapa detik tetap menghasilkan dua baris.
4. Periksa baris teratas: **Tanggal Snapshot**, **Total Produksi (Ton)**, **Lahan Ber-data**, **Luas Terdata (Ha)**, **Petani Terdata**, dan **Dibuat Oleh**.
+ Tiga kolom tengah ditulis sebagai perbandingan `terdata/total` — mis. `412/559` lahan — supaya kelengkapan data terbaca tanpa membuka dashboard. Pada snapshot lama yang belum menyimpan total luas, kolom Luas Terdata hanya menampilkan satu angka. Kolom **Distrik** mati bawaan; nyalakan lewat tombol **Kolom** bila Anda memang mengelola snapshot per distrik lama.
5. Buka BMP Dashboard dan pastikan angkanya sudah berubah.
6. Untuk menelusuri rekaman lama, klik aksi **Lihat** pada barisnya.
+ Halaman detail menampilkan Informasi Snapshot (tanggal, filter distrik, pembuat), kartu skor BMP kumulatif semua tahun, dan tabel **Ringkasan per Lembaga Petani** — nama, kategori Ex-Plasma/Swadaya, distrik, produksi, produktivitas Ton/Ha, serta ketiga angka kelengkapan tadi. Tabel itu bisa diunduh ke Excel bila akun Anda punya izin EXPORT. Inilah cara membandingkan kondisi dua periode tanpa mengubah apa pun.

> [!penting] BMP Dashboard selalu memakai snapshot **aktif terbaru**. Menonaktifkan snapshot teratas berarti dashboard mundur ke rekaman sebelum itu — periksa dulu tanggalnya sebelum menekan Nonaktifkan.

> [!penting] Isi snapshot mengikuti **cakupan data akun yang membuatnya**. Bila dibuat oleh akun yang hanya memegang satu lembaga, rekaman itu hanya memuat lembaga tersebut — dan semua orang akan melihat angka yang mengecil itu di dashboard. Buat snapshot dari akun bercakupan penuh.

> [!tip] Biasakan membuat snapshot tepat setelah unggahan produksi selesai, bukan menunggu ada yang bertanya kenapa angkanya belum berubah.

## Kalau bermasalah

**Kartu "Buat Snapshot Baru" tidak muncul** — akun Anda hanya bisa membaca daftar. Daftar dan halaman detail tetap terbuka; hanya pembuatannya yang perlu izin CREATE.

+ Aksi per baris juga terpisah izinnya: **Lihat** butuh VIEW, **Nonaktifkan** butuh DELETE, dan tombol Excel butuh EXPORT. Wajar bila sebagian tombol tidak Anda temukan.

**Angka BMP Dashboard tidak berubah setelah generate** — pastikan yang Anda buka BMP Dashboard, bukan Main Dashboard; keduanya memakai snapshot yang berbeda.

+ Periksa juga tanggal baris teratas di tabel. Bila bukan rekaman yang baru saja Anda buat, berarti proses generate-nya belum selesai atau gagal — ulangi dan tunggu notifikasinya.

**Angka snapshot jauh lebih kecil dari yang diharapkan** — kemungkinan besar dibuat oleh akun bercakupan terbatas. Buat ulang dari akun bercakupan penuh; snapshot yang salah bisa dinonaktifkan setelahnya.

**Kartu Luasan atau analisa umur tanaman kosong** — snapshot yang sedang dipakai dibuat sebelum kedua angka itu ikut direkam. Cukup buat snapshot baru.

**Muncul beberapa baris dengan waktu berdekatan** — tombol terklik lebih dari sekali dengan jeda lebih dari satu detik. Dashboard memakai yang terbaru; sisanya bisa dinonaktifkan lewat aksi **Nonaktifkan** pada barisnya.

+ Menonaktifkan bersifat *soft delete*: barisnya hilang dari daftar, datanya tetap tersimpan di database.
