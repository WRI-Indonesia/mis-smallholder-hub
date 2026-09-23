# 03 · QC data & DB — v1.1.0

Kueri hidup di **`scripts/qa/data-qc.ts`** (read-only, cetak DB efektif). Jalankan **sebelum & sesudah** migrasi di tiap env, tempel keluarannya ke lembar run:

```bash
npx dotenv -e .env.staging -- npx tsx scripts/qa/data-qc.ts              # semua bagian
npx dotenv -e .env.prod    -- npx tsx scripts/qa/data-qc.ts --section A,B
```

Berkas ini hanya menjelaskan **maksud** tiap cek dan harapannya; bila cek berubah, ubah skripnya lalu perbarui baris di sini. Cek yang tidak bisa diotomasi (perintah terpisah) ditandai *manual*.

| ID | Bagian | Maksud | Harapan | Otomatis? |
|---|---|---|---|---|
| A1 | Migrasi | migrasi pending vs applied | sesudah: 0 pending | ✓ |
| B1 | Angka bisnis | lahan aktif tidak berubah karena migrasi | = run sebelum | ✓ (bandingkan dua run) |
| C1 | Izin | seed ↔ DB | `npm run rbac:compare` 0 selisih | manual |

### Cek khusus v1.1.0 (*manual*, SQL baca-saja)

| ID | Bagian | Maksud | Kueri | Harapan |
|---|---|---|---|---|
| D1 | Migrasi #373 | unique lama hilang, unique + index baru ada | `SELECT indexname FROM pg_indexes WHERE tablename='tbl_land_parcel_external_id' ORDER BY 1;` | 4 index: `…_parcel_uid_is_active_idx`, `…_parcel_uid_source_code_key`, `…_pkey`, `…_source_code_idx`; **tanpa** `…_source_code_key` |
| D2 | Data #374 | KT/Blok isian pengganti sudah bersih | `SELECT count(*) FROM tbl_land_parcel WHERE is_active AND (sub_group_lv2 ~* '^\s*(tidak ada\|-+)\s*$' OR blok ~* '^\s*(tidak ada\|-+)\s*$');` | staging **0**; prod **417 sebelum** pembersihan → **0 sesudah** |
| D3 | Data #373 | kode ganda untuk TC-373-02 | kueri `TC-PREP-01` di `00-scope.md` | ≥ 1 baris (prod 82 kode dipakai >1 lahan) |
