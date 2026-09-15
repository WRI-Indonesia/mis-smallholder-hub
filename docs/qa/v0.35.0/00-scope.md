# 00 · Lingkup rilis v0.35.0

Sumber: `git log fac9078..HEAD`, `gh issue list --state closed`, Decision Log 2026-09-14/15. Matriks lengkap menu × issue dan tabel × issue: artifact "Matriks Perubahan Siklus #326–#332".

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #317 F1 | `LandParcel.geom` generated + GiST (fondasi kueri spasial) | — (tak terlihat pengguna; dipakai #327/#329) | `20260914100000` | — | — | `TC-317-01` |
| 2 | #326 | Sepadan U/T/S/B | MD › Lahan › Detail (blok Sepadan + modal, PDF Profil Lahan); Bulk Upload › Lahan › Poligon (DBF) & Detail Lahan (Excel) | `20260914100100` | — | 1-1, 2-1, u-3, u-5, r-2 | `TC-326-01…04` |
| 3 | #327 | Lahan tetangga ≤ 25 m | MD › Lahan › Detail (peta + legenda), PDF Profil Lahan (juga dari Peta Lahan & Detail Petani) | — | — | 2-1, 3-2, p-5 | `TC-327-01…03` |
| 4 | #328 | Status NKT per lahan | MD › Lahan › Detail (badge, kotak NKT, modal, hapus); Bulk Upload › Lahan › Detail Lahan (kolom NKT, template, bawaan berkas); Report › Lahan (filter/kolom/KPI); Map › Peta Lahan (layer Lahan NKT); PDF Profil Lahan | `20260914150000` | — | 1-1, 2-1, u-5, l-7, p-5, r-2 | `TC-328-01…06` |
| 5 | #329 | Patok batas lahan | MD › Lahan › Detail › tab Patok; Bulk Upload › Lahan › **Patok** (Excel/CSV GPS + shapefile Point); PDF Profil Lahan; MD › Lembaga › Detail (Unduh patok) | `20260914170000` | — | t-6, u-6, 2-2, 1-1 | `TC-329-01…07` |
| 6 | #330 | NKT di semua menu harian | MD › Lahan › Daftar (filter NKT/Patok, badge, kolom, Excel); MD › Lembaga › Detail › Lahan (KPI, peta); MD › Petani › Detail › Lahan (kolom, peta) | — | — | 2-1, r-2 | `TC-330-01…03` |
| 7 | #331 | Patok di semua menu, kode unik, Report › Patok | Map › Peta Lahan (layer Patok/Patok NKT, unduh & PDF per baris legenda, zoom); Report › Lahan (filter/kolom/KPI patok); MD › Lembaga/Petani › Detail (KPI + titik); **Report › Patok** (baru) | `20260914200000` | **menu `report-marker`** + 16 izin | l-8, p-5, p-12, 3-2 | `TC-331-01…07` |
| 8 | #332 | Laporan NKT per Lembaga (PDF, 3 KPI) | Report › Lahan › tombol Laporan NKT | — | — (PRINT `report-land-parcel`) | l-2, l-7 | `TC-332-01…03` |
| 9 | Review 09-15 | 12 perbaikan review (celah Kode Patok, sel NKT 0/FALSE, loading patok, hitungan legenda, dll.) | Peta Lahan, Bulk Upload Patok & Detail Lahan, Detail Lembaga | — | — | — | `TC-REV-01…05` |
| 10 | #336 | Popup lahan menyebut jumlah patok | Map › Peta Lahan › popup lahan | — | — | p-5 | `TC-336-01` |
| 11 | #337 | Kolom Lahan NKT & Patok per KT/petani | Report › Kelompok Tani (Summary) & (Detail) | — | — | l-6 | `TC-337-01…03` |
| 12 | #338 | Kolom Lahan NKT di daftar | MD › Lembaga Petani › Daftar; MD › Petani › Daftar | — | — | 2-1, r-1 | `TC-338-01…02` |

## Di luar lingkup pengujian (sengaja)

- Dashboard (Main/BMP/Pelatihan/Fire Alert), Data Analyst, Tools, Settings selain matriks izin menu baru — tidak tersentuh siklus ini (smoke saja).
- Sepadan/NKT/patok dalam skor Kelengkapan Data — keputusan tertunda (#326/#328).
- #317 Fase 2–3 (laporan tumpang tindih, guard upload, layer) — belum dibangun.

## Prasyarat data uji

| Kebutuhan | Nilai di staging | Nilai di prod |
|---|---|---|
| Lembaga dengan NKT & patok terisi | **HJP** (`ICS-1401-03`, Kampar): 559 lahan · 21 NKT · 1.015 patok — **hanya bila** data patok/NKT diimpor ulang ke staging setelah migrasi (tabel baru kosong pasca-migrasi; lihat `03-data-qc.md` B5) | tabel baru **kosong** sampai import NKT (Lampiran III HJP) & generate patok dijalankan owner |
| Lahan berpoligon dengan tetangga ≤ 25 m | `HJP.0001.A.14.01.10.2002` (5 tetangga) | sama (poligon identik) |
| Berkas uji unggahan | `template_nkt_lahan.xlsx` (unduh dari tab Detail Lahan), template patok (tab Patok), shapefile Point 3–5 titik di sekitar `HJP.0001.A` | idem |
| Akun per peran | SUPERADMIN; OPERATOR ter-scope Kampar; DONOR | idem |
