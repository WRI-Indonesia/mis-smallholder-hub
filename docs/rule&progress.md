# Smallholder HUB — Developer Guide & Progress

> Dokumen ini adalah panduan utama untuk development Smallholder HUB MIS.
> Berisi aturan kerja, status progress, dan referensi arsitektur.

---

## 📋 Informasi Proyek

| Key | Value |
|-----|-------|
| **Proyek** | Smallholder HUB — Management Information System |
| **Stack** | Next.js 16 · React 19 · Tailwind 4 · Shadcn UI · Prisma 7 · MapLibre |
| **Repository** | `WRI-Indonesia/mis-smallholder-hub` |
| **Terakhir Diupdate** | 2026-05-04 |
| **Diupdate Oleh** | Sofyan (via AI-assisted development) |

---

## 🔒 Development Rules

### Branching Strategy

> **Current Rule:** Development menggunakan branch yang akan ditentukan oleh project owner.
> Jangan membuat branch fitur, branch eksperimen, atau branch PR terpisah
> kecuali project owner mengubah aturan ini secara eksplisit.

### GitHub Issue Workflow

Setiap unit kerja **wajib** mengikuti alur berikut:

| Step | Aksi | Detail |
|------|------|--------|
| **1** | Pick Issue | Ambil satu GitHub Issue yang sudah di-approve. |
| **2** | Implement | Kerjakan **hanya** scope yang tertulis di issue tersebut. |
| **3** | QA/QC Lokal | Jalankan minimal: `npm run build` dan `npm test` (jika test tersedia). |
| **4** | Performance Test | Jalankan performance test untuk memastikan tidak ada regresi. |
| **5** | Report | Laporkan: changed files, hasil verifikasi, QA notes, dan follow-up risk. |
| **6** | Approval | **Tunggu approval project owner** sebelum push ke GitHub. |

### Mandatory Approval

> **Selalu minta approval dari project owner** sebelum menjalankan aksi berikut:

- ⚠️ **Destructive process** — Hapus file, drop table, reset database, force push, atau aksi apapun yang tidak bisa di-undo.
- ⚠️ **Database mutations** — `CREATE`, `UPDATE`, `DELETE` data di database (termasuk via Prisma seed, migration, atau manual query).

### Coding Conventions

- **File naming:** `kebab-case` untuk semua file komponen React.
- **Variable naming:** Bahasa Inggris untuk semua code identifiers.
- **Import:** Import langsung dari sub-module, bukan barrel `index.ts` root.
- **Server/Client split:** Gunakan Server Component secara default, `"use client"` hanya jika diperlukan.
- **Data layer:** CSV untuk static data, Prisma untuk database operations.
- **Validasi:** Zod schema di `src/validations/`.
- **Server Actions:** Di `src/server/actions/`.

---

## 📊 Progress Overview

### Milestone Summary

| Milestone | Deskripsi | Status |
|-----------|-----------|--------|
| **Fase 1** | Initialization & UI Statis | ✅ Selesai |
| **Fase 2** | Database Schema & Migrations | ✅ Selesai |
| **Fase 3** | Autentikasi & RBAC | 🔲 Belum dimulai |
| **Fase 4** | Master Data CRUD | 🔲 Belum dimulai |
| **Fase 5** | CMS & Content Management | 🔲 Belum dimulai |
| **Fase 6** | Tools (Import/Export/GIS) | 🔲 Belum dimulai |
| **Fase 7** | Dashboard & Reporting (DB) | 🔲 Belum dimulai |
| **Fase 8** | Community & Knowledge (DB) | 🔲 Belum dimulai |
| **Fase 9** | Workplan Tracker | 🔲 Belum dimulai |
| **Fase 10** | Polish (i18n, Accessibility) | 🔲 Belum dimulai |
| **Fase 11** | Testing & QA | 🔲 Belum dimulai |
| **Fase 12** | DevOps & Deployment | 🔲 Belum dimulai |

### Dependency Chain

```
Fase 1 ✅ → Fase 2 ✅ → Fase 3 (Auth) → Fase 4–6 → Fase 7–9 → Fase 10–12
```

### Changelog

| Tanggal | Perubahan |
|---------|-----------|
| 2026-05-04 | Restrukturisasi dokumen untuk fase implementasi. Tambah GitHub Issue Workflow rules. |
| 2026-04-14 | Fase 2 selesai — Prisma 7 modular schema, 3 migrasi PostgreSQL + PostGIS, seeding modular. |
| 2026-04-13 | Fase 1.8 selesai — Refaktor arsitektur (server component, decomposition, naming, barrel). |
| 2026-03-30 | Code review menyeluruh. Sinkronisasi status. |
| 2026-03-28 | Modernisasi Basic Data Dashboard. Perbaikan Home page. |
| 2026-03-18 | Inisiasi proyek. Setup Next.js, Shadcn, static data, public pages. |

---

## ✅ Fase 1 — Initialization & UI Statis (SELESAI)

<details>
<summary>Klik untuk melihat detail Fase 1</summary>

### Ringkasan

Seluruh UI statis (public + admin) selesai dengan data CSV, responsif mobile, dark/light mode, dan peta interaktif MapLibre.

### Sub-fase yang Diselesaikan

| Sub-fase | Deskripsi |
|----------|-----------|
| 1.1 | Inisiasi proyek Next.js, konfigurasi environment |
| 1.2 | Instalasi dependensi (Prisma, NextAuth, MapLibre, Recharts, dll.) |
| 1.3 | Inisiasi Shadcn UI (23 komponen primitif) |
| 1.4 | Setup folder structure, multi-layout (public + admin), design system oklch |
| 1.5 | Scaffolding UI statis (Home, Community, Knowledge, Admin sidebar, 404) |
| 1.6 | UI statis dengan static-data CSV (semua halaman public + admin) |
| 1.7 | Responsivitas mobile (hamburger menu, grid responsif) |
| 1.8 | Refaktor arsitektur (server component, decomposition, naming, barrel, cleanup) |

### Halaman Public

- **Home** (`/`) — Hero carousel, features, stats, regions, partners, news
- **Community** (`/community`) — Split-screen map/list, filter distrik, detail page dengan mini map
- **Knowledge** (`/knowledge-management`) — Tab filter, search, cards premium, detail page
- **Login** (`/login`) — UI form (auth action belum aktif)

### Halaman Admin

- **Dashboard** (`/admin/dashboard`) — 10 stat cards, peta interaktif, detail panel, filter multidimensi
- **Master Data** — Farmers (tabel statis), Groups/Parcels/Regions (placeholder)
- **CMS** — News (tabel statis), Pages/Community/Knowledge (placeholder)
- **Settings** — Users/Roles/System (placeholder)
- **Tools** — Import/Export/Geo (placeholder)

</details>

---

## ✅ Fase 2 — Database Schema & Migrations (SELESAI)

<details>
<summary>Klik untuk melihat detail Fase 2</summary>

### Ringkasan

Prisma 7 dengan PostgreSQL + PostGIS. Schema modular (9 file `.prisma` per domain), 3 migrasi berhasil, sistem seeding modular (12 pasang `seed-*.ts` + `data/*.csv`).

### Schema Models

| File | Models |
|------|--------|
| `_config.prisma` | Generator, datasource, enum `Role` |
| `user.prisma` | `User` (SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT) |
| `geography.prisma` | `Province`, `District` |
| `farmer-group.prisma` | `FarmerGroup`, `FarmerGroupType`, `FarmerGroupDetail` |
| `farmer.prisma` | `Batch`, `Commodity`, `Farmer`, `LandParcel` |
| `agronomy.prisma` | `AgronomyProduction`, `AgronomyMaintenance`, `MaintenanceType` |
| `training.prisma` | `TrainingPackage`, `TrainingActivity`, `TrainingParticipant`, `TrainingEvidence` |
| `certification.prisma` | `CertificationType`, `Certification`, `AuditType`, `AuditActivity`, `AuditEvidence` |
| `hse.prisma` | `HseWorker`, `HseDetail` |

### Migrasi

1. `init_foundations` — User, Geography, FarmerGroup
2. `add_core_entities` — Batch, Commodity, Farmer, LandParcel
3. `add_activities_production` — Agronomy, Training, Certification, Audit, HSE
4. `fix_missing_relations` — Relasi FarmerGroup ke Certification & TrainingActivity

### Konfigurasi

- `prisma.config.ts` → schema: `"prisma/schema"`, seed: `"tsx prisma/seed.ts"`
- `src/lib/prisma.ts` → singleton client dengan `PrismaPg` driver adapter
- Semua seeder menggunakan `upsert` (idempotent), password di-hash bcrypt

</details>

---

## 🚧 Fase 3 — Autentikasi & RBAC (NEXT)

> **Dependency:** Fase 2 ✅ terpenuhi.

### GitHub Issues untuk Fase 3

| # | Issue Title | Scope | Priority |
|---|-------------|-------|----------|
| — | CRUD User Management | Upgrade `/admin/settings/users` dari placeholder ke fungsional (Read, Create, Update, Delete). Zod validation, bcrypt hashing, Server Actions. | 🔴 High |
| — | NextAuth.js Setup | Konfigurasi NextAuth.js dengan database session (Prisma adapter). Login flow fungsional. | 🔴 High |
| — | RBAC Middleware | Route protection berdasarkan role. Middleware untuk admin routes. | 🔴 High |
| — | Session UI Integration | User menu di sidebar menampilkan data session. Logout fungsional. | 🟡 Medium |

### Detail: CRUD User Management

Validasi Prisma Client sebelum melanjutkan auth. Sandbox CRUD pertama.

- Upgrade `users/page.tsx` dari `PlaceholderPage` ke halaman fungsional.
- **Read**: `prisma.user.findMany()` → tabel (Nama, Email, Role, Status).
- **Create**: Form modal (Nama, Email, Password, Role, isActive) + Server Action `createUser`.
- **Update**: Inline edit Role & isActive via Server Action `updateUser`.
- **Delete**: Hapus dengan konfirmasi dialog via Server Action `deleteUser`.
- Password hashing: `bcrypt.hashSync` di Server Action.
- Validasi: Zod schema di `src/validations/user.schema.ts`.

---

## 🔲 Fase 4–12 — Roadmap

### Fase 4 — Master Data CRUD

CRUD lengkap untuk: Farmers, Groups, Land Parcels, Regions.
Migrasi data dari CSV ke database. Pagination, search, filter.

### Fase 5 — CMS & Content Management

CRUD untuk: News/Articles, Custom Pages, Community, Knowledge.
Rich text editor. Media upload.

### Fase 6 — Tools (Import/Export/GIS)

CSV/Excel import dengan validasi. Export data ke CSV/PDF.
GIS tools: peta editor, polygon drawing, geocoding.

### Fase 7 — Dashboard & Reporting (Database-driven)

Migrasi dashboard dari CSV ke query database real-time.
Tambah chart/grafik interaktif. Filter lanjutan.

### Fase 8 — Community & Knowledge (Database-driven)

Migrasi public pages dari static CSV ke database.
Search, pagination, dan konten dinamis.

### Fase 9 — Workplan Tracker

Implementasi halaman `/admin/dashboard/workplan/`.
Progress tracking, timeline, assignment.

### Fase 10 — Polish

- i18n (Bahasa Indonesia / English)
- Accessibility audit (WCAG)
- Dark mode audit
- Spacing & design consistency

### Fase 11 — Testing & QA

Unit tests, integration tests, E2E tests.
Performance benchmarking.

### Fase 12 — DevOps & Deployment

CI/CD pipeline. Docker optimization.
Monitoring, logging, backup strategy.

---

## 📁 Referensi Arsitektur

### Struktur Folder

```
src/
├── app/
│   ├── (admin)/
│   │   ├── layout.tsx                    # Admin shell — Server Component
│   │   └── admin/
│   │       ├── error.tsx / loading.tsx   # Error & loading boundaries
│   │       ├── dashboard/page.tsx        # Basic Data Dashboard (orchestrator)
│   │       ├── master-data/             # farmers, groups, parcels, regions
│   │       ├── cms/                     # news, pages, community, knowledge
│   │       ├── settings/               # users, roles, system
│   │       └── tools/                  # import, export, geo
│   ├── (public)/
│   │   ├── layout.tsx                    # Public shell (navbar + footer)
│   │   ├── error.tsx / loading.tsx
│   │   ├── page.tsx                      # Home
│   │   ├── community/                   # List + [id] detail
│   │   └── knowledge-management/        # List + [id] detail
│   ├── login/page.tsx
│   ├── layout.tsx                        # Root (ThemeProvider)
│   ├── not-found.tsx                     # Global 404
│   └── globals.css                       # Design tokens (oklch)
├── components/
│   ├── ui/                               # 23 Shadcn primitives
│   ├── dashboard/                        # Modular dashboard components
│   ├── community/                        # Community client component
│   ├── knowledge/                        # Knowledge client component
│   ├── maps/                             # Profile mini map
│   ├── auth/                             # Login form
│   └── layout/
│       ├── admin/                        # Sidebar, nav, header, breadcrumb
│       └── public/                       # Navbar, footer, hero carousel
├── lib/
│   ├── static-data/                      # CSV data layer (per domain sub-module)
│   ├── prisma.ts                         # Prisma singleton (PrismaPg adapter)
│   ├── constants.ts                      # Shared constants
│   ├── map-utils.ts                      # Map utilities & coordinates
│   └── utils.ts                          # cn() helper
├── server/actions/                       # Server Actions (diisi mulai Fase 3)
├── validations/                          # Zod schemas (diisi mulai Fase 3)
├── types/custom.d.ts                     # CSV module declaration
└── hooks/use-mobile.ts                   # Mobile breakpoint hook
```

### Tech Stack Detail

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Shadcn UI |
| Styling | Tailwind CSS 4 + oklch design tokens |
| Database | PostgreSQL + PostGIS |
| ORM | Prisma 7 (modular schema, PrismaPg adapter) |
| Auth | NextAuth.js (planned) |
| Maps | MapLibre GL JS + react-map-gl |
| Charts | Recharts |
| Validation | Zod + React Hook Form |
| Font | Acumin Pro Condensed + Geist fallback |

### Outstanding Technical Debt

| Item | Lokasi | Catatan |
|------|--------|---------|
| Language toggle non-functional | `navbar.tsx`, `admin-header-actions.tsx` | TODO: Fase 10 — i18n |
| Dark mode audit | Semua halaman | Beberapa hardcoded `text-white` tanpa dark variant |
| Spacing guideline | `globals.css` | Belum ada panduan spacing formal |
| `.DS_Store` in git | Root | Perlu `git rm --cached` |
