---
title: Memeriksa ketersediaan data semua Lembaga
icon: Gauge
menuKey: data-analyst-data-availability
permission: VIEW
duration: 5
href: /admin/data-analyst/data-availability
hrefLabel: Buka Ketersediaan Data — Semua Lembaga
goal: Anda tahu lembaga mana yang datanya paling perlu dikejar, anomali apa yang paling banyak harus dibereskan, dan langsung bisa melompat ke daftar kerjanya.
---

## Sebelum mulai

Halaman **Ketersediaan Data — Semua Lembaga** menilai kelengkapan data — bukan isi datanya. Skor 0–100 dihitung dari lima domain: Profil Lembaga, Petani, Lahan, Pelatihan, dan Produksi.

Angkanya dihitung langsung saat halaman dibuka (bukan snapshot), jadi perbaikan data langsung terlihat setelah halaman dimuat ulang.

+ Skor per lembaga di sini **sama persis** dengan skor di halaman **Ketersediaan Data — Per Lembaga** (menu berikutnya di grup yang sama) — keduanya memakai perhitungan yang sama. Bedanya: halaman ini menampilkan semua lembaga sekaligus, sedangkan Per Lembaga membedah satu lembaga sampai ke daftar nama petaninya. Alurnya: ringkasan di sini → klik nama Lembaga → daftar kerja di Per Lembaga → perbaiki di Master Data.

## Langkah

1. Buka menu **Data Analyst → Ketersediaan Data — Semua Lembaga**.
2. Baca kartu **Skor Keseluruhan** dan lima kartu domain di sebelahnya.
+ Skor domain adalah rata-rata seluruh lembaga yang **tertimbang jumlah petani** — lembaga besar berpengaruh lebih besar. Warna: hijau tua khusus 100 (lengkap penuh), hijau 80–99, kuning 50–79, merah <50 — warna yang sama dipakai di halaman Per Lembaga dan kartu Detail Lembaga.
3. Pilih tampilan **Kelengkapan inti** (skor yang membentuk Index) atau **Cakupan modul** (informatif: % persil ber-surat, ber-STDB, dinilai NKT, ber-patok, ber-pohon; % petani ber-Monev BMP; boundary ICS, acuan MD, dan lainnya).
+ Cakupan modul **tidak** masuk Index. Sel abu-abu bergaris berarti modul itu belum dimulai sama sekali di Lembaga tersebut dan sengaja tidak dihitung; baris **Semua Lembaga** hanya menjumlah Lembaga yang modulnya sudah berjalan.
4. Lihat **Matriks Kelengkapan per Lembaga & Domain**. Urutan bawaannya skor terendah dulu.
+ Setiap sel adalah skor satu domain untuk satu lembaga; arahkan kursor ke sel untuk keterangan band skornya. Klik judul kolom untuk mengurutkan; **klik nama Lembaga** untuk membuka halaman Per Lembaga dengan Lembaga itu sudah terpilih.
5. Gunakan filter **Kategori**, **Distrik**, dan **Lembaga** di kanan atas untuk mempersempit — filter Lembaga berguna saat bar chart terlalu panjang.
+ Filter dan tampilan tersimpan di alamat halaman, jadi tampilannya bisa di-bookmark atau dikirim ke rekan kerja.
6. Periksa panel **Anomali Terbanyak**. Ada dua bagian:
+ **Per entitas** — masalah yang bisa dikejar per petani/persil, misalnya "Petani tanpa NIK".
+ **Kolom belum pernah diisi** — kolom yang di suatu Lembaga kosong hampir seluruhnya (≥ 95 %), misalnya status lahan atau tahun tanam. Ini urusan alur pengisian (unggah massal), bukan perbaikan satu per satu. Klik labelnya untuk melompat ke Lembaga yang paling terdampak; tooltip menyebut Lembaga lainnya.
7. Klik **Excel** (bila punya izin ekspor) untuk mengunduh matriks kelengkapan inti dan matriks cakupan modul.

> [!hati-hati] Skor rendah berarti datanya **belum tercatat lengkap** di sistem — belum tentu kondisi lapangannya buruk. Contoh: lembaga yang produksinya berjalan baik tetap berskor produksi 0 bila hasil panennya tidak pernah diunggah.

## Kalau bermasalah

**Semua skor 0 / halaman kosong** — kemungkinan tidak ada lembaga dalam cakupan akses Anda, atau filter Distrik/Kategori/Lembaga terlalu sempit. Kembalikan filter ke "Semua".

**Skor tidak berubah setelah data diperbaiki** — muat ulang halamannya; angka dihitung saat halaman dibuka.

**Skor di sini beda dengan halaman Per Lembaga** — pastikan membandingkan lembaga yang sama; skor per lembaga memakai perhitungan yang sama sehingga seharusnya identik. Bila tetap berbeda, laporkan ke admin.

**Tombol Excel tidak ada** — akun Anda tidak punya izin EXPORT untuk menu ini; minta admin bila memang diperlukan.
