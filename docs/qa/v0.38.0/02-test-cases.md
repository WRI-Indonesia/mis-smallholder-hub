# 02 · Kasus uji per issue — v0.38.0

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

## #343 — Profil Petani (PDF)

Prasyarat umum: akun SUPERADMIN + akun OPERATOR ter-scope satu Lembaga **dengan** izin PRINT menu Petani (dan satu tanpa PRINT). Data: petani **1 lahan** ber-poligon dengan surat/STDB/patok (mis. KPUD Intan Makmur); petani **tanpa lahan** (Data Analyst › Ringkasan Petani › Petani Tanpa Lahan); petani **> 10 lahan** (urutkan kolom Lahan NKT/atau cari di Ringkasan Petani; di prod ada 53 petani > 10 lahan, maks 40); petani ber-lahan tersebar jauh (bbox > 5 km).

### TC-343-01 · Detail Petani → Profil Petani (PDF), 1 lahan [P0] (5 mnt)
Langkah:
1. Master Data › Petani › buka detail petani 1 lahan → klik **Profil Petani (PDF)** (di samping Edit)
2. Buka berkas `Profil_Petani_<Lembaga>_<Nama>_<ID>.pdf`
Harapan:
- Toast "Menyiapkan Profil Petani — 1 lahan…" → "Profil Petani siap diunduh"; tombol berputar lalu aktif lagi
- Halaman 1: judul PROFIL PETANI, nama, ID, badge L/P · Lembaga · Aktif; Identitas ber-**NIK & tanggal lahir penuh** (layar disensor); 5 kartu **sama angkanya** dengan kartu di layar; Daftar Lahan 1 baris **No 1** (Surat/STDB/NKT/Pohon/Patok = tab Lahan) + baris Total; Peta Sebaran dengan penanda ①, graticule, skala, panah U
- Pelatihan **satu tabel** Paket · Tanggal · Pre / Post Test (paket wajib belum diikuti = baris *Belum*); Produksi matriks gabungan + Rekap per Lahan per Tahun (Umur/PSR, Bulan Terisi n/12) — angka = tab Produksi
- **Monev BMP** (SUPERADMIN punya VIEW Monev BMP): badge kategori terbaru di header (mis. *Teladan*), tabel per tahun + 5 kolom kegiatan (Knowledge · Pemupukan · Gulma · PHPT · Panen), radar tahun terbaru + daftar kegiatan `n/m terisi · skor / 3,00` + "Indikator Lembaga terisi n/m" — angka = tab Monev BMP (rincian inline)
- Lampiran: *Lampiran 1 dari 1* kanan-atas, isi = Profil Lahan (peta, legalitas, sepadan, NKT, Patok Batas berkolom **Patok Bersama Lahan Tetangga**, tetangga, produksi) **tanpa** section Pelatihan; footer `Hal. n/N` menerus (N = total termasuk lampiran); metadata berkas Title "Profil Petani <ID> - <Nama>", Author "Smallholder HUB"

### TC-343-02 · Daftar Petani → ikon printer; petani tanpa lahan [P0] (3 mnt)
Langkah:
1. Master Data › Petani → baris petani **tanpa lahan** → ikon **printer** (kolom Aksi)
Harapan:
- Ikon tampil (izin PRINT) dan **aktif**; hanya baris itu berputar, ikon baris lain tetap bisa diklik
- PDF 1 halaman: identitas, kartu Lahan "0 persil", *Petani ini belum memiliki lahan.*, tabel Pelatihan, Produksi (data/empty state) — **tanpa** Peta Sebaran, tanpa lampiran, tanpa galat

### TC-343-03 · Petani > 10 lahan → dialog Lengkap / Ringkasan saja [P0] (6 mnt)
Langkah:
1. Daftar Petani → ikon printer pada petani > 10 lahan → dialog **Cetak Profil Petani** → **Ringkasan saja**
2. Ulangi → **Lengkap**; catat waktu sampai berkas terunduh & ukuran berkas
3. Ulangi dari **Detail Petani** (tombol header) → dialog yang sama muncul
Harapan:
- Dialog menyebut "±N halaman (M lahan)" dengan N ≈ 2 + 2·M; **Lengkap** = tombol utama
- Ringkasan saja: PDF hanya Bagian A (Daftar Lahan M baris bernomor 1..M, peta M penanda), tanpa satu pun *Lampiran*; cepat (< 3 dtk)
- Lengkap: toast "— M lahan…"; PDF berisi M lampiran *Lampiran n dari M*, nomor = kolom No; target **< 10 dtk untuk 40 lahan**, berkas < 5 MB
- Peta sebaran petani berlahan tersebar > 5 km: penanda bernomor tetap terbaca, skala batang dalam **km**, poligon kecil tak menghalangi; penanda **merah** untuk lahan NKT

### TC-343-04 · Izin PRINT & scope [P0] (4 mnt)
Langkah:
1. Login OPERATOR ter-scope **tanpa** izin PRINT menu Petani → Daftar Petani & Detail Petani
2. Login OPERATOR **dengan** PRINT → cetak petani dalam scope; lalu panggil URL detail petani Lembaga lain
Harapan:
- (1) ikon printer di kolom Aksi dan tombol **Profil Petani (PDF)** **tidak tampil**; tombol PDF per baris lahan (tab Lahan) juga tidak tampil (izin yang sama #245)
- (2) OPERATOR ber-PRINT Petani **tanpa** VIEW Monev BMP: PDF terbit **tanpa** section Monev BMP & tanpa badge kategori (sama dengan tab yang tersembunyi di layar)
- (2) PDF terbit dengan seluruh lahan petani itu sebagai lampiran; petani Lembaga lain → 404 (tidak ada jalan mencetaknya)

### TC-343-05 · Regresi Profil Lahan berdiri sendiri [P1] [regresi] (2 mnt)
Langkah:
1. Detail Lahan (lahan yang sama dengan TC-343-01) → **Profil Lahan (PDF)**; juga dari tab Lahan Detail Petani (tombol PDF) dan popup Peta Lahan
Harapan:
- Tetap 2 halaman dengan section **Pelatihan** (Paket Pelatihan · Status · Tanggal Mengikuti) dan tanpa baris *Lampiran*; tabel Patok Batas berkolom **Patok Bersama Lahan Tetangga**; metadata Title "Profil Lahan <ID Lahan>"
