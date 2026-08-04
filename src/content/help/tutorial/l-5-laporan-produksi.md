---
title: Mencetak Laporan Produksi
icon: TrendingUp
menuKey: report-production
permission: VIEW
duration: 6
href: /admin/report/production
hrefLabel: Buka Laporan Produksi
goal: Matriks produksi bulanan satu lembaga dalam rentang periode pilihan Anda, terunduh sebagai Excel atau PDF.
---

## Sebelum mulai

Laporan ini menyusun **matriks produksi bulanan**: satu baris per pasangan petani–lahan, satu kolom per bulan. Angkanya dalam **kilogram** dan dibaca dari data terkini, bukan snapshot.

Sel bulan yang kosong berbeda artinya dengan angka 0.

+ Sel kosong berarti tidak ada laporan panen bulan itu; 0 berarti dilaporkan panen nol. Di Excel sel kosong benar-benar kosong, sehingga rumus rata-rata Anda tidak tertarik turun oleh bulan yang tak melapor.

## Langkah

1. Buka menu **Report → Produksi**.
2. Isi keempat filter — semuanya wajib: **Distrik**, **Lembaga Petani**, **Periode Awal**, dan **Periode Akhir** (pemilih bulan).
+ Rentang maksimal 24 bulan. Kedua pemilih bulan saling membatasi (Awal tidak bisa melewati Akhir) — kalau bulan yang Anda mau terasa "tidak bisa dipilih", kosongkan dulu pemilih satunya.
3. Klik **Tampilkan Laporan**, lalu baca empat kartu ringkasan.
+ Total Petani menghitung petani unik yang punya data; Total Baris Lahan menghitung pasangan petani–lahan (satu petani dengan dua lahan = dua baris); Total Produksi dalam kg; Jumlah Bulan mengikuti rentang yang dipilih, bukan bulan yang ada datanya.
4. Tinjau matriksnya di layar — baris terakhir "Total per Bulan" menjumlahkan tiap kolom.
+ Petani atau lahan yang tidak punya satu pun catatan produksi pada rentang itu tidak dimunculkan sebagai baris nol. Baris dengan Id Lahan "-" adalah produksi yang diinput tanpa memilih lahan.
5. Unduh lewat tombol **Excel** atau **PDF**.
+ Excel satu sheet "Produksi" dengan angka mentah, cocok diolah lanjut. PDF berjudul *Catatan Produksi Petani*, landscape; untuk rentang lebih dari 12 bulan hurufnya mengecil otomatis — rentang panjang lebih nyaman dibaca lewat Excel.

> [!penting] Mengubah filter apa pun akan mengosongkan hasil — klik **Tampilkan Laporan** lagi. Ini disengaja agar angka di layar selalu cocok dengan filter yang terlihat.

## Kalau bermasalah

**"Tidak Ada Data Produksi" padahal filternya benar** — data produksi lembaga itu belum diinput untuk rentang tersebut, atau petaninya sudah dinonaktifkan/pindah lembaga. Laporan mengikuti lembaga petani **saat ini**, jadi produksi historis petani yang pindah ikut ke lembaga barunya.

**Angka berbeda dengan BMP Dashboard** — wajar, keduanya memang beda definisi: laporan ini memakai **kg** dan menyertakan produksi tanpa lahan; BMP Dashboard memakai **ton**, membaca snapshot, dan mengabaikan record tanpa lahan untuk hitungan produktivitasnya.

**Total Luas terasa kecil** — luas hanya dijumlahkan dari baris yang muncul di rentang itu; lahan yang tidak melapor tidak ikut, dan lahan tanpa angka luas dihitung 0.
