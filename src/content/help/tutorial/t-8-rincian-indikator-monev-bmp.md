---
title: Mengimpor form survei & membaca rincian indikator Monev BMP
icon: ClipboardList
menuKey: master-data-bmp-monev
permission: CREATE
duration: 10
href: /admin/master-data/bmp-monev
hrefLabel: Buka halaman Monev BMP
goal: Skor 30 indikator dari form survei per petani masuk ke MIS beserta penilaian Lembaga, dan Anda bisa membaca di kegiatan mana seorang petani atau Lembaga lemah.
---

## Sebelum mulai

Selain skor akhir, Monev BMP punya **rincian**: 5 kegiatan berbobot (Training 0,10 · Pemupukan 0,35 · Pengendalian Gulma 0,10 · PHPT 0,10 · Panen 0,35) dan **32 indikator** berskor 0–3 — 18 dinilai per **petani**, 14 dinilai per **Lembaga**. Skor akhir = Σ bobot kegiatan × Σ (bobot indikator × skor); indikator tanpa bobot bersifat informatif. Pada Identifikasi Gulma hanya **salah satu** yang ditanya — petani *atau* pekerja (bobot 0,2) — sehingga Σ bobot efektif tiap kegiatan = 1,0 dan skor kegiatan maupun skor akhir maksimal **3,00**.

+ Enam indikator Lembaga (standar teknis kerja, infrastruktur panen, transportasi, taksasi produksi, catatan produksi, …) ikut masuk ke skor akhir **setiap petani** Lembaga itu. Karena itu penilaian Lembaga disimpan sekali per Lembaga per tahun, bukan diulang di tiap petani.

Sumbernya adalah **form survei per petani** (`.xlsx`, empat sheet: Form Penilaian Gabungan, Form Survey Lembaga, Form Survey Individu, Panduan) — satu berkas per petani, dikelompokkan per Lembaga.

## Langkah — mengimpor form survei

1. Buka **Master Data → Monev BMP**, klik **Import Excel**, pilih **Lembaga Petani**, lalu buka tab **Form survei per petani (banyak berkas)**.
2. Pilih semua berkas `.xlsx` satu Lembaga sekaligus (boleh puluhan). Tiap berkas dibaca: skor indikator dari sheet Survey Lembaga & Survey Individu; skor akhir **dihitung ulang** dari rincian itu (total raport di form hanya pembanding).
+ Nama petani diambil dari **nama berkas**, bukan dari header di dalam form — form sering di-copy dari petani lain dan headernya lupa diganti. Bila keduanya berbeda, baris ditandai dan nama berkaslah yang dipakai.
3. Periksa kolom **Cocok**: **Yakin** (nama persis), **Ragu** (beda ejaan kecil — periksa sekilas), **Ganda** atau **Tak ditemukan** (pilih petaninya dari dropdown). Petani yang sama tidak boleh dipakai dua form untuk tahun yang sama.
+ Form tidak memuat ID Petani, jadi pencocokan hanya lewat nama. Petani yang belum terdaftar di MIS harus didaftarkan dulu di Master Data → Petani.
4. Baca kolom **Status / peringatan**: **Baru** atau **Perbarui** (petani sudah punya skor tahun itu — skor & rinciannya ditimpa dari form), plus peringatan: skor di luar 0–3, periode tak terbaca, dan catatan "Total di form X — disimpan hasil hitung ulang".
+ Total di raport form bisa berbeda dari hitung ulang: rumus form menjumlahkan petani *dan* pekerja pada Identifikasi Gulma bila keduanya terisi (totalnya bisa melebihi 3), sedangkan MIS memakai salah satu yang tertinggi (maksimal 3,00); beberapa form juga totalnya belum dihitung ulang setelah sheet indikator diedit. Yang disimpan sebagai skor akhir adalah **hitung ulang** — konsisten dengan raport 5 kegiatan di halaman detail. Total form hanya dipakai bila berkas tidak memuat rincian sama sekali.
5. Klik **Simpan N form**. Penilaian Lembaga tahun itu diisi dari berkas pertama; bila berkas lain memuat skor Lembaga yang berbeda, Anda diberi peringatan.

## Langkah — membaca rincian

1. Di daftar Monev BMP klik ikon **lihat** pada satu baris → halaman detail penilaian: skor tersimpan vs hitung ulang, **raport 5 kegiatan** (radar berpita kategori seperti di dashboard, tabel skor kegiatan · bobot · kontribusi · indikator kosong di sampingnya), lalu tabel 30 indikator per kegiatan dengan skor, arti skor menurut rubrik, dan catatan.
+ Baris berlabel **Lembaga** dibaca dari penilaian Lembaga tahun itu; ubah lewat **Penilaian Lembaga** (tombol di toolbar daftar), bukan dari halaman petani.
2. Tombol **Ubah skor indikator** membuka grid 18 indikator individu: klik angka 0–3 (arahkan kursor untuk arti tiap skor), klik lagi untuk mengosongkan. Centang **timpa skor tersimpan** hanya bila Anda yakin rincianlah yang benar.
3. Di **Detail Petani → tab Monev BMP**, klik tahun untuk membuka rincian ringkas (raport kegiatan + indikator) tanpa meninggalkan halaman petani.
4. Di **Dashboard → Monev BMP** muncul kartu tambahan begitu rincian ada: **Profil 5 Kegiatan** (radar pembanding A vs B pada skala 0–3 berpita kategori), **Indikator Terlemah**, **Profil Kelembagaan** (Lembaga × 14 indikator, dengan rerata), serta kegiatan terlemah/terkuat pada daftar **Petani Prioritas** dan **Petani Teladan**.

> [!hati-hati] Skor **4** (di luar rubrik) yang ada di sebagian form diterima saat import dan ditandai amber di detail — ia ikut terhitung di skor akhir persis seperti di form. Koreksi lewat grid skor indikator bila memang salah ketik.

## Kalau bermasalah

**Semua berkas "Tak ditemukan".** Lembaga yang dipilih tidak sesuai dengan folder berkas, atau nama berkas tidak memuat nama petani (pola yang dikenali: `… - Nama.xlsx` atau `…_Nama.xlsx`).

**"Sheet Form Survey Lembaga tidak ditemukan".** Berkas bukan form survei (mis. rekap Lembaga) — pakai tab Rekap skor untuk berkas rekap.

**Indikator tampil "—" padahal di form terisi.** Teks indikator di form berbeda jauh dari master sehingga tidak terpetakan; pemetaan memakai kriteria + awalan teks, lalu urutan baris dalam kriteria. Periksa apakah baris di sheet form berpindah urutan.

**Kartu rincian tidak muncul di dashboard.** Belum ada penilaian ber-rincian pada filter aktif; import form survei dulu.
