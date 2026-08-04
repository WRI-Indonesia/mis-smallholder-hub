---
title: Membaca Main Dashboard
icon: LayoutDashboard
menuKey: dashboard-main
permission: VIEW
duration: 5
href: /admin/dashboard/main
hrefLabel: Buka Main Dashboard
goal: Anda paham arti tiap kartu ringkasan dan tahu mengapa angkanya bisa berbeda dari Master Data.
---

## Sebelum mulai

Main Dashboard adalah ringkasan program: jumlah petani, kelompok, lahan, luas, cakupan pelatihan, dan sertifikasi — dilengkapi peta sebaran lembaga.

Angka di sini **dibaca dari snapshot**, bukan dihitung ulang tiap halaman dibuka.

+ Snapshot adalah rekaman berkala yang dibuat lewat menu Tools. Pendekatan ini dipilih agar halaman tetap cepat meski data program besar. Konsekuensinya: input hari ini belum tentu langsung terlihat di sini — dan itu bukan kegagalan penyimpanan.

## Langkah

1. Buka menu **Dashboard → Main Dashboard**.
2. Baca baris kartu ringkasan di bagian atas.
+ Empat belas kartu, mencakup total petani (beserta rincian laki-laki/perempuan), kelompok tani, persil dan luas lahan, cakupan tiap paket pelatihan, serta status sertifikasi RSPO, ISPO, dan SAP/MAP.
3. Klik salah satu dari lima kartu pertama untuk membuka rincian angkanya.
+ Total Lembaga Petani menampilkan daftar lembaganya; Total Kelompok Tani menampilkan jumlah KT per lembaga; ketiga kartu sertifikasi menampilkan lembaga mana saja yang sudah tersertifikasi dan mana yang masih plan. Rincian selalu mengikuti filter yang sedang aktif, jadi jumlah barisnya sama dengan angka di kartu. Dari daftar rincian, klik nama lembaga untuk membuka halaman detailnya di Master Data. Sembilan kartu lainnya tidak memiliki rincian.
4. Gunakan filter **Distrik**, **Lembaga Petani**, dan **Tahun** untuk mempersempit.
+ Filter bekerja seketika karena mengiris snapshot yang sudah dimuat, tanpa memuat ulang halaman. Filter Tahun menyaring angka turunan petani berdasarkan Tahun Bergabung — bukan menyaring lembaga.
5. Klik titik lembaga di peta untuk membuka panel informasinya.
+ Panel memuat statistik lembaga tersebut beserta cakupan pelatihannya, dan badge sertifikasi di bawah kodenya. Titik yang berdekatan digabung jadi satu gugus; perbesar peta untuk memisahkannya.

> [!penting] Angka yang Anda lihat selalu terbatas pada wilayah kerja akun Anda. Karena itu total di layar Anda bisa berbeda dari rekan di distrik lain, dan itu normal.

## Kalau bermasalah

**Angka tidak berubah setelah input data** — dashboard membaca snapshot. Minta admin membuat snapshot baru lewat **Tools → Dashboard Snapshot**.

+ Untuk memastikan datanya benar-benar tersimpan, buka daftar di Master Data; daftar itu selalu membaca data terkini.

**Tertulis belum ada snapshot** — belum pernah ada snapshot dibuat. Lihat tutorial **Memperbarui angka dashboard**.

**Cakupan pelatihan terasa lebih rendah dari perkiraan** — pembaginya adalah seluruh petani aktif, termasuk mereka di lembaga yang belum tersentuh pelatihan sama sekali.
