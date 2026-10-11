# QA/QC v1.7.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.7.0 (MINOR — semula PATCH v1.6.1; owner 2026-10-11: fitur #416 Ketersediaan Data › Produksi ikut rilis ini → nomor MINOR; Supply Chain DB bergeser ke v1.8.0) |
| Rentang | `v1.6.0..mvp` (berjalan) |
| Migrasi | tidak ada. **Seed menu wajib** (#416): `npx dotenv -e .env.<env> -- npx tsx scripts/seed/seed-menu-only.ts` dry-run lalu `--apply` di staging & prod — 2 menu dibuat (`data-analyst-availability`, `data-analyst-availability-production`) · 2 diperbarui (induk/judul Semua Lembaga & Per Lembaga); cek `ICON_MAP` prod memuat `CalendarRange` |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.7.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-10-11-staging.md | Smoke | 34 | 0 | 0 | 1 | 0 |
| 2026-10-11-staging.md | Kasus uji | 18 | 0 | 0 | 1 | 0 |
| 2026-10-11-staging.md | Regresi | 9 | 0 | 0 | 0 | 0 |

_Semua Fail sudah merujuk issue._

## Keputusan

**Go / No-go:** **Go** — 2026-10-12, owner. Tanpa migrasi; **seed menu prod wajib** (`seed-menu-only.ts`: 2 dibuat · 2 diperbarui) sesudah deploy; run prod `--only P0` diisi ≤ 1 jam setelah deploy.

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| TD-061 | PDF selain Laporan Lahan (Farm Passport, laporan layer, cetak Peta BMP, ekspor titik api, Profil Petani) masih bisa mencetak tanda seperti "≥" sebagai karakter rusak | dikerjakan menumpang saat file terkait disentuh; Laporan Lahan & eksportir bersama sudah aman |
| TD-060 | — (internal: guard izin "A ATAU B" ada di tiga salinan) | kerapian, tak berdampak perilaku |
| SM-33 peran MANAGEMENT | belum diuji dengan akun MANAGEMENT di staging (OPERATOR, DONOR, ADMIN ber-scope & SUPERADMIN sudah) | belum ada akun uji MANAGEMENT; izin dijaga test RBAC |
