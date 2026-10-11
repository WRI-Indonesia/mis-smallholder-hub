---
title: Memeriksa ketersediaan data semua Lembaga
icon: Gauge
menuKey: data-analyst-data-availability
permission: VIEW
duration: 5
href: /admin/data-analyst/data-availability
hrefLabel: Buka Ketersediaan Data › Semua Lembaga
goal: Anda tahu lembaga mana yang datanya paling perlu dikejar, anomali apa yang paling banyak harus dibereskan, dan langsung bisa melompat ke daftar kerjanya.
---

## Sebelum mulai

Halaman **Ketersediaan Data › Semua Lembaga** menilai kelengkapan data — bukan isi datanya. Skor 0–100 dihitung dari lima domain: Profil Lembaga, Petani, Lahan, Pelatihan, dan Produksi.

Angkanya dihitung langsung saat halaman dibuka (bukan snapshot), jadi perbaikan data langsung terlihat setelah halaman dimuat ulang.

+ Skor per lembaga di sini **sama persis** dengan skor di halaman **Ketersediaan Data — Per Lembaga** (menu berikutnya di grup Ketersediaan Data; menu ketiga, **Produksi**, menjawab pertanyaan lain: bulan apa yang sudah punya data produksi) — keduanya memakai perhitungan yang sama. Bedanya: halaman ini menampilkan semua lembaga sekaligus, sedangkan Per Lembaga membedah satu lembaga sampai ke daftar nama petaninya. Alurnya: ringkasan di sini → klik nama Lembaga → daftar kerja di Per Lembaga → perbaiki di Master Data.

## Langkah

1. Buka menu **Data Analyst → Ketersediaan Data → Semua Lembaga**. Judul halamannya **Ketersediaan Data**; tab di bawahnya (**Semua Lembaga · Per Lembaga · Produksi**) berpindah antar halaman keluarga ini.
2. Persempit dengan filter **Kategori**, **Distrik**, dan **Lembaga**. Setiap pilihan yang berlaku tampil sebagai chip di baris **Filter aktif**; klik ✕ pada chip untuk melepasnya, atau **Reset semua** untuk kembali ke tampilan bawaan.
+ Filter, tingkat skor, urutan, tampilan, dan tab Daftar Kerja tersimpan di alamat halaman, jadi tampilannya bisa di-bookmark atau dikirim ke rekan kerja.
3. Baca **hero** satu baris: cincin **Skor Keseluruhan** dengan label tingkat skornya, satu kalimat jumlah Lembaga · petani · lahan, dan bar **Sebaran Lembaga per tingkat skor** (kritis · perhatian · baik · lengkap) dengan jumlah di dalam tiap segmen.
+ Klik segmen (misalnya merah "kritis") untuk menyaring matriks dan Daftar Kerja ke Lembaga di tingkat itu; klik lagi, atau ✕ pada chip "Tingkat skor", untuk melepasnya.
4. Lihat lima **kartu domain** — skor besar berwarna tingkat, chip bobotnya terhadap Skor Keseluruhan, jumlah entitas, dan berapa Lembaga yang kritis di domain itu.
+ Skor domain adalah rata-rata seluruh lembaga yang **tertimbang jumlah petani** — lembaga besar berpengaruh lebih besar. Warna: hijau tua khusus 100 (lengkap penuh), hijau 80 – <100, kuning 50 – <80, merah <50 — warna yang sama dipakai di halaman Per Lembaga dan kartu Detail Lembaga.
+ Klik chip **Urutkan** pada kartu untuk mengurutkan matriks dari yang terendah pada domain itu; chip berubah jadi **Terurut**. Klik lagi untuk kembali ke urutan Skor Total.
5. Baca **matriks per Lembaga**. Toolbar di atasnya tetap terlihat saat digulir: ringkasan "n Lembaga · n kritis · 10 tampil", ikon ⓘ cara membaca, tab tampilan, **Urut**, tombol arah, dan **Cari**.
+ Bawaannya hanya **10 Lembaga terendah** yang tampil; klik **Tampilkan n lagi** di bawah grid untuk semuanya. Pencarian selalu menampilkan semua yang cocok.
+ **Radar** (*sidik jari*, bawaan): tiap Lembaga satu pentagon lima sumbu — Profil di atas, lalu searah jarum jam Petani, Lahan, Pelatihan, Produksi. Bentuknya yang dibaca: penuh = lengkap, gepeng ke satu sisi = domain itu kosong. Arahkan kursor ke kartu lalu klik **Perbesar** (atau grafiknya) untuk jendela besar berisi tabel domain, bobot, dan kontribusi ke Skor Total; tombol **Sebelumnya/Berikutnya** (atau panah ← →) berpindah Lembaga.
+ **Heatmap** (*tabel warna*): Lembaga × domain, tiap sel diwarnai mengikuti skornya. Pola langsung terbaca dari warnanya — misalnya kolom Produksi merah di hampir semua baris berarti masalahnya sistemik. Klik judul kolom untuk mengurutkan; klik lagi untuk membalik arah.
+ **Cakupan modul** (*di luar Index*): % lahan ber-surat, ber-STDB, dinilai NKT, ber-patok, ber-pohon; % petani ber-Monev BMP; boundary ICS, acuan MD, dan lainnya — informatif, **tidak** masuk Index. Sel bergaris berarti modul itu belum dimulai di Lembaga tersebut. Urutan, pencarian, dan Ringkas bekerja sama seperti dua tampilan lain.
+ Skala warnanya kontinu, tetapi garis pada legenda menandai ambang tingkat skor (50 dan 80), jadi "merah = kritis, kuning = perlu perhatian, hijau = baik" tetap berlaku.
+ **Klik nama Lembaga** di tampilan mana pun untuk membuka halaman Per Lembaga dengan Lembaga itu sudah terpilih.
6. Kerjakan dari kartu **Daftar Kerja** di bawah matriks. Tiga tab, masing-masing dengan badge jumlah:
+ **Sistemik (unggah massal)** — kolom yang di suatu Lembaga kosong hampir seluruhnya (≥ 95 %), misalnya status lahan atau tahun tanam, beserta menu pengisiannya ("Isi lewat …"). Ini urusan alur pengisian, bukan perbaikan satu per satu.
+ **Per entitas** — masalah yang bisa dikejar per petani/lahan, misalnya "Petani tanpa NIK".
+ **Tertinggal per domain** — sampai lima Lembaga terendah untuk tiap domain, daftar kunjungan per urusan. Lembaga tanpa petani tidak diikutkan.
+ Klik label baris untuk melompat ke Lembaga yang paling terdampak; tombol **n Lembaga ▾** membuka daftar semua Lembaga terdampak (bisa dengan keyboard).
7. Klik **Excel** (bila punya izin ekspor) untuk mengunduh matriks kelengkapan inti dan matriks cakupan modul.

> [!hati-hati] Skor rendah berarti datanya **belum tercatat lengkap** di sistem — belum tentu kondisi lapangannya buruk. Contoh: lembaga yang produksinya berjalan baik tetap berskor produksi 0 bila hasil panennya tidak pernah diunggah.

## Kalau bermasalah

**Semua skor 0 / halaman kosong** — kemungkinan tidak ada lembaga dalam cakupan akses Anda, atau pilihan filter terlalu sempit. Klik **Reset semua** di baris Filter aktif.

**Radar/matriks hanya menampilkan 10 Lembaga** — itu tampilan bawaan (10 terendah menurut urutan aktif). Klik **Tampilkan n lagi** di bawah grid. Bila jumlahnya tetap sedikit, periksa baris **Filter aktif** (misalnya chip "Tingkat skor") dan klik ✕ atau **Reset semua**.

**Skor tidak berubah setelah data diperbaiki** — muat ulang halamannya; angka dihitung saat halaman dibuka.

**Skor di sini beda dengan halaman Per Lembaga** — pastikan membandingkan lembaga yang sama; skor per lembaga memakai perhitungan yang sama sehingga seharusnya identik. Bila tetap berbeda, laporkan ke admin.

**Tombol Excel tidak ada** — akun Anda tidak punya izin EXPORT untuk menu ini; minta admin bila memang diperlukan.
