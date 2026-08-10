---
title: Mengatur izin peran per menu
icon: Shield
menuKey: settings-roles
permission: EDIT
duration: 5
href: /admin/settings/roles
hrefLabel: Buka Role & Permission
goal: Setiap peran hanya bisa membuka menu yang memang menjadi tugasnya — berlaku serentak untuk semua pengguna dengan peran itu.
---

## Sebelum mulai

Halaman ini menyetel izin bawaan tiap peran (ADMIN, OPERATOR, MANAGEMENT, DONOR) atas setiap menu — empat izin per menu: **C** (Create, menambah), **V** (View, melihat), **E** (Edit, mengubah), **D** (Delete, menonaktifkan).

+ Perubahan di sini berlaku untuk **semua pengguna** dengan peran tersebut. Pengecualian untuk satu orang saja diatur lewat dialog **Hak Akses Menu** di User Management — pengaturan per pengguna itu menimpa aturan peran (lihat tutorial *Menambah pengguna & mengatur haknya*). SUPERADMIN tidak ikut diatur di sini karena selalu berakses penuh.

## Langkah

1. Buka menu **Settings → Role & Permission**.
2. Pilih peran yang ingin ditampilkan lewat deretan tombol peran di atas matriks.
+ Secara bawaan semua peran tampil; klik nama peran untuk menyembunyikan atau menampilkan kolomnya, dan **Semua** untuk menampilkan lagi seluruhnya. Ini hanya menyaring tampilan — belum mengubah izin apa pun.
3. Temukan menunya lewat kotak **Cari menu...**, atau klik **Buka semua** untuk membentangkan seluruh kelompok menu.
+ Pencarian mencocokkan judul dan key sampai sub-menu tingkat 3; induk dari hasil yang cocok ikut ditampilkan.
4. Klik kotak **C / V / E / D** pada perpotongan menu × peran untuk memberi atau mencabut satu izin.
+ Kotak penuh = diberikan, kotak kosong = tidak. Perubahan langsung tersimpan — tidak ada tombol Simpan. Bila gagal, kotak kembali seperti semula dan muncul pemberitahuan.
5. Untuk memberi atau mencabut **seluruh** izin satu menu sekaligus, klik ikon daftar-ceklis di baris menu itu.
+ Bila menu punya sub-menu, muncul pertanyaan **Terapkan ke sub-menu?** — pilih **Hanya menu ini** atau **Termasuk sub-menu**.

> [!penting] Tanpa izin **V** (View), menu tidak muncul sama sekali di sidebar pengguna — izin C, E, atau D tidak ada artinya tanpa V.

> [!hati-hati] Perubahan berlaku seketika untuk semua pemegang peran itu. Pastikan Anda berada di baris menu dan kolom peran yang tepat sebelum mengklik.

## Kalau bermasalah

**Muncul "Gagal menyimpan permission"** — perubahan dibatalkan otomatis dan kotak kembali ke kondisi semula; periksa koneksi lalu klik sekali lagi.

**Pengguna belum melihat perubahan** — minta ia memuat ulang halaman atau masuk ulang. Bila tetap berbeda, buka dialog **Hak Akses Menu** akun itu di User Management — override per pengguna menimpa aturan peran.

**SUPERADMIN tidak ada di matriks** — memang tidak ditampilkan; peran ini selalu berakses penuh dan tidak bisa diubah.
