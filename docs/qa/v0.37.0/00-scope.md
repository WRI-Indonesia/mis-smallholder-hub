# 00 · Lingkup rilis v0.37.0

Sumber: `git log c7d9fb9..HEAD` (v0.36.0 → `mvp`), `gh issue list --state closed`, `docs/project/changelog.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #352 | Ketersediaan Data DA-02/DA-03: skor mengikuti skema + drill-down + UI (hero, kartu domain, Radar/Heatmap/Cakupan modul, modal; DA-02 Index + radar, checklist per domain, prioritas, per-KT) | Data Analyst › **Ketersediaan Data — Semua Lembaga** (order 2) · **— Per Lembaga** (order 3) · Master Data › Lembaga Petani › Detail (kartu KPI) | — | — (label & order 2 menu ditukar → seed) | `a-1`, `p-6` ditulis ulang · `3-3`, `p-10` · `r-5` baru | `TC-352-01…21` |
| 2 | #353 | Audit dead code A–E: 3 server action mati, hero-carousel + 13 aset, vitest node, font Acumin, enum `ActivityStatus`, `Tree.surveyedAt` | Bulk Upload › Pohon (kolom hilang tak dipakai) · halaman publik landing | `20260921120000_drop_activity_status_tree_surveyed_at` | — | — | `TC-353-01…02` |
| 3 | #350 | Filter Status menampilkan `active`/`inactive` mentah (6 halaman) + 5 Select lain | Master Data › Petani · Lembaga · Pelatihan · Lahan · Produksi · Monev BMP · Settings › Regions · Data Analyst › Komparasi Acuan · form Lahan/Surat/STDB | — | — | — | `TC-350-01…02` |
| 4 | #288 | DevX: `tsc` mencakup test, `TZ=UTC` vitest, gate 5 langkah | — (dev) | — | — | — | `TC-288-01` (dev) |
| 5 | seed | `seedMenu` kini memperbarui baris yang ada + dry-run diff; `menu.csv` disinkronkan ke prod | sidebar (semua peran) | — | seed menu (3 baris: 2 × P4 + `bulk-upload` 9→10) | — | `TC-SEED-01…02` |

## Di luar lingkup pengujian (sengaja)

- Fitur lanjutan #354 (perbaikan data massal), #355 (enum `NONE`), #356 (bobot modul), #358 (peta kesiapan) — belum dibangun.
- Deploy staging/prod (#357) — QA ini **lokal** (`mis-dev`); run staging/prod menyusul setelah #357.
- Unduhan berkas (Excel/PDF) hanya bila izin unduh browser tersedia; bila tidak → **Blocked** dengan catatan, isi kolom diverifikasi dari pemetaan kolom kode.

## Akun uji (lokal `mis-dev`) — **tanpa password di sini**; password dicetak `scripts/local/qa/create-qa-users.ts` (gitignored)

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | akun owner | semua | seed, Settings, seluruh halaman Data Analyst |
| OPERATOR ter-scope | `qa-operator@localhost.test` | Distrik **Rokan Hulu** (1406) | kasus scope DA-02/DA-03 (`?lembaga=` di luar akses, kueri PostGIS ber-scope), smoke Master Data |
| DONOR | `qa-donor@localhost.test` | — | menu yang tidak boleh tampil, tanpa tombol Excel |

Tester: Claude (dev) sebagai SUPERADMIN lewat ekstensi Chrome; kasus peran OPERATOR/DONOR = **owner login di tab yang sama**, lalu langkah dijalankan bersama (dev tidak memasukkan password).

## Persiapan data uji (`TC-PREP-*`, dijalankan sebelum run pertama)

### TC-PREP-01 · Seed menu lokal + verifikasi diff [P0] (2 mnt)
Prasyarat: `npm run rbac:compare` selaras.
Langkah:
1. `npx tsx scripts/seed/seed-menu-only.ts` (dry-run) → diff **persis 3 baris** (`data-analyst-data-availability` title+order 3→2, `data-analyst-data-completeness` title+order 2→3, `bulk-upload` order 9→10)
2. `--apply`, lalu `npx tsx scripts/qa/data-qc.ts --section F`
Harapan:
- F1 ✓ · F2 ✓ · **F3 ✓**; sidebar Data Analyst: Ringkasan Petani · Ketersediaan Data — Semua Lembaga · Ketersediaan Data — Per Lembaga · Komparasi Data Acuan · Metrik Rilis · Peta Data & Skema.

### TC-PREP-02 · Akun QA lokal [P0] (1 mnt)
Langkah: `npx tsx scripts/local/qa/create-qa-users.ts --apply` (menolak DB non-lokal).
Harapan: 2 akun aktif; OPERATOR punya 1 baris `rbac_user_district` (Rokan Hulu).

### TC-PREP-03 · Data Lembaga acuan [P0] (0 mnt — sudah ada di snapshot prod)
`ISH-1401-02` KUD Karya Sembada (Kampar, 315 petani, Index 51) · `ISH-1406-02` KPUD Intan Makmur (Rokan Hulu, NKT 319 persil, Index 87) · `ISH-1406-10` KUD Bumi Asih (Rokan Hulu, 0 petani, Index 8) · `ISH-1408-02` APKASDU (Siak, 858 petani).
