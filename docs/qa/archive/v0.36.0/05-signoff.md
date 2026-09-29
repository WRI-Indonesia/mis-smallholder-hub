# 05 · Sign-off v0.36.0

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Sofyan (+Claude) | 2026-09-20 | **Go** | gate lokal hijau (lint 0 · tsc 0 · test 1.621 · build ✓); `02` lengkap (33 kasus); review per-issue #344/#346 + rentang penuh #347 (45 temuan, semua diperbaiki); quick review dead code; **run lokal** `2026-09-20-local` 25 Pass · 0 Fail · 6 Blocked; F-01 diperbaiki |
| QA | — | — | **Terbatas** | Run **staging** tidak dijalankan sebagai suite penuh: belum ada akun QA OPERATOR ter-scope / DONOR di staging (23 smoke + 6 kasus Blocked) dan unduhan berkas butuh izin browser. Yang terverifikasi di staging: migrasi + seed (`data-qc.ts` A,E ✓, `rbac:compare` selaras), deploy `staging` hijau 3m56s. Run prod `--only P0` diisi ≤ 1 jam setelah deploy. |
| Owner | Sofyan | 2026-09-20 | **Go** | "lanjut" atas pilihan (a) rilis segera — sidebar prod sudah menampilkan menu Monev (ClipboardCheck ada di ICON_MAP v0.35.0) sehingga 404 sampai deploy; known issues #350 (label filter Status, lama), TD-042, #349, #345 tahap 2, #342 diterima |

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v0.36.0`: ketiga baris Go/Terbatas dengan keputusan owner; migrasi prod applied + checksum disegarkan (`c454383`); run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
