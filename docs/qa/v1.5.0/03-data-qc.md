# 03 · QC data & DB — v1.5.0

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

v1.5.0 **tanpa migrasi & tanpa seed** — tidak ada cek baru. Jalankan bagian B (angka bisnis tak berubah oleh deploy) dan ulangi H (izin v1.4.0 tetap utuh). Catatan run lokal 2026-10-09 (`mis-dev`): **B9 ✗** (counter patok ≠ nomor terbesar di 30 awalan) dan **H6 ✗** (`map-supply-chain` 17 izin, harapan 16) — keadaan data DB lokal, bukan kode rentang ini; periksa ulang di staging.

Jalankan: `npx dotenv -e .env.<env> -- npx tsx scripts/qa/data-qc.ts --section B,H` (B = angka bisnis tak berubah).
