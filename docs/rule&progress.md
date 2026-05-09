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
| **Terakhir Diupdate** | 2026-05-09 |
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
- **Table Typography Standard** — Wajib konsisten di semua tabel admin:
  - **Header row:** `bg-muted/70 border-b-2 border-border` · setiap `<TableHead>`: `text-xs font-semibold uppercase tracking-wider text-muted-foreground`
  - **Nama / data utama:** `text-sm font-medium`
  - **Kode / ID teknis** (kode kelompok, NIK, kode persil, ID legal): `text-sm font-mono text-muted-foreground`
  - **Data sekunder / deskriptif** (kabupaten, provinsi, kelompok): `text-sm text-muted-foreground`
  - **Angka / luas:** `text-sm tabular-nums` (kanan: tambah `text-right`)
  - **Nilai kosong / null:** karakter `—` dengan `text-muted-foreground`
  - **Kategori / status:** gunakan komponen `<Badge>` (bukan teks biasa)
  - **Koordinat / info tambahan kecil:** boleh `text-xs font-mono text-muted-foreground`
  - **Jangan gunakan** `text-primary`, `font-bold`, atau `italic` di body cell tabel — kecuali ada alasan desain yang eksplisit.
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
| **4** | Master Data CRUD | ✅ Selesai | [#17](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/17) Shared Infra ✅ · [#18](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/18) Regions ✅ · [#19](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/19) Groups ✅ · [#20](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/20) Farmers ✅ · [#21](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/21) Parcels ✅ · [#22](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/22) Final QA ✅ | [Milestone #3](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/3) |
| **4.a Infra** | Dynamic Menu Management — DB-driven Sidebar + Menu CRUD Settings | ✅ Selesai | [#35](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/35) Dynamic Menu Management ✅ | [Milestone #6](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/6) |
| **4.a** | Master Data CRUD - Phase 2 (Training, Agronomy) | ✅ Selesai | [#39](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/39) Training List & Detail ✅ · [#41](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/41) Staff WRI List & Detail ✅ · [#43](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/43) Staff Activity ✅ · [#44](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/44) Telegram Notification 🔲 · [#45](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/45) Training PDF Management ✅ | — || **4.b** | Master Data CRUD - Phase 3 (HCV, BUSDEV) | 🔲 | — | — |
| **4.c** | Master Data CRUD - Phase 4 (IMPACT, Workplan) | 🔲 | — | — |
| **5** | CMS & Content Management | 🔲 | — | — |
| **6** | Tools (Import/Export/GIS) | 🔲 | — | — |
| **7** | Dashboard & Reporting (DB) | 🔲 | — | — |
| **7.a** | Dashboard & Reporting (DB) - Basic Data | 🔲 | — | — |
| **7.a** | Dashboard & Reporting (DB) - Interactive Map | ✅ Selesai | [#37](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/37) Interactive Map ✅ | [Milestone #7](https://github.com/WRI-Indonesia/mis-smallholder-hub/milestone/7) |
| **8** | Community & Knowledge (DB) | 🔲 | — | — |
| **9** | Workplan Tracker | 🔲 | — | — |
| **10** | Polish (i18n, Accessibility) | 🔲 | — | — |
| **11** | Testing & QA | 🔲 | — | — |
| **12** | DevOps & Deployment | 🔲 | — | — |

### Changelog

| Tanggal & Waktu | Perubahan |
|-----------------|-----------|
| 2026-05-09 22:30 | Issue #45 selesai — Training PDF Management: Implementasi lengkap PDF management untuk training evidence. Server actions: `uploadTrainingPDF`, `getTrainingPDFs`, `generatePDFLink`, `deleteTrainingPDF`, `listAllTrainingPDFs`, `cleanupOrphanedPDFs`. UI component `PDFManager` dengan upload modal, thumbnail preview, link generation, delete confirmation. CLI tools: `pdf-manager.js` (link/list/download/delete/cleanup) + `get-link.js` (simple presigned URL). File organization: `training/evidence/YYYY/MM/activity-id/timestamp-filename.pdf`. Enhanced S3 metadata tracking, presigned URL dengan custom expiry, download links dengan custom filename. Utility functions: validation, safe filename generation, S3 key parsing, file size formatting, URL expiry detection. 20 unit tests. Environment variables disesuaikan dengan existing `.env` (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME). Build ✅, Tests 174/174 ✅. |
| 2026-05-09 20:30 | Issue #45 dibuat — Training PDF Management: Implementasi script S3 untuk PDF upload dan read di Kegiatan Training. Script `get-link.js` untuk generate presigned URL dengan IDCloudHost S3 endpoint (is3.cloudhost.id), region id-jkt-1, bucket mis-dev. Support environment variables S3_KEY, S3_SECRET, S3_BUCKET. Generate signed URL valid 1 jam untuk akses PDF evidence training. Integrasi dengan existing training evidence system untuk better PDF handling dan link generation. |
| 2026-05-09 16:20 | Issue #43 selesai — Staff Activity: Daily Log, Approval, Calendar View & Export. Prisma schema 2 model baru (`StaffActivity`, `StaffActivityPhoto`) + enum `ActivityStatus` (DRAFT/PENDING_APPROVAL/APPROVED/REJECTED). Migration SQL manual. Server actions: `getStaffActivities`, `getStaffActivityById`, `createStaffActivity`, `updateStaffActivity`, `submitStaffActivity`, `approveStaffActivity`, `rejectStaffActivity`, `deleteStaffActivity`, `addActivityPhoto`, `deleteActivityPhoto`, `getActivitiesForExport`, `exportActivitiesToExcel`. Upload foto ke S3 `staff-activity/`. List view: tabel semua hari dalam bulan, kolom Planning + Realisasi, weekend highlight merah, status badge 4 warna, aksi per baris (Edit/Submit/Approve/Reject/Delete). Calendar view: grid bulanan, dot status per tanggal, klik untuk input/lihat. Month picker: klik teks bulan → popover grid 12 bulan + spinner tahun. Section accordion collapsible. Export Excel format Monthly Deliverables (ExcelJS). Field `activity` di-split menjadi `planning` (required) + `realization` (opsional). Issue #44 dibuat untuk Telegram notification. Build ✅, Tests 154/154 ✅. |
| 2026-05-09 12:20 | Issue #41 selesai — Master Data Staff WRI: Prisma schema 4 model baru (`JobDesk`, `Staff`, `StaffDistrict`, `StaffFarmerGroup`), migration SQL manual, seed 8 job desks, seed menu entry `md-staff`. Server actions: `getStaff`, `getStaffById`, `createStaff`, `updateStaff`, `deleteStaff`, `getJobDesksForDropdown`, `getStaffForDropdown`. List page (DataTable + filter Job Desk searchable combobox + tombol Tambah Staff). Form modal create/edit: Job Desk combobox (`shouldFilter=false`), Line Manager searchable (exclude self), multi-select Distrik + KT dengan Pilih Semua shortcut + badge preview, pre-populate saat edit via `getStaffById`. Detail page: profil + direct reports clickable + tabel distrik + tabel KT. Kosong = semua (distrik/KT). 14 unit tests. Build ✅, Tests 130/130 ✅. |
| 2026-05-08 21:00 | Issue #39 selesai (final) — Training module lengkap: List page (DataTable + filter KT searchable combobox + tombol Tambah Kegiatan), Form modal create/edit (KT + paket searchable, tanggal, lokasi, upload PDF evidence ke S3 bucket mis-dev dengan presigned URL), Detail page (summary card + daftar peserta + tombol Tambah Peserta dual-panel modal + hapus peserta), server actions: `getTrainingActivities`, `getTrainingActivityById`, `createTrainingActivity`, `updateTrainingActivity`, `deleteTrainingActivity`, `addParticipants`, `removeParticipant`, `getFarmersByGroup`, `uploadTrainingEvidence`. S3 lib (`src/lib/s3.ts`): presigned URL 7 hari. Build ✅, Tests 116/116 ✅. |
| 2026-05-08 19:45 | Issue #39 selesai — Master Data Training List & Detail: server action `getTrainingActivities` + `getTrainingActivityById` + `deleteTrainingActivity`, list page dengan DataTable (6 kolom: KT, paket, tanggal, lokasi, peserta, evidence link), detail page (summary card + tabel peserta dengan NIK masking), delete dengan konfirmasi dialog + router.refresh, placeholder Edit (toast info), 17 unit tests baru (schema validation, pagination, date formatting, NIK masking). Build ✅, Tests 117/117 ✅. |
| 2026-05-08 16:45 | Issue #37 selesai — Interactive Map Dashboard: filter kabupaten + multi-select KT mempengaruhi map & ringkasan, panel section jadi collapsible (Filter/Layer/Basemap), marker KT non-cluster pakai icon. Build ✅, Tests 100/100 ✅. |
| 2026-05-07 14:55 | Issue #37 dibuat — Interactive Map Dashboard: full-screen GIS map, marker KT (29 titik), polygon lahan (10 PostGIS), layer control panel, basemap switcher, popup on click. Milestone #7 dibuat. |
| 2026-05-07 14:35 | Post-merge polish #35 — fix form edit kosong (useEffect reset), action icon (titik 3 → Edit2+Trash2), search tabel menu, icon support child menu sidebar, `src/lib/icon-map.tsx` (ICON_MAP + ICON_LIST), icon picker combobox dengan search, URL field disabled saat edit, typography audit & standarisasi semua tabel admin, dark mode contrast fix (--muted token), fix double header Data Lahan, pindah Regions ke `settings/regions`, table style rule di rule&progress.md. Build ✅, Tests 95/95 ✅. |
| 2026-05-07 09:12 | Issue #35 selesai — Dynamic Menu Management: Prisma schema `MenuItem`, migration SQL manual (workaround schema drift), seed 31 items, 7 server actions, async Server Component sidebar, `menu-utils.ts` RBAC refactor, 9 scaffold pages, Settings → Menu Management UI (CRUD + drag-and-drop + search). Build ✅, Tests 95/95 ✅, Perf: `getMenuItems` ~46ms warm, MenuManagementPage ~339ms. |
| 2026-05-07 08:30 | Issue #35 dibuat — Dynamic Menu Management: migrasi menu sidebar dari CSV statis ke DB (Prisma schema `MenuItem`, migration, seed, Server Actions CRUD, dynamic sidebar, scaffold 9 halaman baru, Settings → Menu Management UI). Milestone #6 dibuat. |
| 2026-05-06 23:45 | Issue #22 selesai — Final QA Fase 4: hapus semua debug logs (SERVER/PAGE/CLIENT DEBUG) dari 4 file, lokalisasi teks bahasa Inggris di farmer detail page, ganti badge status hardcoded dengan data real (parcel count), hapus placeholder data `Math.random()` di group detail tabs (training/BMP), hapus external image URL wikimedia. Build ✅, Tests 81/81 ✅, Perf: Groups 324ms, Farmers 335ms, Parcels 100ms, Provinces 33ms, Districts 63ms — semua < 500ms. |
| 2026-05-06 22:10 | Issue #31 selesai — mis-main di-sync: 6 migrations applied via `prisma migrate deploy`, schema drift fixes (abrv_3id + birthdate nullable), seed berhasil (users 4, provinces 2, districts 12, subdistricts 63, farmer-groups 29, batches 2, commodities 3, ref data lengkap). 2 pre-existing seed bugs ditemukan & didokumentasikan (villages.csv & farmers.csv ID mismatch). Build ✅, Tests 81/81 ✅, Perf: Groups 0.33ms, Farmers 0.20ms. |
| 2026-05-06 20:00 | Issue #31 dibuat — Sync production database (mis-main): apply 6 migrations + seed data referensi. mis-main saat ini kosong (0 tabel aplikasi). |
| 2026-05-06 18:30 | Issue #29 selesai — Audit trail fields (createdAt, createdBy, modifiedAt, modifiedBy) ditambahkan ke 22 tabel. Migration SQL manual (ADD COLUMN IF NOT EXISTS + FK constraints). Prisma client di-regenerate. Server actions (farmer, farmer-group, land-parcel) diupdate. 12 unit tests baru (audit-trail.test.ts). Build ✅, Tests 81/81 ✅, Perf: Farmers 0.41ms, Parcels 0.32ms. |
| 2026-05-06 16:00 | Milestone #4 "Database Schema Hardening" dibuat. Issue #29 dibuat — audit trail fields (createdAt, createdBy, modifiedAt, modifiedBy) untuk 22 tabel. |
| 2026-05-05 21:00 | Issue #21 selesai — Parcels CRUD lengkap: Zod schema, server actions (PostGIS raw SQL), page, list client (filter kelompok tani, search, pagination), form modal (petani searchable), view modal (detail + peta MapLibre dengan switcher Light/Dark/Satellite), 16 unit tests. |
| 2026-05-04 10:00 | Restrukturisasi dokumen. Tambah rules. Skip Fase 3, mulai Fase 4. GitHub Issues & Milestone dibuat. |
| 2026-04-14 15:00 | Fase 2 selesai — Prisma 7 modular schema, 3 migrasi PostgreSQL + PostGIS, seeding modular. |
| 2026-04-13 14:00 | Fase 1.8 selesai — Refaktor arsitektur (server component, decomposition, naming, barrel). |
| 2026-03-30 11:00 | Code review menyeluruh. Sinkronisasi status. |
| 2026-03-28 09:00 | Modernisasi Basic Data Dashboard. Perbaikan Home page. |
| 2026-03-18 08:00 | Inisiasi proyek. Setup Next.js, Shadcn, static data, public pages. |
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
| S3 orphan files — evidence tidak terhapus dari bucket | `src/lib/s3.ts`, `src/server/actions/training.ts` | Saat delete kegiatan training atau ganti evidence, file PDF lama di bucket `mis-dev` tidak ikut terhapus. Perlu tools cleanup (list orphan keys vs DB records) — ditunda ke fase Tools. |
| `window.location.reload()` di menu CRUD | `settings/menu/menu-manager-client.tsx` | Ganti dengan `router.refresh()` dari `next/navigation` untuk avoid full page reload |
| Unused DropdownMenu imports | `settings/menu/menu-manager-client.tsx` | `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuTrigger` tidak terpakai setelah refactor action ke icon button |
| `getMenuItems()` tidak di-cache | `server/actions/menu.ts` | Dipanggil per halaman tanpa cache — tambahkan `unstable_cache` atau React `cache()` saat halaman bertambah banyak |
| `prisma/seed.ts` masih pakai `ts-node` | `package.json` | `"seed": "npx ts-node prisma/seed.ts"` — perlu diupdate ke `tsx` agar konsisten |
| Circular reference check 1 level | `server/actions/menu.ts` `updateMenuItem()` | Hanya cegah self-reference langsung, belum deteksi A→B→A |
| `isActive` vs `isVisible` semantik | `settings/menu/menu-manager-client.tsx` | Perlu tooltip/helper text di form modal agar tidak membingungkan user |
| Drag-and-drop flat list | `settings/menu/menu-manager-client.tsx` | Reorder bekerja pada semua 31 item sekaligus, idealnya per parent group |
