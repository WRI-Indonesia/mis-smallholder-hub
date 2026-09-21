---
title: Data Analyst
icon: BarChart3
---

**Ringkasan Petani** — Agregat karakteristik petani beserta ekspor Excel untuk analisa lanjutan.

**Ketersediaan Data — Semua Lembaga** — Pintu masuk untuk pertanyaan "lembaga mana yang datanya paling belum lengkap, dan jenis kekurangan apa yang paling banyak". Isinya skor kelengkapan 0–100 per lembaga untuk lima domain (Profil Lembaga, Petani, Lahan, Pelatihan, Produksi): enam kartu ringkasan, matriks lembaga × domain (atau lembaga × modul pada tampilan *Cakupan modul*), grafik skor per lembaga (terendah tampil dulu), panel Anomali Terbanyak yang memisahkan anomali *per entitas* dari *kolom yang belum pernah diisi*, dan ekspor Excel. Klik nama lembaga untuk melompat ke halaman Per Lembaga. Warna skor: hijau tua khusus 100 (lengkap penuh), hijau 80–99, kuning 50–79, merah <50. Angkanya dihitung langsung saat halaman dibuka (bukan snapshot). Perlu diingat: skor rendah berarti datanya belum tercatat, belum tentu kondisi lapangannya buruk.

**Ketersediaan Data — Per Lembaga** — Rincian satu lembaga sampai ke daftar kerja: strip skor per domain beserta bobotnya, cakupan modul tambahan (surat tanah, STDB, NKT, patok, pohon, Monev BMP, boundary, acuan — informatif, di luar Index), lalu temuan anomali per domain dengan tautan ke Detail Petani/Detail Lahan dan petunjuk *Perbaiki lewat* menu mana. Analisa berjalan otomatis begitu lembaga dipilih. Skornya identik dengan halaman Semua Lembaga karena memakai perhitungan yang sama; rumusnya ada di Referensi → *Ketersediaan Data — cara skor dihitung*.

**Peta Data & Skema** — Menjelaskan *bentuk* datanya, bukan isinya: entitas apa saja yang ada di sistem, bagaimana antar-entitas terhubung, kolom mana yang ternyata tidak pernah diisi, dan menu mana mengambil data dari entitas apa. Angkanya bersifat nasional — tidak disaring per wilayah, jadi yang tampil bukan hanya wilayah kerja Anda. Untuk kelengkapan data per Lembaga, pakai Ketersediaan Data — Per Lembaga.

**Metrik Rilis** — Memantau pengembangan aplikasinya sendiri, bukan data petani: kecepatan rilis, kemajuan menuju go-live, jumlah test, dan kualitas. Menu ini berada di grup Data Analyst meskipun alamat halamannya masih `/admin/dashboard/metrics`.

**Komparasi Data Acuan** — Membandingkan angka acuan manual (rekap GDrive "MD 1st SOW") dengan angka MIS live per Lembaga Petani: petani, persil, luas lahan, petani terlatih per paket, dan petani berdata produksi. Selisih = acuan − MIS; sel oranye menandai metrik yang datanya di MIS masih kurang dari acuan. Angka acuan dientry manual di halaman ini (peran dengan izin EDIT), sisi MIS dihitung langsung saat halaman dibuka.

