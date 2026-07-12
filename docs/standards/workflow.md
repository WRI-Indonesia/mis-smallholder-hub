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

### Pre-Commit Gate (wajib, dijalankan lokal)

Sebelum **setiap commit dari lokal**, ketiga gate ini **wajib hijau** — jangan commit bila ada yang merah (akar BUG-006/#126: `lint` tak pernah dienforce lalu drift ke 193 error):

| Gate | Perintah | Lolos bila |
|------|----------|------------|
| Lint | `npm run lint` | **exit 0** — 0 error (warning boleh, tapi disepakati terpisah) |
| Typecheck/Build | `npm run build` (atau `npx tsc --noEmit` untuk cek cepat) | 0 type error |
| Test | `npm test` | semua lulus, **tidak ada** test di-skip |

Tidak boleh menonaktifkan rule lint secara global untuk melewati gate (ignore `scripts/**` diperbolehkan — bukan kode aplikasi). Enforcement melalui disiplin lokal (bukan CI), sesuai keputusan project owner.

---

## Safety & Approval

**Wajib minta approval project owner** sebelum:

| Category | Actions |
|----------|---------|
| Destructive | Hapus file, drop table, reset DB, force push |
| Database Mutations | CREATE/UPDATE/DELETE data (Prisma seed, migration, manual query) |
