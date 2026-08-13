---
title: Membaca Peta Data & Skema
icon: Database
menuKey: data-analyst-data-map
permission: VIEW
duration: 6
href: /admin/data-analyst/data-map
hrefLabel: Buka Peta Data & Skema
goal: Mengetahui data apa saja yang sebenarnya ada di sistem, kolom mana yang tidak pernah terisi, dan menu mana yang mengambil data dari entitas apa — bahan untuk merencanakan modul data berikutnya.
---

## Sebelum mulai

Halaman ini menjelaskan **bentuk datanya**, bukan isi datanya. Ia tidak menampilkan nama petani atau angka produksi, melainkan: entitas apa yang ada, kolom apa saja di dalamnya, bagaimana antar-entitas terhubung, dan seberapa banyak kolom itu benar-benar diisi.
+ Semua angkanya diturunkan otomatis — struktur dari berkas skema database, jalur data dari kode aplikasi, keterisian dari hitungan langsung ke database. Tidak ada daftar yang diketik manual, jadi tidak ada yang bisa basi tanpa ketahuan.

Angka di halaman ini bersifat **nasional**, tidak disaring per wilayah atau per Lembaga — jadi apa yang Anda lihat bukan hanya wilayah kerja Anda. Untuk kelengkapan data per Lembaga, pakai **Analisa Ketersediaan Data**.

## Langkah

1. Buka menu **Data Analyst → Peta Data & Skema**.
2. Tab **ERD** memperlihatkan seluruh entitas beserta hubungannya. Kolom-kolomnya dikelompokkan per domain — petani, wilayah, pelatihan, hak akses, dan seterusnya.
+ Klik satu entitas untuk menyorot tetangganya; sisanya diredupkan supaya jalur hubungannya terlihat. Klik lagi entitas yang sama, atau klik area kosong, untuk melepas sorotan. Gunakan roda mouse untuk memperbesar dan geser dengan menyeret latar.
3. Baca label pada garis penghubung: **1:n** berarti satu induk punya banyak anak (satu Lembaga punya banyak petani), **1:1** satu lawan satu, **n:n** banyak lawan banyak. Arah panah selalu dari induk ke anak.
4. Pindah ke tab **Keterisian** untuk melihat seberapa terisi tiap entitas. Tiga kartu di atas meringkas: total baris, entitas yang tabelnya ada tapi masih kosong, dan kolom yang tidak pernah terisi sama sekali.
+ Kotak kuning "Kolom yang ada di skema tapi tidak pernah diisi" adalah daftar kerja paling langsung: entah kolom itu memang belum dipakai, entah alur pengisiannya terlewat. Keduanya perlu keputusan.
5. Klik nama entitas untuk membuka rincian kolomnya: persen terisi, batang, dan jumlah `terisi / total`. Kolom bertanda **wajib** selalu 100% karena database menolak nilai kosong — yang menarik justru kolom opsional dengan persen rendah.
+ Yang dihitung adalah nilai kosong (NULL), bukan isi yang tidak bermakna. Kolom berisi tanda `-` atau spasi tetap terhitung terisi. Untuk menilai *kualitas* isian per Lembaga, gunakan Analisa Ketersediaan Data.
6. Di bagian bawah tab itu ada blok **Belum ada di sistem** — modul data yang sudah direncanakan tapi belum punya tabel, diambil dari roadmap. Inilah jawaban "butuh tambah apa".
7. Tab **Jalur data** menjawab arah sebaliknya: menu mana mengambil data dari entitas apa. Baca per baris untuk satu menu, atau per kolom untuk melihat siapa saja yang menyentuh satu entitas.
+ **R** berarti hanya membaca, **W** menulis, **RW** keduanya. Centang "hanya menu yang menulis" untuk mempersempit ke menu yang bisa mengubah data — berguna saat menelusuri dari mana suatu perubahan data bisa berasal.
8. Perhatikan huruf **miring** di matriks: itu menandai menu yang mengakses entitas secara dinamis, sehingga penelusuran otomatis tidak bisa memastikan entitas mana persisnya. Nilainya dinyatakan oleh pengembang, bukan ditemukan mesin.

> [!tip] Untuk merencanakan modul data baru, urutan membacanya: tab Keterisian dulu (apa yang sudah ada dan seberapa dipakai), lalu blok "Belum ada di sistem" (apa yang direncanakan), baru tab ERD untuk melihat entitas baru itu nanti menempel ke mana.

## Kalau bermasalah

**Entitas tercatat 0 baris padahal datanya ada** — kemungkinan seluruh barisnya nonaktif (terhapus lunak). Halaman ini hanya menghitung baris aktif, sama seperti seluruh aplikasi.

**Ada kolom baru di database tapi belum muncul di halaman** — struktur dibaca saat aplikasi dibangun, jadi kolom baru muncul setelah rilis berikutnya. Ini disengaja: perubahan skema memang menyertai rilis.

**Menu di matriks Jalur data tidak muncul** — halaman pengantar seperti `/admin` atau `/admin/dashboard` memang tidak tercantum, karena tidak mengambil data apa pun. Jumlahnya disebutkan di catatan bawah matriks.

**Kanvas ERD kosong atau tidak bergerak** — perbesar jendela browser lalu buka ulang tab ERD; kanvas mengukur ruang saat pertama kali dirender.
