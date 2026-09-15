# 01 · Smoke test per menu

Dijalankan **dua kali**: setelah deploy staging (kolom S) dan setelah deploy prod (kolom P). Satu peran non-SUPERADMIN ter-scope (mis. OPERATOR satu Distrik) wajib ikut — bug scope tidak terlihat dari SUPERADMIN. Status: Pass / Fail / Blocked / N/A.

**Peran diuji:** SUPERADMIN `<akun>` · OPERATOR ter-scope `<akun, scope>` · DONOR `<akun>`

| # | Menu › Sub-menu | Langkah minimum | Peran | S | P | Catatan / bukti |
|---|---|---|---|---|---|---|
| 1 | Login · Profil | login, ganti tema, logout | semua | | | |
| 2 | Dashboard › Main | filter Distrik/Tahun, klik 1 kartu → dialog | SUPERADMIN | | | |
| 3 | Dashboard › BMP | ganti tahun, kartu & grafik terisi | SUPERADMIN | | | |
| 4 | Dashboard › Pelatihan | matriks + drill-down 1 sel | OPERATOR | | | |
| 5 | Dashboard › Risk Management › Fire Alert | muat rentang 5 hari, cetak PDF 1 lembaga | SUPERADMIN | | | |
| 6 | Report › Petani | filter wajib → Excel & PDF terunduh | OPERATOR | | | |
| 7 | Report › Lahan | pilih Lembaga, filter legalitas, PDF | OPERATOR | | | |
| 8 | Report › Pelatihan | dua tab, Excel | OPERATOR | | | |
| 9 | Report › Produksi | matriks bulanan, PDF | OPERATOR | | | |
| 10 | Report › Kelompok Tani (Summary) | selektor kolom, Excel | OPERATOR | | | |
| 11 | Report › Kelompok Tani (Detail) | pilih Lembaga, buka semua, PDF | OPERATOR | | | |
| 12 | Report › Patok | Distrik → Muat Data, Excel | OPERATOR | | | |
| 13 | Map › Peta Lahan | Muat Data 1 Distrik, toggle tiap baris legenda, popup lahan, Unduh 1 baris | OPERATOR | | | |
| 14 | Map › Peta BMP | pilih Lembaga, popup, cetak | SUPERADMIN | | | |
| 15 | Master Data › Lembaga Petani | daftar, detail 5 tab, Excel | OPERATOR | | | |
| 16 | Master Data › Petani | daftar, cari NIK, detail tab Lahan | OPERATOR | | | |
| 17 | Master Data › Pelatihan | daftar, detail peserta | OPERATOR | | | |
| 18 | Master Data › Lahan | filter, detail 5 tab, Profil Lahan PDF | OPERATOR | | | |
| 19 | Master Data › Produksi | daftar, filter | OPERATOR | | | |
| 20 | Data Analyst › Ringkasan Petani | filter, Excel | SUPERADMIN | | | |
| 21 | Data Analyst › Analisa Ketersediaan Data | index + 1 seksi anomali | SUPERADMIN | | | |
| 22 | Data Analyst › Dashboard Ketersediaan Data | matriks terisi | SUPERADMIN | | | |
| 23 | Data Analyst › Komparasi Data Acuan · Metrik Rilis · Peta Data & Skema | halaman terbuka, angka terisi | SUPERADMIN | | | |
| 24 | Bulk Upload › Petani · Produksi · Lahan (3 tab) · Pohon | tiap tab terbuka, unduh template | OPERATOR | | | |
| 25 | Tools › Dashboard Snapshot · Snapshot BMP | daftar terbuka (tanpa generate) | SUPERADMIN | | | |
| 26 | Settings › Users · Menu · Roles · Regions | halaman terbuka, matriks izin memuat menu baru | SUPERADMIN | | | |
| 27 | Bantuan | indeks, cari 1 kata, buka 1 tutorial baru | DONOR | | | |
| 28 | Scope | OPERATOR ter-scope **tidak** melihat Lembaga/Distrik lain di dropdown & daftar | OPERATOR | | | |
| 29 | DONOR | menu Master Data/Bulk Upload/Settings **tidak** tampil; Report & Map terbuka read-only | DONOR | | | |
| 30 | Konsol browser | tidak ada error merah selama 1–29 | — | | | |
