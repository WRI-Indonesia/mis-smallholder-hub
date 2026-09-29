---
title: Mengelola menu navigasi
icon: Wrench
menuKey: settings-menu
permission: EDIT
duration: 3
href: /admin/settings/menu
hrefLabel: Buka Menu Management
goal: Menu yang tidak dipakai tersembunyi dari sidebar, dan menu yang dibutuhkan tampil kembali — tanpa mengubah hak akses siapa pun.
---

## Sebelum mulai

Halaman ini menampilkan seluruh menu sidebar (sampai tiga tingkat) dan mengatur **tampil/tidaknya** tiap menu untuk semua pengguna.

+ **Judul, urutan, induk, URL, dan ikon** menu tidak diubah di sini, dan menu baru tidak ditambahkan di sini — semuanya diatur developer lewat berkas menu di repositori dan berlaku setelah rilis, supaya sidebar produksi selalu sama dengan yang terdokumentasi. Mintalah perubahan seperti itu ke tim developer.
+ Siapa yang boleh membuka tiap menu diatur terpisah di **Role & Permission**, bukan di sini. Halaman ini jarang perlu disentuh dan biasanya hanya dipegang SUPERADMIN.

## Langkah

1. Buka menu **Settings → Menu Management**.
2. Temukan menunya lewat kotak **Cari menu...** atau klik **Buka semua**.
3. Menyembunyikan menu yang tidak dipakai: klik **Edit** pada barisnya, matikan saklar **Visible**, lalu **Simpan** — atau klik ikon **Nonaktifkan** di kolom Aksi.
+ **Visible** mati = menu disembunyikan dari sidebar tetapi tetap aktif. **Nonaktifkan** = soft delete: menu hilang dari navigasi semua pengguna, barisnya tetap di daftar ini dengan badge **Nonaktif**. Dialog Edit juga menampilkan judul, URL, induk, urutan, dan ikon menu itu sebagai keterangan (tidak bisa diubah).
4. Menghidupkan lagi: buka **Edit** pada baris ber-badge **Nonaktif**, nyalakan saklar **Aktif** dan **Visible**, lalu **Simpan**.
+ Menonaktifkan menu ikut mematikan saklar Visible-nya, jadi keduanya perlu dinyalakan kembali.

> [!hati-hati] Menonaktifkan atau menyembunyikan menu **induk** ikut menyembunyikan seluruh sub-menunya.

## Kalau bermasalah

**Menu hilang untuk semua orang** — periksa barisnya di halaman ini: badge **Nonaktif**, atau saklar **Visible** yang mati. Buka **Edit** lalu nyalakan **Aktif** dan **Visible**.

**Menu tidak muncul untuk peran tertentu saja** — itu urusan izin, bukan struktur. Beri izin **V** (View) untuk peran itu di **Role & Permission**.

**Judul, urutan, atau ikon perlu diganti, atau butuh menu baru** — tidak bisa dari halaman ini. Ajukan ke tim developer; perubahannya berlaku setelah rilis berikutnya.
