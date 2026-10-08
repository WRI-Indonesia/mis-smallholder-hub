---
title: Mencatat pelatihan & pesertanya
icon: GraduationCap
menuKey: master-data-training
permission: CREATE
duration: 9
href: /admin/master-data/training
hrefLabel: Buka halaman Pelatihan
goal: Satu sesi pelatihan tercatat lengkap dengan daftar peserta dan nilai pre/post-test.
---

## Sebelum mulai

Satu sesi dimiliki satu **Lembaga Petani**, dan pesertanya **hanya boleh anggota lembaga itu** — sistem menolak peserta dari lembaga lain.

+ Aturan ini yang membuat angka cakupan pelatihan bisa dipercaya: karena peserta selalu anggota lembaga penyelenggara, hitungan "berapa persen petani lembaga ini sudah dilatih" tidak mungkin melebihi 100%. Bila satu petani benar-benar hadir di sesi lembaga lain, catat sebagai sesi terpisah di lembaganya sendiri.

Siapkan: paket pelatihan, tanggal, lokasi, daftar hadir, dan notulen PDF (maksimal 10 MB).

## Langkah — membuat sesi

1. Buka menu **Master Data → Pelatihan**, lalu klik **Tambah Pelatihan**.
+ Daftar sesi bisa disaring per Distrik, Lembaga, dan Paket Pelatihan — berguna saat memeriksa sesi mana yang belum lengkap datanya.
2. Pilih **Paket Pelatihan** dan **Lembaga Petani**.
+ Paket menentukan kolom mana yang terisi di matriks cakupan Dashboard Pelatihan. Bila satu hari memuat dua modul berbeda yang termasuk paket berbeda, catat sebagai dua sesi agar cakupan tiap paket terhitung benar.
3. Isi **Tanggal Pelatihan** dan **Lokasi** (misalnya `Balai Desa`).
+ Tanggal menentukan sesi ini masuk tahun mana di dashboard, jadi isi tanggal pelaksanaan sebenarnya — bukan tanggal Anda menginput. Lokasi yang kosong akan muncul sebagai temuan di panel Kualitas Data.
4. Isi **Catatan** bila perlu. Untuk sesi yang berlangsung beberapa hari, pilih tanggal **hari pertama** lalu tulis rentangnya di sini (misalnya `Sesi 3 hari: 11-13 November 2023`).
+ Catatan juga dipakai sebagai pembeda dua kegiatan Paket 1 pada lembaga dan tanggal yang sama: `Modul BMP` vs `Modul PNC & NKT`. Kolom tanggal sengaja tetap satu hari agar perhitungan tahun dan cakupan di dashboard tidak berubah-ubah.
5. Unggah **Evidence (Notulen PDF, maks 10MB)** bila sudah ada — boleh menyusul lewat Edit.
+ Berkas disimpan di penyimpanan privat dan hanya bisa dibuka lewat tautan bertanda tangan yang dibuat saat Anda mengkliknya. Sesi tanpa bukti akan terhitung di panel Kualitas Data sebagai pekerjaan yang belum tuntas — berguna saat menyiapkan audit.
6. Klik **Buat**.

## Langkah — menambahkan peserta

1. Klik sesi yang baru dibuat untuk membuka halaman detailnya.
2. Pada seksi **Peserta Pelatihan**, klik **Tambah Peserta**.
3. Pada tab **Pilih Manual**, klik nama petani yang hadir di kolom **Petani Tersedia** agar pindah ke **Petani Terpilih**, lalu klik **Tambahkan Peserta**.
+ Daftar yang muncul hanya anggota aktif lembaga penyelenggara. Bila seorang petani hadir tapi belum terdaftar, daftarkan dia dulu di Master Data → Petani lalu kembali ke sini. Menambahkannya ke lembaga lain hanya agar bisa dipilih akan merusak angka cakupan kedua lembaga.
+ Punya daftar hadir dalam Excel/CSV? Pakai tab **Upload List Peserta** — lihat bagian berikutnya.
4. Isi **Pre-Test** dan **Post-Test** langsung di tabel peserta bila tesnya dilakukan — nilai tersimpan otomatis begitu Anda pindah dari kolomnya.
+ Boleh dikosongkan dan dilengkapi belakangan; nilainya 0–100. Panel efektivitas dan kelulusan di Dashboard Pelatihan hanya menghitung peserta yang **kedua** skornya terisi. Mengisi pre saja tanpa post membuat peserta itu tidak masuk hitungan kenaikan skor maupun kelulusan (post-test ≥ 60), meski kehadirannya tetap terhitung.

> [!hati-hati] Nilai post-test yang lebih rendah dari pre-test akan ditandai "turun" di Dashboard Pelatihan sebagai indikasi salah input. Periksa ulang sebelum menyimpan.

## Langkah — mengunggah daftar peserta

Jalur ini paling praktis untuk sesi berpeserta banyak: satu berkas memuat daftar hadir sekaligus nilai pre/post-test.

1. Pada seksi **Peserta Pelatihan**, klik **Tambah Peserta**, lalu buka tab **Upload List Peserta**.
2. Klik **Template Excel** untuk mengunduh berkas contoh, lalu isi satu baris per peserta.
+ Kolomnya **ID Petani**, **Nilai Pre-Test**, dan **Nilai Post-Test**. Hanya ID Petani yang wajib; kolom nilai boleh dihapus atau dikosongkan dan dilengkapi belakangan di tabel peserta. Nama kolom ID boleh juga `Farmer ID`, `Kode Petani`, atau `ID` — bila tak ada satu pun nama yang dikenali, **kolom pertama** dianggap berisi ID Petani. Nilai harus bilangan bulat 0–100 (desimal dibulatkan ke bawah).
3. Pilih berkasnya (`.xlsx` atau `.csv`) di kotak unggah.
+ Baris judul di atas nama kolom boleh ada — sistem mencari sendiri baris yang berisi nama kolom dan memberi tahu bila bukan baris 1 (pesan "Header ditemukan di baris 3"). Baris dengan ID Petani kosong dilewati, dan ID yang tercantum dua kali hanya dihitung sekali.
4. Periksa tabel hasil validasi. Tiap baris diberi status: **VALID**, **WARNING**, atau **ERROR**, dengan keterangannya.
+ **ERROR** — tidak akan disimpan: ID Petani tidak ditemukan di **lembaga penyelenggara** (ID salah ketik, atau petaninya anggota lembaga lain), petani sudah terdaftar sebagai peserta sesi ini, atau nilai di luar 0–100. **WARNING** — tetap disimpan, hanya mengingatkan bahwa petani ini sudah pernah mengikuti **paket yang sama** di sesi lain (tanggalnya disebutkan); pastikan memang bukan sesi yang tercatat dua kali. ID dicocokkan persis (huruf besar/kecil tak berpengaruh) dengan ID Petani di Master Data.
5. Klik tombol **Tambahkan … Peserta** — angkanya adalah jumlah baris VALID + WARNING.
+ Baris ERROR tidak ikut dan tidak memblokir yang lain. Perbaiki berkasnya lalu unggah ulang bila ingin menambahkannya — peserta yang sudah tersimpan akan muncul sebagai ERROR "sudah terdaftar", jadi tidak tercatat dua kali.

## Memastikan berhasil

Jumlah peserta muncul di daftar pelatihan. Petani tersebut **langsung** terhitung sudah dilatih pada paket itu di Dashboard Pelatihan — dashboard ini tidak memakai snapshot, jadi tidak perlu proses tambahan.

+ Berbeda dengan Main Dashboard dan BMP Dashboard yang membaca snapshot berkala. Jadi bila Anda ingin memeriksa hasil input pelatihan seketika, bukalah Dashboard Pelatihan, bukan Main Dashboard.

## Kalau bermasalah

**Petani yang dicari tidak ada di daftar peserta.** Dia bukan anggota lembaga penyelenggara. Bila memang hadir, perbaiki dulu keanggotaannya di data Petani.

+ Saat menyimpan, sistem memeriksa ulang setiap peserta (pilihan manual maupun baris unggahan yang lolos validasi) dan menolak **seluruh** batch bila ada satu yang tak valid, bukan melewatinya diam-diam. Jadi bila penyimpanan gagal, periksa satu per satu — bukan berarti semua pesertanya bermasalah.

**Unggahan notulen ditolak.** Hanya PDF di bawah 10 MB yang diterima.

**Muncul pesan "Header ditemukan di baris 3" saat mengunggah daftar peserta** — berkas punya baris judul di atas nama kolom, dan sistem melewatinya sendiri. Periksa sekilas bahwa kolom ID Petani terbaca benar di tabel validasi, lalu lanjutkan.

**"Tidak menemukan baris header pada berkas ini"** — sheet yang terbaca tidak berisi satu pun baris nama kolom; biasanya berkasnya kosong, atau sheet pertamanya bukan tabel. Pindahkan tabel peserta ke sheet pertama, atau mulai dari **Template Excel**.

**Semua baris ERROR "ID Petani tidak ditemukan di lembaga tani ini"** — biasanya kolom yang terbaca sebagai ID bukan kolom ID Petani (mis. kolom pertama berisi nomor urut atau nama). Ganti judul kolomnya menjadi `ID Petani`, atau pakai template.

**Peserta salah dimasukkan.** Centang barisnya lalu klik **Hapus Terpilih**, atau pakai tombol **Hapus Peserta** di baris tersebut.
