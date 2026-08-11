# Smallholder HUB Management Information System (MIS)

> Enterprise-grade web application untuk manajemen data petani smallholder, kelompok tani, lahan, pelatihan, dan produksi kelapa sawit berkelanjutan.

**Developed for**: WRI Indonesia  
**Tech Stack**: Next.js 16 · React 19 · TypeScript · Tailwind 4 · Shadcn UI · Prisma 7 · PostgreSQL + PostGIS  
**Status**: ✅ In Production (v0.24.0 — all core modules, dashboards, maps, reports & help live)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ & npm
- PostgreSQL 16+ with PostGIS extension
- AWS S3 (optional, for file uploads)

### Installation

```bash
# Clone repository
git clone https://github.com/WRI-Indonesia/mis-smallholder-hub.git
cd mis-smallholder-hub

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env dengan konfigurasi database dan S3

# Setup database
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Default credentials (seeded):
- Email: `admin@example.com`
- Password: `password123`

> ⚠️ `prisma db seed` hanya untuk database **kosong/baru** — jangan jalankan di database yang sudah berisi data.

---

## 📦 Features

Semua modul di bawah sudah live di produksi. Klik tiap modul untuk rincian.

<details>
<summary><strong>🔐 Authentication & Authorization</strong> — NextAuth + RBAC 3 lapis</summary>

- NextAuth.js credentials-based authentication
- 5 Role levels: SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT, DONOR (view-only)
- Fine-grained permission matrix (CREATE, VIEW, EDIT, DELETE per menu)
- Data access control (Province → District → Farmer Group hierarchy)
- User-specific permission overrides (grant/revoke per menu)

</details>

<details>
<summary><strong>👥 User Management</strong> — CRUD user, role, data access</summary>

- CRUD operations for users
- Role assignment with permission templates
- Data access assignment (Province/District/Farmer Group)
- Menu permission overrides per user
- Soft-delete with audit trail

</details>

<details>
<summary><strong>🗺️ Geography & Regions (MD-01)</strong> — hierarki 4 level, kode BPS</summary>

- 4-level hierarchy: Province → District → Subdistrict → Village
- Tree-based navigation UI
- BPS (Badan Pusat Statistik) standard codes
- CRUD with cascade validation

</details>

<details>
<summary><strong>🌾 Farmer Groups (MD-02)</strong> — Lembaga Petani + sertifikasi + profil 360°</summary>

- Farmer group master data (Lembaga Petani)
- Category: EX_PLASMA / SWADAYA; group type (Asosiasi/Koperasi)
- RSPO / ISPO / SAP-MAP certification tracking
- 360° detail page with tabs (Ringkasan/Petani/Lahan/Pelatihan/Produksi)
- Location coordinates (lat/long)
- District-based filtering with RBAC

</details>

<details>
<summary><strong>👨‍🌾 Farmers (MD-03)</strong> — demografi, profil 360°, sensor NIK</summary>

- Farmer demographics (name, NIK, gender, birth date/place)
- Farmer ID system (internal tracking)
- 360° detail page with tabs (Lahan/Pelatihan/Produksi) + profile-completeness card
- NIK & birth-date masking on screen
- Bulk upload via Excel (dynamic column mapping)
- RBAC data access filtering

</details>

<details>
<summary><strong>🗺️ Land Parcels (MD-04)</strong> — geospasial, revisi, pohon sawit</summary>

- Geospatial land parcel tracking (GeoJSON polygon geometry)
- Area calculation (hectares); land status, crop type, planting year
- Revision tracking for updates
- Bulk upload via Shapefile (ZIP)
- Oil-palm tree points (`Tree` model): bulk upload via point Shapefile, shown on parcel/farmer maps
- Interactive map viewer (MapLibre GL JS)

</details>

<details>
<summary><strong>📚 Training (MD-05)</strong> — paket, kegiatan, peserta, pre/post-test</summary>

- 5 Training package categories (PAKET 1-4, OTHER)
- Training activity management per Farmer Group
- Participant tracking (many-to-many Farmer ↔ Activity) with pre/post-test scores
- Evidence upload to S3 (PDF documents)
- Attendance management

</details>

<details>
<summary><strong>🌱 Production (MD-06)</strong> — rekaman panen per petani/lahan</summary>

- Production record tracking per farmer/parcel
- Period-based recording (YYYY-MM); harvest number (max 4 per month)
- Yield tracking (kg); optional parcel assignment
- Bulk upload via Excel

</details>

<details>
<summary><strong>📤 Bulk Upload System</strong> — Excel & Shapefile dengan preview + error rows</summary>

- **Farmers**: Excel upload with smart column mapping, validation, preview
- **Land Parcels**: Shapefile ZIP upload with geometry validation
- **Trees**: point Shapefile ZIP upload (oil-palm tree points per parcel)
- **Production**: Excel upload with period and duplicate validation
- Error reporting with downloadable error rows

</details>

<details>
<summary><strong>📈 Dashboards (DASH-01…06)</strong> — Main, BMP (Produksi), Pelatihan</summary>

- **Main Dashboard**: 14 summary cards (incl. RSPO/ISPO/SAP-MAP certification), filters, clustered map — snapshot-backed
- **BMP Dashboard (Produksi)**: productivity (Ton/Ha), production trends, Ex-Plasma vs Swadaya, plant-age analysis — snapshot-backed
- **Dashboard Pelatihan**: training coverage KPIs, Lembaga × Paket coverage matrix with drill-down to untrained farmers — live query

</details>

<details>
<summary><strong>🗺️ Map Explorer (MAP-01…03)</strong> — Peta Lahan, hotspot FIRMS, Peta BMP</summary>

- **Peta Lahan**: full-bleed interactive map (parcels, farmer-group points, labels), production popup, ruler tool
- Reference overlays (Kawasan Hutan, Fungsi Ekosistem Gambut), custom WMS/Shapefile/GeoJSON layers
- **Titik Api (Hotspot)**: NASA FIRMS VIIRS layer, rolling 24-h/5-day window, confidence breakdown, SHP/PDF export with nearest-Lembaga proximity summary
- **Peta BMP**: thematic layers for production data availability & productivity per parcel, PDF/Excel print

</details>

<details>
<summary><strong>📑 Reports (RPT-01…05)</strong> — 5 laporan, export Excel/PDF</summary>

- **Petani**, **Pelatihan**, **Produksi** (monthly matrix), **Kelompok Tani** (summary + detail roster), **Lahan** (flat roster + map-atlas PDF with flexible grid index)
- All with Excel export; most with PDF export

</details>

<details>
<summary><strong>📊 Data Analyst (DA-01…03, DA-06)</strong> — analitik & skor ketersediaan data</summary>

- **Farmer Summary** analytics with Excel export
- **Analisa Ketersediaan Data KT**: per-Lembaga completeness scoring (5 domains, anomaly lists, health score)
- **Dashboard Ketersediaan Data**: portfolio roll-up across Lembaga (score matrix, top anomalies)
- **Komparasi Data Acuan**: manual benchmark (MD 1st SOW) vs live MIS aggregates per Lembaga — Δ matrix, drill-down, inline entry, Excel export

</details>

<details>
<summary><strong>❓ Bantuan (HELP-01/02)</strong> — pusat bantuan in-app berbasis tugas</summary>

- In-app help center (`/admin/help`): 29 task-based tutorials covering all 31 admin menus, two depth levels (Ringkas/Detail), concept & reference pages, client-side search
- Markdown content in `src/content/help/` with a dependency-free parser; contextual `?` hints (HelpHint) across list pages and full-screen maps

</details>

<details>
<summary><strong>⚙️ Settings & Tools</strong> — menu dinamis, permission matrix, snapshot</summary>

- Dynamic menu management (3-level hierarchy)
- Role permission matrix configuration
- Region hierarchy management
- User management with data access
- Dashboard snapshot tools (generate/list/detail, Main & BMP)

</details>

---

## 🏗️ Architecture

<details>
<summary><strong>Tech Stack</strong> — layer per layer</summary>

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16 (App Router) | Server-side rendering, React Server Components |
| **UI Framework** | React 19 | Latest React features, RSC, Suspense |
| **Styling** | Tailwind CSS 4 + oklch | Utility-first CSS with modern color system |
| **Components** | Shadcn UI | Accessible, customizable component library |
| **Forms** | React Hook Form + Zod | Type-safe validation |
| **Database** | PostgreSQL 16 + PostGIS | Relational DB with geospatial extension |
| **ORM** | Prisma 7 | Type-safe database access |
| **Auth** | NextAuth.js v5 | Session-based authentication |
| **File Upload** | AWS S3 + presigned URLs | Secure file storage |
| **Maps** | MapLibre GL JS | Open-source map rendering |
| **Charts** | Recharts | Data visualization |
| **Testing** | Vitest + Testing Library | Unit & integration tests |

</details>

<details>
<summary><strong>Project Structure</strong> — direktori utama</summary>

```
src/
├── app/
│   ├── (admin)/admin/        # Protected admin routes
│   │   ├── dashboard/        # Main, BMP (Produksi), Pelatihan dashboards
│   │   ├── master-data/      # Farmers, Groups, Parcels, Training, Production
│   │   ├── map/              # Map Explorer (Peta Lahan, Peta BMP)
│   │   ├── report/           # Reports (Petani, Pelatihan, Produksi, KT, Lahan)
│   │   ├── data-analyst/     # Farmer Summary, Ketersediaan Data
│   │   ├── bulk-upload/      # Bulk import features
│   │   ├── tools/            # Dashboard snapshot tools
│   │   ├── help/             # Bantuan (in-app help center)
│   │   ├── settings/         # Users, Roles, Menu, Regions
│   │   └── profile/          # User profile & password
│   ├── (public)/             # Public routes (home, login)
│   └── api/                  # NextAuth, map overlay/hotspot proxies
├── components/
│   ├── ui/                   # Shadcn UI primitives
│   ├── shared/               # Reusable components (DataTable, DeleteDialog)
│   ├── layout/               # Admin & public layouts
│   └── auth/                 # Auth-related components
├── content/help/             # Bantuan content (Markdown)
├── lib/                      # Utilities, Prisma client, RBAC helpers, pure aggregation/report libs
├── server/actions/           # Server Actions (29 files)
├── validations/              # Zod schemas (14 files)
├── types/                    # TypeScript types
├── hooks/                    # React hooks
└── test/                     # Test files (53 files, 839 tests)

prisma/
├── schema/                   # Modular Prisma schema files
├── migrations/               # Database migrations
└── seeds/                    # Seed data

docs/                         # Documentation (atomic, foldered — see docs/README.md)
├── README.md                 # Docs index
├── standards/                # Dev rules, code standards, RBAC, UI/UX, architecture
├── database/                 # ERD, models, indexes, constraints, migrations, security, perf
├── product/                  # UI/UX flows per role, access context, CRUD/bulk flows
└── project/                  # Roadmap, sprint, tech-debt, changelog, contributing
```

</details>

<details>
<summary><strong>🔒 Security</strong> — RBAC, soft delete, audit trail</summary>

- ✅ Role-Based Access Control (RBAC) with 5 roles
- ✅ Data access control (Province/District/Farmer Group scope)
- ✅ Permission override per user per menu
- ✅ Backend validation on all mutations
- ✅ Soft-delete (never hard delete from app)
- ✅ Audit trail on all tables (created_at/by, modified_at/by)
- ✅ NextAuth.js session management
- ✅ Security scans in CI (Gitleaks, Semgrep)

</details>

<details>
<summary><strong>📊 Database Schema</strong> — 21 models, pola audit & soft delete</summary>

- **22 Models** total
- **Geography**: Province, District, Subdistrict, Village (4-level hierarchy)
- **RBAC**: User, RolePermission, UserProvince, UserDistrict, UserFarmerGroup, UserPermissionOverride
- **Master Data**: FarmerGroup, Farmer, LandParcel, Tree, TrainingPackage, TrainingActivity, TrainingParticipant, ProductionRecord
- **Dashboard**: MainDashboardSnapshot, BmpDashboardSnapshot
- **Menu**: MenuItem (3-level recursive hierarchy)

**Patterns Applied**:
- Soft delete (`isActive` field on all tables)
- Audit trail (`created_at`, `created_by`, `modified_at`, `modified_by`)
- CUID primary keys
- Proper foreign key constraints
- Secondary indexes for performance

See [docs/database/erd.md](./docs/database/erd.md) for full ERD and details.

</details>

<details>
<summary><strong>🧪 Testing</strong> — 53 files / 839 tests, all passing</summary>

```bash
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
```

**Test Coverage**: ✅ 53 files, 839 tests, ALL PASSING (verified 2026-08-11)

Coverage includes:
- Authentication & RBAC (auth, rbac, rbac-permission, server guards, access context)
- User Management (user actions, data access, menu access)
- Master Data modules (farmer, farmer group, land-parcel, training, production — incl. 360° detail pages)
- Regions & Menu (actions, filter, tree)
- Bulk Upload (Excel, Shapefile parcel/tree mapping)
- Reports (Petani, Pelatihan, Produksi, Kelompok Tani, Lahan — incl. PDF/Excel exporters)
- Dashboards (Main, BMP, Pelatihan, Ketersediaan Data, cross-dashboard invariants)
- Data Analyst & Data Completeness
- Map (map data, geo helpers, FIRMS hotspot client + route integration)
- Bantuan (markdown parser, content guards)
- Middleware & Performance

</details>

---

## 🛠️ Development Commands

```bash
# Development
npm run dev            # Start dev server (localhost:3000)
npm run build          # Production build
npm start              # Start production server
npm run lint           # Run ESLint

# Database
npx prisma migrate dev # Create & apply migration
npx prisma db seed     # Seed database with initial data
npx prisma studio      # Open Prisma Studio (DB GUI)

# Testing
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode

# Utilities
npm run s3:get-link    # Generate presigned S3 URLs
npm run pdf:list       # List PDF files in S3
npm run pdf:manage     # Manage PDF files in S3
```

---

## 🚧 Roadmap

<details>
<summary><strong>Status ringkas</strong> — completed · next · later (detail di <code>docs/project/roadmap.md</code>)</summary>

### ✅ Completed
- Platform foundation (auth, RBAC 5 roles, dynamic 3-level menu, user management)
- All master data modules (Regions, Groups, Farmers, Parcels + Trees, Training, Production)
- Bulk upload system (Farmers & Production via Excel, Parcels & Trees via Shapefile)
- **DASH-01…06**: Dashboards (Main, BMP/Produksi, Pelatihan) + snapshot tooling
- **MAP-01…03**: Map Explorer (Peta Lahan + hotspot/overlays, Peta BMP 2 thematic layers)
- **RPT-01…05**: Reports (Petani, Pelatihan, Produksi, Kelompok Tani, Lahan) with Excel/PDF export
- **DA-01…03, 06**: Data Analyst (Farmer Summary, Analisa Ketersediaan Data, Dashboard Ketersediaan Data, Komparasi Data Acuan)
- **HELP-01/02**: Bantuan — in-app help center with task-based tutorials
- **OPS-01**: Testing (53 files / 839 tests)

### 🔲 Next
- **BULK-02**: Bulk Upload Region (#70) + Bulk Upload Kelompok Tani (#69)
- **OPS-02**: DevOps hardening — env matrix & rollback verification (#232)

### 🔲 Planned (Later)
- MD-07 to MD-11: Staff, HCV, BUSDEV, IMPACT, Workplan modules
- CMS-01: Content Management System
- COMM-01/02: Community & i18n

</details>

See [docs/project/roadmap.md](./docs/project/roadmap.md) — **source of truth** untuk status per phase.

---

## 📖 Documentation

Full index: **[docs/README.md](./docs/README.md)**.

| Area | Purpose |
|------|---------|
| [docs/standards/](./docs/standards/) | Development rules, code standards, RBAC, UI/UX, architecture |
| [docs/database/](./docs/database/) | ERD, models, indexes, migrations, constraints, security, performance |
| [docs/product/](./docs/product/) | Navigation flows per role, access context, CRUD/bulk flows |
| [docs/project/](./docs/project/) | Roadmap & phase status, sprint, tech-debt, changelog, contributing |

---

## 👥 Contributing

Please read [docs/standards/](./docs/standards/) for development standards and workflow, and [docs/project/contributing.md](./docs/project/contributing.md) for the contribution guide.

<details>
<summary><strong>Branching & Workflow</strong></summary>

### Branching Strategy
- Single active branch (determined by project owner)
- No feature/experiment branches

### Workflow
1. Pick approved GitHub Issue
2. Implement **only** the issue scope
3. Run `npm run build` and `npm test` locally
4. Performance test
5. Request approval before push

</details>

---

## 📄 License

Proprietary - WRI Indonesia

---

## 📞 Contact

Project Owner: WRI Indonesia  
Tech Lead: [Add contact info]

---

**Last Updated**: 2026-08-11  
**Version**: 0.24.0  
**Status**: Production (mis-prod live)
