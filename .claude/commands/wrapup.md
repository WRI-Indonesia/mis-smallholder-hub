---
description: Wrap-up setelah development — review, test, docs/bantuan, gate, issue + retro
argument-hint: "[rentang/issue, mis. #365 atau v0.38.0..HEAD] (kosong = otomatis)"
---

Wrap-up development. Kerjakan **bertahap dan berurutan**, lapor hasil tiap tahap. Jangan lompat tahap, jangan gabungkan Tahap 0/7 ke tahap lain.

Fokus tambahan dari owner (kosongkan bila tidak ada): $ARGUMENTS

Aturan mainnya ada di `docs/standards/workflow.md` — baca bagian yang relevan saat tahapnya tiba, jangan mengarang dari ingatan.

## Tahap 0 — Cakupan (BERHENTI, tunggu konfirmasi owner)

Tentukan rentang review: commit `chore(release)` terakhir di `mvp` .. `HEAD`, **ditambah semua perubahan yang belum di-commit**. Keduanya, bukan salah satu — kode fitur sering masih uncommitted saat wrap-up dipanggil sementara commit terakhir cuma docs/QA.

Sajikan cakupannya dengan mengikuti `/scope` (`.claude/commands/scope.md`) — Tabel A (issue), Tabel B (matriks objek: Menu / Sub-menu / Fitur-Aksi / Tabel / Field / Enum × Baru / Berubah / Terdampak), Tabel C (kerja lanjutan yang tersirat). Jalankan langkahnya langsung di sini, tidak perlu sesi terpisah.

Lalu berhenti dan tunggu konfirmasi owner atas cakupan ini.

## Tahap 1 — Bersihkan working tree

Commit perubahan yang belum di-commit dengan **path eksplisit** (jangan `git add -A`). Jangan `amend`/`reset` tanpa cek `git log -1` dulu — worktree ini bisa dipakai sesi paralel. Review harus berjalan di tree bersih; agen review pernah membuang edit lokal.

## Tahap 2 — Review kode

Jalankan `/code-review` pada rentang Tahap 0. Perbaiki **hanya temuan yang valid** — verifikasi dulu, jangan telan mentah. Perubahan surgical: jangan refactor kode yang di luar temuan.

## Tahap 3 — Test

Perbarui test yang terdampak; tambah test untuk **tiap perilaku baru** dan **tiap bug yang diperbaiki di Tahap 2**. Pastikan test barunya benar-benar gagal tanpa fix-nya. Tidak boleh ada test di-skip.

## Tahap 4 — Docs & Bantuan

Jalankan **Docs Compliance Check** (`docs/standards/workflow.md` §Docs Compliance Check) — kelima butirnya, termasuk `src/content/help/`: cari tutorial/konsep yang jadi **keliru**, bukan cuma yang belum ada. Perbarui `docs/project/{roadmap,sprint,changelog,tech-debt}.md` agar tidak ada baris usang.

## Tahap 5 — Pre-Commit Gate

Kelima gate di `docs/standards/workflow.md` §Pre-Commit Gate wajib hijau: `npm run lint`, `npm run build`, `npm run typecheck`, `npm test`, + Docs sync. Urutan build → typecheck dipertahankan.

Laporkan hasilnya **apa adanya**. Kalau ada yang merah, katakan merah dan tampilkan outputnya — jangan diringkas jadi "lolos".

## Tahap 6 — Verifikasi fitur/menu/DB

Sebutkan **cara** verifikasinya sebelum menjalankan. DB **lokal** saja (`.env` bawaan). Dilarang menyentuh `mis-prod`/staging tanpa persetujuan eksplisit owner; bila perlu, ajukan dulu beserta query yang akan dijalankan.

## Tahap 7 — GitHub (BERHENTI, tunggu persetujuan owner)

Tampilkan dulu, jangan langsung eksekusi:
1. Draft issue baru (judul + body) untuk perubahan tanpa issue dari Tahap 0.
2. Daftar issue yang layak ditutup + alasan + bukti recheck-nya.

Setelah owner menyetujui: buat/tutup issue, tulis **retro 6 bagian collapsible** (§Issue Close — Retrospektif wajib), dan tulis **kasus uji manual** ke `docs/qa/<versi berikutnya>/02-test-cases.md` (§Issue Close — Kasus uji manual) selagi masih hangat.

## Tahap 8 — Insight & improvement

Ikuti §Analisa Improvement: kandidat follow-up, risiko/debt tersisa, akar masalah proses. Maksimal 5 poin actionable, dan salurkan — `tech-debt.md` (TD-xxx) atau usulan issue baru, jangan berhenti di percakapan.

## Definisi selesai

Tabel B Tahap 0 disajikan ulang bila objeknya bertambah/berubah selama Tahap 2-3 (versi final ini yang dipakai untuk retro & kasus uji QA) · working tree bersih · 5 gate hijau · docs + Bantuan sinkron · issue & retro beres · **dan kamu menyebut eksplisit apa yang TIDAK dikerjakan beserta alasannya**. Laporan "semua clean" tanpa bagian terakhir ini dianggap belum selesai.
