---
title: Mengunggah titik patok dari GPS (Excel/CSV atau shapefile titik)
icon: Upload
menuKey: bulk-upload-parcels
permission: CREATE
duration: 8
href: /admin/bulk-upload/parcels
hrefLabel: Buka halaman Upload Lahan
goal: Koordinat patok hasil survei lapangan masuk ke lahan yang benar — nomor yang sudah ada diperbarui, sudut baru ditambahkan, patok di batas bersama tidak digandakan.
---

## Sebelum mulai

Ini untuk **titik patok**, bukan poligon lahan. Setiap baris/titik harus menunjuk **ID Lahan** yang sudah terdaftar; poligonnya diunggah lebih dulu lewat tab **Poligon (Shapefile ZIP)** karena jarak tiap titik ke batas lahan diperiksa.

Dua bentuk berkas diterima di tab yang sama:

- **Excel (.xlsx) / CSV** — kolom: `ID Lahan`*, `ID Petani` (hanya bila ID Lahan dipakai lebih dari satu petani), `No Patok`, `Lintang`*, `Bujur`*, `Kondisi`, `Jenis`, `Tanggal Pemasangan`, `Dipasang oleh`, `Keterangan`. Tombol **Unduh Template Excel** memberi contohnya.
- **ZIP shapefile titik (Point)** — koordinat diambil dari geometrinya (WGS84); atribut DBF seperti `parcel_id`, `no_patok`, `cond`, `type`, `installed` dikenali otomatis, sisanya bisa dipetakan manual. Kolom bernama `No`/`Nomor` sengaja **tidak** dianggap nomor patok (biasanya nomor baris) — petakan manual bila memang nomor patok.

+ Kondisi menerima *Ada / Hilang / Rusak / Belum dipasang* (juga ejaan lapangan seperti "tidak ada", "patah"); jenis menerima *Beton / Kayu / Pipa / Tanda alam / Lainnya* (juga "semen", "paralon", "pohon").
+ Tanggal boleh `yyyy-mm-dd` atau `dd/mm/yyyy`; tidak boleh di masa depan.

## Langkah

1. Buka menu **Bulk Upload → Lahan**, pilih tab **Patok (Excel/Shapefile titik)**, lalu pilih berkasnya.
+ Untuk shapefile, sistem memberi tahu bila ada fitur yang bukan titik (dilewati).
2. Periksa **Pemetaan kolom**. Kolom wajib (ID Lahan, Lintang, Bujur) harus terpetakan; kolom lain boleh dikosongkan.
3. Klik **Validasi**. Sistem mencocokkan ID Lahan dengan lahan aktif dalam akses Anda dan menampilkan pratinjau per baris.
+ **Perbarui patok #n** — nomor itu sudah ada di lahan; koordinat dan atributnya akan diperbarui (sumber koordinat menjadi *GPS lapangan*). Bila patok itu dipakai lahan tetangga, koordinat barunya berlaku juga di sana.
+ **Patok baru** — nomor belum ada (atau kosong → nomor berikutnya). Titik yang berjarak ≤ 5 m dari patok lahan tetangga akan **ditautkan** ke patok itu, bukan dibuat baru. Mengunggah berkas yang sama dua kali tanpa kolom No Patok aman: titik ≤ 5 m dari patok lahan itu sendiri dianggap patok yang sama dan hanya diperbarui.
+ Baris merah dilewati saat menyimpan: lahan tidak ditemukan / di luar akses, lahan belum punya poligon, lintang–bujur tertukar, nomor patok ganda dalam berkas, atau kondisi/jenis/tanggal tak dikenal.
4. Klik **Simpan N patok**. Ringkasan menampilkan jumlah patok baru, diperbarui, ditautkan ke patok tetangga, dan yang ditolak server beserta alasannya (mis. > 100 m dari batas lahan).

## Hasil

Patok tampil di **tab Patok** pada detail tiap lahan (peta bernomor + tabel), di **Profil Lahan (PDF)**, dan bisa diunduh per lembaga lewat **Detail Lembaga Petani → Unduh Lahan → Patok batas (Excel)**.

## Kalau bermasalah

**"ID Lahan dipakai lebih dari satu petani — isi kolom ID Petani"** — ID lahan itu terdaftar pada dua petani berbeda. Tambahkan kolom ID Petani di berkas, petakan, lalu validasi ulang.

**"Lintang dan Bujur tampak tertukar"** — nilai kolomnya terbalik (lintang Riau sekitar 0–2, bujur sekitar 100–103). Tukar pemetaan kolom Lintang ↔ Bujur, lalu validasi ulang.

**"Lahan belum punya poligon"** — jarak titik ke batas tidak bisa diperiksa. Unggah poligonnya dulu lewat tab Poligon.

**Ditolak server: "Koordinat N m dari batas lahan (maks 100 m)"** — desimal koordinat salah tempel atau titik memang milik lahan lain. Periksa di aplikasi GPS, perbaiki barisnya, unggah ulang hanya baris itu.
