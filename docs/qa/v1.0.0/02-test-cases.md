# 02 · Kasus uji per issue — v1.0.0

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

> **Baca dulu — dua hal yang membuat angka berbeda dari v0.38.0, keduanya disengaja:**
> 1. Jumlah titik api **naik tipis** di Fire Alert dan Peta Lahan (#280 menutup celah 9,4 km² antar-kabupaten). Jangan dilaporkan sebagai regresi.
> 2. Tabel titik api **dipotong pada 500 baris** di modal Ringkasan dan PDF (#286). Potongan selalu disertai keterangan; **tidak ada keterangan padahal terpotong = Fail**.

## #280 — Klip titik api ke outline Riau ter-union

### TC-280-01 · `geom` kabupaten terisi di lingkungan uji [P0] [regresi] (2 mnt)
Prasyarat: akses baca DB lingkungan yang diuji.
Langkah:
1. Jalankan baca-saja: `SELECT count(*) FILTER (WHERE geom IS NOT NULL) AS ber_geom, count(*) AS total FROM tbl_administrative_boundary WHERE is_active AND level='KABUPATEN';`
Harapan:
- `ber_geom` = `total` = **12**.
- **Kalau kurang dari 12 → Fail dan hentikan rilis.** `getRiauOutline()` akan mengembalikan `null` dan kedua halaman titik api **diam-diam kembali ke perilaku lama tanpa pesan galat apa pun** — perbaikan #280 tidak aktif dan tak ada yang tahu.

Baseline dev: `mis-dev` 12/12 ✓, outline 84 polygon / 75 kB.

### TC-280-02 · Angka titik api Fire Alert = Peta Lahan untuk rentang yang sama [P0] [regresi] (6 mnt)
Prasyarat: login SUPERADMIN; rentang **5 hari**.
Langkah:
1. Buka **Dashboard → Fire Alert**, catat angka **Total titik se-Riau** pada kartu ringkasan.
2. Buka **Peta → Peta Lahan**, muat data satu Distrik, centang **Tampilkan titik api**, pilih rentang **5 hari**.
3. Bandingkan jumlah titik di legenda dengan angka langkah 1.
Harapan:
- Kedua angka **sama persis**. Keduanya memakai pemangkas yang sama (`getRiauOutline`); kalau berbeda, salah satu halaman jatuh ke fallback poligon kabupaten.
- Tidak ada galat di konsol.

### TC-280-03 · Outline gagal → titik tetap tampil, bukan peta kosong [P2] (4 mnt)
Prasyarat: kemampuan mematikan jaringan sesaat / DevTools throttling.
Langkah:
1. Buka Peta Lahan, muat data, nyalakan layer Titik Api.
2. Ulangi dengan memaksa `getRiauOutline` gagal (mis. blokir request server action di DevTools).
Harapan:
- Titik api **tetap tampil apa adanya** (fallback disengaja), bukan peta kosong dan bukan halaman galat.

## #365 — Laporan bulanan titik api

### TC-365-01 · Mode Bulan memuat arsip & menyebut sumbernya [P0] (5 mnt)
Prasyarat: login dengan izin `dashboard-risk-fire` VIEW.
Langkah:
1. Buka **Fire Alert**, pilih **Bulan tertentu (laporan bulanan)**.
2. Pilih **Januari** **2025**.
Harapan:
- Peta, kartu, dan tabel terisi untuk rentang 1–31 Januari 2025.
- Muncul keterangan **sumber FIRMS** yang dipakai.
- Bila ada tanggal yang tidak tersedia, muncul daftar **"N tanggal belum tersedia di FIRMS"** — angka 0 pada tanggal itu **bukan** berarti tidak ada api.

### TC-365-02 · Tiga angka "Dalam Boundary" harus konsisten dalam satu PDF [P0] [regresi] (10 mnt)
Prasyarat: izin PRINT pada Fire Alert; mode Bulan aktif pada bulan yang punya titik di dalam boundary.
Langkah:
1. Pilih cakupan **Full Riau**, klik **Cetak Laporan Bulanan (PDF)**. Simpan.
2. Ganti cakupan ke **satu Distrik**, cetak lagi pada **bulan yang sama**.
3. Buka PDF **per Distrik**. Jumlahkan kolom **Dalam Boundary** pada tabel **Tren Harian**.
Harapan:
- Hasil penjumlahan langkah 3 **sama persis** dengan kolom `Dalam Boundary` pada **Rekap per Kabupaten** *dan* dengan angka **Dalam Boundary** pada kartu ringkasan di dokumen yang sama.
- Ini temuan review yang diperbaiki di rilis ini: sebelumnya Tren Harian memakai aturan poligon sementara kartu memakai aturan kepemilikan, sehingga ketiganya bisa berbeda. **Selisih berapa pun = Fail.**
- Catatan sah: total Full Riau **tidak** harus sama dengan jumlah semua distrik (titik di celah antar-kabupaten dan kabupaten non-program).

### TC-365-03 · Ganti bulan setelah gagal tidak meninggalkan keterangan basi [P1] (4 mnt)
Prasyarat: DevTools untuk memaksa `/api/map-hotspot` gagal.
Langkah:
1. Mode Bulan → pilih bulan A yang berhasil; perhatikan keterangan sumber & daftar tanggal kosong.
2. Blokir `/api/map-hotspot`, lalu pilih bulan B.
Harapan:
- Setelah bulan B gagal, keterangan sumber dan daftar tanggal kosong **milik bulan A hilang** — tidak tertinggal di bawah label bulan B.
- Muncul notifikasi gagal memuat; tombol cetak tidak mengeluarkan dokumen kosong.

## #286 — Batas baris tabel titik api

### TC-286-01 · Modal Ringkasan memotong pada 500 baris + menyebut sisanya [P1] (5 mnt)
Prasyarat: Peta Lahan; rentang **30 hari** pada periode yang titiknya banyak (musim kering).
Langkah:
1. Muat data Distrik, nyalakan **Titik Api**, rentang **30 hari**.
2. Tunggu modal **Ringkasan Titik Api** terbuka, gulir tabel sampai bawah.
Harapan:
- Bila titik < 15 km lebih dari 500: tabel berhenti di **500 baris**, dan di bawahnya ada keterangan **"Menampilkan 500 baris terdekat dari N titik … M lainnya tidak ditampilkan"**.
- Baris yang ditampilkan adalah yang **terdekat**, bukan acak.
- Bila ≤ 500: tidak ada keterangan potongan sama sekali.
- Tab **tidak membeku**; modal tetap bisa digulir.

### TC-286-02 · PDF titik api mencetak keterangan potongan di dokumennya sendiri [P1] [regresi] (5 mnt)
Prasyarat: sama dengan TC-286-01, izin PRINT.
Langkah:
1. Dari modal, klik **Cetak PDF**. Buka berkasnya.
Harapan:
- Header PDF menyebut **"Tabel dipotong pada 500 baris pertama; N titik lainnya tidak dicetak — unduh SHP untuk data lengkap"** bila memang terpotong.
- Keterangan itu **tidak menimpa** header tabel — tabel turun mengikuti tinggi keterangan.
- Tidak ada kalimat yang saling menyangkal (mis. "tabel memuat semua titik" berbarengan dengan keterangan potongan).
- **Unduh SHP** tetap memuat **seluruh** titik, tanpa potongan.

## Lintas-issue

### TC-V1-01 · Cakupan tutorial Bantuan 37/37 [P2] (3 mnt)
Langkah:
1. Buka **Bantuan**, pastikan bab **Laporan & Perawatan** memuat *Menyusun roster anggota per Kelompok Tani* dan *Membuat & menelusuri Snapshot BMP*.
2. Buka **Report → Kelompok Tani (Detail)** dan **Tools → Dashboard Snapshot BMP**, klik tombol **Panduan** (ikon `?`) di sebelah judul.
Harapan:
- Tombol Panduan membuka tutorial **menu itu sendiri**, bukan tutorial menu tetangga (sebelumnya masing-masing menunjuk Ringkasan KT dan Dashboard Snapshot biasa).
