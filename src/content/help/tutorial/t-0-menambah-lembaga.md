---
title: Mendaftarkan Lembaga Petani
icon: UserPlus
menuKey: master-data-groups
permission: CREATE
duration: 6
href: /admin/master-data/groups
hrefLabel: Buka halaman Lembaga Petani
goal: Satu Lembaga Petani baru terdaftar lengkap dengan distrik, kategori, dan koordinat — siap menampung petani, lahan, dan pelatihan.
---

## Sebelum mulai

Lembaga Petani adalah induk dari hampir semua data lain: petani, lahan, pelatihan, dan produksi semuanya menempel ke sebuah lembaga. Karena itu lembaga harus didaftarkan **lebih dulu** sebelum alur lain bisa dimulai.

Secara bawaan hanya akun SUPERADMIN yang bisa menambah atau mengubah lembaga.

+ Role ADMIN, OPERATOR, dan MANAGEMENT hanya bisa melihat, kecuali diberi izin tambahan per akun oleh administrator. Kalau tombol tambahnya tidak muncul di layar Anda, itu bukan bug — akun Anda memang hanya punya izin lihat.

## Langkah

1. Buka menu **Master Data → Lembaga Petani**, lalu klik **Tambah Lembaga Petani**.
2. Isi seksi **Identitas**: Nama (wajib, minimal 2 karakter), lalu Kode dan Singkatan bila ada.
+ Sistem tidak memeriksa duplikat — dua lembaga boleh punya nama atau kode yang sama. Disiplin penomoran kode harus dijaga manual; sepakati polanya dulu dengan tim sebelum mengisi.
3. Pilih **Distrik** (wajib) dan **Kategori** (Ex Plasma / Swadaya, wajib).
+ Distrik bukan sekadar alamat: seluruh pembatasan hak akses bertumpu padanya. Salah memilih distrik bisa membuat lembaga langsung "hilang" dari pandangan Anda sendiri dan muncul di dashboard pengguna distrik lain.
4. Isi **Tahun Berdiri** dan **Tahun Bergabung Program** bila diketahui.
5. Isi **Sertifikasi & Assurance** (RSPO, ISPO, SAP/MAP) bila lembaga sudah punya status.
+ Aturannya satu arah: status tanpa tahun boleh, tetapi tahun tanpa status ditolak saat menyimpan. Status inilah yang menjadi sumber kartu sertifikasi di Main Dashboard.
6. Isi **Latitude** lalu **Longitude** lokasi sekretariat lembaga.
+ Koordinat ini menentukan titik lembaga di peta Main Dashboard, Peta Lahan, dan Peta BMP — tanpa koordinat, lembaga tidak tergambar di peta. Perhatikan urutannya: form meminta Latitude (sekitar -6 s.d. 6 untuk Indonesia) lalu Longitude (sekitar 95 s.d. 141); tertukar berarti titiknya melompat ke belahan bumi lain.
7. Klik **Buat**. Lembaga langsung muncul di daftar, dan klik nama/ikon mata untuk membuka halaman detailnya.
+ Halaman detail menampilkan 5 kartu ringkasan dan 5 tab (Ringkasan, Petani, Lahan, Pelatihan, Produksi) yang terisi otomatis seiring data lain masuk. Kartu Kelengkapan Data menautkan ke halaman analisanya.

> [!penting] Kode, Singkatan, Koordinat, dan Tahun Bergabung ikut dinilai dalam skor **Kelengkapan Data** lembaga. Mengosongkannya tidak menghalangi penyimpanan, tetapi langsung menurunkan skor di halaman Analisa.

> [!hati-hati] Ikon tong sampah **menonaktifkan lembaga seketika tanpa dialog konfirmasi**. Lembaga nonaktif hilang dari daftar semua pengguna non-SUPERADMIN — hanya SUPERADMIN yang bisa menemukannya kembali (filter Status → Nonaktif) dan mengaktifkannya lagi.

## Kalau bermasalah

**Tombol Tambah / ikon pensil tidak muncul** — akun Anda hanya punya izin lihat. Hubungi administrator bila memang perlu mengelola lembaga.

**Lembaga baru tidak muncul di Main Dashboard** — wajar; dashboard membaca snapshot. Generate snapshot baru lewat menu Tools (lihat tutorial **Memperbarui angka dashboard**).

**Lembaga hilang setelah dibuat** — kemungkinan distriknya di luar wilayah akses akun Anda. Minta SUPERADMIN memeriksa dan memindahkan distriknya.

**Titik lembaga tidak muncul di peta** — koordinat belum diisi, atau Latitude/Longitude tertukar. Buka Edit dan periksa kembali kedua angkanya.
