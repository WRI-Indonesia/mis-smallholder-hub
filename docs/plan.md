
# Smallholder HUB - Developer Guide

*Dokumen ini menjabarkan implementasi dari level arsitektur ke level kode sumber (source code) dan command eksekusi.*

## FASE 1: INITIALIZATION & ENVIRONMENT SETUP

- [x] **1.1. Inisiasi Proyek Next.js**
  - [x] Jalankan: `npx create-next-app@latest smallholder-hub --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - [x] Buat file konfigurasi `.env`, `.env.example`, `.prettierrc.json`.
- [x] **1.2. Instalasi Dependensi Inti**
  - [x] *Database & ORM*: `npm i prisma --save-dev` & `npm i @prisma/client`
  - [x] *Autentikasi*: `npm i next-auth@beta bcryptjs` & `npm i -D @types/bcryptjs`
  - [x] *Form & Validasi*: `npm i react-hook-form zod @hookform/resolvers`
  - [x] *GIS & Peta*: `npm i maplibre-gl react-map-gl @turf/turf`
  - [x] *Charts & Date*: `npm i recharts date-fns`
- [x] **1.3. Inisiasi Shadcn UI**
  - [x] Jalankan: `npx shadcn@latest init` (Pilih: Default, CSS Variables).
  - [x] Jalankan instalasi komponen wajib berulang: `npx shadcn@latest add button input form select table dialog sonner card popover calendar checkbox separator scroll-area alert badge dropdown-menu`
- [x] **1.4. Setup Folder Structure & Multi-Layout**
  - [x] Instalasi theme provider: `npm i next-themes lucide-react`.
  - [x] Setup `ThemeProvider` (Dark mode default) di `src/app/layout.tsx` / komponen global.
  - [x] Setup **Public Layout** di `src/app/(public)/layout.tsx` (dengan Navbar, menu Home, Community, Knowledge Management, & tombol Login/Theme).
  - [x] Setup **Admin Layout** di `src/app/(admin)/layout.tsx` dengan integrasi Sidebar Shadcn (`npx shadcn@latest add sidebar-07`).
  - [x] Buat direktori inti backend/utilitas: `/src/lib/`, `/src/server/actions/`, `/src/validations/`.
- [x] **1.5. Scaffolding UI Statis (Mockup)**
  - [x] Halaman `Home` publik (Hero, features, tombol toggle Dark Mode & Language (ID/EN)).
    - [x] **Revisi Layout Non-Hero**: Stats cards individual dengan ikon, region cards compact (icon+nama inline), news cards tanpa overlap (-mt-10 dihapus), partners section dengan featured partner, Activities section header split-layout.
  - [x] Halaman `Community` publik (List diskusi statis).
  - [x] Halaman `Knowledge Management` publik (Katalog modul).
  - [x] Customisasi `Sidebar Admin` (Hierarki Menu Lengkap) & Logout Redirect ke Home.
  - [x] Halaman Mockup Admin (`Dashboard Summary`, `Data Petani`, `CMS Berita`).
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
  - [ ] **Admin Pages (`src/lib/static-data/admin/`)**
    - [ ] `dashboard`: Summary stats, charts, recent activities.
    - [ ] `master-data`: Farmers (`farmers`), Groups (`groups`), Land (`parcels`), Regions (`regions`).
    - [ ] `cms`: News/Articles (`news`), Custom Pages (`pages`).
    - [ ] `geo`: Spatial map configurations (`geo`).
    - [ ] `tools`: Import logs (`import`), Export configurations (`export`).
    - [ ] `settings`: Users (`users`), Roles (`roles`), System (`system`).
- [ ] **1.7. Responsivitas Layar (Mobile Friendly)**
  - [ ] Navbar Mobile (Hamburger Menu / Shadcn Sheet).
  - [ ] Layout grid responsif untuk Halaman Home, Community, dan Knowledge Management.
  - [ ] Penyesuaian padding dan font size di layar kecil.

## FASE 2: DATABASE SCHEMA & MIGRATIONS (`prisma/schema.prisma`)

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

## FASE 3: AUTENTIKASI & LAYOUT SISTEM (ADMIN)

- [ ] **3.1. Konfigurasi NextAuth.js (Auth.js)**
  - [ ] Buat file `/src/auth.ts` (Credentials Provider dengan konfirmasi bcrypt `compareSync`).
  - [ ] Integrasikan tipe `Session` bawaan untuk memasukkan `user.role` & `user.institutionId`.
- [ ] **3.2. Middleware Proteksi**
  - [ ] Buat file `/src/middleware.ts` untuk memblokir rute `/((?!login|api|_next/static|_next/image|favicon.ico).*)` jika `!session`.
- [ ] **3.3. Halaman Login (`/src/app/login/page.tsx`)**
  - [ ] Buat `LoginForm.tsx` (Card, Input Email, Input Password, Button submit).
  - [ ] Buat action `signInWrapper.ts` untuk *Server Actions* otentikasi.
- [ ] **3.4. Layout Utama (`/src/app/(admin)/layout.tsx`)**
  - [ ] Buat `<Sidebar />`: Menu dinamis berdasarkan role (SuperAdmin liat semua, Admin Koperasi tidak lihat menu Settings).
  - [x] Buat `<Header />`: Render breadcrumb otomatis (`usePathname`) dan User Menu Dropdown (panggil `signOut`), beserta integrasi Theme & Language toggle.

## FASE 4: MASTER DATA MANAGEMENT (CRUD LENGKAP)

- [ ] **4.1. Manajemen Region (Wilayah)**
  - [ ] Buat file validasi `/src/validations/region.schema.ts` (Zod Object).
  - [ ] Buat Actions `/src/server/actions/region.ts`: `getRegions`, `createRegion`, `updateRegion`, `deleteRegion`.
  - [ ] UI List Region: `/src/app/(admin)/master/regions/page.tsx` memakai Shadcn Data Table.
- [ ] **4.2. Manajemen Institusi / Koperasi**
  - [ ] Buat form modal `DialogInstitutionForm` memakai `useForm` zod.
  - [ ] UI Daftar Institusi: `/src/app/(admin)/master/institutions/page.tsx`.
- [ ] **4.3. Manajemen User (Akses & Hak Akses)**
  - [ ] UI List User dengan kolom: Nama, Email, Role, Koperasi, Aksi (Edit/Reset Password).
  - [ ] Server Action: `createUser` memuat ekstra hash bcrypt untuk password baru.

## FASE 5: CORE ENTITY - PETANI & LAHAN

- [ ] **5.1. Domain: Farmer**
  - [ ] `/src/validations/farmer.schema.ts` (Pastikan validator regex untuk NIK Indonesia 16 angka).
  - [ ] Halaman `/src/app/(admin)/farmers/page.tsx`: Tabel petani (*server-side pagination* dengan Prisma `take` & `skip`).
  - [ ] Form Petani `/src/app/(admin)/farmers/new/page.tsx` memuat dependent dropdown (Pilih Provinsi -> Load Kabupaten -> Load Kec...).
- [ ] **5.2. Domain: Land Parcel (Peta MapLibre)**
  - [ ] Buat `<MapViewer />` di `/src/components/map/MapViewer.tsx` (Inisialisasi `Map` maplibre-gl).
  - [ ] Buat `<DrawControl />` di `/src/components/map/DrawControl.tsx` menggunakan ekstensi Mapbox Draw.
  - [ ] Kalkulasi luas poligon secara real-time di UI menggunakan library `@turf/area(polygon)`.
  - [ ] Actions: `saveLandParcel` (Konversi hasil poligon koordinat Array ke WKT/Raw query Prisma PostGIS atau field JsonB).
  - [ ] Halaman GIS Universal: `/src/app/(admin)/maps/page.tsx` memuat source GeoJSON keseluruhan dan di-render sebagai `FillLayer` (Maplibre).

## FASE 6: MVP MODULES (DASHBOARD, TRAINING, BMP)

- [ ] **6.1. Modul Training**
  - [ ] Skema Zod `TrainingForm`.
  - [ ] UI List Pelatihan: `/src/app/(admin)/trainings/page.tsx`.
  - [ ] Detail Pelatihan & Presensi: Halaman dinamis `/src/app/(admin)/trainings/[id]/page.tsx`.
  - [ ] Modal Attendance: Memilih petani spesifik dari `<Select>` autocomplete (Debounce text input -> fetch petani) dan menyimpan baris presensi massal (Prisma `createMany`).
- [ ] **6.2. Modul BMP (Best Management Practices)**
  - [ ] UI Admin Master Checklist (`/admin/bmp/master`): *Drag-and-drop* reorder indikator pertanyaan.
  - [ ] UI Field Officer Assessment (`/admin/bmp/assessment/new`): Memilih Lahan, merender iterasi list pertanyaan BMP, form checkbox/radio button per poin.
  - [ ] Server Action pembungkus `prisma.$transaction([])` untuk menyimpan skor penilaian sekaligus.
- [ ] **6.3. Dashboard Analitik (Landing Admin)**
  - [ ] API Fetcher: `getDashboardStats()` menggunakan `prisma.$count` dan agregasi luas.
  - [x] `<StatCard />` untuk metrik: Jumlah Petani, Luas Total Lahan Terdaftar (Sum Ha), Jumlah Koperasi (Desain UI Selesai & Compact).
  - [ ] `<BarChart />` (Recharts) memvisualisasikan `Petani terdaftar per bulan berjalan`.

## FASE 7: PASCA-MVP LAYER 1 (HCV, HSE, GHG)

- [ ] **7.1. HCV (High Conservation Value)**
  - [ ] DB: `HcvZone` (name, status, polygon).
  - [ ] Interseksi Peta: Server Action menggunakan Query Raw PostGIS `ST_Intersects(land.polygon, hcv.polygon)` untuk deteksi dini saat pendaftaran lahan.
- [ ] **7.2. HSE & Insident**
  - [ ] DB & Form `AccidentReport` (LandParcelId, Date, Keterangan).
- [ ] **7.3. GHG Emission (Emisi GRK)**
  - [ ] UI Kalkulator: Form input bahan kimia pertahun (Urea, Listrik, Solar).
  - [ ] Server Action perhitungan konstanta emisi CO2-eq dan simpan ke DB `GhgCalculationLog`.

## FASE 8: PASCA-MVP LAYER 2 (SUPPLY CHAIN & FINANCE)

- [ ] **8.1. Traceability / Rantai Pasok**
  - [ ] DB `HarvestTransaction`: (farmerId, harvestDate, weightKg, pricePerKg, buyerId).
  - [ ] UI Surat Pengantar Buah (DO) dengan format bisa diprint.
  - [ ] API Integrasi QR Code: Generate QR berisi detail URL panen.
- [ ] **8.2. Akses Finansial**
  - [ ] Algoritma Credit Scoring: Action API mengkalkulasi skor kelayakan pinjam berdasarkan rata-rata panen & BMP.

## FASE 9: PASCA-MVP LAYER 3 (CERTIFICATION & PROJECT MANAGEMENT)

- [ ] **9.1. Sertifikasi**
  - [ ] Fitur Upload Dokumen Legal: Integrasi storage bucket (contoh AWS S3/Supabase Storage/R2).
  - [ ] Simpan direktori URL file ke tabel `FarmerDocument` (id, url, documentType).
- [ ] **9.2. Workplan/Gantt Chart**
  - [ ] Integrasi library *Gantt Chart* atau *FullCalendar* untuk jadwal Field Officer.

## FASE 10: INTEGRASI GIS EKSTERNAL & PUBLIKASI (PUBLIC PAGES)

- [ ] **10.1. Layer WMS Eksternal**
  - [ ] Integrasi layer tile WMS dari Hutan Global ke `MapViewer.tsx` (Maplibre `RasterLayer`).
- [ ] **10.2. Generic Form Builder (Opsional)**
  - [ ] DB struktur JsonB: Tabel `DynamicFormTemplate`.
- [x] **10.3. Public Website (`/src/app/(public)/`)**
  - [x] `page.tsx`: Hero section carousel + semua section non-hero (Community, Activities, Partners) dengan layout yang diperbaiki.
  - [ ] `community/page.tsx`: Fetch Next.js SSR konten pelatihan publik.
  - [ ] Setup *Service Worker* dan file `manifest.json` untuk membuat PWA installable.
