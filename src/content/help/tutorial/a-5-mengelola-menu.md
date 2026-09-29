---
title: Mengelola menu navigasi
icon: Wrench
menuKey: settings-menu
permission: EDIT
duration: 5
href: /admin/settings/menu
hrefLabel: Buka Menu Management
goal: Ikon, induk, dan tampil/tidaknya tiap menu di sidebar tertata sesuai kebutuhan — tanpa mengubah hak akses siapa pun.
---

## Sebelum mulai

Halaman ini mengubah **struktur** sidebar untuk semua pengguna: ikon, induk, dan tampil/tidaknya tiap menu — sampai tiga tingkat. **Judul** dan **urutan** menu tidak diubah di sini.

+ Siapa yang boleh membuka tiap menu diatur terpisah di **Role & Permission**, bukan di sini. Halaman ini jarang perlu disentuh dan biasanya hanya dipegang SUPERADMIN.

## Langkah

1. Buka menu **Settings → Menu Management**.
2. Temukan menunya lewat kotak **Cari menu...** atau klik **Buka semua**.
3. Klik **Edit** pada barisnya, ubah yang diperlukan, lalu **Simpan**.
+ **Icon** = ikonnya; **Parent** memindahkan menu ke induk lain. **Key**, **Title** (judul di sidebar), dan **Order** (urutan antar menu se-induk) terkunci saat Edit — judul dan urutan hanya diubah developer lewat berkas menu di repositori, supaya sidebar produksi selalu sama dengan yang terdokumentasi. Mintalah perubahan judul/urutan ke tim developer.
4. Menyembunyikan menu yang tidak dipakai: matikan saklar **Visible** lewat Edit, atau klik ikon **Nonaktifkan** di kolom Aksi.
+ **Visible** mati = menu disembunyikan dari sidebar tetapi tetap aktif. **Nonaktifkan** = soft delete: menu hilang dari navigasi semua pengguna, barisnya tetap di daftar ini dengan badge **Nonaktif**.
5. Menghidupkan lagi: buka **Edit** pada baris ber-badge **Nonaktif**, nyalakan saklar **Aktif** dan **Visible**, lalu **Simpan**.
+ Menonaktifkan menu ikut mematikan saklar Visible-nya, jadi keduanya perlu dinyalakan kembali.

> [!hati-hati] **Key** adalah pengenal teknis yang dirujuk pemeriksaan izin di seluruh sistem — karena itu terkunci saat Edit. **Tambah Menu** hanya berguna bila developer memang sudah menyiapkan halamannya: Key dan URL harus persis yang dikenal aplikasi. Menonaktifkan menu induk ikut menyembunyikan seluruh sub-menunya.

## Kalau bermasalah

**Menu hilang untuk semua orang** — periksa barisnya di halaman ini: badge **Nonaktif**, atau saklar **Visible** yang mati. Buka **Edit** lalu nyalakan **Aktif** dan **Visible**.

**Menu tidak muncul untuk peran tertentu saja** — itu urusan izin, bukan struktur. Beri izin **V** (View) untuk peran itu di **Role & Permission**.

**Title atau Order tidak bisa diketik** — memang terkunci saat Edit. Perubahan judul/urutan diajukan ke tim developer dan berlaku setelah rilis berikutnya.

**Urutan tampak aneh setelah memindah Parent** — **Order** hanya dibandingkan antar menu dengan **Parent** yang sama, jadi menu yang dipindah membawa angka Order lamanya ke induk baru.
