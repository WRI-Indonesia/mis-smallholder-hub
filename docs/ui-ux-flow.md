# Smallholder HUB — UI/UX Flow

> Dokumentasi alur navigasi dan user journey berdasarkan role.
> **Last updated**: 2026-07-11 (**MAP-01 Produksi Peta & PDF (#134) + Panel Daftar Lahan (#135)**: popup Peta Lahan pakai produksi asli per-lahan + selektor Rata-rata/tahun; Farm Passport PDF → matriks tahun×bulan×Total & rebrand "Profil Lahan"; panel kanan daftar lahan (search + zoom); legenda collapsible; fix popup refresh + dedup fetch produksi; test 24 file/311; tech debt #136. Sebelumnya **Audit menyeluruh 2026-07-10**: sinkronisasi angka test (24 file/296), status fase (24 Done), menu aktual (Bulk Upload Produksi ✅, Tools = Dashboard Snapshot + CLI lokal), koreksi klaim compliance, dan **penghapusan blok legacy duplikat** di bagian bawah dokumen — detail temuan di `audit-report/audit-2026-07-10.md` (internal, gitignored). Sebelumnya: MAP-01 enhancement — Map › Peta Lahan: **layer Titik Api/Hotspot NASA FIRMS** (24 jam/5 hari, bbox Riau, proxy auth-guarded) + **tool Ruler** (jarak & luas geodesik) + **label nama KT & petani** (petani hanya bila muat di poligon); 2026-07-09: MAP-01 #113 — peta interaktif + info popup accordion + Farm Passport PDF + section "Peta Lainnya" overlay referensi SIGAP KLHK + section "Tambah Data GIS Lain" WMS/Shapefile/GeoJSON)

---

## Quick Reference

| Category | Status | Details |
|----------|--------|---------|
| **Test Status** | ✅ **24 files / 311 tests passing** | Coverage: auth, RBAC, menu, menu-filter, user, region, farmer, land parcel, training, production, bulk upload, report, dashboard, data-analyst, data-completeness, map, map-geo, firms, middleware, perf |
| **Completed Modules** | ✅ **24 phases done** | Platform (1-7), MD (1-6), DASH-01/02/03, RPT-01/02, BULK (1, 3, 4), DA-01/02, MAP-01 |
| **Server Actions** | ✅ 22 file (3.894 LOC) | dashboard, snapshot, report, map, user, user-data-access, user-menu-access, menu, region, role-permission, farmer-group, farmer, land-parcel, bulk-upload, bulk-upload-parcel, bulk-upload-production, training, production, upload, profile, data-analyst, data-completeness |
| **Prisma Models** | ✅ 11 file schema / **19 model** | User, Menu, RBAC (5 model), Geography (4), FarmerGroup, Farmer, LandParcel, Training (3), ProductionRecord, MainDashboardSnapshot — MAP-01 read-only (no new table) |
| **Priority Next** | 🎯 **Remediasi audit P0** | P0: guard/scope RBAC server actions + lint merah (audit 2026-07-10, #126/#127) — RPT-03 Report Produksi (#132) ✅ selesai |

---

<details open>
<summary><strong>Status Legend & Overview</strong></summary>

## Status Legend

| Symbol | Status | Keterangan |
|--------|--------|-----------|
| ✅ | Done | Implementasi selesai dan terverifikasi |
| 🟠 | Partial | Sebagian implementasi ada |
| 🔲 | Planned | Masuk roadmap tetapi belum dimulai |
| 🔴 | Blocked | Terhambat dependency atau keputusan |

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Public Routes                             │
│  ✅ Home  │  🔲 Community  │  🔲 Knowledge  │  ✅ Login      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Authentication   │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    ┌───▼───┐          ┌──────▼──────┐      ┌──────▼──────┐
    │ SUPER │          │   ADMIN     │      │  OPERATOR   │
    │ ADMIN │          │  (District) │      │  (KT-level) │
    └───┬───┘          └──────┬──────┘      └──────┬──────┘
        │                     │                     │
        ├─ Dashboard (All)    ├─ Dashboard (Filt)  ├─ Dashboard (View)
        ├─ Master Data (All)  ├─ Master Data (Filt)├─ Master Data (CRUD)
        ├─ Settings (Full)    ├─ Settings (Limited)│
        ├─ Report (All)       ├─ Report (Filtered) ├─ Report (View)
        ├─ Bulk Upload (All)  ├─ Bulk Upload (Scope)
        └─ Tools (All)        │                     │
                              │              ┌──────▼──────┐
                              │              │ MANAGEMENT  │
                              │              │ (Read-only) │
                              │              └──────┬──────┘
                              │                     │
                              │              ├─ Dashboard (View All)
                              │              └─ Report (View All)
                              │
```

</details>

---

<details>
<summary><strong>Navigation Structure & Menu Hierarchy</strong></summary>

## Admin Sidebar Menu (Compact View)

> **Perilaku sidebar:** header punya **filter pencarian menu** (input, fokus via Ctrl/⌘K, hapus via Esc/✕) yang memfilter pohon menu secara live + tombol **Tutup semua** (collapse-all). Menu induk otomatis tampil sebagai **container** bila salah satu anaknya ter-grant meski induk tak di-grant (lihat `rule.md` §RBAC Permission Inheritance). Pencarian hanya menampilkan menu sesuai hak akses user.

```
📊 Dashboard (✅ DASH-01)
   ├── ✅ Main Dashboard — Snapshot-backed: 10 summary cards (5/baris, incl. Petani L/P) + filter Distrik/KT/Tahun + peta MapLibre (cluster, label nama KT pada titik non-cluster, dark/light/hybrid, search KT, Lihat Semua) + info panel per-KT
   └── 🔲 Dashboard BMP (DASH-04) — Best Management Practice metrics

📁 Master Data
   ├── ✅ Kelompok Tani (MD-02) — List/detail/CRUD
   ├── ✅ Petani (MD-03) — List/detail/CRUD + joinedYear
   ├── ✅ Lahan / Parcels (MD-04) — Map + polygon + geolocation + Shapefile bulk upload
   ├── ✅ Pelatihan / Training (MD-05) — Activities + participants + evidence
   ├── ✅ Produksi / Production (MD-06) — Period + yield tracking
   ├── 🔲 Staff (MD-07)
   ├── 🔲 HCV (MD-08)
   ├── 🔲 BUSDEV (MD-09)
   ├── 🔲 IMPACT (MD-10)
   └── 🔲 Workplan (MD-11)

📉 Data Analyst (✅ DA-01, DA-02)
   ├── ✅ Ringkasan Petani (DA-01) — Filter distrik/KT + 2 tab (Detail Petani, Petani Tanpa Lahan) + kartu agregat + Excel export
   └── ✅ Analisa Ketersediaan Data (DA-02) — Pilih distrik → KT → Analisa: Index Ketersediaan Data + 5 section collapsible (Profil KT, Petani, Lahan, Pelatihan, Produksi) deteksi anomali & data belum lengkap (NIK kosong/invalid, petani tanpa lahan, belum pelatihan, tanpa produksi, dll) + Excel multi-sheet

📈 Report (🟠 Partial)
   ├── ✅ Laporan Petani (RPT-01) — Cascade filter (mandatory) + Excel & PDF export
   ├── ✅ Laporan Pelatihan (RPT-02) — Activities, unique participants & coverage
   └── ✅ Laporan Produksi (RPT-03) — Matriks bulanan per petani/lahan + Excel & PDF export (#132)

📤 Bulk Upload
   ├── ✅ Bulk Upload Petani (BULK-03) — Excel mapping + validation + preview
   ├── ✅ Bulk Upload Produksi (BULK-04) — Excel mapping + period/harvest validation + preview
   ├── ✅ Bulk Upload Lahan (MD-04) — ZIP Shapefile upload + column mapping + geometry validation
   ├── 🔲 Bulk Upload Kelompok Tani (#69) — CSV + validation (belum ada menu/route)
   └── 🔲 Bulk Upload Region (BULK-02, #70) — Hierarchy validation (belum ada menu/route)

⚙️ Settings
   ├── ✅ User Management (PLATFORM-04) — CRUD + data access + menu override
   ├── ✅ Role & Permission (PLATFORM-04) — Matrix C/V/E/D
   ├── ✅ Menu Management (PLATFORM-05/07) — Dynamic sidebar (3-level support)
   └── ✅ Region Settings (MD-01) — Tree hierarchy

🔧 Tools (🟠 TOOLS-01)
   ├── ✅ Dashboard Snapshot (DASH-01) — Generate/list/detail snapshot + Excel export + soft delete (satu-satunya sub-menu Tools di app)
   ├── 🟠 CLI lokal (bukan menu app): S3 get-link & PDF manager (`scripts/`, npm `s3:get-link` `pdf:*`); export CSV di `scripts/local/` (gitignored)
   └── 🔲 GIS Utilities — Planned

🗺️ Map (✅ MAP-01)
   └── ✅ Peta Lahan — Peta full-bleed MapLibre + panel filter floating collapsible (Provinsi→Distrik→KT + Muat Data, auto-collapse) + legend layer toggle (Point KT / Point centroid lahan / Area polygon lahan + count) + section **Peta Lainnya** (paling bawah panel) = overlay raster referensi SIGAP KLHK/Kemenhut (Kawasan Hutan, Pelepasan Kawasan Hutan, Fungsi Ekosistem Gambut, PIPPIB/Moratorium, Penutupan Lahan 2022) dengan toggle per-layer + slider transparansi, di-render di bawah layer data petani; tile di-proxy same-origin via `/api/map-overlay/[key]` (atasi CORS + TLS chain upstream) + section **Tambah Data GIS Lain** = user tambah layer sendiri via 3 mode (WMS URL / ZIP Shapefile / GeoJSON), Shapefile & GeoJSON diparse di browser (`shpjs`), toggle + hapus + auto-fit ke bounds layer baru; WMS user di-fetch langsung (butuh CORS). Klik feature → info popup: KT (identitas) · Lahan = accordion (Detail Lahan + Pelatihan Petani lazy-load + **Produksi data asli per-lahan** dengan **selektor Rata-rata/tahun**, grafik sumbu-Y kanan + tooltip hover) + tombol **"Profil Lahan"** → Farm Passport PDF (identitas, layout lahan/polygon, pelatihan, **produksi matriks tahun×bulan×Total**; header/file di-rebrand "Profil Lahan"). Produksi popup & PDF berbagi satu fetch (dedup). **Panel kanan Daftar Lahan** (toggle) = daftar lahan hasil Muat Data dengan **text search** (nama/ID petani/ID lahan) + tabel beraksi **zoom ke lahan** (kolom paling kiri). Legenda **collapsible**. Read-only atas FarmerGroup + LandParcel + section **Titik Api (Hotspot)** = layer NASA FIRMS VIIRS 375 m (toggle 24 jam / 5 hari, warna by kebaruan <24 jam merah / 1–5 hari oranye, popup detail + disclaimer "deteksi anomali panas", area **Riau**, tile via proxy same-origin `/api/map-hotspot` auth-guarded) + **tool Ruler** (kanan atas di bawah basemap switcher) = ukur jarak & luas **geodesik** (klik menaruh titik, label per-segmen, undo/hapus/Esc) + **label nama** (nama KT pada titik + nama petani pada poligon, **hanya bila teks muat di poligon** pada zoom aktif, wrap otomatis)

👤 Profile
   └── ✅ Change Password
```

</details>

---

<details>
<summary><strong>RBAC & Data Access Pattern</strong></summary>

## Access Context Resolution

```
User Request
    │
    ▼
┌────────────────────────┐
│ Check Role             │
└───────┬────────────────┘
        │
        ├─ SUPERADMIN → Mode: ALL (✅ Full Access, no filters)
        │
        ├─ No Assignment → Mode: ALL (✅ Unrestricted access)
        │
        ├─ UserProvince → Mode: BY_DISTRICT (🔍 Expand to all districts in province)
        │
        ├─ UserDistrict → Mode: BY_DISTRICT (🔍 Filter by assigned districts)
        │
        └─ UserFarmerGroup (only) → Mode: BY_FARMER_GROUP (🔍 Filter by specific groups)
            │
            ▼
    ┌──────────────────────┐
    │  Permission Check     │
    │  - Menu Access?       │
    │  - Required Perm?     │
    │  - Override?          │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Execute Query        │
    │  + isActive filter    │
    │  + RBAC data filter   │
    │  + Audit trail        │
    └──────────────────────┘
```

### Data Access Hierarchy Examples

| User | Role | UserProvince | UserDistrict | UserFarmerGroup | Result Access |
|------|------|--------------|--------------|-----------------|---------------|
| Ahmad | Project Leader | Riau | — | — | Semua district di Riau → semua KT |
| Erma | District Coord | — | Kampar | — | Semua KT di Kampar |
| Anissa | Facilitator | — | Kampar | KBM, Kopsa | Hanya KBM & Kopsa |
| Super Admin | SUPERADMIN | — | — | — | Semua (skip filter) |

### Permission Resolution Priority

1. **SUPERADMIN** → Grant all, skip all filters
2. **UserPermissionOverride** (Granted) → Grant
3. **UserPermissionOverride** (Revoked) → Forbid
4. **RolePermission** (default) → Check C/V/E/D
5. **No Permission** → Hide menu / Forbidden

</details>

---

<details>
<summary><strong>Master Data CRUD Flow (Standard Pattern)</strong></summary>

## Farmer CRUD Example (Applies to All Master Data)

```
User Access Module
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ List Page                                                            │
│  - Search + Filter (KT, Status, District)                           │
│  - DataTable (Pagination, Sort, Column Visibility)                  │
│  - Actions: View | Edit | Delete (based on permissions)             │
│  - Button: + Tambah (if has CREATE permission)                      │
└──────────┬──────────────────────────────────────────────────────────┘
           │
           ├─ View → Detail Page (Read-only)
           │
           ├─ Edit → Modal Form
           │   │
           │   ├─ Zod Validation (client-side)
           │   ├─ Server Action (backend permission check)
           │   ├─ Execute Query (with RBAC filter)
           │   ├─ Add Audit Trail (modified_by, modified_at)
           │   └─ Success Toast + Refresh
           │
           ├─ Delete → Soft Delete Modal
           │   │
           │   ├─ Confirmation Dialog
           │   ├─ Update isActive = false
           │   ├─ Audit Trail
           │   └─ Refresh List
           │
           └─ Create → Modal Form
               │
               ├─ Zod Validation
               ├─ Server Action (hasPermission check)
               ├─ Insert with isActive = true
               ├─ Add Audit Trail (created_by, created_at)
               └─ Success Toast + Redirect/Refresh
```

### Key Patterns

- **Client-side validation**: Zod schemas in `src/validations/`
- **Backend permission validation**: `hasPermission(menuCode, permission)` in every action
- **RBAC filtering**: `AccessContext` discriminated union (ALL | BY_DISTRICT | BY_FARMER_GROUP)
- **Soft delete**: Update `isActive = false`, never hard delete
- **Audit trail**: Auto-set `created_by`, `modified_by`, `created_at`, `modified_at`

</details>

---

<details>
<summary><strong>Bulk Upload Flow (Farmer Pattern)</strong></summary>

## Bulk Upload Farmer (✅ Implemented)

```
User Access Bulk Upload
    │
    ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 1: Select Context                                            │
│  - Choose Farmer Group (Searchable Combobox)                     │
│  - File input disabled until KT selected                          │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 2: Upload Excel File                                         │
│  - Upload .xlsx file                                              │
│  - Parse columns automatically                                    │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 3: Dynamic Column Mapping                                    │
│  - Auto-match columns (fuzzy match by name)                       │
│  - Manual override via dropdown                                   │
│  - Show preview of mapped fields                                  │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 4: Smart Validation                                          │
│  - Normalize gender (L/P → M/F)                                   │
│  - Clean NIK format (16 digits only)                              │
│  - Parse dates (Excel serial / dd/mm/yyyy / yyyy-mm-dd)          │
│  - Validate joinedYear (1900-2100)                                │
│  - Check uniqueness (file-level + DB-level)                       │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Step 5: Preview & Filter                                          │
│  - Show all rows with status (Valid | Error)                      │
│  - Filter: All | Valid Only | Error Only                          │
│  - Summary: X valid, Y errors                                     │
│  - Action buttons:                                                │
│    • Download Full (all rows + status column)                     │
│    • Download Errors Only (invalid rows + error messages)         │
│    • Save Valid Data                                              │
└───────────┬───────────────────────────────────────────────────────┘
            │
            ├─ Download Full → Excel export (all rows + "Keterangan")
            │
            ├─ Download Errors Only → Excel export (errors + messages)
            │
            └─ Save Valid Data
                │
                ├─ Confirmation Dialog
                ├─ Bulk Insert (Transaction-based)
                ├─ Success Toast (X records saved)
                └─ Redirect to Farmer List
```

### Validation Tiers

1. **File-level**: Check duplicates within uploaded file
2. **DB-level**: Check existing records in database
3. **Format validation**: Zod schemas + normalization logic

</details>

---

<details>
<summary><strong>Role-Specific Access Summary</strong></summary>

## SUPERADMIN

- **Dashboard**: ✅ Main Dashboard (semua snapshot, semua data)
- **Master Data**: ✅ Full CRUD, all regions/groups/farmers
- **Settings**: ✅ User/Role/Menu/Region management
- **Report**: ✅ All reports, all data
- **Bulk Upload**: ✅ All modules
- **Tools**: ✅ Dashboard Snapshot (generate/view/delete), Export, S3/PDF, GIS

## ADMIN (District/Province Level)

- **Dashboard**: ✅ Main Dashboard (snapshot dalam scope distrik + org-wide)
- **Master Data**: ✅ CRUD within assigned district (Groups, Farmers, Training)
- **Settings**: 🟠 Limited (View/Edit users based on permission)
- **Report**: 🔲 Filtered reports (User, KT within scope)
- **Bulk Upload**: ✅ Farmer (assigned groups only)
- **Tools**: ✅ Dashboard Snapshot (generate/view/delete, scope distrik)

## OPERATOR (Field Level)

- **Dashboard**: ✅ Main Dashboard (VIEW; snapshot dalam scope KT + org-wide)
- **Master Data**: ✅ CRUD Farmers/Parcels/Training/Production within assigned KT
- **Settings**: ❌ No access
- **Report**: 🔲 View reports (assigned KT only)
- **Bulk Upload**: ❌ No access
- **Tools**: ❌ No access (tidak diberi akses Dashboard Snapshot)

## MANAGEMENT (Read-Only)

- **Dashboard**: ✅ Main Dashboard (view all metrics, organization-wide)
- **Master Data**: ❌ Read-only (no CRUD)
- **Settings**: ❌ No access
- **Report**: 🔲 View all reports (all data)
- **Bulk Upload**: ❌ No access
- **Tools**: 🟠 Dashboard Snapshot (view-only, tanpa generate/delete)

</details>

---

<details>
<summary><strong>Implementation Status (Current)</strong></summary>

## Completed Modules (✅ 25 Phases)

> Jumlah fase & test di bawah adalah cerminan; **source of truth** ada di tabel **Phase Status** pada [`progress.md`](./progress.md). Perbarui angka di sana lebih dulu.
 
| Phase | Module | Key Features |
|-------|--------|--------------|
| PLATFORM-01 | Init & UI | Next.js, Shadcn, Tailwind setup |
| PLATFORM-02 | Schema & Migrations | Modular Prisma schema (kini 19 model / 10 migrasi) |
| PLATFORM-03 | Schema Hardening | Audit fields, soft-delete pattern |
| PLATFORM-04 | Auth & RBAC | NextAuth, RBAC helpers, data access, overrides |
| PLATFORM-05 | Menu Management | Dynamic sidebar, CRUD, recursive parent-child |
| PLATFORM-06 | DataTable & Export | Column visibility, Excel export (exceljs) |
| PLATFORM-07 | 3-Level Menu | Sidebar, RBAC inheritance, validation depth max 3 |
| MD-01 | Regions | 4-level hierarchy, tree UI, CRUD |
| MD-02 | Farmer Groups | List, detail, CRUD, RBAC filtering, agregat petani/persil/luas |
| MD-03 | Farmers | Full CRUD, RBAC, joinedYear field |
| MD-04 | Land Parcels | Geolocation, polygon geometry, area tracking, revision history, ZIP Shapefile bulk upload (#88) |
| MD-05 | Training | 3 model, activities, participants (pre/post-test), evidence upload S3 |
| MD-06 | Production | ProductionRecord, period + harvest number, duplicate validation (#89) |
| DASH-01 | Main Dashboard | Snapshot-backed, 10 summary cards, filter client-side (#99) |
| DASH-02 | Dashboard Server Actions | `dashboard.ts` + `snapshot.ts` + aggregation lib (teruji) |
| DASH-03 | Interactive Map | MapLibre cluster KT + info panel (dashboard-map) |
| MAP-01 | Map: Peta Lahan | Peta full-bleed + overlay SIGAP + custom GIS + hotspot FIRMS + ruler + label (#113); produksi popup real + PDF "Profil Lahan" matriks (#134); panel daftar lahan search+zoom (#135); legenda collapsible |
| RPT-01 | Report Petani | Filter cascade wajib + Excel & PDF (#107) |
| RPT-02 | Report Pelatihan | 2 tab + Excel 2-sheet + PDF (#108) |
| RPT-03 | Report Produksi | Matriks bulanan per petani/lahan + Excel + PDF landscape (#132) |
| BULK-01 | Bulk Upload Menu | Route setup, redirect ke /farmers (#68) |
| BULK-03 | Bulk Upload Farmer | Excel mapping, validation, preview, download errors (#76) |
| BULK-04 | Bulk Upload Production | Excel mapping + period/harvest validation |
| DA-01 | Ringkasan Petani | 2 tab + kartu agregat + Excel (#103) |
| DA-02 | Analisa Ketersediaan Data | Health score + 5 domain anomali + cakupan per paket (#118, #122) |
 
**Total Tests**: **24 files / 311 tests passing** ✅ (angka kanonis di [`progress.md`](./progress.md))

## In Progress (🟠 3 Phases)

| Phase | Module | Status | Missing |
|-------|--------|--------|---------|
| TOOLS-01 | Tools | Partial | GIS utilities, app-integrated S3 manager (CLI sudah ada) |
| OPS-01 | Testing | Partial | RPT-03 (#132) ✅ tercakup (14 unit test); gap tersisa: integration test route hotspot |
| OPS-02 | DevOps | Partial | Verifikasi deployment/rollback; status Dockerfile vs CI |

## Planned - Now (🔲 Priority)
 
| Phase | Module | Next Steps | Blocker |
|-------|--------|------------|---------|
| — | **Remediasi Audit P0** | Guard `hasPermission` (role-permission/menu/upload) + scope (`getFarmerById`, `bulkCreateFarmers`) + lint merah — lihat `audit-report/audit-2026-07-10.md` §8 | — |

## Planned - Next

- BULK-02 (Region Bulk Upload #70), #69 (Bulk Upload KT), DASH-04 (Dashboard BMP — dependency DASH-01/02 sudah selesai)

## Planned - Later (🔲)

- MD-07/08/09/10/11 (Staff, HCV, BUSDEV, IMPACT, Workplan), CMS-01, COMM-01/02

## Blocked (🔴)

- Tidak ada (DASH-04 sudah tidak terblokir — DASH-01/02 selesai; kini berstatus Planned)

</details>

---

<details>
<summary><strong>Testing & Quality Status</strong></summary>

## Test Coverage Summary

**Test Status**: ✅ **24 files / 311 tests passing** (angka kanonis di [`progress.md`](./progress.md))

### Covered Modules

| Module | Test File | Tests | Status |
|--------|-----------|-------|--------|
| Region | region.test.ts | 42 | ✅ |
| Data Completeness (DA-02) | data-completeness.test.ts | 31 | ✅ |
| User | user-action.test.ts, user-data-access.test.ts, user-menu-access.test.ts | 39 | ✅ |
| Training | training-activity.test.ts, training-participant.test.ts | 23 | ✅ |
| Land Parcel | land-parcel.test.ts | 16 | ✅ |
| Production | production.test.ts | 15 | ✅ |
| Farmer | farmer.test.ts | 14 | ✅ |
| Bulk Upload | bulk-upload.test.ts | 14 | ✅ |
| Map Geo (ruler/label) | map-geo.test.ts | 13 | ✅ |
| Dashboard | dashboard.test.ts | 12 | ✅ |
| RBAC | rbac.test.ts, rbac-permission.test.ts | 12 | ✅ |
| Map (MAP-01) | map.test.ts | 15 | ✅ |
| Menu | menu-action.test.ts, menu-filter.test.ts | 20 | ✅ |
| Hotspot FIRMS | firms.test.ts | 9 | ✅ |
| Performance | perf.test.ts | 8 | ✅ |
| Report | report.test.ts | 5 | ✅ |
| Middleware | middleware.test.ts | 5 | ✅ |
| Auth | auth.test.ts | 5 | ✅ |
| Data Analyst (DA-01) | data-analyst.test.ts | 4 | ✅ |

### Need Coverage

- 🔲 Server-action level tests untuk snapshot RBAC (kini hanya fungsi murni)
- 🔲 Integration test route `api/map-hotspot` (follow-up MAP-01)

## Code Compliance (rule.md)

**Status per audit 2026-07-10**: 🟠 **7 PASS · 4 PARTIAL · 3 FAIL** (dari 14 kategori) — detail lengkap + bukti `file:line` di `audit-report/audit-2026-07-10.md`

- ✅ PASS: kebab-case naming, Server Component default, Zod di `src/validations/`, actions di `src/server/actions/`, pola `AccessContext`, soft delete `isActive` di schema, Shadcn+Tailwind
- 🟠 PARTIAL: variable English (istilah domain ID di lib/types), filter `isActive` (farmer-group reads), loading.tsx (4 halaman tabel belum ada), Table Actions (menu-list-client belum gating/posisi kiri)
- ❌ FAIL: backend `hasPermission` (role-permission/menu/upload + helper select tanpa guard), no-barrel-imports (13 file pakai barrel `@/components/shared` — kini diresmikan sebagai pengecualian di rule.md), QA gate lint (`npm run lint` 190 error)

</details>

---

## Priority Actions (Next 2 Weeks)
 
| Priority | Action | Owner | Deadline | Impact |
|----------|--------|-------|----------|--------|
| **P0** | **Remediasi audit — guard/scope RBAC** (`role-permission.ts`, `menu.ts`, `upload.ts`, `getFarmerById`, `bulkCreateFarmers`, menuKey Roles) | Engineering | ASAP | Menutup celah pemanggilan server action langsung (UI-bypass) |
| P1 | **Lint hijau kembali** (ignore `scripts/**`, unused vars, cicil `no-explicit-any`) | Engineering | 2026-07-17 | Quality gate `npm run lint` kembali ditegakkan |
| P2 | Cleanup dead code & deps (audit §8 P2) | Engineering | 2026-07-24 | Dependency & file mati terhapus, bundle lebih ramping |

---

## Key Decisions Needed

| Decision | Owner | Deadline | Context |
|----------|-------|----------|---------|
| Pola restore soft-delete | Product + Engineering | 2026-07-17 | List KT menampilkan record nonaktif (bisa restore), list Petani menyembunyikannya (tidak bisa restore) — pilih satu pola & seragamkan |
| Nasib `recharts` & `Dockerfile` | Engineering | 2026-07-24 | recharts 0 pemakaian (rencana chart produksi); Dockerfile tampak tak dipakai pipeline CI (deploy via SSH build) |

---

## Related Documentation

- **[progress.md](./progress.md)** — Detailed phase status & roadmap (biweekly management brief)
- **[rule.md](./rule.md)** — Development rules & coding standards
- **[database-schema.md](./database-schema.md)** — ERD, indexes, migrations, security
- **[general-rule.md](./general-rule.md)** — Behavioral principles

---

**Last Updated**: 2026-07-11 (RPT-03 Report Produksi #132 selesai — sinkronisasi status; audit menyeluruh 2026-07-10 tetap berlaku)  
**Next Review**: Setelah remediasi audit P0 (#126/#127)  
**Audit Basis**: Full codebase scan (src/, prisma/, scripts/, config) — 24 test files / 296 tests ✅ · build ✅ · lint ❌ 190 error — detail di `audit-report/audit-2026-07-10.md`
