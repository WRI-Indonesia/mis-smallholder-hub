# Standar — Branching, Workflow & Safety

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [principles.md](./principles.md) · [code-standards.md](./code-standards.md) · [rbac.md](./rbac.md) · [ui-ux.md](./ui-ux.md) · [architecture.md](./architecture.md)

## Branching & Workflow

### Branching

- Satu branch yang ditentukan project owner
- Tidak boleh buat feature/experiment/PR branch terpisah

### Issue Workflow

1. **Pick Issue** — Ambil GitHub Issue yang sudah di-approve
2. **Implement** — Kerjakan **hanya** scope issue
3. **QA Lokal** — `npm run build` dan `npm test`
4. **Performance Test** — Pastikan tidak ada regresi
5. **Report** — Changed files, hasil verifikasi, QA notes, risk
6. **Approval** — Tunggu approval sebelum push

---

## Safety & Approval

**Wajib minta approval project owner** sebelum:

| Category | Actions |
|----------|---------|
| Destructive | Hapus file, drop table, reset DB, force push |
| Database Mutations | CREATE/UPDATE/DELETE data (Prisma seed, migration, manual query) |
