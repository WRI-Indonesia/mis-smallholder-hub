# Smallholder HUB Management Information System (MIS)

> Enterprise-grade web application untuk manajemen data petani smallholder, kelompok tani, lahan, pelatihan, dan produksi kelapa sawit berkelanjutan.

**Developed for**: WRI Indonesia  
**Tech Stack**: Next.js 16 · React 19 · TypeScript · Tailwind 4 · Shadcn UI · Prisma 7 · PostgreSQL + PostGIS  
**Status**: ✅ Production-Ready (Core Modules Complete)

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

---

## 📦 Features

### ✅ Implemented Modules

#### 🔐 Authentication & Authorization
- NextAuth.js credentials-based authentication
- 4 Role levels: SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT

- Fine-grained permission matrix (CREATE, VIEW, EDIT, DELETE per menu)
- Data access control (Province → District → Farmer Group hierarchy)
- User-specific permission overrides (grant/revoke per menu)

#### 👥 User Management
- CRUD operations for users
- Role assignment with permission templates
- Data access assignment (Province/District/Farmer Group)
- Menu permission overrides per user
- Soft-delete with audit trail

#### 🗺️ Geography & Regions (MD-01)
- 4-level hierarchy: Province → District → Subdistrict → Village
- Tree-based navigation UI
- BPS (Badan Pusat Statistik) standard codes
- CRUD with cascade validation

#### 🌾 Farmer Groups (MD-02)
- Farmer group master data (Kelompok Tani)
- Category: EX_PLASMA / SWADAYA
- Location coordinates (lat/long)
- District-based filtering with RBAC

#### 👨‍🌾 Farmers (MD-03)
- Farmer demographics (name, NIK, gender, birth date/place)
- Farmer ID system (internal tracking)
- Joined year tracking
- Bulk upload via Excel (dynamic column mapping)
- RBAC data access filtering

#### 🗺️ Land Parcels (MD-04)
- Geospatial land parcel tracking
- GeoJSON polygon geometry storage
- Area calculation (hectares)
- Land status, crop type, planting year
- Revision tracking for updates
- Bulk upload via Shapefile (ZIP)
- Interactive map viewer (MapLibre GL JS)

#### 📚 Training (MD-05)
- 5 Training package categories (PAKET 1-4, OTHER)
- Training activity management per Farmer Group
- Participant tracking (many-to-many Farmer ↔ Activity)
- Evidence upload to S3 (PDF documents)
- Attendance management

#### 🌱 Production (MD-06)
- Production record tracking per farmer/parcel
- Period-based recording (YYYY-MM)
- Harvest number (max 4 per month)
- Yield tracking (kg)
- Optional parcel assignment
- Bulk upload via Excel

#### 📤 Bulk Upload System
- **Farmers**: Excel upload with smart column mapping, validation, preview
- **Land Parcels**: Shapefile ZIP upload with geometry validation
- **Production**: Excel upload with period and duplicate validation
- Error reporting with downloadable error rows

#### ⚙️ Settings
- Dynamic menu management (3-level hierarchy)
- Role permission matrix configuration
- Region hierarchy management
- User management with data access

---

## 🏗️ Architecture

### Tech Stack

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

### Project Structure

```
src/
├── app/
│   ├── (admin)/admin/        # Protected admin routes
│   │   ├── dashboard/        # Dashboard (placeholder)
│   │   ├── master-data/      # Farmers, Groups, Parcels, Training, Production
│   │   ├── bulk-upload/      # Bulk import features
│   │   ├── settings/         # Users, Roles, Menu, Regions
│   │   └── profile/          # User profile & password
│   ├── (public)/             # Public routes (home, login)
│   └── api/auth/             # NextAuth API routes
├── components/
│   ├── ui/                   # Shadcn UI primitives
│   ├── shared/               # Reusable components (DataTable, DeleteDialog)
│   ├── layout/               # Admin & public layouts
│   └── auth/                 # Auth-related components
├── lib/                      # Utilities, Prisma client, RBAC helpers
├── server/actions/           # Server Actions (16 files, 2433 LOC)
├── validations/              # Zod schemas (8 files)
├── types/                    # TypeScript types
├── hooks/                    # React hooks
└── test/                     # Test files (18 files, 208 tests)

prisma/
├── schema/                   # Modular Prisma schema files
├── migrations/               # Database migrations
└── seeds/                    # Seed data

docs/                         # Documentation
├── documentation_plan.md     # Docmost documentation plan
├── database-schema.md        # ERD, indexes, constraints
├── progress.md               # Phase status & roadmap
├── rule.md                   # Development rules & standards
├── ui-ux-flow.md             # Navigation flows per role
├── general-rule.md           # Behavioral coding principles
└── audit-2026-06-23.md       # Latest comprehensive audit
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

**Test Coverage**: ✅ 18 files, 208 tests, ALL PASSING

Coverage includes:
- Authentication & RBAC (auth, rbac, rbac-permission)
- User Management (user actions, data access, menu access)
- Master Data modules (farmer, land-parcel, training, production)
- Regions & Menu
- Bulk Upload
- Report & Data Analyst
- Middleware & Performance

---

## 🔒 Security Features

- ✅ Role-Based Access Control (RBAC) with 4 levels
- ✅ Data access control (Province/District/Farmer Group scope)
- ✅ Permission override per user per menu
- ✅ Backend validation on all mutations
- ✅ Soft-delete (never hard delete from app)
- ✅ Audit trail on all tables (created_at/by, modified_at/by)
- ✅ NextAuth.js session management
- ✅ Security scans in CI (Gitleaks, Semgrep)

---

## 📊 Database Schema

- **18 Models** total
- **Geography**: Province, District, Subdistrict, Village (4-level hierarchy)
- **RBAC**: User, RolePermission, UserProvince, UserDistrict, UserFarmerGroup, UserPermissionOverride
- **Master Data**: FarmerGroup, Farmer, LandParcel, TrainingPackage, TrainingActivity, TrainingParticipant, ProductionRecord
- **Menu**: MenuItem (3-level recursive hierarchy)

**Patterns Applied**:
- Soft delete (`isActive` field on all tables)
- Audit trail (`created_at`, `created_by`, `modified_at`, `modified_by`)
- CUID primary keys
- Proper foreign key constraints
- Secondary indexes for performance

See [docs/database-schema.md](./docs/database-schema.md) for full ERD and details.

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [documentation_plan.md](./docs/documentation_plan.md) | Docmost 2-space structure (Developer + User Manual) |
| [database-schema.md](./docs/database-schema.md) | ERD, indexes, migrations, constraints |
| [progress.md](./docs/progress.md) | Phase status, roadmap, management brief |
| [rule.md](./docs/rule.md) | Development rules & coding standards |
| [ui-ux-flow.md](./docs/ui-ux-flow.md) | Navigation flows per role |
| [audit-2026-06-23.md](./docs/audit-2026-06-23.md) | Latest comprehensive audit report |

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
npm run pdf:cleanup    # Cleanup old PDF files
```

---

## 🚧 Roadmap

### ✅ Completed (18 phases)
- Platform foundation (auth, RBAC, menu, user management)
- All master data modules (Regions, Groups, Farmers, Parcels, Training, Production)
- Bulk upload system (Farmers, Parcels, Production)
- **DA-01**: Data Analyst (Farmer Summary)
- **RPT-01**: Report Petani (summary + detail, Excel/PDF export)
- **RPT-02**: Report Pelatihan (2 tab, Excel 2-sheet + PDF export)

### 🔲 In Progress (Priority)
- **RPT-03**: Report Produksi (#109) — **P1**, siap dikerjakan (extend `report.ts` + `/admin/report/production`)
- **DASH-01**: Dashboard Basic (summary cards + filters) — **P0**, blocking on scope agreement

### 🔲 Planned
- DASH-02: Dashboard Server Actions
- DASH-03: Interactive Map Dashboard
- DASH-04: (blocked — waits DASH-01/02)
- BULK-02: Bulk Upload Region
- MD-07 to MD-11: Staff, HCV, BUSDEV, IMPACT, Workplan modules
- CMS-01: Content Management System
- COMM-01/02: Community & i18n

See [docs/progress.md](./docs/progress.md) for detailed status.

---

## 👥 Contributing

Please read [docs/rule.md](./docs/rule.md) for development standards and workflow.

### Branching Strategy
- Single active branch (determined by project owner)
- No feature/experiment branches

### Workflow
1. Pick approved GitHub Issue
2. Implement **only** the issue scope
3. Run `npm run build` and `npm test` locally
4. Performance test
5. Request approval before push

---

## 📄 License

Proprietary - WRI Indonesia

---

## 📞 Contact

Project Owner: WRI Indonesia  
Tech Lead: [Add contact info]

---

**Last Updated**: 2026-07-08  
**Version**: 0.1.0  
**Status**: Production-Ready (Core Modules)
