# 05 · Sign-off v1.0.0

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude (Opus 5) | 2026-09-23 | **Go — terbatas** | Gate lokal hijau (lint 0 · build ✓ · tsc 0 · test 1.807). `02-test-cases.md` lengkap. Review pra-rilis rentang penuh 6 temuan: 5 diperbaiki, 1 diputuskan owner. **Tidak ada temuan blocker/major tersisa.** Syarat: dua baris di bawah terisi sebelum tag. |
| QA | _(belum)_ | | Go / No-go | **Run staging belum ada.** Run lokal `runs/2026-09-23-local.md` 5 Pass · 0 Fail · 4 Blocked — lihat batasannya di bawah, jangan dibaca sebagai QA rilis. |
| Owner | _(belum)_ | | Go / No-go | Known issues di `README.md` perlu diterima eksplisit — termasuk `FIRMS_MAP_KEY_FREE` tercetak ke log (#286 butir 2). |

## Status sebenarnya — dibaca dulu sebelum mengisi dua baris kosong di atas

Rilis ini **belum memenuhi prasyarat tag** menurut `standards/versioning.md` §Alur Rilis. Yang sudah dan belum:

| Prasyarat | Status |
|---|---|
| Gate otomatis 5 langkah hijau | ✅ lint 0 · build ✓ · tsc 0 · test 1.807 · docs sinkron |
| `geom` kabupaten terisi di prod (syarat Go #1 rilis ini) | ✅ 12/12 di dev, staging, **dan prod**; outline prod 84 polygon / 75 kB |
| Migrasi prod applied + checksum disegarkan | ✅ **tidak berlaku** — rilis kode murni, nol migrasi |
| `rbac:compare` selaras | ✅ **tidak dijalankan, dan memang tidak perlu** — nol berkas RBAC/menu/seed/prisma tersentuh di rentang |
| Run **staging** dengan semua P0 Pass | ❌ **belum ada** |
| Run **prod** `--only P0` ≤ 1 jam setelah deploy | ❌ belum (menyusul deploy) |
| Ketiga baris sign-off **Go** | ❌ baru Developer |

## Batasan run lokal 2026-09-23 — kenapa ini bukan QA rilis

Dijalankan otomatis (Claude in Chrome) terhadap `mis-dev` + dev server lokal. Yang **tidak** tercakup:

1. **Peran OPERATOR & DONOR tidak diuji sama sekali** — hanya SUPERADMIN. `01-smoke.md` sendiri menulis: *"Peran non-SUPERADMIN wajib: bug scope tidak terlihat dari SUPERADMIN."* Ini lubang terbesar run ini.
2. **Smoke 31 kasus dan regresi 9 kasus tidak dijalankan** — regresi butuh berkas uji (shapefile patok, Excel NKT) yang tidak disiapkan.
3. **Cap 500 baris (#286 butir 5–6) tidak pernah terpicu** — titik < 15 km dari Lembaga = 0 pada rentang yang tersedia. Fitur ini hanya bekerja saat musim karhutla, dan **belum pernah terlihat bekerja pada data nyata**. Bukan Pass; dicatat Blocked.
4. **Lokal ≠ staging** — build produksi, RAM server, dan latensi tunnel tidak terwakili. #363 (OOM staging) khususnya hanya terbukti saat deploy staging sungguhan.

Yang **sudah** terbukti dan tidak perlu diulang identik di staging: invarian "Dalam Boundary" konsisten di kedua dokumen PDF (TC-365-02), kesamaan angka Fire Alert ↔ Peta Lahan (TC-280-02), dan pemilihan sumber arsip SP vs NRT (TC-365-01).

## Rekomendasi urutan

1. Deploy `staging`, lalu jalankan `new-run.mjs --version v1.0.0 --env staging` **dengan akun OPERATOR ter-scope dan DONOR**.
2. Prioritaskan yang lokal tak bisa: smoke lintas peran, `TC-286-01/02` pada bulan padat (mis. Agustus/September tahun karhutla), dan `TC-365-02` dari akun OPERATOR satu distrik.
3. Isi baris QA & Owner di atas, baru tag `v1.0.0`.

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v1.0.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan (**N/A** rilis ini); run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
