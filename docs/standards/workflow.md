# Standar — Branching, Workflow & Safety

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [principles.md](./principles.md) · [code-standards.md](./code-standards.md) · [rbac.md](./rbac.md) · [ui-ux.md](./ui-ux.md) · [architecture.md](./architecture.md)

## Branching & Workflow

### Branching

- Satu branch yang ditentukan project owner
- Tidak boleh buat feature/experiment/PR branch terpisah

### Issue Workflow

1. **Pick Issue** — Ambil GitHub Issue yang sudah di-approve
2. **Implement** — Kerjakan **hanya** scope issue
3. **QA Lokal** — `npm run lint`, `npm run build`, dan `npm test` (lihat Pre-Commit Gate)
4. **Performance Test** — Pastikan tidak ada regresi; **pure logic baru** yang menyentuh hot-path (agregasi, sort, validasi array besar) diberi perf test di `src/test/perf.test.ts`
5. **Docs Compliance Check** — Recheck hasil kerja terhadap folder `docs/` (format di bawah): patuh **rule**, ikuti **workflow**, **progress** tercermin, dan file docs terdampak ter-update
6. **Report** — Changed files, hasil verifikasi, QA notes, risk, dan **Analisa Improvement** (format di bawah)
7. **Approval** — Tunggu approval sebelum push
8. **Issue Close** — Sebelum menutup issue: **recheck** hasil akhir, lalu tulis **comment retrospektif wajib** (format di bawah)

### Analisa Improvement (wajib di Report & Retro)

Setiap penyelesaian pekerjaan **diakhiri analisa next/recommended improvement** — bukan hanya "selesai":

1. **Kandidat follow-up** — fitur/penyempurnaan lanjutan yang terbuka karena pekerjaan ini (mis. data baru yang siap diagregasi ke dashboard/report).
2. **Risiko & debt tersisa** — scope yang sengaja di-skip/ditunda beserta alasannya, pitfall yang ditemukan, potensi regresi.
3. **Akar masalah proses** — bila ada gap proses yang terungkap (docs drift, gate terlewat), usulkan pencegahannya.

Penyaluran: ringkas di **Report** ke owner + section **🧭 Feedback & improvement** pada retro; item yang **actionable** dicatat ke [`../project/tech-debt.md`](../project/tech-debt.md) (TD-xxx) atau diusulkan sebagai **issue baru** — jangan hilang di percakapan.

### Docs Compliance Check (wajib, setelah implement — sebelum commit/close)

Setelah pekerjaan selesai (dan setiap kali owner minta recheck), audit hasil kerja terhadap `docs/`:

1. **Rule** — `standards/*` (code-standards, rbac, ui-ux, architecture, principles): perubahan mengikuti konvensi (3 lapis keamanan, `ActionResult`, Zod, soft delete, kebab-case, surgical change).
2. **Workflow** — file ini: urutan Issue Workflow diikuti (scope issue, Pre-Commit Gate 4 gate, approval DB/destructive, retro sebelum close).
3. **Progress** — `project/*`: status pekerjaan tercermin di `roadmap.md` (Phase Status/Evidence), `sprint.md` (Active Issues), `changelog.md` (Decision Log/Changelog), `tech-debt.md` — **tidak ada baris usang** (mis. issue selesai masih "Todo").
4. **Identifikasi file `docs/` lain yang terdampak** (peta cepat di Docs sync) dan perbarui **sebelum commit** — di-commit **bersama** kode. Temuan ketidakpatuhan dilaporkan ke owner, bukan didiamkan.
5. **Bantuan (`src/content/help/`)** — setiap **perubahan atau penambahan fitur** wajib diperiksa dampaknya ke materi Bantuan: apakah ada tutorial/konsep yang jadi **keliru** (label tombol berubah, langkah bertambah, aturan validasi berubah), dan apakah alur baru itu **perlu tutorial baru**. Perbarui bersama kode, jangan ditunda — panduan yang salah lebih berbahaya daripada panduan yang belum ada, karena pengguna terlanjur memercayainya.

### Issue Close — Retrospektif wajib (sebelum close)

Sebelum menutup GitHub Issue: (1) **recheck** dulu (rule/gate/konsistensi tercapai), lalu (2) tulis **comment retrospektif** — **compact + section collapsible** (`<details><summary>`), berisi **6 bagian**:

- 💡 **Insight** — temuan / pemahaman kunci
- 🛠️ **How to solve** — pendekatan solusi
- 🧗 **Challenge** — tantangan / pitfall
- 🔄 **Perubahan dari issue dasar** (jika ada) — deviasi dari scope awal
- 📚 **What we learned** — pelajaran dari issue ini
- 🧭 **Feedback & improvement** — tindak lanjut / rekomendasi

Contoh penerapan: komentar penutup **#146 / #147 / #149 / #155**.

### Pre-Commit Gate (wajib, dijalankan lokal)

Sebelum **setiap commit dari lokal**, keempat gate ini **wajib hijau** — jangan commit bila ada yang merah (akar BUG-006/#126: `lint` tak pernah dienforce lalu drift ke 193 error):

| Gate | Perintah / Aksi | Lolos bila |
|------|----------|------------|
| Lint | `npm run lint` | **exit 0** — 0 error (warning boleh, tapi disepakati terpisah) |
| Typecheck/Build | `npm run build` (atau `npx tsc --noEmit` untuk cek cepat) | 0 type error |
| Test | `npm test` | semua lulus, **tidak ada** test di-skip |
| **Docs sync** | Review & update `docs/` yang terdampak | Dokumentasi terkait sudah diperbarui & konsisten, di-commit **bersama** kode |

Tidak boleh menonaktifkan rule lint secara global untuk melewati gate (ignore `scripts/**` diperbolehkan — bukan kode aplikasi). Keempat gate di atas **tidak dijalankan CI** — enforcement-nya disiplin lokal, sesuai keputusan project owner. Yang berjalan di CI adalah pemindaian keamanan & deployment (lihat di bawah).

**Docs sync (wajib, sebelum commit):** setiap perubahan yang menyentuh skema/migrasi/kolom, modul/fitur, status delivery, atau aturan **harus** memperbarui file `docs/` yang relevan **sebelum commit** dan di-commit **bersama** kodenya — jangan dipisah/ditunda. Peta cepat:

- **Skema/migrasi/kolom** → `database/models.md`, `database/erd.md` (+Schema Version), `database/migrations.md` (riwayat)
- **Modul/fitur/status** → `project/roadmap.md` (Phase Status / Code Audit Evidence), `project/sprint.md` (Active Issues), `project/changelog.md` (Changelog bulanan; + Decision Log bila ada keputusan)
- **Aturan / standar / keputusan arsitektur** → `standards/*` dan/atau `project/changelog.md` Decision Log
- **Tech debt / bug** → `project/tech-debt.md`

Checklist detail: [`../project/contributing.md`](../project/contributing.md) §5-Minute Update Checklist.

### GitHub Actions yang berjalan (4 workflow)

Repo **punya CI** — hanya saja bukan untuk lint/build/test. Jangan mengira gate lokal adalah satu-satunya jaring pengaman, dan jangan pula mengira tidak ada otomatisasi sama sekali.

| Workflow | Pemicu | Fungsi |
|---|---|---|
| `gitleaks.yml` | **setiap push & PR** | Memindai kredensial/rahasia yang tak sengaja ter-commit |
| `semgrep.yml` | **PR** (+push ke `main` bila berkasnya berubah) | Analisis keamanan statis (SAST) |
| `deploy-dev.yaml` | push ke branch dev | Deploy otomatis ke lingkungan dev |
| `deploy-main.yml` | **push ke `main`** | **Deploy otomatis ke produksi** via SSH: `git reset --hard origin/main` → tulis `.env` dari secret → `npm install` → `prisma generate` → `npm run build` → `pm2 reload mis-main` |

Konsekuensi yang wajib diingat:

- **Merge PR ke `main` = deploy produksi.** Tidak ada langkah manual terpisah; begitu PR di-merge, produksi ikut terbarui. Pastikan gate lokal hijau **sebelum** merge, bukan sesudah.
- `deploy-main.yml` **tidak menjalankan migrasi Prisma** (`prisma generate` ≠ `migrate deploy`). Migrasi DB tetap **manual** dan harus diterapkan **sebelum** kode yang membutuhkannya di-merge — lihat Safety & Approval di bawah.
- Gitleaks memindai **seluruh riwayat** (`fetch-depth: 0`), jadi rahasia yang pernah ter-commit lalu dihapus tetap terdeteksi.
- Kegagalan `gitleaks`/`semgrep` muncul sebagai check merah di PR; periksa `gh pr checks <nomor>` sebelum merge.

---

## Safety & Approval

**Wajib minta approval project owner** sebelum:

| Category | Actions |
|----------|---------|
| Destructive | Hapus file, drop table, reset DB, force push |
| Database Mutations | CREATE/UPDATE/DELETE data (Prisma seed, migration, manual query) |
