# 03 · QC data & DB — v0.37.0

Kueri hidup di **`scripts/qa/data-qc.ts`** (read-only, cetak DB efektif). Jalankan **sebelum & sesudah** migrasi di tiap env, tempel keluarannya ke lembar run:

```bash
npx tsx scripts/qa/data-qc.ts                                            # lokal (.env), semua bagian
npx dotenv -e .env.staging -- npx tsx scripts/qa/data-qc.ts --section A,B,F
npx dotenv -e .env.prod    -- npx tsx scripts/qa/data-qc.ts --section A,B,F
```

Berkas ini hanya menjelaskan **maksud** tiap cek dan harapannya; bila cek berubah, ubah skripnya lalu perbarui baris di sini. Cek yang tidak bisa diotomasi ditandai *manual*.

| ID | Bagian | Maksud | Harapan | Otomatis? |
|---|---|---|---|---|
| A1 | Migrasi | migrasi pending vs applied | sesudah: 0 pending (38 applied) | ✓ |
| B1–B4 | Angka bisnis | lahan/petani/Lembaga/identitas aktif tidak berubah karena migrasi | = run sebelum | ✓ (bandingkan dua run) |
| C1 | Izin | seed ↔ DB | `npm run rbac:compare` 0 selisih | manual |
| E1–E8 | Monev BMP (v0.36.0) | tabel/index/seed indikator tetap | ✓ semua | ✓ |
| **F1** | #353 E | migrasi `drop_activity_status_tree_surveyed_at` applied | 1 (sesudah) · 0 (sebelum) | ✓ |
| **F2** | #353 E | enum `ActivityStatus` & kolom `tbl_tree.surveyed_at` tidak ada lagi | enum 0 · kolom 0 | ✓ |
| **F3** | #352 P4 | label & order 2 menu Ketersediaan Data = `menu.csv` | ✓ hanya setelah `seed-menu-only --apply` | ✓ |
| F4 | seed | diff menu dry-run sebelum apply | persis 3 baris (lihat TC-SEED-01) | manual (`seed-menu-only.ts` tanpa `--apply`) |
