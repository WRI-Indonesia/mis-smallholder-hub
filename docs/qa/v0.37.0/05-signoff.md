# 05 · Sign-off v0.37.0

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude (dev) | 2026-09-21 | **Go (lokal)** | gate lokal hijau (lint · build · typecheck · 1.702 tes); `02` lengkap (31 kasus); run lokal 35 Pass · 0 Fail; 3 temuan run diperbaiki & di-commit |
| QA | owner (login peran di run lokal) | 2026-09-21 | **Terbatas** | Run lokal penuh 35 Pass / 0 Fail (SUPERADMIN + OPERATOR ter-scope + DONOR). Staging: migrasi + seed terverifikasi (`data-qc` A/B/F ✓, `rbac:compare` selaras), deploy hijau; **smoke UI staging tidak dijalankan** (URL tidak tersedia) dan unduhan Excel/PDF + 8 regresi patok/NKT Blocked (izin unduh / berkas uji) → diverifikasi di run prod `--only P0` |
| Owner | Sofyan | 2026-09-21 | **Go** | "lanjut" — rilis v0.37.0 lewat `mvp → staging → main`; known issues #354 (data), #311 (perf flaky) diterima |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v0.37.0`: ketiga baris Go/Terbatas dengan keputusan owner; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
