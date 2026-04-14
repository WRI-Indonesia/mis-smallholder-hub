
# Smallholder HUB - Developer Guide

*Dokumen ini menjabarkan implementasi dari level arsitektur ke level kode sumber (source code) dan command eksekusi.*

---

### 📋 Informasi Dokumen

| Key | Value |
|-----|-------|
| **Proyek** | Smallholder HUB — Management Information System |
| **Stack** | Next.js 16 · React 19 · Tailwind 4 · Shadcn UI · Prisma · MapLibre |
| **Repository** | `WRI-Indonesia/mis-smallholder-hub` |
| **Terakhir Diupdate** | 2026-04-14 |
| **Diupdate Oleh** | Sofyan (via AI-assisted code review) |

### 📊 Progress Overview

| Fase | Deskripsi | Status |
|------|-----------|--------|
| **Fase 1** | Initialization & UI Statis | ✅ Selesai (1.1–1.8) |
| **Fase 2** | Database Schema & Migrations | ✅ Selesai |
| **Fase 3** | Autentikasi & RBAC | 🔲 Belum dimulai (UI login tersedia) |
| **Fase 4** | Master Data CRUD | 🔲 Belum dimulai |
| **Fase 5** | Core Entity (Petani & Lahan) | 🔲 Belum dimulai |
| **Fase 6** | MVP Modules (Dashboard, Training, Agronomy) | 🔲 Belum dimulai (Basic Data UI tersedia) |
| **Fase 7–10** | Pasca-MVP & Integrasi | 🔲 Belum dimulai |
| **Fase 11–12** | Testing & Deployment | 🔲 Belum dimulai |

### 📝 Changelog

| Tanggal | Oleh | Perubahan |
|---------|------|-----------|
| 2026-04-14 | Sofyan | Fase 2 selesai — Prisma 7 schema modular (`prisma/schema/`), 3 migrasi PostgreSQL + PostGIS, sistem seeding modular (`prisma/seeds/seed-*.ts` + `data/*.csv`), driver adapter `@prisma/adapter-pg`, audit & cleanup struktur folder dan naming conventions. |
| 2026-04-13 | Sofyan | Fase 1.8 selesai — Admin Layout → Server Component, dashboard decomposition, barrel optimization, naming convention, menu refactor, error/loading boundaries, map popup redesign. |
| 2026-03-30 | Sofyan | Code review menyeluruh. Tambah Fase 1.8 (refaktor arsitektur). Tambah Fase 11 (Testing) & 12 (DevOps). Sinkronisasi checkbox status dengan kondisi aktual kode. Update referensi folder & route path. |
| 2026-03-28 | Sofyan | Modernisasi Basic Data Dashboard (compact grid, interactive map). Update data layer CSV. Perbaikan Home page sections. |
| 2026-03-19 | Sofyan | Refaktor admin UI, tambah Fase 1.7 (mobile), prefix `/admin`, global 404, placeholder pages. |
| 2026-03-18 | Sofyan | Inisiasi proyek. Setup Next.js, Shadcn, static data layer, public pages, admin scaffolding. |

### 🎯 Status Saat Ini

**Terakhir diselesaikan:**
- Fase 1.1–1.8 selesai — seluruh UI statis (public + admin) dengan data CSV, responsif mobile, dark/light mode, peta interaktif MapLibre.
- **Fase 2** selesai — Database schema modular Prisma 7 (9 file `.prisma` per domain), 3 migrasi PostgreSQL + PostGIS berhasil diterapkan, sistem seeding modular (12 pasang `seed-*.ts` + `data/*.csv`), `PrismaClient` dengan driver adapter `@prisma/adapter-pg`.

**Selanjutnya dikerjakan:**
- **Fase 3** — Autentikasi & RBAC (NextAuth.js dengan database session).

**Blocked / Dependency:**
- Fase 3 (auth) membutuhkan Fase 2 (database) selesai — ✅ sudah terpenuhi.
- Fase 4–6 membutuhkan Fase 3 (auth) selesai terlebih dahulu.

---

## FASE 1: INITIALIZATION & ENVIRONMENT SETUP

- [x] **1.1. Inisiasi Proyek Next.js**
  - [x] Jalankan: `npx create-next-app@latest smallholder-hub --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - [x] Buat file konfigurasi `.env`, `.env.example`, `.prettierrc.json`.
  - [x] Fix `package.json` name dari `"tmp_next"` ke `"smallholder-hub"`.
- [x] **1.2. Instalasi Dependensi Inti**
  - [x] *Database & ORM*: `npm i prisma --save-dev` & `npm i @prisma/client`
  - [x] *Autentikasi*: `npm i next-auth@beta bcryptjs` & `npm i -D @types/bcryptjs`
  - [x] *Form & Validasi*: `npm i react-hook-form zod @hookform/resolvers`
  - [x] *GIS & Peta*: `npm i maplibre-gl react-map-gl @turf/turf`
  - [x] *Charts & Date*: `npm i recharts date-fns`
  - [x] *CSV Parser*: `npm i papaparse` & `npm i -D @types/papaparse`
  - [x] *Webpack loader*: `next.config.ts` — CSV sebagai `asset/source`, flag `--webpack` di scripts.
- [x] **1.3. Inisiasi Shadcn UI**
  - [x] Jalankan: `npx shadcn@latest init` (Pilih: Default, CSS Variables).
  - [x] Jalankan instalasi komponen wajib berulang: `npx shadcn@latest add button input form select table dialog sonner card popover calendar checkbox separator scroll-area alert badge dropdown-menu label tooltip avatar breadcrumb collapsible sheet skeleton sidebar`
- [x] **1.4. Setup Folder Structure & Multi-Layout**
  - [x] Instalasi theme provider: `npm i next-themes lucide-react`.
  - [x] Setup `ThemeProvider` (Dark mode default) di `src/app/layout.tsx` dengan `TooltipProvider`.
  - [x] Setup **Public Layout** di `src/app/(public)/layout.tsx` (dengan `Navbar.tsx`, `Footer.tsx`, menu Home, Community, Knowledge Management, & tombol Login/Theme).
  - [x] Setup **Admin Layout** di `src/app/(admin)/layout.tsx` dengan integrasi Sidebar Shadcn.
  - [x] Buat direktori inti backend/utilitas: `/src/lib/`, `/src/server/actions/`, `/src/validations/`.
  - [x] Design system: oklch color tokens (Leaf Green nuance light, Dark Green base dark) di `globals.css`.
  - [x] Custom font: `Acumin Pro Condensed` + `Geist` fallback, `Geist Mono` untuk monospace.
  - [x] CSV module declaration: `src/types/custom.d.ts` (`declare module "*.csv"`).
- [x] **1.5. Scaffolding UI Statis (Mockup)**
  - [x] Halaman `Home` publik (Hero, features, tombol toggle Dark Mode & Language (ID/EN)).
    - [x] **Revisi Layout Non-Hero**: Stats cards individual dengan ikon, region cards compact (icon+nama inline), news cards tanpa overlap (-mt-10 dihapus), partners section dengan featured partner, Activities section header split-layout.
  - [x] Halaman `Community` publik (List diskusi statis).
  - [x] Halaman `Knowledge Management` publik (Katalog modul).
  - [x] Customisasi `Sidebar Admin` (Hierarki Menu Lengkap) & Logout Redirect ke Home.
  - [x] Halaman Placeholder Admin (semua menu sidebar di-render sebagai `PlaceholderPage.tsx`).
  - [x] Halaman 404 global: `src/app/not-found.tsx`.
- [x] **1.6. UI Statis with static-data (Detailed per Page)**
  - [x] **Public Pages (`src/lib/static-data/public/`)**
    - [x] `home`: Hero config, features, FAQ, footer links. (Completed: Fading Carousel, Themed Cards, Dark UI Footer)
    - [x] `community`: Split-screen layout (60% Map / 40% List). Fitur:
      - [x] Integrasi MapLibre (react-map-gl) dengan basemap Carto Dark/Positron sinkron tema
      - [x] Marker & Popup interaktif di peta
      - [x] Filter distrik + pencarian teks dengan animasi `.flyTo()` ke sentrum distrik
      - [x] Optimasi filter dengan `useMemo`
      - [x] Arsitektur SSR/Client split: `page.tsx` sebagai Server Component, `CommunityDirectoryClient.tsx` sebagai Client
      - [x] Card komunitas dengan thumbnail gambar, komoditas badge, nama desa
      - [x] Detail page promosi: Hero banner, 4 Key Stats, Tentang, Komoditas, Sertifikasi, Contact Card + Mini Map
      - [x] Data CSV diperkaya: `village`, `commodities`, `image_url`, `chairman_name`, `whatsapp`, `total_land_ha`, `annual_production_ton`, `certifications`
      - [x] `ProfileMiniMap.tsx` komponen peta mini terpisah di detail page
      - [x] `next.config.ts` dikonfigurasi untuk domain gambar Unsplash
    - [x] `knowledge-management`: Modul, kategori, artikel. Fitur:
      - [x] Arsitektur SSR/Client split: `page.tsx` sebagai Server Component, `KnowledgeDirectoryClient.tsx` sebagai Client
      - [x] Hero section dengan statistik konten (Artikel, Video, Toolkit, Dokumentasi)
      - [x] Tab filter pill sticky (Semua | Artikel | Video | Dokumentasi | Toolkit)
      - [x] Search bar terintegrasi dengan counter hasil & filter berdasarkan judul, kategori, penulis, tag
      - [x] Optimasi filter dengan `useMemo`
      - [x] Card premium dengan thumbnail, badge tipe berwarna, tag, meta (penulis, durasi baca), hover animasi
      - [x] Detail page: hero banner, meta info bar, highlight deskripsi, tag, CTA download
      - [x] Sidebar "Konten Terkait" pada detail page (filter by kategori/tipe)
      - [x] Data CSV diperkaya: `author`, `published_date`, `read_time_min`, `tags` (7 konten)
      - [x] `generateMetadata` dinamis pada detail page untuk SEO
      - [x] `next.config.ts` sudah mendukung domain gambar Unsplash (dari sesi Community)
    - [x] `Login Page`: UI Login modern (Split layout, branding, input email/password, demo credentials toggle).
    - [x] `User Static Data`: Profil user mockup (SuperAdmin, Admin Koperasi, Field Officer, Stakeholder) di `src/lib/static-data/user/`.
  - [x] **Admin Pages (`src/lib/static-data/admin/`)**
    - [x] `dashboard`: Basic Data Dashboard compact (10 stat cards grid, map with farmer group markers, detail side-panel).
      - [x] Basic Data layer: `basic-data.csv`, `basic-data-meta.csv`, `group-basic-data.csv` dengan fungsi `getBasicDataStats(program, distrik)`.
      - [x] Filter multidimensi: Program (tahun) + Distrik, data aggregation dari CSV.
      - [x] Map interaktif: marker per kelompok tani, flyTo animation, search, zoom-to-all.
      - [x] Detail panel: statistik Petani (L/P), Lahan (persil/luasan), Training (Paket 1-4).
      - [ ] `Workplan Tracker` (sub-halaman `/admin/dashboard/workplan/` — PlaceholderPage).
    - [x] `master-data`: Static data modules — Farmers (`farmers`), Groups (`groups`), Land (`parcels`), Regions (`regions`).
    - [x] `cms`: Static data modules — News/Articles (`news`), Custom Pages (`pages`), Community CMS (`community`), Knowledge CMS (`knowledge`).
    - [x] `geo`: Spatial map configurations (`geo`) — *Note: route aktual di `admin/tools/geo/`*.
    - [x] `tools`: Import logs (`import`), Export configurations (`export`).
    - [x] `settings`: Users (`users`), Roles (`roles`), System (`system`).
    - [x] `menu`: CSV-driven menu configuration (`menu.csv`) dengan RBAC filtering multidimensi (role, group, jobDesc, region). Parser di `menu.tsx` menggunakan PapaParse.
    - [x] Barrel file: `src/lib/static-data/index.ts` re-export semua module.
- [x] **1.7. Responsivitas Layar (Mobile Friendly)**
  - [x] Navbar Mobile (Hamburger Menu / Shadcn Sheet).
  - [x] Layout grid responsif untuk Halaman Home, Community, dan Knowledge Management.
  - [x] Penyesuaian padding dan font size di layar kecil.

- [x] **1.8. Refaktor Kode & Arsitektur (Code Quality)**

  Berdasarkan hasil code review menyeluruh, fase ini mengatasi technical debt dan meningkatkan maintainability sebelum memasuki Fase 2 (backend).

  - [x] **1.8.1. Admin Layout — Server Component Refactor**

    **Problem:** `src/app/(admin)/layout.tsx` ditandai `"use client"` sehingga semua child page dipaksa menjadi client component, kehilangan keuntungan SSR (metadata, streaming, smaller bundle).

    - [x] Hapus `"use client"` dari `src/app/(admin)/layout.tsx`.
    - [x] Extract breadcrumb logic (`usePathname`, `useBreadcrumb`) ke client component terpisah: `src/components/layout/admin/admin-breadcrumb.tsx`.
    - [x] Extract header interaktif (theme toggle, language, user menu) ke: `src/components/layout/admin/admin-header-actions.tsx` (standalone).
    - [x] Wrap `SidebarProvider` + `SidebarInset` di Server Component, hanya children interaktif yang `"use client"`.
    - [x] Tambahkan `export const metadata` di admin layout untuk SEO (title template: `"%s | Admin - Smallholder HUB"`).
    - [x] Verifikasi: semua admin pages tetap berfungsi setelah refactor.

  - [x] **1.8.2. Reorganisasi Komponen — Folder Consistency**

    **Problem:** 5 komponen admin/public layout berserakan di root `src/components/` padahal folder `layout/admin/` dan `layout/public/` sudah ada dan kosong/kurang.

    - [x] Pindah `src/components/app-sidebar.tsx` → `src/components/layout/admin/app-sidebar.tsx`.
    - [x] Pindah `src/components/nav-main.tsx` → `src/components/layout/admin/nav-main.tsx`.
    - [x] Pindah `src/components/nav-user.tsx` → `src/components/layout/admin/nav-user.tsx`.
    - [x] Pindah `src/components/admin-header-actions.tsx` → `src/components/layout/admin/admin-header-actions.tsx`.
    - [x] Pindah `src/components/hero-carousel.tsx` → `src/components/layout/public/hero-carousel.tsx`.
    - [x] Update semua import paths di file yang menggunakan komponen-komponen di atas.
    - [x] Hapus file lama setelah semua import diupdate.
    - [x] Verifikasi: `npm run build` tanpa error.

  - [x] **1.8.3. Dashboard Decomposition**

    **Problem:** `src/app/(admin)/admin/dashboard/page.tsx` (252 baris) menggabungkan state management, map rendering, stat cards, dan detail panel dalam satu file monolitik. Sulit di-maintain dan di-test.

    - [x] Extract stat cards grid → `src/components/dashboard/basic-data-card-grid.tsx`.
    - [x] Extract peta interaktif → `src/components/dashboard/basic-data-map.tsx`.
    - [x] Extract detail side panel → `src/components/dashboard/basic-data-detail-panel.tsx`.
    - [x] Extract header bar → `src/components/dashboard/dashboard-header.tsx`.
    - [x] Refactor `dashboard/page.tsx` menjadi orchestrator (< 60 baris).
    - [x] Verifikasi: UI identik sebelum dan sesudah decomposition.

  - [x] **1.8.4. Eliminasi Duplikasi Data**

    **Problem:** Data yang sama didefinisikan di beberapa tempat, menyulitkan update dan menyebabkan inkonsistensi.

    - [x] **`REGION_COORDINATES`** — Extract ke `src/lib/map-utils.ts` sebagai `export const REGION_COORDINATES`. Update kedua file untuk import dari `@/lib/map-utils`.
    - [x] **Distrik & Program options** — Extract ke `src/lib/constants.ts` dengan `DISTRIK_OPTIONS` dan `PROGRAM_OPTIONS`. Update semua import.
    - [x] **Knowledge type config** — Extract ke `src/lib/static-data/public/knowledge-management/types.ts`. Import dari UI component.

  - [x] **1.8.5. Barrel Import Optimization**

    **Problem:** `src/lib/static-data/index.ts` re-export semua 19 module via wildcard (`export *`), sehingga setiap halaman yang import dari barrel akan mem-bundle SELURUH data CSV.

    - [x] Hapus semua wildcard re-exports dari `src/lib/static-data/index.ts` (diganti dengan komentar panduan).
    - [x] Update setiap halaman untuk import langsung dari module spesifik:
      - `dashboard/page.tsx`: `from "@/lib/static-data/admin/dashboard"`
      - `community-directory-client.tsx`: `from "@/lib/static-data/public/community"`
      - `knowledge-directory-client.tsx`: `from "@/lib/static-data/public/knowledge-management"`
      - `(public)/page.tsx`: `from "@/lib/static-data/public/home"`
      - Dan seterusnya per halaman.
    - [x] Pertahankan barrel per sub-directory (`admin/dashboard/index.ts`) untuk convenience internal.

  - [x] **1.8.6. Cleanup & Bug Fixes**

    - [x] **Bug — Sidebar logo URL**: `/dashboard` → `/admin/dashboard` di `app-sidebar.tsx`.
    - [x] **Bug — Package name**: `package.json` name `"tmp_next"` → `"smallholder-hub"`.
    - [x] **Unused import**: Hapus `import { Separator }` dari `dashboard/page.tsx`.
    - [x] **XSS risk**: `dangerouslySetInnerHTML` di `(public)/page.tsx` → diganti safe rendering (parse `<br/>` menjadi React nodes).
    - [x] **ESLint suppress**: `<img>` → `<Image>` dari `next/image` di `(public)/page.tsx`.
    - [x] **Error boundaries**: Tambahkan `error.tsx` di `(admin)/admin/` dan `(public)/`.
    - [x] **Loading states**: Tambahkan `loading.tsx` di `(admin)/admin/` dan `(public)/`.
    - [ ] **Non-functional UI**: Language toggle di `Navbar.tsx` dan `AdminHeaderActions.tsx` → Tambahkan komentar `// TODO: Fase 10.4 — i18n integration`.
    - [ ] **Git hygiene**: Tambahkan `.DS_Store` ke `.gitignore`, lalu `git rm --cached`.

  - [x] **1.8.7. Menu Data — Pisahkan JSX dari Data Module**

    **Problem:** `src/lib/static-data/admin/menu.tsx` adalah data module tapi berekstensi `.tsx` karena mengandung JSX (Lucide icon mapping). Ini mencampur data layer dengan rendering concerns.

    - [x] Rename `src/lib/static-data/admin/menu.tsx` → `src/lib/static-data/admin/menu.ts`.
    - [x] Ubah tipe `MenuItem` agar `icon` bertipe `string` (bukan `React.ReactNode`).
    - [x] Pindahkan mapping string → React component ke `nav-main.tsx` sebagai `iconMap: Record<string, React.ReactNode>`.
    - [x] Verifikasi: sidebar icons tetap tampil normal setelah refactor.

  - [x] **1.8.8. Standarisasi Penamaan (Naming Convention)**

    **Problem:** Tidak ada konvensi penamaan yang konsisten untuk file, variabel, dan parameter.

    - [x] **File naming — kebab-case** untuk semua komponen React:
      - `PlaceholderPage.tsx` → `placeholder-page.tsx`
      - `CommunityDirectoryClient.tsx` → `community-directory-client.tsx`
      - `KnowledgeDirectoryClient.tsx` → `knowledge-directory-client.tsx`
      - `ProfileMiniMap.tsx` → `profile-mini-map.tsx`
      - `Navbar.tsx` → `navbar.tsx`, `Footer.tsx` → `footer.tsx`
    - [x] Update semua import paths setelah rename.
    - [x] **Variable naming — Bahasa Inggris** untuk code identifiers:
      - `petaniLaki` → `maleFarmers`, `petaniPerempuan` → `femaleFarmers`
      - `totalPersil` → `totalParcels`, `totalLuasan` → `totalArea`
      - `trainingPaket1` → `trainingPackage1` (dst.)
    - [x] Verifikasi: `npm run build` sukses setelah semua rename.

  - [x] **1.8.9. Konsistensi CSS & Design Tokens**

    - [x] Tambahkan custom utility classes di `globals.css`: `text-xxs` (0.625rem/10px), `text-huge` (4rem).
    - [x] Tambahkan global CSS overrides untuk `.maplibregl-popup-content` agar popup peta menyesuaikan tema (background, border, border-radius, shadow, tip color).
    - [ ] **Hardcoded colors** (non-semantic per content-type) — Didokumentasikan sebagai intentional untuk kategori konten (Artikel=blue, Video=rose, Toolkit=amber, Dokumentasi=emerald). Tidak perlu di-tokenisasi.
    - [ ] **Dark mode audit** — Verifikasi semua halaman di dark mode: hardcoded `text-white` tanpa dark variant.
    - [ ] **Spacing panduan** — Buat panduan spacing: card internal padding, section gaps, page padding.

---

## FASE 2: DATABASE SCHEMA & MIGRATIONS

> ✅ **Selesai** — Prisma 7, PostgreSQL + PostGIS, modular schema & seeding.

- [x] **2.0. Inisiasi Prisma & Konfigurasi**
  - [x] Jalankan `npx prisma init` → generate `prisma/` dan konfigurasi awal.
  - [x] Konfigurasi `DATABASE_URL` di `.env` (PostgreSQL `localhost:1234`).
  - [x] Aktifkan `src/lib/prisma.ts` — singleton client dengan `PrismaPg` driver adapter.
  - [x] Install: `@prisma/adapter-pg`, `pg`, `@types/pg`, `tsx`.
  - [x] Setup `prisma.config.ts` (Prisma 7): `schema: "prisma/schema"`, `seed: "tsx prisma/seed.ts"`.

- [x] **2.1. Modular Schema (`prisma/schema/`)**
  - [x] `_config.prisma` — generator, datasource db (PostgreSQL + PostGIS extension), enum `Role`.
  - [x] `user.prisma` — Model `User` (Role: SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT).
  - [x] `geography.prisma` — Model `Province`, `District` (kode wilayah pemerintah sebagai unique field).
  - [x] `farmer-group.prisma` — Model `FarmerGroup`, `FarmerGroupType`, `FarmerGroupDetail`.
  - [x] `farmer.prisma` — Model `Batch`, `Commodity`, `Farmer` (NIK unique), `LandParcel` (PostGIS polygon + centerPoint).
  - [x] `agronomy.prisma` — Model `AgronomyProduction`, `AgronomyMaintenance`, `MaintenanceType`.
  - [x] `training.prisma` — Model `TrainingPackage`, `TrainingActivity` (relasi `FarmerGroup`), `TrainingParticipant`, `TrainingEvidence`.
  - [x] `certification.prisma` — Model `CertificationType`, `Certification` (relasi `FarmerGroup`), `AuditType`, `AuditActivity`, `AuditEvidence`.
  - [x] `hse.prisma` — Model `HseWorker`, `HseDetail`.

- [x] **2.2. Migrasi Database (3 tahap)**
  - [x] `20260414032404_init_foundations` — User, Geography, FarmerGroup.
  - [x] `20260414034201_add_core_entities` — Batch, Commodity, Farmer, LandParcel.
  - [x] `20260414035352_add_activities_production` — Agronomy, Training, Certification, Audit, HSE.
  - [x] `fix_missing_relations` — Tambah relasi `FarmerGroup` ke `Certification` & `TrainingActivity`.

- [x] **2.3. Sistem Seeding Modular (`prisma/seeds/`)**
  - [x] Struktur: `seed-[tabel].ts` + `data/[tabel].csv` (12 pasang file).
  - [x] `prisma/seed.ts` — master orchestrator, urutan sesuai dependency FK.
  - [x] Phase 2.1: `users`, `provinces`, `districts`.
  - [x] Phase 2.2: `farmer-group-types`, `farmer-groups`, `batches`, `commodities`, `farmers`.
  - [x] Phase 2.3: `maintenance-types`, `certification-types`, `training-packages`, `audit-types`.
  - [x] Semua seeder menggunakan `upsert` (idempotent), password di-hash dengan bcrypt.

## FASE 3: AUTENTIKASI & RBAC FOR MENU & DATA

- [ ] **3.1. Konfigurasi NextAuth.js (Auth.js)**
  - [ ] Buat file `/src/auth.ts` (Credentials Provider dengan konfirmasi bcrypt `compareSync`).
  - [ ] Integrasikan tipe `Session` bawaan untuk memasukkan `user.role` & `user.institutionId`.
- [ ] **3.2. Middleware Proteksi**
  - [ ] Buat file `/src/middleware.ts` untuk memblokir rute `/((?!login|api|_next/static|_next/image|favicon.ico).*)` jika `!session`.
- [ ] **3.3. Halaman Login (`/src/app/login/page.tsx`)** *(UI Only — auth action belum)*
  - [ ] Buat `LoginForm.tsx` (Card, Input Email, Input Password, Button submit) di `src/components/auth/login-form.tsx`.
  - [ ] Buat action `signInWrapper.ts` untuk *Server Actions* otentikasi.
  - [ ] Integrasi dengan NextAuth `signIn()` dan redirect ke `/admin/dashboard`.
- [ ] **3.4. Layout & Navigasi Admin** *(UI Only — session belum terintegrasi)*
  - [ ] Buat `<Sidebar />`: Menu CSV-driven dengan RBAC filtering (`filterNavItems`).
  - [ ] Buat `<Header />`: Render breadcrumb otomatis (`usePathname`) dan User Menu Dropdown, beserta Theme & Language toggle.
  - [ ] Integrasi `currentUserContext` dari NextAuth session (saat ini hardcoded di `app-sidebar.tsx`).
  - [ ] `signOut` di User Dropdown benar-benar memanggil NextAuth `signOut()` dan redirect ke `/`.

## FASE 4: MASTER DATA MANAGEMENT (CRUD LENGKAP)

*Catatan: Semua route admin menggunakan prefix `/admin/` — contoh: `/admin/master-data/regions`.*

- [ ] **4.1. Manajemen Region (Wilayah)**
  - [ ] Buat file validasi `/src/validations/region.schema.ts` (Zod Object).
  - [ ] Buat Actions `/src/server/actions/region.ts`: `getRegions`, `createRegion`, `updateRegion`, `deleteRegion`.
  - [ ] UI List Region: `/src/app/(admin)/admin/master-data/regions/page.tsx` memakai Shadcn Data Table (upgrade dari PlaceholderPage).
- [ ] **4.2. Manajemen Institusi / Koperasi**
  - [ ] Tambah route: `/src/app/(admin)/admin/master-data/institutions/page.tsx`.
  - [ ] Buat form modal `DialogInstitutionForm` memakai `useForm` + Zod.
- [ ] **4.3. Manajemen User (Akses & Hak Akses)**
  - [ ] UI List User: `/src/app/(admin)/admin/settings/users/page.tsx` (upgrade dari PlaceholderPage).
  - [ ] Kolom: Nama, Email, Role, Koperasi, Aksi (Edit/Reset Password).
  - [ ] Server Action: `createUser` memuat hash bcrypt untuk password baru.

## FASE 5: CORE ENTITY - PETANI & LAHAN

- [ ] **5.1. Domain: Farmer**
  - [ ] `/src/validations/farmer.schema.ts` (Pastikan validator regex untuk NIK Indonesia 16 angka).
  - [ ] Halaman `/src/app/(admin)/admin/master-data/farmers/page.tsx`: Upgrade ke Tabel petani fungsional (*server-side pagination* dengan Prisma `take` & `skip`).
  - [ ] Form Petani `/src/app/(admin)/admin/master-data/farmers/new/page.tsx` memuat dependent dropdown (Pilih Provinsi -> Load Kabupaten -> Load Kec...).
- [ ] **5.2. Domain: Land Parcel (Peta MapLibre)**
  - [ ] Buat `<MapViewer />` di `/src/components/maps/MapViewer.tsx` (Inisialisasi `Map` maplibre-gl).
  - [ ] Buat `<DrawControl />` di `/src/components/maps/DrawControl.tsx` menggunakan ekstensi Mapbox Draw.
  - [ ] Kalkulasi luas poligon secara real-time di UI menggunakan library `@turf/area(polygon)`.
  - [ ] Actions: `saveLandParcel` (Konversi hasil poligon koordinat Array ke WKT/Raw query Prisma PostGIS atau field JsonB).
  - [ ] Halaman GIS: `/src/app/(admin)/admin/tools/geo/page.tsx` (upgrade dari PlaceholderPage) — memuat source GeoJSON keseluruhan dan render sebagai `FillLayer` (Maplibre).

## FASE 6: MVP MODULES (DASHBOARD, TRAINING, BMP)

- [ ] **6.1. Modul Training**
  - [ ] Skema Zod `TrainingForm`.
  - [ ] UI List Pelatihan: `/src/app/(admin)/admin/trainings/page.tsx`.
  - [ ] Detail Pelatihan & Presensi: Halaman dinamis `/src/app/(admin)/admin/trainings/[id]/page.tsx`.
  - [ ] Modal Attendance: Memilih petani spesifik dari `<Select>` autocomplete (Debounce text input -> fetch petani) dan menyimpan baris presensi massal (Prisma `createMany`).
- [ ] **6.2. Modul BMP (Best Management Practices)**
  - [ ] UI Admin Master Checklist (`/admin/bmp/master`): *Drag-and-drop* reorder indikator pertanyaan.
  - [ ] UI Field Officer Assessment (`/admin/bmp/assessment/new`): Memilih Lahan, merender iterasi list pertanyaan BMP, form checkbox/radio button per poin.
  - [ ] Server Action pembungkus `prisma.$transaction([])` untuk menyimpan skor penilaian sekaligus.
- [ ] **6.3. Dashboard Analitik**
  - [ ] API Fetcher: `getDashboardStats()` menggunakan `prisma.$count` dan agregasi luas — menggantikan static CSV data.
  - [ ] Basic Data Dashboard UI (Desain selesai — data masih CSV statis, belum terhubung DB).
  - [ ] `<BarChart />` (Recharts) memvisualisasikan `Petani terdaftar per bulan berjalan`.
  - [ ] Workplan Tracker: `/src/app/(admin)/admin/dashboard/workplan/page.tsx` (upgrade dari PlaceholderPage).

## FASE 7: PASCA-MVP LAYER 1 (HCV, HSE, GHG)

- [ ] **7.1. HCV (High Conservation Value)**
  - [ ] DB: `HcvZone` (name, status, polygon).
  - [ ] UI Admin: `/src/app/(admin)/admin/hcv/page.tsx` — Peta overlay zona HCV.
  - [ ] Interseksi Peta: Server Action menggunakan Query Raw PostGIS `ST_Intersects(land.polygon, hcv.polygon)` untuk deteksi dini saat pendaftaran lahan.
- [ ] **7.2. HSE & Insiden**
  - [ ] DB & Form `AccidentReport` (LandParcelId, Date, Keterangan).
  - [ ] UI Admin: `/src/app/(admin)/admin/hse/page.tsx` — List laporan kecelakaan + form input.
- [ ] **7.3. GHG Emission (Emisi GRK)**
  - [ ] UI Kalkulator: Form input bahan kimia pertahun (Urea, Listrik, Solar).
  - [ ] Server Action perhitungan konstanta emisi CO2-eq dan simpan ke DB `GhgCalculationLog`.
  - [ ] Visualisasi: Chart emisi per lahan/per koperasi.

## FASE 8: PASCA-MVP LAYER 2 (SUPPLY CHAIN & FINANCE)

- [ ] **8.1. Traceability / Rantai Pasok**
  - [ ] DB `HarvestTransaction`: (farmerId, harvestDate, weightKg, pricePerKg, buyerId).
  - [ ] UI Surat Pengantar Buah (DO) dengan format bisa diprint.
  - [ ] API Integrasi QR Code: Generate QR berisi detail URL panen.
  - [ ] Riwayat transaksi panen per petani: timeline view.
- [ ] **8.2. Akses Finansial**
  - [ ] Algoritma Credit Scoring: Action API mengkalkulasi skor kelayakan pinjam berdasarkan rata-rata panen & BMP.
  - [ ] UI Dashboard perbandingan skor petani.

## FASE 9: PASCA-MVP LAYER 3 (CERTIFICATION & PROJECT MANAGEMENT)

- [ ] **9.1. Sertifikasi**
  - [ ] Fitur Upload Dokumen Legal: Integrasi storage bucket (contoh AWS S3/Supabase Storage/R2).
  - [ ] Konfigurasi environment variable untuk storage provider.
  - [ ] Simpan direktori URL file ke tabel `FarmerDocument` (id, url, documentType).
  - [ ] UI: List dokumen per petani, preview, dan download.
- [ ] **9.2. Workplan/Gantt Chart**
  - [ ] Integrasi library *Gantt Chart* atau *FullCalendar* untuk jadwal Field Officer.
  - [ ] CRUD event: create, drag-resize, delete.

## FASE 10: INTEGRASI GIS EKSTERNAL & PUBLIKASI (PUBLIC PAGES)

- [ ] **10.1. Layer WMS Eksternal**
  - [ ] Integrasi layer tile WMS dari Hutan Global ke `MapViewer.tsx` (Maplibre `RasterLayer`).
  - [ ] Toggle layer visibility di UI.
- [ ] **10.2. Generic Form Builder (Opsional)**
  - [ ] DB struktur JsonB: Tabel `DynamicFormTemplate`.
  - [ ] UI Builder: drag-drop form fields, preview, publish.
- [ ] **10.3. Public Website (`/src/app/(public)/`)** *(Selesai sebagai UI statis)*
  - [ ] `page.tsx`: Hero section carousel + semua section non-hero (Community, Activities, Partners) dengan layout yang diperbaiki.
  - [ ] `community/page.tsx`: Fetch Next.js SSR konten dari database (saat ini data CSV statis).
  - [ ] `knowledge-management/page.tsx`: Fetch Next.js SSR konten dari database (saat ini data CSV statis).
  - [ ] Setup *Service Worker* dan file `manifest.json` untuk membuat PWA installable.
- [ ] **10.4. Internationalization (i18n)**
  - [ ] Instalasi library i18n: `npm i next-intl` atau `react-i18next`.
  - [ ] Setup translation files: `messages/id.json`, `messages/en.json`.
  - [ ] Integrasi language toggle (saat ini ada di Navbar & AdminHeader tapi non-fungsional) dengan library i18n.
  - [ ] Terjemahkan semua konten UI statis.

## FASE 11: TESTING & QUALITY ASSURANCE

- [ ] **11.1. Unit & Integration Testing**
  - [ ] Setup testing framework: `npm i -D vitest @testing-library/react @testing-library/jest-dom`.
  - [ ] Tulis unit test untuk utility functions (`getBasicDataStats`, `filterNavItems`, `checkAccess`).
  - [ ] Tulis integration test untuk Server Actions (CRUD operations).
  - [ ] Konfigurasi test script di `package.json`: `"test": "vitest"`.
- [ ] **11.2. End-to-End Testing**
  - [ ] Setup Playwright: `npm i -D @playwright/test`.
  - [ ] Tulis E2E test untuk flow utama: Login → Dashboard → CRUD Petani → Logout.
  - [ ] Tulis E2E test untuk public pages: Home → Community → Detail → Knowledge Management.
- [ ] **11.3. Error Handling**
  - [ ] Buat `error.tsx` di route `/(admin)/admin/` dan `/(public)/`.
  - [ ] Buat `loading.tsx` di route utama untuk Suspense boundaries.
  - [ ] Setup error reporting/monitoring (Sentry atau equivalent).

## FASE 12: DEVOPS & DEPLOYMENT

- [ ] **12.1. CI/CD Pipeline**
  - [ ] Setup GitHub Actions: lint → test → build pada setiap PR.
  - [ ] Setup branch protection rules (require CI pass).
- [ ] **12.2. Deployment**
  - [ ] Target deployment platform: Vercel / Docker + VPS.
  - [ ] Konfigurasi environment variables di production.
  - [ ] Setup PostgreSQL + PostGIS database di production (Supabase / Railway / self-hosted).
  - [ ] Konfigurasi domain dan SSL.
- [ ] **12.3. Monitoring & Logging**
  - [ ] Setup application monitoring (uptime, response time).
  - [ ] Setup database monitoring dan backup otomatis.
  - [ ] Konfigurasi log aggregation.

---

## REFERENSI ARSITEKTUR

### Struktur Folder Aktual (Fase 1 Selesai)

```
src/
├── app/
│   ├── (admin)/
│   │   ├── layout.tsx                          # Admin shell — Server Component (metadata, breadcrumb, sidebar)
│   │   └── admin/
│   │       ├── error.tsx                       # Admin error boundary
│   │       ├── loading.tsx                     # Admin loading skeleton
│   │       ├── dashboard/
│   │       │   ├── page.tsx                    # Basic Data Dashboard (orchestrator, < 60 baris)
│   │       │   └── workplan/page.tsx           # Placeholder
│   │       ├── master-data/
│   │       │   ├── farmers/page.tsx            # Tabel statis
│   │       │   ├── groups/page.tsx             # Placeholder
│   │       │   ├── parcels/page.tsx            # Placeholder
│   │       │   └── regions/page.tsx            # Placeholder
│   │       ├── cms/
│   │       │   ├── news/page.tsx               # Tabel statis
│   │       │   ├── pages/page.tsx              # Placeholder
│   │       │   ├── community/page.tsx          # Placeholder
│   │       │   └── knowledge/page.tsx          # Placeholder
│   │       ├── settings/
│   │       │   ├── users/page.tsx              # Placeholder
│   │       │   ├── roles/page.tsx              # Placeholder
│   │       │   └── system/page.tsx             # Placeholder
│   │       └── tools/
│   │           ├── import/page.tsx             # Placeholder
│   │           ├── export/page.tsx             # Placeholder
│   │           └── geo/page.tsx                # Placeholder
│   ├── (public)/
│   │   ├── layout.tsx                          # Public shell (navbar + footer)
│   │   ├── error.tsx                           # Public error boundary
│   │   ├── loading.tsx                         # Public loading
│   │   ├── page.tsx                            # Home page
│   │   ├── community/
│   │   │   ├── page.tsx                        # SSR wrapper
│   │   │   └── [id]/page.tsx                   # Detail page
│   │   └── knowledge-management/
│   │       ├── page.tsx                        # SSR wrapper
│   │       └── [id]/page.tsx                   # Detail page
│   ├── login/page.tsx                          # Login (outside layout groups)
│   ├── layout.tsx                              # Root layout (ThemeProvider)
│   ├── not-found.tsx                           # Global 404
│   └── globals.css                             # Design tokens (oklch) + maplibre popup overrides
├── components/
│   ├── ui/                                     # 23 Shadcn primitives
│   ├── dashboard/                              # Komponen modular dashboard (Fase 1.8.3)
│   │   ├── dashboard-header.tsx
│   │   ├── basic-data-card-grid.tsx
│   │   ├── basic-data-map.tsx
│   │   └── basic-data-detail-panel.tsx
│   ├── community/
│   │   └── community-directory-client.tsx      # Client component (kebab-case)
│   ├── knowledge/
│   │   └── knowledge-directory-client.tsx      # Client component (kebab-case)
│   ├── maps/
│   │   └── profile-mini-map.tsx               # Mini map untuk detail page (kebab-case)
│   ├── auth/login-form.tsx                     # Login form component
│   ├── layout/
│   │   ├── placeholder-page.tsx               # Generic placeholder (kebab-case)
│   │   ├── admin/
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── nav-main.tsx                   # Includes iconMap (string → ReactNode)
│   │   │   ├── nav-user.tsx
│   │   │   ├── admin-header-actions.tsx
│   │   │   └── admin-breadcrumb.tsx           # Client component untuk breadcrumb
│   │   └── public/
│   │       ├── navbar.tsx
│   │       ├── footer.tsx
│   │       └── hero-carousel.tsx
│   └── theme-provider.tsx
├── lib/
│   ├── static-data/
│   │   ├── index.ts                            # Barrel DINONAKTIFKAN — import langsung dari sub-module
│   │   ├── admin/
│   │   │   ├── menu.ts                        # Pure TS (kebab-case) — no JSX
│   │   │   ├── menu.csv
│   │   │   ├── dashboard/basic-data/          # basic-data.csv, meta, group-basic-data.csv
│   │   │   └── (master-data, cms, tools, settings, geo modules)
│   │   ├── public/
│   │   │   ├── home/                          # hero, stats, regions, partners, content, news CSV
│   │   │   ├── community/                     # farmer-groups.csv
│   │   │   └── knowledge-management/
│   │   │       ├── index.ts
│   │   │       ├── types.ts                   # TYPE_CONFIG + KnowledgeType (Fase 1.8.4)
│   │   │       └── data.csv
│   │   └── user/                              # Auth mockup data (user.csv)
│   ├── constants.ts                            # DISTRIK_OPTIONS, PROGRAM_OPTIONS (Fase 1.8.4)
│   ├── map-utils.ts                            # REGION_COORDINATES (Fase 1.8.4)
│   ├── prisma.ts                               # Disabled (→ diaktifkan di Fase 2)
│   └── utils.ts                               # cn() helper
├── server/actions/                             # Kosong (→ diisi mulai Fase 3)
├── types/custom.d.ts                           # CSV module declaration
├── hooks/use-mobile.ts                         # Mobile breakpoint hook
└── validations/                               # Kosong (→ diisi mulai Fase 4)
```

### Status Komponen per Halaman

| Halaman | Tipe | Status | Catatan |
|---------|------|--------|---------|
| Home (`/`) | Server | ✅ Fungsional | Carousel, sections, static data — safe rendering |
| Community (`/community`) | SSR+Client | ✅ Fungsional | Map, filter, cards, detail page — popup redesigned |
| Knowledge (`/knowledge-management`) | SSR+Client | ✅ Fungsional | Tabs, search, cards, detail page |
| Login (`/login`) | Server | ⚠️ UI Only | Form ada, auth action belum |
| Dashboard (`/admin/dashboard`) | Client | ✅ Fungsional | Decomposed: 4 komponen modular, data CSV |
| Workplan (`/admin/dashboard/workplan`) | — | 🔲 Placeholder | Belum implementasi |
| Master Data — Farmers | Client | ⚠️ Tabel Statis | Tampil data CSV, belum CRUD |
| Master Data — Groups/Parcels/Regions | — | 🔲 Placeholder | Semua masih placeholder-page |
| CMS (4 pages) | — | 🔲 Placeholder | Semua masih placeholder-page |
| Settings (3 pages) | — | 🔲 Placeholder | Semua masih placeholder-page |
| Tools (3 pages) | — | 🔲 Placeholder | Semua masih placeholder-page |
