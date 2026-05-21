# Smallholder HUB — Progress

> Tracking progress development. Detail issue: [GitHub Issues](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues)

---

## Roadmap

```
Fase 1 ✅ → Fase 2 ✅ → DB Hardening ✅ → Fase 4 ✅ → Fase 3 ⏭️ → Fase 7 ✅ → Fase 5–6 → Fase 8–12
```

---

## Status

| Phase | Deskripsi | Status |
|-------|-----------|--------|
| 1 | Initialization & UI Statis | ✅ |
| 2 | Database Schema & Migrations | ✅ |
| DB | Schema Hardening (Audit Trail, Sync) | ✅ |
| 4 | Master Data CRUD (Regions, Groups, Farmers, Parcels) | ✅ |
| 4.a Infra | Dynamic Menu Management | ✅ |
| 4.a | Master Data Phase 2 (Training, Staff, Agronomy) | ✅ |
| 3 | Autentikasi & RBAC | ✅ |
| 7 | Dashboard Basic Data | ✅ |
| 7.a | Dashboard Server Actions | ✅ |
| 7.b | Interactive Map | ✅ |
| 7.c | Dashboard BMP | 🟡 In Progress |
| 4.b | Master Data Phase 3 (HCV, BUSDEV) | 🔲 |
| 4.c | Master Data Phase 4 (IMPACT, Workplan) | 🔲 |
| 5 | CMS & Content Management | 🔲 |
| 6 | Tools (Import/Export/GIS) | 🔲 |
| 8–12 | Community, Workplan, i18n, Testing, DevOps | 🔲 |

---

## Active Issues

| # | Deskripsi | Status |
|---|-----------|--------|
| [#55](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/55) | DB & Prisma Schema Clean Up | ✅ |
| [#56](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/56) | Core Pages (Login, Settings, Master Data KT) | 🟡 |
| [#48](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/48) | Dashboard BMP | 🟡 |
| [#44](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/44) | Telegram Notification | 🔲 |
| [#49](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/49) | Dashboard Training Scaffold | 🔲 |
| [#50](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/50) | KT Detail Tab BMP | 🔲 |
| [#51](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/51) | Petani Detail Tab Pelatihan & Produksi | 🔲 |
| [#52](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/52) | Import Agronomy Produksi | 🔲 |
| [#53](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/53) | Import Agronomy Monev BMP | 🔲 |

---

## Technical Debt

### High Priority

| Issue | Location |
|-------|----------|
| S3 orphan cleanup | File PDF lama tidak terhapus saat delete/ganti evidence |

### Medium Priority

| Issue | Location |
|-------|----------|
| Dark mode hardcoded `text-white` | Beberapa halaman |

### Low Priority

| Issue | Location |
|-------|----------|
| `.DS_Store` in git | Perlu `git rm --cached` |
| Language toggle non-functional | Fase 10 (i18n) |
| Spacing guideline belum formal | `globals.css` |

---

## Changelog

### Mei 2026

| Tanggal | Perubahan |
|---------|-----------|
| 05-22 | #56 in progress — Login (NextAuth), User Management CRUD, Menu Management CRUD, Role & Permission matrix, RBAC sidebar filter, Profile page, 41/41 tests |
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
