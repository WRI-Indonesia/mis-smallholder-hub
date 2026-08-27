---
title: Master Data
icon: Database
intro: Menu Master Data adalah tempat input harian: Lembaga Petani, Petani, Lahan, Pelatihan, dan Produksi. Semua daftar punya pola yang sama.
---

**Menambah data** — Klik tombol Tambah di kanan atas daftar, isi formulir, lalu Simpan. Kolom bertanda wajib harus diisi.

**Mencari & menyaring** — Gunakan kotak pencarian di atas tabel; tombol Kolom untuk menampilkan atau menyembunyikan kolom; klik judul kolom untuk mengurutkan. Daftar Petani, Pelatihan, Lahan, dan Produksi juga punya pasangan filter **Distrik → Lembaga Petani** yang saling terkait: memilih Distrik menyaring pilihan Lembaga, dan pilihan Lembaga yang tak lagi sesuai otomatis kembali ke "Semua". Keduanya bisa dicari dengan mengetik. Tombol **Excel** untuk mengunduh isi daftar hanya tampil bila akun Anda punya izin **Export** pada menu tersebut.

**Mengubah & melihat detail** — Kolom Aksi di kiri baris berisi tombol ubah dan detail. Halaman detail Petani dan Lembaga Petani menampilkan profil lengkap: lahan dan peta (tab Lahan petani juga meringkas surat kepemilikan dan STDB tiap lahan), pelatihan, serta produksi. Halaman detail Lahan menampilkan ringkasan lahan (luas, umur tanaman, produksi, kelengkapan data), peta batas kebun dengan koordinat titik pusat, bagian **Legalitas & Dokumen** (surat kepemilikan dengan luas tertera vs luas poligon, STDB beserta lahan lain yang ditutupnya, kode pemetaan vendor, dan program seperti demplot PBU — diisi lewat Bulk Upload → Lahan → tab Detail Lahan), grafik dan tabel produksi bulanan, serta tombol unduh PDF Profil Lahan; sel bulan pada tabel produksi bisa diklik untuk menambah atau mengubah data panen bulan itu (maks. 4 panen per bulan, mengikuti izin menu Data Produksi).

**Tab Produksi di detail Petani & Lembaga** — Dua tabel warna per bulan (baris = tahun sampai tahun berjalan, kolom = Jan–Des): **Produksi Bulanan** (Lembaga dalam Ton, Petani dalam Kg) dengan kolom Total dan Produktivitas (Ton/Ha) — makin gelap hijaunya makin tinggi produksinya — dan **Ketersediaan Data Bulanan** yang menunjukkan berapa lahan melapor tiap bulan beserta persennya (hijau ≥80%, kuning 50–79%, oranye 1–49%, abu tanpa data) plus ringkasan tahunan Record/Lahan/Luas Terdata. Sel "—" berarti tidak ada data pada bulan itu. Tombol **Semua Lahan / Exclude (PSR & tanaman <3 thn)** menyaring kedua tabel: mode Exclude membuang lahan PSR dan tanaman muda beserta datanya agar produktivitas tanaman menghasilkan tidak tertarik turun. Khusus detail Petani, baris tabel bisa di-expand dua arah lewat tombol **Tahun › Lahan** / **Lahan › Tahun**: mode pertama klik baris tahun untuk membuka rincian per lahan, mode kedua klik baris lahan (lengkap dengan luas dan umur tanaman/PSR) untuk membuka rincian per tahunnya.

**Menonaktifkan, bukan menghapus** — Data tidak pernah dihapus permanen. Tombol hapus akan menonaktifkan data (status Nonaktif) sehingga riwayat tetap utuh; gunakan filter Status untuk melihat data nonaktif dan mengaktifkannya kembali.

**Revisi data lahan** — Saat data lahan diubah, sistem menyimpan versi lama dan membuat versi baru (nomor Revisi bertambah). Ini menjaga jejak perubahan batas atau luas kebun.

**Data pribadi disensor** — Di layar, NIK ditampilkan sebagian dan tanggal-bulan lahir disembunyikan (tahun tetap tampil). Hasil export Excel/PDF tetap lengkap untuk kebutuhan kerja data, jadi jaga kerahasiaan filenya.
