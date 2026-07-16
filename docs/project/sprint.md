# Proyek — Sprint & Issue Control

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [roadmap.md](./roadmap.md) · [tech-debt.md](./tech-debt.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

<details>
<summary><strong>3. Current Sprint & Issue Control</strong> — pekerjaan aktif developer</summary>

## 3. Current Sprint & Issue Control

Section ini dipakai developer untuk tahu apa yang harus dikerjakan sekarang. Karena progress sekarang disesuaikan dengan code, prioritas sprint difokuskan ke gap yang terbukti ada.

### Sprint Focus

| Priority | ID / Phase   | Tujuan                                 | Evidence                                                                                      | Next Action                                                              |
| -------- | ------------ | --------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ✅ **P0** | AUDIT-P0     | **Remediasi keamanan audit 2026-07-10 (#125) — ✅ Done 2026-07-12** | 5 celah guard/scope server action + menuKey Roles **ditutup** — `audit-report/audit-2026-07-10.md` §2 & §8 | Selesai: guard `hasPermission` + scope `getAccessContext` + `requirePermission("settings-roles")` + 17 test RBAC/perf. Lanjut ke #126/#127. |
| ✅ **P1** | AUDIT-P1     | **Lint hijau kembali (gate QA) (#126) — ✅ Done 2026-07-12** | `npm run lint` **exit 0** (0 error; 3 warning `exhaustive-deps` ditahan) — dari 229 masalah/193 error | Selesai: ignore `scripts/**` + unused-vars/prefer-const dibersihkan + `no-explicit-any` diganti tipe nyata + react-hooks set-state/static-components diperbaiki tanpa disable; build ✅ / test 25·328 ✅ |
| ✅ **P2** | AUDIT-P2     | **Cleanup dead code & deps (#129) — ✅ Done 2026-07-12** | 9 deps 0-usage + 7 file mati dihapus; helper "for select" dikonsolidasi; env/tooling drift diberesi (TD-009/011 ✅, TD-010 sebagian) | Selesai: gate lint 0 / build ✅ / test 26·349 ✅. Sisa `ActionResult` (`fieldErrors`) + audit fields → #130 |
| ✅ **P3** | AUDIT-P3     | **Kualitas berkelanjutan (#130) — ✅ Done 2026-07-12** | audit fields (TD-010b ✅) + Zod `addParticipants`/`changePassword` + keputusan naming (TD-012 ✅) + rename `land-parcel.ts` + font brand WRI | Selesai: gate lint 0 / build ✅ / test 26·349 ✅. Ditunda (sesuai issue): pemecahan file besar §5, `ActionResult` `fieldErrors` (TD-010 follow-up) |

### Active Issues / Work Items

| Work Item                                        | Phase   | Status      | Assignee | Target | Next Action                                                                              |
| ------------------------------------------------ | ------- | ----------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **✅ #125 AUDIT-P0: Remediasi guard/scope RBAC** — COMPLETE | —       | ✅ Done     | -      | 2026-07-12 | 6 item P0 selesai (role-permission, menu, upload, farmer scope, bulk scope, menuKey Roles) + 17 test RBAC/perf; gate `npm test` 328 ✅ / build ✅ |
| **✅ #127 AUDIT-P1: scope by-id + pola restore soft-delete** — COMPLETE | — | ✅ Done | - | 2026-07-12 | Scope by-id KT/pelatihan/lahan + guard helper "for select" + fix collision `AND`; pola restore seragam (badge + filter Status + toggle Aktifkan) di semua list master data; 18 test lintas-scope; gate lint 0 / test 346 ✅ / build ✅ |
| **✅ #128 AUDIT-P1: konvensi UI** — COMPLETE | — | ✅ Done | - | 2026-07-12 | menu-list-client gating izin + `<TableActions>` + Aksi kolom kiri + `<DeleteDialog>`; farmer-form-modal KT → searchable Combobox; 4 `loading.tsx` (`<TableSkeleton>`); kosmetik skeleton/snapshot Card; gate lint 0 / test 349 ✅ / build ✅ |
| **✅ #129 AUDIT-P2: cleanup dead code/deps** — COMPLETE | — | ✅ Done | - | 2026-07-12 | 9 deps 0-usage + 7 file mati dihapus (`csv-parse`/`sharp`→devDeps); `isS3Key`/`DASHBOARD_PACKAGE_CODES`/`FarmerSelect` dibereskan; helper "for select" → `src/lib/select-options.ts` ber-guard; `ActionResult` `{granted}`/`{count}`→`data`; env/tooling (`.env.example`/`.dockerignore`/dotenv/pdf-manager). TD-009/011 ✅, TD-010 sebagian. Gate lint 0 / test 349 ✅ / build ✅. Ditunda → #130: `error: fieldErrors`, audit fields |
| **✅ #130 AUDIT-P3: kualitas berkelanjutan** — COMPLETE | — | ✅ Done | - | 2026-07-12 | Audit fields `createdBy`/`modifiedBy` diisi (user/menu/role-permission/region-toggle/user-data-access/user-menu-access + `toggleFarmerActive`); Zod `addParticipants` (`addParticipantsSchema`) + `changePassword` (`profile.schema.ts`); keputusan naming = **resmikan istilah domain** di `code-standards.md` (TD-012 ✅); rename `land-parcel.types.ts`→`land-parcel.ts`; font brand **WRI Acumin Pro Condensed** (`@font-face` self-host + fallback Arial, Geist Sans dilepas). Ditunda: pemecahan file besar §5, `ActionResult` `fieldErrors`. Gate lint 0 / test 349 ✅ / build ✅ |
| **✅ BUG-001: fix redirect** — COMPLETE         | —       | ✅ Done     | -        | —      | `/admin/master-data` → `/admin/master-data/farmers` ✅                                   |
| **✅ BUG-002: stale scripts** — COMPLETE        | —       | ✅ Done     | -        | —      | Debug/stale scripts moved to `scripts/local/` (gitignored) ✅                            |
| **✅ MD-04: Land Parcel** — COMPLETE (#88)      | MD-04   | ✅ Done     | -        | —      | Model, actions, UI, Shapefile bulk upload, 14 tests ✅                                   |
| **✅ MD-06: Production** — COMPLETE (#89)       | MD-06   | ✅ Done     | -        | —      | ProductionRecord model, CRUD actions, UI, 13 tests, bulk upload ✅                       |
| **✅ #103: DA-01 Data Analyst** — COMPLETE      | DA-01   | ✅ Done     | -        | —      | Ringkasan Petani menu, server actions, client pages, Excel export, 4 unit tests ✅       |
| **✅ #118: DA-02 Data Analyst** — COMPLETE      | DA-02   | ✅ Done     | -        | —      | Analisa Ketersediaan Data KT: health score + 5 section collapsible (anomali per master data), pure logic, scope-checked actions, multi-sheet Excel, 23 unit tests ✅ |
| **✅ #68 Bulk Upload Menu & Route**             | BULK-01 | ✅ Done     | -        | —      | Menu seed + route + parent redirect ✅                                                   |
| **✅ #76 BULK-03: Bulk Upload Farmer**          | BULK-03 | ✅ Done     | -        | —      | Dynamic column mapping, smart validation, preview, export, bulk insert ✅                |
| **✅ DASH-01 Scope Blocking** — RESOLVED        | DASH-01 | ✅ Done     | -        | —      | Scope terdefinisi & terimplementasi via #99 (Main Dashboard snapshot-backed); baris ini sempat tertinggal berstatus Open |
| **✅ #107 RPT-01: Report Petani**              | RPT-01  | ✅ Done     | -        | —      | Menu, server actions, UI, Excel & PDF export, unit tests ✅ |
| **✅ #108 RPT-02: Report Pelatihan**           | RPT-02  | ✅ Done     | -        | 07-06  | Halaman `/admin/report/training` + 6 cards + 2 tab + Excel export + PDF export & filter + unit tests |
| **✅ #132 RPT-03: Report Produksi**             | RPT-03  | ✅ Done     | -        | 07-11  | `report.ts` (`getProductionReport`) + `lib/report-production.ts` + halaman `/admin/report/production` matriks bulanan + Excel + PDF landscape + 14 unit test |
| **✅ #144 MAP-02: Peta BMP (Ketersediaan Data)** | MAP-02  | ✅ Done     | -        | 07-13  | `/admin/map/bmp` peta tematik 4 kategori (run bulan berturut); `getBmpMapData` (RBAC 3-layer, groupBy `_sum` scoped, no N+1) + helper murni `longestConsecutiveMonths`/`productionAvailabilityCategory` (+ambang) + `buildBmpMapData`; poligon-only + label + popup grafik; Cetak PDF landscape + Download Excel matriks (+Status/Luas); panel kiri/kanan minimizable + Zoom-ke-semua. **Fix scope-leak** `getBmpMapData` (→`AND`); catat **BUG-007** (pola sama `getMapData`). +16 unit +2 perf. Seed `map-bmp` dijalankan (approval). Gate lint 0 / test 377 / build ✅ |
| **✅ #146: hierarki kelembagaan + sub-kelompok interim per-lahan** | MD-04 / TD-014 | ✅ Done | - | 2026-07-14 | `FarmerGroup` = Lembaga Petani (mislabel); `LandParcel.subGroupLv1` (Gapoktan) + `subGroupLv2` (Kelompok Tani) nullable **per-lahan** + migrasi additif; form/detail lahan; +field `blok` (blok kebun). Gate lint 0 / test 380 / build ✅ |
| **✅ #147 TD-013: relabel "Kelompok Tani"→"Lembaga Petani"** | — | ✅ Done | - | 2026-07-14 | Sweep ~56 file `src/**` + label UI "KT" + `menu.csv` + label menu DB (1 baris terarah); identifier/menu-key/`subGroupLv2` tetap; docs disinkronkan; fix filter Tahun "all"→"Semua Tahun". Gate lint 0 / test 380 / build ✅ |
| **✅ #148 DASH: Card "Total Kelompok Tani" (distinct `subGroupLv2`)** | DASH-05 | ✅ Done (closed) | - | 2026-07-14 | **Kode ✅** — agregasi distinct `subGroupLv2` **per Lembaga** (ternormalisasi trim/case, null diabaikan, year-independent) di `dashboard-aggregation.ts` (`KTDetails.kelompokTaniCount` + `stats.totalKelompokTaniLahan`; `sumKelompokTaniStats`/`scopeSnapshotData`/`normalizeSnapshotData` ikut) + select `subGroupLv2` di `dashboard-query.ts` + kartu "Total Kelompok Tani" di `summary-cards.tsx` + kolom di tabel snapshot list & detail per-Lembaga + 2 unit. **Generate:** filter Distrik/Tahun **dinonaktifkan** (`FILTERS_ENABLED=false`) = Semua Data; kolom Distrik/Tahun list **default hidden**. Snapshot-backed: **kartu 0 sampai snapshot baru di-generate** (belum regen; DB) + data `subGroupLv2` (#150). Retro + **issue closed**. Gate lint 0 / build / test 398 ✅ |
| **✅ #149 Master Lahan: kolom Gapoktan/KT/Blok di list + Excel** | MD-04 | ✅ Done | - | 2026-07-14 | Kolom `subGroupLv1`/`subGroupLv2`/`blok` (default hidden, toggleable) + ikut Excel export; fix bug export "Lembaga Petani" (`groupName`→`farmerGroupName`). Filter KT opsional ditunda (data belum ada). Gate lint 0 / test 381 / build ✅ |
| **✅ #150 Bulk Upload Lahan: mapping shapefile → Gapoktan/KT/Blok** | MD-04 / BULK | ✅ Done | - | 2026-07-15 | 3 field opsional baru di mapping bulk upload Lahan: `subGroupLv1` (Gapoktan/KUD) / `subGroupLv2` (Kelompok Tani) / `blok` — auto-match alias `.dbf` (gapoktan/kud/poktan/kt/blok/dll) via pure `lib/parcel-bulk-mapping.ts` (`autoMatchColumns` + `normalizeAttr` trim→null, +7 unit), preview tabel + download Excel + payload save; nullable (tak memblokir impor); field ikut revision-tracking (spread `...record`). Gate lint 0 / build / test 405 ✅ |
| **✅ #152 Master Petani: KT/Gapoktan turunan (dari lahan)** | MD-03 | ✅ Done | - | 2026-07-15 | Detail Petani: badge **Gapoktan/KUD** + **Kelompok Tani** = distinct `subGroupLv1`/`subGroupLv2` lahan **aktif** (read-only, multi-nilai, "—" bila kosong) via pure `lib/farmer-sub-groups.ts` (normalisasi trim+case konsisten #154, +6 unit +1 perf); `getFarmerById` include `landParcels` aktif (1 query, no N+1). Kolom list (opsional) **sengaja di-skip** (payload utk kolom default-hidden) → follow-up bila dibutuhkan. Gate lint 0 / build / test ✅ |
| **✅ #160 Lembaga Petani: Tipe Grup + split Tahun + Sertifikasi RSPO + kode ICS→ISH** | MD-02 | ✅ Done (closed) | - | 2026-07-15 | 4 kolom nullable `FarmerGroup` (migrasi `20260715040235`): `groupType` (ASOSIASI/KOPERASI, terpisah dari `category`), `establishedYear` ("Tahun Berdiri"; `joinYear` = "Tahun Bergabung Program"), `rspoCertYear`+`rspoCertStatus` (Int+enum, bukan string; status boleh tanpa tahun → "Tersertifikasi"/"Plan 2026" via `lib/farmer-group-labels.ts`). `DataTable` +`sortValue` (sort kustom RSPO) + fix key export Excel. **Data fix**: `code` 31 lembaga ICS→ISH (PK `id` tetap) + data 31 lembaga diisi dari tabel WRI/Unilever (18 Asosiasi/13 Koperasi, 9 CERTIFIED, 2 PLANNED). Retro + **closed**. Gate lint 0 / build / test 405 ✅ |
| **✅ #166 DASH-04: BMP Dashboard (Produksi) — snapshot-backed + tools generate** | DASH-04 | ✅ Done | - | 2026-07-15 | `/admin/dashboard/bmp` — 4 card produksi + combo chart produksi/% lahan melapor (sumbu Y adaptif tick bulat, stretch) + panel Ketersediaan Data 4 kategori (reuse MAP-02) + **filter global Kategori|Distrik|Lembaga|Tahun (default Rataan)|Kelengkapan Data (Semua⇄Full 1 Tahun)** (revisi owner; Rataan = rata-rata per tahun; Full = subset lahan lengkap 12 bulan per tahun, snapshot +monthlyFull/byYearFull) client-side dari snapshot org-wide; **Produktivitas = Ton/Ha per tahun** (Σ produksi ÷ Σ luas melapor per tahun). Model `BmpDashboardSnapshot` (migration `20260715081831` applied) + grain per-Lembaga (`monthly`+`byYear`+availability+totals) `lib/bmp-dashboard-aggregation.ts` + actions RBAC 3 lapis + tools `/admin/tools/snapshot-bmp` + seed menu/permission (dijalankan, approval owner) + rename menu "BMP Dashboard (Produksi)". Monev BMP = follow-up. +27 unit +2 perf +5 unit filter Kelengkapan Data; gate lint 0 / build / **test 441** ✅. Verifikasi visual owner ✅ → retro + **closed** 2026-07-15. Sisa operasional: regenerate snapshot (pra-`byYear`/`monthlyFull` tampil 0 di filter Tahun & mode Full) |
| **✅ #169 Lembaga Petani: Sertifikasi ISPO + Assurance SAP/MAP + card sertifikasi Main Dashboard** | MD-02 / DASH | ✅ Kode done | - | 2026-07-16 | 4 kolom nullable `FarmerGroup` (`ispoCertYear/Status`, `sapMapAssuranceYear/Status`; enum generik `CertStatus`, migrasi `20260716031500` **applied** approval owner); Zod seragam 3 skema; formatter bersama `formatCertStatus`; form/list (+`sortValue`, TD-015)/detail/Excel. Main Dashboard +3 card sertifikasi snapshot-backed (status per Lembaga di `KTDetails` + `certStats`, scoping-aware; snapshot lama → 0 sampai regenerate). +11 unit. Gate lint 0 / build / test 452 ✅. Sisa: isi data sertifikasi + regenerate snapshot + retro sebelum close |
| **✅ #170 Form Lembaga Petani: layout per section** | MD-02 | ✅ Kode done | - | 2026-07-16 | 15 field → 5 section ber-heading (Identitas/Klasifikasi/Tahun/Sertifikasi & Assurance/Lokasi), dialog 640px + scroll; fix trigger Select raw value → `items` mapping (Base UI); placeholder+min/max input tahun. Markup-only, payload tetap. Gate lint 0 / build / test 452 ✅. Sisa: verifikasi visual owner + retro sebelum close |
| **✅ #171 Detail Lembaga Petani: profil 360° (Fase 1)** | MD-02 | ✅ Kode done | - | 2026-07-16 | Header (badge sertifikasi + Edit per-permission) + 5 summary cards (Petani L/P, KT/Gapoktan/Blok, Persil+Luas, Produksi, skor DA-02 card+link) + Tabs: Ringkasan (profil + struktur #154, auto-hide Gapoktan), Petani/Lahan ringkas (Fase 2 pending) + **peta sebaran poligon lahan** (`GroupParcelsMap`: warna per KT + legenda checklist show/hide + show/hide all + zoom ke tercentang + label nama petani + popup info, revisi owner), Pelatihan (cakupan + rataan pre/post per paket + aktivitas), Produksi (per tahun ber-persentase [record/lahan/luas melapor] + **rincian bulanan collapsible** + produktivitas #166 + 4 kategori MAP-02). Action `getFarmerGroupDetail` RBAC 3 lapis real-time + pure lib `farmer-group-detail.ts` (+5 unit). Gate lint 0 / build / **test 457** ✅. Sisa: verifikasi visual owner + retro sebelum close |
| **✅ #172 Detail Petani: profil 360° (pola #171)** | MD-03 | ✅ Kode done | - | 2026-07-16 | Header (avatar placeholder TD-017 + link Lembaga #171 + KT/Gapoktan #152 + Edit) + 5 cards (Lahan+Luas, Produksi, Pelatihan n/paket, Kelengkapan Profil, Produktivitas terakhir) + Tabs: Ringkasan, Lahan (tabel + peta shared #171 + **PDF Profil Lahan #134**), Pelatihan (checklist paket + riwayat pre→post), Produksi (per tahun ber-persentase + bulanan collapsible + #166 + 4 kategori). Action `getFarmerDetail` RBAC + pure lib (+4 unit); ekstrak `production-stats.ts` + `parcel-passport-query.ts` + peta ke `components/shared`. Gate lint 0 / build / **test 461** ✅. Sisa: verifikasi visual owner + retro sebelum close |
| ~~#153 Master Lembaga Petani: KT/Gapoktan/Blok turunan~~ | MD-04 | ❌ Superseded | - | 2026-07-14 | **Ditutup — tersubsumsi #154** (view agregat KT jadi Report real-time, bukan snapshot/master) |
| **✅ #155 Relabel "Lembaga Tani"→"Lembaga Petani" (revisi manajemen)** | — | ✅ Done | - | 2026-07-14 | Sweep 168 label `src/**` + `menu.csv` + baris menu DB + 59 docs; "Kelompok Tani" & identifier `FarmerGroup` tetap. Gate lint 0 / test 388 / build ✅ |
| **✅ #154 Report Kelompok Tani (real-time): Lembaga×Gapoktan×KT + Total Petani/Lahan** | RPT-04 | ✅ Done | - | 2026-07-14 | **Backend ✅** — `getKelompokTaniReport`/dropdown (`report.ts`) + pure `lib/report-kelompok-tani.ts` (grain, distinct petani/lahan, normalisasi) + 6 unit test. **UI ✅ (2 submenu)** — **Summary** `report/kelompok-tani`: filter Distrik/Lembaga opsional, auto-load real-time, 6 card (Lembaga/Gapoktan/KT/Petani/Lahan/**Luas**), search, null-handling "(tidak diketahui)". **Detail** `report/kelompok-tani-detail`: roster per 1 Lembaga (Gapoktan/KUD→KT→daftar Petani + jml lahan/luas), pure `lib/report-kelompok-tani-detail.ts` (+7 unit), action `getKelompokTaniDetailReport`. Keduanya **Excel + PDF**. **Summary**: column selector (sembunyikan kolom, mis. Gapoktan/KUD utk Lembaga tanpa level itu). **Detail**: section **collapsible** (default tertutup) + Buka/Tutup semua, **auto-hide** layer Gapoktan/KUD bila Lembaga tak punya (langsung KT→Petani). Menu `report-kelompok-tani`(Summary)+`report-kelompok-tani-detail` + 8 role-permission (seed terarah DB, ikon `Network`/`ClipboardList`). Label "Gapoktan"→"Gapoktan/KUD". Read-only. Gate lint 0 / build / test 395 ✅. Depends #146 + data (#150) |
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
| -------------- | --------------------- | --------------------------------------- | --------------------------------------------------- |
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
| ---------- | -------------------------------------- | -------------------- | ----------------------------------------------------- |
| `phase`    | `phase:MD-03`                        | Ya                 | Harus sama dengan Phase Status jika terkait phase |
| `status`   | `status:todo`                        | Ya                 | Harus mengikuti Issue Workflow                    |
| `type`     | `type:feat`, `type:bug`, `type:debt` | Ya                 | Minimal satu type                                 |
| `priority` | `priority:P0`, `priority:P1`         | Untuk sprint aktif | Dipakai untuk sorting pekerjaan                   |

</details>
