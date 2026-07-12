# Proyek — Roadmap & Phase Status (Source of Truth)

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [sprint.md](./sprint.md) · [tech-debt.md](./tech-debt.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

<details>
<summary><strong>2. Roadmap Source of Truth</strong> — status resmi phase berdasarkan code</summary>

## 2. Roadmap Source of Truth

Section ini adalah acuan resmi status delivery. Jika ada perbedaan antara changelog, issue, dan tabel ini, gunakan tabel **Phase Status** sebagai kebenaran utama.

### Governance Rules

- **Phase Status adalah source of truth** untuk reporting management dan planning developer.
- Status fase hanya boleh naik jika implementasi bisa diverifikasi lewat file/code, route, schema, server action, test, atau workflow.
- Changelog tidak boleh dijadikan bukti status selesai; changelog hanya catatan historis.
- Placeholder `Coming soon` tidak dihitung sebagai implementasi feature.
- Script/debug tool tidak dihitung sebagai implementasi UI/module, kecuali phase memang scope-nya CLI/tooling.
- Jika status berubah karena audit code, catat di **Decision Log**.

### Status Definition

| Status         | Arti                      | Kapan Dipakai                                                           |
| -------------- | ------------------------- | ----------------------------------------------------------------------- |
| ✅ Done        | Selesai dan terverifikasi | Schema/route/action/UI tersedia sesuai completion criteria minimal      |
| 🟠 Partial     | Sebagian ada              | Ada sebagian implementasi, tetapi belum cukup untuk dianggap selesai    |
| 🔲 Not Started | Belum dimulai             | Route/schema/action utama belum ada, tetapi phase masuk prioritas dekat |
| 🔲 Planned     | Masuk roadmap             | Belum ada implementasi dan belum menjadi prioritas sprint               |
| 🔴 Blocked     | Terhambat                 | Ada dependency atau kondisi yang membuat phase belum layak dieksekusi   |

### Horizon Definition

| Horizon | Arti                        | Aturan                                         |
| ------- | --------------------------- | ----------------------------------------------- |
| Done    | Selesai                     | Semua completion criteria fase sudah terpenuhi |
| Now     | Fokus dua minggu berjalan   | Maksimal 2–4 phase agar tim tidak melebar      |
| Next    | Kandidat sprint berikutnya  | Masuk setelah dependency jelas                 |
| Later   | Backlog roadmap             | Jangan dieksekusi sebelum Now stabil           |
| Blocked | Tidak bisa dieksekusi sehat | Perlu dependency/keputusan/phase sebelumnya    |

### Code Audit Evidence

| Area           | Bukti di Codebase                                                                                                                                                                  | Kesimpulan                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Prisma models  | **19 model / 10 migrasi**: `User`, `MenuItem`, `RolePermission`, `UserProvince`, `UserDistrict`, `UserFarmerGroup`, `UserPermissionOverride`, `Province`, `District`, `Subdistrict`, `Village`, `FarmerGroup`, `Farmer`, `LandParcel`, `TrainingPackage`, `TrainingActivity`, `TrainingParticipant`, `ProductionRecord`, `MainDashboardSnapshot` | Schema mencakup platform, RBAC, region, farmer group, farmer (MD-03), land parcel (MD-04), training (MD-05), production (MD-06), dan dashboard snapshot (DASH-01) ✅ |
| Admin routes   | **35 page.tsx**: Dashboard (Main, snapshot-backed), Settings (Users/Roles/Menu/Regions), Master Data (Farmers + Groups + Parcels + Training + Production, list/detail/form), Bulk Upload (Farmers + Parcels Shapefile + Production), Report (Petani + Pelatihan), Data Analyst (Ringkasan Petani + Analisa Ketersediaan Data), Map (Peta Lahan), Tools (Dashboard Snapshot), Profile | ✅ Semua page konten ter-guard `requirePermission` (27) + 8 justified (redirect-only/profile) — verifikasi audit 2026-07-10 |
| Server actions | **22 file — total 3.894 LOC** (audit `wc -l` 2026-07-10): `user`, `user-data-access`, `user-menu-access`, `menu`, `region`, `role-permission`, `farmer-group`, `farmer` (143), `land-parcel` (216), `bulk-upload` (76), `bulk-upload-parcel` (223), `bulk-upload-production` (160), `training` (363), `production` (375), `upload`, `profile`, `report` (392), `dashboard` (70), `snapshot` (204), `map`, `data-analyst` (187), `data-completeness` | Semua modul (incl. dashboard, snapshot, map, report) tersedia ✅ — catatan audit: 5 celah guard/scope, lihat `audit-report/audit-2026-07-10.md` §2 |
| Validation schemas | `farmer-group.schema.ts`, `farmer.schema.ts`, `land-parcel.schema.ts`, `map.schema.ts`, `menu.schema.ts`, `production.schema.ts`, `region.schema.ts`, `snapshot.schema.ts`, `training-activity.schema.ts`, `training-participant.schema.ts`, `user.schema.ts` — **11 files** | Validation coverage: user, region, menu, farmer-group, farmer, land-parcel, training, production, map, snapshot ✅ |
| Public routes  | Home, Community placeholder, Knowledge Management placeholder                                                                                                                      | Public shell ada; CMS/community belum implementatif                                    |
| Scripts        | `scripts/get-link.js`, `scripts/pdf-manager.js` (tracked, npm commands aktif ✅); debug/stale scripts dipindah ke `scripts/local/` (gitignored, local-only) | BUG-002 resolved — stale scripts tidak ada di repo/CI. |
| Tests          | `npm test` lulus **24 test files / 311 tests** ✅ (audit 2026-07-10); test files: auth, bulk-upload, dashboard, data-analyst, data-completeness, farmer, firms, land-parcel, map, map-geo, menu-action, menu-filter, middleware, perf, production, rbac, rbac-permission, region, report, training-activity, training-participant, user-action, user-data-access, user-menu-access | Testing solid untuk semua core features (termasuk RPT-03/#132: 14 unit test); gap tersisa: integration test route hotspot |
| DevOps         | Dockerfile + `.github/workflows/` (`deploy-dev.yaml`, `deploy-main.yml`, `semgrep.yml`, `gitleaks.yml`)                                                                            | DevOps partial; workflow CI/CD dan security scan (Gitleaks, Semgrep) ditambahkan |

### Code Compliance Audit vs rule.md (2026-07-10)

**Audit Scope:** Keseluruhan codebase (src/, prisma/, scripts/, config) terhadap `docs/rule.md` — detail lengkap + bukti `file:line` di **`audit-report/audit-2026-07-10.md`** (internal, gitignored). Menggantikan audit 2026-06-08 yang sudah stale.

| Rule Category | Requirement | Actual | Status | Evidence |
|---|---|---|---|---|
| **Code Standards** | File naming: kebab-case | 100% kebab-case; 1 inkonsistensi suffix (`land-parcel.types.ts`) | ✅ PASS | audit §5 |
| **Code Standards** | Variable naming: English | Istilah domain ID di lib/types (`computePetaniDomain`, `totalPetani`, dll) | 🟠 PARTIAL | `data-completeness.ts`, `types/dashboard.ts` — audit §5 |
| **Code Standards** | Imports: from sub-module | 13 file pakai barrel `@/components/shared` vs 8 sub-path; barrel `shared` kini diresmikan sebagai pengecualian di rule.md | ❌→✅ (rule direvisi) | audit §4 U-5 |
| **Code Standards** | Default: Server Component | 78 file `"use client"` (29 = shadcn `ui/`), semua page.tsx RSC | ✅ PASS | audit §9 |
| **Code Standards** | Validation: Zod schemas | 11 schema files di `src/validations/` | ✅ PASS | audit §9 |
| **Code Standards** | Server Actions: src/server/actions/ | 22 action files (3.894 LOC) | ✅ PASS | audit §3 |
| **RBAC Pattern** | AccessContext discriminated union | Diimplementasi & dipakai luas (`access-context.ts`) | ✅ PASS | audit §3 |
| **RBAC Pattern** | hasPermission backend validation | Guard P0 (`role-permission`/`menu`/`upload`) + scope `getFarmerById`/`bulkCreateFarmers` ditutup #125; scope by-id KT/pelatihan/lahan + guard semua helper "for select" ditutup #127 (2026-07-12) | ❌→✅ **PASS** (#125 + #127) | audit §2 |
| **Soft Delete** | isActive field @default(true) | Semua model (join-table assignment by design tanpa isActive) | ✅ PASS | audit §3 |
| **Data Filtering** | Filter isActive: true in queries | Pola restore soft-delete diseragamkan #127 (2026-07-12): **SUPERADMIN** melihat nonaktif + badge + filter Status (default Aktif) + toggle Aktifkan; **user lain dibatasi ke record aktif** (server & UI). Mutasi tetap butuh isActive | 🟠→✅ **PASS** (#127) | audit §3.2 · TD-007 |
| **UI/UX** | Loading state (loading.tsx) | 4 halaman tabel belum punya (training, settings/menu, report ×2) | 🟠 PARTIAL | audit §4 U-4 |
| **UI/UX** | Shadcn UI + Tailwind | Dipakai konsisten; DataTable/TableActions shared 100% patuh | ✅ PASS | audit §4 |
| **UI/UX** | Table Actions positioning | Patuh di semua list KECUALI `menu-list-client.tsx` (kanan, tanpa gating izin) | 🟠 PARTIAL | audit §4 U-1/U-2 |
| **Issue Workflow** | QA gates (test/build/lint) | Test 328 ✅ · build ✅ · **lint ✅ exit 0** (0 error; 3 warning `exhaustive-deps` ditahan) — #126 ✅ 2026-07-12 | ✅ **PASS** | audit §1 · #126 |

**Summary:** **10 PASS · 3 PARTIAL · 1 FAIL** (lint gate ✅ #126; RBAC guard/scope ✅ #125+#127; pola restore soft-delete ✅ #127 — semua 2026-07-12) — fondasi arsitektur sehat, tetapi klaim lama "14/14 fully compliant" tidak lagi berlaku. Remediasi P0/P1 terjadwal di Sprint Focus.



Format phase: `STREAM-NN`.

| Stream   | Arti                   | Cakupan                                                                                    |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| PLATFORM | Platform Foundation    | Init project, schema DB, auth, RBAC, menu infra                                            |
| MD       | Master Data            | Regions, groups, farmer, parcels, training, staff, agronomy, HCV, BUSDEV, IMPACT, workplan |
| DASH     | Dashboard              | Basic dashboard, server actions, interactive map, BMP                                      |
| MAP      | Geospatial Map Explorer | Peta interaktif sebaran KT & lahan, filter spasial (Province/District/KT), layer toggle    |
| RPT      | Report                 | Report User, Region, Kelompok Tani; summary tabel + export Excel/PDF                      |
| BULK     | Bulk Upload            | Bulk upload CSV untuk Region dan Kelompok Tani; validasi, preview, insert                  |
| TOOLS    | Tools & Utility        | Import, export, GIS, S3/PDF utility                                                        |
| DA       | Data Analyst           | Ringkasan Petani, Analisa Ketersediaan Data (anomali/kelengkapan), analytics dashboards    |
| CMS      | Content Management     | Pages, media, knowledge base                                                               |
| COMM     | Community & Engagement | Community, i18n                                                                            |
| OPS      | Operations & DevOps    | Testing, CI/CD, deployment                                                                 |

### Phase Status

| Phase       | Deskripsi                    | Status         | Horizon | Evidence from Code                                                                                | Completion Criteria / Next Step                                                  |
| ----------- | ---------------------------- | -------------- | ------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| PLATFORM-01 | Initialization & UI Statis   | ✅ Done        | Done    | Next.js app, public home, login, admin shell, UI components                                       | Maintain                                                                         |
| PLATFORM-02 | Database Schema & Migrations | ✅ Done        | Done    | Modular Prisma schema + migration + seed files                                                    | Maintain                                                                         |
| PLATFORM-03 | Schema Hardening             | ✅ Done        | Done    | All active models have audit fields (created_at/by, modified_at/by, is_active) + soft-delete     | Maintain pattern for future models                                               |
| PLATFORM-04 | Autentikasi & RBAC           | ✅ Done        | Done    | NextAuth credentials, RBAC helpers, role permissions, data access, menu override — 5 auth tests  | Maintain and test regression                                                     |
| PLATFORM-05 | Dynamic Menu Management      | ✅ Done        | Done    | `MenuItem` schema, seed, menu server actions, sidebar, menu management page                       | Maintain                                                                         |
| PLATFORM-06 | Table Refactor & Export Excel | ✅ Done        | Done    | DataTable diperbarui dengan filter kolom & export Excel, list user/KT direfactor | Maintain dan perluas ke modul baru jika ditambahkan |
| PLATFORM-07 | Hierarchical Menu (3-Level)  | ✅ Done        | Done    | Schema support recursive self-relation; UI & RBAC supporting 3-level | Maintain |
| MD-01       | Regions                      | ✅ Done        | Done    | Region schema, server actions, region page, tree UI, validation, 1 test file (391 LOC)           | Maintain                                                                         |
| MD-02       | Farmer Groups                | ✅ Done        | Done    | `FarmerGroup` schema, CRUD actions, list/detail/form UI, RBAC filter                              | Add/maintain tests if needed                                                     |
| MD-03       | Farmer                       | ✅ Done        | Done    | `Farmer` model ✅, `src/server/actions/farmer.ts` (188 LOC) ✅, validation ✅, UI (list/detail/form) ✅, test ✅ | Maintain; expand MD-04/05/06 dependency                                          |
| MD-04       | Parcels                      | ✅ Done        | Done    | `LandParcel` model ✅, `src/server/actions/land-parcel.ts` (165 LOC) ✅, `src/server/actions/bulk-upload-parcel.ts` (222 LOC) ✅, validation schema ✅, UI list/detail/form ✅, ZIP Shapefile bulk upload dengan column mapping ✅, 14 unit tests ✅ | Maintain; expand to Production dependency |
| MD-05       | Training                     | ✅ Done        | Done    | Schema (TrainingPackage/Activity/Participant) ✅, actions (363 LOC) ✅, UI (list/detail/modal) ✅, participants management ✅, pre/post-test scores ✅, bulk participant removal ✅, 23 unit tests (activity 16 + participant 7) ✅ | Maintain; #77-#82, #94 complete |
| MD-06       | Agronomy / Production        | ✅ Done        | Done    | ProductionRecord model ✅, `src/server/actions/production.ts` (180 LOC) ✅, `src/server/actions/bulk-upload-production.ts` (95 LOC) ✅, validation schema ✅, UI list/detail/form pages ✅, 13 unit tests ✅ | Maintain; #89 complete (per-farmer/parcel tracking, period validation, bulk upload)                      |
| MD-07       | Staff                        | 🔲 Planned     | Later   | No staff model/route/action/UI                                                                    | Define scope                                                                     |
| MD-08       | HCV                          | 🔲 Planned     | Later   | No HCV model/route/action/UI                                                                      | Define scope                                                                     |
| MD-09       | BUSDEV                       | 🔲 Planned     | Later   | No BUSDEV model/route/action/UI                                                                   | Define scope                                                                     |
| MD-10       | IMPACT                       | 🔲 Planned     | Later   | No IMPACT model/route/action/UI                                                                   | Define scope                                                                     |
| MD-11       | Workplan                     | 🔲 Planned     | Later   | No workplan model/route/action/UI                                                                 | Define scope                                                                     |
| DASH-01     | Dashboard: Basic Data        | ✅ Done        | Done    | Menu `dashboard` (parent) + `dashboard-main` (Main Dashboard) ✅; `/admin/dashboard/main` UI (8 summary cards + filter Distrik/Kelompok Tani/Tahun) ✅; `MainDashboardSnapshot` model + `tbl_snapshot_main_dashboard` migration ✅; snapshot module `/admin/tools/snapshot` (generate/list/detail) ✅; 5 unit tests ✅ | Implement #99 completed (DASH-01) |
| DASH-02     | Dashboard: Server Actions    | ✅ Done        | Done    | `src/server/actions/dashboard.ts` (RBAC-scoped aggregation) + `src/server/actions/snapshot.ts` (CRUD) + `src/lib/dashboard-aggregation.ts` (pure, tested) + `src/lib/dashboard-query.ts` ✅ | Implement #99 completed |
| DASH-03     | Interactive Map              | ✅ Done        | Done    | `src/app/(admin)/admin/dashboard/dashboard-map.tsx` — MapLibre (react-map-gl) clustered KT markers + label nama KT pada titik non-cluster, auto-fit bounds, click-to-select info panel, NULL-coordinate empty state ✅ | Implement #99 completed |
| DASH-04     | Dashboard BMP                | 🔲 Planned     | Next    | Dependencies DASH-01/02 complete (#99); BMP-specific dashboard not yet implemented                | Define BMP dashboard scope; reuse snapshot pattern                               |
| MAP-01      | Map: Peta Lahan              | ✅ Done        | Done    | #113 ✅ (scaffolding): menu `map`+`map-parcel` (seed CSV + DB) ✅; `/admin/map/parcel` peta full-bleed MapLibre (`react-map-gl`) + panel filter floating collapsible (Province→District→KT + Muat Data) + legend layer toggle (point KT / centroid lahan / polygon lahan) + info popup accordion (Detail Lahan / Pelatihan Petani lazy-load / **Produksi data asli per-lahan + selektor Rata-rata/tahun, grafik sumbu-Y kanan + tooltip** — #134) ✅; `src/server/actions/map.ts` (`getMapData` + dropdowns + `getFarmerTraining`, 3-layer RBAC) + `src/lib/map-data.ts` (pure, teruji) + `src/types/map.ts` + `src/validations/map.schema.ts` ✅; centroid lahan via `@turf`; 7 unit test ✅; section **Peta Lainnya** = overlay raster referensi SIGAP KLHK/Kemenhut (Kawasan Hutan / Pelepasan / Gambut / PIPPIB / Penutupan Lahan) via proxy tile `api/map-overlay/[key]` (atasi CORS + TLS upstream) ✅; section **Tambah Data GIS Lain** = user tambah layer WMS/Shapefile/GeoJSON (parse browser via `shpjs`, `map-custom-gis.tsx`) ✅; **enhancement 2026-07-10:** layer **Titik Api (Hotspot)** NASA FIRMS VIIRS 375 m (proxy `api/map-hotspot` auth-guarded + `lib/firms.ts`, bbox **Riau**, window **24 jam / 5 hari**) + **tool Ruler** ukur jarak & luas geodesik (label segmen/undo/Esc) + **label nama KT & petani** (petani hanya bila **muat di poligon**, wrap otomatis, bounds precomputed) ✅; helper murni `map-geo.ts` + **22 unit test** ✅ | Implement #113 completed. **#134 (2026-07-11):** produksi popup real per-lahan + selektor tahun + PDF matriks tahun×bulan×Total + rebrand "Profil Lahan" + dedup fetch produksi + fix popup refresh; **#135:** panel kanan daftar lahan (search+zoom); legenda collapsible. Follow-up (tech debt #136): Recharts grafik popup, data-quality produksi tanpa `parcelId`, debounce/virtualisasi panel, lahan tetangga di PDF (#134-E), warna area lahan 2 kategori (ada/tidak ada produksi); analisis spasial overlap parcel↔kawasan hutan (PostGIS `ST_Intersects`); **hotspot follow-up:** proximity alert KT/parcel↔hotspot, integration test route |
| RPT-01      | Report: Petani               | ✅ Done        | Done    | Menu Level 1 `report` + sub-menu `report-farmer` ✅, `src/server/actions/report.ts` (145 LOC) ✅, halaman `/admin/report/farmer` UI + filter wajib + export Excel & PDF ✅, 3 unit tests ✅ | Implement #107 completed |
| RPT-02      | Report: Pelatihan            | ✅ Done        | Done    | Halaman `/admin/report/training` dengan 6 summary cards, 2 tab (Kegiatan Pelatihan & Cakupan per Petani), ekspor Excel 2-sheet, filter jenis training, dan ekspor PDF. | Implement #108 completed |
| RPT-03      | Report: Produksi             | ✅ Done        | Done    | #132 ✅: sub-menu `report-production` (seed CSV + role-permissions) + `getProductionReport` di `report.ts` + `lib/report-production.ts` (pure, teruji) + halaman `/admin/report/production` matriks bulanan per petani/lahan (kolom bulan dinamis dari rentang, total per baris & per bulan) + filter Distrik→KT + Periode Awal/Akhir (maks 24 bulan) + Excel export & PDF landscape + 14 unit test | Implement #132 completed |
| BULK-01     | Bulk Upload: Menu & KT       | ✅ Done        | Done    | Menu & route setup ✅; redirect `/admin/bulk-upload` → `/farmers` implemented ✅ | Maintain; #68 complete |
| BULK-02     | Bulk Upload: Region          | 🔲 Not Started | Next    | Tidak ada bulk upload region; **#70 dibuat**                                                       | #70 CSV upload District/Subdistrict/Village dengan validasi hierarchy             |
| BULK-03     | Bulk Upload: Farmer          | ✅ Done        | Done    | `bulk-upload.ts` server action (177 LOC) ✅, dynamic mapping UI ✅, Exceljs upload & smart validations ✅, preview table ✅, full/error download options ✅ | Maintain; #76 Excel upload complete dengan auto column mapping, validasi, preview, download error rows |
| BULK-04     | Bulk Upload: Production      | ✅ Done        | Done    | `bulk-upload-production.ts` server action (95 LOC) ✅, dynamic mapping UI ✅, period validation ✅, preview table ✅ | Maintain; bulk production upload complete with period/harvest validation |
| DA-01       | Farmer Summary Analytics     | ✅ Done        | Done    | `src/types/data-analyst.ts` ✅, `src/server/actions/data-analyst.ts` (140 LOC) ✅, `src/app/(admin)/admin/data-analyst/farmer-summary` UI list/tabs/Excel export ✅, 4 unit tests ✅ | Maintain; #103 complete |
| DA-02       | Analisa Ketersediaan Data KT | ✅ Done        | Done    | `src/types/data-completeness.ts` ✅, `src/lib/data-completeness.ts` (pure logic) ✅, `src/server/actions/data-completeness.ts` (scope-checked) ✅, `src/app/(admin)/admin/data-analyst/data-completeness` UI (filter → 5 collapsible sections: Profil KT/Petani/Lahan/Pelatihan/Produksi + health score + multi-sheet Excel) ✅, 31 unit tests ✅ | Maintain; #118 complete. **DA-02b (#122):** Domain Pelatihan diperdetail → cakupan per paket (4a Ringkasan per Paket / 4b Matriks / 4c Petani Belum Lengkap, nested collapse), skor domain = rata-rata % cakupan paket, +2 sheet Excel |
| TOOLS-01    | Tools Import/Export/GIS/S3   | 🟠 Partial     | Next    | `scripts/get-link.js` & `scripts/pdf-manager.js` tracked ✅ (npm `s3:get-link`, `pdf:*` aktif); debug/stale scripts → `scripts/local/` (gitignored) ✅ | ✅ BUG-002 resolved — stale scripts tidak ada di repo/CI. Utility scripts tetap functional. |
| CMS-01      | CMS & Content Management     | 🔲 Not Started | Later   | Public knowledge page exists but only `Coming soon`; no CMS schema/admin                          | Define CMS scope                                                                 |
| COMM-01     | Community                    | 🔲 Not Started | Later   | Public community page exists but only `Coming soon`                                               | Define community scope                                                           |
| COMM-02     | i18n                         | 🔲 Planned     | Later   | No locale switch/persistence; only incidental calendar locale prop                                | Define i18n approach                                                             |
| OPS-01      | Testing                      | 🟠 Partial     | Later   | Vitest: **26 test files / 346 passing tests** ✅; coverage: auth/RBAC/menu/menu-filter/user/region/farmer/land-parcel/training/production/bulk-upload/report/dashboard/data-analyst/data-completeness/map/map-geo/firms/middleware/perf + rbac-server-guards (#125) + access-context lintas-scope (#127) | RPT-03 (#132) ✅ tercakup; gap tersisa: integration test route hotspot |
| OPS-02      | DevOps & Deployment          | 🟠 Partial     | Later   | Dockerfile, deploy workflows, security scan workflows (`gitleaks.yml`, `semgrep.yml`)                     | Verify deployment, env matrix, rollback, and CI status                           |

</details>
