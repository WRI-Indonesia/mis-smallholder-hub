---
title: Sekilas & Istilah Penting
icon: BookOpen
intro: Smallholder HUB MIS adalah sistem informasi data petani sawit swadaya: petani, kelembagaan, lahan, pelatihan, dan produksi. Pahami dulu istilahnya agar tidak tertukar saat mengisi data.
---

**Petani** — Individu anggota program. Punya identitas (ID Petani, NIK, alamat) dan bisa memiliki satu atau beberapa lahan.

**Kelompok Tani (KT)** — Kumpulan petani di tingkat di bawah Lembaga Petani. Di sistem ini KT melekat pada LAHAN (bukan pada petani), karena satu petani bisa punya lahan di KT berbeda.

**Lembaga Petani** — Tingkat tertinggi kelembagaan (asosiasi/koperasi, mis. ICS). Setiap petani terdaftar pada satu Lembaga Petani. Di menu Master Data namanya "Lembaga Petani". Hierarki lengkapnya: Petani → Kelompok Tani → Lembaga Petani.

**Lahan / Persil** — Sebidang kebun milik petani: ID Lahan, luas (Ha), tahun tanam, komoditas, dan poligon batas kebun (dari Shapefile).

**Produksi** — Catatan panen per lahan per bulan (periode YYYY-MM), dalam kilogram. Satu bulan bisa berisi beberapa kali panen.

**Pohon** — Titik pohon sawit di dalam sebuah lahan, dicatat lewat unggah massal shapefile.

**Surat kepemilikan** — Bukti legalitas lahan (SHM, SKT, SKGR, dll.): nomor surat, nama yang tertera di surat (bisa berbeda dari nama petani), dan luas tertera. Satu lahan bisa punya lebih dari satu surat; tampil di tab **Legalitas** Detail Lahan.

**STDB** — Surat Tanda Daftar Budidaya, terdaftar atas nama petani; satu STDB bisa menutup beberapa lahan petani yang sama.

**Sepadan** — Dengan siapa atau apa sebuah lahan berbatasan di sisi Utara, Timur, Selatan, dan Barat (lahan petani lain, jalan, sungai, kebun perusahaan). Dicatat bebas seperti pada SKT, di kotak **Sepadan** tab Informasi Detail Lahan, dan ikut tercetak di Profil Lahan. Bukan hasil hitungan peta — untuk itu ada *lahan tetangga*.

**NKT (Nilai Konservasi Tinggi / HCV)** — Status lahan menurut hasil asesmen: **termasuk** area NKT, **terdampak** (berbatasan/sebagian, mis. sempadan sungai), atau **tidak terdampak**; ditambah kategori NKT 1–6 (1 keanekaragaman hayati · 2 lanskap · 3 ekosistem langka · 4 jasa lingkungan seperti sempadan sungai · 5 kebutuhan masyarakat · 6 identitas budaya), luas area NKT di dalam lahan, dan tanggal/asesor. Lahan yang **belum dinilai** dibedakan dari yang "tidak terdampak". Tampil sebagai badge merah/amber di Detail Lahan dan Profil Lahan, layer di Peta Lahan, dan filter di Laporan Lahan.

**Patok batas** — Tanda batas fisik di sudut lahan (beton, kayu, pipa, tanda alam), dicatat terpisah dari poligon dengan koordinat, kondisi (Ada/Hilang/Rusak/Belum dipasang), foto, dan nomor urut per lahan. Satu patok yang berdiri di batas beberapa lahan dicatat **sekali** dan dipakai bersama; patok yang lahan pemakainya kena NKT ditandai merah. Diturunkan dari sudut poligon, ditambah manual, atau diunggah dari GPS; tampil di tab Patok Detail Lahan dan Profil Lahan PDF.

**Lahan tetangga** — Lahan lain yang **terdaftar di MIS** dan bersinggungan atau berjarak ≤ 25 m dari sebuah lahan, dihitung otomatis dari poligonnya. Tampil bergaris putus-putus bernomor di peta Detail Lahan dan Profil Lahan, dengan legenda pemilik/ID lahan/lembaga/jarak. Jalan, sungai, kebun perusahaan, atau lahan petani yang belum dipetakan tidak akan muncul di sini — catat lewat *Sepadan*. Nama pemilik tetangga selalu ditampilkan (alat verifikasi di lapangan); yang mengikuti akses Anda hanya tautan ke halaman detailnya.

**UL Parcel Code** — Kode lahan hasil pemetaan, unik per pemeta; dipakai untuk mencocokkan lahan dengan data pemetaan eksternal. **Pemeta** dicatat pada setiap kode: seluruh kode yang ada sekarang berasal dari **Meridia**, vendor yang ditugaskan donor (UL); ke depan pemetaan bisa swadaya atau dibantu WRI, dan kode dari pemeta berbeda hidup berdampingan pada lahan yang sama.

**Titik api (hotspot)** — Deteksi anomali panas oleh satelit VIIRS (NASA FIRMS), bukan konfirmasi kebakaran. Ditampilkan di Peta Lahan dan Fire Alert dengan rentang 24 jam / 5 / 10 / 30 hari; rentang harinya dihitung menurut **tanggal UTC** (satuan yang dipakai satelit), sehingga "5 hari" berarti 5 hari kalender UTC termasuk hari ini.

Bagaimana semua istilah di atas saling terhubung — dan kenapa Kelompok Tani menempel pada lahan, bukan pada petani — digambarkan di topik [Peta Data](/admin/help/memulai/peta-data).
