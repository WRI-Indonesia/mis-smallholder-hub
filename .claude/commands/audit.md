---
description: Audit repo — mingguan (read-only + laporan + delta + draf issue) atau penuh (perbaikan per fase); dead code, penamaan, test, docs, Bantuan, TD, bug
argument-hint: "[kosong = mingguan | penuh | deadcode|test|docs|bantuan|tdbug] [fokus tambahan]"
---

Audit **seluruh repo** (bukan hanya diff). Mode dari argumen: $ARGUMENTS
- **Kosong / `mingguan`** → Mode Mingguan: analisa read-only semua area, laporan + delta dari laporan sebelumnya, lalu tanya mana yang dikerjakan.
- **`penuh`** → Mode Penuh: analisa yang sama, lalu perbaikan fase F1–F6, satu commit per fase.
- **Nama area** (`deadcode` · `test` · `docs` · `bantuan` · `tdbug`, boleh beberapa) → Mode Mingguan, hanya area itu.
- Teks lain sesudahnya = fokus tambahan owner (mis. "hanya src/server/actions").

## Aturan (semua mode)
- Awal: `git status --short` + `git worktree list` — **jangan sentuh** berkas yang sedang diubah sesi lain; commit dengan path eksplisit (memori "No amend in shared worktree").
- Analisa **wajib** lewat workflow tersimpan `audit` (`.claude/workflows/audit.js`, agen read-only paralel + verifikator skeptis per area). Jangan menulis prompt agen ad-hoc — isinya harus sama tiap minggu agar delta bermakna.
- Menghapus/me-rename berkas, export, dependensi = **laporkan dulu, tunggu approval** (CLAUDE.md §Ask before destructive ops).
- DB: tanpa akses kecuali **READ ONLY** (`BEGIN READ ONLY`) bila perlu memverifikasi klaim prod — ajukan query-nya dulu.
- Tiap temuan ber-bukti (`file:line`, hasil grep/test, nomor issue), bukan dugaan.
- Membuat/menutup issue, komentar GitHub = **izin per aksi** (format tanya bertahap + rekomendasi). Repo **publik**: issue/commit tanpa nama petani/offtaker asli, NIK, password, email staf, angka kontrak.
- False positive yang sudah dikenal (#353): CSS `@import`, skrip CLI `scripts/**` (selama belum ada `knip.json` ber-`entry`), devDep `sharp` (TD-009), token `@theme`, ekspor `src/components/ui/**`, `NEXTAUTH_*` (dibaca implisit next-auth). Keputusan tertunda #353 bagian E (kini tinggal font Acumin, #273) jangan diputuskan sepihak.

## Langkah 1 — Analisa (workflow)
1. Laporan sebelumnya: berkas terbaru `audit-report/audit-*.md` (folder gitignored). Ambil daftar `key` temuan dari tabel-tabelnya (kolom pertama) → `previous`.
2. Jalankan `Workflow({ name: "audit", args: { areas: [<area dipilih, kosong = semua>], previous: [<key>], today: "<YYYY-MM-DD>" } })`. Tunggu notifikasi selesai — jangan menebak hasilnya.
3. Hasil = `areas[]` (summary + findings ber-`key`, `severity`, `evidence`, `suggestion`, `action`, `destructive`, `verified`) + `delta` (`baru` · `masih` · `selesai`).

## Langkah 2 — Laporan `audit-report/audit-YYYY-MM-DD.md`
Tulis (lokal, gitignored — boleh memuat path rinci). Struktur:
- Header: tanggal, commit HEAD, mode, area, laporan pembanding.
- **Delta**: tabel singkat baru · masih · selesai (key + judul). "Masih" yang sudah ≥ 3 laporan berturut-turut ditandai — kandidat issue/TD.
- Per area: `summary` (angka coverage, cakupan Bantuan, jumlah TD terverifikasi) + tabel `key · severity · judul · bukti · usulan · action · terverifikasi`.
- Temuan yang dibantah verifikator tidak ditulis; jumlahnya disebut di header area.

## Langkah 3 — Sajikan & tanya (BERHENTI di sini pada Mode Mingguan)
Ringkasan ≤ 1 layar: angka per area, delta, lalu temuan tinggi/sedang (≤ 10 baris, sisanya "+N di laporan"). Lalu `AskUserQuestion` bertahap (≤ 2 pertanyaan per tahap, opsi pertama `(Recommended)`, akibat/biaya per opsi):
- **Tahap A:** apa yang dikerjakan sekarang — perbaikan kecil yang aman (multiSelect per kelompok), penghapusan/rename (selalu terpisah, destructive).
- **Tahap B:** temuan `action: issue` → draf judul + body (tampilkan) → buat yang disetujui. Temuan `td` → baris TD baru di `docs/project/tech-debt.md`. TD yang terbukti selesai → pindah ke Arsip.
Pertanyaan yang jawabannya jelas dari docs/memori bukan keputusan — pilih default, sebut di laporan.

## Langkah 4 — Kerjakan yang disetujui
Satu commit per area/fase, gate hijau sebelum tiap commit (`lint` · `build` → `typecheck` · `test`). Urutan Mode Penuh:

- **F1 Dead code** — hapus yang disetujui; regenerasi artefak (`build:lineage` bila import halaman/aksi berubah).
- **F2 Vitest** — bersih (tanpa `.skip`/`.only`/`todo`/mirror/duplikat; perf pakai `minTime`, ambang ≥ 3×) dan terkini: test baru prioritas guard `hasPermission` (menu key + level), scope `getAccessContext` (termasuk by-id), soft delete, Zod, hot-path; pola `*-guard.test.ts`. Laporkan coverage sebelum/sesudah per area (`npm run test:coverage`).
- **F3 docs/** — `npm run build:docs`, `docs-generated.test.ts`, rujukan ke simbol/berkas yang dihapus, jumlah yang berubah, tautan rusak, status roadmap/sprint vs issue. Konvensi: `docs/README.md` §Konvensi docs, `docs/decisions/`.
- **F4 Bantuan** — tiap menu daun punya tutorial yang benar: label & langkah sesuai UI, izin sesuai `prisma/seeds/data/role-permissions.csv`, tanpa rujukan ke fitur/label lama; `help-registry.test.ts` hijau; gaya dua tingkat (`+`), troubleshooting inline, tanpa screenshot.
- **F5 Penamaan** — rename berkas/folder yang disetujui (kebab-case) + semua import; `git mv` agar riwayat terbawa.
- **F6 TD & bug** — tech-debt.md: tutup yang terbukti selesai (bukti), perbarui deskripsi basi, sinkronkan tabel Ringkasan & daftar "Debt aktif"; bug terbuka yang sudah diperbaiki → usulkan tutup + retro 6 bagian (`docs/standards/workflow.md` §Menutup Issue).

Mode Mingguan memakai fase yang sama, hanya untuk temuan yang disetujui di Langkah 3.

## Laporan akhir
- Per fase: yang dihapus / ditambah / diperbaiki + commit; angka coverage sebelum/sesudah; issue & TD yang dibuat/ditutup (nomor).
- Yang **sengaja dibiarkan** + alasan; kandidat issue/TD yang ditunda.
- Bila ada commit: satu baris changelog bulan berjalan (`docs/project/changelog/YYYY-MM.md`) "Audit `/audit` <mode> …" — commit terpisah atau ikut fase terakhir.
- Sebut path laporan lokal `audit-report/audit-YYYY-MM-DD.md` (pengingat > 7 hari dibaca oleh `/pagi`).
