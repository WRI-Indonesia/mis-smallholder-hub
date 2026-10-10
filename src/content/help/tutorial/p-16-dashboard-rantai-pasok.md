---
title: Membaca Dashboard Rantai Pasok (prototipe)
icon: BarChart3
menuKey: dashboard-supply-chain
permission: VIEW
duration: 8
href: /admin/dashboard/supply-chain
hrefLabel: Buka Dashboard Rantai Pasok
goal: Anda bisa melihat ke mana TBS petani dinyatakan dijual — lewat agen, RAMP, atau KT/koperasi — sampai ke Mill mana, berapa porsinya yang ke Mill pemasok UL, Lembaga mana yang datanya lemah atau bergantung pada satu offtaker, dan seberapa jauh Mill-nya.
---

## Sebelum mulai

Dashboard ini masih **prototipe** untuk bahan diskusi. Datanya berasal dari **form survei rantai pasok 2025**, yaitu **pengakuan** petani dan dealer, bukan bukti transaksi (DO atau tiket timbang).

+ Siak memakai form **per lahan**. Rokan Hulu dan Kampar memakai form **per dealer**; hanya form per dealer yang mencatat rantai **Agen → RAMP**. Nama Mill di survei yang hanya berupa nama PT sudah dipetakan ke PKS di Universal Mill List.

## Langkah

1. Buka **Dashboard → Dashboard Rantai Pasok**.
2. Atur filter di kotak atas. Baris **Lingkup**: Distrik, Kategori (Swadaya / Ex-Plasma), dan UL & Non-UL. Baris **Rantai**: Lembaga → Agen → RAMP → Mill, mengikuti arah aliran TBS. Filter yang aktif diberi bingkai berwarna dan muncul sebagai **chip** tepat di bawah kotak filter; hapus satu per satu (✕) atau sekaligus (**Hapus semua**).
+ Pilihan tiap dropdown menyesuaikan filter lain. Setelah satu Lembaga dipilih, misalnya, daftar Agen, RAMP, dan Mill hanya berisi yang terhubung dengannya. Filter tersimpan di alamat halaman, jadi tampilan bisa di-bookmark atau dikirim ke rekan. Semua kartu, diagram, dan tabel di halaman ini mengikuti filter yang sama.
3. Baca empat kartu ringkasan: **TBS**, **Ke Mill Pemasok UL**, **Sampai PKS Pasti** (berapa yang PKS-nya jelas), dan **Offtaker** (jumlah agen, RAMP, dan KT/koperasi).
4. Baca kartu **Sorotan**: empat temuan otomatis dari filter aktif.
   - **Konsentrasi ke Mill**: porsi TBS yang masuk ke Mill terbesar, dan porsi tiga Mill terbesar. TBS ke Mill tidak diketahui tidak ikut diperingkat; porsinya ada di ubin Mill belum pasti.
   - **Ketergantungan offtaker**: Lembaga yang **≥ 80%** tonasenya lewat satu pembeli **luar**. Koperasi Lembaga itu sendiri tidak dihitung sebagai pembeli luar; bila koperasi itu menjual ke satu pembeli (mis. satu RAMP), pembeli itulah yang dihitung.
   - **Mill belum pasti**: porsi TBS tanpa PKS pasti, dan Lembaga yang ≥ 50% tonasenya tak pasti.
   - **Jarak garis lurus**: rata-rata jarak Lembaga → offtaker → Mill (tertimbang tonase) dan Mill terjauh.
+ Klik nama Mill atau Lembaga di Sorotan untuk menjadikannya filter. Tautan **+N lagi** membuka tabel **Volume per Lembaga** (juga bila kartunya sedang terlipat) dengan semua baris tampil, diurut menurut temuan itu. Jarak dihitung dari koordinat Lembaga, offtaker, dan Mill sebagai **garis lurus**, bukan jarak tempuh jalan; Lembaga atau Mill tanpa koordinat tidak ikut dihitung.
5. Baca kartu **Jalur TBS & Kepastian Mill**: dua batang 100%. Batang **Jalur** = porsi lewat Agen, langsung ke RAMP, lewat KT/Koperasi, dan langsung ke Mill; warnanya dipakai juga di diagram dan peta. Batang **Kepastian Mill** = PKS disebut di survei, dipetakan dari nama PT, belum pasti, dan tidak diketahui. Klik segmen **Mill tidak diketahui** untuk memfilternya.
+ Setiap kartu (Sorotan, Jalur TBS, Aliran TBS, Volume per Mill, Volume per Lembaga) bisa dilipat dengan mengeklik judulnya. Posisi lipat dan tab terakhir diingat di browser Anda.
6. Di kartu **Aliran TBS** (Lembaga → Offtaker → Mill), pilih tab yang paling mudah Anda baca. Keempatnya memakai data dan angka yang sama:
   - **Sankey**: pita setebal tonase. Arahkan kursor ke Lembaga atau Mill untuk menyalakan seluruh jalurnya.
   - **Diagram Alur**: kotak per Lembaga, offtaker, dan Mill yang dihubungkan garis beranimasi; tebal garis sebanding tonase. **Klik kotak** untuk menyorot jalurnya. Angka di garis yang menyala = tonase yang lewat kotak itu. Tombol **Jadikan filter** ada di panel kanan bawah.
   - **Jalur**: satu baris per jalur utuh (Lembaga → offtaker → Mill), bawaannya urut dari tonase terbesar. Tidak ada garis yang bersilangan. Klik judul kolom (Lembaga, Offtaker, Mill, Tonase) untuk mengurutkan; kolom **#** tetap menunjukkan peringkat tonase.
   - **Tabel Pohon**: angka bertingkat yang bisa dibuka-tutup. Pilih **Arah** di toolbar: **Hulu → Hilir** (Lembaga › Offtaker › Mill) atau **Hilir → Hulu** (Mill › Offtaker › Lembaga). Kolom **% induk** = porsi terhadap baris di atasnya.
+ Agen, RAMP, dan KT/koperasi berada di satu bagian **Offtaker**; TBS yang lewat agen lalu RAMP tampil sebagai satu node rantai "Agen → RAMP". Di Tabel Pohon, ikon corong di ujung baris (muncul saat kursor di atas baris) menjadikan baris itu filter.
7. Atur pengelompokan lewat toolbar di bawah tab. Bawaannya paling ringkas: Distrik → per jenis offtaker → UL / Non-UL, dalam ton; di tiap toggle pilihan bawaan ada di kiri. Arahkan kursor ke tiap tombol untuk melihat penjelasannya:
   - **Dari**: digabung per **Distrik** (bawaan) atau per Lembaga.
   - **Ke**: digabung jadi **UL / Non-UL** (bawaan; Ke Mill UL dan Bukan ke Mill UL) atau per Mill.
   - **Offtaker**: **Per jenis** (Agen, RAMP, KT/Koperasi, Agen → RAMP) atau **Satu per satu**. Pada pilihan Satu per satu, atur juga berapa node teratas per kolom yang tampil.
   - **Angka**: Ton atau %. Persen dihitung dari total pada filter aktif.
+ Kalimat **Menampilkan …** di bawah toolbar merangkum pilihan Anda dalam bahasa biasa. Tombol **Tampilan bawaan** muncul di ujung kanan toolbar bila ada pilihan yang diubah, dan mengembalikan semuanya. Klik node atau baris di tab mana pun untuk menjadikannya filter — muncul pemberitahuan singkat, dan chip filternya ada di bawah kotak filter. Klik node gabungan (Agen, RAMP, Agen → RAMP, Distrik, Ke Mill UL) untuk langsung turun ke rinciannya. Klik satu agen atau RAMP memfilter **semua** aliran lewat offtaker itu, termasuk rantainya, jadi angkanya bisa lebih besar dari node yang diklik.
8. Gunakan tabel **Volume per Mill** untuk angka pastinya. Batang hijau adalah porsi ke UL; kolom **Jarak** = rata-rata garis lurus ke Mill itu. Klik judul kolom untuk mengurutkan. Klik sebuah baris untuk memfilter Mill itu; baris Mill yang sedang difilter diberi latar berwarna. Ikon peta di ujung baris (muncul saat kursor di atas baris) membuka Mill itu di Peta Rantai Pasok; baris **Mill tidak diketahui** tidak punya ikon peta karena tak pernah tergambar di peta.
9. Gunakan tabel **Volume per Lembaga** untuk melihat dari sisi hulu: tonase, porsi **ke UL**, porsi **PKS pasti** (kuning bila 50% atau kurang — Lembaga yang sama dengan daftar "tak pasti" di Sorotan), **Offtaker utama** beserta porsinya (ikon peringatan bila ≥ 80% lewat satu pembeli luar — sama dengan Sorotan; kolom ini diurut menurut porsi pembeli luar, jadi Lembaga yang hanya menjual lewat koperasinya sendiri ke Mill ada di paling bawah), **Mill utama**, dan **Jarak** rata-rata. Klik judul kolom untuk mengurutkan, klik baris untuk memfilter Lembaga itu, ikon peta untuk membukanya di peta.
10. Tekan **Unduh Excel** (bila tombolnya tampil untuk peran Anda) untuk mengunduh satu berkas tiga sheet — **Jalur** (Lembaga × offtaker × Mill), **Mill**, dan **Lembaga** — mengikuti filter aktif. Nama berkas memuat tahun survei dan filter yang dipakai.
11. Tekan **Lihat di Peta** untuk membuka Peta Rantai Pasok dengan filter yang sama.
12. Baris **Catatan data** di paling bawah merangkum baris tanpa tonase, tonase ke Mill tak diketahui, dan asumsi pengolahan; klik untuk membuka rinciannya.

> [!hati-hati] Angka di sini adalah pengakuan survei. Jangan dipakai sebagai bukti ketelusuran (traceability) tingkat transaksi. Jarak adalah garis lurus, bukan jarak angkut.

## Kalau bermasalah

**Tertulis "Data prototipe rantai pasok belum tersedia".** Tabel survei belum diunggah ke server ini. Hubungi admin aplikasi.

**Diagram kosong setelah memilih filter.** Kombinasi filter tidak punya aliran bertonase, misalnya agen yang tidak memasok Mill terpilih. Hapus chip filter (✕) di bawah kotak filter. Bila ada beberapa chip, **Hapus semua** melepas semuanya sekaligus.

**Sankey sulit dibaca karena pitanya saling menimpa.** Pakai tab **Jalur** atau **Tabel Pohon**: angkanya sama, tanpa garis yang bersilangan.

**Kartu tidak tampil.** Kartunya terlipat. Klik judul kartu untuk membukanya.

**Kolom Jarak berisi "—".** Lembaga atau Mill itu tidak punya koordinat di tabel survei (misalnya Mill yang tidak ada di Universal Mill List), atau Mill-nya tidak diketahui. Kartu Sorotan menyebut berapa persen TBS yang jaraknya bisa dihitung.

**Tombol Unduh Excel tidak ada.** Peran Anda tidak punya izin EXPORT untuk menu ini. Hubungi admin aplikasi.

**Angka "Ke Mill UL" di kartu sedikit berbeda dari node di diagram.** Kartu memakai kolom tonase ke UL di form, sedangkan diagram mengelompokkan seluruh baris yang ditandai "Supply to UL = Yes". Sebagian baris hanya mengirim sebagian tonasenya ke UL.
