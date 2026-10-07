# 03 · QC data & DB — v1.4.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Kueri hidup di **`scripts/qa/data-qc.ts`** (read-only, cetak DB efektif). Jalankan **sebelum & sesudah** migrasi di tiap env, tempel keluarannya ke lembar run:

```bash
npx dotenv -e .env.staging -- npx tsx scripts/qa/data-qc.ts              # semua bagian
npx dotenv -e .env.prod    -- npx tsx scripts/qa/data-qc.ts --section A,B
```

Berkas ini hanya menjelaskan **maksud** tiap cek dan harapannya; bila cek berubah, ubah skripnya lalu perbarui baris di sini. Cek yang tidak bisa diotomasi (perintah terpisah) ditandai *manual*.

| ID | Bagian | Maksud | Harapan | Otomatis? |
|---|---|---|---|---|
| A1 | Migrasi | migrasi rilis ini applied (satu cek per migrasi/struktur baru; tulis di `scripts/qa/data-qc.ts` bagian baru) | sesudah: applied | ✓ |
| B1 | Angka bisnis | lahan aktif tidak berubah karena migrasi | = run sebelum | ✓ (bandingkan dua run) |
| C1 | Izin | menu & izin baru rilis ini ter-seed (cek per menu di `data-qc.ts`) | = `menu.csv` / `role-permissions.csv` | ✓ |
| — | Izin | seluruh izin seed ↔ DB | `npm run rbac:compare` 0 selisih (atau selisih yang disengaja tercatat) | manual (skrip terpisah) |
| H1 | Migrasi | `20261007125744_program_target` applied | sesudah: 1 | ✓ |
| H2 | Migrasi | enum `ProgramTargetIndicator` = 5 nilai per paket (versi tulis-ulang) | `TRAINING_P1_BMP … TRAINING_ANY` | ✓ |
| H3 | Data | target aktif per indikator | prod kosong sampai owner mengisi lewat UI | cetak saja |
| H4 | Izin | induk `platform-developer` + 3 anak pindah induk + 1 izin | 1 · 3/3 · 1 | ✓ |
| H5 | Izin | `master-data-program-target` + 8 izin | 1 menu · 8 izin | ✓ |
| H6 | Izin | `dashboard-supply-chain` + `map-supply-chain` | 2 menu · 16 + 16 izin | ✓ |

Jalankan: `npx dotenv -e .env.<env> -- npx tsx scripts/qa/data-qc.ts --section B,H` (B = angka bisnis tak berubah).
