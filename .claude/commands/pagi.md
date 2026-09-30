---
description: Mulai hari — status development, sinkron issue GitHub ↔ Rencana Rilis, prioritas, saran kerja berikutnya
argument-hint: "[v1.3.0 | Keamanan|Rilis|Performa|Data|Fitur|Kerapian] (kosong = rilis berjalan, semua kategori)"
---

Briefing awal hari. **Read-only** sampai Tahap 4: jangan ubah berkas, jangan commit, jangan sentuh DB, jangan `git worktree prune`/`stash drop`.

Fokus dari owner: $ARGUMENTS
- Kosong → rilis berjalan, semua kategori.
- `vX.Y.Z` → rilis itu sebagai acuan Tahap 1 & 3.
- Nama kategori → Tahap 3 disaring ke kategori itu (Tahap 1–2 tetap penuh).

Acuan rencana: `docs/project/sprint.md` §Rencana Rilis + §Backlog. **Jangan grep `#nnn` dari berkas itu** — rujukan di dalam baris lain dan blok `<details>` arsip ikut tertangkap. Pakai parser yang sama dengan menu Rencana Pengembangan:

```bash
npx tsx scripts/plan-status.ts        # JSON: active (poin, sisa, neededPerWeek, inProgress, todo), velocity, decisions, backlogDecisions, issueNumbers, issues
```

Semua angka poin/velocity/sisa diambil dari JSON ini — **jangan menghitung sendiri**.

**Batas keluaran: satu layar.** Tahap 1 ≤ 6 baris, tabel Tahap 3 ≤ 8 baris (sisanya "+N lainnya"), selisih kosong ditulis satu kalimat.

## Tahap 1 — Apa yang sedang dikerjakan & statusnya

Jalankan paralel:
- `npx tsx scripts/plan-status.ts`
- `git status --short`, `git worktree list`, `git stash list`
- `git log <commit chore(release) terakhir>..HEAD --format='%h %s'` — issue `#nnn` yang disentuh, dan **commit tanpa `#nnn`** (kerja tak terencana: fitur/perbaikan yang tak punya issue).
- `gh run list --limit 5` — deploy/CI terakhir hijau? Merah = baris pertama laporan.
- Memori proyek: butir DITAHAN/menunggu/rerun (import prod tertunda, petani belum terdaftar) yang relevan hari ini.

Bila `active.inProgress` berisi butir, sajikan:

| Issue | Judul | Status di rencana | Bukti di kode (commit/uncommitted) | Status sebenarnya | Sisa |

Tandai bila status di rencana tak cocok dengan kodenya (🟡 tanpa commit, atau 🔲 padahal sudah ada commit). Bila `inProgress` kosong: satu kalimat "Belum ada butir 🟡", lalu sebut issue yang terakhir disentuh commit.

Temuan kebersihan (sebut saja, jangan dieksekusi): worktree `prunable`, stash lama, berkas untracked, `updatedAt` lebih lama dari commit `docs(rencana)`/`docs(sprint)` terakhir.

## Tahap 2 — Sinkron GitHub ↔ Rencana Rilis

- `gh issue list --state open --limit 200 --json number,title,labels,updatedAt`
- `gh issue list --state closed --search "closed:>=<start rilis sebelumnya>" --limit 100 --json number,title,closedAt`
- Pembanding: `issueNumbers` dan `issues` (status per issue) dari JSON.

Laporkan tiga selisih — **hanya untuk issue yang relevan dengan rencana**; issue closed yang memang tak pernah ada di rencana bukan temuan:
1. **Open tapi tak ada di `issueNumbers`** → usulkan rilis/backlog + Kategori + Poin (S/M/L) + alasan.
2. **Closed di GitHub tapi di `issues` belum `done`** (untuk butir rilis) atau masih di backlog.
3. **`done` di rencana tapi masih open** — retro/tutup belum dilakukan (aturan retro sebelum menutup issue).

Lalu **cek keputusan yang mungkin sudah diambil**: untuk tiap issue di `decisions` dan `backlogDecisions`, `gh issue view <n> --json comments` — komentar sesudah `updatedAt` yang menjawab pertanyaannya berarti keputusan sudah ada. Jangan tanyakan ulang; bawa ke Tahap 4 sebagai perubahan status.

## Tahap 3 — Prioritas & saran

Prioritas label dinormalisasi dulu (`priority:P1`, `priority: P1`, `priority:high` → P1; `priority: low` → P3); issue tanpa label prioritas disebut di akhir.

Urutan: **risiko prod → jalur rilis & gate → performa → kualitas data → fitur** (= urutan Kategori Keamanan · Rilis · Performa · Data · Fitur · Kerapian). Naikkan: P1, butir 🟡 (selesaikan dulu sebelum mulai baru), butir yang memblokir butir lain, butir yang **bisa jalan tanpa keputusan**. Butir ⚖️ tidak masuk daftar kerja — masuk daftar keputusan.

**Tabel ringkasan:**

| Urut | Issue | Judul singkat | Kategori | Poin | Status | Kenapa sekarang | Langkah pertama |

Lalu:
- **Risiko rilis** (satu–dua kalimat): `active.points.remaining` dan `neededPerWeek` vs `velocity.average` (sebut ukuran sampel `velocity.releases`), dan porsi poin yang tertahan ⚖️ (`byStatus.decision`).
- **⚖️ Keputusan**: satu kalimat per issue. Untuk maksimal 4 keputusan teratas yang jawabannya berupa pilihan, tawarkan langsung lewat `AskUserQuestion` (opsi konkret + usulan bertanda "(Recommended)"); sisanya cukup didaftar.

Tutup dengan satu rekomendasi: kerjakan apa dulu, dan kenapa.

## Tahap 4 — Pembaruan rencana (BERHENTI, tunggu konfirmasi owner)

Tampilkan diff yang diusulkan untuk `sprint.md`: issue baru masuk rilis/backlog, status yang berubah (termasuk keputusan yang ditemukan di komentar atau dijawab lewat `AskUserQuestion` — isi kolom ⚖️ dengan `✅ Diputuskan: …`), baris `Terakhir diperbarui:` ke tanggal hari ini. Bila tak ada selisih: tulis "Tidak ada perubahan" dan selesai.

**Jangan edit sebelum owner setuju.** Setelah disetujui: edit, jalankan `npx vitest run src/test/release-plan.test.ts src/test/plan-status.test.ts`, commit dengan path eksplisit (`docs(rencana): …`).
