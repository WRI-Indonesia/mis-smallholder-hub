---
title: Mencatat hasil panen
icon: TrendingUp
menuKey: master-data-production
permission: CREATE
duration: 4
href: /admin/master-data/production
hrefLabel: Buka halaman Produksi
goal: Satu catatan panen tersimpan untuk seorang petani pada periode tertentu.
---

## Sebelum mulai

Produksi dicatat **per petani, per lahan, per bulan**. Satu bulan boleh punya beberapa catatan bila panen terjadi lebih dari sekali — itulah gunanya kolom **Panen Ke-**.

Isi lahannya bila memungkinkan; tanpa lahan, produksi tetap tersimpan tapi tidak bisa dikaitkan ke luas untuk perhitungan produktivitas.

## Langkah

1. Buka menu **Master Data → Produksi**, lalu klik **Tambah Data Produksi**.
2. Pada seksi **Informasi Petani & Lahan**, pilih **Petani** lalu **Lahan** miliknya.
3. Isi **Periode** dengan format tahun-bulan, misalnya `2026-06`.
4. Isi **Tanggal Panen** — tanggal sebenarnya panen dilakukan, harus berada dalam periode yang sama.
5. Isi **Panen Ke-**: `1` untuk panen pertama di bulan itu, `2` untuk berikutnya, dan seterusnya.
6. Isi **Hasil Panen (kg)** dalam kilogram, bukan ton.
7. Klik **Simpan**.

> [!tip] Punya data satu musim penuh dalam Excel? Pakai **Bulk Upload → Upload Produksi** — jauh lebih cepat dan tervalidasi sebelum tersimpan.

## Memastikan berhasil

Catatan muncul di daftar Produksi. Angkanya masuk ke Dashboard BMP dan Peta BMP **setelah snapshot diperbarui** — lihat tutorial **Memperbarui angka dashboard**.

## Kalau bermasalah

**Lahan tidak muncul setelah memilih petani.** Petani itu belum punya lahan terdaftar. Daftarkan lahannya lebih dulu.

**Muncul pesan data duplikat.** Kombinasi petani, lahan, periode, dan Panen Ke- yang sama sudah ada. Naikkan nomor Panen Ke- bila ini memang panen berbeda.

**Angka tidak berubah di dashboard.** Bukan kegagalan penyimpanan — Dashboard Main dan BMP membaca snapshot berkala, bukan menghitung ulang tiap dibuka.
