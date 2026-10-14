# 05 · Sign-off v1.8.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude | 2026-10-14 | Go | gate lokal hijau (3.094 test, build, lint, typecheck); `02` lengkap (16 kasus #424–#433); 2 wrap-up `/code-review` (8 + 4 temuan diperbaiki, sisanya TD-062…066); tanpa migrasi |
| QA | Claude (run staging) | 2026-10-14 | Go | run staging `2026-10-14-staging.md` (`000ced9`): smoke P0 13 · kasus 16 · regresi 3 Pass · **0 Fail**; N/A: DONOR (SM-29 + langkah DONOR) & akun ber-override; run lokal TC-433/429 0 Fail; seed menu staging ✓, snapshot BMP staging di-generate ulang |
| Owner | | | Go / No-go | known issues diterima |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v1.8.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
