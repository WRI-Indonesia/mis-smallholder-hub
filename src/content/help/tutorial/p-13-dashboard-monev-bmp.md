---
title: Membaca Dashboard Monev BMP
icon: ClipboardCheck
menuKey: dashboard-bmp-monev
permission: VIEW
duration: 5
href: /admin/dashboard/bmp-monev
hrefLabel: Buka Dashboard Monev BMP
goal: Anda bisa membaca sejauh mana petani sudah menerapkan BMP, Lembaga mana yang tertinggal, dan bagaimana perubahannya antar tahun survei.
---

## Sebelum mulai

Dashboard ini menampilkan hasil **Monitoring & Evaluasi praktik BMP**: skor 0–3 per petani per tahun survei dan kategorinya. Ini **berbeda** dari **BMP Dashboard (Produksi)** yang membaca tonase dan produktivitas — keduanya sengaja dipisah karena satuan dan siklus datanya berbeda (penilaian tahunan vs produksi bulanan).

+ Angkanya dihitung langsung saat halaman dibuka (seperti Dashboard Pelatihan), jadi skor yang baru diinput atau diimpor langsung terlihat — tidak ada snapshot yang perlu dibuat ulang.

## Langkah

1. Buka menu **Dashboard → Monev BMP**.
2. Atur filter **Distrik**, **Lembaga Petani**, dan **Tahun survei**. Bawaannya tahun terbaru yang punya data.
+ Filter tersimpan di alamat halaman, jadi tampilan bisa di-bookmark atau dikirim ke rekan. Tahun hanya menawarkan tahun yang benar-benar punya penilaian.
3. Baca empat kartu ringkasan: **Petani Dinilai** (dibanding seluruh petani aktif), **Rerata Skor**, **Menerapkan BMP** (Teladan + Praktisi dari petani dinilai), dan **Lembaga Tercakup**.
+ Pembagi kartu pertama adalah seluruh petani aktif Lembaga terpilih — termasuk Lembaga yang belum disurvei sama sekali — supaya kesenjangan cakupan tidak tersembunyi. Pembagi kartu "Menerapkan BMP" adalah petani yang dinilai, karena status petani yang belum disurvei memang belum diketahui.
4. Baca kartu **Sebaran Kategori Petani** — empat ubin (Belum Implementasi, Perintis, Praktisi, Teladan) berisi jumlah dan persen petani dinilai, plus satu batang 100% seluruh petani. Ini jawaban utama Monev: berapa petani yang sudah sampai di tiap tingkat.
+ Urutan ubin dan segmen dari kiri **terendah → tertinggi** (abu lalu hijau makin gelap), sama dengan semua grafik di halaman ini.
5. Baca grafik **Komposisi Kategori per Lembaga**: satu batang per Lembaga dengan segmen kategori yang sama, urut rerata skor menurun. Arahkan kursor ke batang untuk rincian jumlah dan persen tiap kategori.
+ Lebar segmen adalah proporsi dari petani yang dinilai di Lembaga itu, bukan dari seluruh petaninya — dua Lembaga dengan komposisi serupa bisa punya cakupan survei yang sangat berbeda; angka "n dinilai" di kanan judul batang yang membedakannya.
6. Baca grafik **Rerata Skor per Lembaga — Top 10**: batang pada skala tetap 0–3 dan badge kategori rerata di kanan.
+ Skala dibuat tetap (bukan relatif ke Lembaga tertinggi) agar jarak setiap Lembaga ke ambang Teladan (2,50) terbaca langsung dari panjang batangnya.
7. Baca **Sebaran Skor Petani** (histogram per 0,25 skor, garis putus-putus = rerata) untuk melihat seberapa dekat petani ke ambang berikutnya — misalnya banyak petani di 1,25–1,49 berarti sedikit pendampingan lagi menaikkan mereka ke Praktisi.
8. Baca **Tren Kategori per Tahun Survei** — komposisi kategori per tahun dengan rerata skor tertulis di bawah tiap tahun.
+ Dengan satu tahun data, grafik ini baru satu batang; tren terbentuk begitu survei tahun berikutnya diimpor. Tahun yang sedang difilter ditebalkan.
9. Gunakan tabel **Rekap per Lembaga Petani** di paling bawah untuk angka pastinya (dinilai/aktif, cakupan, rerata, jumlah per kategori). Bawaannya hanya Lembaga ber-data; tombol **Tampilkan N belum dinilai** memuat Lembaga yang belum disurvei, dan tabel bisa dilipat. Tombol **Unduh Excel** (izin Export) selalu memuat semua Lembaga.

> [!hati-hati] Rerata skor Lembaga dengan sedikit petani dinilai mudah berubah oleh satu-dua petani. Bandingkan bersama kolom "Dinilai / Aktif" sebelum menyimpulkan Lembaga mana yang terbaik.

## Kalau bermasalah

**Tertulis "Belum ada penilaian Monev BMP".** Belum ada skor yang diinput dalam cakupan akses Anda. Input atau import lewat **Master Data → Monev BMP** (lihat tutorial **Mencatat hasil Monev BMP**).

**Lembaga tidak muncul di grafik komposisi atau tabel.** Grafik dan tabel bawaan hanya menampilkan Lembaga yang punya penilaian pada tahun terpilih; klik **Tampilkan N belum dinilai** di judul tabel untuk melihat sisanya (bertanda "Belum dinilai").

**Angkanya berbeda dari rekap Excel tim lapangan.** Dashboard menghitung satu skor per petani (rekap kadang menulis satu petani di beberapa baris lahan), mengabaikan baris tanpa ID Petani, dan menerapkan rubrik yang sama untuk semua Lembaga — kolom "Kriteria" di rekap yang ditulis tangan bisa saja berbeda.
