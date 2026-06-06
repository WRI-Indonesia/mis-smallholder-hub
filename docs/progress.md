# Smallholder HUB — Progress

> Tracking progress development. Detail issue: [GitHub Issues](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues)

---

## Roadmap Model (Canonical)

### Rules

- **Source of truth** untuk status delivery adalah tabel **Phase Status** di bawah.
- Ringkasan roadmap harus selalu diturunkan dari tabel status; tidak boleh ada status yang berdiri sendiri di luar tabel.
- Setiap issue aktif harus dipetakan ke phase dan horizon (Now/Next/Later).

### Phase Status (Source of Truth)

| Phase | Deskripsi | Status | Horizon | Linked Active Issues |
|-------|-----------|--------|---------|----------------------|
| 1 | Initialization & UI Statis | ✅ Completed | Done | — |
| 2 | Database Schema & Migrations | ✅ Completed | Done | — |
| DB | Schema Hardening (Audit Trail, Sync) | ✅ Completed | Done | — |
| 3 | Autentikasi & RBAC | ✅ Completed | Done | — |
| 4 | Master Data CRUD (Regions, Groups, Farmers, Parcels) | ✅ Completed | Done | — |
| 4.a Infra | Dynamic Menu Management | ✅ Completed | Done | — |
| 4.a | Master Data Phase 2 (Training, Staff, Agronomy) | ✅ Completed | Done | — |
| 4.b | Master Data Phase 3 (HCV, BUSDEV) | 🔲 Planned | Next | — |
| 4.c | Master Data Phase 4 (IMPACT, Workplan) | 🔲 Planned | Later | — |
| 5 | CMS & Content Management | 🔲 Planned | Later | — |
| 6 | Tools (Import/Export/GIS) | 🔲 Planned | Next | [#52](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/52), [#53](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/53) |
| 7 | Dashboard Basic Data | ✅ Completed | Done | — |
| 7.a | Dashboard Server Actions | ✅ Completed | Done | — |
| 7.b | Interactive Map | ✅ Completed | Done | — |
| 7.c | Dashboard BMP | 🟡 In Progress | Now | [#48](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/48), [#49](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/49), [#50](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/50), [#51](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/51) |
| 8–12 | Community, Workplan, i18n, Testing, DevOps | 🔲 Planned | Later | [#44](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/44) |

### Delivery Horizon (Issue Lanes)

| Horizon | Fokus | Issues |
|---------|-------|--------|
| Now | Menyelesaikan stream Dashboard BMP end-to-end | [#48](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/48), [#49](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/49), [#50](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/50), [#51](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/51) |
| Next | Menyiapkan lane Tools import untuk data agronomy | [#52](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/52), [#53](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/53) |
| Later | Backlog lintas fase non-kritis saat ini | [#44](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/44) |

### Decision Log

- **2026-06-06** — Model roadmap dikonsolidasikan: tabel Phase Status menjadi sumber kebenaran tunggal untuk mencegah kontradiksi status.
- **2026-06-06** — Eksekusi diprioritaskan ke lane **Now** (Dashboard BMP), sementara issue import diposisikan sebagai **Next**.
- **2026-06-06** — Technical debt dipindah ke debt register operasional dengan owner, due window, dan metode validasi.

---

## Technical Debt Register
| Debt Item | Severity | Impact Area | Owner | Deadline | Validation Method | Linked Issue | Status |
|-----------|----------|-------------|-------|----------|-------------------|--------------|--------|
| S3 orphan cleanup (file PDF lama tidak terhapus saat delete/ganti evidence) | High | Data consistency, storage cost | Backend/Storage Lead | 2026-06-20 | Uji delete/replace evidence lalu verifikasi object lama terhapus dan tidak muncul di listing cleanup | TD-001 | Planned |
| Dark mode hardcoded `text-white` di beberapa halaman | Medium | UI consistency, accessibility | Frontend Lead | 2026-07-04 | Visual QA dark/light mode pada halaman terdampak tanpa text contrast regression | TD-002 | Planned |
| `.DS_Store` tracked di git | Low | Repository hygiene | Repository Maintainer | 2026-06-06 | `git --no-pager ls-files | grep '\\.DS_Store$'` harus kosong | TD-003 | ✅ Closed |
| Language toggle non-functional | Low | i18n readiness | i18n Lead | 2026-08-14 | Toggle bahasa harus mengubah locale dan persist state antar navigasi | TD-004 | Planned |
| Spacing guideline belum formal (`globals.css`) | Low | Design system consistency | Design System Lead | 2026-07-18 | Publish guideline spacing + mapping token agar implementasi UI konsisten | TD-005 | Planned |

### Phase B — Issue-Level Execution Plan

| Issue | Scope Eksekusi | Assigned Owner | Deadline | Deliverables | Definition of Done |
|-------|----------------|----------------|----------|--------------|--------------------|
| TD-001 | Perbaikan lifecycle file evidence agar orphan object tidak tertinggal saat replace/delete | Backend/Storage Lead | 2026-06-20 | Patch cleanup logic + safeguard test case replace/delete + catatan risiko rollback | Semua skenario replace/delete evidence lulus test, object lama tidak tersisa di storage/listing, `npm test` dan `npm run build` lulus |
| TD-002 | Standardisasi text color dark mode untuk komponen/halaman terdampak hardcoded `text-white` | Frontend Lead | 2026-07-04 | Daftar halaman terdampak + patch tokenized text color + visual regression checklist | Tidak ada hardcoded `text-white` di area terdampak, kontras tetap terbaca di dark mode, verifikasi visual tercatat |
| TD-003 | Kebersihan repository terkait `.DS_Store` | Repository Maintainer | 2026-06-06 | Verifikasi tracking git + guard `.gitignore` bila diperlukan | Query tracked file `.DS_Store` kosong dan status ditutup |
| TD-004 | Aktivasi language toggle agar locale benar-benar berubah dan tersimpan antar navigasi | i18n Lead | 2026-08-14 | Implementasi toggle locale + persistence state + smoke test navigasi | Toggle memengaruhi locale aktif, state bertahan setelah refresh/navigasi, tidak merusak flow existing |
| TD-005 | Formalisasi spacing guideline berbasis token pada `globals.css` dan contoh pemakaian | Design System Lead | 2026-07-18 | Dokumen guideline spacing + mapping token + referensi implementasi di komponen shared | Guideline dipublikasikan dan dipakai sebagai referensi resmi untuk task UI berikutnya |

### Phase B Sequencing

- Week 1 (hingga 2026-06-20): selesaikan TD-001 (high severity) dan tutup administratif TD-003.
- Week 2–4 (hingga 2026-07-18): eksekusi TD-002 dan TD-005 paralel dengan prioritas konsistensi UI.
- Milestone i18n (hingga 2026-08-14): eksekusi TD-004 agar sinkron dengan fase pengembangan i18n.

---

## Changelog
### Juni 2026

| Tanggal | Perubahan |
|---------|-----------|
| 06-06 | Konsolidasi `docs/progress.md`: canonical roadmap model (source-of-truth status + delivery horizon), decision log, dan technical debt register operasional |
| 06-06 | Eksekusi Fase B: technical debt dikonversi ke issue-level execution plan (TD-001 s.d. TD-005) dengan assigned owner, deadline, deliverables, definition of done, dan sequencing |

### Mei 2026

| Tanggal | Perubahan |
|---------|-----------|
| 05-25 | #61 selesai — User Menu Access Override: Server actions, matrix override modal, rbac helper caching & soft delete, integration, 111/111 tests |
| 05-22 | #57 follow-up — Kolom ringkasan akses data di tabel User Management; bug fix RBAC KT-only (farmerGroup-only assignment sekarang filter by `id` bukan `districtId`); live refresh tabel saat toggle di modal; 105/105 tests |
| 05-22 | #57 selesai — User Data Access Assignment: 7 server actions (assign/remove Province/District/KT), UserDataAccessModal (Tabs UI, visual hierarchy badges, live toggle, search), integrasi ke User Management, 104/104 tests |
| 05-22 | #59 selesai — Standardisasi visibilitas aksi tabel (View, Edit, Delete) dan tombol Tambah berbasis Role & Permission, serta dokumentasi di `docs/rule.md` |
| 05-22 | #60 selesai — Abstraksi aksi tabel dengan komponen TableActions, implementasi TableSkeleton, loading.tsx untuk modul User & Kelompok Tani, dan pengamanan server actions dengan helper hasPermission |
| 05-22 | #58 selesai — Region Management: tree view 4-level hierarchy, CRUD Province/District/Subdistrict/Village, search, status filter, cascade muting, loading skeleton, backend hasPermission hardening |
| 05-22 | #56 in progress — Login (NextAuth), User Management CRUD, Menu Management CRUD, Role & Permission matrix, Kelompok Tani CRUD (list+filter+pagination+detail+RBAC actions), Profile page, 41/41 tests |
| 05-22 | #55 selesai — Schema reset: 6 file baru, RBAC system, soft delete + audit trail, seed + CSV, migration fresh |
| 05-13 | #48 — Update UI/UX Grafik BMP: filter Kategori, grouped bar, warna hijau vibrant, legenda override |
| 05-13 | #48 — Dashboard BMP scaffold: 5 score cards, combo chart, monev cards, filter distrik+KT |
| 05-12 | Issues #48–#53 dibuat (scaffold only) |
| 05-11 | #34 selesai — Dashboard full DB-driven: server actions, map controls, cache tables, 174/174 tests |
| 05-09 | #45 selesai — Training PDF Management: S3 upload, presigned URL, CLI tools, 174/174 tests |
| 05-09 | #43 selesai — Staff Activity: daily log, approval, calendar, export Excel, 154/154 tests |
| 05-09 | #41 selesai — Staff WRI: CRUD, job desk, multi-select distrik/KT, 130/130 tests |
| 05-08 | #39 selesai — Training module lengkap: list, form, detail, S3 upload, 116/116 tests |
| 05-08 | #37 selesai — Interactive Map: filter KT, collapsible panel, icon markers, 100/100 tests |
| 05-07 | #35 selesai — Dynamic Menu Management: Prisma, CRUD, sidebar, drag-and-drop, 95/95 tests |
| 05-06 | #22 selesai — Final QA Fase 4: hapus debug, lokalisasi, cleanup placeholders |
| 05-06 | #31 selesai — Sync production DB: 6 migrations, seed data |
| 05-06 | #29 selesai — Audit trail 22 tabel, 81/81 tests |
| 05-05 | #21 selesai — Parcels CRUD + MapLibre view |
| 05-04 | Restrukturisasi dokumen, skip Fase 3, mulai Fase 4 |

### April 2026

| Tanggal | Perubahan |
|---------|-----------|
| 04-14 | Fase 2 selesai — Prisma 7 modular schema, 3 migrasi PostgreSQL + PostGIS |

### Maret 2026

| Tanggal | Perubahan |
|---------|-----------|
| 03-30 | Code review & sync status |
| 03-28 | Modernisasi Dashboard, perbaikan Home |
| 03-18 | Inisiasi proyek — Next.js, Shadcn, static data |
