---
description: Lanjutkan pekerjaan berjalan — keputusan terbuka ditanya bertahap + rekomendasi; bila tak ada, langsung kerjakan langkah berikutnya
argument-hint: "[fokus opsional, mis. #403 atau rilis v1.4.0] (kosong = pekerjaan yang sedang berjalan)"
---

Lanjutkan pekerjaan. Fokus: $ARGUMENTS

Kosong = pekerjaan yang sedang berjalan di percakapan ini. Percakapan baru → ambil dari `npx tsx scripts/plan-status.ts` (butir 🟡 rilis berjalan dulu, lalu 🔲 teratas) + `git status --short` + memori proyek yang relevan.

## 1. Tentukan langkah berikutnya

Satu kalimat: apa langkah berikutnya dan kenapa itu (bukan yang lain). Jangan mengulang ringkasan panjang pekerjaan sebelumnya.

## 2. Ada keputusan terbuka?

Keputusan = pilihan yang **mengubah hasil** dan tidak bisa dijawab dari kode, docs (`sprint.md` kolom ⚖️, Decision Log changelog), memori, atau default yang wajar. Pilihan yang punya default jelas bukan keputusan — pilih, sebut di laporan, lanjut.

**Ada** → tanya lewat `AskUserQuestion`, **bertahap**:
- Satu tahap = paling banyak 2 pertanyaan yang saling terkait. Tahap berikutnya ditanya **sesudah** jawaban tahap ini — jawaban bisa mengubah pertanyaan berikutnya.
- Opsi pertama = rekomendasi, berlabel `(Recommended)`. Tiap opsi: akibat/biaya singkat, bukan sekadar nama.
- Pilihan visual/format (tata letak, kolom Excel, label) → `preview` (mockup ASCII / potongan kode), dan bila memungkinkan uji dengan data nyata dulu.
- Jangan tanya ulang yang sudah diputuskan. Jawaban berupa teks bebas → ikuti yang benar-benar dikatakan, bukan opsi terdekat.
- Sesudah dijawab → catat: `sprint.md` ⚖️ `✅ Diputuskan …` dan/atau baris Decision Log changelog (append-only) untuk keputusan besar.

**Tidak ada** → langsung kerjakan. Jangan bertanya "lanjut?" atau "boleh saya mulai?".

## 3. Kerjakan

- Ikuti CLAUDE.md: perubahan seperlunya, cocokkan gaya sekitar, materi Bantuan & docs ikut diperbarui.
- Perubahan UI → verifikasi di browser sebelum dilaporkan selesai.
- Sebelum commit: `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`. Commit dengan path eksplisit (sesi paralel berbagi HEAD).
- Selesai satu issue → `/code-review` → perbaiki temuan → baru issue berikutnya.

## Batas yang TIDAK dilompati walau mode "lanjut"

Tetap minta konfirmasi eksplisit **per aksi** (juga dalam format tahap + rekomendasi):
- Mutasi DB di env mana pun: migrasi, seed, skrip `--write`, query manual. Prod: cetak DB efektif, dry-run dulu, dump dulu.
- Operasi destruktif: hapus berkas, reset/drop DB, force push, `git worktree prune`/`stash drop`.
- Merge ke `staging`/`main`, tag & GitHub Release, menutup issue, mengirim pesan/posting.
- Repo publik: angka kontrak, status password, nama petani asli, email staf **tidak** ditulis ke repo atau issue.

## Tutup

Satu paragraf: apa yang dikerjakan, hasil verifikasi (gate + browser), dan langkah berikutnya — atau pertanyaan tahap berikutnya bila ada keputusan baru.
