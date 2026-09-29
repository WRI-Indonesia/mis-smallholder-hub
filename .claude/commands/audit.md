---
description: Full audit repo — dead code, Vitest (bersih & terkini), docs/, materi Bantuan
argument-hint: "[fokus tambahan, mis. 'hanya src/server/actions'] (kosong = seluruh repo)"
---

Full audit **seluruh repo** (bukan hanya diff). Kerjakan bertahap, **satu commit per fase**, gate hijau (`lint` · `build` · `typecheck` · `test`) tiap fase. Analisa boleh paralel (agen per fase), penulisan berurutan.

Fokus tambahan dari owner (kosongkan bila tidak ada): $ARGUMENTS

## Aturan
- Awal: `git status` — **jangan sentuh** berkas yang sedang diubah sesi lain; commit dengan path eksplisit (lihat memory "No amend in shared worktree").
- Menghapus berkas/export/dependensi = **laporkan dulu, tunggu approval owner** (CLAUDE.md §Ask before destructive ops).
- DB: tanpa akses kecuali **READ ONLY** (`BEGIN READ ONLY`) bila perlu verifikasi klaim prod.
- Tiap temuan wajib ber-bukti (`file:line`, hasil grep/test), bukan dugaan.

## F1 — Dead code (lapor → approval → hapus)
1. `npx knip` (read-only) + verifikasi manual tiap temuan: grep pemakai, import dinamis (`import()`), route file App Router (`page`/`layout`/`route`/`loading`/`error`), CSS `@import`, entry skrip/CLI (`scripts/`, `package.json` scripts), seed Prisma, `next.config.ts`.
2. False positive yang sudah dikenal (#353): CSS `@import`, entry CLI, devDep `sharp` (TD-009), token `@theme` scaffold.
3. Laporkan tabel: berkas · export · dependensi · kode di balik flag/komentar — dengan bukti & usulan. **Berhenti, tunggu approval**, lalu hapus yang disetujui.

## F2 — Vitest bersih & terkini
1. **Bersih:** tidak ada `.skip`/`.only`/`todo`; tidak ada test untuk kode yang sudah tak ada; tidak ada duplikat; ambang perf rapuh dicatat (#311/TD-016).
2. **Terkini:** coverage `npx vitest run --coverage` (`@vitest/coverage-v8`). Petakan setiap server action & lib murni ke test-nya. Prioritas test baru: guard `hasPermission` (menu key + level yang benar), scope `getAccessContext` (termasuk by-id), soft delete, validasi Zod, pure logic hot-path. Ikuti pola test yang ada (mock `auth`/`prisma` seperti berkas `*-guard.test.ts`).
3. Laporkan angka coverage sebelum/sesudah per area.

## F3 — docs/
Cek ulang `docs/` terhadap perubahan F1–F2: `npm run build:docs`, docs-lint (`src/test/docs-generated.test.ts`), dan klaim yang menyebut simbol/berkas yang dihapus atau jumlah yang berubah. Keputusan & konvensi: `docs/README.md` §Konvensi docs, `docs/decisions/`.

## F4 — Materi Bantuan (`src/content/help/`)
Setiap menu daun punya tutorial yang benar: label tombol & langkah sesuai UI, izin per peran sesuai `prisma/seeds/data/role-permissions.csv`, tidak ada rujukan ke fitur/label yang sudah berubah. `help-registry.test.ts` hijau. Gaya: dua tingkat kedalaman (baris `+`), troubleshooting inline, tanpa screenshot.

## Laporan akhir
Apa yang dihapus / ditambah / diperbaiki per fase (dengan commit), angka coverage, dan apa yang **sengaja dibiarkan** beserta alasannya; kandidat issue/TD baru.
