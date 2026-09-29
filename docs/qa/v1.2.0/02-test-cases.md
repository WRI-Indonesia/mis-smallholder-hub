# 02 · Kasus uji per issue — v1.2.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

> Versi diasumsikan **v1.2.0** (MINOR — menu baru). Folder dosir lain (`00-scope`, `01-smoke`, …) dibuat saat rilis dari `_template/`.

## #317 — Tumpang Tindih Lahan (Fase 2, tab Tumpang Tindih)

Prasyarat rilis (bukan kasus uji, cek sebelum run): kode rilis **sudah ter-deploy sebelum** seed menu — ikon `Layers` baru di `ICON_MAP`; seed hanya menu `data-analyst-parcel-overlap` + 8 izin (lihat `docs/project/changelog.md` Decision Log 2026-09-24 soal drift judul 2 menu Ketersediaan Data).

### TC-317-01 · Menu & izin per peran [P0] [regresi] (5 mnt)
Prasyarat: akun SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT, DONOR di lingkungan uji.
Langkah:
1. `SELECT role, string_agg(permission::text, ',') FROM rbac_role_permission WHERE menu_key='data-analyst-parcel-overlap' AND is_active GROUP BY 1 ORDER BY 1;`
2. Tiap akun: buka sidebar Data Analyst.
3. Akun DONOR: buka langsung `/admin/data-analyst/parcel-overlap`.
Harapan:
- Langkah 1: SUPERADMIN/ADMIN/MANAGEMENT/OPERATOR masing-masing `VIEW,EXPORT`; **tidak ada** DONOR.
- Empat peran pertama melihat **Tumpang Tindih Lahan** (ikon lapisan) di bawah Data Analyst; halaman terbuka tanpa 404/jendela galat.
- DONOR: menu tidak tampil; URL langsung dialihkan (tanpa data).

### TC-317-02 · Angka halaman = SQL mandiri [P1] (5 mnt)
Prasyarat: akses baca DB; akun SUPERADMIN.
Langkah:
1. Buka halaman tanpa filter (Tumpang tindih `Semua`, chip `Semua`).
2. Jalankan hitungan mandiri (kueri di `docs/product/pages/data-analyst/parcel-overlap.md` §Aturan perhitungan: self-join `ST_Intersects AND NOT ST_Touches`, lahan/petani/Lembaga aktif, buang irisan < 100 m² **dan** < 1% lahan terkecil).
Harapan:
- "N pasangan" dan chip Duplikat/Tercakup/Sebagian sama persis dengan hitungan SQL.
Baseline dev: `mis-dev` (snapshot prod) 2026-09-24 — **136** · Duplikat 24 · Tercakup 45 · Sebagian 67 (petani sama 60 · satu Lembaga 16 · lintas 60).

### TC-317-03 · Filter tersimpan di URL & bawaan [P1] (5 mnt)
Langkah:
1. Buka halaman tanpa query string.
2. Pilih Tumpang tindih `> 50%`, Jenis `Lintas Lembaga`, Lembaga `ISH-1408-04`, klik chip `Tercakup`.
3. Salin URL, buka di tab baru.
4. Klik chip `Semua`.
Harapan:
- Langkah 1: Tumpang tindih `Semua`, chip `Semua` aktif (bawaan).
- Langkah 3: tab baru menampilkan filter & daftar yang sama (`?persen=50&jenis=CROSS_GROUP&lembaga=…&label=CONTAINED`).
- Langkah 4: `label` hilang dari URL; chip label lain tampil penuh (tidak pudar).
- Angka pada chip tidak berubah saat salah satu chip aktif (dihitung dari filter lain).

### TC-317-04 · Split view: navigasi, sortir, basemap [P0] [regresi] (8 mnt)
Langkah:
1. Buka halaman — panel kanan langsung berisi peta pasangan pertama (tidak kosong).
2. Klik judul kolom **Label**, lalu klik lagi.
3. Klik judul kolom **Lahan A**.
4. Pilih basemap `SAT`, klik **Berikutnya ›** tiga kali.
5. Klik satu baris tabel, tekan ↓ dua kali, lalu ↑ sekali.
6. Klik di area kosong di luar tabel, tekan ↓.
7. Klik peta, tekan ↓.
Harapan:
- Langkah 2–3: **halaman tidak crash** ("Terjadi Kesalahan" = Fail — bug loop render yang ditemukan saat wrap-up); Label naik = Duplikat → Tercakup → Sebagian, turun diawali Sebagian; setelah sortir tabel kembali ke halaman 1.
- Langkah 4: peta tetap tampil selama memuat (berlapis spinner), basemap tetap `SAT`; penghitung "n / N" naik satu per klik.
- Langkah 5: pasangan & sorotan baris berpindah satu per tekan; fokus ikut ke baris baru; bila melewati batas halaman, tabel pindah halaman.
- Langkah 6: halaman **menggulir**, pasangan tidak berpindah.
- Langkah 7: peta bergeser, pasangan tidak berpindah.

### TC-317-05 · Scope: minimal satu sisi, sisi lawan lengkap [P0] [regresi] (8 mnt)
Prasyarat: akun B = user BY_FARMER_GROUP yang hanya memegang **ISH-1408-04 (ASERMISAS)**; akun A = SUPERADMIN.
Langkah:
1. Akun A: filter Lembaga ISH-1408-04 → catat jumlah pasangan.
2. Akun B: buka halaman tanpa filter.
3. Akun B: pilih pasangan Lintas Lembaga (mis. lahan `MIS.*` vs `DYN.*`/`SSB.*`), lihat kartu A & B.
Harapan:
- Jumlah di akun B = jumlah akun A langkah 1 (semua pasangan yang **salah satu** sisinya ASERMISAS; tidak ada pasangan tanpa sisi ASERMISAS).
- Kartu sisi lain Lembaga menampilkan nama & kode petani, Lembaga, poligon lengkap, dengan teks **"Di luar akses Anda — Detail Lahan tidak bisa dibuka"** (tanpa tautan). Sisi ASERMISAS punya tautan **Buka Detail Lahan** (tab baru).
Baseline dev: ISH-1408-04 = **60** pasangan (59 dengan sisi lawan di luar Lembaga).

### TC-317-06 · Ekspor Excel & Spasial [P1] (8 mnt)
Prasyarat: akun dengan izin Export; filter Lembaga ISH-1408-04.
Langkah:
1. Klik **Excel**; buka berkasnya.
2. **Spasial ▾ → Shapefile (ZIP)**; buka di QGIS.
3. Akun tanpa izin Export (bila ada override): buka halaman.
Harapan:
- Nama berkas `tumpang-tindih-lahan_asermisas_<YYYYMMDD-HHmm>.xlsx` / `.zip` (tanpa filter apa pun: `…_semua_…`).
- Excel: sheet "Tumpang Tindih", baris = jumlah pasangan, 20 kolom (Label, Jenis, %, Luas Irisan, lalu 8 kolom per sisi A/B) tanpa kolom kosong total (Kelompok Tani boleh kosong mengikuti data).
- SHP: satu layer `irisan` Polygon WGS84, atribut `label, jenis, pct_min, irisan_ha, lahan_a, petani_a, lembaga_a, pct_a, lahan_b, petani_b, lembaga_b, pct_b`; poligon jatuh tepat di irisan lahan. Jumlah fitur ≥ jumlah pasangan (irisan MultiPolygon dipecah).
- Langkah 3: tombol Excel & Spasial tidak tampil.
Baseline dev: ISH-1408-04 → 60 baris Excel, 61 fitur SHP.

### TC-317-07 · Regresi DataTable di halaman lain [P1] [regresi] (4 mnt)
Langkah:
1. Settings › Users: urutkan kolom, pindah ke halaman 2, urutkan lagi; klik tombol aksi di satu baris.
2. Master Data › Lembaga Petani: urutkan kolom, cari, pindah halaman.
Harapan:
- Tidak ada crash; sortir mengembalikan ke halaman 1; tombol aksi bekerja seperti biasa; baris **tidak** bisa difokus/dipilih (perilaku lama — hanya tabel ber-`onRowClick` yang berubah).
