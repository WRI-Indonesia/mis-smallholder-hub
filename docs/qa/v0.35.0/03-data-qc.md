# 03 · QC data & DB — v0.35.0

Kueri **read-only**; cetak DB efektif dulu. Harapan = `mis-staging-local` (snapshot prod 2026-09-14 + 5 migrasi, gladi resik #333). Kolom "sesudah" diisi setelah `migrate deploy` + seed, sebelum deploy aplikasi.

## A. Migrasi & skema

| # | Pemeriksaan | Kueri / perintah | Harapan | staging sebelum | staging sesudah | prod sebelum | prod sesudah |
|---|---|---|---|---|---|---|---|
| A1 | Migrasi pending | `npx dotenv -e .env.<env> -- npx prisma migrate status` | sebelum: 5 pending; sesudah: 0 | | | | |
| A2 | Kolom generated ada | `select count(*) from information_schema.columns where table_name='tbl_land_parcel' and column_name='geom' and is_generated='ALWAYS'` | 1 | | | | |
| A3 | `geom` terisi untuk semua poligon | `select count(*) filter (where geom is null), count(*) from tbl_land_parcel where geometry is not null` | `0 \| <total>` (dev: 0 / 14.003) | | | | |
| A4 | GiST ada (jangan pernah di-drop) | `select indexname from pg_indexes where indexname in ('tbl_land_parcel_geom_idx','tbl_land_marker_geom_idx')` | 2 baris | | | | |
| A5 | Partial unique nomor patok | `select indexdef from pg_indexes where indexname='uniq_land_parcel_marker_seq'` | `… WHERE (is_active)` | | | | |
| A6 | 5 enum baru | `select typname from pg_type where typname in ('LandNktStatus','NktCategory','LandMarkerCondition','LandMarkerType','LandMarkerSource')` | 5 | | | | |
| A7 | Checksum | `npx dotenv -e .env.prod -- npx tsx scripts/migrations/refresh-applied-checksums.ts` lalu `npx vitest run src/test/migration-guards.test.ts` | hijau, commit `applied-checksums.json` | — | — | — | |

## B. Angka bisnis (tidak boleh berubah karena migrasi)

| # | Pemeriksaan | Kueri | Harapan (prod 2026-09-14) | staging sebelum | staging sesudah | prod sebelum | prod sesudah |
|---|---|---|---|---|---|---|---|
| B1 | Lahan aktif | `select count(*) from tbl_land_parcel where is_active` | 14.001–14.003 (cek sebelum) | | | | |
| B2 | Petani aktif | `select count(*) from tbl_farmer where is_active` | 8.863 | | | | |
| B3 | Lembaga aktif | `select count(*) from tbl_farmer_group where is_active` | 31 | | | | |
| B4 | Identitas lahan | `select count(*) from tbl_land_parcel_identity` | = jumlah pasangan (petani, ID lahan) | | | | |
| B5 | Tabel baru kosong pasca-migrasi | `select (select count(*) from tbl_land_parcel_border),(select count(*) from tbl_land_parcel_nkt),(select count(*) from tbl_land_marker),(select count(*) from tbl_land_parcel_marker),(select count(*) from tbl_land_marker_counter)` | `0\|0\|0\|0\|0` (data NKT/patok HJP diimpor **setelah** deploy) | — | | — | |
| B6 | Sepadan "hapus" = kolom kosong | setelah TC-326-02: `select north,east,south,west from tbl_land_parcel_border b join tbl_land_parcel_identity i on i.id=b.parcel_uid where i.parcel_id='HJP.0001.A.14.01.10.2002'` | 1 baris, semua NULL | — | | — | — |
| B7 | NKT "hapus" = baris hilang | setelah TC-328-03: `select count(*) from tbl_land_parcel_nkt n join tbl_land_parcel_identity i on i.id=n.parcel_uid where i.parcel_id='HJP.0001.A.14.01.10.2002'` | 0 | — | | — | — |
| B8 | Kode patok unik & ber-awalan Lembaga | setelah generate HJP: `select count(*), count(distinct code), min(code), max(code) from tbl_land_marker` | count = distinct; `HJP-PTK-000001…` | — | | — | |
| B9 | Counter = nomor terbesar | `select prefix,last_no from tbl_land_marker_counter` vs `max(split_part(code,'-PTK-',2)::int)` per awalan | sama | — | | — | |

## C. Izin & menu

| # | Pemeriksaan | Perintah | Harapan | staging | prod |
|---|---|---|---|---|---|
| C1 | Seed menu dry-run | `npx dotenv -e .env.<env> -- node scripts/seed/seed-menu-report-marker.mjs` | "Menu report-marker: BELUM ADA — akan dibuat", "akan dibuat 16" | | |
| C2 | Seed menu apply (approval owner untuk prod) | … `--apply` lalu dry-run ulang | dry-run kedua: "SUDAH ADA — skip", "akan dibuat 0" | | |
| C3 | Seed ↔ DB selaras | `npm run rbac:compare` (env yang sesuai) | 454 → 470 baris, 0 selisih tak disengaja | | |
| C4 | Menu di matriks izin | Settings › Roles: baris **Report › Patok** | ADMIN 5 · OPERATOR/MANAGEMENT/SUPERADMIN VIEW·EXPORT·PRINT · DONOR VIEW·PRINT | | |
| C5 | Urutan sidebar | Report › … › Patok terakhir (order 7) | ✓ | | |

## D. Data pasca-import (dijalankan owner setelah deploy, bukan bagian gate rilis)

| # | Pemeriksaan | Harapan (dev) | prod |
|---|---|---|---|
| D1 | Import NKT HJP (template + bawaan berkas Lampiran III) | 21 baris `AFFECTED`, 0 `INCLUDED` | |
| D2 | Generate patok seluruh lahan HJP | ±1.015 patok / 2.292 tautan / 62 patok NKT | |
| D3 | Laporan NKT HJP | 3 KPI: 559 · 21 · 1,16 ha | |
