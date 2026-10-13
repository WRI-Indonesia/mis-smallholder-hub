---
title: Melihat Daftar Issue GitHub
icon: ClipboardList
menuKey: platform-developer-issues
permission: VIEW
duration: 4
href: /admin/platform-developer/issues
hrefLabel: Buka Daftar Issue
goal: Melihat semua issue pengembangan aplikasi — yang masih terbuka maupun yang sudah ditutup — dalam bentuk daftar, kalender, tren mingguan, atau papan kanban, lalu mengunduhnya ke Excel.
---

## Sebelum mulai

Halaman ini memantau **pengembangan aplikasinya sendiri**, bukan data petani. Isinya setiap issue di repositori GitHub aplikasi, dibaca langsung dari GitHub — jadi issue yang baru dibuat atau ditutup ikut tampil tanpa menunggu rilis aplikasi.
+ Data disimpan sementara paling lama **30 menit** agar halaman cepat dan tidak membebani GitHub. Baris di atas filter menuliskan kapan data terakhir diambil (**data GitHub per …**). Bedanya dengan **Rencana Pengembangan**: halaman itu membaca *rencana* per rilis dari dokumen di repositori, halaman ini menampilkan *kondisi nyata* di GitHub, termasuk riwayat issue yang sudah ditutup.

## Langkah

1. Buka menu **Platform Developer → Daftar Issue**. Baris pertama merangkum jumlah issue, berapa yang masih terbuka, dan waktu data diambil.
2. Saring dengan bar filter: kotak **Cari** (nomor, judul, atau label — semua kata yang diketik harus cocok), kotak **label**, rentang **Aktivitas** (dua tanggal), dan baris **Status** (Terbuka · Selesai · Tidak dikerjakan · Duplikat). Tombol **↺ Reset** mengembalikan semua filter ke bawaan.
+ Rentang **Aktivitas** memilih issue yang **dibuat atau ditutup** di antara kedua tanggal (WIB) — cocok untuk melihat "apa yang terjadi bulan ini". Filter berlaku untuk tab List, Kalender, dan Kanban serta untuk isi Unduh Excel. Tab **Tren mingguan** hanya mengikuti Cari dan label; rentang Aktivitas memotong minggu yang ditampilkan, dan filter Status diabaikan, supaya angka "masih terbuka" tetap benar. Filter tersimpan di alamat halaman, jadi tampilan bisa dibagikan dengan menyalin URL-nya.
3. Tab **List** menampilkan tabel: **No.** (membuka issue di GitHub, tab baru), **Judul**, **Label**, **Dibuat**, **Ditutup**, dan **Status**. Klik judul kolom No., Dibuat, atau Ditutup untuk mengurutkan; klik lagi untuk membalik arah. Unduh Excel mengikuti urutan ini.
4. Tab **Kalender** menampilkan kalender satu bulan di kiri dan daftar issue di kanan. Di setiap tanggal tertulis jumlah issue **dibuat** (biru, **+n**) dan **ditutup** (hijau, **✓n**). Daftar di kanan awalnya memuat **seluruh bulan**. **Arahkan kursor** ke tanggal yang berangka untuk ringkasannya (jumlah dan beberapa judul); **klik** tanggal untuk menampilkan issue hari itu saja di kanan, lalu klik lagi atau **← Seluruh bulan** untuk kembali. Pindah bulan dengan panah di atas kalender. Bila rentang **Aktivitas** terisi, kalender hanya menandai tanggal pembuatan atau penutupan yang jatuh **di dalam** rentang itu. Di layar sempit daftar tampil di bawah kalender.
5. Tab **Tren mingguan** berisi tiga grafik per minggu (Senin–Minggu): batang **dibuat vs ditutup**, **akumulasi** berupa area bertumpuk (area bawah hijau = total issue yang sudah ditutup, area atas oranye = yang masih terbuka; tepi atas = total issue yang pernah dibuat), dan garis jumlah issue yang **masih terbuka** di akhir minggu. Arahkan kursor (atau ketuk) sebuah minggu untuk melihat angkanya dalam tooltip.
+ Batang biru yang terus lebih tinggi daripada batang hijau, bagian oranye yang terus menebal, dan garis yang terus naik, berarti backlog menumpuk: issue baru datang lebih cepat daripada yang diselesaikan. Klik **Lihat tabel per minggu** untuk angka lengkapnya.
6. Tab **Kanban** membagi issue ke lima kolom: **Belum direncanakan** · **Todo** · **Dikerjakan** · **Menunggu keputusan** · **Closed (30 hari)**. Kolom ditentukan oleh label `status:*` di GitHub.
+ Label status disamakan dengan dokumen rencana oleh tim pengembang setiap memulai hari kerja, dan dicabut saat issue ditutup. Issue terbuka tanpa label status berarti belum masuk rencana rilis mana pun. Papan ini hanya menampilkan; status diubah di GitHub atau rencana, bukan dengan menggeser kartu.
7. Klik **Unduh Excel** untuk mengunduh issue yang sedang tersaring (tombol hanya tampil bila peran Anda punya izin unduh/EXPORT di menu ini). Kolomnya: **Date Solved (Close)** · **No Issue** · **Simple Desc** · **Date Created** · **Status**, dengan tanggal WIB.

## Kalau bermasalah

**Muncul pesan "Batas permintaan ke GitHub tercapai"** — GitHub membatasi jumlah permintaan per jam dari server aplikasi. Tunggu sampai jam yang disebut di pesan, lalu muat ulang halaman.

**Muncul pesan "GitHub tidak dapat dihubungi"** — server aplikasi sedang tidak bisa menjangkau GitHub. Coba muat ulang beberapa saat lagi; bila berulang, laporkan ke tim pengembang.

**Issue yang baru ditutup belum berpindah** — data disimpan sementara 30 menit. Setelah lewat 30 menit dari waktu di baris **data GitHub per …**, pembukaan halaman pertama masih menampilkan data lama sambil mengambil yang baru di latar; **muat ulang sekali lagi** beberapa detik kemudian untuk melihat data terbaru.

**Menu Daftar Issue tidak muncul di sidebar** — menu ini hanya untuk SUPERADMIN, ADMIN, dan MANAGEMENT. Role lain perlu diberi izin VIEW `platform-developer-issues` lewat Settings → Role & Permission bila memang diputuskan dibuka.
