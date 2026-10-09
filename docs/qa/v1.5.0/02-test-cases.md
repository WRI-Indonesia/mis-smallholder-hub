# 02 · Kasus uji per issue — v1.5.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Satu **blok** per kasus. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

## #317 Fase 3 — Peringatan tumpang tindih saat upload lahan

### TC-317-03 · Peringatan muncul, simpan tidak diblokir [P0] [regresi] (4 mnt)
Prasyarat: TC-PREP-01 · akun OPERATOR ter-scope.
Langkah:
1. Bulk Upload › Lahan → unggah ZIP TC-PREP-01, pilih Lembaga.
2. Tunggu pengecekan tumpang tindih selesai.
Harapan:
- Pill kuning **Tumpang Tindih (N)** + filter; baris bermasalah berbadge **Peringatan**, kolom Keterangan menyebut lahan lawan, jenis (Duplikat/Tercakup/Sebagian), dan % irisan.
- Peta pratinjau: poligon bermasalah berisi kuning; popup mencantumkan peringatannya.
- Tombol Simpan **tetap aktif** (peringatan, bukan galat). Jangan disimpan.

### TC-317-04 · Lawan di luar scope disamarkan [P0] (2 mnt)
Langkah:
1. Pada berkas yang sama, lihat Keterangan untuk poligon salinan dari Lembaga luar scope.
Harapan:
- Tertulis "lahan terdaftar di {Lembaga} (di luar wilayah akses Anda)" — **tanpa** ID Lahan/nama petani lawan.
- Dengan akun SUPERADMIN (berizin Tumpang Tindih Lahan) identitas lawan tampil lengkap.

### TC-317-05 · Excel hasil validasi memuat kolom peringatan [P1] (2 mnt)
Langkah:
1. Unduh Excel hasil validasi upload, buka di Excel.
Harapan:
- Kolom **Peringatan Tumpang Tindih** terisi sama dengan Keterangan di layar; baris tanpa tumpang tindih kosong.

## #290 — Latar satelit GIBS di Fire Alert

### TC-290-01 · Tombol GIBS + tanggal + atribusi [P0] [regresi] (3 mnt)
Langkah:
1. Fire Alert, rentang 5 hari → klik **GIBS** (tombol kanan-bawah).
Harapan:
- Citra satelit tampil (bukan hitam), poligon lembaga & titik api tetap ada, label putih.
- Chip "Citra GIBS: {tanggal} · VIIRS NOAA-20, 250 m"; tanggal = tanggal WIB titik api terbaru (paling lambat hari ini setelah ± 17.00 WIB, sebelum itu kemarin).
- Atribusi peta memuat "NASA GIBS".

### TC-290-02 · Tanggal ikut rentang/bulan [P1] (2 mnt)
Langkah:
1. GIBS aktif → Bulan tertentu → pilih bulan lampau.
Harapan:
- Chip berganti ke tanggal titik api terbaru bulan itu (tanpa titik api → hari terakhir bulan); tidak ada tanggal bulan lama yang tertinggal saat memuat.

### TC-290-03 · Ganti latar tidak menghilangkan poligon [P0] [regresi] (2 mnt)
Langkah:
1. Muat ulang halaman (latar Light) → **Dark** → **GIBS** → **SAT** → **Light**.
Harapan:
- Di setiap latar poligon lembaga, garis kabupaten, dan titik api tetap tampil; konsol tanpa "Cannot add layer … before non-existing layer".

## Produktivitas disetahunkan (owner 2026-10-08)

### TC-PROD-01 · BMP Dashboard Ton/Ha/tahun [P0] [regresi] (3 mnt)
Langkah:
1. Dashboard › BMP, Tahun = tahun berjalan.
Harapan:
- Kartu Produktivitas "… Ton/Ha/tahun" + sub "produksi disetahunkan ÷ luas lahan terdata"; Total Produksi tetap angka tercatat.
- Top 10 bersatuan Ton/Ha/tahun, catatan rumus × 12 ÷ bulan ber-data.
Baseline dev: mis-dev (snapshot 2026-09-18) 2026 — ITM 22,35 · APKASAIBER 21,80 · PPKSS TBR 16,28 · FORTASKI 12,95.

### TC-PROD-02 · Peta BMP sama dengan dashboard [P0] (3 mnt)
Langkah:
1. Peta BMP → Lembaga ITM (KPUD Intan Makmur) → Muat Data → layer Produktivitas, Tahun berjalan.
2. Klik satu persil hijau.
Harapan:
- Judul layer & legenda "Ton/Ha/tahun"; popup "… Ton/Ha/tahun" + Bulan Terdata n/12.
- Cetak PDF/Excel produktivitas: header & kolom "(Ton/Ha/tahun)".
Baseline dev: lahan `ITM.0033.A.14.06.06.2017` 2026 = 23,20 (ITM ber-data 7 bulan).

### TC-PROD-03 · Detail Petani/Lahan/Lembaga konsisten [P0] (3 mnt)
Langkah:
1. Buka detail Petani pemilik lahan TC-PROD-02 → tab Produksi; lalu detail Lahan yang sama → tab Produksi.
Harapan:
- Kartu Produktivitas Terakhir, kolom **Ton/Ha/thn** tab Petani, dan kolom tab Lahan sama dengan popup Peta BMP (baseline dev 2026 23,20 · 2025 19,95 · 2024 16,36).
- Detail Lembaga: kolom Ton/Ha/thn ada, tooltip "produksi disetahunkan".

### TC-PROD-04 · PDF Profil Petani & Profil Lahan [P1] (3 mnt)
Langkah:
1. Detail Petani → Profil Petani (PDF, Lengkap). Buka PDF.
Harapan:
- Kartu PRODUKTIVITAS: angka + sub "Ton/Ha/tahun · terakhir {tahun}" (tidak terpotong "…").
- Tabel produksi Bagian A dan lampiran Profil Lahan sama-sama "Ton/Ha/thn" dengan angka yang sama untuk lahan & tahun yang sama.

### TC-PROD-05 · Card Ex-Plasma vs Swadaya [P1] (2 mnt)
Langkah:
1. Dashboard › BMP, gulir ke card Ex-Plasma vs Swadaya.
Harapan:
- Kotak ringkasan berlabel kecil Ex-Plasma/Swadaya di bawah angka.
- Dua tabel: **Produktivitas per Distrik** dan **per Umur Tanaman** (Ton/Ha/tahun), kolom Ex-Plasma · Swadaya, angka + mini bar; "—" untuk tanpa data + catatan artinya; tooltip sel = luas terdata.

## #402 (lanjutan) — Sheet Detail Training Benefit

### TC-402-04 · Excel 3 sheet, Detail per petani [P0] (3 mnt)
Langkah:
1. Dashboard › Pelatihan → Training Benefit → Excel. Buka berkasnya.
Harapan:
- Sheet **Capaian · Kontrak · Detail**. Detail: Distrik · Lembaga · ID Petani · Gender · P1 · P2-GroupDynamic · P2-HSE · P3&4; tahun > 1 dipisah `; `, belum dilatih `-`.
- Jumlah sel bertahun per paket = Kumulative tahun berjalan (baseline dev P1 8.279); baris = petani aktif (dev 8.863).

## #381 — Prototipe Rantai Pasok

### TC-381-01 · Popup Mill & istilah TBS [P2] (2 mnt)
Prasyarat: CSV prototipe ada di bucket env.
Langkah:
1. Peta Rantai Pasok → klik Mill pemasok UL; buka panel filter lalu klik Mill di dekat tepi kiri.
Harapan:
- Header popup: nama (maks 2 baris) + badge **UL** + Distrik; tanpa baris Status/Program buyer.
- Popup tidak tertutup panel (peta bergeser); popup bisa digeser.
- Dashboard Rantai Pasok: istilah "TBS" (tanpa "dideklarasikan"), kolom Distrik di Volume per Mill.

## #319 · #315 · #310 — kerapian

### TC-319-01 · Laporan Lahan tetap memuat; cakupan tercetak benar [P0] [regresi] (3 mnt)
Langkah:
1. Report › Lahan → pilih Lembaga → Cakupan **Semua lahan**, lalu **Sudah didata**.
2. Unduh Excel untuk keduanya.
Harapan:
- Laporan memuat di kedua cakupan; header Excel "Cakupan Pendataan" sesuai pilihan; persen kartu tidak > 100%.

### TC-315-01 · Filter peta [P1] (2 mnt)
Langkah:
1. Peta Lahan: Distrik* → pilih; Lembaga → pilih lalu **Semua Lembaga Petani**. Peta BMP: Lembaga Petani*.
Harapan:
- Label + tanda `*` merah; popover selebar trigger; "Semua …" di puncak daftar (tersembunyi saat mengetik, muncul lagi saat kotak cari kosong).

### TC-310-01 · Upload daftar peserta: status ERROR tidak tersimpan [P1] (3 mnt)
Langkah:
1. Master Data › Pelatihan › satu sesi → Tambah Peserta → Upload List Peserta → Template Excel.
2. Isi 3 baris: ID valid; ID valid yang **sudah ikut paket sama** dengan Nilai Pre-Test 150; ID tak dikenal. Unggah.
Harapan:
- Baris 2 = **ERROR** (bukan WARNING) "Nilai Pre-Test harus berupa angka 0-100…"; baris 3 ERROR "ID Petani tidak ditemukan…".
- Tombol "Tambahkan 1 Peserta". Bantuan `t-3` cocok dengan layar.

## Lainnya

### TC-BMP-01 · Import form survei Kampar terbaca [P2] (3 mnt)
Langkah:
1. Master Data › Monev BMP → Import form survei → 1 berkas form Kampar (sheet individu bernama petani).
Harapan:
- Pratinjau membaca 18 indikator individu (bukan 0) + peringatan nama sheet yang dibaca; nama berkas alias ("A_B") dicocokkan.

### TC-MAP-01 · Ganti latar di peta lain [P1] (2 mnt)
Langkah:
1. Peta Lahan & Peta BMP (data dimuat): Light → Dark → SAT → Hybrid → Light.
Harapan:
- Poligon tetap tampil di tiap latar; konsol tanpa "before non-existing layer".
