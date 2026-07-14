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
4. **Performance Test** — Pastikan tidak ada regresi
5. **Report** — Changed files, hasil verifikasi, QA notes, risk
6. **Approval** — Tunggu approval sebelum push
7. **Issue Close** — Sebelum menutup issue: **recheck** hasil akhir, lalu tulis **comment retrospektif wajib** (format di bawah)

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

Tidak boleh menonaktifkan rule lint secara global untuk melewati gate (ignore `scripts/**` diperbolehkan — bukan kode aplikasi). Enforcement melalui disiplin lokal (bukan CI), sesuai keputusan project owner.

**Docs sync (wajib, sebelum commit):** setiap perubahan yang menyentuh skema/migrasi/kolom, modul/fitur, status delivery, atau aturan **harus** memperbarui file `docs/` yang relevan **sebelum commit** dan di-commit **bersama** kodenya — jangan dipisah/ditunda. Peta cepat:

- **Skema/migrasi/kolom** → `database/models.md`, `database/erd.md` (+Schema Version), `database/migrations.md` (riwayat)
- **Modul/fitur/status** → `project/roadmap.md` (Phase Status / Code Audit Evidence), `project/sprint.md` (Active Issues), `project/changelog.md` (Changelog bulanan; + Decision Log bila ada keputusan)
- **Aturan / standar / keputusan arsitektur** → `standards/*` dan/atau `project/changelog.md` Decision Log
- **Tech debt / bug** → `project/tech-debt.md`

Checklist detail: [`../project/contributing.md`](../project/contributing.md) §5-Minute Update Checklist.

---

## Safety & Approval

**Wajib minta approval project owner** sebelum:

| Category | Actions |
|----------|---------|
| Destructive | Hapus file, drop table, reset DB, force push |
| Database Mutations | CREATE/UPDATE/DELETE data (Prisma seed, migration, manual query) |
