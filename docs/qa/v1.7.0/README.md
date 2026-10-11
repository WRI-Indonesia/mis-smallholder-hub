# QA/QC v1.7.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.7.0 (MINOR — semula PATCH v1.6.1; owner 2026-10-11: fitur #416 Ketersediaan Data › Produksi ikut rilis ini → nomor MINOR; Supply Chain DB bergeser ke v1.8.0) |
| Rentang | `v1.6.0..mvp` (berjalan) |
| Migrasi | tidak ada. **Seed menu wajib** (#416): `npx dotenv -e .env.<env> -- npx tsx scripts/seed/seed-menu-only.ts` dry-run lalu `--apply` di staging & prod — 2 menu dibuat (`data-analyst-availability`, `data-analyst-availability-production`) · 2 diperbarui (induk/judul Semua Lembaga & Per Lembaga); cek `ICON_MAP` prod memuat `CalendarRange` |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.7.0`)

_(belum ada run)_

## Keputusan

**Go / No-go:** … (tanggal, oleh siapa) — syarat: …

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| | | |
