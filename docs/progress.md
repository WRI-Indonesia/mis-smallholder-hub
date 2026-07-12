# Smallholder HUB — Progress

> Dokumen kerja untuk memantau delivery Smallholder HUB. Status di dokumen ini disinkronkan terhadap **file dan code yang benar-benar ada di repository**, bukan berdasarkan klaim changelog historis.

**Last updated:** 2026-07-12 · **Next management review:** 2026-07-14

**Perubahan terakhir (2026-07-11):** MAP-01 Produksi Peta & PDF "Profil Lahan" (#134) + Panel Daftar Lahan (#135) ✅ · RPT-03 Laporan Produksi (#132) ✅. QA: `npm test` **24 file / 311 ✅** · build ✅ · lint ❌ 193 error (verifikasi 2026-07-12, lihat BUG-006). Fokus berikutnya: remediasi audit P0 (guard/scope RBAC) — #125/#126. Riwayat lengkap → [`progress-changelog.md`](./progress-changelog.md).

**Source of truth:** tabel **Phase Status** di Section 2. **Panduan update & checklist:** [`contributing.md`](./contributing.md).

**Audit basis:** source code, Prisma schema, route files, server actions, scripts, GitHub workflow, dan hasil test lokal.

---

<details open>
<summary><strong>1. Biweekly Management Brief</strong> — ringkasan stakeholder</summary>

## 1. Biweekly Management Brief

Gunakan section ini untuk presentasi management setiap dua minggu. Section ini sengaja dibuat ringkas: posisi delivery, risiko, keputusan, dan target dua minggu berikutnya.

### Reporting Window

| Item               | Nilai                                                       |
| ------------------ | ----------------------------------------------------------- |
| Periode laporan    | 2026-07-07 s.d. 2026-07-10                                  |
| Status keseluruhan | 🟡 On Track dengan catatan (temuan audit P0 wajib diremediasi) |
| Basis review       | **Audit menyeluruh 2026-07-10** (`audit-report/audit-2026-07-10.md`) |
| Test lokal         | ✅ `npm test` — **24 files / 311 tests passed** · build ✅ · **lint ❌ 193 error** |
| Fokus berikutnya   | **Remediasi audit P0 (guard/scope RBAC + lint)** (#126/#127) — RPT-03 Produksi (#132) ✅ selesai |

### Executive Summary

| Area                | Status          | Ringkasan                                                                                                                                  |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform foundation | ✅ Ready        | Auth, RBAC, menu, user management, region, dan farmer group sudah implementatif. Schema dengan audit fields, soft-delete, RBAC patterns.  |
| Master data inti    | ✅ Complete     | Farmer ✅, Land Parcel ✅, Training ✅, Production (MD-06) ✅ complete (model + action + UI + test).                            |
| Dashboard           | ✅ Complete     | DASH-01/02/03 selesai (#99): `/admin/dashboard/main` snapshot-backed + peta MapLibre + `dashboard.ts`/`snapshot.ts` + Tools Snapshot. DASH-04 (BMP) menyusul. |
| Report              | ✅ Complete     | RPT-01 Petani (#107) ✅, RPT-02 Pelatihan (#108) ✅ & RPT-03 Produksi (#132) ✅ selesai (route + `report.ts` + UI + test). |
| Bulk Upload         | ✅ Partial      | Farmer bulk upload ✅, Shapefile bulk upload ✅, Production bulk upload ✅. Region & KT bulk upload belum ada (#69, #70). |
| Map & Data Analyst  | ✅ Complete     | MAP-01 (#113 + hotspot/ruler/label) ✅; DA-01 (#103) & DA-02 (#118, #122) ✅. |
| **Keamanan (audit)** | 🔴 **Action needed** | Audit 2026-07-10: **5 celah guard/scope RBAC** di server actions (`role-permission`, `menu`, `upload`, `getFarmerById`, `bulkCreateFarmers`) + menuKey Roles keliru — bisa dipanggil langsung tanpa UI. **Remediasi P0.** |
| Testing & QA        | 🟠 Strong tapi lint merah | Vitest: **24 files / 311 tests passed** ✅ · build ✅ · **`npm run lint` ❌ 229 masalah (193 error)** — mayoritas `no-explicit-any` + `scripts/` ikut ter-lint. |

### Progress Snapshot

| Metrik         | Jumlah         | Catatan                                              |
| -------------- | -------------- | ---------------------------------------------------- |
| Total phase    | 38 fase        | PLATFORM(7), MD(11), DASH(4), MAP(1), RPT(3), BULK(4), DA(2), TOOLS(1), CMS(1), COMM(2), OPS(2) |
| ✅ Done        | **25 fase**    | PLATFORM-01…07, MD-01…06, DASH-01/02/03, MAP-01, RPT-01/02/03, BULK-01/03/04, DA-01/02 |
| 🟠 Partial     | 3 fase         | TOOLS-01, OPS-01, OPS-02 |
| 🔲 Not Started | 3 fase         | BULK-02 (#70), CMS-01, COMM-01 |
| 🔲 Planned     | 7 fase         | MD-07/08/09/10/11, DASH-04, COMM-02 |
| 🔴 Blocked     | 0 fase         | — (DASH-04 tidak lagi terblokir; DASH-01/02 selesai) |
| 🎯 Now         | 1 fokus        | **Remediasi audit P0** (guard/scope RBAC + lint) (#126/#127) — RPT-03 (#132) ✅ selesai |

### Management Talking Points

| Topik               | Pesan Utama                                                              | Dampak                                                                                    |
| ------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Code Quality 🟠 (audit 2026-07-10)** | Audit menyeluruh: fondasi sehat (35/35 page ter-guard, DataTable/API route/seed compliant, 311 test ✅) TAPI **7 PASS / 4 PARTIAL / 3 FAIL** dari 14 kategori rule.md — 5 celah guard/scope server action + lint merah. | Remediasi P0 dijadwalkan sebelum fitur baru; detail & saran cleanup di `audit-report/audit-2026-07-10.md`. |
| **Production ✅ Complete** | MD-06 Production sudah implementatif (#89): ProductionRecord model + actions + UI + 13 tests + bulk upload | Yield tracking per farmer/parcel ready; foundation untuk impact reporting. |
| **Land Parcel ✅ Complete** | MD-04 Land Parcel sudah implementatif (#88): model + actions + UI + 14 tests + Shapefile bulk upload | Geospatial features ready; foundation untuk Production module. |
| Farmer ✅ Complete  | MD-03 Farmer sudah implementatif (model + action + UI + 10 tests).       | Ready untuk dependency downstream (dashboard, parcel, training, production).                          |
| Navigation ✅ Fixed | `/admin/master-data` redirect ke farmers — sudah bekerja & tested.       | Admin flow tidak patah; Farmer list fully accessible.                                     |
| Dashboard ✅ Complete | DASH-01/02/03 selesai (#99): Main Dashboard snapshot-backed + peta + Tools Snapshot. | Fondasi dashboard siap; DASH-04 (BMP) tinggal reuse pola snapshot. |
| ~~Stale scripts alert~~ | ✅ Resolved — debug/stale scripts dipindah ke `scripts/local/` (gitignored). `get-link.js` & `pdf-manager.js` tetap di `scripts/` root. | BUG-002 closed. |
| Delivery confidence | Tests **311/311** passed (24 files); coverage: auth/RBAC/menu/menu-filter/user/region/farmer/land-parcel/training/production/bulk-upload/report/dashboard/data-analyst/data-completeness/map/map-geo/firms ✅. | Foundation & core features stabil; RPT-03 (#132) selesai, lanjut remediasi audit P0. |

### Decisions Needed

| Keputusan                  | Owner                   | Dibutuhkan Kapan     | Rekomendasi Tech Lead                                                                       |
| -------------------------- | ----------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| ✅ Arah `/admin/master-data` | — (RESOLVED)            | ✅ DONE              | Redirect ke `/admin/master-data/farmers` — **route tersedia & functional**.                 |
| ✅ MD-04 Land Parcel (#88)  | — (RESOLVED)            | ✅ DONE              | Implementasi complete: model, actions, UI, tests, Shapefile bulk upload ✅                   |
| ✅ MD-06 Production (#89) | — (RESOLVED)            | ✅ DONE              | Implementasi complete: ProductionRecord model, CRUD actions, UI, 13 tests, bulk upload ✅ |
| ✅ Dashboard Scope DASH-01 | — (RESOLVED)            | ✅ DONE (#99)        | Main Dashboard snapshot-backed + `dashboard.ts`/`snapshot.ts` sudah diimplementasi & teruji. |
| **Pola restore soft-delete** | Product + Engineering | 2026-07-17 | Audit: list KT menampilkan record nonaktif (bisa restore), list Petani menyembunyikan (tidak bisa restore). Pilih satu pola, seragamkan (`getFarmers` vs `getFarmerGroups`). |
| **Nasib `recharts` & `Dockerfile`** | Engineering Lead | 2026-07-24 | recharts 0 pemakaian (ditunda sampai chart produksi?); Dockerfile tampak tak dipakai pipeline (deploy via SSH build). Hapus atau dokumentasikan. |

### Next Two Weeks (2026-07-10 s.d. 2026-07-24)

| Priority | Target                                      | Output                                                                                                        |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **✅ Done**| **#107 RPT-01: Report Petani**              | Menu Level 1 `report` + sub-menu `report-farmer` + server actions (`report.ts`) + UI + unit tests ✅        |
| **✅ Done**| **#108 RPT-02: Report Pelatihan**           | Sub-menu `report-training` + `report.ts` (`getTrainingReport`) + UI (2 tab) + Excel/PDF export + unit tests ✅        |
| **P0**   | **Remediasi audit 2026-07-10 (keamanan)**   | Guard `hasPermission` di `role-permission.ts`/`menu.ts`/`upload.ts` + scope `getFarmerById`/`bulkCreateFarmers` + menuKey Roles + unit test RBAC — lihat `audit-report/audit-2026-07-10.md` §8 |
| **P1**   | **Lint hijau kembali**                      | eslint ignore `scripts/**` + bereskan `no-unused-vars` (32) + cicil `no-explicit-any` di `src/` |
| **✅ Done**| **#132 RPT-03: Report Produksi**            | Sub-menu `report-production` + `report.ts` (`getProductionReport`) + matriks bulanan per petani/lahan + filter rentang bulan + Excel + PDF landscape export + unit tests ✅ |

</details>

---

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
| ------- | --------------------------- | ---------------------------------------------- |
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
| **RBAC Pattern** | hasPermission backend validation | **5 celah**: `role-permission.ts`, `menu.ts`, `upload.ts` tanpa guard; scope absen `getFarmerById`/`bulkCreateFarmers`; + helper select tanpa guard | ❌ **FAIL — P0** | audit §2 |
| **Soft Delete** | isActive field @default(true) | Semua model (join-table assignment by design tanpa isActive) | ✅ PASS | audit §3 |
| **Data Filtering** | Filter isActive: true in queries | `getFarmerGroups/ById` tanpa filter isActive level KT; inkonsistensi pola restore KT vs Petani | 🟠 PARTIAL | audit §3.2 |
| **UI/UX** | Loading state (loading.tsx) | 4 halaman tabel belum punya (training, settings/menu, report ×2) | 🟠 PARTIAL | audit §4 U-4 |
| **UI/UX** | Shadcn UI + Tailwind | Dipakai konsisten; DataTable/TableActions shared 100% patuh | ✅ PASS | audit §4 |
| **UI/UX** | Table Actions positioning | Patuh di semua list KECUALI `menu-list-client.tsx` (kanan, tanpa gating izin) | 🟠 PARTIAL | audit §4 U-1/U-2 |
| **Issue Workflow** | QA gates (test/build/lint) | Test 311 ✅ · build ✅ · **lint ❌ 229 masalah (193 error)** | ❌ **FAIL** | audit §1 |

**Summary:** **7 PASS · 4 PARTIAL · 3 FAIL** — fondasi arsitektur sehat, tetapi klaim lama "14/14 fully compliant" tidak lagi berlaku. Remediasi P0/P1 terjadwal di Sprint Focus.



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
| OPS-01      | Testing                      | 🟠 Partial     | Later   | Vitest: **24 test files / 311 passing tests** ✅; coverage: auth/RBAC/menu/menu-filter/user/region/farmer/land-parcel/training/production/bulk-upload/report/dashboard/data-analyst/data-completeness/map/map-geo/firms/middleware/perf | RPT-03 (#132) ✅ tercakup; gap tersisa: integration test route hotspot |
| OPS-02      | DevOps & Deployment          | 🟠 Partial     | Later   | Dockerfile, deploy workflows, security scan workflows (`gitleaks.yml`, `semgrep.yml`)                     | Verify deployment, env matrix, rollback, and CI status                           |

</details>

---

<details>
<summary><strong>3. Current Sprint & Issue Control</strong> — pekerjaan aktif developer</summary>

## 3. Current Sprint & Issue Control

Section ini dipakai developer untuk tahu apa yang harus dikerjakan sekarang. Karena progress sekarang disesuaikan dengan code, prioritas sprint difokuskan ke gap yang terbukti ada.

### Sprint Focus

| Priority | ID / Phase   | Tujuan                                 | Evidence                                                                                      | Next Action                                                              |
| -------- | ------------ | -------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **P0**   | AUDIT-P0     | **Remediasi keamanan audit 2026-07-10 (#125)** | 5 celah guard/scope server action + menuKey Roles keliru — `audit-report/audit-2026-07-10.md` §2 & §8 | Tambah `hasPermission` (`role-permission.ts`, `menu.ts`, `upload.ts`) + scope (`getFarmerById`, `bulkCreateFarmers`) + `requirePermission("settings-roles")` + unit test RBAC |
| **P1**   | AUDIT-P1     | Lint hijau kembali (gate QA) (#126)    | `npm run lint` ❌ 229 masalah (193 error); `scripts/**` ikut ter-lint                          | eslint ignore `scripts/**` → hapus unused vars (32) → cicil `no-explicit-any` di src |
| P2       | AUDIT-P2     | Cleanup dead code & deps (#129)        | 1 file lib + 6 komponen + 5–9 dependency mati (audit §5 & §8 P2)                              | PR terpisah: hapus deps/file mati, konsolidasi helper duplikat |

### Active Issues / Work Items

| Work Item                                        | Phase   | Status      | Assignee | Target | Next Action                                                                              |
| ------------------------------------------------ | ------- | ----------- | -------- | ------ | ---------------------------------------------------------------------------------------- |
| **🔴 #125 AUDIT-P0: Remediasi guard/scope RBAC** | —       | 🔲 Todo     | TBD      | ASAP   | 6 item P0 di `audit-report/audit-2026-07-10.md` §8 (role-permission, menu, upload, farmer scope, bulk scope, menuKey Roles) |
| **🟠 #126/#127/#128 AUDIT-P1: Lint + scope by-id/restore + konvensi UI** | — | 🔲 Todo | TBD | 07-17 | eslint ignore scripts/** + unused vars + any; menu-list-client gating/TableActions; farmer-form-modal Combobox; 4 loading.tsx |
| **✅ BUG-001: fix redirect** — COMPLETE         | —       | ✅ Done     | -        | —      | `/admin/master-data` → `/admin/master-data/farmers` ✅                                   |
| **✅ BUG-002: stale scripts** — COMPLETE        | —       | ✅ Done     | -        | —      | Debug/stale scripts moved to `scripts/local/` (gitignored) ✅                            |
| **✅ MD-04: Land Parcel** — COMPLETE (#88)      | MD-04   | ✅ Done     | -        | —      | Model, actions, UI, Shapefile bulk upload, 14 tests ✅                                   |
| **✅ MD-06: Production** — COMPLETE (#89)       | MD-06   | ✅ Done     | -        | —      | ProductionRecord model, CRUD actions, UI, 13 tests, bulk upload ✅                       |
| **✅ #103: DA-01 Data Analyst** — COMPLETE      | DA-01   | ✅ Done     | -        | —      | Ringkasan Petani menu, server actions, client pages, Excel export, 4 unit tests ✅       |
| **✅ #118: DA-02 Data Analyst** — COMPLETE      | DA-02   | ✅ Done     | -        | —      | Analisa Ketersediaan Data KT: health score + 5 section collapsible (anomali per master data), pure logic, scope-checked actions, multi-sheet Excel, 23 unit tests ✅ |
| **✅ #68 Bulk Upload Menu & Route**             | BULK-01 | ✅ Done     | -        | —      | Menu seed + route + parent redirect ✅                                                   |
| **✅ #76 BULK-03: Bulk Upload Farmer**          | BULK-03 | ✅ Done     | -        | —      | Dynamic column mapping, smart validation, preview, export, bulk insert ✅                |
| **⏸️ DASH-01 Scope Blocking** (CRITICAL)        | DASH-01 | 🔴 Open     | TBD      | URGENT | **MUST DEFINE SCOPE** — wireframe, metrics, filters, summary cards                       |
| **✅ #107 RPT-01: Report Petani**              | RPT-01  | ✅ Done     | -        | —      | Menu, server actions, UI, Excel & PDF export, unit tests ✅ |
| **✅ #108 RPT-02: Report Pelatihan**           | RPT-02  | ✅ Done     | -        | 07-06  | Halaman `/admin/report/training` + 6 cards + 2 tab + Excel export + PDF export & filter + unit tests |
| **✅ #132 RPT-03: Report Produksi**             | RPT-03  | ✅ Done     | -        | 07-11  | `report.ts` (`getProductionReport`) + `lib/report-production.ts` + halaman `/admin/report/production` matriks bulanan + Excel + PDF landscape + 14 unit test |
| #69 Bulk Upload KT — CSV Validasi Preview Insert | BULK-01 | 🔲 Todo     | TBD      | TBD    | CSV upload + Zod validasi + preview + bulk insert; depends #68                           |
| #70 Bulk Upload Region — CSV Hierarchy Validasi  | BULK-02 | 🔲 Todo     | TBD      | TBD    | CSV upload per level + hierarchy validasi; depends #68 #69                               |
| **✅ #71 Refactor Tabel ke DataTable + Export** | PLATFORM-06 | ✅ Done | TBD | 06-07 | **Complete** — DataTable refactor + column visibility + Excel export |
| **✅ #72 Farmer Schema & Migration**             | MD-03              | ✅ Done | -        | 06-07  | `prisma/schema/farmer.prisma` — model, enums, relations, seeder   |
| **✅ #88 MD-04: Land Parcels Full Implementation** | MD-04           | ✅ Done | -        | 06-14  | **Complete** — LandParcel model + CRUD actions (165 LOC) + Shapefile bulk upload (222 LOC) + UI (list/detail/form with MapLibre polygon viewer) + Zod validation + 14 unit tests + menu seeding + full RBAC. Features: geolocation (lat/long + GeoJSON polygon), revision tracking, area calculation, planting year, ZIP Shapefile bulk upload with auto column mapping & geometry validation |
| **✅ #73 Farmer Server Actions & Validation**    | MD-03              | ✅ Done | -        | 06-07  | `src/server/actions/farmer.ts` + Zod schemas + 10 unit tests ✅   |
| **✅ #74 Farmer UI (List/Detail/Form)**          | MD-03              | ✅ Done | -        | 06-07  | Routes: `/admin/master-data/farmers` (list/detail/create/edit)    |
| **✅ #75 Farmer RBAC & Menu Integration**        | MD-03              | ✅ Done | -        | 06-07  | RBAC filter by district/group; sidebar menu registration          |
| #74 Farmer UI - List, Form, Menu                | MD-03              | ✅ Done | -        | 06-07  | `page.tsx`, `farmer-list-client.tsx`, `farmer-form-modal.tsx`, `[id]/page.tsx`, `loading.tsx`, menu entry CSV |
| #75 Update Documentation & Progress Tracking    | MD-03              | ✅ Done | -        | 06-07  | progress.md diupdate: Phase Status, Active Issues, Snapshot, Audit Evidence, Changelog |
| **✅ #77 Training Schema & Migration**          | MD-05              | ✅ Done | -        | 06-10  | `prisma/schema/training.prisma` — TrainingPackage, TrainingActivity, TrainingParticipant + enum TrainingCategory + migration + seed |
| **✅ #78 Training Server Actions & Validation** | MD-05              | ✅ Done | -        | 06-10  | `src/server/actions/training.ts` — 10 server actions + `training-activity.schema.ts` Zod + RBAC access context + 16 unit tests |
| **✅ #79 Training UI - List, Detail, Form**     | MD-05              | ✅ Done | -        | 06-10  | `training-list-client.tsx` DataTable + `training-form-modal.tsx` + `[id]/training-detail-client.tsx` + Excel export |
| **✅ #80 Training Participants Management**     | MD-05              | ✅ Done | -        | 06-10  | `add-participants-modal.tsx` — dual-panel farmer search + add/remove participants + upload peserta via Excel/CSV + 3-tier validation |
| **✅ #81 Training Evidence Upload (S3)**        | MD-05              | ✅ Done | -        | 06-11  | `src/server/actions/upload.ts` — S3 presigned upload + evidence PDF field in schema + form modal + detail page link |
| **✅ #82 Update Documentation & Progress**      | MD-05              | ✅ Done | -        | 06-11  | progress.md updated: Phase Status MD-05 Done, Active Issues #77-#82, Changelog, Code Audit Evidence |
| #86 Tambah Field Tahun Bergabung (joinedYear)   | MD-03              | ✅ Done | -        | 06-10  | Schema + validation + CRUD + UI + bulk upload + tests; field optional Integer 1900-2100 |
| **✅ #87 Hierarchical Menu (3-Level)**          | PLATFORM-07        | ✅ Done | -        | 06-14  | Support 3-level menu struktur: sidebar render, RBAC inheritance, menu mgmt UI, validation depth max 3 |

### Issue Workflow

```mermaid
flowchart LR
    TODO["🔲 Todo"] --> IP["🟡 In Progress"]
    IP --> RV["🔍 Review"]
    RV --> DONE["✅ Done"]
    RV --> IP
```

| Workflow       | Label GitHub         | Arti                                   | Efek ke Phase Status                              |
| -------------- | -------------------- | -------------------------------------- | ------------------------------------------------- |
| 🔲 Todo        | `status:todo`        | Siap dikerjakan, belum aktif           | Fase tetap Not Started / Planned                  |
| 🟡 In Progress | `status:in-progress` | Sedang dikerjakan                      | Fase menjadi In Progress / Partial                |
| 🔍 Review      | `status:review`      | Selesai coding, menunggu QA / approval | Fase tetap In Progress / Partial                  |
| ✅ Done        | `status:done`        | Selesai dan merged                     | Fase bisa Done jika completion criteria terpenuhi |

### Issue Convention

Format judul:

```text
[Phase-Code] Deskripsi singkat dalam Bahasa Indonesia
```

Contoh:

```text
[BUG] Fix redirect /admin/master-data ke route yang valid
[DASH-01] Dashboard basic untuk summary data existing
[MD-03] Prisma schema & migration untuk Farmer
[MD-03] Farmer list, detail, dan form
```

Label wajib:

| Label      | Contoh                               | Wajib?             | Catatan                                           |
| ---------- | ------------------------------------ | ------------------ | ------------------------------------------------- |
| `phase`    | `phase:MD-03`                        | Ya                 | Harus sama dengan Phase Status jika terkait phase |
| `status`   | `status:todo`                        | Ya                 | Harus mengikuti Issue Workflow                    |
| `type`     | `type:feat`, `type:bug`, `type:debt` | Ya                 | Minimal satu type                                 |
| `priority` | `priority:P0`, `priority:P1`         | Untuk sprint aktif | Dipakai untuk sorting pekerjaan                   |

</details>

---

<details>
<summary><strong>4. Technical Debt & Bug Register</strong> — risiko teknis aktual</summary>

## 4. Technical Debt & Bug Register

Debt/bug di section ini berasal dari audit code. Item masuk sprint jika sudah punya owner, priority, dan definition of done.

### Bug Register

| ID      | Bug                                                                         | Priority | Evidence                                                                                                                                                            | Owner | Status  | Definition of Done                                                  |
| ------- | --------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------- |
| BUG-001 | `/admin/master-data` redirect ke route missing `/admin/master-data/farmers` | P0       | `src/app/(admin)/admin/master-data/page.tsx`                                                                                                                        | -   | ✅ Done | Redirect ke `/admin/master-data/farmers` — route exists & functional |
| BUG-002 | Dashboard debug scripts import action yang tidak ada                        | P0       | `scripts/debug/debug-dashboard-data.js`, `scripts/debug/test-dashboard-api.js`, `scripts/debug/perf-dashboard.ts` import `src/server/actions/dashboard` (tidak ada) | -   | ✅ Done (2026-06-22) | Debug scripts dipindah ke `scripts/local/` (gitignored) — tidak ada di repo/CI. |
| BUG-003 | Server actions tanpa guard `hasPermission`: `role-permission.ts` (toggle/get — **privilege escalation**), `menu.ts` (create/update/delete), `upload.ts` (S3 write) | **P0** | Audit 2026-07-10 — `audit-report/audit-2026-07-10.md` §2 H-1/H-2/H-3 · **Issue #125** | TBD | 🔲 Open | Guard semua action + unit test RBAC; tolak override role SUPERADMIN di role-permission |
| BUG-004 | Scope `getAccessContext` absen: `farmer.ts getFarmerById` (PII lintas scope) & `bulk-upload.ts bulkCreateFarmers` (insert ke KT luar scope); mutasi by-id farmer/group/training juga tanpa cek scope | **P0** | Audit 2026-07-10 §2 H-4/H-5 + §3 M-1 · **Issue #125** (MED by-id: #127) | TBD | 🔲 Open | Terapkan pola scope dari `land-parcel.ts:68` / `bulk-upload-production.ts:69-88` |
| BUG-005 | Halaman Role & Permission di-guard `requirePermission("settings-users")` padahal menu key = `settings-roles` → user ber-grant `settings-roles` melihat menu tapi ditolak halamannya | P1 | `settings/roles/page.tsx:7` vs `menu.csv` · **Issue #125** | TBD | 🔲 Open | Selaraskan ke `settings-roles` (page + actions role-permission) |
| BUG-006 | Gate QA lint merah: `npm run lint` 229 masalah (193 error) — mayoritas `no-explicit-any` + `scripts/` (gitignored) ikut ter-lint | P1 | Audit 2026-07-10 §1 · **Issue #126** | TBD | 🔲 Open | eslint ignore `scripts/**` + bereskan unused-vars + cicil any |

### Debt Register

| ID     | Debt Item                                                           | Priority | Evidence                                                                                     | Owner                 | Status                     | Validation Method                                                |
| ------ | ------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- | --------------------- | -------------------------- | ---------------------------------------------------------------- |
| TD-001 | S3/PDF utility belum terintegrasi ke modul Training                 | P1       | Training + evidence upload S3 sudah terintegrasi via `upload.ts` (#81); CLI `get-link`/`pdf-manager` tetap sebagai utilitas | Backend/Storage Lead  | ✅ Closed (2026-07-10, audit) | Evidence upload berfungsi di app; sisa: CLI tak load dotenv (TD-011) |
| TD-002 | Hardcoded `text-white` perlu visual audit                           | P2       | Ada di login, footer, user menu access modal; sebagian mungkin valid karena background solid | Frontend Lead         | 🔲 Planned                 | Visual QA dark/light mode tanpa contrast regression              |
| TD-003 | `.DS_Store` tidak tracked, tetapi masih ada di working tree         | P2       | `git ls-files` kosong; `find` menemukan file lokal                                           | Repository Maintainer | ✅ Closed for git tracking | `.DS_Store` tetap ignored dan tidak masuk git                    |
| TD-004 | Language toggle / i18n belum ada                                    | P2       | Tidak ada locale switch/persistence                                                          | i18n Lead             | 🔲 Planned                 | Toggle mengubah locale dan persist state antar navigasi          |
| TD-005 | Dashboard cache/debug scripts tampak berasal dari implementasi lama | P1       | Script menyebut dashboard stats/markers/batches yang tidak ada di source action              | -      | ✅ Closed (2026-06-22)     | Debug scripts dipindah ke `scripts/local/` (gitignored). Tidak ada di repo/CI. |
| TD-006 | `docs/rule.md` menyebut folder dashboard components yang tidak ada  | P2       | Tree arsitektur rule.md sudah disinkronkan (audit 2026-07-10): `components/dashboard` dihapus, `hooks/`+`api/` ditambah | Tech Lead             | ✅ Closed (2026-07-10, audit) | Docs arsitektur sinkron dengan struktur repo                     |
| TD-007 | Inkonsistensi soft-delete/restore: `getFarmerGroups/ById` tanpa filter `isActive` level KT, sebaliknya `getFarmers` menyembunyikan petani nonaktif sehingga tak bisa di-restore dari UI | P1 | `farmer-group.ts:23,75` vs `farmer.ts:11` — audit 2026-07-10 §3.2 · **Issue #127** | Backend Lead + Product | 🔲 Planned | Putuskan satu pola (tampilkan nonaktif + badge + toggle Aktifkan, atau sembunyikan total) lalu seragamkan |
| TD-008 | Form data parsing berpotensi `NaN` pada field kosong/whitespace     | P2       | `src/app/(admin)/admin/master-data/groups/group-form-modal.tsx`                              | Frontend Lead         | 🔲 Planned                 | Gunakan helper untuk memproses string kosong/whitespace sebelum parsing numerik          |
| TD-009 | Dead code & deps: `lib/constants.ts`, 6 komponen ui/layout tak terpakai (`alert`, `breadcrumb`, `form`, `scroll-area`, `sonner`, `placeholder-page`), deps 0-usage (`@dnd-kit`×3, `recharts`, `adm-zip`, `react-hook-form`+`@hookform/resolvers`, `ts-node`, `@types/sharp`), export mati (`isS3Key`), duplikasi helper (`getFarmerGroupsForSelect`/`getFarmersForSelect` ×2, ternary accessFilter ±25×) | P2 | Audit 2026-07-10 §5 & §8 P2 · **Issue #129** | Engineering | 🔲 Planned | PR cleanup terpisah; konsolidasi helper `farmerAccessFilter` di `access-context.ts` |
| TD-010 | Audit fields tidak diisi di sebagian mutasi (`user.ts`, `menu.ts`, `role-permission.ts`, toggle region, assignment) + return `ActionResult` ad-hoc | P2 | Audit 2026-07-10 §3.4 & LOW · **Issue #130** (ActionResult: #129) | Backend Lead | 🔲 Planned | Isi `createdBy`/`modifiedBy` konsisten; standardisasi `ActionResult<T>` |
| TD-011 | Env & tooling drift: `FIRMS_MAP_KEY_FREE` tidak ada di `.env.example`; `.dockerignore` tidak exclude `.env`; CLI `get-link`/`pdf-manager` tidak load dotenv; `NEXT_PUBLIC_S3_PUBLIC_URL` tak terpakai | P2 | Audit 2026-07-10 §6 · **Issue #129** | DevOps | 🔲 Planned | Tambah placeholder env, exclude `.env` di dockerignore, `require("dotenv/config")` di 2 CLI |
| TD-012 | Identifier Bahasa Indonesia di code (`computePetaniDomain` dkk, field types `totalPetani`…) vs rule "variable English" | P3 | Audit 2026-07-10 §5 · **Issue #130** | Tech Lead | 🔲 Planned | Rename bertahap ATAU resmikan istilah domain sebagai pengecualian di rule.md |

### Debt Sequencing

| Waktu                | Fokus                  | Catatan                                                    |
| -------------------- | ---------------------- | ---------------------------------------------------------- |
| Immediate / P0       | **BUG-003, BUG-004**   | Celah guard/scope RBAC (audit 2026-07-10) — remediasi sebelum fitur baru |
| Sprint berjalan / P1 | BUG-005, BUG-006, TD-007 | menuKey Roles, lint hijau, keputusan pola restore          |
| Later / P2–P3        | TD-002, TD-004, TD-008, TD-009, TD-010, TD-011, TD-012 | Cleanup dead code/deps, audit fields, env drift, naming    |

</details>

---

## Referensi Dokumen

- **Riwayat & Decision Log** → [`progress-changelog.md`](./progress-changelog.md) — changelog per bulan, keputusan, perintah audit.
- **Panduan update & checklist** → [`contributing.md`](./contributing.md) — Junior Dev Guide, urutan implementasi, quality gates, common pitfalls.
- **Standar teknis** → [`rule.md`](./rule.md) · **Skema DB** → [`database-schema.md`](./database-schema.md) · **UI/UX flow** → [`ui-ux-flow.md`](./ui-ux-flow.md).
