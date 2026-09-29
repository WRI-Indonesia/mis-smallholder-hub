# 00 · Lingkup rilis v0.36.0

Sumber: `git log 8777891..HEAD` (v0.35.0 → `mvp`), #344 · #346 · #345 · #347 · #348, `docs/project/changelog.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #344 ✅ | Monev BMP skor per petani per tahun | **Master Data › Monev BMP** · **Dashboard › Monev BMP** · Master Data › Petani › Detail (tab Monev BMP + badge) | `20260918120000_bmp_assessment` · `20260920100000_bmp_assessment_unique_active` | `master-data-bmp-monev` (order 6) · `dashboard-bmp-monev` (order 3; Pelatihan → 4, Risk → 5) · 33 izin cermin Pelatihan (`scripts/seed/seed-menu-bmp-monev.mjs`) | `t-7` · `p-13` · konsep 2-1 & 3-1 | `TC-344-01…08` |
| 2 | #346 ✅ | Rincian 32 indikator, penilaian Lembaga, import form survei | Monev BMP › Detail Penilaian `[id]` · Monev BMP › Penilaian Lembaga `/lembaga` · dialog import tab 2 · Dashboard Monev seksi 2–4 · Detail Petani (rincian inline) | `20260920120000_bmp_indicator_detail` (+ seed 32 indikator `scripts/seed/seed-bmp-indicators.ts`) | — (menumpang `master-data-bmp-monev`) | `t-8` · `p-13` | `TC-346-01…12` |
| 3 | #345 tahap 1 (open) | Patok NKT ≠ patok lahan: hapus "Patok lahan NKT" turunan, Jenis → Bahan, Terrain 3D | Map › Peta Lahan · Report › Patok · Detail Lembaga/Petani/Lahan (tab Patok, peta sebaran) · Bulk Upload › Lahan › Patok · PDF Profil Lahan | — | — | `l-8` · `p-5` · `t-6` · `u-6` · konsep | `TC-345-01…05` |
| 4 | #347 ✅ | Review pra-rilis: 15 perbaikan | Monev BMP (import form, detail, daftar), Peta Lahan (3D) | — | — | — | `TC-347-01…06` |

## Di luar lingkup pengujian (sengaja)

- Deploy migrasi/seed ke staging & prod — **#348** (prasyarat run staging).
- Layer Monev di Peta BMP — **#349** (belum dibangun).
- Import data prod Rohul (rekap + 192 form) — menunggu konfirmasi tim lapangan; run lokal memakai data `mis-dev` (188 penilaian, 184 ber-rincian, 8 penilaian Lembaga — hasil skrip lokal, bukan UI).
- #345 tahap 2 (field Tipe patok, patok NKT dari buffer sungai).

## Akun uji — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | akun owner (`sofyan…`) | semua | migrasi/izin, Settings, run lokal 2026-09-20 |
| OPERATOR ter-scope | akun QA `operator-rohul` (dibuat via Settings › Users bila belum ada) | Distrik Rokan Hulu | **seluruh** kasus fungsional Monev (scope Lembaga ISH-1406-*) |
| DONOR | akun QA `donor-qa` | — | smoke read-only, tombol yang tidak boleh tampil |

## Persiapan data uji (`TC-PREP-*`, dijalankan sebelum run pertama di env yang tabel Monev-nya kosong)

Berkas masukan di `scripts/local/QA-QC/v0.36.0/evidence/input/` (gitignored): `rekap-skpe.xlsx` (sheet rekap 1 Lembaga, format tim lapangan), `form-survei/` (5 form `.xlsx` KPUD Tujuh Permata + 1 berkas `.xls` rusak untuk kasus negatif), `rekap-1-baris.xlsx` (template unduhan yang diisi 1 baris).

### TC-PREP-01 · Import rekap satu Lembaga [P0] (5 mnt)
Prasyarat: tabel `tbl_bmp_assessment` kosong untuk Lembaga uji (`data-qc.ts` E8); OPERATOR ter-scope.
Langkah:
1. Master Data › Monev BMP › **Import Excel** › tab **Rekap skor** › pilih Lembaga `ISH-1406-06` (APKASA Rayon SKPE) › unggah `rekap-skpe.xlsx`
2. Periksa pratinjau (baris "Baru", peringatan tanggal/lahan) › **Simpan**
Harapan:
- Ringkasan `dibuat = jumlah baris berskor`; daftar terisi; KPI Lembaga Petani = 1; E8 naik.

### TC-PREP-02 · Import form survei satu Lembaga [P0] (10 mnt)
Prasyarat: TC-PREP-01 (petani SKPE sudah punya skor → status "Perbarui" untuk yang sama) atau Lembaga lain kosong.
Langkah:
1. Import Excel › tab **Form survei per petani** › Lembaga `ISH-1406-01` (KPUD Tujuh Permata) › pilih 5 berkas `form-survei/*.xlsx` + `rusak.xls`
2. Tunggu progres; periksa kolom Cocok (Yakin/Ragu/Ganda/Tak ditemukan), pilih petani di dropdown bila perlu; `rusak.xls` tampil di daftar "gagal dibaca"
3. **Simpan N form**
Harapan:
- Ringkasan: penilaian baru = 5, skor indikator > 0, penilaian Lembaga tahun itu terbentuk (Penilaian Lembaga menampilkan 1 baris Lembaga uji); tidak ada berkas lain gugur karena `rusak.xls`.
