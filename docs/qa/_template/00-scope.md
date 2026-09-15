# 00 · Lingkup rilis vX.Y.Z

Sumber: `git log <tag>..HEAD`, `gh issue list --state closed`, `docs/project/changelog.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #… | … | … | — / `2026…_…` | — / `menu-key` | — / `t-x` | `TC-…-01…` |

## Di luar lingkup pengujian (sengaja)

- …

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | | semua | migrasi/izin, Settings, halaman admin |
| OPERATOR ter-scope | | 1 Distrik | **seluruh** kasus uji fungsional (bug scope hanya terlihat dari sini) |
| DONOR | | — | smoke read-only, menu yang tidak boleh tampil |

## Persiapan data uji (`TC-PREP-*`, dijalankan sebelum run pertama)

Tabel baru kosong pasca-migrasi; kasus uji membutuhkan data yang **dibuat lewat aplikasi** agar jalur tulisnya ikut teruji. Berkas masukan disimpan di `scripts/local/QA-QC/vX.Y.Z/evidence/input/`.

### TC-PREP-01 · … [P0] (5 mnt)
Prasyarat: …
Langkah:
1. …
Harapan:
- …
