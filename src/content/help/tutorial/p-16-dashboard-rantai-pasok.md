---
title: Membaca Dashboard Rantai Pasok (prototipe)
icon: BarChart3
menuKey: dashboard-supply-chain
permission: VIEW
duration: 5
href: /admin/dashboard/supply-chain
hrefLabel: Buka Dashboard Rantai Pasok
goal: Anda bisa melihat ke mana TBS petani dinyatakan dijual — lewat agen, RAMP, atau KT/koperasi — sampai ke Mill mana, dan berapa porsinya yang ke Mill pemasok UL.
---

## Sebelum mulai

Dashboard ini masih **prototipe** untuk bahan diskusi. Datanya berasal dari **form survei rantai pasok 2025**, yaitu **pengakuan** petani dan dealer, bukan bukti transaksi (DO atau tiket timbang).

+ Siak memakai form **per lahan**. Rokan Hulu dan Kampar memakai form **per dealer**; hanya form per dealer yang mencatat rantai **Agen → RAMP**. Nama Mill di survei yang hanya berupa nama PT sudah dipetakan ke PKS di Universal Mill List.

## Langkah

1. Buka **Dashboard → Dashboard Rantai Pasok**.
2. Atur filter di kotak atas. Baris **Lingkup**: Distrik, Kategori (Swadaya / Ex-Plasma), dan UL & Non-UL. Baris **Rantai**: Lembaga → Agen → RAMP → Mill, mengikuti arah aliran TBS. Filter yang aktif diberi bingkai berwarna.
+ Pilihan tiap dropdown menyesuaikan filter lain. Setelah satu Lembaga dipilih, misalnya, daftar Agen, RAMP, dan Mill hanya berisi yang terhubung dengannya. Filter tersimpan di alamat halaman, jadi tampilan bisa di-bookmark atau dikirim ke rekan.
3. Baca empat kartu ringkasan: **TBS Dideklarasikan**, **Ke Mill Pemasok UL**, **Sampai PKS Pasti** (berapa yang PKS-nya jelas), dan **Offtaker** (jumlah agen, RAMP, dan KT/koperasi).
4. Baca batang **Jalur TBS dari petani**: porsi lewat Agen, langsung ke RAMP, lewat KT/Koperasi, dan langsung ke Mill. Warnanya dipakai juga di diagram dan peta.
5. Baca diagram **Aliran TBS**: Lembaga → Offtaker → Mill. Agen, RAMP, dan KT/koperasi berada di satu bagian **Offtaker**; TBS yang lewat agen lalu RAMP tampil sebagai satu node rantai "Agen → RAMP". Tebal pita sebanding dengan tonase. **Arahkan kursor** ke sebuah Lembaga atau Mill untuk menyalakan seluruh jalurnya, dari hulu sampai hilir. **Klik node** untuk menjadikannya filter.
6. Atur tampilan diagram dengan empat tombol di kanan atasnya:
   - **Lembaga | Distrik**: asal per Lembaga, atau digabung per kabupaten.
   - **Mill | UL / Non-UL**: tujuan per Mill, atau digabung jadi Ke Mill UL dan Bukan ke Mill UL.
   - **Ton | %**: satuan label. Persen dihitung dari total pada filter aktif.
   - **Ringkas | Detail**: offtaker digabung per tipe (Agen, RAMP, KT/Koperasi, Agen → RAMP), atau tampil satu per satu.
+ Klik node gabungan (Agen, RAMP, Agen → RAMP, Distrik, Ke Mill UL) untuk langsung turun ke rinciannya. Di mode Detail, klik node rantai Agen → RAMP untuk memfilter agen dan RAMP itu sekaligus. Tombol **Reset** di kartu diagram mengembalikan semua filter dan tombol tampilan ke bawaan.
7. Gunakan tabel **Volume per Mill** untuk angka pastinya. Batang hijau adalah porsi ke UL. Klik sebuah baris untuk memfilter Mill itu.
8. Tekan **Lihat di Peta** untuk membuka Peta Rantai Pasok dengan filter yang sama.

> [!hati-hati] Angka di sini adalah pengakuan survei. Jangan dipakai sebagai bukti ketelusuran (traceability) tingkat transaksi.

## Kalau bermasalah

**Tertulis "Data prototipe rantai pasok belum tersedia".** Tabel survei belum diunggah ke server ini. Hubungi admin aplikasi.

**Diagram kosong setelah memilih filter.** Kombinasi filter tidak punya aliran bertonase, misalnya agen yang tidak memasok Mill terpilih. Tekan **Reset** di kartu diagram.

**Angka "Ke Mill UL" di kartu sedikit berbeda dari node di diagram.** Kartu memakai kolom tonase ke UL di form, sedangkan diagram mengelompokkan seluruh baris yang ditandai "Supply to UL = Yes". Sebagian baris hanya mengirim sebagian tonasenya ke UL.
