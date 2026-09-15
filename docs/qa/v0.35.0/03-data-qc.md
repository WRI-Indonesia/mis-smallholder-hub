# 03 · QC data & DB — v0.35.0

Kueri hidup di **`scripts/qa/data-qc.ts`**. Jalankan **sebelum & sesudah** migrasi + seed di tiap env, tempel keluarannya ke lembar run:

```bash
npx dotenv -e .env.staging -- npx tsx scripts/qa/data-qc.ts
npx dotenv -e .env.prod    -- npx tsx scripts/qa/data-qc.ts --section A,B,C
```

Harapan bagian A/B = `mis-staging-local` (snapshot prod 2026-09-14 + 5 migrasi, gladi resik #333).

| ID | Bagian | Maksud | Harapan | Otomatis? |
|---|---|---|---|---|
| A1 | Migrasi | 5 migrasi `20260914*` applied | sebelum: 0 dari 5 · sesudah: 5 dari 5 | ✓ |
| A2 | Migrasi | `tbl_land_parcel.geom` kolom **generated** | 1 | ✓ |
| A3 | Migrasi | `geom` terisi untuk semua baris ber-`geometry` | 0 NULL | ✓ |
| A4 | Migrasi | GiST `tbl_land_parcel_geom_idx` & `tbl_land_marker_geom_idx` ada | 2 | ✓ |
| A5 | Migrasi | partial unique `uniq_land_parcel_marker_seq` ber-`WHERE is_active` | ✓ | ✓ |
| A6 | Migrasi | 5 enum baru | 5 | ✓ |
| A7 | Migrasi | checksum disegarkan setelah prod | `refresh-applied-checksums` + `migration-guards.test.ts` hijau | manual |
| B1 | Angka bisnis | lahan aktif | = run sebelum (prod 2026-09-14: 14.001) | ✓ |
| B2 | Angka bisnis | petani aktif | 8.863 | ✓ |
| B3 | Angka bisnis | Lembaga aktif | 31 | ✓ |
| B4 | Angka bisnis | identitas lahan | = run sebelum | ✓ |
| B5 | Angka bisnis | 5 tabel baru **kosong** pasca-migrasi (sebelum TC-PREP) | 0·0·0·0·0 | ✓ |
| B6 | Angka bisnis | sepadan "hapus" = kolom kosong (setelah TC-326-02) | 1 baris, 4 NULL | ✓ (parameter `--parcel`) |
| B7 | Angka bisnis | NKT "hapus" = baris hilang (setelah TC-328-03) | 0 | ✓ (parameter `--parcel`) |
| B8 | Angka bisnis | kode patok unik & ber-awalan Lembaga | count = distinct; awalan `HJP-PTK-` | ✓ |
| B9 | Angka bisnis | counter = nomor terbesar per awalan | sama | ✓ |
| C1 | Izin | seed menu dry-run | sebelum: "BELUM ADA — akan dibuat 16" · sesudah: "SUDAH ADA — 0" | manual: `node scripts/seed/seed-menu-report-marker.mjs` |
| C2 | Izin | menu `report-marker` + 16 izin di DB | 1 menu · 16 baris (ADMIN 5 · OPERATOR/MANAGEMENT/SUPERADMIN 3 · DONOR 2) | ✓ |
| C3 | Izin | seed ↔ DB selaras | `npm run rbac:compare` 470 baris, 0 selisih | manual |
| C4 | Izin | urutan sidebar | Report › … › Patok terakhir (order 7) | ✓ |
| D1 | Data uji (setelah TC-PREP) | baris NKT per status | 21 AFFECTED · 0 INCLUDED | ✓ |
| D2 | Data uji | patok / tautan aktif | ≥ 8 / ≥ 12 (TC-PREP-02/03) | ✓ |
| D3 | Data uji | patok NKT (turunan) | > 0 | ✓ |
