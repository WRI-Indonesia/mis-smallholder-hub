# Proyek — Technical Debt & Bug Register

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

<details>
<summary><strong>4. Technical Debt & Bug Register</strong> — risiko teknis aktual</summary>

## 4. Technical Debt & Bug Register

Debt/bug di section ini berasal dari audit code. Item masuk sprint jika sudah punya owner, priority, dan definition of done.

### Bug Register

| ID      | Bug                                                                         | Priority | Evidence                                                                                                                                                            | Owner | Status  | Definition of Done                                                  |
| ------- | --------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------- | --------------------------------------------------------------------- |
| BUG-001 | `/admin/master-data` redirect ke route missing `/admin/master-data/farmers` | P0       | `src/app/(admin)/admin/master-data/page.tsx`                                                                                                                        | -   | ✅ Done | Redirect ke `/admin/master-data/farmers` — route exists & functional |
| BUG-002 | Dashboard debug scripts import action yang tidak ada                        | P0       | `scripts/debug/debug-dashboard-data.js`, `scripts/debug/test-dashboard-api.js`, `scripts/debug/perf-dashboard.ts` import `src/server/actions/dashboard` (tidak ada) | -   | ✅ Done (2026-06-22) | Debug scripts dipindah ke `scripts/local/` (gitignored) — tidak ada di repo/CI. |
| BUG-003 | Server actions tanpa guard `hasPermission`: `role-permission.ts` (toggle/get — **privilege escalation**), `menu.ts` (create/update/delete), `upload.ts` (S3 write) | **P0** | Audit 2026-07-10 — `audit-report/audit-2026-07-10.md` §2 H-1/H-2/H-3 · **Issue #125** | - | ✅ Done (2026-07-12) | Guard `settings-roles`/`settings-menu`/`master-data-training` ditambah; `role-permission` tolak perubahan role SUPERADMIN; `getAllMenuItems` dual-key (menu OR roles). Test di `rbac-server-guards.test.ts`. |
| BUG-004 | Scope `getAccessContext` absen: `farmer.ts getFarmerById` (PII lintas scope) & `bulk-upload.ts bulkCreateFarmers` (insert ke KT luar scope); mutasi by-id farmer/group/training juga tanpa cek scope | **P0** | Audit 2026-07-10 §2 H-4/H-5 + §3 M-1 · **Issue #125** (MED by-id: #127) | - | ✅ Done (2026-07-12) | Scope diterapkan di `getFarmerById`/`updateFarmer`/`toggleFarmerActive`/`createFarmer`/`bulkCreateFarmers` (pola `land-parcel.ts:68` / `bulk-upload-production.ts`). **Sisa scope by-id KT/pelatihan → #127.** |
| BUG-005 | Halaman Role & Permission di-guard `requirePermission("settings-users")` padahal menu key = `settings-roles` → user ber-grant `settings-roles` melihat menu tapi ditolak halamannya | P1 | `settings/roles/page.tsx:7` vs `menu.csv` · **Issue #125** | - | ✅ Done (2026-07-12) | Diselaraskan ke `settings-roles` (page + actions `role-permission`). |
| BUG-006 | Gate QA lint merah: `npm run lint` 229 masalah (193 error) — mayoritas `no-explicit-any` + `scripts/` (gitignored) ikut ter-lint | P1 | Audit 2026-07-10 §1 · **Issue #126** | TBD | 🔲 Open | eslint ignore `scripts/**` + bereskan unused-vars + cicil any |

### Debt Register

| ID     | Debt Item                                                           | Priority | Evidence                                                                                     | Owner                 | Status                     | Validation Method                                                |
| ------ | --------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- | ---------------------- | --------------------------- | -------------------------------------------------------------------- |
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
| --------------------- | ---------------------- | ------------------------------------------------------------ |
| Immediate / P0       | ✅ **BUG-003, BUG-004** (selesai 2026-07-12, #125) | Celah guard/scope RBAC ditutup sebelum fitur baru |
| Sprint berjalan / P1 | BUG-006, TD-007 (BUG-005 ✅) | lint hijau (#126), keputusan pola restore + scope by-id KT/pelatihan (#127) |
| Later / P2–P3        | TD-002, TD-004, TD-008, TD-009, TD-010, TD-011, TD-012 | Cleanup dead code/deps, audit fields, env drift, naming    |

</details>
