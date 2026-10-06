---
title: Membaca Peta Rantai Pasok (prototipe)
icon: Map
menuKey: map-supply-chain
permission: VIEW
duration: 4
href: /admin/map/supply-chain
hrefLabel: Buka Peta Rantai Pasok
goal: Anda bisa melihat sebaran Lembaga, agen/RAMP, dan Mill di peta beserta arah dan besar aliran TBS di antara mereka.
---

## Sebelum mulai

Peta ini masih **prototipe**, dengan data yang sama seperti Dashboard Rantai Pasok (pengakuan survei 2025). Garisnya **garis lurus**, bukan rute angkut sebenarnya.

## Langkah

1. Buka **Map → Peta Rantai Pasok**. Panel kiri berisi tiga tab: **Filter**, **Legenda**, dan **Ringkasan**. Tombol di pojok panel melipatnya agar peta lebih luas.
2. Pilih tampilan **Ringkas** (garis langsung Lembaga → Mill) atau **Detail** (singgah di agen/RAMP yang punya koordinat, plus titik lahan Siak).
3. Atur filter di tab **Filter**. Isinya sama dengan dashboard dan saling terbawa: tombol **Dashboard** di panel membawa filter yang sama. Peta otomatis menyesuaikan ke data setiap filter berubah.
4. Baca peta. Warna garis menunjukkan jalur pertama TBS (lihat tab **Legenda**), tebal garis sebanding dengan tonase, dan panah putih menunjukkan arah. Ikon pabrik **biru** adalah Mill pemasok UL; ikon **abu gelap** adalah Mill lain. Ukurannya sebanding dengan tonase.
5. **Klik** sebuah Lembaga, agen/RAMP, atau Mill untuk menyorot jaringannya; yang lain diredupkan. Popup menampilkan tonase dan Mill atau Lembaga teratas. Klik area kosong, atau tombol di atas peta, untuk kembali.
6. Buka tab **Ringkasan** untuk melihat tonase yang **tidak tergambar**: Mill tidak diketahui, Mill tanpa koordinat, dan (di mode Detail) tonase yang lewat agen/RAMP tanpa titik.

## Kalau bermasalah

**Garis langsung ke Mill padahal lewat agen.** Sebagian besar agen dan RAMP belum punya koordinat di survei, jadi garisnya dilompatkan ke titik berikutnya. Jumlahnya terlihat di tab Ringkasan.

**Titik lahan bertepi gelap.** Lahan itu tidak cocok dengan poligon di MIS, jadi titiknya memakai koordinat dari form survei.
