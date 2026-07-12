# Proyek — Biweekly Management Brief

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [tech-debt.md](./tech-debt.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

> Dokumen kerja untuk memantau delivery Smallholder HUB. Status di dokumen ini disinkronkan terhadap **file dan code yang benar-benar ada di repository**, bukan berdasarkan klaim changelog historis.

**Last updated:** 2026-07-12 · **Next management review:** 2026-07-14

**Perubahan terakhir (2026-07-12):** (1) AUDIT-P0 Remediasi keamanan RBAC (#125) ✅ — guard `hasPermission` (`role-permission`/`menu`/`upload`) + scope `getAccessContext` (`getFarmerById`/`updateFarmer`/`toggleFarmerActive`/`createFarmer`/`bulkCreateFarmers`) + menuKey Roles → `settings-roles` + 17 test RBAC/perf baru. (2) **AUDIT-P1 Lint hijau (#126) ✅** — `npm run lint` **exit 0** (229 masalah/193 error → 0 error, 3 warning), gate ditegakkan lokal via Pre-Commit Gate. QA: `npm test` **25 file / 328 ✅** · build ✅ · **lint ✅ exit 0**. Fokus berikutnya: scope by-id KT/pelatihan & pola restore (#127) + konvensi UI (#128). Riwayat lengkap → [`changelog.md`](./changelog.md).

**Source of truth:** tabel **Phase Status** di [`roadmap.md`](./roadmap.md). **Panduan update & checklist:** [`contributing.md`](./contributing.md).

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
| Test lokal         | ✅ `npm test` — **25 files / 328 tests passed** · build ✅ · **lint ✅ exit 0** (#126 selesai 2026-07-12) |
| Fokus berikutnya   | **Scope by-id/restore (#127) + konvensi UI (#128)** — AUDIT-P0 keamanan (#125) ✅ & lint (#126) ✅ selesai |

### Executive Summary

| Area                | Status          | Ringkasan                                                                                                                                  |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform foundation | ✅ Ready        | Auth, RBAC, menu, user management, region, dan farmer group sudah implementatif. Schema dengan audit fields, soft-delete, RBAC patterns.  |
| Master data inti    | ✅ Complete     | Farmer ✅, Land Parcel ✅, Training ✅, Production (MD-06) ✅ complete (model + action + UI + test).                            |
| Dashboard           | ✅ Complete     | DASH-01/02/03 selesai (#99): `/admin/dashboard/main` snapshot-backed + peta MapLibre + `dashboard.ts`/`snapshot.ts` + Tools Snapshot. DASH-04 (BMP) menyusul. |
| Report              | ✅ Complete     | RPT-01 Petani (#107) ✅, RPT-02 Pelatihan (#108) ✅ & RPT-03 Produksi (#132) ✅ selesai (route + `report.ts` + UI + test). |
| Bulk Upload         | ✅ Partial      | Farmer bulk upload ✅, Shapefile bulk upload ✅, Production bulk upload ✅. Region & KT bulk upload belum ada (#69, #70). |
| Map & Data Analyst  | ✅ Complete     | MAP-01 (#113 + hotspot/ruler/label) ✅; DA-01 (#103) & DA-02 (#118, #122) ✅. |
| **Keamanan (audit)** | ✅ **Remediated (#125, 2026-07-12)** | 5 celah guard/scope RBAC + menuKey Roles **ditutup**: guard `hasPermission` di `role-permission`/`menu`/`upload`, scope `getAccessContext` di `getFarmerById`/`updateFarmer`/`toggleFarmerActive`/`createFarmer`/`bulkCreateFarmers`, `requirePermission("settings-roles")`. Sisa scope by-id KT/pelatihan → #127. |
| Testing & QA        | ✅ Strong | Vitest: **25 files / 328 tests passed** ✅ · build ✅ · **`npm run lint` ✅ exit 0** (0 error; 3 warning `exhaustive-deps` ditahan) — #126 selesai 2026-07-12. |

### Progress Snapshot

| Metrik         | Jumlah         | Catatan                                              |
| -------------- | -------------- | ---------------------------------------------------- |
| Total phase    | 38 fase        | PLATFORM(7), MD(11), DASH(4), MAP(1), RPT(3), BULK(4), DA(2), TOOLS(1), CMS(1), COMM(2), OPS(2) |
| ✅ Done        | **25 fase**    | PLATFORM-01…07, MD-01…06, DASH-01/02/03, MAP-01, RPT-01/02/03, BULK-01/03/04, DA-01/02 |
| 🟠 Partial     | 3 fase         | TOOLS-01, OPS-01, OPS-02 |
| 🔲 Not Started | 3 fase         | BULK-02 (#70), CMS-01, COMM-01 |
| 🔲 Planned     | 7 fase         | MD-07/08/09/10/11, DASH-04, COMM-02 |
| 🔴 Blocked     | 0 fase         | — (DASH-04 tidak lagi terblokir; DASH-01/02 selesai) |
| 🎯 Now         | 1 fokus        | **Scope by-id/restore (#127) + konvensi UI (#128)** — AUDIT-P0 keamanan (#125) ✅ & lint (#126) ✅ selesai |

### Management Talking Points

| Topik               | Pesan Utama                                                              | Dampak                                                                                    |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Code Quality 🟢 (audit 2026-07-10 → update 2026-07-12)** | Audit menyeluruh: fondasi sehat (35/35 page ter-guard, DataTable/API route/seed compliant, 328 test ✅). Kompliansi **8 PASS / 4 PARTIAL / 2 FAIL** — celah guard/scope RBAC (#125) ✅ & lint gate (#126) ✅ ditutup 2026-07-12. | Remediasi P0/P1 selesai; sisa 2 FAIL (barrel resmi + helper guard) → cleanup #127-#129. Detail di `audit-report/audit-2026-07-10.md`. |
| **Production ✅ Complete** | MD-06 Production sudah implementatif (#89): ProductionRecord model + actions + UI + 13 tests + bulk upload | Yield tracking per farmer/parcel ready; foundation untuk impact reporting. |
| **Land Parcel ✅ Complete** | MD-04 Land Parcel sudah implementatif (#88): model + actions + UI + 14 tests + Shapefile bulk upload | Geospatial features ready; foundation untuk Production module. |
| Farmer ✅ Complete  | MD-03 Farmer sudah implementatif (model + action + UI + 10 tests).       | Ready untuk dependency downstream (dashboard, parcel, training, production).                          |
| Navigation ✅ Fixed | `/admin/master-data` redirect ke farmers — sudah bekerja & tested.       | Admin flow tidak patah; Farmer list fully accessible.                                     |
| Dashboard ✅ Complete | DASH-01/02/03 selesai (#99): Main Dashboard snapshot-backed + peta + Tools Snapshot. | Fondasi dashboard siap; DASH-04 (BMP) tinggal reuse pola snapshot. |
| ~~Stale scripts alert~~ | ✅ Resolved — debug/stale scripts dipindah ke `scripts/local/` (gitignored). `get-link.js` & `pdf-manager.js` tetap di `scripts/` root. | BUG-002 closed. |
| Delivery confidence | Tests **328/328** passed (25 files); coverage: auth/RBAC/menu/menu-filter/user/region/farmer/land-parcel/training/production/bulk-upload/report/dashboard/data-analyst/data-completeness/map/map-geo/firms + rbac-server-guards (#125) ✅. | Foundation & core features stabil; AUDIT-P0 keamanan (#125) ✅ & lint gate (#126) ✅ selesai 2026-07-12. |

### Decisions Needed

| Keputusan                  | Owner                   | Dibutuhkan Kapan     | Rekomendasi Tech Lead                                                                       |
| -------------------------- | ----------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
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
| **✅ Done**| **#126 AUDIT-P1: Lint hijau kembali**       | `npm run lint` **exit 0** — ignore `scripts/**` + `no-unused-vars`/`prefer-const` bersih + `no-explicit-any` diganti tipe nyata + react-hooks set-state/static-components diperbaiki; build & test hijau ✅ |
| **✅ Done**| **#132 RPT-03: Report Produksi**            | Sub-menu `report-production` + `report.ts` (`getProductionReport`) + matriks bulanan per petani/lahan + filter rentang bulan + Excel + PDF landscape export + unit tests ✅ |

</details>
