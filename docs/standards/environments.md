# Standar — Environment & File .env

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [workflow.md](./workflow.md) · [architecture.md](./architecture.md) · [../database/security.md](../database/security.md)

## Skema File

Empat environment, satu file per environment. **Tidak ada baris yang di-comment/uncomment** — pindah env dilakukan lewat pemilihan file, bukan edit isi file.

| File | Database | S3 | Cara aktif |
|------|----------|-----|-----------|
| `.env` | **LOCAL** (`localhost:5432`) | **dev** (`mis-dev`) | Otomatis — satu-satunya file yang dibaca default oleh Next.js, Prisma, dan skrip |
| `.env.staging-local` | **STAGING-LOCAL** (`localhost:5432/mis-staging-local`, snapshot prod 2026-09-14) | **dev** (`mis-dev`) | `npx dotenv -e .env.staging-local -- <perintah>` — DB lokal kedua khusus **uji migrasi** sebelum naik ke staging/prod; `.env`/`mis-dev` tetap untuk pengembangan harian. Sebelum `migrate dev` di sini: `pg_dump` dulu ke `scripts/dump-prod/<tanggal>/` |
| `.env.dev` | DEV | **dev** (`mis-dev`) | `npx dotenv -e .env.dev -- <perintah>` |
| `.env.staging` | STAGING | **dev** (`mis-dev`) | `npx dotenv -e .env.staging -- <perintah>` |
| `.env.prod` | **PROD** (via tunnel `:1234`) | **prod** (`mis-main`) | `npx dotenv -e .env.prod -- <perintah>` — ⚠️ selalu sadar & eksplisit |

**S3 hanya ada 2 akun**: **prod** (`mis-main`) dan **dev** (`mis-dev`). Local dan staging memakai S3 dev — tidak ada bucket local/staging. Konsekuensi: file upload dari local & staging bercampur di bucket `mis-dev`.

Semua `.env*` di-gitignore kecuali `.env.example`. Di server produksi, `.env` ditulis oleh `deploy-main.yml` dari GitHub Secrets — file `.env.prod` di laptop hanya untuk skrip maintenance via tunnel.

## Aturan Main

1. **`.env` = local, selamanya.** Jangan pernah menyalin isi env lain ke `.env`. Perintah tanpa prefix `dotenv -e` selalu mendarat di local — itu kontraknya.
2. **Dilarang membuat `.env.local`** — Next.js memuatnya otomatis dan menimpanya di atas `.env`, membuka kembali celah "env menang diam-diam".
3. **Satu `DATABASE_URL` per file.** Dilarang menaruh dua `DATABASE_URL` dalam satu file (dotenv memakai baris terakhir, diam-diam — akar insiden skrip lokal mendarat di prod).
4. **Prod harus eksplisit.** Setiap sentuhan ke prod memakai `npx dotenv -e .env.prod -- …`. Untuk skrip yang **menulis** data prod, tetap berlaku aturan [workflow.md](./workflow.md) §Safety & Approval: log "DB efektif" sebelum menulis + dry-run dulu + approval owner.
5. **Kredensial baru masuk file env-nya**, bukan hardcode di kode. Variabel yang berlaku lintas env (mis. `NEXTAUTH_*`, `FIRMS_MAP_KEY_FREE`, `S3_ENDPOINT`, `S3_REGION`) cukup di `.env` — `dotenv -e` menang untuk variabel yang didefinisikannya, sisanya diambil dari `.env`.
6. **Menambah variabel env baru** → tambahkan juga ke `.env.example` (tanpa nilai rahasia) dan ke file env lain yang relevan.

## Contoh Pemakaian

```bash
npm run dev                                          # app → DB local + S3 dev
npx dotenv -e .env.staging -- npm run dev            # app → DB staging + S3 dev
npx dotenv -e .env.prod -- tsx scripts/seed/seed-boundary-lembaga.ts  # skrip seed ter-track → PROD (dry-run dulu)
npx dotenv -e .env.prod -- tsx scripts/local/other/x.ts   # skrip sekali-pakai → PROD (sadar & eksplisit)
npx dotenv -e .env.prod -- npx prisma studio         # inspeksi DB prod
```

> **Di mana skrip tinggal (#279).** Skrip yang merupakan **satu-satunya definisi tereksekusi** dari data produksi ada di `scripts/seed/` dan **di-track** — lihat `scripts/seed/README.md` untuk aturan isinya (skrip di-track, data tidak). `scripts/local/` tetap gitignored: ia memuat berkas ber-PII dan repo ini **publik**. Berkas data ditunjuk lewat `--data=<dir>` / `SEED_DATA_DIR`, bukan lewat lokasi skripnya.

Mekanisme: `dotenv -e` men-set variabel di process environment **sebelum** proses anak berjalan; `dotenv/config` maupun loader `.env` Next.js **tidak menimpa** variabel yang sudah ter-set, sehingga file yang dipilih selalu menang atas `.env`.

## Refresh DB Non-Prod dari Prod (local, staging-local, staging)

Ketiga DB non-prod — **local** (`localhost:5432/mis-dev`, Postgres.app **18** sejak 2026-09-14), **staging-local** (`localhost:5432/mis-staging-local`), dan **staging** (tunnel `:1235`) — adalah **snapshot prod**, dan semuanya disegarkan dari satu dump `mis-prod` yang sama. Prasyarat: tunnel prod `:1234` aktif (plus `:1235` bila staging ikut), dan `pg_dump`/`pg_restore` **versi ≥ PG prod** — prod **PostgreSQL 18.3**; sejak local juga PG 18, client bawaan Postgres.app `/Applications/Postgres.app/Contents/Versions/18/bin/` sudah cukup; `postgresql@18`/`libpq` Homebrew tetap bisa dipakai. Yang berbeda antar-target hanya **cara mengosongkan DB tujuan**: DB lokal di-`drop database` (kita pemiliknya), staging di-`drop schema` (user staging bukan pemilik database). Ambil dump prod, lalu isi DB lokal — untuk `mis-staging-local`, ganti nama DB di dua baris terakhir:

```bash
mkdir -p scripts/dump-prod/$(date +%F)   # folder di-gitignore — dump berisi data pribadi petani, jangan pernah commit
npx dotenv -e .env.prod -- sh -c '/opt/homebrew/opt/libpq/bin/pg_dump "$DATABASE_URL" -Fc -f scripts/dump-prod/'$(date +%F)'/mis-prod.dump'
psql "postgresql://postgres:postgres@localhost:5432/postgres" -c 'drop database "mis-dev";' -c 'create database "mis-dev";'
/opt/homebrew/opt/libpq/bin/pg_restore --no-owner --no-privileges -d "postgresql://postgres:postgres@localhost:5432/mis-dev" scripts/dump-prod/$(date +%F)/mis-prod.dump
```

Dump membawa `_prisma_migrations`, jadi status migrasi tiap target otomatis sama dengan prod.

Untuk **staging** langkahnya sama, dengan dua beda: wipe-nya `drop schema public cascade; create schema public;`, dan isi lama **di-backup dulu** karena wipe ini tidak bisa dibatalkan. Contoh di bawah kebetulan menyalin `mis-staging-local` → `mis-staging`; untuk menyegarkan staging **dari prod**, lewati baris kedua dan ganti berkas yang di-`pg_restore` menjadi `mis-prod.dump`:

```bash
npx dotenv -e .env.staging      -- sh -c '/opt/homebrew/opt/libpq/bin/pg_dump "$DATABASE_URL" -Fc -f scripts/dump-prod/'$(date +%F)'/mis-staging-before-refresh.dump'   # backup dulu
npx dotenv -e .env.staging-local -- sh -c '/opt/homebrew/opt/libpq/bin/pg_dump "$DATABASE_URL" -Fc -f scripts/dump-prod/'$(date +%F)'/mis-staging-local.dump'
npx dotenv -e .env.staging -- sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "drop schema public cascade;" -c "create schema public;" -c "grant all on schema public to public;" \
  -c "drop schema if exists tiger cascade; drop schema if exists tiger_data cascade; drop schema if exists topology cascade;"'
npx dotenv -e .env.staging -- sh -c '/opt/homebrew/opt/libpq/bin/pg_restore --no-owner --no-privileges -d "$DATABASE_URL" scripts/dump-prod/'$(date +%F)'/mis-staging-local.dump'
```

> **Jangan lupa `tiger`/`topology`.** Snapshot prod membawa schema kosong `tiger` & `topology` (sisa paket PostGIS). Keduanya **selamat** dari `drop schema public cascade`, lalu menabrak restore dengan `ERROR: schema "tiger" already exists` — dengan `--exit-on-error` restore berhenti di baris pertama dan DB tertinggal kosong. Drop keduanya bersamaan dengan `public`.

Versi PostGIS tidak perlu disamakan: dump hanya memuat `CREATE EXTENSION`, jadi tiap server memasang versi defaultnya sendiri (sejak 2026-09-14 kebetulan sama: local & server 3.6.3).

## Status (2026-09-23)

- **Ketiga DB non-prod = snapshot prod 2026-09-23 identik** (restore penuh `scripts/dump-prod/2026-09-23/mis-prod.dump`, pg_dump/pg_restore 18.6 dari `postgresql@18`): 8.863 petani, 14.016 lahan aktif, 14.017 identitas lahan, 319 NKT, 43.111 patok lahan, 19.554 produksi, 929 pelatihan, 188 penilaian BMP, 44 user, 38 migrasi ter-apply (terakhir `drop_activity_status_tree_surveyed_at`), 42 tabel / 134 index, PostGIS 3.6.3 — sama persis dengan prod. Berlaku untuk **local** (`mis-dev`), **staging-local** (`localhost:5432/mis-staging-local`), dan **staging** (tunnel `:1235/mis-staging`). Sebelum refresh keempat DB sudah di 38 migrasi yang sama (= repo), jadi tak ada skema belum-rilis yang hilang. Backup isi lama ketiganya di folder yang sama (`<db>-before-refresh.dump`); restore ketiganya bersih (0 baris di `restore-<db>.log`); DB lokal di-drop `WITH (FORCE)`.
- Riwayat: **snapshot prod 2026-09-18 identik** (restore penuh `scripts/dump-prod/2026-09-18/mis-prod.dump`, pg_dump/pg_restore 18.6 dari `postgresql@18`): 8.864 petani, 14.004 lahan aktif, 14.005 identitas lahan, 319 NKT, 19.554 produksi, 910 pelatihan, 44 user, 34 migrasi ter-apply (terakhir `land_marker_code`), 37 tabel / 118 index, PostGIS 3.6.3 — sama persis dengan prod. Berlaku untuk **local** (`mis-dev`), **staging-local** (`localhost:5432/mis-staging-local`), dan **staging** (tunnel `:1235/mis-staging`). Backup isi lama ketiganya di folder yang sama: `mis-dev-before-refresh.dump`, `mis-staging-local-before-refresh.dump`, `mis-staging-before-refresh.dump`. Restore ketiganya bersih (0 baris di `restore-<db>.log`); DB lokal di-drop `WITH (FORCE)` karena dev server `:3000` sedang berjalan — ia reconnect sendiri setelah restore.
- Riwayat: **snapshot prod 2026-09-14 identik** untuk ketiganya (restore penuh `scripts/dump-prod/2026-09-14/mis-prod.dump`, pg_dump/pg_restore 18.6 dari `postgresql@18`): 8.863 petani, 14.002 lahan, 16.274 produksi, 822 pelatihan, 44 user, 29 migrasi ter-apply (terakhir `land_stdb_stage`) — sama persis dengan prod. Berlaku untuk **local** (`mis-dev`), **staging-local** (`localhost:5432/mis-staging-local`), dan **staging** (tunnel `:1235/mis-staging`). Backup isi lama ketiganya di folder yang sama: `mis-dev-before-refresh.dump`, `mis-staging-local-before-refresh.dump`, `mis-staging-before-refresh.dump`. Restore ketiganya bersih (0 error di `restore-<db>.log`).
- Riwayat sebelumnya: local & staging-local = snapshot prod 2026-09-01 (`scripts/dump-prod/2026-09-01/`); staging = salinan `mis-staging-local` 2026-08-28 (snapshot prod 2026-08-27 + 3 migrasi, lalu `land_stdb_stage` #309) — dump & backup skema lamanya di `scripts/dump-prod/2026-08-28/`.
- **Penyeragaman `crop_type` 2026-09-01 — SELURUH env sudah:** setiap lahan bernilai **"Kelapa Sawit"** di `mis-dev` (13.668) · `mis-staging-local` (13.668) · `mis-staging` (13.639) · `mis-prod` (13.677). Tidak ada divergensi antar-env pada kolom ini. Skor Ketersediaan Data domain Lahan **naik di semua env** karena `crop_type` ikut dinilai — snapshot dashboard lama tetap memuat angka pra-perubahan. Backup kolom pra-perubahan per DB: `tmp-backup/croptype-<db>-before-<ts>.csv`.
- DB **dev** (tunnel `:1235/mis-dev`, satu server dengan staging): hidup, masih **skema lama** (belum disinkronkan dengan prod).
- **Versi PG lokal disamakan 2026-09-14:** Postgres.app 2.9.6, server **18.6** (data `var-18`, port 5432), PostGIS **3.6.3** — major PG & PostGIS sama persis dengan prod/staging (18.3 / 3.6.3). Keempat DB lokal (`mis-dev`, `mis-staging-local`, `mis-android`, `mis_analytics`) di-restore ulang ke server 18 (0 error); `mis-android`/`mis_analytics` dari dump server 17 (`scripts/dump-prod/2026-09-14/local17-*.dump`). Server 17 (`var-17`, PG 17.11) dibiarkan berhenti sebagai fallback — bisa dihapus dari Postgres.app setelah beberapa minggu. Role `postgres` dibuat otomatis oleh Postgres.app 2.9 (auth trust lokal), `.env` tidak berubah.
- Riwayat: staging pernah disamakan dengan snapshot prod 2026-08-17; skema staging lama (tabel ber-tanda-hubung, migrasi Mei 2026, tabel audit/HSE/sertifikasi) di-backup ke `scripts/dump-prod/2026-08-17/mis-staging-legacy-backup.dump` sebelum ditimpa.
