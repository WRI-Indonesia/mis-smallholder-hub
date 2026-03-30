
# Smallholder HUB - Developer Guide

*Dokumen ini menjabarkan implementasi dari level arsitektur ke level kode sumber (source code) dan command eksekusi.*

---

### 📋 Informasi Dokumen

| Key | Value |
|-----|-------|
| **Proyek** | Smallholder HUB — Management Information System |
| **Stack** | Next.js 16 · React 19 · Tailwind 4 · Shadcn UI · Prisma · MapLibre |
| **Repository** | `WRI-Indonesia/mis-smallholder-hub` |
| **Terakhir Diupdate** | 2026-03-30 |
| **Diupdate Oleh** | Sofyan (via AI-assisted code review) |

### 📊 Progress Overview

| Fase | Deskripsi | Status |
|------|-----------|--------|
| **Fase 1** | Initialization & UI Statis | ✅ Selesai (1.1–1.7) · 🔲 Refaktor (1.8) |
| **Fase 2** | Database Schema & Migrations | 🔲 Belum dimulai |
| **Fase 3** | Autentikasi & RBAC | 🔲 Belum dimulai (UI login tersedia) |
| **Fase 4** | Master Data CRUD | 🔲 Belum dimulai |
| **Fase 5** | Core Entity (Petani & Lahan) | 🔲 Belum dimulai |
| **Fase 6** | MVP Modules (Dashboard, Training, BMP) | 🔲 Belum dimulai (Basic Data UI tersedia) |
| **Fase 7–10** | Pasca-MVP & Integrasi | 🔲 Belum dimulai |
| **Fase 11–12** | Testing & Deployment | 🔲 Belum dimulai |

### 📝 Changelog

| Tanggal | Oleh | Perubahan |
|---------|------|-----------|
| 2026-03-30 | Sofyan | Code review menyeluruh. Tambah Fase 1.8 (refaktor arsitektur). Tambah Fase 11 (Testing) & 12 (DevOps). Sinkronisasi checkbox status dengan kondisi aktual kode. Update referensi folder & route path. |
| 2026-03-28 | Sofyan | Modernisasi Basic Data Dashboard (compact grid, interactive map). Update data layer CSV. Perbaikan Home page sections. |
| 2026-03-19 | Sofyan | Refaktor admin UI, tambah Fase 1.7 (mobile), prefix `/admin`, global 404, placeholder pages. |
| 2026-03-18 | Sofyan | Inisiasi proyek. Setup Next.js, Shadcn, static data layer, public pages, admin scaffolding. |

### 🎯 Status Saat Ini

**Terakhir diselesaikan:**
- Fase 1.1–1.7 selesai — seluruh UI statis (public + admin) dengan data CSV, responsif mobile, dark/light mode, peta interaktif MapLibre.
- Basic Data Dashboard fungsional penuh (10 stat cards, map markers, detail panel, filter multidimensi).

**Selanjutnya dikerjakan:**
- **Fase 1.8** — Refaktor kode & arsitektur (admin layout ke Server Component, reorganisasi komponen, dashboard decomposition, eliminasi duplikasi, cleanup).

**Blocked / Dependency:**
- Fase 2–6 membutuhkan PostgreSQL + PostGIS server dan Prisma schema setup.
- Fase 3 (auth) membutuhkan Fase 2 (database) selesai terlebih dahulu.

---

## FASE 1: INITIALIZATION & ENVIRONMENT SETUP

- [x] **1.1. Inisiasi Proyek Next.js**
  - [x] Jalankan: `npx create-next-app@latest smallholder-hub --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - [x] Buat file konfigurasi `.env`, `.env.example`, `.prettierrc.json`.
  - [ ] Fix `package.json` name dari `"tmp_next"` ke `"smallholder-hub"`.
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

- [ ] **1.8. Refaktor Kode & Arsitektur (Code Quality)**

  Berdasarkan hasil code review menyeluruh, fase ini mengatasi technical debt dan meningkatkan maintainability sebelum memasuki Fase 2 (backend).

  - [ ] **1.8.1. Admin Layout — Server Component Refactor**

    **Problem:** `src/app/(admin)/layout.tsx` ditandai `"use client"` sehingga semua child page dipaksa menjadi client component, kehilangan keuntungan SSR (metadata, streaming, smaller bundle).

    - [ ] Hapus `"use client"` dari `src/app/(admin)/layout.tsx`.
    - [ ] Extract breadcrumb logic (`usePathname`, `useBreadcrumb`) ke client component terpisah: `src/components/layout/admin/AdminBreadcrumb.tsx`.
    - [ ] Extract header interaktif (theme toggle, language, user menu) ke: `src/components/layout/admin/AdminHeaderActions.tsx` (sudah ada, pastikan standalone).
    - [ ] Wrap `SidebarProvider` + `SidebarInset` di Server Component, hanya children interaktif yang `"use client"`.
    - [ ] Tambahkan `export const metadata` di admin layout untuk SEO (title template: `"%s | Admin - Smallholder HUB"`).
    - [ ] Verifikasi: semua admin pages tetap berfungsi setelah refactor.

  - [ ] **1.8.2. Reorganisasi Komponen — Folder Consistency**

    **Problem:** 5 komponen admin/public layout berserakan di root `src/components/` padahal folder `layout/admin/` dan `layout/public/` sudah ada dan kosong/kurang.

    - [ ] Pindah `src/components/app-sidebar.tsx` → `src/components/layout/admin/AppSidebar.tsx`.
    - [ ] Pindah `src/components/nav-main.tsx` → `src/components/layout/admin/NavMain.tsx`.
    - [ ] Pindah `src/components/nav-user.tsx` → `src/components/layout/admin/NavUser.tsx`.
    - [ ] Pindah `src/components/admin-header-actions.tsx` → `src/components/layout/admin/AdminHeaderActions.tsx`.
    - [ ] Pindah `src/components/hero-carousel.tsx` → `src/components/layout/public/HeroCarousel.tsx`.
    - [ ] Update semua import paths di file yang menggunakan komponen-komponen di atas:
      - `src/app/(admin)/layout.tsx` (AppSidebar, AdminHeaderActions, NavMain, NavUser).
      - `src/app/(public)/page.tsx` (HeroCarousel).
    - [ ] Hapus file lama setelah semua import diupdate.
    - [ ] Verifikasi: `npm run build` atau dev server tanpa error.

  - [ ] **1.8.3. Dashboard Decomposition**

    **Problem:** `src/app/(admin)/admin/dashboard/page.tsx` (252 baris) menggabungkan state management, map rendering, stat cards, dan detail panel dalam satu file monolitik. Sulit di-maintain dan di-test.

    - [ ] Extract stat cards grid → `src/components/dashboard/BasicDataCardGrid.tsx`.
      - Props: `stats: BasicDataStat[]`.
      - Includes: iconMap, grid layout (2×5), individual card rendering.
    - [ ] Extract peta interaktif → `src/components/dashboard/BasicDataMap.tsx`.
      - Props: `groups: FarmerGroupData[]`, `selectedGroup`, `onMarkerClick`, `mapSearch`, `onSearchChange`, `onZoomToAll`.
      - Includes: MapGL, Markers, search bar overlay, zoom-to-all button.
    - [ ] Extract detail side panel → `src/components/dashboard/BasicDataDetailPanel.tsx`.
      - Props: `selectedGroup: FarmerGroupData | null`, `onClose`.
      - Includes: DetailSection sub-component, empty state.
    - [ ] Extract header bar → `src/components/dashboard/DashboardHeader.tsx`.
      - Props: `program`, `distrik`, `onProgramChange`, `onDistrikChange`.
      - Includes: title, Select filters.
    - [ ] Refactor `dashboard/page.tsx` menjadi orchestrator:
      - Hanya berisi state (useState, useEffect) dan compose 4 komponen di atas.
      - Target: < 80 baris.
    - [ ] Verifikasi: UI identik sebelum dan sesudah decomposition.

  - [ ] **1.8.4. Eliminasi Duplikasi Data**

    **Problem:** Data yang sama didefinisikan di beberapa tempat, menyulitkan update dan menyebabkan inkonsistensi.

    - [ ] **`REGION_COORDINATES`** — Didefinisikan identik di 2 file:
      - `src/app/(admin)/admin/dashboard/page.tsx` (line 28-34)
      - `src/components/community/CommunityDirectoryClient.tsx` (line 16-22)
      - → Extract ke `src/lib/map-utils.ts` sebagai `export const REGION_COORDINATES`.
      - → Update kedua file untuk import dari `@/lib/map-utils`.
    - [ ] **Distrik options** — Hardcoded di 3 tempat:
      - `dashboard/page.tsx`: `const distrikOptions = ["All", "Kampar", ...]`
      - `CommunityDirectoryClient.tsx`: `<SelectItem>` hardcoded per distrik
      - `basic-data/index.ts`: data distrik embedded di CSV
      - → Buat `src/lib/constants.ts` dengan `DISTRIK_OPTIONS` dan `PROGRAM_OPTIONS`.
      - → Derive dari CSV data atau definisi tunggal, bukan hardcode per file.
    - [ ] **Knowledge type config** — Didefinisikan identik di 2 file:
      - `KnowledgeDirectoryClient.tsx` (line 12-17): `typeConfig` object
      - `knowledge-management/[id]/page.tsx` (line 22-27): `typeConfig` object
      - → Extract ke `src/lib/static-data/public/knowledge-management/types.ts`.

  - [ ] **1.8.5. Barrel Import Optimization**

    **Problem:** `src/lib/static-data/index.ts` re-export semua 19 module via wildcard (`export *`), sehingga setiap halaman yang import dari barrel akan mem-bundle SELURUH data CSV (farmers, groups, regions, dll), meskipun hanya pakai 1 module.

    - [ ] Hapus semua wildcard re-exports dari `src/lib/static-data/index.ts`.
    - [ ] Update setiap halaman untuk import langsung dari module spesifik:
      - `dashboard/page.tsx`: `from "@/lib/static-data/admin/dashboard/basic-data"` (bukan `from "@/lib/static-data"`)
      - `CommunityDirectoryClient.tsx`: `from "@/lib/static-data/public/community"`
      - `KnowledgeDirectoryClient.tsx`: `from "@/lib/static-data/public/knowledge-management"`
      - `(public)/page.tsx`: `from "@/lib/static-data/public/home"`
      - `app-sidebar.tsx`: `from "@/lib/static-data/admin/menu"`
      - Dan seterusnya per halaman.
    - [ ] Pertahankan barrel per sub-directory (`admin/dashboard/index.ts`) untuk convenience internal.
    - [ ] Verifikasi bundle size sebelum dan sesudah (gunakan `npx @next/bundle-analyzer`).

  - [ ] **1.8.6. Cleanup & Bug Fixes**

    **Problem:** Kumpulan bug kecil, unused imports, dan konfigurasi yang perlu diperbaiki.

    - [ ] **Bug — Sidebar logo URL**: `/dashboard` → `/admin/dashboard` di `app-sidebar.tsx` (link salah, tidak akan redirect ke dashboard).
    - [ ] **Bug — Package name**: `package.json` name masih `"tmp_next"` → ubah ke `"smallholder-hub"`.
    - [ ] **Unused import**: Hapus `import { Separator }` dari `dashboard/page.tsx` (tidak dipakai).
    - [ ] **Git hygiene**: Tambahkan `.DS_Store` ke `.gitignore`, lalu `git rm --cached` file `.DS_Store` yang sudah ter-commit.
    - [ ] **Non-functional UI**: Language toggle di `Navbar.tsx` dan `AdminHeaderActions.tsx` mengubah state lokal tapi tidak ada efek → Tambahkan komentar `// TODO: Fase 10.4 — i18n integration` dan disable toggle sementara, atau tampilkan tooltip "Coming Soon".
    - [ ] **XSS risk**: `dangerouslySetInnerHTML={{ __html: homeContent['hero']?.title }}` di `(public)/page.tsx` line 34 → Ganti dengan safe rendering: parse HTML di server dan render sebagai React nodes, atau gunakan library sanitasi (`dompurify`).
    - [ ] **Loose typing**: `partnerIconMap: Record<string, any>` dan `statIconMap: Record<string, any>` di `(public)/page.tsx` → Ganti ke `Record<string, React.ElementType>`.
    - [ ] **ESLint suppress**: `{/* eslint-disable-next-line @next/next/no-img-element */}` di `(public)/page.tsx` line 140 → Ganti `<img>` dengan `<Image>` dari `next/image`, atau documentasikan alasan suppress.
    - [ ] **Error boundaries**: Tambahkan `error.tsx` di:
      - `src/app/(admin)/admin/error.tsx`
      - `src/app/(public)/error.tsx`
      - Pattern: tampilkan pesan error user-friendly dengan tombol "Coba Lagi".
    - [ ] **Loading states**: Tambahkan `loading.tsx` di:
      - `src/app/(admin)/admin/loading.tsx`
      - `src/app/(public)/loading.tsx`
      - Pattern: skeleton/spinner konsisten dengan design system.

  - [ ] **1.8.7. Menu Data — Pisahkan JSX dari Data Module**

    **Problem:** `src/lib/static-data/admin/menu.tsx` adalah data module tapi berekstensi `.tsx` karena mengandung JSX (Lucide icon mapping). Ini mencampur data layer dengan rendering concerns.

    - [ ] Rename `src/lib/static-data/admin/menu.tsx` → `src/lib/static-data/admin/menu.ts`.
    - [ ] Ubah `iconMap` agar data module hanya export string key icon (contoh: field `icon: "LayoutDashboardIcon"` dari CSV sudah cukup).
    - [ ] Pindahkan mapping string → React component ke `NavMain.tsx`:
      ```ts
      const iconMap: Record<string, LucideIcon> = {
        LayoutDashboardIcon: LayoutDashboard,
        DatabaseIcon: Database,
        // ...
      };
      ```
    - [ ] Update tipe `MenuItem` agar `icon` bertipe `string` (bukan `React.ReactNode`).
    - [ ] Verifikasi: sidebar icons tetap tampil normal setelah refactor.

  - [ ] **1.8.8. Standarisasi Penamaan (Naming Convention)**

    **Problem:** Tidak ada konvensi penamaan yang konsisten untuk file, variabel, dan parameter. Campur PascalCase dan kebab-case untuk komponen, campur bahasa Indonesia dan Inggris untuk variabel.

    - [ ] **File naming — Tetapkan konvensi:**
      - Komponen React (`.tsx`): **kebab-case** (konvensi Next.js/Shadcn). Contoh: `app-sidebar.tsx`, `login-form.tsx`.
      - Rename file PascalCase yang inkonsisten:
        - `PlaceholderPage.tsx` → `placeholder-page.tsx`
        - `CommunityDirectoryClient.tsx` → `community-directory-client.tsx`
        - `KnowledgeDirectoryClient.tsx` → `knowledge-directory-client.tsx`
        - `ProfileMiniMap.tsx` → `profile-mini-map.tsx`
        - `Navbar.tsx` → `navbar.tsx` (sudah lowercase, tapi capitalize awal)
        - `Footer.tsx` → `footer.tsx`
      - Data/utility files (`.ts`): **kebab-case**. Contoh: `map-utils.ts`, `use-mobile.ts` ✅ (sudah benar).
      - CSV files: **kebab-case** ✅ (sudah benar: `basic-data.csv`, `menu.csv`).
    - [ ] **Function naming — Tetapkan konvensi:**
      - Page components: `export default function <NamaPage>Page()` (PascalCase + "Page" suffix). Placeholder yang saat ini `function Page()` → rename sesuai route: `MasterDataRegionsPage`, `CMSNewsPage`, dll.
    - [ ] **Parameter/variable naming — Tetapkan konvensi bahasa:**
      - Keputusan: gunakan **Bahasa Inggris** untuk semua code identifiers.
      - Rename variabel Indonesia ke Inggris:
        - `distrik` → `district` (di `dashboard/page.tsx`, `basic-data/index.ts`, `constants.ts`)
        - `petaniLaki` → `maleFarmers`, `petaniPerempuan` → `femaleFarmers` (di `FarmerGroupData` type)
        - `totalPersil` → `totalParcels`, `totalLuasan` → `totalArea`
        - `trainingPaket1` → `trainingPackage1` (dst.)
      - **Catatan:** nama field CSV boleh tetap Indonesia, tapi mapping di TypeScript type harus English.
    - [ ] **Update semua import paths** dan referensi setelah rename file.
    - [ ] Verifikasi: `npm run build` tanpa error setelah semua rename.

  - [ ] **1.8.9. Konsistensi CSS & Design Tokens**

    **Problem:** Banyak hardcoded CSS values (`text-[10px]`, `text-[14px]`, `bg-rose-500/10`, dll.) yang tidak menggunakan design tokens dari `globals.css`. Ini menyulitkan perubahan tema global dan menyebabkan inkonsistensi ukuran/warna antar halaman.

    - [ ] **Hardcoded font sizes** — 28 instances `text-[Npx]` tersebar di 7 file:
      - Sizes ditemukan: `10px`, `11px`, `12px`, `14px`, `15px`, `16px`.
      - → Definisikan custom utility classes atau gunakan Tailwind default scale:
        - `text-[10px]` → `text-[0.625rem]` atau custom `text-2xs` (buat di globals.css)
        - `text-[11px]` → custom `text-xs-tight` atau `text-xs`
        - `text-[12px]` → `text-xs` (Tailwind default 0.75rem)
        - `text-[14px]` → `text-sm` (Tailwind default 0.875rem)
        - `text-[15px]` → `text-[0.9375rem]` atau `text-sm`
        - `text-[16px]` → `text-base` (Tailwind default 1rem)
      - → Tambahkan custom sizes di `globals.css` jika diperlukan:
        ```css
        @utility text-2xs { font-size: 0.625rem; line-height: 0.875rem; }
        ```
    - [ ] **Hardcoded colors** — Warna non-semantic tersebar di Knowledge & Community pages:
      - `text-blue-500`, `bg-blue-500/10`, `border-blue-500/20` — Artikel type
      - `text-emerald-500`, `bg-emerald-500/10` — Dokumentasi type
      - `text-rose-500`, `bg-rose-500/10` — Video type
      - `text-amber-500`, `bg-amber-500/10` — Toolkit type
      - `text-green-600`, `bg-green-500/10` — WhatsApp button (community detail)
      - → Pertimbangkan: buat CSS variables per kategori di `globals.css`:
        ```css
        --type-article: oklch(0.65 0.18 250);
        --type-video: oklch(0.65 0.18 15);
        ```
      - → **Atau** dokumentasikan bahwa warna ini intentional per-content-type dan tidak perlu di-tokenisasi. **Keputusan ini butuh diskusi.**
    - [ ] **Spacing inconsistency** — Review dan standarisasi:
      - Dashboard: `gap-3`, `px-4 py-3`, `-m-6`, `p-4`
      - Knowledge: `gap-4`, `px-5 py-4`
      - Community: `gap-3.5`, `p-5`
      - → Buat panduan spacing: card internal padding, section gaps, page padding.
    - [ ] **Dark mode audit** — Verifikasi semua halaman di dark mode:
      - Hardcoded `text-white` tanpa dark variant (community detail page).
      - `bg-white/10` mungkin tidak kontras di light mode.
      - → Test setiap halaman dan fix contrast issues.

---

## FASE 2: DATABASE SCHEMA & MIGRATIONS (`prisma/schema.prisma`)

- [ ] **2.0. Inisiasi Prisma**
  - [ ] Jalankan `npx prisma init` untuk membuat folder `prisma/` dan `schema.prisma`.
  - [ ] Konfigurasi `DATABASE_URL` di `.env` dengan PostgreSQL connection string.
  - [ ] Aktifkan kembali `src/lib/prisma.ts` (hapus komentar, enable singleton client).
- [ ] **2.1. Ekstensi PostGIS**
  - [ ] Tambahkan perintah raw SQL di migrasi awal untuk PostgreSQL: `CREATE EXTENSION IF NOT EXISTS postgis;`
- [ ] **2.2. Master Data Schema**
  - [ ] `enum Role { SUPERADMIN, ADMIN_KOPERASI, FIELD_OFFICER, STAKEHOLDER }`
  - [ ] Model `User` (id `cuid`, name `String`, email `String @unique`, password `String`, role `Role`, institutionId `String?`, isActive `Boolean`).
  - [ ] Model `Region` (id `String`, name `String`, level `Int` (1-Prov, 2-Kab, 3-Kec, 4-Desa), parentId `String?`).
  - [ ] Model `Institution` (id `cuid`, name `String`, type `String`, address `String`, regionId `String?`).
- [ ] **2.3. Core Entities (Petani & Lahan)**
  - [ ] Model `Farmer` (id `cuid`, nik `String @db.VarChar(16) @unique`, name `String`, gender `String`, dob `DateTime`, phone `String?`, address `String`, institutionId `String`, regionId `String`).
  - [ ] Model `LandParcel` (id `cuid`, farmerId `String`, areaPolygon `Unsupported("geometry(Polygon, 4326)")` (atau JsonB simpan lintasan/GeoJSON), areaHectares `Float`, plantingYear `Int`, ownershipStatus `String`).
- [ ] **2.4. Schema Module MVP (Training & BMP)**
  - [ ] Model `Training` (id `cuid`, topic `String`, startDate `DateTime`, endDate `DateTime`, location `String`, tutor `String`).
  - [ ] Model `TrainingAttendance` (id `cuid`, trainingId `String`, farmerId `String`, status `Boolean`).
  - [ ] Model `BmpChecklist` (id `cuid`, category `String`, indicator `String`, description `String`).
  - [ ] Model `BmpAssessment` (id `cuid`, landParcelId `String`, assessorId `String`, assessmentDate `DateTime`).
  - [ ] Model `BmpScore` (id `cuid`, assessmentId `String`, checklistId `String`, score `Int`, notes `String?`).
- [ ] **2.5. Eksekusi Migrasi & Seed**
  - [ ] Jalankan `npx prisma migrate dev --name init_core`
  - [ ] Buat script `/prisma/seed.ts` berisi `await prisma.user.create(...)` untuk SuperAdmin.
  - [ ] Konfigurasi `package.json`: `"prisma": { "seed": "ts-node prisma/seed.ts" }`.

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
│   │   ├── layout.tsx                          # Admin shell (sidebar + header + breadcrumb)
│   │   └── admin/
│   │       ├── dashboard/
│   │       │   ├── page.tsx                    # Basic Data Dashboard (fungsional)
│   │       │   └── workplan/page.tsx           # Placeholder
│   │       ├── master-data/
│   │       │   ├── farmers/page.tsx            # Placeholder
│   │       │   ├── groups/page.tsx             # Placeholder
│   │       │   ├── parcels/page.tsx            # Placeholder
│   │       │   └── regions/page.tsx            # Placeholder
│   │       ├── cms/
│   │       │   ├── news/page.tsx               # Placeholder
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
│   └── globals.css                             # Design tokens (oklch)
├── components/
│   ├── ui/                                     # 23 Shadcn primitives
│   ├── community/CommunityDirectoryClient.tsx  # Client component
│   ├── knowledge/KnowledgeDirectoryClient.tsx  # Client component
│   ├── maps/ProfileMiniMap.tsx                 # Mini map for detail pages
│   ├── auth/login-form.tsx                     # Login form component
│   ├── layout/
│   │   ├── PlaceholderPage.tsx                 # Generic placeholder
│   │   ├── admin/                              # (Kosong — akan diisi di Fase 1.8)
│   │   └── public/
│   │       ├── Navbar.tsx
│   │       └── Footer.tsx
│   ├── app-sidebar.tsx                         # → Akan dipindah ke layout/admin/ (Fase 1.8)
│   ├── nav-main.tsx                            # → Akan dipindah ke layout/admin/ (Fase 1.8)
│   ├── nav-user.tsx                            # → Akan dipindah ke layout/admin/ (Fase 1.8)
│   ├── admin-header-actions.tsx                # → Akan dipindah ke layout/admin/ (Fase 1.8)
│   ├── hero-carousel.tsx                       # → Akan dipindah ke layout/public/ (Fase 1.8)
│   └── theme-provider.tsx
├── lib/
│   ├── static-data/
│   │   ├── index.ts                            # Barrel re-exports (→ akan di-refactor Fase 1.8)
│   │   ├── admin/                              # ~13 data modules + menu.tsx + menu.csv
│   │   ├── public/                             # 3 data modules (home, community, knowledge)
│   │   └── user/                               # Auth mockup data (user.csv)
│   ├── prisma.ts                               # Disabled (→ diaktifkan di Fase 2)
│   ├── map-utils.ts                            # (Akan diperkaya di Fase 1.8)
│   └── utils.ts                                # cn() helper
├── server/actions/                             # Kosong (→ diisi mulai Fase 3)
├── types/custom.d.ts                           # CSV module declaration
├── hooks/use-mobile.ts                         # Mobile breakpoint hook
└── validations/                                # Kosong (→ diisi mulai Fase 4)
```

### Status Komponen per Halaman

| Halaman | Tipe | Status | Catatan |
|---------|------|--------|---------|
| Home (`/`) | Server | ✅ Fungsional | Carousel, sections, static data |
| Community (`/community`) | SSR+Client | ✅ Fungsional | Map, filter, cards, detail page |
| Knowledge (`/knowledge-management`) | SSR+Client | ✅ Fungsional | Tabs, search, cards, detail page |
| Login (`/login`) | Server | ⚠️ UI Only | Form ada, auth action belum |
| Dashboard (`/admin/dashboard`) | Client | ✅ Fungsional | Basic Data cards, map, data CSV |
| Workplan (`/admin/dashboard/workplan`) | — | 🔲 Placeholder | Belum implementasi |
| Master Data (4 pages) | — | 🔲 Placeholder | Semua masih PlaceholderPage |
| CMS (4 pages) | — | 🔲 Placeholder | Semua masih PlaceholderPage |
| Settings (3 pages) | — | 🔲 Placeholder | Semua masih PlaceholderPage |
| Tools (3 pages) | — | 🔲 Placeholder | Semua masih PlaceholderPage |
