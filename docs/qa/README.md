# QA/QC Manual per Rilis

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Terkait: [../standards/versioning.md](../standards/versioning.md) §Alur Rilis · [../standards/workflow.md](../standards/workflow.md) §Issue Close

Pengujian manual **per versi**, berjalan **dua tahap sebelum PR `staging → main`**: **lokal** (sesudah `/wrapup`, sebelum merge `mvp → staging` — alur owner 2026-10-14, sejak v1.8.0) lalu **staging** (setelah deploy `staging`); `05-signoff.md` adalah prasyarat bump & tag. Gate otomatis (lint/build/test) menjaga kode; folder ini menjaga **apa yang dilihat pengguna** dan **angka di DB** — dua hal yang lolos gate pada tiap siklus review (#238, #318, #331).

## Prinsip: spesifikasi ≠ hasil

- **Spesifikasi** (`00`–`05`) ditulis dev, stabil, satu blok per kasus, ber-tag prioritas.
- **Hasil** dicatat per eksekusi di `runs/<tanggal>-<env>[-ulang].md` — satu berkas per run, dibuat oleh skrip, hanya `ID · status · catatan · bukti`. Lokal, staging, dan prod tidak pernah berbagi tabel.
- **Angka DB** tidak disalin tangan: `scripts/qa/data-qc.ts` menjalankan seluruh cek read-only dan mencetak tabel siap tempel.

## Aturan folder

| Lokasi | Isi | Di-track? |
|---|---|---|
| `docs/qa/_template/` | Master berkas — disalin ke folder versi | ✅ |
| `docs/qa/regression.md` | Kasus uji ber-tag `[regresi]` yang **ikut setiap rilis** (tumbuh dari temuan review/bug) | ✅ |
| `docs/qa/vX.Y.Z/` | Satu folder per **versi** (tanggal ditulis di run) | ✅ |
| `docs/qa/vX.Y.Z/runs/` | Lembar hasil per eksekusi: `<tanggal>-lokal.md` (QA lokal) · `<tanggal>-staging[-ulang].md` · `<tanggal>-prod.md` | ✅ |
| `docs/qa/archive/vX.Y.Z/` | Paket versi yang sudah sign-off & rilis, **lebih tua dari 3 rilis terakhir yang sudah terbit** (paket rilis yang sedang disiapkan tidak dihitung) — dipindah utuh saat rilis baru di-tag | ✅ |
| `scripts/local/QA-QC/vX.Y.Z/evidence/` | Screenshot/PDF/Excel bukti + `input/` berkas uji | ❌ gitignored — repo **publik**, bukti memuat nama petani/NIK |

## Berkas

| Berkas | Isi | Diisi kapan · oleh |
|---|---|---|
| `README.md` | Versi, rentang, migrasi, **rekap dari `summary.mjs`**, Go/No-go, known issues | Ditutup saat sign-off · QA |
| `00-scope.md` | Issue + commit dalam rilis; **akun uji per peran**; **persiapan data uji** (langkah `TC-PREP-*`) | Awal siklus · dev |
| `01-smoke.md` | Checklist tetap per menu & peran, ID `SM-nn`, kolom konsol per halaman. **Salinan penuh** di tiap versi (bukan selisih dari template): `new-run.mjs` membaca daftar smoke dari folder versi, dan salinannya adalah catatan persis apa yang diuji rilis itu — template boleh berubah tanpa mengubah sejarah | dev (template) · dijalankan QA tiap run |
| `02-test-cases.md` | Satu blok per kasus `TC-<issue>-<nn>` · tag `[P0]`/`[P1]`/`[P2]`, `[regresi]` · estimasi menit | Ditulis dev **saat menutup issue** (bersama retro) |
| `03-data-qc.md` | Daftar cek + harapan; kueri hidup di `scripts/qa/data-qc.ts` | dev · dijalankan dev/owner sebelum & sesudah migrasi |
| `04-findings.md` | Temuan → issue GitHub (potongan `gh issue create` tersedia) | QA |
| `05-signoff.md` | Tanda tangan + **apa yang diulang** setelah fix | dev · QA · owner |
| `runs/*.md` | Hasil per eksekusi (dibuat `new-run.mjs`) | QA |

## Prioritas & waktu

- `[P0]` jalur kritis — migrasi, izin/menu baru, unduhan yang dipakai lapangan, kebenaran angka. **Run minimum = semua P0** (`new-run.mjs --only P0` mencetak perkiraan menit; v0.35.0 ≈ 110 menit karena rilis besar).
- `[P1]` fitur utama rilis; `[P2]` kosmetik/edge. Run penuh = P0 + P1 + P2 + `regression.md`.
- Estimasi menit ditulis di judul blok; `new-run.mjs --only P0` menjumlahkannya.

## Alur

1. Dev: salin `_template/` → `vX.Y.Z/` **kecuali** `runs/_template-run.md` (dibaca `new-run.mjs` langsung dari `_template/`); pindahkan versi tertua di atas ke `archive/` bila kini ada lebih dari 3 versi rilis; isi `00-scope.md` (termasuk akun & persiapan data) dan `02-test-cases.md` (kasus ditulis saat issue ditutup).
2. Dev (QA lokal, sejak v1.8.0): `/scope` → `/wrapup` (review, test, docs/Bantuan, gate, kasus uji) → `node scripts/qa/new-run.mjs --version vX.Y.Z --env lokal` (nilai `--env` tidak divalidasi skrip — hanya menjadi nama berkas & judul lembar; pesan pakainya masih menyebut `staging|prod`) → jalankan kasus uji di dev server lokal, isi `runs/<tanggal>-lokal.md`; issue ditutup + retro bila **0 Fail**. Baru sesudah itu merge `mvp → staging`.
3. Ops (#333-style): migrasi + seed ke `mis-staging` → `data-qc.ts` sebelum/sesudah → deploy `mvp → staging`.
4. QA: `node scripts/qa/new-run.mjs --version vX.Y.Z --env staging` → jalankan `TC-PREP-*` dulu, lalu smoke + kasus uji + regresi; isi lembar run; bukti ke `evidence/`.
5. Temuan → `04-findings.md` → issue (`bug`); dev memperbaiki → run ulang **hanya** kasus Fail + smoke P0 halaman terkait (`runs/<tanggal>-staging-ulang.md`).
6. `node scripts/qa/summary.mjs docs/qa/vX.Y.Z` → tempel ke README → `05-signoff.md` → bump versi (`chore(release)`, merge lagi `mvp → staging`), PR `staging → main`, tag.
7. Setelah prod: `new-run.mjs --env prod --only P0` (smoke + P0 saja) + `data-qc.ts` prod.

## Status

**Pass** · **Fail** (wajib temuan) · **Blocked** (prasyarat belum ada — tulis apa) · **N/A** hanya bila kasus memang tidak berlaku untuk peran/env itu (mis. DONOR pada kasus unduh Excel) — bukan untuk melewati kasus yang sulit.

## Skrip

| Perintah | Fungsi |
|---|---|
| `npx dotenv -e .env.<env> -- npx tsx scripts/qa/data-qc.ts [--section A,B] [--parcel <ID Lahan>]` | Cetak DB efektif, jalankan semua cek read-only `03-data-qc`, tabel `id · harapan · aktual · status` |
| `node scripts/qa/new-run.mjs --version vX.Y.Z --env lokal\|staging\|prod [--only P0] [--label ulang]` | Buat `runs/<tanggal>-<env>[-label].md` dari `01` + `02` + `regression.md` |
| `node scripts/qa/summary.mjs docs/qa/vX.Y.Z` | Rekap Pass/Fail/Blocked/N/A per run + daftar Fail tanpa nomor issue |
