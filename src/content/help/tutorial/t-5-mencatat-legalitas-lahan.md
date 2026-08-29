---
title: Mencatat surat, STDB, dan program pada lahan
icon: FileText
menuKey: master-data-parcels
permission: CREATE
duration: 4
href: /admin/master-data/parcels
hrefLabel: Buka halaman Lahan
goal: Satu lahan punya catatan legalitas yang lengkap — surat kepemilikan, STDB, UL Parcel Code, dan keikutsertaan program — tanpa harus lewat unggah massal.
---

## Sebelum mulai

Untuk **banyak lahan sekaligus**, pakai Bulk Upload → Lahan → tab **Detail Lahan (Excel)**. Halaman ini untuk **satu lahan**: melengkapi yang kurang, membetulkan yang salah, atau mendaftarkan **program** (demplot PBU) — program memang hanya bisa dicatat dari sini.

+ Semua catatan ini menempel pada *identitas* lahan, bukan pada satu versi poligon. Kalau poligonnya kelak direvisi lewat unggah shapefile, catatannya tetap ikut.

Tombol yang tampil mengikuti izin Anda pada menu Lahan: **Tambah** butuh izin tambah, ikon pensil butuh izin ubah, ikon tempat sampah / lepas butuh izin hapus.

## Langkah

1. Buka **Master Data → Lahan**, klik tombol detail pada baris lahan.
2. Buka tab **Legalitas** (jumlah catatannya tampil di tab; kartu **Legalitas** di atas meringkas jenis surat & STDB).
3. Klik **Tambah** pada blok yang sesuai — Surat Kepemilikan, STDB, UL Parcel Code, atau Program.
+ Tiap grup punya tombol Tambah sendiri; grup yang kosong hanya menampilkan satu kalimat, bukan tabel kosong.
4. Isi formulir lalu klik **Tambah**. Untuk surat, hanya **Jenis** yang wajib; untuk STDB, **Tahap** yang wajib — nomor baru wajib bila tahapnya *Terbit*.
+ **Surat** — Jenis yang tidak ada di daftar pilih *Lainnya*. Nilai seperti "surat di bank" atau "lahan sudah dijual" bukan jenis; tulis di **Catatan Penguasaan**. **Luas Tertera** adalah angka di surat — boleh berbeda dari luas poligon; baris surat menampilkan selisihnya dan menandai bila ≥ 0,5 Ha.
+ **STDB** — terbit per **petani** dan boleh menutup beberapa lahan. Bila nomor yang Anda ketik sudah terdaftar untuk petani yang sama, lahan ini cukup *ditautkan* ke STDB itu (tidak dibuat dua kali). Keterangan **Juga mencakup:** di baris STDB memperlihatkan persil lain yang tercakup.

## Tahapan STDB

STDB tidak lahir bernomor. Nomornya baru keluar dari dinas di tahap terakhir, jadi Anda **tidak perlu menunggu nomor** untuk mulai mencatat: pilih tahap yang sesuai, dan daftar persil yang akan diajukan bisa disusun dari sekarang.

| Tahap | Artinya |
| --- | --- |
| **Persiapan Data** | Berkas sedang disiapkan, belum diajukan |
| **Pengajuan** | Berkas sudah masuk ke dinas, menunggu |
| **Revisi** | Berkas dikembalikan untuk diperbaiki — **masih berjalan** |
| **Terbit** | STDB sudah keluar; nomor dan tanggal terbit diisi di sini |
| **Ditolak** | Proses **berhenti**; mengajukan lagi berarti membuat berkas baru |

+ **Revisi bukan Ditolak.** Selama tahapnya *Revisi*, berkasnya masih dihitung sebagai pengajuan yang berjalan. *Ditolak* menutup berkas itu — pakai hanya bila memang tidak akan dilanjutkan dengan berkas tersebut. Keduanya wajib diberi **Catatan Tahap** (alasannya).
+ **Satu petani hanya boleh punya satu berkas yang sedang berjalan** (Persiapan Data / Pengajuan / Revisi). Lahan lain yang ikut dalam pengajuan yang sama ditautkan ke berkas itu, bukan dibuatkan berkas baru. Petani boleh punya banyak STDB yang sudah **Terbit**.
+ Kolom **Nomor**, **Tanggal Terbit**, dan **Tahun Terbit** hanya muncul pada tahap *Terbit* — supaya baris pengajuan tidak pernah terbaca seolah STDB-nya sudah keluar.
+ **UL Parcel Code** — pasangan sumber + kode harus unik; kode yang sudah dipakai lahan lain ditolak.
+ **Program** — untuk saat ini hanya *Demplot PBU*; status Direncanakan / Berjalan / Selesai / Dibatalkan, tanggal selesai tidak boleh mendahului tanggal mulai.
5. Untuk mengubah, klik ikon **pensil** di ujung baris; untuk menghapus, klik ikon **tempat sampah**, lalu konfirmasi.
+ Menghapus surat/kode/program hanya **menonaktifkan** (data tersimpan sebagai riwayat). Pada STDB ikonnya **lepas tautan**: STDB-nya tetap ada untuk petani dan lahan lain, hanya kaitan ke lahan ini yang dilepas.

> [!penting] Dokumen yang masuk dari unggah Excel dengan jenis kosong tampil sebagai *"Lainnya (jenis belum diisi)"* — inilah tempat melengkapinya: klik pensil, pilih jenis yang benar, simpan.

## Hasil

Baris STDB menampilkan **tahapnya** (yang sudah Terbit tampil polos tanpa penanda; Revisi ditandai amber, Ditolak abu dan dicoret), dan baris yang belum bernomor tertulis "Pengajuan — belum bernomor", bukan kosong. Catatan tampil di tab **Legalitas** lahan (surat, STDB, UL Parcel Code — keikutsertaan program ada di tab **Program** tersendiri) dan kartu Legalitas di atasnya, diringkas di tab **Lahan** pada detail petani (kolom Surat & STDB), dan bisa ditampilkan di **Report → Lahan** lewat tombol Kolom (Surat Kepemilikan, Nama di Surat, Luas Tertera, STDB).

## Kalau bermasalah

**Tombol Tambah / pensil tidak muncul** — akun Anda tidak punya izin tambah/ubah pada menu Lahan. Minta administrator lewat Settings → Izin Peran.

**"Petani ini sudah punya satu berkas STDB yang sedang berjalan"** — satu petani hanya boleh punya satu berkas pra-terbit. Cari baris STDB berjalan milik petani itu (ada di detail lahan mana pun miliknya) lalu ubah tahapnya di sana, atau tautkan lahan ini ke berkas tersebut.

**"Nomor STDB ini sudah terdaftar untuk petani yang sama"** saat mengubah — Anda mengganti nomor menjadi nomor STDB lain milik petani itu. Bila maksudnya menautkan lahan ke STDB tersebut, lepas STDB ini lalu **Tambah** STDB dengan nomor itu.

**"Kode ini sudah dipakai lahan lain untuk sumber yang sama"** — UL Parcel Code unik per sumber. Cari lahan pemakainya lewat pencarian di Master Data → Lahan (atau detail lahan yang bersangkutan), lalu perbaiki di sana lebih dulu.

**"Lahan tidak ditemukan atau di luar akses Anda"** — lahan nonaktif atau di luar wilayah/lembaga akses Anda; aktifkan kembali lahan dulu (SUPERADMIN) atau minta akses.
