---
title: Halaman Petani — arti kolom & tombol
icon: User
menuKey: master-data-farmers
permission: VIEW
href: /admin/master-data/farmers
hrefLabel: Buka halaman Petani
---

## Kartu ringkasan

Keempat kartu di atas tabel **mengikuti filter yang sedang aktif**, bukan seluruh organisasi. Mengubah filter Distrik atau Lembaga akan mengubah angkanya.

**Total Lembaga Petani** — banyaknya lembaga berbeda yang muncul pada hasil filter saat ini.

**Total Petani** — jumlah baris petani yang tampil.

**Petani Laki-laki / Perempuan** — pecahan dari Total Petani berdasarkan kolom Jenis Kelamin. Bila keduanya tidak berjumlah sama dengan Total Petani, ada data yang jenis kelaminnya belum terisi.

## Filter & pencarian

**Distrik** — mempersempit ke satu kabupaten/kota. Daftarnya hanya memuat distrik dalam wilayah kerja akun Anda.

**Lembaga Petani** — mempersempit ke satu lembaga. Pilihannya ikut menyempit bila Distrik sudah dipilih.

**Status** — hanya muncul untuk SUPERADMIN. Pengguna lain selalu melihat data aktif saja.

**Kotak pencarian** — menelusuri **tiga** kolom sekaligus: Nama, ID Petani, dan NIK. Jadi Anda bisa mencari lewat nomor bila ada beberapa nama mirip.

## Kolom tabel

**ID Petani** — nomor milik organisasi Anda, bukan buatan sistem. Unik **per Lembaga**: lembaga berbeda boleh memakai nomor yang sama.

**Nama** — nama lengkap sesuai dokumen. Muncul juga di daftar hadir pelatihan, laporan, dan Profil Lahan.

**L/P** — jenis kelamin. Menggerakkan angka partisipasi perempuan di Dashboard Pelatihan.

**NIK** — ditampilkan **tersensor** di layar demi keamanan. Nilainya tersimpan utuh, dan **ikut penuh saat diekspor ke Excel** — perlakukan berkas ekspor sebagai dokumen rahasia.

**Tempat Lahir / Tanggal Lahir** — tanggal lahir juga tersensor di layar dengan aturan yang sama.

**Status** — Aktif atau Nonaktif. Nonaktif berarti disembunyikan dari daftar, **bukan dihapus**; seluruh riwayat pelatihan, lahan, dan produksinya masih tersimpan. Kolom ini hanya tampil untuk SUPERADMIN.

**Lembaga Petani** — lembaga tempat petani terdaftar. Satu petani hanya boleh berada di satu lembaga.

**Tahun Bergabung** — tahun masuk program, bukan tahun mulai bertani. Dipakai filter tahun di Main Dashboard.

**Distrik** — diturunkan dari lembaga, bukan diisi terpisah di data petani.

## Tombol

**Tambah Petani** — hanya muncul bila akun Anda punya izin menambah data pada menu ini.

**Excel** — mengunduh data sesuai filter dan kolom yang sedang tampil. NIK dan tanggal lahir **tidak disensor** di berkas hasil unduhan.

**Kolom** — menyembunyikan atau menampilkan kolom. Pengaturannya juga memengaruhi isi unduhan Excel.

**Aksi baris** — Lihat membuka halaman detail; Edit membuka jendela isian; Nonaktifkan mengubah status tanpa menghapus data. Baris yang sudah nonaktif menampilkan **Aktifkan kembali**.
