# Standar — Environment & File .env

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [workflow.md](./workflow.md) · [architecture.md](./architecture.md) · [../database/security.md](../database/security.md)

## Skema File

Empat environment, satu file per environment. **Tidak ada baris yang di-comment/uncomment** — pindah env dilakukan lewat pemilihan file, bukan edit isi file.

| File | Database | S3 | Cara aktif |
|------|----------|-----|-----------|
| `.env` | **LOCAL** (`localhost:5432`) | **dev** (`mis-dev`) | Otomatis — satu-satunya file yang dibaca default oleh Next.js, Prisma, dan skrip |
| `.env.staging-local` | **STAGING-LOCAL** (`localhost:5432/mis-staging-local`, snapshot prod 2026-08-27) | **dev** (`mis-dev`) | `npx dotenv -e .env.staging-local -- <perintah>` — DB lokal kedua khusus **uji migrasi** sebelum naik ke staging/prod; `.env`/`mis-dev` tetap untuk pengembangan harian. Sebelum `migrate dev` di sini: `pg_dump` dulu ke `scripts/dump-prod/<tanggal>/` |
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

## Refresh DB Local dari Prod

DB local (`localhost:5432/mis-dev`, Postgres.app 17) adalah **snapshot prod**. Untuk menyegarkan (tunnel `:1234` harus aktif; `pg_dump`/`pg_restore` wajib versi ≥ PG prod — pakai milik `libpq` Homebrew):

```bash
mkdir -p scripts/dump-prod/$(date +%F)   # folder di-gitignore — dump berisi data pribadi petani, jangan pernah commit
npx dotenv -e .env.prod -- sh -c '/opt/homebrew/opt/libpq/bin/pg_dump "$DATABASE_URL" -Fc -f scripts/dump-prod/'$(date +%F)'/mis-prod.dump'
psql "postgresql://postgres:postgres@localhost:5432/postgres" -c 'drop database "mis-dev";' -c 'create database "mis-dev";'
/opt/homebrew/opt/libpq/bin/pg_restore --no-owner --no-privileges -d "postgresql://postgres:postgres@localhost:5432/mis-dev" scripts/dump-prod/$(date +%F)/mis-prod.dump
```

Dump membawa `_prisma_migrations`, jadi status migrasi local otomatis sama dengan prod.

Cara yang sama berlaku untuk menyegarkan **staging** (ganti target restore ke `.env.staging`; wipe dengan `drop schema public cascade; create schema public;` karena user staging bukan pemilik database).

## Status (2026-08-17)

- DB **local** dan **staging** (tunnel `:1235/mis-staging`) = snapshot prod per 2026-08-17 (26 tabel; 8.626 petani, 10.953 lahan, 10.783 produksi). Dump: `scripts/dump-prod/2026-08-17/mis-prod.dump`.
- Skema staging lama (tabel ber-tanda-hubung, migrasi Mei 2026, ada tabel audit/HSE/sertifikasi) di-backup ke `scripts/dump-prod/2026-08-17/mis-staging-legacy-backup.dump` sebelum ditimpa.
- DB **dev** (tunnel `:1235/mis-dev`, satu server dengan staging): hidup, 40 tabel — masih **skema lama** (belum disinkronkan dengan prod).
- Prod & staging: PostgreSQL **18.3**; local: Postgres.app **17.2** — dump/restore memakai client 18 dari `libpq` Homebrew.
