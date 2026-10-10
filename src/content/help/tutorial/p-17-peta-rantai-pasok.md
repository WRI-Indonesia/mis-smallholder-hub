---
title: Membaca Peta Rantai Pasok (prototipe)
icon: Map
menuKey: map-supply-chain
permission: VIEW
duration: 5
href: /admin/map/supply-chain
hrefLabel: Buka Peta Rantai Pasok
goal: Anda bisa melihat sebaran Lembaga, agen/RAMP, dan Mill di peta beserta arah dan besar aliran TBS di antara mereka, lalu menjadikan apa yang Anda klik sebagai filter.
---

## Sebelum mulai

Peta ini masih **prototipe**, dengan data yang sama seperti Dashboard Rantai Pasok (pengakuan survei 2025). Garisnya **garis lurus yang sedikit dilengkungkan** agar tidak saling tindih, bukan rute angkut sebenarnya.

## Langkah

1. Buka **Map → Peta Rantai Pasok**. Panel kiri berisi ringkasan singkat (total TBS, persen yang tergambar, tautan **Dashboard**) dan empat bagian yang bisa dilipat: **Filter** (terbuka), lalu **Lapisan**, **Legenda**, dan **Ringkasan** (terlipat; judulnya menampilkan ringkasan isinya). Tombol di pojok panel melipat seluruh panel. Di kanan atas peta ada tumpukan tombol: **perbesar/perkecil**, **Paskan** (muat semua data), **Lapisan**, dan **Basemap**. Strip **legenda** mendatar ada di bawah tengah peta; tombol ✕ menyembunyikannya, chip **Legenda** memunculkannya lagi.
2. Pilih tampilan **Ringkas** (satu garis per Lembaga → Mill) atau **Detail** (garis singgah di agen/RAMP yang punya koordinat, plus titik lahan Siak).
3. Atur filter di bagian **Filter**. Isinya sama dengan dashboard dan saling terbawa. Peta otomatis menyesuaikan ke data setiap filter berubah.
4. Baca peta. Warna garis = jalur pertama TBS (lihat strip legenda, atau bagian **Legenda** di panel yang lengkap dengan contoh tebal garis untuk tiga tonase). Tebal garis sebanding dengan tonase. **Titik yang bergerak** di sepanjang garis menunjukkan arah TBS; bila animasi dimatikan di bagian **Lapisan**, arahnya ditunjukkan panah putih.
+ Ikon pabrik **biru** = Mill pemasok UL, **abu gelap** = Mill lain, **abu muda bertepi putus-putus** = PKS belum pasti (survei hanya menyebut nama PT). Lingkaran samar di bawah ikon sebanding dengan tonase Mill. Pada zoom jauh hanya 8 Mill dan 8 Lembaga terbesar yang diberi nama; zoom lebih dekat untuk melihat semuanya, atau matikan label di **Lapisan**.
5. **Arahkan kursor** ke garis atau titik: muncul keterangan singkat (nama dan tonase) dan garisnya menyala.
6. **Klik** sebuah Lembaga, agen/RAMP, atau Mill untuk menyorot jaringannya; yang lain diredupkan, dan chip **Menyorot: …** muncul di panel (✕ untuk berhenti). Popup menampilkan TBS beserta porsinya dari total, status PKS, jumlah Lembaga dan offtaker, jarak rata-rata garis lurus, dan Mill atau Lembaga teratas. Di bawahnya ada dua aksi: **Jadikan filter** (peta dan dashboard ikut tersaring) dan **Lihat di Dashboard** (membuka dashboard dengan filter itu). Popup bisa digeser lewat pil di atasnya. Klik area kosong, atau ✕ di chip, untuk kembali.
7. Buka bagian **Ringkasan** untuk melihat tonase yang **tidak tergambar**. Baris yang punya panah bisa dibuka untuk melihat **nama** Mill tanpa koordinat, Lembaga tanpa titik, atau offtaker yang dilewati tanpa titik, beserta tonasenya.
+ Saklar di **Lapisan** (garis alir, animasi, label, titik lahan, garis lahan → Mill) dan posisi lipat tiap bagian diingat di browser Anda.

## Kalau bermasalah

**Garis langsung ke Mill padahal lewat agen.** Sebagian besar agen dan RAMP belum punya koordinat di survei, jadi garisnya dilompatkan ke titik berikutnya. Nama dan tonasenya terlihat di bagian Ringkasan.

**Garis tidak bergerak.** Animasi dimatikan di bagian Lapisan, atau sistem operasi Anda meminta gerak dikurangi (aksesibilitas). Arah tetap terbaca dari panah putih.

**Nama Mill tidak tampil.** Pada zoom jauh hanya 8 terbesar per jenis yang diberi nama. Zoom lebih dekat, atau arahkan kursor ke ikonnya.

**Titik lahan bertepi gelap.** Lahan itu tidak cocok dengan poligon di MIS, jadi titiknya memakai koordinat dari form survei.
