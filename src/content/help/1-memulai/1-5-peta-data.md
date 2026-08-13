---
title: Peta Data
icon: GitCompare
intro: Bagaimana data di MIS saling terhubung — dari Lembaga Petani sampai pohon, panen, dan pelatihan. Satu gambar untuk menghindari satu kesalahpahaman yang paling sering terjadi.
---

![Diagram hubungan data: Lembaga Petani menaungi Petani; Petani memiliki Lahan; Lahan berisi Pohon; Produksi dicatat per Lahan atas nama Petani; Pelatihan diselenggarakan Lembaga dan diikuti Petani](/help/img/1-5-peta-data.svg)

**Lembaga Petani → Petani** — Setiap petani terdaftar pada **satu** Lembaga Petani (asosiasi atau koperasi, sering disebut ICS). Sebuah Lembaga menaungi banyak petani.

**Petani → Lahan** — Satu petani boleh memiliki lebih dari satu lahan. Lahan tidak pernah berdiri sendiri; ia selalu menempel pada seorang petani.

**Lahan → Pohon** — Titik pohon sawit dicatat per lahan, biasanya lewat unggah massal berkas shapefile.

**Lahan → Produksi** — Catatan panen bulanan menempel pada lahan, sekaligus membawa nama petaninya. Karena itu angka produksi bisa dijumlahkan per lahan maupun per petani tanpa dihitung dua kali.

**Lembaga Petani → Pelatihan → Petani** — Kegiatan pelatihan diselenggarakan oleh Lembaga Petani, lalu petani dicatat sebagai peserta pada kegiatan itu.

> [!penting] **Kelompok Tani (KT) melekat pada LAHAN, bukan pada petani.** Inilah bagian yang paling sering keliru. Satu petani bisa memiliki lahan di Kelompok Tani yang berbeda-beda, jadi pertanyaan "petani ini masuk KT mana?" tidak selalu punya jawaban tunggal — yang punya KT adalah lahannya. Saat mengisi data lahan, kolom Kelompok Tani ada di formulir lahan, bukan di formulir petani.
+ Konsekuensi praktisnya saat membaca laporan: jumlah petani per KT dihitung dari lahan yang mereka miliki di KT tersebut. Seorang petani dengan dua lahan di dua KT akan muncul di kedua KT itu — bukan kesalahan data, melainkan memang begitu kenyataannya di lapangan.

## Kenapa ini perlu diketahui

Urutan pengisian data mengikuti arah panah pada gambar: Lembaga Petani dulu, baru petaninya, baru lahannya. Mencoba menambah lahan sebelum petaninya ada akan selalu gagal, karena lahan wajib menempel pada seseorang.
+ Hal yang sama berlaku untuk unggah massal: berkas petani harus masuk lebih dulu sebelum berkas lahan, dan berkas lahan sebelum berkas pohon. Bila urutannya terbalik, baris yang induknya belum ada akan dilewati beserta alasannya.

Istilah tiap kotak dijelaskan lebih lengkap di topik [Sekilas & Istilah Penting](/admin/help/memulai/istilah).
