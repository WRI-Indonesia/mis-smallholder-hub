# 02 · Kasus uji per issue — v1.8.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

Prasyarat umum rilis ini: snapshot Dashboard BMP **di-generate ulang** sesudah deploy (Tools › Snapshot BMP) — snapshot sebelum #428 sengaja tidak menampilkan data umur tanaman. Seed menu `platform-developer-issues` (+ VIEW/EXPORT) sudah dijalankan di env uji.

## #428 — Batas umur tanaman TBM < 3 thn, TM muda 3–8 thn

### TC-428-01 · Snapshot lama meminta generate ulang, snapshot baru berlabel batas baru [P0] [regresi] (4 mnt)
Prasyarat: login ADMIN/MANAGEMENT/SUPERADMIN; catat apakah snapshot BMP terbaru dibuat sebelum atau sesudah deploy v1.8.0.
Langkah:
1. Sebelum generate ulang (bila snapshot masih dari versi lama): Dashboard › BMP Dashboard (Produksi) → gulir ke card **Ex-Plasma vs Swadaya**.
2. Tools → generate ulang snapshot BMP; buka lagi Dashboard BMP.
3. Pada tabel **Produktivitas per Umur Tanaman**, ganti Tahun ke Rataan dan ke satu tahun lain.
Harapan:
- Langkah 1: tabel umur berisi pesan "…belum memuat data umur tanaman, atau masih memakai batas umur lama — generate ulang snapshot BMP…" (bukan angka berlabel baru).
- Langkah 2–3: baris berurutan "< 3 thn (TBM)", "3–8 thn (TM muda)", "9–15 thn (TM prima)", "16–25 thn (TM tua)", "> 25 thn (renta)" (+ "Tanpa thn tanam" bila ada); tak ada label "< 4" / "4–8".
Baseline dev: `dashboard-bmp.test.ts` (kunci `lt4`/`4-8` → data umur kosong; umur 3 → TM muda); smoke lokal 2026-10-13 snapshot 12/10 vs 08/10.

## #426 — Unduh Excel produktivitas per umur tanaman

### TC-426-01 · Excel produktivitas per umur tanaman [P0] [regresi] (5 mnt)
Prasyarat: TC-428-01 langkah 2 sudah dijalankan (snapshot baru); peran ber-EXPORT `dashboard-bmp` (ADMIN/MANAGEMENT/OPERATOR/SUPERADMIN). DONOR = N/A.
Langkah:
1. Dashboard BMP → pilih filter Kategori/Distrik apa saja → klik **Excel**.
2. Buka berkas yang terunduh.
Harapan:
- Tiga sheet: **Produktivitas**, **Luas terdata**, **Keterangan**.
- Sheet Produktivitas: kolom Distrik · Lembaga · Kategori Lembaga, lalu kelompok **Rataan** + tiap tahun, masing-masing 7 kolom: Semua umur · <3 th (TBM) · 3-8 th (TM Muda) · 9-15 th (TM Prima) · 16-25 th (TM Tua) · >25 th (Renta) · Tanpa thn tanam.
- Isi berkas memuat **semua Lembaga** dalam hak akses (filter dashboard diabaikan), ada subtotal Distrik/Kategori/Total.
- Angka "Semua umur" tahun terpilih = angka Lembaga yang sama di grafik Top 10 dashboard.
Baseline dev: `bmp-age-productivity-xlsx.test.ts`; uji snapshot nyata 32 Lembaga.

### TC-426-02 · Snapshot tanpa data umur → peringatan, bukan berkas kosong [P2] (2 mnt)
Prasyarat: snapshot BMP terbaru dibuat sebelum v1.8.0 (lewati = N/A bila sudah di-generate ulang).
Langkah:
1. Dashboard BMP → klik **Excel**.
Harapan:
- Muncul toast "Snapshot ini belum memuat data umur tanaman, atau masih memakai batas umur lama — generate ulang…"; tak ada berkas terunduh.

## #425 — Filter Semua Data / Data Full 1 Tahun dihapus

### TC-425-01 · Bar filter Dashboard BMP tanpa pilihan kelengkapan data [P1] (2 mnt)
Prasyarat: login peran apa pun yang membuka Dashboard BMP.
Langkah:
1. Dashboard › BMP Dashboard (Produksi) → periksa bar filter di header.
Harapan:
- Hanya ada Kategori · Distrik · Lembaga Petani · Tahun (+ Excel bila ber-EXPORT); tidak ada select "Semua Data / Data Full 1 Tahun" dan tidak ada label mode di bawah judul.
- Angka card dan grafik tampil normal tanpa galat.
Baseline dev: `dashboard-bmp.test.ts` (snapshot lama dengan subset Full dibuang saat dibaca).

## #427 — Tombol Reset filter seragam + filter Produksi dari URL

### TC-427-01 · Reset muncul hanya saat filter berubah dan mengembalikan bawaan [P1] [regresi] (5 mnt)
Prasyarat: login SUPERADMIN atau ADMIN.
Langkah:
1. Buka Master Data › Petani, Report › Lahan, dan Dashboard › Monev BMP satu per satu.
2. Di tiap halaman: pastikan tombol **↺ Reset** tidak tampil; ubah satu filter + ketik di Cari (juga coba Cari berisi spasi saja).
3. Klik **Reset**.
Harapan:
- Langkah 2: Reset tampil di ujung bar filter setelah filter diubah; Cari berisi spasi saja tidak memunculkan Reset.
- Langkah 3: semua filter kembali ke bawaan halaman, Cari kosong, Reset hilang; filter wajib (bila ada) tidak ikut dikosongkan.
Baseline dev: `filter-reset.test.ts`; smoke lokal 17 halaman 2026-10-13.

### TC-427-02 · Tautan Kalender Ketersediaan Produksi → filter Produksi terlihat [P1] (4 mnt)
Prasyarat: SUPERADMIN; satu Lembaga ber-produksi (mis. ICS-1401-01).
Langkah:
1. Data Analyst › Ketersediaan Data › Produksi → klik satu sel Lembaga × bulan yang berangka → tautan ke Master Data › Produksi.
2. Periksa bar filter; lalu klik **Reset**.
3. Tekan tombol **Back** browser lalu **Forward**.
Harapan:
- Langkah 1–2: Lembaga Petani dan Periode terisi sesuai sel (Distrik ikut), Reset tampil; jumlah baris sesuai sel. Setelah Reset semua bawaan, query hilang dari URL.
- Langkah 3: filter mengikuti URL masing-masing tanpa galat.

### TC-427-03 · Query URL rusak tidak meng-crash halaman Produksi [P2] (2 mnt)
Langkah:
1. Buka `/admin/master-data/production?search=a&search=b`.
2. Buka `/admin/master-data/production?farmerGroupId=TIDAK-ADA&period=2026-13`.
Harapan:
- Kedua halaman tampil normal; filter di bawaan (Cari kosong, Periode kosong), Reset tidak tampil; tak ada "Terjadi Kesalahan".
Baseline dev: `production-list-filters.test.ts` (temuan /code-review wrap-up v1.8.0).

## #424 (bagian kecil) — Penanda Estimasi dibuang

### TC-424-01 · Kalender Produksi & Kelengkapan Data tanpa penanda Estimasi [P2] (3 mnt)
Langkah:
1. Data Analyst › Ketersediaan Data › Produksi → lihat legenda penanda dan unduh Excel.
2. Data Analyst › Ketersediaan Data › Per Lembaga → pilih satu Lembaga.
Harapan:
- Legenda kalender hanya penanda 0 kg & TP (tanpa **E**); Excel Sheet 1 & 2 tanpa kolom "Record Estimasi".
- Kartu kualitas produksi tanpa baris "Record Estimasi".

## #429 — Platform Developer › Daftar Issue GitHub

### TC-429-01 · Daftar Issue memuat data GitHub di keempat tab [P1] (4 mnt)
Prasyarat: seed menu `platform-developer-issues` sudah dijalankan; server punya akses keluar ke `api.github.com`.
Langkah:
1. Login MANAGEMENT → Platform Developer › **Daftar Issue**.
2. Buka tab List, Kalender, Tren mingguan, Kanban.
3. Isi Cari dengan nomor issue (mis. `429`), lalu Reset.
Harapan:
- Baris ringkas "n issue · m terbuka · data GitHub per …" tampil; tanpa kotak peringatan kuning.
- Keempat tab tampil tanpa galat; Kanban berkolom dari label `status:*`.
- Cari `429` menyisakan issue #429; Reset mengembalikan semua.

### TC-429-02 · Unduh Excel hanya untuk peran ber-EXPORT [P1] (3 mnt)
Prasyarat: akun MANAGEMENT (punya EXPORT dari seed) dan, bila tersedia, akun ber-override revoke EXPORT menu ini.
Langkah:
1. MANAGEMENT membuka Daftar Issue → klik **Unduh Excel**.
2. Akun tanpa EXPORT membuka Daftar Issue.
Harapan:
- Langkah 1: berkas berkolom Date Solved (Close) · No Issue · Simple Desc · Date Created · Status sesuai filter yang tampil.
- Langkah 2: tombol **Unduh Excel** tidak tampil (halaman tetap terbuka). OPERATOR/DONOR = N/A (menu tidak terbuka).
Baseline dev: `menu-access.test.ts` (EXPORT hanya ADMIN/MANAGEMENT/SUPERADMIN). Catatan: EXPORT di sini **menyembunyikan tombol**, bukan penegakan server — berkas dibangun di browser dari data issue yang sama dengan List (data GitHub publik, diterima owner; TD-064).

### TC-429-03 · Kalender hanya memplot kejadian di dalam rentang Aktivitas [P2] (2 mnt)
Langkah:
1. Daftar Issue → isi Aktivitas `2026-10-01` s.d. `2026-10-05` → tab Kalender, bulan Oktober 2026.
Harapan:
- Tanda +n/✓n hanya pada tanggal 1–5 Oktober; issue yang dibuat di rentang tetapi ditutup sesudahnya tidak memunculkan ✓ di luar rentang.
- Isi rentang lampau (mis. Agustus 2026) lalu buka Kalender tanpa memilih bulan: kalender langsung terbuka di bulan akhir rentang (bukan bulan berjalan yang kosong); tombol **Bulan ini** tetap membawa ke bulan berjalan.
Baseline dev: `github-issues.test.ts` (`dailyActivity` dengan rentang).

### TC-429-04 · Mengetik cepat di Cari tidak memicu galat, URL menyusul [P2] (2 mnt)
Asal: `/code-review` penuh wrap-up 2026-10-14 (Safari melempar `SecurityError` bila `replaceState` > 100×/30 dtk).
Langkah:
1. Daftar Issue (sebaiknya di **Safari**) → ketik cepat ±40 karakter di Cari, hapus, ketik lagi beberapa kali.
2. Berhenti mengetik ±1 detik, lihat bilah alamat; lalu klik Reset.
Harapan:
- Daftar menyaring seketika saat mengetik; tidak ada galat di konsol / halaman tidak macet.
- Setelah berhenti, URL memuat `?q=<teks>`; Reset mengosongkan kotak Cari **dan** `q` di URL.

## #433 — Layer hutan & deforestasi (Kemenhut + EUDR/GFW)

### TC-433-01 · Peta Lahan: 9 overlay dalam dua kelompok, di bawah poligon lahan & label [P1] [regresi] (6 mnt)
Prasyarat: akun OPERATOR ter-scope; server staging bisa menjangkau `geoportal.planologi.kehutanan.go.id` dan `kspservices.big.go.id`; browser bisa menjangkau `tiles.globalforestwatch.org`.
Langkah:
1. Map › **Peta Lahan** → pilih Distrik dalam scope → **Muat Data**.
2. Buka **Peta Lainnya** → kelompok **Kemenhut / BIG** → centang **Penutupan Lahan 2025**; tunggu tile (server pemerintah bisa 2–10 dtk).
3. Geser **Transparansi** ke 100%.
4. Matikan, lalu buka kelompok **EUDR (Global Forest Watch)** → centang **Tutupan Hutan 2020 (JRC)**, lalu **Kehilangan Tutupan Pohon ≥ 2021**, lalu **Peringatan Deforestasi Terpadu** (satu per satu).
5. Ganti basemap ke **SAT**, lalu kembali ke **LIGHT**; nyalakan **Terrain 3D**.
Harapan:
- Dua kelompok terlipat bawaan; kelompok dan judul Peta Lainnya menampilkan chip **"n aktif"**.
- Poligon lahan (ungu), titik Lembaga, dan **nama tempat basemap** tetap terlihat **di atas** overlay, juga pada transparansi 100%.
- Tiap layer aktif menampilkan legenda + "Sumber: …"; layer GFW menampilkan catatan (JRC: "tidak mengikat secara hukum"; Kehilangan: "termasuk panen kebun/HTI"; Peringatan: **"bukan konfirmasi deforestasi"**).
- Kehilangan Tutupan Pohon hanya menampilkan bercak sejak 2021 (warna merah muda).
- Setelah ganti basemap & Terrain, overlay tetap tampil (boleh menunggu tile) dan hillshade tergambar; tidak ada galat merah di konsol.
Baseline dev: `map-overlays.test.ts` (definisi, urutan gambar, filter ≥ 2021); smoke lokal 2026-10-14 (Siak, LIGHT → SAT → LIGHT + Terrain).

### TC-433-02 · Peta Rantai Pasok: Peta Lainnya di panel & popover Lapisan, raster di bawah garis alir [P1] (4 mnt)
Langkah:
1. Map › **Peta Rantai Pasok** → buka bagian **Peta Lainnya** di panel → centang **Deforestasi 2023–2024** (Kemenhut) dan **Tutupan Hutan 2020 (JRC)**.
2. Klik tombol **Lapisan** (kanan atas) → lihat bagian Peta Lainnya di popover → matikan JRC dari popover.
3. Muat ulang halaman.
Harapan:
- Garis alir, titik Lembaga/Mill, dan label nama tetap **di atas** overlay.
- Popover dan panel menunjukkan status centang yang sama; kelompok yang punya layer aktif terbuka; judul bagian panel terlipat menunjukkan "n aktif".
- Atribusi peta di kanan bawah memuat sumber layer aktif.
- Sesudah muat ulang semua overlay mati (pilihan tidak diingat — sesuai Bantuan p-17).

### TC-433-03 · Tile Kemenhut dijaga izin peta [P2] (3 mnt)
Prasyarat: akun uji dengan override **revoke `map-parcel` VIEW** (tetap punya `map-supply-chain`), bila tersedia; akun tanpa kedua izin peta (mis. role ber-override revoke keduanya).
Langkah:
1. Akun "hanya `map-supply-chain`" membuka Peta Rantai Pasok → nyalakan **Kawasan Hutan**.
2. Pada tab yang sama buka `/api/map-overlay/kawasanHutan?bbox=11286627,-55659,11325763,-16523`.
3. Buka URL yang sama dengan akun tanpa kedua izin peta, lalu dengan key `jrcForest2020`.
Harapan:
- Langkah 1–2: tile tampil / gambar PNG (200).
- Langkah 3: **403** untuk akun tanpa izin; key GFW → **404** (GFW tidak lewat proxy, dimuat langsung).
- Header respons tile: `Cache-Control: private, …` (bukan `public`).
Baseline dev: `map-overlay-route.test.ts` (guard OR, memo izin, whitelist 6 key ArcGIS, GFW 404, cache `private`). Catatan: pencabutan izin berlaku paling lambat 60 detik (memo izin per pengguna, pola `/api/map-basemap`).

### TC-433-04 · Tambah Data GIS Lain tetap di bawah poligon lahan [P2] (3 mnt)
Asal: `/code-review` penuh wrap-up 2026-10-14 (layer pengguna sempat menutupi lahan & label).
Langkah:
1. Peta Lahan → Muat Data satu Distrik.
2. **Tambah Data GIS Lain** → WMS URL: `https://tiles.globalforestwatch.org/jrc_global_forest_cover/latest/dynamic/{z}/{x}/{y}.png?implementation=default` → tambahkan.
3. Ganti basemap ke SAT lalu kembali ke LIGHT.
Harapan:
- Layer tambahan tergambar **di atas** overlay referensi tetapi **di bawah** poligon lahan, titik Lembaga, dan nama tempat basemap — juga sesudah ganti basemap.
