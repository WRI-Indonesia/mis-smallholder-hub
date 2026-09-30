# Standar — Prosedur Rollback Deploy

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [workflow.md](./workflow.md) §GitHub Actions · [versioning.md](./versioning.md) §Alur Rilis · [environments.md](./environments.md) · [../database/migrations.md](../database/migrations.md)

Cara membatalkan rilis yang bermasalah di **staging** atau **produksi** (#232, OPS-02). Matriks environment, file `.env`, dan cara menyentuh DB non-lokal ada di [environments.md](./environments.md). Dokumen ini hanya membahas pembatalan.

**Prinsip:** mundur lewat jalur yang sama dengan maju. Kode lewat git (revert → push/PR → deploy otomatis), skema lewat migrasi. Jalan pintas di server (checkout manual, SQL tanpa jejak) hanya untuk darurat dan harus dirapikan di hari yang sama.

## Memilih jalur

| Kondisi rilis yang bermasalah | Jalur | Urutan |
| --- | --- | --- |
| Tanpa migrasi | **A** rollback aplikasi | Revert kode saja |
| Migrasi **kompatibel mundur** (tabel/kolom nullable baru, indeks baru): kode lama tetap jalan di skema baru | **A** rollback aplikasi | Revert kode, skema dibiarkan; perbaiki maju di rilis berikutnya |
| Migrasi **memutus kode lama** (drop/rename kolom, NOT NULL baru, unique diubah) | **B** rollback migrasi, lalu **A** | Skema dulu (B1/B2/B3), baru kode |
| `migrate deploy` **gagal di tengah** | **C** migrasi gagal | Pulihkan migrasi itu sebelum deploy apa pun |

Cara memastikan "kompatibel mundur": cari pemakai objek lama di tag yang akan dipulihkan, mis. `git grep <nama_kolom> v1.2.0 -- src/ prisma/`. Aturan yang sama dipakai untuk migrasi prod di luar rilis ([migrations.md](../database/migrations.md) §Migrasi prod di luar rilis).

## A · Rollback aplikasi

**Produksi** (merge ke `main` = deploy otomatis `deploy-main.yml`):

1. Dari `main`: `git switch -c revert/vX.Y.Z origin/main`, lalu `git revert -m 1 <merge-commit-rilis>` (merge commit PR `staging → main`).
2. PR ke `main` → gate CI (`gitleaks`, `semgrep`) → merge → deploy otomatis.
3. Rilis sebagai **PATCH hotfix** (`vX.Y.Z+1`): bump `package.json`, entri changelog, tag + GitHub Release (aturan maks. 1 rilis/hari dikecualikan untuk hotfix kritis, [versioning.md](./versioning.md)).
4. Bawa revert yang sama ke `mvp` dan `staging` agar ketiga branch tidak menyimpang. Saat perbaikannya siap, revert itu dibatalkan dengan `git revert <commit-revert>` di `mvp`.

**Staging** (push ke `staging` = deploy otomatis `deploy-staging.yml`): perbaiki maju di `mvp` lalu `mvp → staging` bila cukup cepat. Bila staging harus segera pulih, revert merge commit di `staging` lalu push. Jangan `push --force` ke `staging` (butuh persetujuan owner, dan riwayat rilis ikut hilang).

**Yang perlu diketahui saat build gagal:** `pm2 reload` adalah langkah terakhir workflow, jadi job yang gagal di `npm ci`, guard migrasi (staging, #277), atau `npm run build` tidak me-reload proses. Namun `node_modules` sudah diganti oleh `npm ci`, dan `next build` yang gagal bisa meninggalkan `.next` setengah jadi. Proses lama masih jalan, tetapi **jangan di-restart** (restart akan membaca `.next` rusak). Segera deploy ulang commit yang sehat. *Belum diuji di server (TC-232-01, QA v1.3.0).*

## B · Rollback migrasi yang sudah sukses

> ⚠️ `npx prisma migrate resolve --rolled-back <nama>` **hanya untuk migrasi yang gagal**. Pada migrasi yang sudah sukses, Prisma menolak (*"cannot be rolled back because it is not in a failed state"*, gladi 2026-09-30). Menjalankan SQL pembalik tanpa merapikan `_prisma_migrations` membuat riwayat berbohong: migrasi tercatat applied padahal objeknya tak ada, dan deploy ulang nama yang sama akan **dilewati** diam-diam.

Selalu **dump dulu** sebelum menyentuh skema staging/prod (`scripts/dump-prod/<tanggal>/<db>-before-rollback-<ringkas>.dump`, `pg_dump` PG 18, lihat [migrations.md](../database/migrations.md) §Checklist Pra-Deploy). Menyentuh DB prod butuh persetujuan owner.

### B1 · Roll-forward — jalur baku

Buat **migrasi baru** yang membalik perubahan, mis. `YYYYMMDDHHMMSS_revert_<nama>`: SQL-nya diambil dari baris `-- ROLLBACK:` di header migrasi asal bila ada, atau dari `npx prisma migrate diff`. Migrasi pembalik naik lewat alur biasa: `mvp` → `migrate deploy` staging → prod → segarkan `applied-checksums.json` → rilis. Riwayat tetap jujur, guard #277 dan cek #376 tetap berlaku, dan checksum migrasi lama tidak disentuh.

### B2 · Darurat — SQL pembalik + rapikan riwayat

Hanya bila B1 terlalu lambat untuk insiden yang sedang berjalan:

1. Jalankan SQL pembalik dalam satu transaksi (`BEGIN; … COMMIT;`, `psql -v ON_ERROR_STOP=1`).
2. `DELETE FROM _prisma_migrations WHERE migration_name = '<nama>';`
3. **Hari yang sama:** hapus folder migrasi itu dari `mvp`. Selama folder masih ada, `migrate status` menandainya **pending** (guard staging/prod akan berhenti di situ, sinyal yang benar). Segarkan `applied-checksums.json`, lalu catat di Decision Log.

### B3 · Pulihkan dump

`pg_restore` dari dump *before* migrasi. Semua data yang ditulis sesudah dump **hilang**, jadi ini jalan terakhir dan wajib persetujuan owner. Perintah restore ada di [environments.md](./environments.md) §Refresh.

## C · Migrasi gagal di tengah

`migrate deploy` yang gagal meninggalkan baris `_prisma_migrations` berstatus gagal, dan semua deploy berikutnya tertahan. Periksa objek yang sempat terbuat, lalu pilih salah satu:

- membatalkan sisa perubahan secara manual → `npx prisma migrate resolve --rolled-back <nama>` → perbaiki file migrasi → deploy ulang; atau
- menyelesaikan sisa perubahan secara manual → `npx prisma migrate resolve --applied <nama>`.

## Sesudah rollback apa pun

- `npm run migrations:release-gap` harus bersih terhadap tag yang live (#376).
- `applied-checksums.json` disegarkan bila skema prod berubah.
- Decision Log + changelog. Bila rollback menyisakan jendela (kode dan skema tak sejalan), catat baris **"jendela terbuka"** di `sprint.md` sampai tertutup.

## Paritas workflow deploy

| | `deploy-main.yml` (prod) | `deploy-staging.yml` | `deploy-dev.yaml` |
| --- | --- | --- | --- |
| Pemicu | push `main` | push `staging` | push `dev` (tidak dipakai sejak 2026-05) |
| Install | `npm ci` | `npm ci` | `npm install` |
| Guard `.env` dari secret | ✅ (#394) | ✅ | — |
| Guard `migrate status` | ✅ (#394) | ✅ (#277) | — |
| Pemuatan nvm aman di `set -e` | ✅ (#394) | ✅ | — |
| pm2 / port | `mis-main` / 3000 | `mis-staging` / 3000 | `mis-dev` / 3001 |

`deploy-dev.yaml` tidak ikut alur rilis `mvp → staging → main`; perbedaannya dibiarkan sampai ada keputusan menghidupkan atau menghapusnya.

## Bukti gladi (2026-09-30, `mis-staging-local` = snapshot prod)

Dump sebelum gladi: `scripts/dump-prod/2026-09-30/mis-staging-local-before-rollback-drill.dump`. Migrasi uji buang-pakai (kolom nullable + tabel + indeks, header `-- ROLLBACK:`) dijalankan dari salinan folder migrasi di luar repo:

| Langkah | Hasil |
| --- | --- |
| `migrate deploy` migrasi uji | Applied, 1 detik |
| `migrate status` dengan repo asli (tanpa file migrasi uji) | **"up to date"**: status tidak menandai DB yang lebih maju dari kode → rollback aplikasi (A) tidak terhalang guard #277 |
| SQL `ROLLBACK:` + `migrate resolve --rolled-back` | Objek terhapus; **resolve ditolak** (bukan migrasi gagal) → riwayat masih "applied" |
| B2: hapus baris `_prisma_migrations` | Status dengan file migrasi masih ada: **pending, exit 1**; tanpa file: up to date |
| B1: deploy ulang + migrasi pembalik | Objek terhapus, kedua migrasi tercatat applied, status up to date |
| Pembersihan | 39 migrasi, 0 baris uji, kolom `tbl_farmer` = 15 (sama dengan dump sebelum gladi) |

**Belum diuji:** rollback aplikasi lewat revert di staging/prod dan perilaku `.next` saat build gagal → kasus uji TC-232-01 pada deploy staging v1.3.0.
