# QA/QC v0.38.0

| | |
|---|---|
| Versi | v0.38.0 (MINOR — fitur baru Profil Petani PDF #343 + fix Dashboard Monev BMP #360) |
| Rentang | `v0.37.0..mvp` (`57dc846..HEAD`) |
| Migrasi | tidak — hanya seed parsial indikator BMP (2 baris nama kegiatan), lihat `00-scope.md` |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v0.38.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-09-22-local.md | Smoke | 10 | 0 | 21 | 0 | 0 |
| 2026-09-22-local.md | Kasus uji | 7 | 0 | 1 | 1 | 0 |
| 2026-09-22-local.md | Regresi | 3 | 0 | 6 | 0 | 0 |
| 2026-09-22-prod.md | Smoke/Kasus/Regresi (P0) | 0 | 0 | 24 | 0 | 0 |

Run lokal `mis-dev` 2026-09-22 (Claude dev, SUPERADMIN): seluruh kasus #343/#360/seed **Pass** (TC-343-04 Blocked — butuh login OPERATOR); Blocked di smoke/regresi = unduhan & peran yang tak berubah sejak run prod v0.37.0 (render 38/38 rute 200 OK). 4 temuan peningkatan diperbaiki di commit yang sama (lihat lembar run). Staging: deploy hijau (setelah OOM 2× → type-check dipisah, #363); seed #361 applied staging & prod pra-merge. Prod: deploy hijau `af6a388`, QC DB 20 ✓ + F3 ✗ (label menu diubah akun demo → #364); smoke UI prod & peran OPERATOR/DONOR **belum** (URL/akun tidak tersedia untuk dev) — sign-off QA "Terbatas".

## Keputusan

**Go / No-go:** … (tanggal, oleh siapa) — syarat: …

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| | | |
