# 00 · Lingkup rilis v1.5.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Sumber: `git log 0530072..HEAD` (dari `chore(release): v1.4.0` di `mvp`), `/scope` 2026-10-08, `docs/project/changelog/2026-10.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #317 Fase 3 | Peringatan tumpang tindih saat upload shapefile lahan (tidak memblokir simpan) | Bulk Upload › Lahan | — | — | `u-3` | `TC-317-03…05` |
| 2 | #290 | Latar satelit harian NASA GIBS di Fire Alert | Dashboard › Risk Management › Fire Alert | — | — | `p-11` | `TC-290-01…03` |
| 3 | — (owner 2026-10-08) | Produktivitas disetahunkan (Ton/Ha/tahun) | Dashboard › BMP · Tools › Snapshot BMP · Map › Peta BMP · Master Data › Lembaga/Petani/Lahan (detail) · PDF Profil Petani & Profil Lahan | — | — | `p-4` `p-3` `l-9` `l-11` `2-1` `3-1` `3-2` | `TC-PROD-01…04` |
| 4 | — (owner 2026-10-08) | Card Ex-Plasma vs Swadaya: tabel + mini bar, produktivitas per distrik | Dashboard › BMP | — | — | `p-4` | `TC-PROD-05` |
| 5 | #402 (lanjutan) | Sheet **Detail** per petani di Excel Training Benefit | Dashboard › Pelatihan | — | — | `p-2` | `TC-402-04` |
| 6 | #381 | Prototipe Rantai Pasok: badge UL, istilah TBS, kolom Distrik, popup auto-pan & judul 2 baris | Dashboard › Rantai Pasok · Map › Peta Rantai Pasok | — | — | `p-16` `p-17` | `TC-381-01` |
| 7 | #319 | Cakupan Pendataan Laporan Lahan wajib (server menolak tanpa nilai; Zod) | Report › Lahan | — | — | — | `TC-319-01` |
| 8 | #315 | Satu `FilterCombobox` di panel Peta Lahan & Peta BMP | Map › Peta Lahan · Peta BMP | — | — | `p-5` | `TC-315-01` |
| 9 | #310 | Bantuan `t-3` mengunggah daftar peserta (+ perbaikan status WARNING/ERROR di modal) | Master Data › Pelatihan › Detail | — | — | `t-3` | `TC-310-01` |
| 10 | — | Parser form survei Monev BMP Kampar (sheet individu bernama petani, alias nama berkas) | Master Data › Monev BMP › Import form | — | — | `t-8` | `TC-BMP-01` |
| 11 | — (perbaikan semua peta) | Poligon/garis peta hilang saat ganti latar vector → raster/vector (`labelBeforeId` basi) | semua peta MapLibre | — | — | — | `TC-MAP-01` |

## Di luar lingkup pengujian (sengaja)

- #366 sisa APKASDU (ditahan — butuh berkas ber-ID baru); #317 Fase 4 (layer peta) → v1.7.0; Supply Chain final (#380–#382) → v1.6.0.
- Data prod Monev BMP Kampar 2026 sudah diimport langsung (skrip) — bukan bagian deploy.

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | | semua | semua kasus |
| OPERATOR ter-scope | | 1 Distrik | upload lahan (penyamaran lawan di luar scope), detail Petani/Lahan, Laporan Lahan |
| DONOR | | — | BMP Dashboard & Peta BMP (baca), tanpa tombol Excel |

## Persiapan data uji (`TC-PREP-*`)

### TC-PREP-01 · Berkas shapefile uji tumpang tindih [P0] (5 mnt)
Langkah:
1. Ekspor 3 lahan satu Lembaga dalam scope OPERATOR dari Peta Lahan (Unduh Lahan → Shapefile).
2. Di QGIS: geser satu poligon agar menumpuk ± 30% dengan lahan **lain** Lembaga yang sama; duplikat satu poligon dengan ID Lahan baru (Duplikat > 90%); salin satu poligon dari Lembaga **di luar** scope OPERATOR dengan ID Lahan baru.
3. Simpan sebagai ZIP. **Jangan klik Simpan** di Bulk Upload — kasus uji hanya memeriksa peringatan.
Harapan:
- Berkas ZIP ber-3–4 poligon siap dipakai `TC-317-03…05`.
