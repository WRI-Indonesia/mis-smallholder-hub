---
title: Mengunggah data petani dari Excel
icon: Upload
menuKey: bulk-upload-farmers
permission: CREATE
duration: 10
href: /admin/bulk-upload/farmers
hrefLabel: Buka halaman Upload Petani
goal: Puluhan hingga ratusan petani terdaftar sekaligus dari satu berkas Excel.
---

## Sebelum mulai

Unggahan ini memasukkan petani ke **satu Lembaga Petani sekaligus**. Kalau berkas Anda memuat petani dari beberapa lembaga, pisahkan berkasnya per lembaga.

+ Lembaga diambil dari pilihan Anda di Langkah 1, bukan dari isi berkas. Jadi kolom lembaga di Excel Anda — kalau ada — akan diabaikan, dan seluruh baris masuk ke lembaga yang sama.

Kolom di Excel Anda **tidak harus bernama persis** seperti di sistem — nanti ada tahap pemetaan kolom. Yang penting datanya ada.

+ Urutan kolom juga bebas. Yang perlu dirapikan hanyalah: satu baris judul saja di paling atas, tanpa baris kosong di tengah, dan tanpa sel gabungan.

## Langkah

1. Buka menu **Bulk Upload → Upload Petani**.
2. Pada **Langkah 1**, pilih **Lembaga Petani** tujuan. Selama ini belum dipilih, kotak berkas masih terkunci.
3. Pada **Langkah 2**, pilih berkas `.xlsx` atau `.csv`. Sistem akan memberi tahu jumlah baris yang terbaca.
4. Di bagian **Petakan Kolom Data**, cocokkan tiap kolom sistem dengan kolom di berkas Anda. Sebagian sudah tercocokkan otomatis — periksa tetap.
+ Pencocokan otomatis menebak dari nama kolom yang umum, dan bisa salah bila Anda punya dua kolom bernama mirip seperti "Nama" dan "Nama KK". Karena itu selalu tinjau ulang sebelum melanjutkan.
5. Kolom bertanda **Wajib** harus terisi. Yang tidak dipakai, pilih **-- Kosongkan --**.
6. Klik **Validasi Data**.
7. Periksa ringkasan hasil validasi. Setiap baris berstatus salah satu dari tiga: **Valid** (semua terisi), **Tidak Lengkap** (boleh disimpan, tapi ada kolom opsional yang kosong — NIK, tempat/tanggal lahir, alamat, atau tahun bergabung), atau **Error** (tidak bisa disimpan). Klik filter status untuk melihat kelompok tertentu saja.
+ Kolom **Keterangan** menjelaskan per baris: alasan error, atau daftar kolom yang kosong untuk baris tidak lengkap. Bila ratusan baris memberi alasan yang sama, penyebabnya biasanya satu: pemetaan kolom yang keliru — perbaiki pemetaannya, bukan datanya.
8. Bila masih ada error, klik **Download Data Error Saja**, perbaiki di Excel, lalu ulangi dari langkah 3. Untuk menindaklanjuti data bolong, **Download Data Tidak Lengkap** memberi daftar baris beserta kolom mana yang kosong.
+ Semua berkas unduhan memuat kolom **Status** (VALID / TIDAK LENGKAP / ERROR) dan keterangannya, jadi bisa diperbaiki langsung di sana tanpa mencocokkan manual dengan layar.
9. Setelah puas, pilih salah satu tombol simpan: **Simpan Semua Layak** (baris valid + tidak lengkap) atau **Simpan Hanya yang Valid** (baris tidak lengkap ditahan).
+ Kapan menahan baris tidak lengkap? Bila datanya masih bisa dilengkapi di Excel dalam waktu dekat. Unggahan ini hanya **menambah**, tidak memperbarui — baris yang telanjur disimpan bolong hanya bisa dilengkapi lewat tombol Edit di Master Data satu per satu, tidak bisa diunggah ulang.

> [!penting] Baris **error** selalu dilewati, bukan menggagalkan seluruh unggahan — jadi Anda bisa menyimpan yang baik dulu lalu memperbaiki sisanya.

## Hasil

Petani muncul di **Master Data → Petani** dengan lembaga yang Anda pilih di Langkah 1.

## Kalau bermasalah

**Kotak berkas terkunci** — Lembaga Petani di Langkah 1 belum dipilih.

**Lembaga yang dicari tidak ada di daftar** — daftar hanya menampilkan lembaga di dalam wilayah akses Anda. Bila lembaganya memang wilayah kerja Anda, minta admin memperbarui akses data Anda.

**Banyak baris error "ID Petani sudah terdaftar"** — nomor itu sudah dipakai **di lembaga tujuan**. Keluarkan barisnya dari berkas, atau perbarui datanya lewat Master Data.

+ Pemeriksaan berlaku **per lembaga**, bukan seluruh sistem: nomor yang sama boleh dipakai lembaga lain. Baris nonaktif ikut dihitung — bila petaninya pernah dinonaktifkan, aktifkan kembali datanya alih-alih mengunggah ulang.

+ Unggahan massal ini hanya **menambah**, tidak memperbarui data yang sudah ada. Untuk mengubah data petani lama, gunakan tombol Edit di Master Data satu per satu.

**Sel berisi `#N/A` atau error Excel lain** — sel hasil formula yang gagal (misalnya VLOOKUP) dibaca sebagai **kosong**, bukan sebagai teks. Kolom wajib akan ditandai error "wajib diisi"; kolom opsional membuat barisnya berstatus **Tidak Lengkap**.

+ Bila datanya sebenarnya ada, perbaiki formulanya di Excel atau salin-tempel nilainya sebagai **Values** sebelum mengunggah ulang.

**Kolom tidak tercocokkan otomatis** — wajar bila judul kolom Anda tidak umum. Cocokkan manual; pencocokan otomatis hanya membantu, bukan syarat.

**Jumlah baris terbaca lebih sedikit dari isi berkas** — biasanya ada baris judul ganda atau baris kosong di tengah. Rapikan dulu di Excel.

+ Penyebab lain yang sering luput: data berada di sheet kedua sementara yang terbaca sheet pertama yang kosong. Pindahkan datanya ke sheet pertama.
