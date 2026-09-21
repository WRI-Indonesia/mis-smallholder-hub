# 01 · Smoke test per menu

Checklist **tetap** (tumbuh saat menu bertambah). Dijalankan tiap run — staging penuh, prod cukup `[P0]`. Peran non-SUPERADMIN **wajib**: bug scope tidak terlihat dari SUPERADMIN. **Konsol browser** diperiksa di tiap halaman (kolom sendiri di lembar run), bukan satu baris di akhir.

Format blok: `### SM-nn · <Menu › Sub-menu> [P0|P1|P2] (menit)` → `Peran:` · `Langkah:` · `Harapan:`.

### SM-01 · Login · Profil [P0] (2 mnt)
Peran: semua akun uji · Langkah: login, ganti tema, logout · Harapan: masuk ke dashboard sesuai peran.

### SM-02 · Dashboard › Main [P1] (2 mnt)
Peran: SUPERADMIN · Langkah: filter Distrik/Tahun, klik 1 kartu → dialog · Harapan: angka mengikuti filter; dialog terbuka.

### SM-03 · Dashboard › BMP [P1] (2 mnt)
Peran: SUPERADMIN · Langkah: ganti tahun · Harapan: kartu & grafik terisi.

### SM-04 · Dashboard › Pelatihan [P1] (2 mnt)
Peran: OPERATOR · Langkah: matriks + drill-down 1 sel · Harapan: modal daftar petani.

### SM-05 · Dashboard › Risk Management › Fire Alert [P1] (3 mnt)
Peran: SUPERADMIN · Langkah: muat rentang 5 hari, cetak PDF 1 lembaga · Harapan: PDF terunduh.

### SM-06 · Report › Petani [P0] (2 mnt)
Peran: OPERATOR · Langkah: filter wajib → Excel & PDF · Harapan: kedua berkas terunduh, jumlah baris = layar.

### SM-07 · Report › Lahan [P0] (3 mnt)
Peran: OPERATOR · Langkah: pilih Lembaga, 1 filter legalitas, PDF · Harapan: KPI mengikuti filter; PDF terunduh.

### SM-08 · Report › Pelatihan [P1] (2 mnt)
Peran: OPERATOR · Langkah: dua tab, Excel · Harapan: Excel 2 sheet.

### SM-09 · Report › Produksi [P1] (2 mnt)
Peran: OPERATOR · Langkah: matriks bulanan, PDF · Harapan: PDF landscape.

### SM-10 · Report › Kelompok Tani (Summary) [P1] (2 mnt)
Peran: OPERATOR · Langkah: selektor kolom, Excel · Harapan: kolom Excel = kolom aktif.

### SM-11 · Report › Kelompok Tani (Detail) [P1] (2 mnt)
Peran: OPERATOR · Langkah: pilih Lembaga, Buka semua, PDF · Harapan: seluruh roster ikut.

### SM-12 · Report › Patok [P0] (2 mnt)
Peran: OPERATOR, lalu DONOR · Langkah: Distrik → Muat Data, Excel · Harapan: KPI kondisi + tabel; DONOR **tanpa** tombol Excel.

### SM-13 · Map › Peta Lahan [P0] (4 mnt)
Peran: OPERATOR · Langkah: Muat Data 1 Distrik, toggle tiap baris legenda, popup lahan, unduh 1 baris · Harapan: semua layer tergambar; popup lengkap; unduhan sesuai tipe baris.

### SM-14 · Map › Peta BMP [P1] (2 mnt)
Peran: SUPERADMIN · Langkah: pilih Lembaga, popup, cetak · Harapan: PDF + matriks.

### SM-15 · Master Data › Lembaga Petani [P0] (3 mnt)
Peran: OPERATOR · Langkah: daftar, detail 5 tab, Excel · Harapan: hanya Lembaga dalam scope.

### SM-16 · Master Data › Petani [P0] (3 mnt)
Peran: OPERATOR · Langkah: cari NIK, detail tab Lahan · Harapan: NIK tersensor di layar.

### SM-17 · Master Data › Pelatihan [P1] (2 mnt)
Peran: OPERATOR · Langkah: daftar, detail peserta · Harapan: terbuka.

### SM-18 · Master Data › Lahan [P0] (3 mnt)
Peran: OPERATOR · Langkah: filter, detail 5 tab, Profil Lahan PDF · Harapan: PDF ≤ 2 halaman.

### SM-19 · Master Data › Produksi [P1] (1 mnt)
Peran: OPERATOR · Langkah: daftar, filter · Harapan: terbuka.

### SM-20 · Data Analyst › Ringkasan Petani [P1] (1 mnt)
Peran: SUPERADMIN · Langkah: filter, Excel · Harapan: terbuka.

### SM-21 · Data Analyst › Ketersediaan Data — Semua Lembaga [P1] (2 mnt)
Peran: SUPERADMIN, lalu OPERATOR · Langkah: hero, kartu domain, tab Radar/Heatmap/Cakupan modul, klik 1 grafik → modal · Harapan: terisi; OPERATOR hanya Lembaga dalam scope.

### SM-22 · Data Analyst › Ketersediaan Data — Per Lembaga [P1] (2 mnt)
Peran: SUPERADMIN, lalu OPERATOR · Langkah: pilih Lembaga (analisa otomatis), klik label sumbu radar → seksi, buka 1 baris checklist · Harapan: Index + radar + prioritas + checklist terisi.

### SM-23 · Data Analyst › Komparasi Data Acuan · Metrik Rilis · Peta Data & Skema [P2] (2 mnt)
Peran: SUPERADMIN · Langkah: buka ketiganya · Harapan: angka terisi; Peta Data memuat tabel baru rilis ini.

### SM-24 · Bulk Upload › Petani · Produksi · Lahan (tiap tab) · Pohon [P0] (3 mnt)
Peran: OPERATOR · Langkah: tiap tab terbuka, unduh template · Harapan: template terunduh.

### SM-25 · Tools › Dashboard Snapshot · Snapshot BMP [P2] (1 mnt)
Peran: SUPERADMIN · Langkah: daftar terbuka (tanpa generate) · Harapan: terbuka.

### SM-26 · Settings › Users · Menu · Roles · Regions [P0] (3 mnt)
Peran: SUPERADMIN · Langkah: buka keempatnya; matriks Roles memuat menu baru rilis ini · Harapan: izin = seed.

### SM-27 · Bantuan [P1] (2 mnt)
Peran: DONOR · Langkah: indeks, cari 1 kata, buka 1 tutorial baru rilis ini · Harapan: render, tanpa 404.

### SM-28 · Scope OPERATOR [P0] (2 mnt)
Peran: OPERATOR · Langkah: dropdown Distrik/Lembaga di Report & Master Data · Harapan: **tidak** ada Lembaga/Distrik di luar scope.

### SM-29 · Menu DONOR [P0] (1 mnt)
Peran: DONOR · Langkah: sidebar · Harapan: Master Data/Bulk Upload/Settings **tidak** tampil; Report & Map read-only.

### SM-30 · Dashboard › Monev BMP [P0] (3 mnt)
Peran: OPERATOR, lalu DONOR · Langkah: filter Distrik/Lembaga/Tahun, klik nama Lembaga di Papan → filter, radar A/B ganti seri B, Unduh Excel rekap · Harapan: 4 seksi terisi; filter di URL; DONOR **tanpa** tombol Unduh Excel.

### SM-31 · Master Data › Monev BMP · Detail · Penilaian Lembaga [P0] (3 mnt)
Peran: OPERATOR, lalu DONOR · Langkah: daftar (KPI, filter Kategori), Lihat 1 baris → detail (radar + 5 tabel), tombol Penilaian Lembaga · Harapan: hanya Lembaga dalam scope; DONOR tanpa Tambah/Import/Ubah.
