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

Halaman ini menyetel izin bawaan tiap peran (ADMIN, OPERATOR, MANAGEMENT, DONOR) atas setiap menu — enam izin per menu dalam dua kelompok. Kelompok data: **Create** (menambah), **View** (melihat), **Edit** (mengubah), **Delete** (menonaktifkan); kelompok keluaran: **Export** (mengunduh Excel/data mentah) dan **Print** (mencetak/unduh PDF). Arahkan kursor ke ikon di kepala kolom untuk melihat nama izinnya.

+ Perubahan di sini berlaku untuk **semua pengguna** dengan peran tersebut. Pengecualian untuk satu orang saja diatur lewat dialog **Hak Akses Menu** di User Management — pengaturan per pengguna itu menimpa aturan peran (lihat tutorial *Menambah pengguna & mengatur haknya*). SUPERADMIN tidak ikut diatur di sini karena selalu berakses penuh.

## Langkah

1. Buka menu **Settings → Role & Permission**.
2. Pilih peran yang ingin ditampilkan lewat deretan tombol peran di atas matriks.
+ Secara bawaan semua peran tampil; klik nama peran untuk menyembunyikan atau menampilkan kolomnya, dan **Semua** untuk menampilkan lagi seluruhnya. Ini hanya menyaring tampilan — belum mengubah izin apa pun.
3. Temukan menunya lewat kotak **Cari menu...**, atau klik **Buka semua** untuk membentangkan seluruh kelompok menu.
+ Pencarian mencocokkan judul dan key sampai sub-menu tingkat 3; induk dari hasil yang cocok ikut ditampilkan.
4. Klik kotak pada perpotongan menu × peran untuk memberi atau mencabut satu izin.
+ Kotak penuh = diberikan, kotak kosong = tidak. Saat kursor di atas sebuah kotak, baris dan kolomnya ikut tersorot agar tidak salah sel. Perubahan langsung tersimpan — tidak ada tombol Simpan. Bila gagal, kotak kembali seperti semula dan muncul pemberitahuan.
5. Untuk menyetel satu menu sekaligus, klik ikon daftar-ceklis di baris menu itu lalu pilih preset: **Lihat saja** (hanya View), **Lihat + Unduh** (View + Export + Print), **Akses penuh**, atau **Kosongkan**.
+ Bila menu punya sub-menu, muncul pertanyaan **Terapkan ke sub-menu?** — pilih **Hanya menu ini** atau **Termasuk sub-menu**.
6. Untuk menyetel satu izin pada **semua menu** sekaligus (misal mencabut Export dari seluruh menu peran DONOR), klik ikon izin itu di kepala kolom lalu konfirmasi **Terapkan**.

> [!penting] Tanpa izin **View**, menu tidak muncul sama sekali di sidebar pengguna — izin lain tidak ada artinya tanpa View. Izin **Export**/**Print** menentukan tampil-tidaknya tombol unduh Excel dan cetak PDF di halaman tersebut.

> [!hati-hati] Perubahan berlaku seketika untuk semua pemegang peran itu. Pastikan Anda berada di baris menu dan kolom peran yang tepat sebelum mengklik.

## Kalau bermasalah

**Muncul "Gagal menyimpan permission"** — perubahan dibatalkan otomatis dan kotak kembali ke kondisi semula; periksa koneksi lalu klik sekali lagi.

**Pengguna belum melihat perubahan** — minta ia memuat ulang halaman atau masuk ulang. Bila tetap berbeda, buka dialog **Hak Akses Menu** akun itu di User Management — override per pengguna menimpa aturan peran.

**SUPERADMIN tidak ada di matriks** — memang tidak ditampilkan; peran ini selalu berakses penuh dan tidak bisa diubah.
