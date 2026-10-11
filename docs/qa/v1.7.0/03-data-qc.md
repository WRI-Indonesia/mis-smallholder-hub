# 03 · QC data & DB — v1.7.0

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
| I1 | Menu (#416) | induk `data-analyst-availability` + 3 anak (Semua Lembaga · Per Lembaga · Produksi) | 1 induk · 3/3 anak | ✓ |
| I2 | Izin (#416) | izin induk & Produksi: 4 peran × VIEW/EXPORT/PRINT, tanpa DONOR | 12 + 12 · DONOR 0 | ✓ |
| I3 | Izin (#416) | override per user pada menu yang pindah induk | informatif (tetap berlaku — key tak berubah) | ✓ |
| F3 | Menu (#352 → #416) | label & order 2 menu skor = `menu.csv` | Semua Lembaga:1 · Per Lembaga:2 | ✓ |

