# 00 · Lingkup rilis v1.2.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../../README.md) · Paket: [README.md](README.md)

Sumber: `git log v1.1.0..HEAD`, `gh issue list --state closed`, `docs/project/changelog/2026-09.md`.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #317 | Tumpang Tindih Lahan (Fase 2) | Data Analyst › Tumpang Tindih Lahan; semua tabel `DataTable` | — | `data-analyst-parcel-overlap` | `p-14` | `TC-317-01…07` |
| 2 | #378 | Sprint Mingguan | Data Analyst › Sprint Mingguan | — | `data-analyst-sprint` | `p-15` | `TC-378-01…04` |
| 3 | #389 | Sprint Mingguan: kanban | Data Analyst › Sprint Mingguan (tab Sprint) | — | — | `p-15`, `3-3` | `TC-389-01` |
| 4 | #263 | Izin DONOR = prod | Master Data (5), Risk, Report | — | izin DONOR (CSV) | `1-3`, `a-2` | `TC-263-01` |
| 5 | #364 | Label menu = prod; struktur menu dikunci | Settings › Menu Management; sidebar Data Analyst | — | label 2 menu (prod sudah sama) | `a-5`, `p-6`, `a-1`, `l-6`, `3-3` | `TC-364-01…03` |
| 6 | #237 | "Aktifkan kembali" menu | Settings › Menu Management | — | — | `a-5` | `TC-237-01…02` |
| 7 | #385 | Kunci S3 bukti pelatihan | Master Data › Pelatihan; Ketersediaan Data (modul Bukti) | — | — | — | `TC-385-01` |
| 8 | #252 | `getAccessContext` cache + user nonaktif fail-closed | **semua halaman ber-scope** | — | — | — | smoke `SM-28` (scope OPERATOR) |
| 9 | #383 | Data nyata di contoh repo diganti fiktif | Bulk Upload › Lahan (template NKT & Detail), Pelatihan (template peserta) | — | — | `p-12` | smoke `SM-24` |
| 10 | #388 | Audit & restrukturisasi docs; redirect indeks | `/admin/data-analyst`, `/admin/settings`, `/admin/dashboard/risk`; Tools › Snapshot | — | — | 46 materi | `TC-388-01` |
| 11 | #311 | Test performa stabil | — (gate lokal) | — | — | — | — |

## Di luar lingkup pengujian (sengaja)

- #311 — hanya gate lokal (`npm test`), tanpa perilaku aplikasi.
- Hitungan kueri scope per render (#252) — diukur bila log Prisma diaktifkan sementara; bukan kasus fungsional.
- Jalur serangan #385 (kunci objek asing, `activityId` ber-`../`) — dikunci unit test.

## Akun uji — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | akun owner | semua | seed/izin, Settings, halaman admin |
| ADMIN | `qa-admin@localhost.test` (lokal) | 1 Distrik | Menu Management tanpa izin Delete (TC-364-03, TC-237-02 langkah 4), Tumpang Tindih ber-scope |
| OPERATOR ter-scope | `qa-operator@localhost.test` (lokal) | Distrik **Rokan Hulu** (1406) | seluruh kasus scope (TC-317-05, SM-28), Sprint tidak tampil |
| DONOR | `qa-donor@localhost.test` (lokal) | — | TC-263-01, SM-29, menu yang tidak boleh tampil |

## Persiapan data uji (`TC-PREP-*`, dijalankan sebelum run pertama)

### TC-PREP-01 · Seed menu v1.2.0 per menu [P0] (3 mnt)
Prasyarat: kode v1.2.0 sudah ter-deploy di env itu (ikon `Layers`, `CalendarRange` dikenal `ICON_MAP`).
Langkah:
1. `npx dotenv -e .env.<env> -- node scripts/seed/seed-menu-key.mjs data-analyst-parcel-overlap` (dry-run), periksa, lalu ulang dengan `--apply`.
2. Sama untuk `data-analyst-sprint`.
3. `npx dotenv -e .env.<env> -- npx tsx scripts/qa/data-qc.ts --section F,G`.
Harapan:
- G1 & G2 ✓; F3 ✓ (label Ketersediaan Data = CSV). **Jangan** `seed-menu-only.ts --apply` (memulihkan izin yang dihapus admin).

### TC-PREP-02 · Akun uji per peran [P0] (5 mnt)
Prasyarat: SUPERADMIN.
Langkah: pastikan ketiga akun uji di atas ada, aktif, dan ber-scope sesuai tabel (Settings › User Management).
Harapan: login ketiganya berhasil; OPERATOR hanya melihat Lembaga Rokan Hulu.
