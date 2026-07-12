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
| P2       | AUDIT-P2     | Cleanup dead code & deps (#129)        | 1 file lib + 6 komponen + 5–9 dependency mati (audit §5 & §8 P2)                              | PR terpisah: hapus deps/file mati, konsolidasi helper duplikat |

### Active Issues / Work Items

| Work Item                                        | Phase   | Status      | Assignee | Target | Next Action                                                                              |
| ------------------------------------------------ | ------- | ----------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **✅ #125 AUDIT-P0: Remediasi guard/scope RBAC** — COMPLETE | —       | ✅ Done     | -      | 2026-07-12 | 6 item P0 selesai (role-permission, menu, upload, farmer scope, bulk scope, menuKey Roles) + 17 test RBAC/perf; gate `npm test` 328 ✅ / build ✅ |
| **🟠 #127/#128 AUDIT-P1: scope by-id/restore + konvensi UI** (#126 ✅) | — | 🔲 Todo | TBD | 07-17 | **#126 lint ✅ Done 2026-07-12**; sisa: menu-list-client gating/TableActions; farmer-form-modal Combobox; 4 loading.tsx |
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
