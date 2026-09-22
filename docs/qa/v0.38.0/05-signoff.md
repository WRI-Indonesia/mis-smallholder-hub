# 05 · Sign-off v0.38.0

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude (dev) | 2026-09-22 | **Go (lokal)** | gate lokal hijau (lint · build · typecheck · 1.744 tes); `02` 8 kasus + regresi; run lokal kasus 7 Pass · 0 Fail (TC-343-04 Blocked — peran), smoke 10 Pass · 21 Blocked (render 38/38 rute 200), regresi 3 Pass; 4 temuan run diperbaiki & di-commit (`bf17514`); review rentang penuh `/code-review high` 2 temuan ditindak (`bb9ac53`) |
| QA | — | 2026-09-22 | **Terbatas** | Peran OPERATOR/DONOR (TC-343-04, SM-28/29) belum dijalankan — butuh owner login akun QA lokal; unduhan Excel/PDF laporan & 6 regresi berkas uji tak diulang (tak berubah sejak run prod v0.37.0). Staging: deploy `80a0fe6` (lihat run staging); smoke UI staging butuh URL/akun; **seed #361 belum applied** (tunnel DB belum aktif) |
| Owner | Sofyan | | | |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v0.38.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
