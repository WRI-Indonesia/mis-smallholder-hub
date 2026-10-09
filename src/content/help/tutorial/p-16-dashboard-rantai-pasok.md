---
title: Membaca Dashboard Rantai Pasok (prototipe)
icon: BarChart3
menuKey: dashboard-supply-chain
permission: VIEW
duration: 7
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
3. Baca empat kartu ringkasan: **TBS**, **Ke Mill Pemasok UL**, **Sampai PKS Pasti** (berapa yang PKS-nya jelas), dan **Offtaker** (jumlah agen, RAMP, dan KT/koperasi).
4. Baca batang **Jalur TBS dari petani**: porsi lewat Agen, langsung ke RAMP, lewat KT/Koperasi, dan langsung ke Mill. Warnanya dipakai juga di diagram dan peta.
+ Setiap kartu (Jalur TBS, Aliran TBS, Volume per Mill) bisa dilipat dengan mengeklik judulnya. Posisi lipat dan tab terakhir diingat di browser Anda.
5. Di kartu **Aliran TBS** (Lembaga → Offtaker → Mill), pilih tab yang paling mudah Anda baca. Keempatnya memakai data dan angka yang sama:
   - **Sankey**: pita setebal tonase. Arahkan kursor ke Lembaga atau Mill untuk menyalakan seluruh jalurnya.
   - **Diagram Alur**: kotak per Lembaga, offtaker, dan Mill yang dihubungkan garis beranimasi; tebal garis sebanding tonase. **Klik kotak** untuk menyorot jalurnya. Angka di garis yang menyala = tonase yang lewat kotak itu. Tombol **Jadikan filter** ada di panel kanan bawah.
   - **Jalur**: satu baris per jalur utuh (Lembaga → offtaker → Mill), bawaannya urut dari tonase terbesar. Tidak ada garis yang bersilangan. Klik judul kolom (Lembaga, Offtaker, Mill, Tonase) untuk mengurutkan; kolom **#** tetap menunjukkan peringkat tonase.
   - **Tabel Pohon**: angka bertingkat yang bisa dibuka-tutup. Pilih **Arah**: **Hulu → Hilir** (Lembaga › Offtaker › Mill) atau **Hilir → Hulu** (Mill › Offtaker › Lembaga). Kolom **% induk** = porsi terhadap baris di atasnya.
+ Agen, RAMP, dan KT/koperasi berada di satu bagian **Offtaker**; TBS yang lewat agen lalu RAMP tampil sebagai satu node rantai "Agen → RAMP". Di Tabel Pohon, ikon corong di ujung baris (muncul saat kursor di atas baris) menjadikan baris itu filter.
6. Atur tampilan dengan toolbar di bawah tab. Arahkan kursor ke tombol untuk melihat penjelasannya:
   - **Dari**: per Lembaga, atau digabung per **Distrik** (kabupaten).
   - **Ke**: per Mill, atau digabung jadi **UL / Non-UL** (Ke Mill UL dan Bukan ke Mill UL).
   - **Offtaker**: **Per jenis** (Agen, RAMP, KT/Koperasi, Agen → RAMP) atau **Satu per satu**. Pada pilihan Satu per satu, atur juga berapa node teratas per kolom yang tampil.
   - **Angka**: Ton atau %. Persen dihitung dari total pada filter aktif.
+ Kalimat **Menampilkan …** di bawah toolbar merangkum pilihan Anda dalam bahasa biasa. Klik node atau baris untuk menjadikannya filter; filter yang aktif muncul sebagai **chip** yang bisa dihapus satu per satu (✕) atau sekaligus (**Hapus semua**). Klik node gabungan (Agen, RAMP, Agen → RAMP, Distrik, Ke Mill UL) untuk langsung turun ke rinciannya. Klik satu agen atau RAMP memfilter **semua** aliran lewat offtaker itu, termasuk rantainya, jadi angkanya bisa lebih besar dari node yang diklik. Tombol **Tampilan bawaan** mengembalikan pilihan toolbar.
7. Gunakan tabel **Volume per Mill** untuk angka pastinya. Batang hijau adalah porsi ke UL. Klik sebuah baris untuk memfilter Mill itu.
8. Tekan **Lihat di Peta** untuk membuka Peta Rantai Pasok dengan filter yang sama.

> [!hati-hati] Angka di sini adalah pengakuan survei. Jangan dipakai sebagai bukti ketelusuran (traceability) tingkat transaksi.

## Kalau bermasalah

**Tertulis "Data prototipe rantai pasok belum tersedia".** Tabel survei belum diunggah ke server ini. Hubungi admin aplikasi.

**Diagram kosong setelah memilih filter.** Kombinasi filter tidak punya aliran bertonase, misalnya agen yang tidak memasok Mill terpilih. Hapus chip filter (✕) di kartu Aliran TBS. Bila ada beberapa chip, **Hapus semua** melepas semuanya sekaligus.

**Sankey sulit dibaca karena pitanya saling menimpa.** Pakai tab **Jalur** atau **Tabel Pohon**: angkanya sama, tanpa garis yang bersilangan.

**Kartu Aliran TBS tidak tampil.** Kartunya terlipat. Klik judul kartu untuk membukanya.

**Angka "Ke Mill UL" di kartu sedikit berbeda dari node di diagram.** Kartu memakai kolom tonase ke UL di form, sedangkan diagram mengelompokkan seluruh baris yang ditandai "Supply to UL = Yes". Sebagian baris hanya mengirim sebagian tonasenya ke UL.
