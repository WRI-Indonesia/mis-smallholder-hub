---
title: Mendaftarkan petani baru
icon: UserPlus
menuKey: master-data-farmers
permission: CREATE
duration: 4
href: /admin/master-data/farmers
hrefLabel: Buka halaman Petani
goal: Satu petani baru tercatat di sebuah Lembaga Petani dan langsung muncul di daftar Petani.
---

## Sebelum mulai

Petani selalu melekat pada satu **Lembaga Petani**. Kalau lembaganya belum ada, daftarkan lebih dulu di **Master Data → Lembaga Petani**.

+ Hierarki datanya: Petani → Kelompok Tani → Lembaga Petani. Tidak ada petani yang berdiri sendiri tanpa lembaga, karena hampir semua angka program — cakupan pelatihan, luas lahan, produksi — dijumlahkan per lembaga. Petani tanpa lembaga tidak akan muncul di laporan mana pun.

Siapkan: nama lengkap, **ID Petani**, jenis kelamin, dan nama lembaga. Sisanya boleh menyusul.

+ **ID Petani** adalah nomor milik organisasi Anda, bukan buatan sistem. Nomor inilah yang dipakai mencocokkan data pada tiga jalur unggahan massal: Upload Petani, Upload Produksi, dan shapefile Lahan. Kalau penomorannya tidak konsisten sejak awal, ketiga unggahan itu akan gagal mencocokkan dan Anda harus memperbaiki berkas sumbernya berulang kali. Sepakati polanya di tingkat organisasi sebelum input massal dimulai.

## Langkah

1. Buka menu **Master Data → Petani**, lalu klik **Tambah Petani**.
+ Tombolnya di kanan atas tabel, sebaris dengan tombol Excel dan Kolom. Bila tidak terlihat, akun Anda punya izin melihat tetapi tidak menambah data di menu ini — izin diatur per menu, jadi bisa saja Anda bisa menambah di menu lain tetapi tidak di sini.
2. Pilih **Lembaga Petani** — ketik sebagian nama untuk menyaring.
+ Daftar yang muncul hanya lembaga dalam wilayah kerja akun Anda, jadi wajar bila jauh lebih pendek daripada daftar seluruh organisasi. Pembatasan ini berlaku di seluruh sistem, bukan hanya di form ini: laporan dan dashboard Anda pun hanya menghitung lembaga yang sama. Karena itu angka total bisa berbeda antar pengguna, dan itu normal.
3. Isi **Nama** dengan nama lengkap sesuai dokumen.
+ Nama ini muncul di daftar hadir pelatihan, Laporan Petani, Laporan Lahan, dan Profil Lahan PDF yang kadang diserahkan ke pihak ketiga. Hindari singkatan dan gelar. Kalau nama di KTP berbeda dengan nama panggilan yang dipakai sehari-hari di lapangan, pakai nama KTP di sini agar cocok saat verifikasi sertifikasi.
4. Isi **ID Petani**, lalu **periksa sendiri** apakah nomor itu sudah dipakai.
+ Form ini **tidak memeriksa duplikat** — nomor yang sama bisa tersimpan dua kali tanpa peringatan. Cari dulu nomornya di kotak pencarian sebelum menyimpan. Sebaliknya **Bulk Upload menolak** ID yang sudah ada **di mana pun dalam sistem**, termasuk milik lembaga lain — jadi pakailah nomor yang unik secara global, bukan hanya unik di lembaga Anda. Hati-hati juga saat menyalin dari Excel: nol di depan sering hilang karena sel diperlakukan sebagai angka, sehingga `007` berubah jadi `7`.
5. Pilih **Jenis Kelamin**.
+ Dari kolom inilah angka Petani Laki-laki/Perempuan di Main Dashboard dan **partisipasi perempuan** di Dashboard Pelatihan dihitung. Indikator GEDSI yang biasa diminta donor bersumber dari sini, jadi kolom yang salah isi akan langsung terlihat di laporan program. Kolom ini wajib dan tidak bisa dikosongkan.
6. Isi **NIK**, **Tempat/Tanggal Lahir**, dan **Alamat** bila ada.
+ NIK dan tanggal lahir selalu tampil tersensor di layar demi keamanan, tetapi tersimpan utuh dan **ikut penuh saat diekspor ke Excel**. Artinya berkas ekspor memuat data pribadi tanpa sensor — perlakukan sebagai dokumen rahasia dan jangan sebar lewat kanal terbuka.
7. Isi **Tahun Bergabung** — tahun masuk program, bukan tahun mulai bertani.
+ Kolom ini menggerakkan filter Tahun di Main Dashboard, yang dipakai melihat pertumbuhan peserta program dari tahun ke tahun. Mengisinya dengan tahun mulai bertani akan membuat grafik pertumbuhan itu keliru.
8. Klik **Buat**.
+ Bila berhasil, jendela tertutup sendiri dan muncul notifikasi singkat di sudut layar. Bila jendela tetap terbuka, berarti ada kolom yang ditolak — pesannya ada tepat di bawah kolom bersangkutan.

> [!hati-hati] Karena form ini tidak memeriksa duplikat, mendaftarkan ulang petani yang sudah ada akan **memecah riwayatnya** — pelatihan dan lahannya terbagi ke dua data, dan cakupan pelatihannya terhitung dua kali di dashboard. Selalu cari dulu di kotak pencarian sebelum menambah.

## Memastikan berhasil

Petani muncul di tabel, kartu **Total Petani** bertambah satu, dan namanya ketemu lewat kotak **Cari nama, ID petani, atau NIK...**

+ Pencarian menelusuri tiga kolom sekaligus: nama, ID Petani, dan NIK. Jadi Anda bisa memastikan lewat ID atau NIK bila ada beberapa petani dengan nama mirip. Kalau petaninya tidak ketemu padahal baru saja disimpan, periksa filter Distrik dan Lembaga Petani di atas tabel — filter yang masih aktif dari pencarian sebelumnya bisa menyembunyikannya.

> [!tip] Perlu mendaftarkan puluhan petani sekaligus? Pakai **Bulk Upload → Upload Petani** dengan berkas Excel, jangan satu per satu.

## Kalau bermasalah

**Tombol Tambah Petani tidak ada.** Akun Anda bisa melihat tapi tidak menambah data di menu ini. Hubungi administrator.

**Lembaga yang dicari tidak muncul.** Lembaga itu di luar wilayah kerja akun Anda, atau statusnya nonaktif.

+ Untuk memastikan yang mana, buka **Master Data → Lembaga Petani**. Bila lembaganya tidak ada di sana juga, berarti di luar wilayah kerja Anda — mintalah administrator menambahkan distrik atau lembaga itu ke akun Anda. Bila ada tetapi berstatus Nonaktif, aktifkan kembali lebih dulu; petani tidak boleh ditambahkan ke lembaga nonaktif.

**Petani yang dicari ternyata sudah ada tapi berstatus Nonaktif.** Gunakan aksi **Aktifkan kembali** pada barisnya — jangan buat data baru.

+ Sistem ini tidak pernah benar-benar menghapus data; menonaktifkan hanya menyembunyikannya dari daftar. Seluruh riwayat pelatihan, lahan, dan produksi petani tersebut masih tersimpan utuh dan akan tersambung kembali begitu diaktifkan.

**Bulk Upload menolak ID dengan pesan "sudah terdaftar", padahal di lembaga saya belum ada.** Pemeriksaan duplikat pada unggahan massal berlaku **untuk seluruh sistem**, bukan per lembaga — nomor itu sudah dipakai lembaga lain. Pakai nomor yang berbeda.

**Form menolak disimpan tanpa pesan jelas.** Gulirkan jendela ke atas — pesan kesalahan muncul di bawah kolom bermasalah dan bisa berada di luar layar.

**Sudah tersimpan tapi angka dashboard belum berubah.** Main Dashboard membaca snapshot berkala. Lihat tutorial **Memperbarui angka dashboard**; daftar Master Data sendiri selalu terkini.

+ Yang membaca snapshot hanya Main Dashboard dan BMP Dashboard. Dashboard Pelatihan menghitung langsung saat dibuka, jadi perubahan data pelatihan terlihat seketika di sana. Daftar dan laporan di Master Data juga selalu membaca data terkini.
