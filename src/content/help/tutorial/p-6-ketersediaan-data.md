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
2. Baca **hero** di atas: cincin **Skor Keseluruhan** dengan label bandnya, **distribusi Lembaga per band** (berapa yang kritis / perlu perhatian / baik / lengkap), tiga angka ringkas, dan **Aksi lintas Lembaga** — tiga kolom yang belum pernah diisi di banyak Lembaga beserta menu unggah massal untuk mengisinya.
+ Klik segmen distribusi (misalnya merah "kritis") untuk menyaring matriks dan panel di bawah ke Lembaga di band itu; klik lagi atau "hapus filter band" untuk melepasnya.
3. Lihat lima **kartu domain** — skor besar berwarna band, bobotnya terhadap Skor Keseluruhan, jumlah entitas, dan berapa Lembaga yang kritis di domain itu.
+ Skor domain adalah rata-rata seluruh lembaga yang **tertimbang jumlah petani** — lembaga besar berpengaruh lebih besar. Warna: hijau tua khusus 100 (lengkap penuh), hijau 80–99, kuning 50–79, merah <50 — warna yang sama dipakai di halaman Per Lembaga dan kartu Detail Lembaga.
+ **Klik kartu domain** untuk mengurutkan matriks dari yang terendah pada domain itu; klik lagi untuk kembali ke urutan Skor Total.
4. Baca **Matriks per Lembaga**. Skor Total ada tepat di samping nama; lima kolom domain berwarna lembut supaya yang paling menyimpang mudah terlihat. Bawaannya hanya 10 Lembaga terendah yang tampil — klik **Tampilkan semua** untuk seluruhnya, atau ketik di kotak **Cari Lembaga**.
+ Di header matriks, pilih **Kelengkapan inti** (skor yang membentuk Index) atau **Cakupan modul** (informatif: % persil ber-surat, ber-STDB, dinilai NKT, ber-patok, ber-pohon; % petani ber-Monev BMP; boundary ICS, acuan MD, dan lainnya). Cakupan modul **tidak** masuk Index; sel bergaris berarti modul itu belum dimulai di Lembaga tersebut.
+ **Klik nama Lembaga** untuk membuka halaman Per Lembaga dengan Lembaga itu sudah terpilih.
5. Gunakan filter **Kategori**, **Distrik**, dan **Lembaga** di kanan atas untuk mempersempit.
+ Filter, band, urutan, dan tampilan tersimpan di alamat halaman, jadi tampilannya bisa di-bookmark atau dikirim ke rekan kerja.
6. Di bawah matriks, **Paling tertinggal per domain** menampilkan lima Lembaga terendah untuk tiap domain — daftar kunjungan per urusan (misalnya siapa yang harus didatangi dulu untuk Produksi). Lembaga tanpa petani tidak diikutkan.
7. Periksa panel **Anomali Terbanyak**. Ada dua bagian:
+ **Per entitas** — masalah yang bisa dikejar per petani/persil, misalnya "Petani tanpa NIK".
+ **Kolom belum pernah diisi** — kolom yang di suatu Lembaga kosong hampir seluruhnya (≥ 95 %), misalnya status lahan atau tahun tanam. Ini urusan alur pengisian (unggah massal), bukan perbaikan satu per satu. Klik labelnya untuk melompat ke Lembaga yang paling terdampak; tooltip menyebut Lembaga lainnya.
8. Klik **Excel** (bila punya izin ekspor) untuk mengunduh matriks kelengkapan inti dan matriks cakupan modul.

> [!hati-hati] Skor rendah berarti datanya **belum tercatat lengkap** di sistem — belum tentu kondisi lapangannya buruk. Contoh: lembaga yang produksinya berjalan baik tetap berskor produksi 0 bila hasil panennya tidak pernah diunggah.

## Kalau bermasalah

**Semua skor 0 / halaman kosong** — kemungkinan tidak ada lembaga dalam cakupan akses Anda, atau filter Distrik/Kategori/Lembaga terlalu sempit. Kembalikan filter ke "Semua".

**Matriks hanya menampilkan sebagian Lembaga** — bawaannya 10 terendah, atau sedang ada filter band (lihat "hapus filter band" di hero). Klik **Tampilkan semua**.

**Skor tidak berubah setelah data diperbaiki** — muat ulang halamannya; angka dihitung saat halaman dibuka.

**Skor di sini beda dengan halaman Per Lembaga** — pastikan membandingkan lembaga yang sama; skor per lembaga memakai perhitungan yang sama sehingga seharusnya identik. Bila tetap berbeda, laporkan ke admin.

**Tombol Excel tidak ada** — akun Anda tidak punya izin EXPORT untuk menu ini; minta admin bila memang diperlukan.
