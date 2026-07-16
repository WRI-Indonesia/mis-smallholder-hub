# Proyek — Technical Debt & Bug Register

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

## Summary

Kondisi per **2026-07-15**: seluruh **bug (7/7) selesai** — termasuk semua celah guard/scope RBAC P0 dari audit 2026-07-10. Tersisa **6 debt aktif**, tidak ada yang memblokir fitur berjalan. Risiko terbesar bersifat **struktural**: TD-014 (level Kelompok Tani/Gapoktan belum dimodelkan — interim per-lahan sudah jalan, refactor penuh menunggu keputusan hierarki); selebihnya debt kualitas berukuran kecil–sedang.

**Rekomendasi:**

| Horizon | Fokus | Alasan |
| --- | --- | --- |
| **Jangka pendek** (sprint berjalan) | **TD-015** (`exportValue` DataTable) & **TD-008** (helper parsing angka form) — kerjakan menumpang saat menyentuh file terkait; **TD-002** (visual audit `text-white`) sekali jalan | Kecil, murah, mencegah silent-fail berulang (TD-015 sudah 2× menggigit di #160) |
| **Jangka menengah** (1–2 sprint) | **TD-010 sisa** — pisah `error:string` + `fieldErrors` di tipe `ActionResult` (22 titik / 9 action / ~10 form); **TD-004** (i18n) bila jadi kebutuhan produk | Perubahan kontrak lintas form — butuh PR khusus ber-scope jelas, bukan tumpangan; i18n perlu keputusan produk dulu |
| **Jangka panjang** (menunggu data & keputusan) | **TD-014** refactor hierarki penuh (Jalur B + B2: KT/Gapoktan jadi tabel, `FarmerGroup`→`FarmerInstitution`, export→rebuild→re-import) | Blocker: keputusan **3 vs 4 level** + data KT lengkap; interim per-lahan (#146/#150) sudah menopang report/dashboard/detail sampai saat itu |

---

Debt/bug di halaman ini berasal dari audit code. Item masuk sprint jika sudah punya owner, priority, dan definition of done.

**Cara baca:** item yang **masih aktif** tampil langsung di atas (itu yang perlu ditindaklanjuti); item yang **sudah selesai** dipisah ke **Arsip** di bawah (collapsed, dibuka hanya bila perlu riwayat).

## Ringkasan

| Kategori | 🔴 Aktif | ✅ Selesai | Total |
| --- | --- | --- | --- |
| **Bug** (BUG-001…007) | 0 | 7 | 7 |
| **Debt** (TD-001…017) | **8** | 9 | 17 |

Debt aktif: **TD-010** 🟡 · **TD-014** 🟡 · TD-002 · TD-004 · TD-008 · TD-015 · TD-016 · TD-017.

## Debt Register — 🔴 Aktif

### TD-010 · 🟡 Partial — Return `ActionResult` ad-hoc: sisa `error: fieldErrors` (P2)

- **Masalah awal:** audit fields tidak diisi di sebagian mutasi (`user.ts`, `menu.ts`, `role-permission.ts`, toggle region, assignment) + return `ActionResult` ad-hoc.
- **Sudah selesai:** payload ad-hoc `{granted}`/`{count}` → ✅ #129 (dipindah ke `data` + anotasi tipe); audit fields `createdBy`/`modifiedBy` → ✅ #130 (diisi dari `auth()` di user/menu/role-permission/region-toggle/user-data-access/user-menu-access + `toggleFarmerActive`).
- **Sisa (follow-up khusus):** `error: fieldErrors` (objek) di 22 titik/9 action — perlu pisah `error:string` + `fieldErrors` di tipe `ActionResult` + ~10 form (lihat analisa #129).
- **Evidence:** Audit 2026-07-10 §3.4 & LOW · **Issue #129/#130** · **Owner:** Backend Lead.

### TD-014 · 🟡 Interim jalan — Level "Kelompok Tani (Gapoktan)" belum dimodelkan (P2)

- **Masalah:** level tengah antara Petani dan Lembaga Petani belum dimodelkan; data KT belum dimasukkan (per owner). Butuh model baru KT, re-parenting `Farmer` (Petani → KT, KT → Lembaga) via migrasi, plus dampak RBAC scope, districtId, dan **tabrakan identifier** (`FarmerGroup` kini dipakai untuk Lembaga). **Bukan refactor & bukan kosmetik — ini fitur/skema baru.**
- **Status interim (jalan):** field denormalisasi `LandParcel.subGroupLv1` (Gapoktan) + `subGroupLv2` (Kelompok Tani) **per-lahan** (#146) + input manual & bulk shapefile (#150 ✅) — jalur input interim lengkap.
- **Target akhir (diputuskan 2026-07-14):** Jalur B + mekanisme B2 — rename `FarmerGroup`→`FarmerInstitution` + entitas KT/Gapoktan sebagai tabel; eksekusi **export → rebuild → re-import** saat data lengkap.
- **Blocker:** keputusan hierarki **3 vs 4 level** (Gapoktan entitas terpisah?) + konfirmasi padanan Inggris.
- **Owner:** Product + Backend Lead.

<details>
<summary>Riwayat, evidence & validation lengkap</summary>

- **Evidence:** Skema: `farmer.prisma:10` (`farmerGroupId`→FarmerGroup), `farmer-group.prisma`, `access-context.ts` (mode `BY_FARMER_GROUP`), enum `FarmerGroupCategory` (`EX_PLASMA`/`SWADAYA`). Gapoktan = Gabungan Kelompok Tani → perjelas apakah KT & Gapoktan satu entitas atau dua.
- **Alasan per-lahan (#146):** satu petani bisa punya lahan di KT/Gapoktan berbeda → keanggotaan sub-kelompok per-lahan, bukan di `Farmer`.
- **Konsumen interim (selesai):** Report Kelompok Tani real-time (**#154** — Summary agregat + Detail roster, Excel/PDF), card "Total Kelompok Tani" Main Dashboard snapshot-backed (**#148**, distinct `subGroupLv2`), KT/Gapoktan turunan di detail Petani (**#152**, `lib/farmer-sub-groups.ts`). Label UI "Gapoktan" → **"Gapoktan/KUD"** (#154; `subGroupLv1` tetap).
- **Validation:** model jalan Petani→KT→Lembaga; scope RBAC & filter district konsisten; **ID/relasi (UserFarmerGroup, LandParcel+GeoJSON, TrainingActivity, produksi, snapshot) tidak putus** saat re-import (pertahankan CUID atau remap); UI/CRUD/bulk untuk level baru; gate lint/build/test hijau. Padanan Inggris terpilih: `Farmer` / `FarmerGroup`(KT) / `FarmerGroupAssociation`(Gapoktan, bila 4 level) / `FarmerInstitution`(Lembaga).

</details>

### TD-002 · 🔲 Planned — Hardcoded `text-white` perlu visual audit (P2)

- **Masalah:** hardcoded `text-white` di login, footer, user menu access modal; sebagian mungkin valid karena background solid.
- **Validation:** visual QA dark/light mode tanpa contrast regression. · **Owner:** Frontend Lead.

### TD-004 · 🔲 Planned — Language toggle / i18n belum ada (P2)

- **Masalah:** tidak ada locale switch/persistence.
- **Validation:** toggle mengubah locale dan persist state antar navigasi. · **Owner:** i18n Lead.

### TD-008 · 🔲 Planned — Form parsing berpotensi `NaN` pada field kosong (P2)

- **Masalah:** form data parsing berpotensi `NaN` pada field kosong/whitespace.
- **Evidence:** `src/app/(admin)/admin/master-data/groups/group-form-modal.tsx`.
- **Validation:** gunakan helper untuk memproses string kosong/whitespace sebelum parsing numerik. · **Owner:** Frontend Lead.

### TD-015 · 🔲 Open — `DataTable` kolom turunan: export mengandalkan tebakan key (P3)

- **Masalah:** kolom yang me-render gabungan beberapa field (mis. Sertifikasi RSPO = status+tahun) gagal **diam-diam**: sort no-op (nilai `row[col.key]` null) dan kolom Excel kosong (`getExportRow` harus menebak key kolom). Sort sudah ditutup properti `sortValue` (#160); export masih rawan — kandidat properti `exportValue?: (row) => unknown` agar simetris.
- **Evidence:** ditemukan #160 (sort & export kolom RSPO dua-duanya silent-fail); `data-table.tsx` `handleExport` (`exportRow[String(col.key)]`).
- **Validation:** tambahkan `exportValue` saat menyentuh `DataTable` berikutnya; sampai itu, pastikan key object `getExportRow` = `col.key` persis. · **Owner:** Frontend.

### TD-017 · 🔲 Open — Field foto petani belum ada di schema (P3)

- **Masalah:** detail Petani 360° (#172) butuh foto petani; field/upload belum ada di `Farmer` (keputusan owner 2026-07-16: **pending**, masuk debt).
- **Interim:** #172 memakai **placeholder avatar** (inisial nama) — siap diganti saat field tersedia.
- **Validation:** saat diputuskan lanjut — kolom `photoKey` (S3, pola evidence pelatihan) + upload di form Petani + tampil di detail/list. · **Owner:** Backend + Frontend.

### TD-016 · 🔲 Open — Test flaky: 1 test gagal sporadis saat mesin sibuk (P3)

- **Masalah:** pada 2026-07-16 suite gagal **3× (1 test)** lalu hijau saat di-rerun (441→457 pass); loop 3× berturut saat idle bersih — gagal hanya saat run berbarengan proses berat (build/lint). Pola konsisten **perf test ber-ambang waktu** (`perf.test.ts` berisi assert durasi ms).
- **Evidence:** sesi 2026-07-16 (3 kejadian, selalu lolos di rerun); nama test belum tertangkap — kegagalan berikutnya, simpan output penuh.
- **Validation:** saat terulang, catat nama test + longgarkan ambang (atau tandai `retry: 1` khusus perf) agar gate pre-commit tidak false-negative. · **Owner:** QA/Dev.

## Debt Sequencing

| Waktu                | Fokus                  | Catatan                                                    |
| --------------------- | ---------------------- | ------------------------------------------------------------ |
| Immediate / P0       | ✅ **BUG-003, BUG-004** (selesai 2026-07-12, #125) | Celah guard/scope RBAC ditutup sebelum fitur baru |
| Sprint berjalan / P1 | ✅ **TD-007** (BUG-005 ✅, BUG-006 ✅) | lint hijau (#126 ✅), pola restore + scope by-id KT/pelatihan/lahan (#127 ✅ 2026-07-12) |
| Later / P2–P3        | ✅ **TD-009, TD-011** (#129), **TD-012** & TD-010 audit-fields (#130, 2026-07-12); sisa aktif: TD-002, TD-004, TD-008, TD-010 (fieldErrors), TD-015 | Cleanup dead code/deps, env drift, audit fields & naming selesai; sisa: `ActionResult` fieldErrors, NaN parsing, visual audit, `exportValue` DataTable |

## ✅ Arsip — Selesai

### Bug Register (7/7 selesai)

<details>
<summary><strong>Lihat 7 bug selesai</strong> — BUG-001…BUG-007 (guard/scope RBAC, lint, redirect, scripts)</summary>

| ID | Bug | Priority | Selesai |
| --- | --- | --- | --- |
| BUG-001 | Redirect `/admin/master-data` ke route missing | P0 | ✅ |
| BUG-002 | Debug scripts import action yang tidak ada | P0 | ✅ 2026-06-22 |
| BUG-003 | Server actions tanpa guard `hasPermission` (privilege escalation) | **P0** | ✅ 2026-07-12 (#125) |
| BUG-004 | Scope `getAccessContext` absen (PII lintas scope, insert luar scope) | **P0** | ✅ 2026-07-12 (#125/#127) |
| BUG-005 | Halaman Roles di-guard menu key yang salah | P1 | ✅ 2026-07-12 (#125) |
| BUG-006 | Gate QA lint merah (193 error) | P1 | ✅ 2026-07-12 (#126) |
| BUG-007 | Scope leak `getMapData` (Peta Lahan/MAP-01) | P1 | ✅ 2026-07-13 |

**BUG-001** — `/admin/master-data` redirect ke route missing `/admin/master-data/farmers`. Evidence: `src/app/(admin)/admin/master-data/page.tsx`. DoD: redirect ke `/admin/master-data/farmers` — route exists & functional. ✅

**BUG-002** — Dashboard debug scripts meng-import `src/server/actions/dashboard` yang tidak ada. Evidence: `scripts/debug/debug-dashboard-data.js`, `scripts/debug/test-dashboard-api.js`, `scripts/debug/perf-dashboard.ts`. DoD: debug scripts dipindah ke `scripts/local/` (gitignored) — tidak ada di repo/CI. ✅

**BUG-003** — Server actions tanpa guard `hasPermission`: `role-permission.ts` (toggle/get — **privilege escalation**), `menu.ts` (create/update/delete), `upload.ts` (S3 write). Evidence: Audit 2026-07-10 `audit-report/audit-2026-07-10.md` §2 H-1/H-2/H-3 · Issue #125. DoD: guard `settings-roles`/`settings-menu`/`master-data-training` ditambah; `role-permission` tolak perubahan role SUPERADMIN; `getAllMenuItems` dual-key (menu OR roles); test di `rbac-server-guards.test.ts`. ✅

**BUG-004** — Scope `getAccessContext` absen: `farmer.ts getFarmerById` (PII lintas scope) & `bulk-upload.ts bulkCreateFarmers` (insert ke KT luar scope); mutasi by-id farmer/group/training juga tanpa cek scope. Evidence: Audit 2026-07-10 §2 H-4/H-5 + §3 M-1 · Issue #125 (MED by-id: #127). DoD: scope diterapkan di `getFarmerById`/`updateFarmer`/`toggleFarmerActive`/`createFarmer`/`bulkCreateFarmers` (pola `land-parcel.ts:68` / `bulk-upload-production.ts`); sisa scope by-id KT/pelatihan/lahan + helper "for select" → ✅ #127. ✅

**BUG-005** — Halaman Role & Permission di-guard `requirePermission("settings-users")` padahal menu key = `settings-roles` → user ber-grant `settings-roles` melihat menu tapi ditolak halamannya. Evidence: `settings/roles/page.tsx:7` vs `menu.csv` · Issue #125. DoD: diselaraskan ke `settings-roles` (page + actions `role-permission`). ✅

**BUG-006** — `npm run lint` 229 masalah (193 error) — mayoritas `no-explicit-any` + `scripts/` (gitignored) ikut ter-lint. Evidence: Audit 2026-07-10 §1 · Issue #126. DoD: `npm run lint` **exit 0** (0 error); eslint ignore `scripts/**`; unused-vars/prefer-const/no-unused-expressions dibersihkan; `no-explicit-any` diganti tipe nyata (`Prisma.*WhereInput`, `geojson`, maplibre `LayerProps`/`MapLayerMouseEvent`, `unknown`+narrowing); react-hooks `set-state-in-effect`×6 & `static-components`×4 diperbaiki tanpa disable. Sisa **3 warning `exhaustive-deps`** sengaja ditahan (risiko regresi zoom/memo) — disepakati terpisah per AC. Build ✅, test 25/328 ✅.

**BUG-007** — Scope leak `getMapData` (Peta Lahan/MAP-01): `groupWhere` spread `farmerGroupAccessFilter(access)` lalu di-override literal `districtId`/`id` → user ber-scope bisa memuat District/KT **di luar assignment** via panggilan action langsung (UI-bypass); pitfall key-collision identik #127. Evidence: `src/server/actions/map.ts` `getMapData`; ditemukan saat audit MAP-02 #144 (pola sama di `getBmpMapData` sudah diperbaiki). DoD: filter scope dipindah dari spread ke **`AND`**; +3 replica test `map groupWhere scope` (BY_DISTRICT/BY_FARMER_GROUP/ALL) di `map.test.ts` (31→34). Gate lint 0 / build ✅ / test 380 ✅.

</details>

### Debt Register — Selesai (9 item)

<details>
<summary><strong>Lihat 9 debt selesai</strong> — TD-001, 003, 005, 006, 007, 009, 011, 012, 013</summary>

| ID | Debt Item | Priority | Selesai |
| --- | --- | --- | --- |
| TD-001 | S3/PDF utility belum terintegrasi ke modul Training | P1 | ✅ 2026-07-10 (audit) |
| TD-003 | `.DS_Store` di working tree | P2 | ✅ (git tracking) |
| TD-005 | Dashboard cache/debug scripts implementasi lama | P1 | ✅ 2026-06-22 |
| TD-006 | `docs/rule.md` menyebut folder yang tidak ada | P2 | ✅ 2026-07-10 (audit) |
| TD-007 | Inkonsistensi soft-delete/restore | P1 | ✅ 2026-07-12 (#127) |
| TD-009 | Dead code & deps 0-usage + duplikasi helper | P2 | ✅ 2026-07-12 (#129) |
| TD-011 | Env & tooling drift | P2 | ✅ 2026-07-12 (#129) |
| TD-012 | Identifier Bahasa Indonesia vs rule "variable English" | P3 | ✅ 2026-07-12 (#130) |
| TD-013 | Mislabel `FarmerGroup` = "Lembaga Petani" (relabel UI) | P2 | ✅ 2026-07-14 (#147) |

**TD-001** — S3/PDF utility belum terintegrasi ke modul Training. Evidence: Training + evidence upload S3 sudah terintegrasi via `upload.ts` (#81); CLI `get-link`/`pdf-manager` tetap sebagai utilitas. Owner: Backend/Storage Lead. Validation: evidence upload berfungsi di app; sisa CLI tak load dotenv → TD-011. ✅

**TD-003** — `.DS_Store` tidak tracked, tetapi masih ada di working tree. Evidence: `git ls-files` kosong; `find` menemukan file lokal. Owner: Repository Maintainer. Validation: `.DS_Store` tetap ignored dan tidak masuk git (closed for git tracking). ✅

**TD-005** — Dashboard cache/debug scripts tampak berasal dari implementasi lama (menyebut dashboard stats/markers/batches yang tidak ada di source action). Validation: debug scripts dipindah ke `scripts/local/` (gitignored), tidak ada di repo/CI. ✅

**TD-006** — `docs/rule.md` menyebut folder dashboard components yang tidak ada. Owner: Tech Lead. Validation: tree arsitektur disinkronkan (audit 2026-07-10): `components/dashboard` dihapus, `hooks/`+`api/` ditambah; docs arsitektur sinkron dengan struktur repo. ✅

**TD-007** — Inkonsistensi soft-delete/restore: `getFarmerGroups/ById` tanpa filter `isActive` level KT; sebaliknya `getFarmers` menyembunyikan petani nonaktif sehingga tak bisa di-restore dari UI. Evidence: `farmer-group.ts:23,75` vs `farmer.ts:11` — audit 2026-07-10 §3.2 · Issue #127. Owner: Backend Lead + Product. Validation: pola terpilih **tampilkan nonaktif + badge + filter Status (default Aktif) + toggle Aktifkan**, **khusus SUPERADMIN** (user lain dibatasi ke record aktif di server & UI via `isSuperAdmin()`), diseragamkan ke semua list master data (Petani/KT/Pelatihan/Lahan/Produksi); `toggleLandParcelActive`/`toggleProductionRecordActive` ditambah; didokumentasikan di [`code-standards.md`](../standards/code-standards.md) §Soft-delete. ✅

**TD-009** — Dead code & deps: `lib/constants.ts`, 6 komponen ui/layout tak terpakai (`alert`, `breadcrumb`, `form`, `scroll-area`, `sonner`, `placeholder-page`), deps 0-usage (`@dnd-kit`×3, `recharts`, `adm-zip`, `react-hook-form`+`@hookform/resolvers`, `ts-node`, `@types/sharp`), export mati (`isS3Key`), duplikasi helper (`getFarmerGroupsForSelect`/`getFarmersForSelect` ×2, ternary accessFilter ±25×). Evidence: Audit 2026-07-10 §5 & §8 P2 · Issue #129. Owner: Engineering. Validation: 9 deps 0-usage dihapus, `csv-parse`/`sharp`→devDeps; 7 file mati dihapus (`input-group`/`shadcn` dipertahankan sesuai catatan); `isS3Key` dihapus, `DASHBOARD_PACKAGE_CODES` di-de-export, `FarmerSelect` dedup; helper "for select" dikonsolidasi ke `src/lib/select-options.ts` ber-guard (konsolidasi `farmerAccessFilter` sudah di #127). Gate lint/build/test hijau. ✅

**TD-011** — Env & tooling drift: `FIRMS_MAP_KEY_FREE` tidak ada di `.env.example`; `.dockerignore` tidak exclude `.env`; CLI `get-link`/`pdf-manager` tidak load dotenv; `NEXT_PUBLIC_S3_PUBLIC_URL` tak terpakai. Evidence: Audit 2026-07-10 §6 · Issue #129. Owner: DevOps. Validation: `.env.example` +`FIRMS_MAP_KEY_FREE` −`NEXT_PUBLIC_S3_PUBLIC_URL`; `.dockerignore` exclude `.env`; `dotenv/config` di 2 CLI; ternary `listTrainingPDFs` diperbaiki + stub `cleanupOrphaned`/`pdf:cleanup` dihapus; `Dockerfile` dipertahankan (deploy via SSH, bukan Docker — keputusan owner). ✅

**TD-012** — Identifier Bahasa Indonesia di code (`computePetaniDomain` dkk, field types `totalPetani`…) vs rule "variable English". Evidence: Audit 2026-07-10 §5 · Issue #130. Owner: Tech Lead. Validation: **keputusan #130 — resmikan istilah domain** (petani/lahan/pelatihan/produksi/KT/persil/paket) sebagai pengecualian resmi di `code-standards.md`, bukan rename massal (Surgical Changes, hindari regresi lintas modul); enum DB (`PAKET_1_*`) = data, di luar aturan. ✅

**TD-013** — **Mislabel: entitas `FarmerGroup` sebenarnya "Lembaga Petani", bukan "Kelompok Tani"** (hierarki benar: Petani → Kelompok Tani (Gapoktan) → Lembaga Petani). Scope Bagian A (relabel, aman, forward-compatible): ganti UI-copy "Kelompok Tani" → "Lembaga Petani"; identifier English `FarmerGroup`/`farmerGroup`/`farmer-group` tetap (konvensi + preseden TD-012 #130); ⚠️ menu _key_ RBAC tidak diubah — hanya label. Evidence: label seed `prisma/seeds/data/menu.csv` (+DB row); ±142 string di ±52 file `src/**` + 27 di `docs/**`; identifier `FarmerGroup` di 93 file (tetap); abbr "KT"→"LT"; relasi `Farmer.farmerGroupId`→`FarmerGroup`, scope RBAC `BY_FARMER_GROUP`, `UserFarmerGroup`/`TrainingActivity` menggantung di sini · Issue #147 (pembeda: field `subGroupLv2` tetap "Kelompok Tani", lihat #146/TD-014). Owner: Product + Frontend. Hasil: sweep ~56 file `src/**` + `menu.csv`; label menu DB di-update 1 baris terarah (`tbl_menu_item` key `master-data-groups`, bukan `db seed` penuh); docs disinkronkan. Gate lint 0 / build / test 380 ✅.

</details>
