---
title: Mengisi target kontrak program
icon: Target
menuKey: master-data-program-target
permission: EDIT
duration: 4
href: /admin/master-data/program-target
hrefLabel: Buka halaman Target Program
goal: Angka kontrak / trayektori pelatihan tercatat di aplikasi, sehingga Dashboard Pelatihan bisa langsung membandingkan target dengan realisasi.
---

## Sebelum mulai

Halaman ini menyimpan angka **kontrak** program — bukan data petani. Angkanya berlaku untuk seluruh program (semua distrik dan Lembaga), dan dipakai tampilan **vs Kontrak** di kartu *Training Benefit per year* (Dashboard Pelatihan).

+ Hanya SUPERADMIN dan ADMIN yang bisa mengubah angka. Peran lain yang membuka halaman ini hanya bisa melihat.

## Langkah

1. Buka menu **Master Data → Target Program**.
2. Isi kolom **Start of the Program** untuk tiap baris paket, lalu pilih tahunnya di header kolom (mis. `s.d. 2025`).
+ Ada lima baris — sama dengan baris kartu *Training Benefit per year*: P1, P2 Group Dynamic, P2 HSE, P3, dan **Petani pernah mengikuti pelatihan (minimal 1)**. Isi target tiap paket terpisah. Baris terakhir adalah target total program (petani yang ikut pelatihan apa pun, dihitung sekali) — isi sendiri, jangan menjumlahkan baris paket, karena satu petani bisa ikut beberapa paket.
+ Start of the Program = jumlah petani yang sudah dilatih **sampai akhir** tahun itu. Di dashboard, angka ini dibandingkan dengan kumulatif penerima manfaat s.d. tahun yang sama.
3. Isi target per tahun (mis. 2026, 2027, 2028). Klik **Tambah tahun** untuk menambah kolom, atau tanda **×** di header tahun untuk menghapus kolom.
+ Target tahunan = jumlah petani **baru** yang ditargetkan dilatih pada tahun itu.
+ Kolom **Total** (Start + semua tahun) dihitung otomatis — tidak perlu diisi.
4. Klik **Simpan target**.
+ Mengosongkan sel lalu menyimpan berarti target sel itu dihapus. Waktu dan nama pengubah terakhir tercatat di bawah tabel.
5. Buka **Dashboard → Dashboard Pelatihan**, kartu *Training Benefit per year*, lalu pilih **vs Kontrak A** atau **B** untuk melihat target, realisasi, dan % capaiannya.
+ Tiap baris dibandingkan dengan penerima manfaat baru paketnya; baris "pernah mengikuti" dengan petani yang pertama kali ikut pelatihan apa pun. Paket yang targetnya belum diisi tetap tampil dengan tulisan "target belum diisi". Bila filter Distrik/Lembaga aktif, realisasi hanya untuk wilayah itu sedangkan target tetap seluruh program — muncul catatan agar % tidak disalahbaca.

## Kalau bermasalah

**Tombol Simpan tidak aktif** — ada sel berisi bukan angka (berbingkai merah). Isi dengan bilangan bulat tanpa koma, atau kosongkan.

**Muncul "Tahun Start of the Program harus sama untuk semua baris"** — kedua baris kontrak memakai satu tahun Start yang sama; pilih satu tahun di header kolom Start.

**Kolom isian tidak muncul, hanya angka** — akun Anda tidak punya izin mengubah. Minta SUPERADMIN atau ADMIN.
