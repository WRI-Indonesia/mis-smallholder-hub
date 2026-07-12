# Produk — Status Modul (cerminan)

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [architecture.md](./architecture.md) · [access-context.md](./access-context.md) · [crud-flows.md](./crud-flows.md) · [role-flows.md](./role-flows.md)

> ⚠️ **Cerminan, bukan sumber kebenaran.** Status delivery kanonis ada di [../project/roadmap.md](../project/roadmap.md) (Phase Status) & [../project/sprint.md](../project/sprint.md). Perbarui di sana lebih dulu.

<details>
<summary><strong>Implementation Status (Current)</strong></summary>

## Completed Modules (✅ 25 Phases)

> Jumlah fase & test di bawah adalah cerminan; **source of truth** ada di tabel **Phase Status** pada [`progress.md`](../project/roadmap.md). Perbarui angka di sana lebih dulu.
 
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
 
**Total Tests**: **24 files / 311 tests passing** ✅ (angka kanonis di [`progress.md`](../project/roadmap.md))

## In Progress (🟠 3 Phases)

| Phase | Module | Status | Missing |
|-------|--------|--------|---------|
| TOOLS-01 | Tools | Partial | GIS utilities, app-integrated S3 manager (CLI sudah ada) |
| OPS-01 | Testing | Partial | RPT-03 (#132) ✅ tercakup (14 unit test); gap tersisa: integration test route hotspot |
| OPS-02 | DevOps | Partial | Verifikasi deployment/rollback; status Dockerfile vs CI |

## Planned - Now (🔲 Priority)
 
| Phase | Module | Next Steps | Blocker |
|-------|--------|------------|---------|
| — | **Remediasi Audit (#125 ✅ / #126 ✅)** | AUDIT-P0 guard/scope RBAC (#125) & lint gate (#126) selesai 2026-07-12; sisa AUDIT-P1: scope by-id KT/pelatihan & pola restore (#127), konvensi UI (#128) — `audit-report/audit-2026-07-10.md` §8 | — |

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

**Test Status**: ✅ **24 files / 311 tests passing** (angka kanonis di [`progress.md`](../project/roadmap.md))

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

**Status per audit 2026-07-10** (update lint 2026-07-12): 🟠 **8 PASS · 4 PARTIAL · 2 FAIL** (dari 14 kategori) — detail lengkap + bukti `file:line` di `audit-report/audit-2026-07-10.md`

- ✅ PASS: kebab-case naming, Server Component default, Zod di `src/validations/`, actions di `src/server/actions/`, pola `AccessContext`, soft delete `isActive` di schema, Shadcn+Tailwind, **QA gate lint (`npm run lint` exit 0 — #126 ✅ 2026-07-12)**
- 🟠 PARTIAL: variable English (istilah domain ID di lib/types), filter `isActive` (farmer-group reads), loading.tsx (4 halaman tabel belum ada), Table Actions (menu-list-client belum gating/posisi kiri)
- ❌ FAIL: backend `hasPermission` (role-permission/menu/upload + helper select tanpa guard), no-barrel-imports (13 file pakai barrel `@/components/shared` — kini diresmikan sebagai pengecualian di rule.md)

</details>

---

## Priority Actions (Next 2 Weeks)
 
| Priority | Action | Owner | Deadline | Impact |
|----------|--------|-------|----------|--------|
| **P0** | **Remediasi audit — guard/scope RBAC** (`role-permission.ts`, `menu.ts`, `upload.ts`, `getFarmerById`, `bulkCreateFarmers`, menuKey Roles) | Engineering | ASAP | Menutup celah pemanggilan server action langsung (UI-bypass) |
| ✅ P1 | **Lint hijau kembali (#126)** — ✅ Done 2026-07-12 | Engineering | — | `npm run lint` **exit 0**; gate ditegakkan lokal via Pre-Commit Gate (`workflow.md`) |
| ✅ P2 | **Cleanup dead code & deps (#129)** — ✅ Done 2026-07-12 | Engineering | — | 9 deps 0-usage + 7 file mati terhapus, helper "for select" dikonsolidasi. Win = install/supply-chain (−59 paket transitif), **bukan** bundle client (deps mati tak pernah di-import) |

---

## Key Decisions Needed

| Decision | Owner | Deadline | Context |
|----------|-------|----------|---------|
| ✅ Pola restore soft-delete (#127) | — (RESOLVED 2026-07-12) | ✅ | Terpilih: tampilkan nonaktif + badge + filter Status (default Aktif) + toggle Aktifkan, **khusus SUPERADMIN**; diseragamkan ke semua list master data (lihat TD-007) |
| ✅ Nasib `recharts` & `Dockerfile` (#129) | — (RESOLVED 2026-07-12) | ✅ | `recharts` **dihapus** (dipasang lagi saat chart produksi); `Dockerfile` **dipertahankan** (deploy via SSH `npm run build`, bukan Docker — hardening via `.dockerignore`) |
