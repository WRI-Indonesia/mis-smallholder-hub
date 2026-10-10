# 03 · QC data & DB — v1.2.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../../README.md) · Paket: [README.md](README.md)

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

## v1.2.0 — bagian G `data-qc.ts` (rilis tanpa migrasi)

| ID | Maksud | Harapan |
|---|---|---|
| G1 | menu `data-analyst-parcel-overlap` + izin | 1 menu · 8 izin (ADMIN/MANAGEMENT/OPERATOR/SUPERADMIN VIEW+EXPORT) — ✗ = `seed-menu-key.mjs data-analyst-parcel-overlap` belum dijalankan |
| G2 | menu `data-analyst-sprint` + izin | 1 menu · 3 izin (ADMIN/MANAGEMENT/SUPERADMIN VIEW) |
| G3 | pelatihan aktif ber-`evidence_key = ''` | informatif — sejak #385 dihitung tanpa bukti (mis-prod 2026-09-29: 26) |
| G4 | user nonaktif | informatif — sejak #252 scope-nya kosong walau sesi masih hidup |
| F3 | label & order menu Ketersediaan Data | `Data — All Lembaga:2 · Data — Per Lembaga:3` (#364: CSV = prod) |

A1 (migrasi) tidak berlaku — v1.2.0 tanpa migrasi.

