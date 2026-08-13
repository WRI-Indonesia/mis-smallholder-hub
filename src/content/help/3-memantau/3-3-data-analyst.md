---
title: Data Analyst
icon: BarChart3
---

**Ringkasan Petani** — Agregat karakteristik petani beserta ekspor Excel untuk analisa lanjutan.

**Analisa Ketersediaan Data** — Skor kelengkapan data per lembaga atau KT beserta rincian domain yang masih kosong. Gunakan ini untuk menentukan prioritas pendataan lapangan.

**Peta Data & Skema** — Menjelaskan *bentuk* datanya, bukan isinya: entitas apa saja yang ada di sistem, bagaimana antar-entitas terhubung, kolom mana yang ternyata tidak pernah diisi, dan menu mana mengambil data dari entitas apa. Angkanya bersifat nasional (tidak disaring per wilayah), sehingga menunya hanya untuk SUPERADMIN dan ADMIN. Untuk kelengkapan data per Lembaga, pakai Analisa Ketersediaan Data.

**Metrik Rilis** — Memantau pengembangan aplikasinya sendiri, bukan data petani: kecepatan rilis, kemajuan menuju go-live, jumlah test, dan kualitas. Menu ini berada di grup Data Analyst meskipun alamat halamannya masih `/admin/dashboard/metrics`.

**Komparasi Data Acuan** — Membandingkan angka acuan manual (rekap GDrive "MD 1st SOW") dengan angka MIS live per Lembaga Petani: petani, persil, luas lahan, petani terlatih per paket, dan petani berdata produksi. Selisih = acuan − MIS; sel oranye menandai metrik yang datanya di MIS masih kurang dari acuan. Angka acuan dientry manual di halaman ini (peran dengan izin EDIT), sisi MIS dihitung langsung saat halaman dibuka.

**Dashboard Ketersediaan Data** — Menjawab "lembaga mana yang datanya paling belum lengkap, dan jenis kekurangan apa yang paling banyak". Isinya skor kelengkapan 0–100 per lembaga untuk lima domain (Profil Lembaga, Petani, Lahan, Pelatihan, Produksi): enam kartu ringkasan, matriks lembaga × domain, grafik skor per lembaga (terendah tampil dulu), dan panel Anomali Terbanyak. Skor per lembaga memakai perhitungan yang sama dengan Analisa Ketersediaan Data — dashboard untuk melihat semua lembaga sekaligus, Analisa untuk membedah satu lembaga sampai daftar nama petaninya. Warna skor: hijau tua khusus 100 (lengkap penuh), hijau 80–99, kuning 50–79, merah <50. Angkanya dihitung langsung saat halaman dibuka (bukan snapshot). Perlu diingat: skor rendah berarti datanya belum tercatat, belum tentu kondisi lapangannya buruk.
