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

**UL Parcel Code** — Kode lahan dari vendor pemetaan (`parcel_code`), unik per sumber; dipakai untuk mencocokkan lahan dengan data pemetaan eksternal.

**Titik api (hotspot)** — Deteksi anomali panas oleh satelit VIIRS (NASA FIRMS), bukan konfirmasi kebakaran. Ditampilkan di Peta Lahan dan Fire Alert dengan rentang 24 jam / 5 / 10 / 30 hari; rentang harinya dihitung menurut **tanggal UTC** (satuan yang dipakai satelit), sehingga "5 hari" berarti 5 hari kalender UTC termasuk hari ini.

Bagaimana semua istilah di atas saling terhubung — dan kenapa Kelompok Tani menempel pada lahan, bukan pada petani — digambarkan di topik [Peta Data](/admin/help/memulai/peta-data).
