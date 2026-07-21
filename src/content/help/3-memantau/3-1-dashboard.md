---
title: Dashboard
icon: LayoutDashboard
---

**Main Dashboard** — Ringkasan program: jumlah petani, kelompok tani, lahan, luas, cakupan pelatihan, dan sertifikasi, dilengkapi peta sebaran lembaga.

**BMP Dashboard (Produksi)** — Fokus produksi: total produksi, produktivitas (Ton/Ha), lahan ber-data, dan ketersediaan data produksi. Tersedia filter Kategori, Distrik, Lembaga, Tahun, dan Kelengkapan Data.

**Dashboard Pelatihan** — Menjawab "program pelatihan sudah sejauh mana, dan lembaga mana yang tertinggal". Isinya lima kartu ringkasan (cakupan petani terlatih, jumlah kegiatan, kehadiran, partisipasi perempuan, kenaikan skor), lalu tabel Cakupan Pelatihan per Lembaga & Paket, grafik tren kehadiran, panel pre/post-test, dan panel kualitas data. Filter Kategori, Distrik, Lembaga, dan Tahun berlaku untuk seluruh isi halaman.

**Membaca tabel cakupan** — Tiap sel berisi persentase petani aktif lembaga tersebut yang sudah mengikuti satu paket, dibaca terhadap target program: **100% petani aktif untuk setiap paket**. Hijau tua berarti mendekati target, hijau muda masih jauh, dan merah berarti belum ada satu pun petani yang mengikuti paket itu. Klik judul kolom untuk mengurutkan — urutan menaik menampilkan lembaga yang paling tertinggal lebih dulu. Tabel bisa dilipat lewat tanda panah di kanan judulnya bila layar terasa penuh.

**Melihat siapa yang belum dilatih** — Klik sel yang belum mencapai target, lalu muncul daftar nama petani yang belum mengikuti paket tersebut beserta ID Petani. Daftar itu bisa disalin atau diunduh sebagai Excel untuk dipakai sebagai daftar undangan pelatihan. NIK tidak ditampilkan di daftar ini. Sel yang sudah memenuhi target tidak bisa diklik karena tidak ada yang perlu didaftar.

**Skor pre-test dan post-test** — Panel efektivitas hanya menghitung peserta yang skor pre dan post-nya terisi. Peserta dengan skor post lebih rendah daripada pre ditandai "turun" — biasanya ini salah input, bukan hasil belajar yang menurun, jadi sebaiknya ditelusuri ke data kegiatannya.

**Kenapa angkanya belum berubah?** — Main Dashboard dan BMP Dashboard membaca snapshot (rekaman berkala), bukan menghitung ulang tiap kali dibuka, agar tetap cepat. Setelah input data besar, minta admin generate snapshot baru lewat menu Tools. Dashboard Pelatihan tidak memakai snapshot — angkanya dihitung langsung saat halaman dibuka, jadi perubahan data pelatihan langsung terlihat tanpa perlu generate apa pun.

**Angka mengikuti hak akses Anda** — Semua dashboard hanya menghitung lembaga dan petani dalam cakupan wilayah atau lembaga yang ditugaskan ke akun Anda. Karena itu angka total bisa berbeda antar pengguna, dan itu normal.
