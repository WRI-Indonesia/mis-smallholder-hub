---
title: Mencatat pelatihan & pesertanya
icon: GraduationCap
menuKey: master-data-training
permission: CREATE
duration: 7
href: /admin/master-data/training
hrefLabel: Buka halaman Pelatihan
goal: Satu kegiatan pelatihan tercatat lengkap dengan daftar peserta dan nilai pre/post-test.
---

## Sebelum mulai

Satu kegiatan dimiliki satu **Lembaga Petani**, dan pesertanya **hanya boleh anggota lembaga itu** — sistem menolak peserta dari lembaga lain.

Siapkan: paket pelatihan, tanggal, lokasi, daftar hadir, dan notulen PDF (maksimal 10 MB).

## Langkah — membuat kegiatan

1. Buka menu **Master Data → Pelatihan**, lalu klik **Tambah Pelatihan**.
2. Pilih **Paket Pelatihan** dan **Lembaga Petani**.
3. Isi **Tanggal Pelatihan** dan **Lokasi** (misalnya `Balai Desa`).
4. Unggah **Evidence (Notulen PDF, maks 10MB)** bila sudah ada — boleh menyusul lewat Edit.
5. Klik **Buat**.

## Langkah — menambahkan peserta

1. Klik kegiatan yang baru dibuat untuk membuka halaman detailnya.
2. Pada seksi **Peserta Pelatihan**, klik **Tambah Peserta**.
3. Centang petani yang hadir. Daftar yang muncul hanya anggota lembaga penyelenggara.
4. Isi **Pre-Test** dan **Post-Test** bila tesnya dilakukan. Boleh dikosongkan dan dilengkapi belakangan.
5. Simpan.

> [!hati-hati] Nilai post-test yang lebih rendah dari pre-test akan ditandai "turun" di Dashboard Pelatihan sebagai indikasi salah input. Periksa ulang sebelum menyimpan.

## Memastikan berhasil

Jumlah peserta muncul di daftar pelatihan. Petani tersebut **langsung** terhitung sudah dilatih pada paket itu di Dashboard Pelatihan — dashboard ini tidak memakai snapshot, jadi tidak perlu proses tambahan.

## Kalau bermasalah

**Petani yang dicari tidak ada di daftar peserta.** Dia bukan anggota lembaga penyelenggara. Bila memang hadir, perbaiki dulu keanggotaannya di data Petani.

**Unggahan notulen ditolak.** Hanya PDF di bawah 10 MB yang diterima.

**Peserta salah dimasukkan.** Centang barisnya lalu klik **Hapus Terpilih**, atau pakai tombol hapus di baris tersebut.
