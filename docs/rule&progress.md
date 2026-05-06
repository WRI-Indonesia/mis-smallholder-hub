# Smallholder HUB — Developer Guide & Progress

> Panduan utama development Smallholder HUB MIS.
> Detail setiap issue ada di [GitHub Issues](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues).

---

## 📋 Informasi Proyek

| Key | Value |
|-----|-------|
| **Proyek** | Smallholder HUB — Management Information System |
| **Stack** | Next.js 16 · React 19 · Tailwind 4 · Shadcn UI · Prisma 7 · MapLibre |
| **Repository** | `WRI-Indonesia/mis-smallholder-hub` |
| **Terakhir Diupdate** | 2026-05-06 |
| **Diupdate Oleh** | Sofyan (via AI-assisted development) |
| **Branch Aktif** | `dev-phase-4` |

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

### UI/UX Consistency & Layout Rules

- **Design System:** Selalu gunakan komponen Shadcn UI dan utility class Tailwind 4. Hindari styling *hardcoded*, prioritaskan penggunaan token desain aplikasi.
- **Warna & Tipografi:** Gunakan variabel `oklch` di `globals.css`. Teks utamakan gaya responsif dengan standar hierarki heading yang seragam. Font utama 'Acumin Pro Condensed'.
- **Layout Halaman Admin:**
  - Header halaman (judul & deksripsi) wajib selalu ada untuk memberikan konteks kepada pengguna.
  - Pembungkus data (tabel, metrik) menggunakan komponen `<Card>`.
  - Form kompleks dengan banyak isian harus dibuat rapi: pisahkan menjadi beberapa seksi, hindari *scroll* bertumpuk pada modal, jika perlu gunakan halaman detail penuh atau *Tabs*.
- **Tabel & Filter Data:**
  - Search dan input filter diletakkan berdampingan di atas tabel, berbaris (*stack*) di layar mobile dan sebaris (*inline*) di desktop.
  - Aksi (*actions*) konsisten menggunakan desain minimal (contoh: ikon pada tabel, menu dropdown jika lebih dari 2 aksi).
- **Responsive Design:** Wajib mendukung *breakpoint* standar (mobile, tablet, desktop).
- **State & Feedback:** 
  - Wajib menyediakan *Loading state* (contoh: indikator loading atau *Skeleton*) pada data fetching.
  - Notifikasi visual (Toast) wajib ditampilkan setelah *Server Actions* berhasil atau gagal.

---

## 📊 Milestone & Issues

### Dependency Chain

```
Fase 1 ✅ → Fase 2 ✅ → DB Hardening → Fase 4 (Master Data) → Fase 3 (Auth) → Fase 5–6 → Fase 7–9 → Fase 10–12
```

### Tracking

| Fase | Deskripsi | Status | Issues | GitHub |
|------|-----------|--------|--------|--------|
| **1** | Initialization & UI Statis | ✅ Selesai | — | — |
| **2** | Database Schema & Migrations | ✅ Selesai | — | — |
| **DB** | Database Schema Hardening | ✅ Selesai | [#29](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/29) Audit Trail Fields ✅ · [#31](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/31) Sync Production DB ✅ | [Milestone #4](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/4) |
| **3** | Autentikasi & RBAC | ⏭️ Skipped | — | — |
| **4** | Master Data CRUD | 🚧 In Progress | [#17](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/17) Shared Infra ✅ · [#18](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/18) Regions ✅ · [#19](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/19) Groups ✅ · [#20](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/20) Farmers · [#21](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/21) Parcels ✅ · [#22](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/22) Final QA | [Milestone #3](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/3) |
| **5** | CMS & Content Management | 🔲 | — | — |
| **6** | Tools (Import/Export/GIS) | 🔲 | — | — |
| **7** | Dashboard & Reporting (DB) | 🔲 | — | — |
| **8** | Community & Knowledge (DB) | 🔲 | — | — |
| **9** | Workplan Tracker | 🔲 | — | — |
| **10** | Polish (i18n, Accessibility) | 🔲 | — | — |
| **11** | Testing & QA | 🔲 | — | — |
| **12** | DevOps & Deployment | 🔲 | — | — |

### Changelog

| Tanggal | Perubahan |
|---------|-----------|
| Tanggal | Perubahan |
|---------|-----------|
| 2026-05-06 | Issue #31 selesai — mis-main di-sync: 6 migrations applied via `prisma migrate deploy`, schema drift fixes (abrv_3id + birthdate nullable), seed berhasil (users 4, provinces 2, districts 12, subdistricts 63, farmer-groups 29, batches 2, commodities 3, ref data lengkap). 2 pre-existing seed bugs ditemukan & didokumentasikan (villages.csv & farmers.csv ID mismatch). Build ✅, Tests 81/81 ✅, Perf: Groups 0.33ms, Farmers 0.20ms. |
| 2026-05-06 | Issue #31 dibuat — Sync production database (mis-main): apply 6 migrations + seed data referensi. mis-main saat ini kosong (0 tabel aplikasi). |
| 2026-05-06 | Issue #29 selesai — Audit trail fields (createdAt, createdBy, modifiedAt, modifiedBy) ditambahkan ke 22 tabel. Migration SQL manual (ADD COLUMN IF NOT EXISTS + FK constraints). Prisma client di-regenerate. Server actions (farmer, farmer-group, land-parcel) diupdate. 12 unit tests baru (audit-trail.test.ts). Build ✅, Tests 81/81 ✅, Perf: Farmers 0.41ms, Parcels 0.32ms. |
| 2026-05-06 | Milestone #4 "Database Schema Hardening" dibuat. Issue #29 dibuat — audit trail fields (createdAt, createdBy, modifiedAt, modifiedBy) untuk 22 tabel. |
| 2026-05-05 | Issue #21 selesai — Parcels CRUD lengkap: Zod schema, server actions (PostGIS raw SQL), page, list client (filter kelompok tani, search, pagination), form modal (petani searchable), view modal (detail + peta MapLibre dengan switcher Light/Dark/Satellite), 16 unit tests. |
| 2026-05-04 | Restrukturisasi dokumen. Tambah rules. Skip Fase 3, mulai Fase 4. GitHub Issues & Milestone dibuat. |
| 2026-04-14 | Fase 2 selesai — Prisma 7 modular schema, 3 migrasi PostgreSQL + PostGIS, seeding modular. |
| 2026-04-13 | Fase 1.8 selesai — Refaktor arsitektur (server component, decomposition, naming, barrel). |
| 2026-03-30 | Code review menyeluruh. Sinkronisasi status. |
| 2026-03-28 | Modernisasi Basic Data Dashboard. Perbaikan Home page. |
| 2026-03-18 | Inisiasi proyek. Setup Next.js, Shadcn, static data, public pages. |

---

## 📁 Referensi Arsitektur

<details>
<summary>Struktur Folder</summary>

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
│   ├── shared/                           # Reusable (DataTable, DeleteDialog) — Fase 4
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
├── server/actions/                       # Server Actions
├── validations/                          # Zod schemas
├── types/                                # Custom types (action-result, csv module declaration)
└── hooks/use-mobile.ts                   # Mobile breakpoint hook
```

</details>

<details>
<summary>Tech Stack</summary>

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

</details>

<details>
<summary>Fase 1 — Detail (Selesai)</summary>

Seluruh UI statis (public + admin) selesai dengan data CSV, responsif mobile, dark/light mode, peta interaktif MapLibre.

| Sub-fase | Deskripsi |
|----------|-----------|
| 1.1 | Inisiasi proyek Next.js, konfigurasi environment |
| 1.2 | Instalasi dependensi (Prisma, NextAuth, MapLibre, Recharts, dll.) |
| 1.3 | Inisiasi Shadcn UI (23 komponen primitif) |
| 1.4 | Setup folder structure, multi-layout, design system oklch |
| 1.5 | Scaffolding UI statis (Home, Community, Knowledge, Admin sidebar, 404) |
| 1.6 | UI statis dengan static-data CSV (semua halaman public + admin) |
| 1.7 | Responsivitas mobile (hamburger menu, grid responsif) |
| 1.8 | Refaktor arsitektur (server component, decomposition, naming, barrel, cleanup) |

</details>

<details>
<summary>Fase 2 — Detail (Selesai)</summary>

Prisma 7 + PostgreSQL + PostGIS. Schema modular (9 file `.prisma`), 4 migrasi, seeding modular (12 pasang file).

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

</details>

### Outstanding Technical Debt

| Item | Lokasi | Catatan |
|------|--------|---------|
| Language toggle non-functional | `navbar.tsx`, `admin-header-actions.tsx` | TODO: Fase 10 — i18n |
| Dark mode audit | Semua halaman | Beberapa hardcoded `text-white` tanpa dark variant |
| Spacing guideline | `globals.css` | Belum ada panduan spacing formal |
| `.DS_Store` in git | Root | Perlu `git rm --cached` |
| `villages.csv` ID mismatch | `prisma/seeds/data/villages.csv` | subdistrictId format `subd-140101` tidak cocok dengan `subd-1404010` di subdistricts.csv — `reg-village` selalu kosong |
| `farmers.csv` ID mismatch | `prisma/seeds/data/farmers.csv` | farmerGroupId format `fg-001` tidak cocok dengan `ICS-1406-01` di farmer-groups.csv — seed farmers selalu gagal |
| Schema drift baseline | `prisma/migrations/` | `abrv_3id` dan `birthdate` nullable ditambahkan manual ke mis-dev tanpa migration — perlu migration baseline |
