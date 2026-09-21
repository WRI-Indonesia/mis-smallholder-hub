# 02 · Kasus uji per issue — v0.37.0

Satu **blok** per kasus; hasil di `runs/`. Dijalankan sebagai **SUPERADMIN** kecuali disebut lain (kasus scope: OPERATOR ter-scope Rokan Hulu / DONOR). Data uji memakai **kode Lembaga** (lihat `00-scope.md` TC-PREP-03), bukan nama orang.

`Baseline dev` = `mis-dev` snapshot prod 2026-09-18 + migrasi #353 E + seed menu 2026-09-21: 32 Lembaga · Skor Keseluruhan 61 · distribusi band 2 kritis / 28 perlu perhatian / 2 baik / 0 penuh · 12.893 temuan; KUD Karya Sembada Index 51 (Profil 100 · Petani 62,4 · Lahan 60 · Pelatihan 53,6 · Produksi 0).

## #352 — Ketersediaan Data — Semua Lembaga (DA-03)

### TC-352-01 · Hero: skor, distribusi band, aksi lintas Lembaga [P0] (3 mnt)
Langkah:
1. Data Analyst › **Ketersediaan Data — Semua Lembaga** (sidebar order 2)
2. Klik segmen merah "kritis" di distribusi band → URL `?band=bad`; klik lagi / "hapus filter band"
Harapan:
- Cincin Skor Keseluruhan = **61** label "50 – <80 — perlu perhatian"; distribusi 2 / 28 / 2 / 0 (pil band kosong nonaktif); 3 angka (32 Lembaga · 8.863 petani · 14.003 persil)
- Band kritis → matriks/radar hanya 2 Lembaga (KUD Bumi Asih, Kepau Jaya); aksi lintas Lembaga & panel anomali mengikuti irisan yang sama; lepas → kembali 32

### TC-352-02 · Kartu domain mengurutkan matriks; Radar = tampilan bawaan [P0] (3 mnt)
Langkah:
1. Klik kartu **Produksi** → URL `?urut=produksi`; klik lagi → `urut` hilang
2. Tab **Heatmap** → klik kartu **Lahan** → tab tetap Heatmap; tab **Cakupan modul** → klik kartu → kembali ke Radar
Harapan:
- Kartu aktif ber-ring + "matriks diurut domain ini"; kartu Produksi: 8,5 % · 753 / 8.863 petani ber-produksi · 26 kritis
- Radar bawaan tanpa parameter; `?tampilan=heatmap` / `?tampilan=modul` tersimpan di URL; `?tampilan=inti` (bookmark lama) membuka Heatmap

### TC-352-03 · Radar: grid, urut, cari, Ringkas [P1] (3 mnt)
Langkah:
1. Pilih **Urut: Nama**, tombol arah, ketik `siak` di kotak cari, hapus; tekan **Ringkas**
Harapan:
- Grid berurut nama A→Z / Z→A (`?urut=name&arah=turun`); cari menyaring nama/kode/distrik; Ringkas → 10 kartu + teks "(urut … menaik)"; ketik **satu spasi** di kotak cari **tidak** menghilangkan tombol Ringkas

### TC-352-04 · Modal radar: kiri grafik, kanan tabel kontribusi, ◀ ▶ [P0] (4 mnt)
Langkah:
1. Klik grafik kartu **KUD Karya Sembada** → modal; **Berikutnya** ×2, **Sebelumnya** ×1; tombol panah keyboard; Esc
2. Buka lagi, klik **Buka daftar kerja**
Harapan:
- Judul + Skor Total 51 + band; deskripsi `ISH-1401-02 · Kampar · Ex-Plasma · 315 petani · 382 persil · 778 temuan`; tabel Domain · Bobot · Skor · Kontribusi (Profil 10/10 · Petani 15,6/25 · Lahan 15/25 · Pelatihan 10,7/20 · Produksi 0/20) · Skor Total 51/100 + catatan pembulatan ±0,5
- Footer "n / 32 pada urutan aktif"; navigasi mengikuti urutan grid; saat Esc **tidak** berkedip kosong; panah saat modal tertutup tidak mengubah apa pun
- Daftar kerja → Per Lembaga dengan Lembaga terpilih

### TC-352-05 · Heatmap: warna kontinu, angka terbaca, lebar kolom tetap [P1] (3 mnt)
Langkah:
1. Tab Heatmap; klik judul kolom **Petani** (menaik) lalu lagi (menurun); klik kartu domain lain
Harapan:
- Sel oranye (skor 22–42) berteks **hitam**, sel merah/hijau tua berteks putih; legenda ramp 0→99 dengan garis 50 & 80 + swatch "100 — lengkap penuh"
- Lebar kolom **tidak bergeser** saat urutan berubah (`table-fixed`); semua 32 baris tampil; "Ringkas — 10 baris pertama saja"

### TC-352-06 · Cakupan modul: sel bergaris, ✓/✗ tingkat Lembaga, portfolio [P1] (2 mnt)
Langkah:
1. Tab Cakupan modul; urutkan kolom **NKT**; hover sel "—"
Harapan:
- Baris "Semua Lembaga (irisan)" = Σ atas Lembaga yang berlaku; "—" bergaris = belum dimulai (tooltip "keluar dari penyebut"); boundary/acuan/penilaian Lembaga tampil ✓/✗; skala warna sama dengan heatmap

### TC-352-07 · Paling tertinggal per domain & panel anomali [P1] (3 mnt)
Langkah:
1. Baca 5 kolom laggards; klik 1 nama → Per Lembaga
2. Panel Anomali Terbanyak: klik label di "Kolom belum pernah diisi" → Per Lembaga terdampak terbanyak
Harapan:
- Laggards tanpa Lembaga 0 petani (KUD Bumi Asih hanya di Profil); baris 100 % tidak ikut; "≥ 95 % kosong" pada judul seksi sistemik = konstanta registri
- Deep link membawa `?lembaga=` yang benar

### TC-352-08 · Filter Distrik/Kategori/Lembaga & URL; filter tak valid diabaikan [P1] (2 mnt)
Langkah:
1. Distrik = Rokan Hulu, Kategori = Swadaya → salin URL → tab baru; ubah Distrik → band ter-reset
2. Ubah URL manual `?distrik=zzz`
Harapan:
- Hero/kartu mengikuti irisan; `?lembaga=` yang tidak lagi masuk irisan di-reset; `zzz` diabaikan (32 Lembaga), tanpa error konsol

### TC-352-09 · Excel Semua Lembaga [P1] (2 mnt)
Prasyarat: EXPORT; izin unduh browser.
Langkah: **Excel** → buka berkas.
Harapan:
- Sheet **Kelengkapan Inti** (Lembaga, Kode, Distrik, Kategori, Petani, Persil, 5 skor, Skor Total, Temuan) + **Cakupan Modul** (% id-ID koma / "belum dimulai"); jumlah baris = irisan tampil

### TC-352-10 · Scope OPERATOR di Semua Lembaga [P0] (3 mnt)
Peran: OPERATOR (Rokan Hulu).
Langkah:
1. Buka Semua Lembaga; filter Distrik hanya menawarkan Rokan Hulu; buka `?lembaga=<id Lembaga Kampar>` manual
Harapan:
- Hanya Lembaga Rokan Hulu (10); aksi lintas Lembaga & anomali sistemik hanya dari Lembaga itu; `?lembaga=` di luar scope diabaikan (bukan error, bukan data bocor)

### TC-352-11 · Menu DONOR: Semua Lembaga tidak tampil; Per Lembaga sesuai izin [P0] (1 mnt)
Peran: DONOR.
Langkah: sidebar Data Analyst; buka URL `/admin/data-analyst/data-availability` manual.
Harapan:
- DONOR **tanpa** "Ketersediaan Data — Semua Lembaga" (keputusan #193); URL manual → redirect/ditolak; Per Lembaga mengikuti `role-permissions.csv` (cek Settings › Roles).

## #352 — Ketersediaan Data — Per Lembaga (DA-02)

### TC-352-12 · Analisa otomatis & deep link; header Index + radar [P0] (3 mnt)
Langkah:
1. Sidebar order 3 → pilih Distrik Kampar → Lembaga **KUD Karya Sembada** (analisa otomatis, tombol "Muat ulang")
2. Salin URL `?lembaga=…` → tab baru
Harapan:
- Header: nama + kode kiri; angka **51** + label band + radar berangka (Profil 100 · Petani 62,4 · Lahan 60 · Pelatihan 53,6 · Produksi 0); tanpa kartu domain; tombol Excel di ujung
- Tab baru langsung teranalisa; hover angka/radar → tooltip "Index = Σ (skor domain × bobot)"

### TC-352-13 · Label sumbu radar = tautan ke seksi (mouse & keyboard) [P0] (2 mnt)
Langkah:
1. Klik label **Petani 62,4** → seksi Petani terbuka & tergulir
2. Tab dari kotak Lembaga sampai fokus di label sumbu → Enter
Harapan:
- Kedua cara membuka seksi; label ber-`aria-label` "Buka seksi …"; judul seksi memuat chip **bobot 25 % Index**; hover badge skor seksi → rumus domain

### TC-352-14 · Prioritas perbaikan & checklist per domain [P0] (4 mnt)
Langkah:
1. Baca panel Prioritas (6 tindakan, "+n poin"); klik label #1 → seksi
2. Seksi Petani: buka baris **Petani tanpa alamat** (sistemik) dan **Petani tanpa NIK**
3. Seksi Pelatihan: buka baris tingkat Lembaga (bila ada, mis. Lembaga tanpa aktivitas) → "Perbaiki lewat" tampil walau tanpa rincian
Harapan:
- Prioritas #1 "Petani tanpa data produksi +20 poin" (KUD Karya Sembada; format id-ID tanpa desimal nol); Σ Δ konsisten dengan bobot
- Baris sistemik: teks "≥ 95 % … kosong", FixHint `Bulk Upload › …`, rincian lengkap di Excel; baris per entitas: tabel bertautan Detail Petani/Lahan
- Chip jenis Inti/Lapangan/Validitas/Relasi/Kualitas/Modul; "bobot 1/6" pada check inti Petani

### TC-352-15 · Check kualitas informatif tidak mengubah Index [P1] (2 mnt)
Langkah:
1. Seksi Petani: baris **Tanggal lahir tidak cocok dengan NIK**, **Jenis kelamin …**; seksi Lahan: **Luas kolom ≠ poligon**, **Persil di luar boundary ICS**
Harapan:
- Berchip **Kualitas**, tanpa bobot, tidak masuk skor (skor domain = nilai baseline); rincian bertautan; KUD Karya Sembada "Di Luar Boundary ICS" = 0

### TC-352-16 · Kartu Lahan "Persil kena NKT" = INCLUDED + AFFECTED [P0] [regresi] (2 mnt)
Asal: review pra-rilis (kartu mengabaikan status legacy INCLUDED).
Langkah: pilih **KPUD Intan Makmur** (`ISH-1406-02`) → seksi Lahan.
Harapan:
- Kartu **Persil kena NKT = 91** = angka KPI NKT di Master Data › Lembaga Petani › Detail dan legenda "Lahan terdampak NKT" Peta Lahan Rokan Hulu (satu definisi)

### TC-352-17 · Per Kelompok Tani & cakupan paket pelatihan [P1] (2 mnt)
Langkah: seksi Lahan → tabel Per Kelompok Tani; seksi Pelatihan → 4a/4b/4c.
Harapan:
- Tabel KT: petani · persil · luas (koma id-ID) · skor Lahan/Petani · persil berproduksi (%); matriks paket + petani belum lengkap; angka persen berkoma

### TC-352-18 · Excel Per Lembaga: sheet & lokal angka [P1] (2 mnt)
Prasyarat: EXPORT; izin unduh.
Langkah: **Excel** → buka berkas.
Harapan:
- Sheet Ringkasan (Index, skor domain **berkoma**), Prioritas, Checklist (+modul, kolom Perbaiki lewat), Per Kelompok Tani, Cakupan Modul, domain & pelatihan; tidak ada kolom kosong sistematis; satu unduhan satu lokal (tidak campur `87.5%`/`87,5%`)

### TC-352-19 · Kartu KPI Detail Lembaga → Per Lembaga [P1] (1 mnt)
Langkah: Master Data › Lembaga Petani › **KUD Karya Sembada** → kartu skor kelengkapan.
Harapan:
- Angka 51 warna band + "50 – <80 — perlu perhatian · lihat analisa →"; klik → Per Lembaga `?lembaga=` teranalisa; skor identik

### TC-352-20 · Scope OPERATOR di Per Lembaga: `?lembaga=` di luar akses [P0] (2 mnt)
Peran: OPERATOR (Rokan Hulu).
Langkah: buka `?lembaga=<id KUD Karya Sembada (Kampar)>` manual; lalu pilih Lembaga Rokan Hulu.
Harapan:
- Pesan "Lembaga Petani pada tautan ini tidak ditemukan atau di luar akses Anda" (bukan data); dropdown hanya Lembaga Rokan Hulu; ganti Lembaga cepat dua kali → **tidak** ada toast error milik request lama

### TC-352-21 · Bantuan: tutorial a-1, p-6, referensi r-5 [P1] (2 mnt)
Peran: DONOR (baca-saja).
Langkah: Bantuan › cari "radar" dan "bobot"; buka a-1, p-6, r-5; klik tombol "Buka …" di p-6.
Harapan:
- Ketiganya render tanpa 404; teks menyebut Radar/Heatmap/Cakupan modul, angka Index + radar, label sumbu bisa diklik, bobot di judul seksi, band "80 – <100"; tombol menuju halaman; DONOR tetap bisa membaca dengan banner "Menu ini di luar hak akses akun Anda" (desain Bantuan: tutorial di luar hak akses boleh dibaca, diberi keterangan)

## #353 — Audit dead code (bagian E: skema)

### TC-353-01 · Migrasi E & data tidak berubah [P0] (1 mnt)
Langkah: `npx tsx scripts/qa/data-qc.ts --section A,B,F`.
Harapan: A1 0 pending (38 applied) · B1–B4 = run sebelum · F1 ✓ · F2 ✓ (enum & kolom hilang)

### TC-353-02 · Bulk Upload › Pohon masih bisa validasi tanpa kolom tanggal [P1] (2 mnt)
Prasyarat: shapefile pohon kecil dari `scripts/local/QA-QC/` (bila ada; bila tidak → Blocked).
Langkah: Bulk Upload › Pohon → unggah → validasi.
Harapan: kontrak DBF `parcel_id/tree_id/lon/lat/category/vigor/source/model_ver` tetap diterima; tanpa error kolom `surveyed_at`

## #350 — Filter Status & Select

### TC-350-01 · Pemicu filter Status menampilkan label [P1] [regresi] (2 mnt)
Langkah: Master Data › Petani · Lembaga · Pelatihan · Lahan · Produksi · Monev BMP; Settings › Regions — pilih **Nonaktif**, **Semua Status**, **Aktif**.
Harapan: pemicu bertuliskan **Aktif / Nonaktif / Semua Status** (bukan `active`); daftar mengikuti pilihan (Nonaktif menampilkan baris nonaktif)

### TC-350-02 · Select lain: distrik Komparasi Acuan, filter Lahan produksi, form Lahan/Surat/STDB [P2] (3 mnt)
Langkah: Komparasi Data Acuan → pilih distrik; Master Data › Produksi → filter Lahan **Terpetakan**; form Ubah Lahan → Status Kepemilikan; form surat tanah → Jenis Surat; form STDB → Tahap.
Harapan: pemicu menampilkan **nama distrik** (bukan id), "Terpetakan" (bukan `true`), label Bahasa Indonesia untuk status/jenis/tahap

## #288 — DevX (dijalankan dev)

### TC-288-01 · Gate 5 langkah [P2] (3 mnt)
Langkah: `npm run lint && npm run typecheck && npm test && npm run build`; ubah `TZ` shell ke `America/New_York` lalu `npm test`.
Harapan: semua hijau; test tanggal tetap lulus (TZ dipin UTC di vitest)

## Seed menu

### TC-SEED-01 · Dry-run diff persis 3 baris sebelum apply [P0] [regresi] (1 mnt)
Langkah: `npx tsx scripts/seed/seed-menu-only.ts` (tanpa `--apply`) pada DB yang belum di-seed.
Harapan: "0 dibuat · 3 diperbarui" (2 × P4 + bulk-upload 9→10) — baris lain berarti menu prod diubah lewat UI setelah CSV disinkronkan → sinkronkan CSV dulu

### TC-SEED-02 · Sidebar setelah seed: urutan tampak tidak berubah kecuali Data Analyst [P0] (1 mnt)
Peran: SUPERADMIN, lalu DONOR.
Harapan: urutan grup Dashboard · Report · Map · Master Data · Data Analyst · Tools · Bantuan · Bulk Upload · Settings tetap; Data Analyst: Semua Lembaga (2) sebelum Per Lembaga (3); `isActive`/`isVisible` yang pernah diubah admin tidak berubah
