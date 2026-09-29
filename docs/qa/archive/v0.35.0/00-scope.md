# 00 · Lingkup rilis v0.35.0

Sumber: `git log fac9078..HEAD`, `gh issue list --state closed`, Decision Log 2026-09-14/15. Matriks lengkap menu × issue dan tabel × issue: artifact "Matriks Perubahan Siklus #326–#332".

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #317 F1 | `LandParcel.geom` generated + GiST | — (dipakai #327/#329) | `20260914100000` | — | — | `TC-317-01` |
| 2 | #326 | Sepadan U/T/S/B | MD › Lahan › Detail; Bulk Upload › Lahan › Poligon (DBF) & Detail Lahan (Excel); PDF Profil Lahan | `20260914100100` | — | 1-1, 2-1, u-3, u-5, r-2 | `TC-326-01…04` |
| 3 | #327 | Lahan tetangga ≤ 25 m | MD › Lahan › Detail (peta + legenda); PDF Profil Lahan | — | — | 2-1, 3-2, p-5 | `TC-327-01…03` |
| 4 | #328 | Status NKT per lahan | MD › Lahan › Detail; Bulk Upload › Detail Lahan; Report › Lahan; Map › Peta Lahan; PDF | `20260914150000` | — | 1-1, 2-1, u-5, l-7, p-5, r-2 | `TC-328-01…06` |
| 5 | #329 | Patok batas lahan | MD › Lahan › Detail › Patok; Bulk Upload › Lahan › **Patok**; PDF; MD › Lembaga › Detail | `20260914170000` | — | t-6, u-6, 2-2, 1-1 | `TC-329-01…07` |
| 6 | #330 | NKT di menu harian | MD › Lahan › Daftar; MD › Lembaga/Petani › Detail › Lahan | — | — | 2-1, r-2 | `TC-330-01…03` |
| 7 | #331 | Patok di semua menu, kode unik, Report › Patok | Map › Peta Lahan; Report › Lahan; MD › Lembaga/Petani › Detail; **Report › Patok** | `20260914200000` | **menu `report-marker`** + 16 izin (ikon `Milestone`) | l-8, p-5, p-12, 3-2, 4-1 | `TC-331-01…08` |
| 8 | #332 | Laporan NKT per Lembaga (PDF, 3 KPI) | Report › Lahan › Laporan NKT; **MD › Lembaga › Detail › Lahan** (pintu kedua, revisi owner 09-15) | — | — (PRINT `report-land-parcel` / PRINT `master-data-groups`) | l-2, l-7, 2-1 | `TC-332-01…04` |
| 9 | Review 09-15 | 12 perbaikan review | Peta Lahan, Bulk Upload Patok & Detail Lahan, Detail Lembaga | — | — | — | `TC-REV-01…05` (di `../regression.md`) |
| 10 | #336 | Popup lahan menyebut jumlah patok | Map › Peta Lahan › popup | — | — | p-5 | `TC-336-01` |
| 11 | #337 | Kolom Lahan NKT & Patok per KT/petani | Report › KT (Summary) & (Detail) | — | — | l-6 | `TC-337-01…03` |
| 12 | #338 | Kolom Lahan NKT di daftar | MD › Lembaga Petani › Daftar; MD › Petani › Daftar | — | — | 2-1, r-1 | `TC-338-01…02` |
| 13 | Revisi owner 09-15 + #339 | Laporan NKT pintu kedua, ikon Milestone; review pra-rilis (13 perbaikan) | MD › Lembaga › Detail › Lahan; Report › Lahan (ekspor kolom Patok); Bulk Upload › Detail Lahan & Patok (parser); PDF Profil Lahan; Peta Lahan (baris Patok lahan) | — | — (seed ikon `report-marker` → Milestone) | 2-1, l-2, 4-1 | `TC-332-04`, `TC-331-08`, `TC-REV-06…08` (di `../regression.md`) |

## Di luar lingkup pengujian (sengaja)

- Dashboard (Main/BMP/Pelatihan/Fire Alert), Data Analyst, Tools, Settings selain matriks izin menu baru — tidak tersentuh (smoke saja).
- Sepadan/NKT/patok dalam skor Kelengkapan Data — keputusan tertunda (#326/#328).
- #317 Fase 2–3 — belum dibangun.

## Akun uji (staging) — **tanpa password di sini**

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | _isi_ | semua | migrasi/izin (SM-26), Settings |
| OPERATOR ter-scope | _isi_ | Distrik **Kampar** (HJP di dalamnya) | **seluruh** TC-326…338 |
| DONOR | _isi_ | — | SM-12, SM-27, SM-29 |

Bila belum ada akun OPERATOR ter-scope Kampar di staging: buat lewat Settings › Users (assignment Distrik Kampar) sebelum run — catat di lembar run.

## Persiapan data uji (`TC-PREP-*`, sebelum run pertama)

Tabel `tbl_land_parcel_border/nkt/marker` **kosong pasca-migrasi** (`data-qc.ts` B5). Kasus #328–#338 butuh data HJP yang dibuat **lewat aplikasi** — sekaligus menguji jalur tulisnya. Berkas masukan: `scripts/local/QA-QC/v0.35.0/evidence/input/` (salin dari Lampiran III HJP; jangan di-commit).

### TC-PREP-01 · Import status NKT HJP dari Lampiran III [P0] (10 mnt)
Prasyarat: OPERATOR Kampar; `input/nkt-hjp-lampiran-iii.xlsx` (template dari tab Detail Lahan › unduh template NKT, diisi 21 lahan).
Langkah:
1. Bulk Upload › Lahan › Detail Lahan → pilih berkas
2. Bawaan berkas: Terdampak · NKT 4 · tanggal asesmen · asesor "Laporan asesmen NKT HJP — Lampiran III"
3. Validasi → Simpan
Harapan:
- Ringkasan: 21 nkt dibuat, 0 ditolak
- `data-qc.ts` D1 = 21 AFFECTED, 0 INCLUDED

### TC-PREP-02 · Generate patok dari poligon untuk 3 lahan HJP bertetangga [P0] (5 mnt)
Prasyarat: TC-PREP-01; lahan `HJP.0001.A.14.01.10.2002` + 2 tetangganya (lihat legenda tetangga di Detail Lahan).
Langkah:
1. Detail Lahan HJP.0001.A › tab Patok › Buat patok dari poligon → pratinjau → Simpan
2. Ulangi untuk 2 lahan tetangga (nomor 1 dan 2 di legenda)
Harapan:
- Lahan pertama: 4 dibuat; lahan kedua/ketiga: sebagian **ditautkan** (sudut bersama), sisanya dibuat
- Kode berawalan `HJP-PTK-`

### TC-PREP-03 · Unggah patok GPS 5 baris [P1] (5 mnt)
Prasyarat: `input/patok-gps-hjp.xlsx` (template tab Patok; 5 baris untuk lahan TC-PREP-02, 1 tanpa No Patok, 1 berkolom Kode Patok).
Langkah:
1. Bulk Upload › Lahan › Patok → validasi → Simpan
Harapan:
- Ringkasan baru/diperbarui/ditautkan sesuai; unggah ulang berkas yang sama → 0 baru

### TC-PREP-04 · Verifikasi angka dasar [P0] (2 mnt)
Langkah:
1. `npx dotenv -e .env.staging -- npx tsx scripts/qa/data-qc.ts --section D`
Harapan:
- D1 21 NKT · D2 ≥ 8 patok / ≥ 12 tautan · D3 hitungan patok NKT > 0 — catat angkanya di lembar run sebagai acuan TC-330/331/337/338
