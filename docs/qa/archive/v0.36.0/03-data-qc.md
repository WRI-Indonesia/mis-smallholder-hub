# 03 · QC data & DB — v0.36.0

Kueri hidup di **`scripts/qa/data-qc.ts`**. Jalankan **sebelum & sesudah** migrasi + seed di tiap env, tempel keluarannya ke lembar run:

```bash
npx dotenv -e .env.staging -- npx tsx scripts/qa/data-qc.ts --section A,E   # staging (A = siklus v0.35.0 tetap hijau)
npx dotenv -e .env.prod    -- npx tsx scripts/qa/data-qc.ts --section A,E
```

Harapan bagian E = `mis-dev` / `mis-staging-local` 2026-09-20 (#347): E1–E7 ✓ di keduanya; E8 `188 · 184 · 8 · 0` (mis-dev, data skrip lokal) / `0 · 0 · 0 · 0` (staging-local, sebelum import UI). D3 (patok NKT turunan) **dihapus** bersama #345 tahap 1.

| ID | Bagian | Maksud | Harapan | Otomatis? |
|---|---|---|---|---|
| A1–A6 | Migrasi v0.35.0 | tetap hijau (regresi) | seperti v0.35.0 | ✓ |
| A7 | Migrasi | checksum disegarkan setelah prod | `refresh-applied-checksums` + `migration-guards.test.ts` hijau | manual |
| E1 | Migrasi | 3 migrasi Monev BMP applied (`20260918120000`, `20260920100000`, `20260920120000`) | sebelum: 0 · sesudah: 3 | ✓ |
| E2 | Migrasi | 5 tabel Monev ada | 5 | ✓ |
| E3 | Migrasi | partial unique satu aktif per petani-tahun & per Lembaga-tahun ber-`WHERE is_active` | 2 index ✓ | ✓ |
| E4 | Seed | master indikator 32 = 18 INDIVIDU + 14 LEMBAGA, 21 berbobot | `32 · 18 · 14 · 21` (sebelum seed 0) | ✓ |
| E5 | Izin | 2 menu + 33 izin (ADMIN 10 · SUPERADMIN 9 · OPERATOR/MANAGEMENT 6 · DONOR 2) | sesuai | ✓ |
| E6 | Izin | urutan sidebar Dashboard: … → bmp → **bmp-monev** → training → risk | sesuai | ✓ |
| E7 | Angka bisnis | tidak ada dua penilaian aktif petani-tahun | 0 | ✓ |
| E8 | Angka bisnis | penilaian aktif · ber-rincian · penilaian Lembaga · skor di luar 0–3 | prod sebelum import UI: `0 · 0 · 0 · 0`; sesudah TC-PREP: naik | – (cetak) |
| C1 | Izin | seed menu dry-run | sebelum: "BELUM ADA — akan dibuat" · sesudah: "SUDAH ADA — skip" untuk kedua menu + reorder "sudah 4/5" | manual |
| C3 | Izin | seed ↔ DB selaras | `npm run rbac:compare` 0 selisih (487 baris) | manual |
