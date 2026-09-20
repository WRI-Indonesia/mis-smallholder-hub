# QA/QC v0.36.0 — Monev BMP (#344 · #346) + patok NKT tahap 1 (#345) + review #347

| | |
|---|---|
| Rentang | `8777891` (v0.35.0) .. `mvp` HEAD |
| Migrasi | 3 (`20260918120000_bmp_assessment` · `20260920100000_bmp_assessment_unique_active` · `20260920120000_bmp_indicator_detail`) + seed menu `seed-menu-bmp-monev.mjs` + seed indikator `seed-bmp-indicators.ts` — applied **lokal saja**; staging/prod → **#348** |
| Berkas | [00-scope](./00-scope.md) · [01-smoke](./01-smoke.md) · [02-test-cases](./02-test-cases.md) · [03-data-qc](./03-data-qc.md) · [04-findings](./04-findings.md) · [05-signoff](./05-signoff.md) · [runs/](./runs/) |

## Rekap (`node scripts/qa/summary.mjs docs/qa/v0.36.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-09-20-local.md | Smoke | 8 | 0 | 23 | 0 | 0 |
| 2026-09-20-local.md | Kasus uji | 25 | 0 | 6 | 2 | 0 |
| 2026-09-20-local.md | Regresi | 0 | 0 | 8 | 0 | 0 |

**Run lokal 2026-09-20 (mis-dev, SUPERADMIN)** — atas permintaan owner "QA di lokal dulu" sebelum #348. Seluruh kasus Monev BMP dieksekusi dengan berkas masukan turunan form Rohul asli (`scripts/local/QA-QC/v0.36.0/evidence/input/`, dibangkitkan `make-inputs.ts`): 25 Pass · 0 Fail. Blocked = peran OPERATOR/DONOR (belum ada akun QA), unduhan berkas (butuh izin unduh browser), data patok (mis-dev 0 patok), batch ≥ 60 form. Temuan: **F-01** diperbaiki di run (pratinjau import ≠ server untuk berkas tanpa sheet Lembaga), **#350** dicatat (lama).

## Go/No-go

- Lokal: **Go** untuk lanjut ke #348 (deploy staging) — jalur tulis Monev (form, rekap, form survei, rincian, Lembaga, nonaktif) terbukti; QC E1–E8 ✓.
- Staging: belum dijalankan (butuh #348 + akun OPERATOR ter-scope Rokan Hulu & DONOR untuk 23 smoke + 6 kasus Blocked).

## Known issues

- #350 label filter Status mentah (6 halaman, lama).
- TD-042 parsing Excel form di browser ± 5 s/berkas.
- Data mis-dev: 13 penilaian lama skornya masih angka rekap (banner "≠ skor" — disamakan saat import ulang).
