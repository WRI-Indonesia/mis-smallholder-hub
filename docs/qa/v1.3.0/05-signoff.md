# 05 · Sign-off v1.3.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude (Opus 5.5) | 2026-09-30 | **Go** | Gate lokal hijau (lint · build · typecheck · test **2.461** · docs sinkron). Review `/code-review high` rentang penuh `9b95dee..HEAD`: 1 temuan valid (memo role menimpa sign-in) diperbaiki `45a8fcc` + test merah-tanpa-fix. `02` memuat TC per issue v1.3.0 (+ TC-396-01); tidak ada temuan blocker/major |
| QA | Claude + owner (TC-342-01) | 2026-09-30 | **Go — terbatas** | Run staging `2026-09-30-staging`: P0 TC-342-01 Pass (owner), TC-277-01 Pass, TC-394-01 = deploy rilis ini; 0 Fail. Langkah per peran (OPERATOR/ber-scope), smoke per peran, dan regresi **tidak** dijalankan; 1 temuan minor (defer) |
| Owner | Sofyan Agus Salim | 2026-09-30 | **Go** | "TC-342-01 sudah lulus, lanjut migrasi prod" → "ya, mulai dari langkah 1" (rilis); rilis lebih awal dari target 25 Okt, sisa → v1.4.0 (keputusan owner). Known issues di `README.md` |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v1.3.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
