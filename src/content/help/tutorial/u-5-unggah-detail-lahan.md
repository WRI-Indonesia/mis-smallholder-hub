---
title: Mengunggah detail lahan (surat, STDB, UL Parcel Code, sepadan, NKT) dari Excel
icon: Upload
menuKey: bulk-upload-parcels
permission: CREATE
duration: 10
href: /admin/bulk-upload/parcels
hrefLabel: Buka halaman Upload Lahan
goal: Surat kepemilikan, nomor STDB, UL Parcel Code, dan sepadan menempel pada lahan yang sudah ada — sekaligus untuk satu kabupaten.
---

## Sebelum mulai

Ini **bukan** cara menambah lahan. Setiap baris harus menunjuk **ID Lahan** yang sudah terdaftar beserta **ID Petani** pemiliknya — poligonnya diunggah lebih dulu lewat tab **Poligon (Shapefile ZIP)**.

+ Detail menempel pada *identitas* lahan, bukan pada satu versi poligon. Jadi kalau nanti poligonnya direvisi lewat unggah shapefile ulang, surat dan STDB-nya tetap ikut — tidak perlu diunggah lagi.

Kolom yang dikenali otomatis dari berkas `MIS_<Kabupaten>_data-lahan.xlsx`: ID Lahan, ID Petani, Jenis Surat Tanah, Nomor Surat, Nama tertera di Surat, Luas tertera di Surat, Nomor STDB, `parcel_code`, Nama Kelompok Tani, empat kolom **Sepadan** (Utara/Timur/Selatan/Barat — judul kolom "Sepadan Utara", "Batas Utara", "Sebelah Utara", atau cukup "Utara" semuanya dikenali), **Blok**, dan kolom **NKT** (Status NKT, Kategori NKT, Luas NKT Area (ha), Panjang (m)/LENGTH, Tanggal Asesmen, Asesor/Sumber). Kolom lain di berkas (nama petani, lembaga, luas poligon) diabaikan — sudah ada di sistem.

Tersedia dua berkas contoh di Langkah 1: **Unduh Template Excel** (semua kolom) dan **Template NKT** — mengikuti bentuk lampiran "daftar petak kebun terdampak NKT" dari laporan asesmen (Nama, ID Petani, ID Lahan, Kelompok Tani, Blok, Luas NKT Area, Panjang). Keduanya diunggah lewat tab yang sama.

## Langkah

1. Buka menu **Bulk Upload → Lahan**, lalu pilih tab **Detail Lahan (Excel)**.
+ Sistem memuat daftar lahan aktif dalam akses Anda begitu tab dibuka — jumlahnya tampil di samping nama berkas. Tombol validasi baru aktif setelah daftar itu selesai dimuat.
2. Pada **Langkah 1**, pilih berkas `.xlsx` atau `.csv`.
+ Bila berkas punya beberapa sheet, sistem memakai sheet bernama **Data**; kalau tidak ada, sheet pertama yang berisi.
3. Pada **Langkah 2**, periksa pemetaan kolom. Hanya **ID Lahan** dan **ID Petani** yang wajib; sisanya boleh kosong.
+ Untuk berkas **daftar lahan terdampak NKT** yang tidak punya kolom status/kategori (lazim pada lampiran laporan asesmen): isi panel **Bawaan NKT untuk berkas ini** — status (mis. *Terdampak*), kategori (mis. *NKT 4* untuk sempadan sungai), tanggal asesmen, dan nama laporan/asesor. Nilai itu dipakai untuk **semua baris** berkas, kecuali baris yang sel-nya sendiri menyatakan lain. Kalau berkas Anda punya kolom Status NKT, biarkan panel ini kosong.
4. Klik **Validasi Detail Lahan**.
5. Pada **Langkah 3**, tinjau tabel. Kolom **Nama Petani (DB)** menunjukkan pemilik lahan menurut sistem — pastikan itu orang yang Anda maksud.
+ Jenis surat ditampilkan sudah **dinormalkan**: "SHM", "SHM (Sertifikat Hak Milik)", dan "SHM (Surat Hak Milik)" semuanya jadi SHM. Ejaan aslinya tetap disimpan untuk audit.
+ Nilai seperti **"Lahan sudah dijual"** atau **"Surat lahan di bank"** bukan jenis surat; sistem menyimpannya sebagai catatan penguasaan (tampil miring), bukan sebagai SHM/SKT.
+ Baris yang punya nomor/nama/luas surat tetapi **jenisnya kosong** tetap diterima sebagai jenis **Lainnya** — datanya tidak dibuang, jenisnya bisa dilengkapi belakangan di detail lahan.
6. Pilih **Pemeta** — siapa yang memetakan lahan pada berkas ini (Meridia / WRI Indonesia / Swadaya, atau **Lainnya…** untuk mengetik nama lain). Pilihan ini berlaku untuk seluruh berkas dan tersimpan sebagai sumber UL Parcel Code. Bila ragu, tanyakan asal berkasnya — jangan biarkan Meridia terpilih untuk berkas yang bukan dari Meridia.
7. Perbaiki error bila ada, lalu klik **Simpan N Baris Valid**.
+ Penyimpanan berjalan per 500 baris. Bila gagal di tengah, pesan menyebut berapa baris yang sudah tersimpan — cukup **unggah ulang berkas yang sama**: baris yang sudah masuk tidak digandakan (tampil sebagai "tanpa perubahan" di ringkasan).
+ Unggah ulang berkas yang sama **aman**: surat dengan nomor yang sama diperbarui, bukan digandakan; STDB dan UL Parcel Code juga dicocokkan dulu.
+ **Nama Kelompok Tani** hanya mengisi lahan yang di sistem masih kosong — yang sudah terisi **tidak ditimpa** (di pratinjau ditandai *"(sudah ada)"*). Untuk mengubah KT lahan, pakai form Edit Lahan.
+ **Sepadan** memakai aturan sebaliknya: sel yang **terisi menimpa** nilai lama (data sepadan wajar dikoreksi lewat pendataan ulang), sel yang **kosong dibiarkan** — tidak mengosongkan yang sudah ada. Mengosongkan sepadan hanya bisa lewat kotak Sepadan di detail lahan.
+ **Blok** mengikuti aturan Kelompok Tani: hanya mengisi yang masih kosong. Lembaga plasma biasanya memakai Blok, Lembaga swadaya memakai Kelompok Tani — template NKT memuat keduanya.
+ **NKT**: status di berkas (atau bawaan berkas) **menimpa** status lama — asesmen terbaru yang berlaku; luas/panjang/tanggal/asesor hanya ditimpa bila selnya terisi. Baris yang membawa data NKT tapi statusnya tak diketahui (tidak ada di kolom maupun bawaan) ditolak, bukan ditebak.

> [!penting] Satu nomor **STDB boleh muncul di beberapa baris** selama ID Petaninya sama — STDB memang terbit per petani dan menutup semua persilnya. Yang ditolak adalah nomor STDB yang sama dengan **petani berbeda**.

### Kolom STDB yang belum bernomor

Sel bertuliskan **"belum ada"**, **"belum dapat"**, atau **"n/a"** dulu diperlakukan sama dengan sel kosong dan **hilang** saat unggah. Sekarang sel seperti itu menjadi baris STDB tahap **Persiapan Data** — pernyataan "sedang diurus" akhirnya punya tempat.

+ Bedanya dengan sel yang benar-benar kosong (atau berisi `-` / `0`): sel kosong tetap **tidak** membuat baris STDB apa pun.
+ Semua lahan petani yang sama ditautkan ke **satu** berkas berjalan, bukan satu berkas per lahan.
+ Bila petani itu **sudah punya STDB aktif** (bernomor) di sistem atau di berkas yang sama, sel "belum ada" pada barisnya **dilewati** — kemungkinan besar kolomnya memang tidak diisi untuk persil itu, bukan berarti petaninya sedang mengurus STDB baru. Untuk mencatat pengajuan baru bagi petani yang sudah punya STDB, gunakan tab Legalitas di detail lahan.

> [!hati-hati] Baris yang **ID Lahan-nya muncul dua kali dengan ID Petani berbeda** ditandai error di *kedua* barisnya. Sistem sengaja tidak memilih salah satu — itu salah ketik di sumber yang harus Anda putuskan sendiri.

## Hasil

Detail tampil di **Master Data → Lahan → detail lahan** (tab **Legalitas**: Surat kepemilikan, STDB lengkap dengan **tahapnya**, UL Parcel Code; tab **Informasi**: kotak **Sepadan** dan **NKT**) dan ringkasannya di detail petani. Sepadan dan NKT juga tercetak di **Profil Lahan (PDF)**; lahan NKT tampil sebagai layer merah di **Peta Lahan** dan bisa disaring di **Laporan Lahan**. Luas tertera di surat disimpan **terpisah** dari luas poligon; selisih keduanya memang informasi, bukan kesalahan.

## Kalau bermasalah

**"ID Lahan … tidak terdaftar untuk petani …"** — pasangan ID Lahan + ID Petani tidak cocok dengan sistem. Biasanya ID Petani-nya yang salah ketik (mis. `…2004.0001` padahal seharusnya `…2006.0001`). Cek di Master Data → Lahan siapa pemilik lahan itu.

**"ID Petani … tidak ditemukan dalam database atau akses Anda"** — petani ada tapi di luar wilayah/lembaga akses Anda, atau ID-nya berubah format (spasi, nol di depan hilang).

**"Tidak ada data detail … untuk disimpan"** — baris itu tidak membawa surat, STDB, maupun UL Parcel Code. Hapus barisnya atau lengkapi.

**Tombol validasi tetap nonaktif** — daftar lahan belum selesai dimuat (bisa beberapa detik untuk belasan ribu lahan). Tunggu sampai jumlah lahan tampil di Langkah 1.

**Muncul pesan "Header ditemukan di baris 3"** — berkas kabupaten kerap punya baris judul di atas baris nama kolom, dan sistem melewatinya sendiri. Periksa sekilas apakah nama kolom yang terbaca sudah benar, lalu lanjutkan.

+ Nomor **Baris** di tabel hasil validasi dan di berkas unduhan error mengikuti nomor baris sungguhan di Excel, jadi tetap menunjuk baris yang benar walau headernya bukan di baris 1.

**"Tidak menemukan baris header pada berkas ini"** — sheet yang terbaca tidak punya satu pun baris berisi nama kolom. Periksa apakah datanya ada di sheet lain yang kosong judulnya, atau berkasnya memang bukan tabel.
