# 00 · Lingkup rilis v1.1.0

Sumber: `git log v1.0.0..HEAD` (di `mvp`: `chore(release): v1.0.0` `55e6472`..HEAD), `gh issue list --state closed`, `docs/project/changelog.md` 2026-09-23.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #370 | Excel lahan: Jumlah Node + Koordinat | Peta › Peta Lahan · Report › Lahan | — | — | `3-2-peta`, `l-2` | `TC-370-01…03` |
| 2 | #371 | Excel per KT/Blok + Urutan No | Report › Lahan · Peta Lahan · Master Data › Lembaga Petani (detail) | — | — | `l-2`, `3-2-peta`, `p-12` | `TC-371-01…07` |
| 3 | #372 | Sebaran Lahan warna per KT/Blok | Master Data › Lembaga Petani (detail) | — | — | `2-1-master-data` | `TC-372-01…02` |
| 4 | #373 | UL Parcel Code boleh di >1 lahan | Master Data › Lahan (detail, Legalitas) · Bulk Upload › Detail Lahan | **`20260923120000_external_id_shared_code`** | — | `t-5`, `1-1-istilah` | `TC-373-01…04` |
| 5 | #374 | KT "Tidak Ada" = kosong | Master Data › Lahan (form) · Bulk Upload › Lahan & Detail Lahan · Detail Lembaga · Report › Kelompok Tani | — (**data**: 417 baris) | — | `u-3`, `u-5`, `l-6` | `TC-374-01…03` |
| 6 | #375 | Nama berkas unduhan legenda | Peta Lahan · Detail Lembaga | — | — | — | `TC-375-01` |

## Urutan penerapan per lingkungan (runbook)

> ⚠️ **Status 2026-09-23:** migrasi #373 **sudah** di `mis-prod` sementara aplikasi prod masih **v1.0.0** (menulis lewat unique lama `source_code`) — jendela ini ditutup oleh rilis v1.1.0 (TD-045). v1.0.0 dirilis hari yang sama → v1.1.0 hari ini hanya bila owner menetapkannya **hotfix kritis** (aturan maks. 1 rilis/hari, `versioning.md`).

| Langkah | `mis-staging` | `mis-prod` |
|---|---|---|
| 1. Dump | `scripts/dump-prod/<tgl>/mis-staging-before-v1.1.0.dump` | `…/mis-prod-before-kt-374.dump` (dump migrasi #373 sudah ada) |
| 2. Migrasi #373 | `npx dotenv -e .env.staging -- npx prisma migrate deploy` | ✅ sudah (2026-09-23) |
| 3. Data #374 — dry-run | `npx dotenv -e .env.staging -- npx tsx scripts/local/other/clean-kt-tidak-ada-374.ts` | `npx dotenv -e .env.prod -- npx tsx …/clean-kt-tidak-ada-374.ts` — harapan **417 baris / 3 Lembaga** (ISH-1401-01 314 · ISH-1408-05 102 · ISH-1401-05 1; gladi `mis-staging-local` sama) |
| 4. Data #374 — tulis | `… --write` (backup otomatis ke `tmp-backup/`, verifikasi sisa 0 lalu COMMIT) | `… --write` **setelah approval owner** |
| 5. Deploy | `mvp → staging` | PR `staging → main` (merge = deploy prod) |
| 6. Snapshot | — | Buat snapshot Main Dashboard baru (angka KT per Lembaga) |
| 7. Checksum | — | tak perlu lagi untuk #373 (`applied-checksums.json` sudah disegarkan) |

Urutan 3–4 sebelum atau sesudah deploy sama-sama aman: penjaga input (#374) hanya mencegah isian baru, dan pengelompokan Excel/peta sudah menganggap "Tidak Ada" kosong.

## Di luar lingkup pengujian (sengaja)

- Cek silang 82 UL Parcel Code ganda (#373) — pekerjaan data, bukan uji rilis.
- Kolom Koordinat ber-`wrap` di Peta Lahan vs tanpa wrap di Laporan Lahan — menunggu keputusan owner (TD-044).

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | | semua | migrasi/data, TC-373-02 sisi A |
| OPERATOR ter-scope | | 1 Lembaga (BY_FARMER_GROUP) | **TC-373-02 sisi B** (tautan "Juga dipakai" di luar scope), kasus uji fungsional |
| DONOR | | — | smoke read-only |

## Persiapan data uji (`TC-PREP-*`)

### TC-PREP-01 · Kode UL ganda lintas Lembaga untuk TC-373-02 [P0] (3 mnt)
Prasyarat: akses baca DB staging.
Langkah:
1. `SELECT e.source, e.code, count(DISTINCT g.id) AS lembaga FROM tbl_land_parcel_external_id e JOIN tbl_land_parcel lp ON lp.parcel_uid = e.parcel_uid AND lp.is_active JOIN tbl_farmer f ON f.id = lp.farmer_id JOIN tbl_farmer_group g ON g.id = f.farmer_group_id WHERE e.is_active GROUP BY 1,2 HAVING count(DISTINCT g.id) > 1 LIMIT 5;`
Harapan:
- Minimal satu kode lintas Lembaga (prod punya 82 kode ganda; staging setelah refresh sama). Bila kosong: buat lewat TC-373-03 di dua lahan beda Lembaga.
