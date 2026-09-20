---
title: Membaca Dashboard Monev BMP
icon: ClipboardCheck
menuKey: dashboard-bmp-monev
permission: VIEW
duration: 5
href: /admin/dashboard/bmp-monev
hrefLabel: Buka Dashboard Monev BMP
goal: Anda bisa membaca sejauh mana petani sudah menerapkan BMP, Lembaga dan kegiatan mana yang tertinggal, siapa yang perlu didampingi dulu, dan bagaimana perubahannya antar tahun survei.
---

## Sebelum mulai

Dashboard ini menampilkan hasil **Monitoring & Evaluasi praktik BMP**: skor 0–3 per petani per tahun survei dan kategorinya. Ini **berbeda** dari **BMP Dashboard (Produksi)** yang membaca tonase dan produktivitas — keduanya sengaja dipisah karena satuan dan siklus datanya berbeda (penilaian tahunan vs produksi bulanan).

+ Angkanya dihitung langsung saat halaman dibuka (seperti Dashboard Pelatihan), jadi skor yang baru diinput atau diimpor langsung terlihat — tidak ada snapshot yang perlu dibuat ulang.

## Langkah

1. Buka menu **Dashboard → Monev BMP**. Halaman tersusun dalam empat bagian bernomor — **Gambaran umum → Lembaga Petani → Kegiatan & indikator → Tindak lanjut & tren** — dan sebaiknya dibaca berurutan.
2. Atur filter **Distrik**, **Lembaga Petani**, dan **Tahun survei**. Bawaannya tahun terbaru yang punya data.
+ Filter tersimpan di alamat halaman, jadi tampilan bisa di-bookmark atau dikirim ke rekan. Tahun hanya menawarkan tahun yang benar-benar punya penilaian.
3. **Bagian 1 — Gambaran umum.** Baca empat kartu ringkasan: **Petani Dinilai** (dibanding seluruh petani aktif), **Rerata Skor**, **Menerapkan BMP** (Teladan + Praktisi dari petani dinilai), dan **Lembaga Tercakup**; lalu kartu **Sebaran Kategori Petani** — empat ubin (Belum Implementasi, Perintis, Praktisi, Teladan) berisi jumlah dan persen petani dinilai, plus satu batang 100%. Ini jawaban utama Monev: berapa petani yang sudah sampai di tiap tingkat.
+ Pembagi kartu pertama adalah seluruh petani aktif Lembaga terpilih — termasuk Lembaga yang belum disurvei sama sekali — supaya kesenjangan cakupan tidak tersembunyi. Pembagi "Menerapkan BMP" adalah petani yang dinilai, karena status petani yang belum disurvei memang belum diketahui. Urutan ubin dan segmen dari kiri **terendah → tertinggi** (abu lalu hijau makin gelap), sama dengan semua grafik di halaman ini.
4. **Bagian 2 — Lembaga Petani.** Baca **Papan Lembaga Petani**: satu baris per Lembaga berisi peringkat, batang komposisi kategori, rerata skor + badge, dan cakupan survei (dinilai/aktif). Urutkan dengan tombol **Rerata / Cakupan / Abjad**; **klik nama Lembaga** untuk memfokuskan seluruh dashboard ke Lembaga itu (tombol **Semua Lembaga** melepasnya).
+ Lebar segmen adalah proporsi dari petani yang dinilai di Lembaga itu, bukan dari seluruh petaninya — dua Lembaga dengan komposisi serupa bisa punya cakupan survei yang sangat berbeda; kolom cakupan yang membedakannya.
5. Masih di Bagian 2, bila rincian indikator sudah diimpor, muncul **Profil Kelembagaan**: Lembaga × 14 indikator Lembaga sebagai chip skor 0–3, kolom **Rerata** per Lembaga di kanan, dan baris rerata per indikator di bawah. Urutkan **Rerata / Abjad**; kolom ber-★ ikut menentukan skor petani.
6. **Bagian 3 — Kegiatan & indikator** (hanya muncul bila ada rincian; lihat tutorial **Mengimpor form survei & membaca rincian indikator Monev BMP**). Kartu **Profil 5 Kegiatan BMP** adalah grafik laba-laba (radar) pada skala skor 0–3 dengan **pita empat kategori** sebagai latar, sehingga langsung terlihat kegiatan mana yang masih di pita Perintis. Pilih dua kelompok pembanding lewat selektor **A** dan **B** — masing-masing bisa **Semua Lembaga**, satu **Distrik**, atau satu **Lembaga** — misalnya rataan semua vs distrik, atau distrik vs Lembaga. Tabel di sampingnya memuat angka mentah A, B, dan selisihnya.
+ Selektor A/B **tidak mengikuti** filter Distrik/Lembaga di atas halaman (B hanya mengambilnya sebagai pilihan awal), supaya "Lembaga ini vs semua" tetap bisa dibaca saat dashboard sedang difokus ke Lembaga itu.
7. Di bawahnya, **Indikator Terlemah** menampilkan lima indikator berbobot dengan rerata terendah pada filter aktif; jumlah petani "tidak dinilai" ditulis terpisah.
+ Kartu-kartu Bagian 3 hanya menghitung petani yang punya rincian; petani yang hanya punya skor akhir tidak ikut, sehingga jumlahnya bisa lebih kecil dari "Petani Dinilai".
8. **Bagian 4 — Tindak lanjut & tren.** Dua daftar petani: **Petani Prioritas Pendampingan** (sepuluh skor terendah, dengan kegiatan terlemahnya bila ada rincian) dan **Petani Teladan** (sepuluh skor tertinggi, dengan kegiatan terkuatnya — calon petani contoh). Klik nama untuk membuka rincian penilaiannya.
+ Daftar mengikuti filter aktif; fokuskan ke satu Lembaga (langkah 4) untuk mendapatkan daftar kunjungan Lembaga itu.
9. Baca **Sebaran Skor Petani** (histogram per 0,25 skor, garis putus-putus = rerata) untuk melihat seberapa dekat petani ke ambang berikutnya — misalnya banyak petani di 1,25–1,49 berarti sedikit pendampingan lagi menaikkan mereka ke Praktisi — dan **Tren Kategori per Tahun Survei** (komposisi kategori per tahun, rerata skor di bawah tiap tahun).
+ Dengan satu tahun data, grafik tren baru satu batang; tren terbentuk begitu survei tahun berikutnya diimpor. Tahun yang sedang difilter ditebalkan.
10. Gunakan tabel **Rekap per Lembaga Petani** di paling bawah untuk angka pastinya (dinilai/aktif, cakupan, rerata, jumlah per kategori). Bawaannya hanya Lembaga ber-data; tombol **Tampilkan N belum dinilai** memuat Lembaga yang belum disurvei, dan tabel bisa dilipat. Tombol **Unduh Excel** (izin Export) selalu memuat semua Lembaga.

> [!hati-hati] Rerata skor Lembaga dengan sedikit petani dinilai mudah berubah oleh satu-dua petani. Bandingkan bersama kolom "Dinilai / Aktif" sebelum menyimpulkan Lembaga mana yang terbaik.

## Kalau bermasalah

**Tertulis "Belum ada penilaian Monev BMP".** Belum ada skor yang diinput dalam cakupan akses Anda. Input atau import lewat **Master Data → Monev BMP** (lihat tutorial **Mencatat hasil Monev BMP**).

**Lembaga tidak muncul di Papan Lembaga atau tabel.** Papan dan tabel bawaan hanya menampilkan Lembaga yang punya penilaian pada tahun terpilih; klik **Tampilkan N belum dinilai** di judul tabel untuk melihat sisanya (bertanda "Belum dinilai").

**Angkanya berbeda dari rekap Excel tim lapangan.** Dashboard menghitung satu skor per petani (rekap kadang menulis satu petani di beberapa baris lahan), mengabaikan baris tanpa ID Petani, dan menerapkan rubrik yang sama untuk semua Lembaga — kolom "Kriteria" di rekap yang ditulis tangan bisa saja berbeda.
