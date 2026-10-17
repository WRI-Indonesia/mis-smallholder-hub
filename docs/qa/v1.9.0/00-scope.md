# 00 · Lingkup rilis v1.9.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Sumber: `git log 1103b8b..d99d32a`, `docs/project/changelog/2026-10.md` (2026-10-17), `/scope` + `/wrapup` 2026-10-17.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #437 | Peta Fitur: sitemap Mermaid + 12 tampilan (Teks · Interaktif · Hierarki) | Platform Developer › **Peta Fitur** (baru) | — | `platform-developer-sitemap` (VIEW SUPERADMIN · ADMIN · MANAGEMENT) | `p-20` (baru) | `TC-437-01…04` |
| 2 | #381 (prototipe) | Aliran TBS: +6 tab, Arah di semua tab, Offtaker › Sembunyikan (pita lebur), Ke Mill UL di atas, chip filter + Reset | Dashboard › Dashboard Rantai Pasok | — | — | `p-16` | `TC-381-01…06` |
| 3 | — | Tiga putaran perbaikan `/code-review` (30 temuan, 29 diperbaiki) | kedua halaman di atas | — | — | — | tercakup TC di atas |

## Di luar lingkup pengujian (sengaja)

- Data rantai pasok: tetap tabel CSV prototipe (S3 privat); tidak ada perubahan sumber data atau Excel.
- Board Miro Peta Fitur (#437) — belum dibuat.
- Isi 98 diagram `docs/product/sitemap/` — dijaga `sitemap-mermaid.test.ts` / `sitemap-layout.test.ts`, bukan diperiksa manual satu per satu.

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | qa-admin (atau akun owner) | semua | seed menu, Peta Fitur, Aliran TBS |
| OPERATOR ter-scope | qa-operator | 1 Distrik | Peta Fitur **tidak** tampil (TC-437-01); Aliran TBS sesuai scope |
| DONOR | qa-donor | — | Peta Fitur **tidak** tampil (TC-437-01) |

## Persiapan data uji (`TC-PREP-*`, dijalankan sebelum run pertama)

### TC-PREP-01 · Seed menu Peta Fitur di env uji [P0] (3 mnt)
Prasyarat: deploy `staging` hijau; akses DB staging (persetujuan owner).
Langkah:
1. `npx dotenv -e .env.staging -- npx tsx scripts/seed/seed-menu-key.ts platform-developer-sitemap` (dry-run) — cek DB efektif & rencana: 1 menu + 3 izin.
2. Ulangi dengan `--apply`.
Harapan:
- Dry-run: "Menu platform-developer-sitemap: BELUM ADA — akan dibuat (Peta Fitur, parent platform-developer, order 5, ikon Signpost)", "Permission: CSV 3 … akan dibuat 3".
- Apply: "✓ Menu … dibuat", "✓ 3 permission dibuat"; jalankan ulang dry-run → "SUDAH ADA", 0 akan dibuat.
