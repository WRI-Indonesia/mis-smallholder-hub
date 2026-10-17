# 05 · Sign-off v1.9.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude | 2026-10-17 | Go | gate lokal hijau (3.138 test, build, lint, typecheck); `02` lengkap (TC-PREP-01 + 10 kasus #437/#381); tiga putaran `/code-review` (30 temuan, 29 diperbaiki; elkjs/dagre → TD-067); tanpa migrasi |
| QA | Claude (run lokal & staging) | 2026-10-17 | Go dengan catatan | run lokal `2026-10-17-lokal.md` + staging `2026-10-17-staging.md` (`1d97e43`): kasus 10 Pass · 1 Blocked · **0 Fail**; smoke 2 Pass · 11 Blocked · 0 Fail. Blocked = bagian peran OPERATOR/DONOR (akun tak tersedia di sesi); deploy staging hijau dengan 11 dependensi baru; seed menu staging ✓ |
| Owner | Sofyan | 2026-10-17 | Go dengan catatan | Blocked peran OPERATOR/DONOR diterima (rilis hanya menambah 1 menu ber-VIEW 3 peran; dicek di run prod P0 bila akunnya tersedia); rilis prod **Senin 2026-10-19** |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v1.9.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
