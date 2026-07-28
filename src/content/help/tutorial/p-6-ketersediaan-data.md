---
title: Memeriksa ketersediaan data
icon: Gauge
menuKey: data-analyst-data-availability
permission: VIEW
duration: 5
href: /admin/data-analyst/data-availability
hrefLabel: Buka Dashboard Ketersediaan Data
goal: Anda tahu lembaga mana yang datanya paling perlu dikejar, dan anomali apa yang paling banyak harus dibereskan.
---

## Sebelum mulai

Dashboard **Ketersediaan Data** menilai kelengkapan data — bukan isi datanya. Skor 0–100 dihitung dari lima domain: Profil Lembaga, Petani, Lahan, Pelatihan, dan Produksi.

Angkanya dihitung langsung saat halaman dibuka (bukan snapshot), jadi perbaikan data langsung terlihat setelah halaman dimuat ulang.

+ Skor per lembaga di sini **sama persis** dengan skor di halaman **Analisa Ketersediaan Data** (menu Data Analyst juga) — keduanya memakai perhitungan yang sama. Bedanya: dashboard menampilkan semua lembaga sekaligus, sedangkan Analisa membedah satu lembaga sampai ke daftar nama petaninya.

## Langkah

1. Buka menu **Data Analyst → Dashboard Ketersediaan Data**.
2. Baca kartu **Skor Keseluruhan** dan lima kartu domain di sebelahnya.
+ Skor domain adalah rata-rata seluruh lembaga yang **tertimbang jumlah petani** — lembaga besar berpengaruh lebih besar. Warna: hijau tua khusus 100 (lengkap penuh), hijau 80–99, kuning 50–79, merah <50.
3. Lihat **Matriks Kelengkapan per Lembaga & Domain**. Urutan bawaannya skor terendah dulu.
+ Setiap sel adalah skor satu domain untuk satu lembaga. Klik judul kolom untuk mengurutkan — misalnya kolom **Lahan** menaik untuk menemukan lembaga yang paling banyak persilnya belum lengkap.
4. Gunakan filter **Kategori** dan **Distrik** di kanan atas untuk mempersempit.
+ Filter tersimpan di alamat halaman, jadi tampilannya bisa di-bookmark atau dikirim ke rekan kerja.
5. Periksa panel **Anomali Terbanyak** untuk tahu jenis masalah yang paling sering muncul, misalnya "Petani tanpa NIK" atau "Persil tanpa geometry".
6. Untuk menindaklanjuti satu lembaga, klik **Analisa detail per Lembaga** → pilih lembaganya di halaman Analisa Ketersediaan Data.
+ Di sana tersedia daftar nama petani per anomali — itulah daftar kerja untuk melengkapi datanya. Dashboard sengaja tidak memuat nama petani.

> [!hati-hati] Skor rendah berarti datanya **belum tercatat lengkap** di sistem — belum tentu kondisi lapangannya buruk. Contoh: lembaga yang produksinya berjalan baik tetap berskor produksi 0 bila hasil panennya tidak pernah diunggah.

## Kalau bermasalah

**Semua skor 0 / halaman kosong** — kemungkinan tidak ada lembaga dalam cakupan akses Anda, atau filter Distrik/Kategori terlalu sempit. Kembalikan filter ke "Semua".

**Skor tidak berubah setelah data diperbaiki** — muat ulang halamannya; angka dihitung saat halaman dibuka.

**Skor di dashboard beda dengan halaman Analisa** — pastikan membandingkan lembaga yang sama; skor per lembaga memakai perhitungan yang sama sehingga seharusnya identik. Bila tetap berbeda, laporkan ke admin.
