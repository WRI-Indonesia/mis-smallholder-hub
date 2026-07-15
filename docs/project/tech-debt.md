# Proyek — Technical Debt & Bug Register

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

## 4. Technical Debt & Bug Register

Debt/bug di section ini berasal dari audit code. Item masuk sprint jika sudah punya owner, priority, dan definition of done.

Format: **tabel indeks** untuk scanning cepat → **rincian per item** di section collapsible (`<details>`) di bawahnya.

### Bug Register

| ID | Bug | Priority | Status |
| --- | --- | --- | --- |
| BUG-001 | Redirect `/admin/master-data` ke route missing | P0 | ✅ Done |
| BUG-002 | Debug scripts import action yang tidak ada | P0 | ✅ Done (2026-06-22) |
| BUG-003 | Server actions tanpa guard `hasPermission` (privilege escalation) | **P0** | ✅ Done (2026-07-12, #125) |
| BUG-004 | Scope `getAccessContext` absen (PII lintas scope, insert luar scope) | **P0** | ✅ Done (2026-07-12, #125/#127) |
| BUG-005 | Halaman Roles di-guard menu key yang salah | P1 | ✅ Done (2026-07-12, #125) |
| BUG-006 | Gate QA lint merah (193 error) | P1 | ✅ Done (2026-07-12, #126) |
| BUG-007 | Scope leak `getMapData` (Peta Lahan/MAP-01) | P1 | ✅ Done (2026-07-13) |

<details>
<summary><strong>BUG-001</strong> · ✅ Done — Redirect <code>/admin/master-data</code> ke route missing (P0)</summary>

- **Masalah:** `/admin/master-data` redirect ke route missing `/admin/master-data/farmers`.
- **Evidence:** `src/app/(admin)/admin/master-data/page.tsx`.
- **Definition of Done:** Redirect ke `/admin/master-data/farmers` — route exists & functional. ✅

</details>

<details>
<summary><strong>BUG-002</strong> · ✅ Done (2026-06-22) — Debug scripts import action yang tidak ada (P0)</summary>

- **Masalah:** Dashboard debug scripts meng-import `src/server/actions/dashboard` yang tidak ada.
- **Evidence:** `scripts/debug/debug-dashboard-data.js`, `scripts/debug/test-dashboard-api.js`, `scripts/debug/perf-dashboard.ts`.
- **Definition of Done:** Debug scripts dipindah ke `scripts/local/` (gitignored) — tidak ada di repo/CI. ✅

</details>

<details>
<summary><strong>BUG-003</strong> · ✅ Done (2026-07-12, #125) — Server actions tanpa guard <code>hasPermission</code> (P0)</summary>

- **Masalah:** Server actions tanpa guard `hasPermission`: `role-permission.ts` (toggle/get — **privilege escalation**), `menu.ts` (create/update/delete), `upload.ts` (S3 write).
- **Evidence:** Audit 2026-07-10 — `audit-report/audit-2026-07-10.md` §2 H-1/H-2/H-3 · **Issue #125**.
- **Definition of Done:** Guard `settings-roles`/`settings-menu`/`master-data-training` ditambah; `role-permission` tolak perubahan role SUPERADMIN; `getAllMenuItems` dual-key (menu OR roles). Test di `rbac-server-guards.test.ts`. ✅

</details>

<details>
<summary><strong>BUG-004</strong> · ✅ Done (2026-07-12, #125/#127) — Scope <code>getAccessContext</code> absen (P0)</summary>

- **Masalah:** Scope `getAccessContext` absen: `farmer.ts getFarmerById` (PII lintas scope) & `bulk-upload.ts bulkCreateFarmers` (insert ke KT luar scope); mutasi by-id farmer/group/training juga tanpa cek scope.
- **Evidence:** Audit 2026-07-10 §2 H-4/H-5 + §3 M-1 · **Issue #125** (MED by-id: #127).
- **Definition of Done:** Scope diterapkan di `getFarmerById`/`updateFarmer`/`toggleFarmerActive`/`createFarmer`/`bulkCreateFarmers` (pola `land-parcel.ts:68` / `bulk-upload-production.ts`). **Sisa scope by-id KT/pelatihan/lahan + helper "for select" → ✅ #127 (2026-07-12).** ✅

</details>

<details>
<summary><strong>BUG-005</strong> · ✅ Done (2026-07-12, #125) — Halaman Roles di-guard menu key yang salah (P1)</summary>

- **Masalah:** Halaman Role & Permission di-guard `requirePermission("settings-users")` padahal menu key = `settings-roles` → user ber-grant `settings-roles` melihat menu tapi ditolak halamannya.
- **Evidence:** `settings/roles/page.tsx:7` vs `menu.csv` · **Issue #125**.
- **Definition of Done:** Diselaraskan ke `settings-roles` (page + actions `role-permission`). ✅

</details>

<details>
<summary><strong>BUG-006</strong> · ✅ Done (2026-07-12, #126) — Gate QA lint merah, 193 error (P1)</summary>

- **Masalah:** `npm run lint` 229 masalah (193 error) — mayoritas `no-explicit-any` + `scripts/` (gitignored) ikut ter-lint.
- **Evidence:** Audit 2026-07-10 §1 · **Issue #126**.
- **Definition of Done:** `npm run lint` **exit 0** (0 error). eslint ignore `scripts/**`; semua unused-vars/prefer-const/no-unused-expressions dibersihkan; `no-explicit-any` diganti tipe nyata (`Prisma.*WhereInput`, `geojson`, maplibre `LayerProps`/`MapLayerMouseEvent`, `unknown`+narrowing); react-hooks `set-state-in-effect`×6 & `static-components`×4 diperbaiki tanpa disable. Sisa **3 warning `exhaustive-deps`** sengaja ditahan (risiko regresi zoom/memo) — disepakati terpisah per AC. Build ✅, test 25/328 ✅.

</details>

<details>
<summary><strong>BUG-007</strong> · ✅ Done (2026-07-13) — Scope leak <code>getMapData</code>, Peta Lahan/MAP-01 (P1)</summary>

- **Masalah:** `groupWhere` spread `farmerGroupAccessFilter(access)` lalu di-override literal: `districtId` (wajib) menimpa `{ districtId: { in } }` mode BY_DISTRICT, dan `id: farmerGroupId` menimpa `{ id: { in } }` mode BY_FARMER_GROUP → user ber-scope bisa memuat District/KT **di luar assignment** via panggilan action langsung (UI-bypass). Pitfall key-collision identik #127.
- **Evidence:** `src/server/actions/map.ts` `getMapData` (`groupWhere`); ditemukan saat audit MAP-02 #144 (pola sama di `getBmpMapData` sudah diperbaiki ke `AND`).
- **Definition of Done:** `farmerGroupAccessFilter(access)` dipindah dari spread ke **`AND`** di `groupWhere` → literal `districtId`/`id` tak lagi menimpa scope `{ …: { in } }`. +3 replica test `map groupWhere scope` (BY_DISTRICT/BY_FARMER_GROUP/ALL) di `map.test.ts` (31→34). Gate lint 0 / build ✅ / test 380 ✅.

</details>

### Debt Register

| ID | Debt Item | Priority | Status |
| --- | --- | --- | --- |
| TD-001 | S3/PDF utility belum terintegrasi ke modul Training | P1 | ✅ Closed (2026-07-10, audit) |
| TD-002 | Hardcoded `text-white` perlu visual audit | P2 | 🔲 Planned |
| TD-003 | `.DS_Store` di working tree | P2 | ✅ Closed |
| TD-004 | Language toggle / i18n belum ada | P2 | 🔲 Planned |
| TD-005 | Dashboard cache/debug scripts implementasi lama | P1 | ✅ Closed (2026-06-22) |
| TD-006 | `docs/rule.md` menyebut folder yang tidak ada | P2 | ✅ Closed (2026-07-10, audit) |
| TD-007 | Inkonsistensi soft-delete/restore | P1 | ✅ Done (2026-07-12, #127) |
| TD-008 | Form parsing berpotensi `NaN` pada field kosong | P2 | 🔲 Planned |
| TD-009 | Dead code & deps 0-usage + duplikasi helper | P2 | ✅ Done (2026-07-12, #129) |
| TD-010 | Audit fields kosong + return `ActionResult` ad-hoc | P2 | 🟡 Partial (#129/#130) |
| TD-011 | Env & tooling drift | P2 | ✅ Done (2026-07-12, #129) |
| TD-012 | Identifier Bahasa Indonesia vs rule "variable English" | P3 | ✅ Done (2026-07-12, #130) |
| TD-013 | Mislabel `FarmerGroup` = "Lembaga Petani" (relabel UI) | P2 | ✅ Done (2026-07-14, #147) |
| TD-014 | Level "Kelompok Tani (Gapoktan)" belum dimodelkan | P2 | 🟡 Interim jalan (#146/#150) |
| TD-015 | `DataTable` kolom turunan: export mengandalkan tebakan key | P3 | 🔲 Open |

<details>
<summary><strong>TD-001</strong> · ✅ Closed (2026-07-10, audit) — S3/PDF utility belum terintegrasi ke modul Training (P1)</summary>

- **Masalah:** S3/PDF utility belum terintegrasi ke modul Training.
- **Evidence:** Training + evidence upload S3 sudah terintegrasi via `upload.ts` (#81); CLI `get-link`/`pdf-manager` tetap sebagai utilitas.
- **Owner:** Backend/Storage Lead.
- **Validation:** Evidence upload berfungsi di app; sisa: CLI tak load dotenv (TD-011).

</details>

<details>
<summary><strong>TD-002</strong> · 🔲 Planned — Hardcoded <code>text-white</code> perlu visual audit (P2)</summary>

- **Masalah:** Hardcoded `text-white` perlu visual audit.
- **Evidence:** Ada di login, footer, user menu access modal; sebagian mungkin valid karena background solid.
- **Owner:** Frontend Lead.
- **Validation:** Visual QA dark/light mode tanpa contrast regression.

</details>

<details>
<summary><strong>TD-003</strong> · ✅ Closed — <code>.DS_Store</code> di working tree (P2)</summary>

- **Masalah:** `.DS_Store` tidak tracked, tetapi masih ada di working tree.
- **Evidence:** `git ls-files` kosong; `find` menemukan file lokal.
- **Owner:** Repository Maintainer.
- **Validation:** `.DS_Store` tetap ignored dan tidak masuk git (closed for git tracking).

</details>

<details>
<summary><strong>TD-004</strong> · 🔲 Planned — Language toggle / i18n belum ada (P2)</summary>

- **Masalah:** Language toggle / i18n belum ada.
- **Evidence:** Tidak ada locale switch/persistence.
- **Owner:** i18n Lead.
- **Validation:** Toggle mengubah locale dan persist state antar navigasi.

</details>

<details>
<summary><strong>TD-005</strong> · ✅ Closed (2026-06-22) — Dashboard cache/debug scripts implementasi lama (P1)</summary>

- **Masalah:** Dashboard cache/debug scripts tampak berasal dari implementasi lama.
- **Evidence:** Script menyebut dashboard stats/markers/batches yang tidak ada di source action.
- **Validation:** Debug scripts dipindah ke `scripts/local/` (gitignored). Tidak ada di repo/CI.

</details>

<details>
<summary><strong>TD-006</strong> · ✅ Closed (2026-07-10, audit) — <code>docs/rule.md</code> menyebut folder yang tidak ada (P2)</summary>

- **Masalah:** `docs/rule.md` menyebut folder dashboard components yang tidak ada.
- **Evidence:** Tree arsitektur rule.md sudah disinkronkan (audit 2026-07-10): `components/dashboard` dihapus, `hooks/`+`api/` ditambah.
- **Owner:** Tech Lead.
- **Validation:** Docs arsitektur sinkron dengan struktur repo.

</details>

<details>
<summary><strong>TD-007</strong> · ✅ Done (2026-07-12, #127) — Inkonsistensi soft-delete/restore (P1)</summary>

- **Masalah:** `getFarmerGroups/ById` tanpa filter `isActive` level KT; sebaliknya `getFarmers` menyembunyikan petani nonaktif sehingga tak bisa di-restore dari UI.
- **Evidence:** `farmer-group.ts:23,75` vs `farmer.ts:11` — audit 2026-07-10 §3.2 · **Issue #127**.
- **Owner:** Backend Lead + Product.
- **Validation:** Pola terpilih: **tampilkan nonaktif + badge + filter Status (default Aktif) + toggle Aktifkan**, **khusus SUPERADMIN** (user lain dibatasi ke record aktif di server & UI via `isSuperAdmin()`), diseragamkan ke semua list master data (Petani/KT/Pelatihan/Lahan/Produksi). `toggleLandParcelActive`/`toggleProductionRecordActive` ditambah. Pola didokumentasikan di [`code-standards.md`](../standards/code-standards.md) §Soft-delete.

</details>

<details>
<summary><strong>TD-008</strong> · 🔲 Planned — Form parsing berpotensi <code>NaN</code> pada field kosong (P2)</summary>

- **Masalah:** Form data parsing berpotensi `NaN` pada field kosong/whitespace.
- **Evidence:** `src/app/(admin)/admin/master-data/groups/group-form-modal.tsx`.
- **Owner:** Frontend Lead.
- **Validation:** Gunakan helper untuk memproses string kosong/whitespace sebelum parsing numerik.

</details>

<details>
<summary><strong>TD-009</strong> · ✅ Done (2026-07-12, #129) — Dead code & deps 0-usage + duplikasi helper (P2)</summary>

- **Masalah:** Dead code & deps: `lib/constants.ts`, 6 komponen ui/layout tak terpakai (`alert`, `breadcrumb`, `form`, `scroll-area`, `sonner`, `placeholder-page`), deps 0-usage (`@dnd-kit`×3, `recharts`, `adm-zip`, `react-hook-form`+`@hookform/resolvers`, `ts-node`, `@types/sharp`), export mati (`isS3Key`), duplikasi helper (`getFarmerGroupsForSelect`/`getFarmersForSelect` ×2, ternary accessFilter ±25×).
- **Evidence:** Audit 2026-07-10 §5 & §8 P2 · **Issue #129**.
- **Owner:** Engineering.
- **Validation:** 9 deps 0-usage dihapus, `csv-parse`/`sharp`→devDeps; 7 file mati dihapus (`input-group`/`shadcn` dipertahankan sesuai catatan); `isS3Key` dihapus, `DASHBOARD_PACKAGE_CODES` di-de-export, `FarmerSelect` dedup; helper "for select" dikonsolidasi ke `src/lib/select-options.ts` ber-guard (konsolidasi `farmerAccessFilter` sudah di #127). Gate lint/build/test hijau.

</details>

<details>
<summary><strong>TD-010</strong> · 🟡 Partial (#129/#130) — Audit fields kosong + return <code>ActionResult</code> ad-hoc (P2)</summary>

- **Masalah:** Audit fields tidak diisi di sebagian mutasi (`user.ts`, `menu.ts`, `role-permission.ts`, toggle region, assignment) + return `ActionResult` ad-hoc.
- **Evidence:** Audit 2026-07-10 §3.4 & LOW · **Issue #129/#130**.
- **Owner:** Backend Lead.
- **Status rinci:**
  - **Payload ad-hoc `{granted}`/`{count}` → ✅ #129** (dipindah ke `data` + anotasi tipe).
  - **Audit fields `createdBy`/`modifiedBy` → ✅ #130** (diisi dari `auth()` di user/menu/role-permission/region-toggle/user-data-access/user-menu-access + `toggleFarmerActive`).
  - **Sisa (follow-up khusus):** `error: fieldErrors` (objek) di 22 titik/9 action — perlu pisah `error:string` + `fieldErrors` di tipe `ActionResult` + ~10 form (lihat analisa #129).

</details>

<details>
<summary><strong>TD-011</strong> · ✅ Done (2026-07-12, #129) — Env & tooling drift (P2)</summary>

- **Masalah:** `FIRMS_MAP_KEY_FREE` tidak ada di `.env.example`; `.dockerignore` tidak exclude `.env`; CLI `get-link`/`pdf-manager` tidak load dotenv; `NEXT_PUBLIC_S3_PUBLIC_URL` tak terpakai.
- **Evidence:** Audit 2026-07-10 §6 · **Issue #129**.
- **Owner:** DevOps.
- **Validation:** `.env.example` +`FIRMS_MAP_KEY_FREE` −`NEXT_PUBLIC_S3_PUBLIC_URL`; `.dockerignore` exclude `.env`; `dotenv/config` di 2 CLI; ternary `listTrainingPDFs` diperbaiki + stub `cleanupOrphaned`/`pdf:cleanup` dihapus. `Dockerfile` dipertahankan (deploy via SSH, bukan Docker — keputusan owner).

</details>

<details>
<summary><strong>TD-012</strong> · ✅ Done (2026-07-12, #130) — Identifier Bahasa Indonesia vs rule "variable English" (P3)</summary>

- **Masalah:** Identifier Bahasa Indonesia di code (`computePetaniDomain` dkk, field types `totalPetani`…) vs rule "variable English".
- **Evidence:** Audit 2026-07-10 §5 · **Issue #130**.
- **Owner:** Tech Lead.
- **Validation:** **Keputusan #130: resmikan istilah domain** (petani/lahan/pelatihan/produksi/KT/persil/paket) sebagai pengecualian resmi di `code-standards.md` — bukan rename massal (Surgical Changes, hindari regresi lintas modul). Enum DB (`PAKET_1_*`) = data, di luar aturan.

</details>

<details>
<summary><strong>TD-013</strong> · ✅ Done (2026-07-14, #147) — Mislabel <code>FarmerGroup</code> = "Lembaga Petani", relabel UI (P2)</summary>

- **Masalah:** **Mislabel: entitas `FarmerGroup` sebenarnya "Lembaga Petani", bukan "Kelompok Tani".** Hierarki domain benar = **Petani → Kelompok Tani (Gapoktan) → Lembaga Petani**. Model saat ini `Petani → FarmerGroup` (langsung) = level teratas (**Lembaga Petani**) yang selama ini keliru dilabeli "Kelompok Tani".
- **Scope (Bagian A — relabel, aman, forward-compatible):** ganti UI-copy "Kelompok Tani" → "Lembaga Petani"; identifier English `FarmerGroup`/`farmerGroup`/`farmer-group` **tetap** (konvensi + preseden TD-012 #130). ⚠️ **Menu _key_ RBAC jangan diubah** — hanya label tampilan.
- **Evidence:** Label seed: `prisma/seeds/data/menu.csv` (+DB row); ±142 string "Kelompok Tani" di ±52 file `src/**` + 27 di `docs/**`; identifier `FarmerGroup` di 93 file `src`/`prisma` (tetap, kini = Lembaga Petani). Abbr "KT"→"LT". Relasi: `Farmer.farmerGroupId`→`FarmerGroup`, scope RBAC `BY_FARMER_GROUP` filter `farmerGroupId`, `UserFarmerGroup`/`TrainingActivity` menggantung di sini. · **Issue #147** (pembeda: field `subGroupLv2` tetap "Kelompok Tani", lihat #146).
- **Owner:** Product + Frontend.
- **Hasil:** Sweep ~56 file `src/**` + `menu.csv` relabel "Kelompok Tani"→"Lembaga Petani"; identifier/menu-key/`subGroupLv2` tetap; label menu DB di-update 1 baris terarah (`tbl_menu_item` key `master-data-groups`, bukan `db seed` penuh). Docs disinkronkan. Gate lint 0 / build / test 380 ✅.

</details>

<details>
<summary><strong>TD-014</strong> · 🟡 Interim jalan (#146/#150) — Level "Kelompok Tani (Gapoktan)" belum dimodelkan (P2)</summary>

- **Masalah:** **Level "Kelompok Tani (Gapoktan)" yang hilang** — level tengah antara Petani dan Lembaga Petani belum dimodelkan; data KT belum dimasukkan (per owner).
- **Scope (Bagian B — data-model, besar, kemudian):** butuh model baru KT, re-parenting `Farmer` (Petani → KT, KT → Lembaga) via migrasi, plus dampak RBAC scope (`BY_FARMER_GROUP`/`UserFarmerGroup` → level mana?), districtId (level mana yang punya?), dan **tabrakan identifier** (`FarmerGroup` kini dipakai untuk Lembaga → entitas KT baru butuh nama lain). **Bukan refactor & bukan kosmetik — ini fitur/skema baru.**
- **Evidence:** Skema: `farmer.prisma:10` (`farmerGroupId`→FarmerGroup), `farmer-group.prisma`, `access-context.ts` (mode `BY_FARMER_GROUP`), enum `FarmerGroupCategory` (`EX_PLASMA`/`SWADAYA`). Gapoktan = Gabungan Kelompok Tani → perjelas apakah KT & Gapoktan satu entitas atau dua.
- **Owner:** Product + Backend Lead.
- **Status interim (2026-07-14, #146):** field denormalisasi `LandParcel.subGroupLv1` (Gapoktan) + `LandParcel.subGroupLv2` (Kelompok Tani) — **per-lahan** karena satu petani bisa punya lahan di KT berbeda (bukan di `Farmer`). Backend + form manual + detail lahan + **mapping bulk-upload shapefile (#150 ✅ 2026-07-15**, `lib/parcel-bulk-mapping.ts`) selesai, build/test hijau — jalur input interim lengkap (manual + bulk).
- **Konsumen interim (selesai):** Report Kelompok Tani real-time (**#154** — Summary agregat + Detail roster, Excel/PDF), card "Total Kelompok Tani" Main Dashboard snapshot-backed (**#148**, distinct `subGroupLv2`), KT/Gapoktan turunan di detail Petani (**#152**, `lib/farmer-sub-groups.ts`). Label UI "Gapoktan" → **"Gapoktan/KUD"** (#154; `subGroupLv1` tetap).
- **Target akhir (DIPUTUSKAN 2026-07-14): Jalur B + mekanisme B2** — rename bersih `FarmerGroup`→`FarmerInstitution` (Lembaga Petani) + entitas baru `FarmerGroup`/`FarmerGroupAssociation` (KT/Gapoktan sebagai tabel); eksekusi via **export → rebuild skema → re-import** saat data lengkap.
- **Blocker refactor penuh:** keputusan hierarki **3 vs 4 level** (Gapoktan entitas terpisah?) + konfirmasi padanan Inggris.
- **Validation:** Model jalan: Petani→KT→Lembaga; scope RBAC & filter district konsisten; **ID/relasi (UserFarmerGroup, LandParcel+GeoJSON, TrainingActivity, produksi, snapshot) tidak putus** saat re-import (pertahankan CUID atau remap); UI/CRUD/bulk untuk level baru; gate lint/build/test hijau. Padanan Inggris terpilih: `Farmer` / `FarmerGroup`(KT) / `FarmerGroupAssociation`(Gapoktan, bila 4 level) / `FarmerInstitution`(Lembaga).

</details>

<details>
<summary><strong>TD-015</strong> · 🔲 Open — <code>DataTable</code> kolom turunan: export mengandalkan tebakan key (P3)</summary>

- **Masalah:** Kolom yang me-render gabungan beberapa field (mis. Sertifikasi RSPO = status+tahun) gagal **diam-diam**: sort no-op (nilai `row[col.key]` null) dan kolom Excel kosong (`getExportRow` harus menebak key kolom). Sort sudah ditutup properti `sortValue` (#160); export masih rawan — kandidat properti `exportValue?: (row) => unknown` serupa agar simetris.
- **Evidence:** Ditemukan #160 (sort & export kolom RSPO dua-duanya silent-fail); `data-table.tsx` `handleExport` (`exportRow[String(col.key)]`).
- **Owner:** Frontend.
- **Validation:** Tambahkan `exportValue` saat menyentuh `DataTable` berikutnya; sampai itu, pastikan key object `getExportRow` = `col.key` persis.

</details>

### Debt Sequencing

| Waktu                | Fokus                  | Catatan                                                    |
| --------------------- | ---------------------- | ------------------------------------------------------------ |
| Immediate / P0       | ✅ **BUG-003, BUG-004** (selesai 2026-07-12, #125) | Celah guard/scope RBAC ditutup sebelum fitur baru |
| Sprint berjalan / P1 | ✅ **TD-007** (BUG-005 ✅, BUG-006 ✅) | lint hijau (#126 ✅), pola restore + scope by-id KT/pelatihan/lahan (#127 ✅ 2026-07-12) |
| Later / P2–P3        | ✅ **TD-009, TD-011** (#129), **TD-012** & TD-010 audit-fields (#130, 2026-07-12); TD-002, TD-004, TD-008, TD-015 | Cleanup dead code/deps, env drift, audit fields & naming selesai; sisa: `ActionResult` fieldErrors (TD-010 follow-up), NaN parsing, visual audit, `exportValue` DataTable |
