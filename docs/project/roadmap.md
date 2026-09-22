# Proyek — Roadmap & Phase Status (Source of Truth)

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [sprint.md](./sprint.md) · [tech-debt.md](./tech-debt.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

## 2. Roadmap Source of Truth

Section ini adalah acuan resmi status delivery. Jika ada perbedaan antara changelog, issue, dan tabel ini, gunakan tabel **Phase Status** sebagai kebenaran utama.

Format: **tabel indeks Phase Status** untuk scanning cepat → **rincian per phase** (evidence + next step) di section collapsible (`<details>`) per item, dikelompokkan per stream. Definisi (status/horizon/stream) dan hasil audit code masing-masing di `<details>` tersendiri.

### Governance Rules

- **Phase Status adalah source of truth** untuk reporting management dan planning developer.
- Status fase hanya boleh naik jika implementasi bisa diverifikasi lewat file/code, route, schema, server action, test, atau workflow.
- Changelog tidak boleh dijadikan bukti status selesai; changelog hanya catatan historis.
- Placeholder `Coming soon` tidak dihitung sebagai implementasi feature.
- Script/debug tool tidak dihitung sebagai implementasi UI/module, kecuali phase memang scope-nya CLI/tooling.
- Jika status berubah karena audit code, catat di **Decision Log**.

### Definisi

<details>
<summary><strong>Status Definition</strong> — arti ✅ Done · 🟠 Partial · 🔲 Not Started · 🔲 Planned · 🔴 Blocked</summary>

| Status         | Arti                      | Kapan Dipakai                                                           |
| -------------- | ------------------------- | ----------------------------------------------------------------------- |
| ✅ Done        | Selesai dan terverifikasi | Schema/route/action/UI tersedia sesuai completion criteria minimal      |
| 🟠 Partial     | Sebagian ada              | Ada sebagian implementasi, tetapi belum cukup untuk dianggap selesai    |
| 🔲 Not Started | Belum dimulai             | Route/schema/action utama belum ada, tetapi phase masuk prioritas dekat |
| 🔲 Planned     | Masuk roadmap             | Belum ada implementasi dan belum menjadi prioritas sprint               |
| 🔴 Blocked     | Terhambat                 | Ada dependency atau kondisi yang membuat phase belum layak dieksekusi   |

</details>

<details>
<summary><strong>Horizon Definition</strong> — Done · Now · Next · Later · Blocked</summary>

| Horizon | Arti                        | Aturan                                         |
| ------- | --------------------------- | ----------------------------------------------- |
| Done    | Selesai                     | Semua completion criteria fase sudah terpenuhi |
| Now     | Fokus dua minggu berjalan   | Maksimal 2–4 phase agar tim tidak melebar      |
| Next    | Kandidat sprint berikutnya  | Masuk setelah dependency jelas                 |
| Later   | Backlog roadmap             | Jangan dieksekusi sebelum Now stabil           |
| Blocked | Tidak bisa dieksekusi sehat | Perlu dependency/keputusan/phase sebelumnya    |

</details>

<details>
<summary><strong>Bobot Definition</strong> — arti kolom <code>Bobot</code>: inti (×2) · pendukung (×1)</summary>

Bobot dipakai formula **Roadmap %** ([standards/versioning.md](../standards/versioning.md) §Metrik Nilai Rilis): skor fase (✅ = 1, 🟠 = 0,5, sisanya 0) dikali bobotnya, dibagi total bobot maksimum.

| Bobot     | Pengali | Arti                                                                              |
| --------- | ------- | --------------------------------------------------------------------------------- |
| inti      | ×2      | Fase yang menentukan kelayakan go-live 1.0 — modul data, dashboard, report, peta   |
| pendukung | ×1      | Fase pelengkap/operasional — modul lanjutan (MD-07…MD-11), tooling, CMS, komunitas, DevOps |

Kolom ini adalah **satu-satunya sumber klasifikasi** (dibaca mesin oleh section Detail Roadmap di dashboard Metrik Rilis). Mengubah bobot sebuah fase = mengubah baseline → wajib dicatat di Decision Log.

Kolom ditambahkan pada #250 (2026-08-13) sebagai **eksplisitasi klasifikasi baseline v0.24.0, bukan perubahan bobot**: sebelumnya klasifikasi hanya berupa narasi per-stream di [standards/versioning.md](../standards/versioning.md) sehingga tidak bisa dihitung mesin. Angkanya identik — inti 37 ×2 = 72/74, pendukung 11 = 2/11 → **74/85 = 87,1%** — jadi seluruh tren metrics ke belakang tetap sah dan tidak dihitung ulang.

</details>

<details>
<summary><strong>Stream Definition</strong> — arti prefix pada format phase <code>STREAM-NN</code></summary>

Format phase: `STREAM-NN`.

| Stream   | Arti                   | Cakupan                                                                                    |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| PLATFORM | Platform Foundation    | Init project, schema DB, auth, RBAC, menu infra                                            |
| MD       | Master Data            | Regions, groups, farmer, parcels, training, staff, agronomy, HCV, BUSDEV, IMPACT, workplan |
| DASH     | Dashboard              | Basic dashboard, server actions, interactive map, BMP, Pelatihan                           |
| MAP      | Geospatial Map Explorer | Peta interaktif sebaran KT & lahan, filter spasial (Province/District/KT), layer toggle    |
| RPT      | Report                 | Report Petani, Pelatihan, Produksi, Kelompok Tani (Summary+Detail), Lahan; summary tabel + export Excel/PDF |
| BULK     | Bulk Upload            | Bulk upload Farmer (Excel), Produksi (Excel), Lahan (Shapefile ZIP) + Detail Lahan (Excel: surat/STDB/UL Parcel Code, #296) ✅; Region & Lembaga Petani/KT masih planned (#69, #70) |
| TOOLS    | Tools & Utility        | Import, export, GIS, S3/PDF utility                                                        |
| DA       | Data Analyst           | Ringkasan Petani, Analisa Ketersediaan Data (anomali/kelengkapan), analytics dashboards, Komparasi Data Acuan |
| CMS      | Content Management     | Pages, media, knowledge base                                                               |
| COMM     | Community & Engagement | Community, i18n                                                                            |
| HELP     | Bantuan / Panduan      | Panduan penggunaan in-app: tutorial per tugas (2 tingkat kedalaman), konsep & istilah, FAQ |
| OPS      | Operations & DevOps    | Testing, CI/CD, deployment                                                                 |

</details>

### Phase Status (Indeks)

Rincian evidence & next step tiap phase ada di [Rincian per Phase](#rincian-per-phase) di bawah.

Tabel ini **diparse saat build** (`src/lib/roadmap.ts`) untuk section **Detail Roadmap** di dashboard Metrik Rilis: urutan kolom, nilai Status/Horizon/Bobot, dan keunikan kode fase wajib sesuai Definisi di atas — format menyimpang membuat build & test gagal. Roadmap % pada [metrics.md](./metrics.md) dihitung ulang dari tabel ini oleh unit test (toleransi 0,1 pp).

| Phase       | Deskripsi                           | Status         | Horizon | Bobot     |
| ----------- | ----------------------------------- | -------------- | ------- | --------- |
| PLATFORM-01 | Initialization & UI Statis          | ✅ Done        | Done    | inti      |
| PLATFORM-02 | Database Schema & Migrations        | ✅ Done        | Done    | inti      |
| PLATFORM-03 | Schema Hardening                    | ✅ Done        | Done    | inti      |
| PLATFORM-04 | Autentikasi & RBAC                  | ✅ Done        | Done    | inti      |
| PLATFORM-05 | Dynamic Menu Management             | ✅ Done        | Done    | inti      |
| PLATFORM-06 | Table Refactor & Export Excel       | ✅ Done        | Done    | inti      |
| PLATFORM-07 | Hierarchical Menu (3-Level)         | ✅ Done        | Done    | inti      |
| MD-01       | Regions                             | ✅ Done        | Done    | inti      |
| MD-02       | Farmer Groups                       | ✅ Done        | Done    | inti      |
| MD-03       | Farmer                              | ✅ Done        | Done    | inti      |
| MD-04       | Parcels                             | ✅ Done        | Done    | inti      |
| MD-05       | Training                            | ✅ Done        | Done    | inti      |
| MD-06       | Agronomy / Production               | ✅ Done        | Done    | inti      |
| MD-07       | Staff                               | 🔲 Planned     | Later   | pendukung |
| MD-08       | HCV                                 | 🟠 Partial     | Later   | pendukung |
| MD-09       | BUSDEV                              | 🔲 Planned     | Later   | pendukung |
| MD-10       | IMPACT                              | 🔲 Planned     | Later   | pendukung |
| MD-11       | Workplan                            | 🔲 Planned     | Later   | pendukung |
| DASH-01     | Dashboard: Basic Data               | ✅ Done        | Done    | inti      |
| DASH-02     | Dashboard: Server Actions           | ✅ Done        | Done    | inti      |
| DASH-03     | Interactive Map                     | ✅ Done        | Done    | inti      |
| DASH-04     | Dashboard BMP (Produksi)            | ✅ Done        | Done    | inti      |
| DASH-05     | Dashboard: Card Total Kelompok Tani | ✅ Done        | Done    | inti      |
| DASH-06     | Dashboard Pelatihan                 | ✅ Done        | Done    | inti      |
| DASH-07     | Dashboard Risk Management: Fire Alert | ✅ Done      | Done    | inti      |
| DASH-08     | Monev BMP: skor per petani + rincian indikator + dashboard | ✅ Done | Done | inti      |
| MAP-01      | Map: Peta Lahan                     | ✅ Done        | Done    | inti      |
| MAP-02      | Map: Peta BMP (Layer 1)             | ✅ Done        | Done    | inti      |
| MAP-03      | Map: Peta BMP Layer 2 (Produktivitas) | ✅ Done      | Done    | inti      |
| RPT-01      | Report: Petani                      | ✅ Done        | Done    | inti      |
| RPT-02      | Report: Pelatihan                   | ✅ Done        | Done    | inti      |
| RPT-03      | Report: Produksi                    | ✅ Done        | Done    | inti      |
| RPT-04      | Report: Kelompok Tani               | ✅ Done        | Done    | inti      |
| RPT-05      | Report: Lahan                       | ✅ Done        | Done    | inti      |
| HELP-01     | Bantuan: Panduan Penggunaan         | ✅ Done        | Done    | inti      |
| HELP-02     | Bantuan: Tutorial per Tugas         | ✅ Done        | Done    | inti      |
| BULK-01     | Bulk Upload: Menu & Route           | ✅ Done        | Done    | inti      |
| BULK-02     | Bulk Upload: Region                 | 🔲 Not Started | Next    | inti      |
| BULK-03     | Bulk Upload: Farmer                 | ✅ Done        | Done    | inti      |
| BULK-04     | Bulk Upload: Production             | ✅ Done        | Done    | inti      |
| DA-01       | Farmer Summary Analytics            | ✅ Done        | Done    | inti      |
| DA-02       | Analisa Ketersediaan Data KT        | ✅ Done        | Done    | inti      |
| DA-03       | Dashboard Ketersediaan Data         | ✅ Done        | Done    | inti      |
| DA-06       | Komparasi Data Acuan                | ✅ Done        | Done    | inti      |
| DA-07       | Peta Data & Skema                   | ✅ Done        | Done    | inti      |
| TOOLS-01    | Tools Import/Export/GIS/S3          | 🟠 Partial     | Next    | pendukung |
| CMS-01      | CMS & Content Management            | 🔲 Not Started | Later   | pendukung |
| COMM-01     | Community                           | 🔲 Not Started | Later   | pendukung |
| COMM-02     | i18n                                | 🔲 Planned     | Later   | pendukung |
| OPS-01      | Testing                             | ✅ Done        | Done    | pendukung |
| OPS-02      | DevOps & Deployment                 | 🟠 Partial     | Later   | pendukung |

### Rincian per Phase

#### PLATFORM — Platform Foundation

<details>
<summary><strong>PLATFORM-01</strong> · ✅ Done — Initialization & UI Statis</summary>

- **Evidence:** Next.js app, public home, login, admin shell, UI components.
- **Next step:** Maintain.

</details>

<details>
<summary><strong>PLATFORM-02</strong> · ✅ Done — Database Schema & Migrations</summary>

- **Evidence:** Modular Prisma schema + migration + seed files.
- **Next step:** Maintain.

</details>

<details>
<summary><strong>PLATFORM-03</strong> · ✅ Done — Schema Hardening</summary>

- **Evidence:** All active models have audit fields (created_at/by, modified_at/by, is_active) + soft-delete.
- **Next step:** Maintain pattern for future models.

</details>

<details>
<summary><strong>PLATFORM-04</strong> · ✅ Done — Autentikasi & RBAC</summary>

- **Evidence:** NextAuth credentials, RBAC helpers, role permissions, data access, menu override — 5 auth tests.
- **#187 ✅ (2026-07-22):** role kelima **`DONOR`** — enum `Role.DONOR` (migrasi `20260722010000`), sentralisasi daftar role ke `src/lib/roles.ts` (ganti 5 titik hardcode), seed **15 baris DONOR VIEW** (Dashboard/Report/Map/Bantuan, tanpa CREATE/EDIT/DELETE); migrasi + seed diterapkan ke mis-prod.
- **Next step:** Maintain and test regression.

</details>

<details>
<summary><strong>PLATFORM-05</strong> · ✅ Done — Dynamic Menu Management</summary>

- **Evidence:** `MenuItem` schema, seed, menu server actions, sidebar, menu management page.
- **#187B ✅ (2026-07-22):** perombakan UI **Menu Management & Role & Permission** — render **rekursif 3 level** via helper bersama `src/lib/menu-tree.ts` (fix bug menu level-3 tak muncul di matriks), collapsible per induk (`localStorage`), header + kolom Menu **sticky**, selektor role, search, toggle baris + **kaskade induk→anak** ber-konfirmasi, feedback optimistis via `setRolePermissions(updates[])`; **SUPERADMIN dikecualikan** dari matriks.
- **Next step:** Maintain.

</details>

<details>
<summary><strong>PLATFORM-06</strong> · ✅ Done — Table Refactor & Export Excel</summary>

- **Evidence:** DataTable diperbarui dengan filter kolom & export Excel, list user/KT direfactor.
- **Next step:** Maintain dan perluas ke modul baru jika ditambahkan.

</details>

<details>
<summary><strong>PLATFORM-07</strong> · ✅ Done — Hierarchical Menu (3-Level)</summary>

- **Evidence:** Schema support recursive self-relation; UI & RBAC supporting 3-level.
- **Next step:** Maintain.

</details>

#### MD — Master Data

<details>
<summary><strong>MD-01</strong> · ✅ Done — Regions</summary>

- **Evidence:** Region schema, server actions, region page, tree UI, validation, 1 test file (391 LOC).
- **Next step:** Maintain.

</details>

<details>
<summary><strong>MD-02</strong> · ✅ Done — Farmer Groups</summary>

- **Evidence:** `FarmerGroup` schema, CRUD actions, list/detail/form UI, RBAC filter.
- **#160 ✅ (2026-07-15):** `groupType` (Asosiasi/Koperasi) + `establishedYear` + sertifikasi RSPO (`rspoCertStatus`+`rspoCertYear`) + kode ICS→ISH + data 31 lembaga terisi.
- **#169 ✅ kode (2026-07-16):** sertifikasi ISPO + assurance SAP/MAP (`ispoCertYear/Status`, `sapMapAssuranceYear/Status`, enum generik `CertStatus`; migrasi applied) + 3 card sertifikasi & badge info panel di Main Dashboard (snapshot-backed). Sisa: isi data + regenerate snapshot + retro/close.
- **#170 ✅ kode (2026-07-16):** form dikelompokkan 5 section + fix trigger Select raw value (Base UI `items`).
- **#171 ✅ kode Fase 1 (2026-07-16):** detail Lembaga = profil 360° ber-Tabs — header badge sertifikasi + 5 cards (incl. skor DA-02) + tabs Ringkasan/Petani/Lahan (+peta sebaran poligon)/Pelatihan/Produksi; action `getFarmerGroupDetail` real-time + pure lib (+5 unit).
- **Next step:** #171 Fase 2 (tab Petani/Lahan mendalam — menunggu data memadai); isi data ISPO/SAP-MAP saat tersedia.

</details>

<details>
<summary><strong>MD-03</strong> · ✅ Done — Farmer</summary>

- **Evidence:** `Farmer` model ✅, `src/server/actions/farmer.ts` (188 LOC) ✅, validation ✅, UI (list/detail/form) ✅, test ✅.
- **#152 ✅ (2026-07-15):** detail Petani tampilkan KT turunan dari lahan aktif (`lib/farmer-sub-groups.ts`).
- **#172 ✅ kode (2026-07-16):** detail Petani = **profil 360° ber-Tabs** — header (avatar placeholder TD-017, badge Lembaga ber-link #171, breadcrumb = ID Petani) + 5 cards (Lahan+Luas, Produksi, Pelatihan n/paket, Kelengkapan Profil 5-cek, Produktivitas terakhir #166) + tabs Ringkasan/Lahan (tabel + peta shared + PDF Profil Lahan #134)/Pelatihan (checklist + riwayat pre→post)/Produksi (per tahun ber-persentase kelengkapan bulanan + bulanan collapsible + 4 kategori); action `getFarmerDetail` + pure lib (+4 unit); **sensor NIK & tanggal lahir di layar** (`lib/mask.ts`, +3 unit).
- **#343 ✅ (2026-09-22):** **Profil Petani (PDF)** — dokumen setingkat petani: Bagian A ringkasan (identitas ber-NIK penuh, 5 kartu = layar, Daftar Lahan bernomor, peta sebaran penanda bernomor, pelatihan satu tabel Paket·Tanggal·Pre/Post, produksi gabungan + rekap per lahan, Monev BMP tabel + radar bila VIEW menu Monev BMP) + Bagian B lampiran Profil Lahan per lahan ber-geometri (`drawFarmPassport`, tanpa section Pelatihan yang berulang), footer `Hal. n/N` menerus; action `getFarmerProfilePassport` (guard PRINT + scope petani, `buildFarmerDetail` sebagai satu sumber angka, pohon/patok via groupBy, lampiran chunk 5 paralel dengan akses+pelatihan dihitung sekali); tombol header Detail Petani + aksi baris Daftar Petani (`TableActions` tipe `print`), dialog Lengkap / Ringkasan saja bila lahan > 10; Bantuan tutorial `l-9`; +27 unit.
- **Next step:** verifikasi visual owner → retro/close #172; field foto petani = TD-017 (slot foto di Profil Petani menyusul).

</details>

<details>
<summary><strong>MD-04</strong> · ✅ Done — Parcels</summary>

- **Evidence:** `LandParcel` model ✅, `src/server/actions/land-parcel.ts` (165 LOC) ✅, `src/server/actions/bulk-upload-parcel.ts` (222 LOC) ✅, validation schema ✅, UI list/detail/form ✅, ZIP Shapefile bulk upload dengan column mapping ✅, 14 unit tests ✅. **Data Pohon Sawit (#238, 2026-08-08):** model `Tree` (`tbl_tree`) ✅, bulk upload ZIP shapefile point (`bulk-upload-tree.ts` + helper murni `lib/tree-upload.ts`) ✅, detail lahan: kartu Pohon Sawit + titik di peta Informasi Lahan; detail petani (tab Lahan): kolom Jumlah Pohon + titik di peta Sebaran Lahan ✅, revisi per-set + repoint saat lahan berevisi ✅.
- **Evidence (lanjutan):** **Identitas & satelit lahan (#296, 2026-08-27):** `LandParcelIdentity.parcelUid` + 5 tabel satelit ✅, import Excel tab Detail Lahan ✅, tab Legalitas + CRUD manual ✅, kolom legalitas Report Lahan & tab Lahan Petani ✅; **#298** Detail Lahan ber-tabs + PDF Profil Lahan 2 halaman ✅; **#297** audit test (suite 1072) ✅.
- **Evidence (2026-09-14, siklus #326–#332):** **#317 Fase 1** kolom `LandParcel.geom` **GENERATED** dari `geometry` JSONB + GiST `tbl_land_parcel_geom_idx` (migrasi `20260914100000`, tanpa backfill, tanpa perubahan jalur tulis; `ST_CollectionExtract` menjaga ring kolinear tak menggagalkan bulk upload) ✅; **#326 sepadan** `LandParcelBorder` 1:1 (teks bebas U/T/S/B; form, import Excel Detail Lahan, atribut DBF shapefile, PDF Profil Lahan; hapus = kosongkan kolom) ✅; **#327 lahan tetangga ≤ 25 m** (`ST_DWithin` via GiST, poligon putus-putus bernomor + legenda di peta Detail Lahan & PDF Profil Lahan; nama petani tetangga selalu tampil — revisi owner) ✅. Satelit NKT (#328) & patok (#329–#331) dicatat di **MD-08**.
- **Next step:** Maintain; **5 migrasi `20260914*` applied di keempat DB — `mis-dev` + `mis-staging-local` (09-14), `mis-staging` & `mis-prod` (09-15, #333)** (satu siklus deploy + seed menu `report-marker` + refresh `applied-checksums.json` #303); expand to Production dependency. Fase 2 pohon: layer titik di Peta Lahan. #317 Fase 2 (deteksi tumpang tindih) kini bisa langsung memakai `geom`.

</details>

<details>
<summary><strong>MD-05</strong> · ✅ Done — Training</summary>

- **Evidence:** Schema (TrainingPackage/Activity/Participant) ✅, actions (363 LOC) ✅, UI (list/detail/modal) ✅, participants management ✅, pre/post-test scores ✅, bulk participant removal ✅, 23 unit tests (activity 16 + participant 7) ✅.
- **Next step:** Maintain; #77-#82, #94 complete.

</details>

<details>
<summary><strong>MD-06</strong> · ✅ Done — Agronomy / Production</summary>

- **Evidence:** ProductionRecord model ✅, `src/server/actions/production.ts` (180 LOC) ✅, `src/server/actions/bulk-upload-production.ts` (95 LOC) ✅, validation schema ✅, UI list/detail/form pages ✅, 13 unit tests ✅.
- **Next step:** Maintain; #89 complete (per-farmer/parcel tracking, period validation, bulk upload).

</details>

<details>
<summary><strong>MD-07</strong> · 🔲 Planned — Staff</summary>

- **Evidence:** No staff model/route/action/UI.
- **Next step:** Define scope.

</details>

<details>
<summary><strong>MD-08</strong> · 🟠 Partial — HCV (status NKT per lahan + patok batas; modul asesmen penuh belum)</summary>

- **Catatan status:** dinaikkan ke **🟠 Partial pada rilis v0.35.0 (2026-09-15)** bersama baris `metrics.md` (Roadmap 87,6% → 88,2%); kode #328–#332 sudah di `mvp` sejak 2026-09-14, tetapi status sengaja ikut siklus rilis karena `roadmap.test.ts` menjaga Roadmap % = baris rilis terakhir.
- **Evidence (#328, 2026-09-14):** status NKT per lahan — `LandParcelNkt` (satelit 1:1 identitas lahan; status termasuk/terdampak/tidak, kategori NKT 1–6, luas & panjang area NKT, tanggal/asesor/sumber), form + hapus di Detail Lahan, kolom & template tersendiri di importer Data Lahan Detail (dengan bawaan per berkas untuk daftar "terdampak" ala Lampiran asesmen), filter/kolom/KPI di Laporan Lahan, layer "Lahan NKT" di Peta Lahan, badge + baris di Profil Lahan PDF. Tanpa menu baru (menumpang menu Lahan).
- **Evidence (#329, 2026-09-14):** patok batas lahan — `LandMarker` + `LandParcelMarker` (patok fisik dipakai bersama lahan berdampingan, nomor per lahan), tab Patok di Detail Lahan (generate dari poligon, tambah/ubah/urutkan/lepas, foto), unggah GPS Excel/CSV & shapefile Point, PDF, ekspor per Lembaga; tanda **NKT turunan** di tiap patok (merah) dari status lahan pemakainya.
- **Evidence (#330–#332, 2026-09-14):** NKT & patok di semua menu harian — filter NKT/Patok + badge di Master Data Lahan, KPI Lahan NKT & Patok + layer di Detail Lembaga/Petani (#330); layer patok (kuning/merah) + unduh/PDF per baris legenda di Peta Lahan, kode patok unik `<Lembaga>-PTK-000123`, filter/kolom/KPI patok di Laporan Lahan, menu **Report › Patok** (#331); **Laporan NKT per Lembaga (PDF)** dari Report › Lahan — KPI, peta lahan NKT bernomor, tabel lahan NKT, ringkasan kategori (#332).
- **Belum:** layer poligon area NKT + deteksi spasial, riwayat asesmen per tahun, luas/rekomendasi pengelolaan lanjutan, dokumen laporan asesmen (S3), tindak lanjut, dashboard NKT.
- **Next step:** kumpulkan data asesmen Lembaga lain (HJP sudah ada Lampiran III), lalu putuskan apakah modul asesmen penuh dibutuhkan.

</details>

<details>
<summary><strong>MD-09</strong> · 🔲 Planned — BUSDEV</summary>

- **Evidence:** No BUSDEV model/route/action/UI.
- **Next step:** Define scope.

</details>

<details>
<summary><strong>MD-10</strong> · 🔲 Planned — IMPACT</summary>

- **Evidence:** No IMPACT model/route/action/UI.
- **Next step:** Define scope.

</details>

<details>
<summary><strong>MD-11</strong> · 🔲 Planned — Workplan</summary>

- **Evidence:** No workplan model/route/action/UI.
- **Next step:** Define scope.

</details>

#### DASH — Dashboard

<details>
<summary><strong>DASH-01</strong> · ✅ Done — Dashboard: Basic Data</summary>

- **Evidence:** Menu `dashboard` (parent) + `dashboard-main` (Main Dashboard) ✅; `/admin/dashboard/main` UI (**14 summary cards** — termasuk card Total Kelompok Tani #148 + 3 card sertifikasi RSPO/ISPO/SAP-MAP #169 — + filter Distrik/Lembaga Petani/Tahun; peta:info panel 60:40, badge sertifikasi + konten 2 kolom di info panel) ✅.
- `MainDashboardSnapshot` model + `tbl_snapshot_main_dashboard` migration ✅; snapshot module `/admin/tools/snapshot` (generate/list/detail) ✅; 5 unit tests ✅.
- **Next step:** Implement #99 completed (DASH-01).

</details>

<details>
<summary><strong>DASH-02</strong> · ✅ Done — Dashboard: Server Actions</summary>

- **Evidence:** `src/server/actions/dashboard.ts` (RBAC-scoped aggregation) + `src/server/actions/snapshot.ts` (CRUD) + `src/lib/dashboard-aggregation.ts` (pure, tested) + `src/lib/dashboard-query.ts` ✅.
- **Next step:** Implement #99 completed.

</details>

<details>
<summary><strong>DASH-03</strong> · ✅ Done — Interactive Map</summary>

- **Evidence:** `src/app/(admin)/admin/dashboard/dashboard-map.tsx` — MapLibre (react-map-gl) clustered KT markers + label nama KT pada titik non-cluster, auto-fit bounds, click-to-select info panel, NULL-coordinate empty state ✅.
- **Next step:** Implement #99 completed.

</details>

<details>
<summary><strong>DASH-04</strong> · ✅ Done — Dashboard BMP (Produksi) (#166)</summary>

- **#166 ✅ (2026-07-15):** **BMP Dashboard (Produksi)** — **snapshot-backed** `/admin/dashboard/bmp` (menu `dashboard-bmp`, rename owner dari "BMP Dashboard"). 4 score cards fokus produksi (Total Produksi Ton, **Produktivitas Ton/Ha per tahun**, Lahan ber-data n/total, Petani melapor n/total), combo chart SVG hand-rolled **bar Produksi + line % lahan melapor** (sumbu Y adaptif dengan tick bulat 1/2/5×10^k — usulan sumbu tetap 0–2000 dibatalkan owner; chart stretch memenuhi card, tooltip), panel **Ketersediaan Data Produksi** 4 kategori (reuse ambang/helper MAP-02) + link Peta BMP.
- **Filter global 5-serangkai (revisi owner):** **Kategori | Distrik | Lembaga | Tahun (default "Rataan") | Kelengkapan Data (Semua ⇄ Full 1 Tahun)** — semuanya di header dan memfilter **cards + chart sekaligus**, di-slice **client-side** dari satu snapshot org-wide (pola Main Dashboard). Mode **Rataan** = cards rata-rata per tahun (Σ nilai tahunan ÷ jumlah tahun ber-data) + chart rata-rata bulanan; kumulatif hanya di tools detail. Mode **Full 1 Tahun** = hanya LAHAN dengan data **12 bulan penuh Jan–Des** pada tahun ybs (per lahan per tahun; tahun berjalan belum bisa full sampai Desember terisi) — anti bias data bolong; snapshot menyimpan subset `monthlyFull`/`byYearFull` per Lembaga.
- **Definisi Produktivitas (keputusan owner):** **Ton/Ha per tahun** = Σ produksi(tahun terpilih) ÷ Σ luas lahan **melapor**(tahun terpilih) — mode Semua Tahun = rata-rata tahunan tertimbang luas, bukan kumulatif; 0 bila belum ada pelapor; record tanpa lahan masuk pembilang (disclaimer pola #136).
- **Snapshot & tools:** model `BmpDashboardSnapshot` → `tbl_snapshot_bmp_dashboard` (migration `20260715081831` **applied** + seed menu/permission dijalankan, approval owner); grain JSON **per Lembaga** (`BmpGroupEntry`: monthly per-period + **byYear** per-tahun + availability + totals) di `lib/bmp-dashboard-aggregation.ts` (pure); actions `snapshot-bmp.ts` (generate/list/detail/soft-delete, RBAC 3 lapis + dedup per detik) + `dashboard-bmp.ts` (`getLatestBmpSnapshot`, row-scope + slice per viewer); tools `/admin/tools/snapshot-bmp` (generate Semua Data + list + detail per-Lembaga + Excel export).
- **Monev BMP (Teladan/Praktisi/Perintis/Belum) out-of-scope** — data belum ada; ditindaklanjuti **#344 / DASH-08** (2026-09-18) sebagai menu terpisah, bukan kartu di dashboard ini.
- **Test:** +27 unit (`dashboard-bmp.test.ts`) +2 perf (`buildBmpSnapshotData` 6k lahan × 36 bln; slice+chart) +5 unit filter Kelengkapan Data — total **441** ✅; lint 0; build ✅.
- **Status penutupan:** verifikasi visual owner ✅ → retro + **close #166** (2026-07-15). **Sisa operasional:** regenerate snapshot BMP — snapshot pra-`byYear`/`monthlyFull` menampilkan 0 pada filter Tahun & mode Full 1 Tahun.
- **#191 ✅ (2026-07-31): perombakan dashboard** — filter Tahun **default tahun berjalan** (fallback tahun terbaru ber-data; Rataan pindah ke paling bawah); KPI jadi 4 card satu-angka-besar (**Produktivitas · Total Produksi · Luasan · Petani Terdata**; card Lahan dihapus; sub-teks seragam %→total→tahun); **2 grafik 50/50** (tren + **ranking Top-10 produktivitas per Lembaga**); panel Ketersediaan Data **dihapus** (tetap di Peta BMP) diganti **card besar Ex-Plasma vs Swadaya** (3 metrik + analisa per distrik + per **umur tanaman** — bucket fase sawit TBM/<4, TM muda 4–8, prima 9–15, tua 16–25, renta >25, umur dihitung pada tahun produksi). Snapshot diperluas mundur-kompatibel: `totals.totalLuasHa` + `byYearAge`/`byYearAgeFull` (perlu **regenerate snapshot** untuk terisi). Terminologi UI produksi "Melapor" → **"Terdata"** menyeluruh (identifier & key JSON tetap). +10 unit test.

</details>

<details>
<summary><strong>DASH-05</strong> · ✅ Done — Dashboard: Card Total Kelompok Tani</summary>

- **#148 ✅ (kode):** kartu "Total Kelompok Tani" = distinct `subGroupLv2` **per Lembaga** (`KTDetails.kelompokTaniCount`, ternormalisasi, null diabaikan, year-independent) → `stats.totalKelompokTaniLahan`.
- `sumKelompokTaniStats`/`scopeSnapshotData` recompute saat slice; `normalizeSnapshotData` default 0 (snapshot lama); select `subGroupLv2` di `dashboard-query.ts`; kolom di tabel snapshot list + detail.
- **Snapshot-backed** — 0 sampai data `subGroupLv2` (#150) + regen. Filter generate **dinonaktifkan** (`FILTERS_ENABLED=false`) = Semua Data; kolom Distrik/Tahun list default hidden. +2 unit test.
- **Next step:** Implement #148 completed.

</details>

<details>
<summary><strong>DASH-06</strong> · ✅ Done — Dashboard Pelatihan</summary>

- **✅ (2026-07-21):** **Dashboard Pelatihan** — `/admin/dashboard/training` (menu `dashboard-training`, order 3 di grup Dashboard; VIEW untuk SUPERADMIN/ADMIN/OPERATOR/MANAGEMENT). Menjawab pertanyaan "program sudah sejauh mana, Lembaga/paket mana yang tertinggal" — beda peran dari **Report Pelatihan** (`report-training`) yang wajib pilih Distrik+Lembaga dan berorientasi cetak.
- **Live query, BUKAN snapshot-backed (keputusan arsitektur):** volume pelatihan kecil (ratusan kegiatan, ribuan baris kehadiran) sehingga `getTrainingDashboardView()` query langsung ke DB dan seluruh agregasi dilakukan client-side. Tidak ada model/migration/tabel snapshot baru — kontras dengan DASH-01/DASH-04 yang snapshot-backed.
- **Lapisan keamanan:** `requirePermission("dashboard-training")` di page + `hasPermission(...,"VIEW")` di action + `farmerGroupAccessFilter(getAccessContext())` pada query FarmerGroup; `isActive: true` difilter di keempat level (FarmerGroup, Farmer, TrainingActivity, TrainingParticipant) untuk **semua role** termasuk SUPERADMIN (pola dashboard/report).
- **Isi:** filter global 4-serangkai (Kategori | Distrik | Lembaga | Tahun, default **Semua Tahun** karena cakupan bersifat kumulatif) → **5 KPI card** (Cakupan Petani Terlatih, Total Kegiatan, Kehadiran vs Petani Unik, Partisipasi Perempuan, Rata-rata Kenaikan Skor) → **matriks cakupan Lembaga × Paket** (heatmap 5 tingkat, sel 0% dibedakan merah, sortable, **collapsible** dengan ringkasan saat terlipat) → **chart tren** SVG hand-rolled (stacked bar kehadiran per paket; 12 bucket bulan bila tahun dipilih, 1 bucket per tahun bila "Semua Tahun") + **panel efektivitas pre/post** (per paket, menandai skor turun/tetap sebagai indikasi salah input) → **panel kualitas data** (kegiatan tanpa bukti/lokasi/peserta, peserta tanpa skor lengkap) dengan deep-link ke Master Data Pelatihan.
- **Denominator cakupan (keputusan owner):** seluruh **petani aktif** di Lembaga terpilih — termasuk Lembaga yang belum tersentuh pelatihan, supaya sisa pekerjaan terlihat jujur. Petani unik dihitung lintas Lembaga (Set `farmerId`) agar tidak double-count.
- **Evidence:** action `src/server/actions/dashboard-training.ts`; lib murni `src/lib/training-dashboard-aggregation.ts` (7 fungsi + konstanta urutan/label paket); tipe di `src/types/dashboard.ts`; 8 file UI di `src/app/(admin)/admin/dashboard/training/`; seed `menu.csv` + `role-permissions.csv`.
- **Test:** +33 unit (`dashboard-training.test.ts` — agregasi + RBAC scope where-fragment 3 mode + target/gap + regresi monotonisitas) → total **568** ✅; lint 0 error; build ✅.
- **Review putaran 2 (2026-07-21) — 5 cacat diperbaiki:** (a) **pembilang cakupan bocor** — peserta tidak memfilter `farmer.isActive` maupun keanggotaan Lembaga, padahal penyebut (`_count.farmers`) memfilter keduanya → sel bisa >100%, `gap`=0, sel jadi **tidak bisa diklik** sehingga petani yang benar-benar belum dilatih tak terjangkau; (b) tooltip kolom "Lainnya" mencetak `target null% tercapai`; (c) `exportToExcel` sudah menambah ekstensi sendiri → nama berkas `…xlsx.xlsx`, plus sanitasi nama Lembaga; (d) ringkasan "kurang N menuju target" dijumlah hanya atas paket ber-kegiatan → **non-monoton** (mencatat kegiatan paket baru menaikkan angka kekurangan); (e) `packageCode`/`year` dari klien tak divalidasi → `PrismaClientValidationError` 500. Persen kini dibulatkan ke bawah agar 999/1.000 tidak terbaca "100%".
- **Drill-down & target (2026-07-21):** sel matriks yang belum mencapai target bisa **diklik** → modal daftar petani yang belum dilatih (Nama + ID Petani + L/P, **tanpa NIK**) dengan tombol **Salin** & **unduh Excel** — siap jadi daftar undangan. Action `getUntrainedFarmers` memakai `AND: farmerGroupAccessFilter(...)` (bukan spread) untuk menghindari pitfall key-collision, diambil **on-demand** agar payload awal tetap ramping. Target program `TRAINING_COVERAGE_TARGET` = **100% petani aktif per paket** (keputusan owner; konstanta di lib, `OTHER` tanpa target).
- **Next step:** filter tersimpan di URL, export matriks, deep-link panel kualitas data yang benar-benar terfilter.

</details>

<details>
<summary><strong>DASH-07</strong> · ✅ Done — Dashboard Risk Management: Fire Alert (#266)</summary>

- **✅ (2026-08-19):** `/admin/dashboard/risk/fire` (menu 3 level `dashboard` → `dashboard-risk` → `dashboard-risk-fire`; VIEW+PRINT untuk 5 role). Titik api VIIRS (NASA FIRMS, proxy `/api/map-hotspot` existing — guard dilonggarkan jadi `map-parcel` **atau** `dashboard-risk-fire` VIEW) diklasifikasi **point-in-polygon** terhadap **boundary lembaga (ICS)** — beda metode dari Peta Lahan yang berbasis jarak haversine 15 km ke titik kantor lembaga.
- **Model `FarmerGroupBoundary`** (`tbl_farmer_group_boundary`): dual-column — `geom geometry(MultiPolygon,4326)` PostGIS (sumber kebenaran + GiST, siap analisa overlap kawasan) + `geojson Json` cache render (pola `LandParcel.geometry`); `geom` bertipe `Unsupported` → tulis via `ST_GeomFromGeoJSON` ($executeRaw), dan pemindai `schema-scan.ts` melewati field Unsupported agar artefak `data-schema.generated.ts` tetap identik DMMF. Migrasi diterapkan manual (`db execute` + `migrate resolve`) karena drift checksum lokal pre-existing.
- **Seed boundary**: `scripts/seed/seed-boundary-lembaga.ts` — shapefile `Groups-Boundary.zip` (30 poligon ICS, UTM 47S → WGS84 via shpjs) + mapping manual `boundary-mapping.csv` (nama ICS → `FarmerGroup.code`); validasi total (unmapped/duplikat/geometri → gagal berlaporan), dry-run default `--apply` untuk menulis, idempotent (soft-delete + insert). Catatan: boundary "PPKSSM / APKSMB & KSJ" gabungan → dipetakan ke PPKSSM. **Diselesaikan #268 (2026-08-19):** mapping mendukung **multi-kode per poligon** (`ISH-1408-09+ISH-1408-10`) sehingga **Koperasi Sawit Jaya (KSJ) & Koperasi Beringin Jaya (KBJ) berbagi satu poligon** — klasifikasi multi-hit (`groupIds[]`), titik dihitung di tiap pemilik, kartu ringkasan tetap titik **unik**.
- **UI:** ¾ peta MapLibre (boundary biru berlabel + titik confidence-colored; bentuk = pembeda lokasi: dalam boundary ikon api, luar lingkaran kecil; legenda on-map kiri-bawah; popup titik/boundary) | ¼ panel (toggle rentang 24 jam/5/10/30 hari default 5 (#284, lihat butir di bawah), 4 kartu ringkasan, breakdown confidence, tabel Lembaga × jumlah titik urut terbanyak — hanya lembaga ber-titik api, di panel maupun PDF). Klasifikasi client-side (`lib/fire-alert.ts`, ray-casting lokal tanpa turf di bundle) — live FIRMS, **tanpa riwayat di DB** (keputusan scope #266).
- **Print Map** (`lib/fire-map-print.ts`, pola BMP): scope Full Riau / Per District (per-lembaga dicabut saat review owner) → auto-zoom bbox + tunggu `idle` → capture → PDF; gate PRINT. *(Format awal A4 landscape peta+rekap — **digantikan** oleh "Laporan Titik Api" A4 portrait, lihat butir PDF di bawah.)*
- **Akses:** `getFireBoundaries` guard VIEW + `farmerGroupAccessFilter(getAccessContext())` — boundary/rekap mengikuti scope user.
- **Iterasi review owner (2026-08-19):** klik baris tabel → zoom + highlight boundary terpilih (outline tebal + fill pekat); warna boundary **Antique Violet #660099**; ikon `ShieldAlert`/`Flame` didaftarkan ke `icon-map.tsx`; tabel panel & PDF hanya lembaga ber-titik api.
- **Batas administrasi (BIG):** model `AdministrativeBoundary` — satu tabel lintas level (enum `AdminBoundaryLevel`), FK `districtId` nullable, cache `geojson` tersimplifikasi 0,001° (9,7 MB → 165 KB), seed `seed-batas-administrasi.ts` (12 kabupaten); garis putus-putus abu + label selalu tampil sebagai konteks; `getAdminBoundaries` tanpa access-context (garis referensi publik).
- **Tooltip rincian kartu:** Dalam Boundary per distrik program, Luar Boundary per kabupaten (PiP poligon BIG) + "Kab. Lainnya" — `countPointsByNamedArea` + `StatTooltipContent`.
- **Hotspot dipangkas ke Provinsi Riau:** bbox FIRMS persegi ikut menangkap Malaysia/Sumbar/Jambi → hasil fetch disaring `filterPointsWithinAreas` terhadap gabungan 12 poligon kabupaten BIG (fallback tampil semua bila batas belum ter-seed).
- **PDF "Laporan Titik Api"** (rombak total, mockup owner): A4 portrait ber-logo WRI + font **Acumin Pro** ter-embed (WOFF CFF→TTF via fonttools/cu2qu), kartu ringkasan, peta sebaran, tabel detail per titik, lampiran peta per lembaga ber-titik api, catatan metodologi; boundary ICS **sudah termasuk buffer 1,5 km** (fakta owner — penamaan mengikuti).
- **Test:** +26 (`fire-alert.test.ts` 20 unit + 2 route guard + 3 `buildFireMapDoc` + 1 perf PiP + 1 boundary bersama) → total **917** ✅; Bantuan: tutorial `p-11-fire-alert.md` + konsep `3-1-dashboard.md`.
- **#284 ✅ (2026-08-24): rentang 10 & 30 hari** — asumsi #271 (">5 hari butuh snapshot DB + cron") dikoreksi: cap FIRMS 5 hari berlaku **per request**, parameter `DATE` membolehkan jendela lampau. `upstreamWindows` (`lib/firms.ts`) memecah rentang UI jadi jendela 5 hari berbasis **tanggal UTC** (jendela terbaru selalu tanpa `DATE` → URL sama dengan opsi 5 hari, cache bersama); proxy fetch paralel + `mergeHotspotCollections` (dedup koordinat+waktu+satelit), `revalidate` 1 jam jendela terbaru / 6 jam jendela lampau, satu jendela gagal → 502. Diverifikasi live: 30 hari = 1.906 titik, ±7 s. `hotspotWindowStart` ikut berbasis tanggal UTC → **#281** (label meleset sehari 00.00–07.00 WIB) selesai. Angka kartu/legenda/tabel ber-pemisah ribuan (`formatNumber`). +17 test. Keputusan owner 2026-08-24 (#287): cetak PDF Full Riau pada 30 hari **tidak dibatasi** — Bantuan memperingatkan, progres + Batalkan (#276) tersedia.

</details>

<details>
<summary><strong>DASH-08</strong> · ✅ Done (v0.36.0, 2026-09-20) — Monev BMP: skor per petani per tahun + rincian indikator + dashboard (#344, #346)</summary>

- **Catatan status:** baris `DASH-08` ditambahkan ke Phase Status saat rilis **v0.36.0** (2026-09-20) sebagai ✅ Done · inti — roadmap 88,2% → **88,5%** (80,5/91).

- **#344 (2026-09-18, kode selesai — menunggu migrasi & seed lokal, lalu smoke):** tindak lanjut catatan out-of-scope #166. Sumber: rekap Excel tim lapangan Rokan Hulu (8 Lembaga, 206 skor survei 2026). **Keputusan owner:** grain **per petani per tahun** (bukan lahan; lahan dikunjungi opsional), **hanya skor akhir** (tanpa indikator), blok baseline 2024 skala 0–100 diabaikan, import Excel + form koreksi, tiga penempatan (Master Data › Monev BMP, Dashboard › Monev BMP, tab Monev BMP di Detail Petani), layer Peta BMP → issue terpisah. **Temuan saat uji parser:** skor tepat 2,50 diberi label Praktisi oleh tim lapangan → rubrik `> 2,50` dibaca **ketat** (Teladan ≥ 2,51), mengoreksi asumsi awal ≥ 2,50.
- **Skema:** `BmpAssessment` → `tbl_bmp_assessment` (migrasi `20260918120000`, manual dari `migrate diff`, additive). Kategori **tidak disimpan** — `BMP_ASSESSMENT_CATEGORIES` di `lib/bmp-assessment.ts`. Satu baris aktif per petani-tahun: cek di action + **partial unique index** `uniq_bmp_assessment_farmer_year_active` (migrasi `20260920100000`, temuan review — cek `findFirst` saja tidak atomik). Review 2026-09-20 juga memperbaiki toleransi tanggal WIB (UTC tengah malam vs `Date.now()`) dan impor ulang yang menghapus tanggal tersimpan.
- **Menu & izin:** `master-data-bmp-monev` (order 6) + `dashboard-bmp-monev` (order 3, tepat di bawah BMP Dashboard (Produksi); Pelatihan/Risk bergeser 4/5) — izin cermin Pelatihan (33 baris `role-permissions.csv`); seed parsial `scripts/seed/seed-menu-bmp-monev.mjs` (dry-run default, ikut menggeser `order`).
- **Master Data › Monev BMP:** DataTable (filter Distrik→Lembaga, Tahun, Kategori, Status SUPERADMIN; kolom Penilai/Catatan tersembunyi; Excel EXPORT), form modal (Lembaga→Petani combobox, tahun, tanggal UTC-day, skor koma/titik dengan badge kategori seketika, lahan dikunjungi dari lahan aktif petani, penilai, catatan), **Import Excel** format rekap: pilih Lembaga (ID Petani hanya unik per Lembaga) → berkas/sheet → pratinjau (Baru/Perbarui/Tak dikenal + peringatan lahan tak dikenal, tanggal tak terbaca/masa depan/beda tahun → dikosongkan) → simpan (server resolusi ulang, upsert per petani-tahun, transaksi tunggal). Parser murni `parseBmpImportRows` (header dua baris multi-tahun, sel merge dirambatkan, template satu baris juga dikenali, baris tanpa ID dilewati & dilaporkan) diuji dengan berkas asli: 206/206 baris terbaca.
- **Dashboard › Monev BMP:** realtime pola Pelatihan (`getBmpMonevDashboardView` + agregasi murni `lib/bmp-monev-dashboard-aggregation.ts`), filter URL Distrik/Lembaga/Tahun (default tahun terbaru ber-data). **Revisi owner 2026-09-19 ("kurang intuitif, seperti master data")** setelah smoke dengan 8 Lembaga Rohul (188 petani): urutan baca jadi 4 KPI (Petani Dinilai / Rerata Skor / Menerapkan BMP / Lembaga Tercakup) → **hero Sebaran Kategori Petani** (4 ubin jumlah+% per kategori + batang 100%) → komposisi per Lembaga (3/5) + ranking rerata Top-10 (2/5, skala tetap 0–3) → **histogram sebaran skor** (bin 0,25, warna kategori, garis rerata) + tren per tahun → tabel rekap **dilipat, bawaan hanya Lembaga ber-data** (tombol "Tampilkan N belum dinilai"; Excel tetap semua). Palet ordinal divalidasi skill dataviz (abu + 3 hijau; CVD ΔE ≥ 8, normal ≥ 15). Bug smoke: dialog import menjebol lebar (grid child `min-w-0`), entitas `&gt;` di teks JSX membuat SWC membuang spasi setelah `{expr}` → pakai `{">"}`.
- **Detail Petani:** badge kategori tahun terbaru di header + tab **Monev BMP** (riwayat, Tambah/Edit dengan petani terkunci; tab hanya tampil bila VIEW `master-data-bmp-monev`).
- **Perbaikan sampingan:** `cellValueToPrimitive` hyperlink ber-rich-text → teks (sebelumnya `[object Object]`); `readXlsxWorkbookRaw` (baca semua sheet mentah) di `excel-sheet-reader.ts`.
- **Bantuan:** tutorial `t-7-mencatat-monev-bmp` + `p-13-dashboard-monev-bmp`; konsep Master Data & Dashboard diperbarui; cakupan tutorial **34/37**. **Test:** +21 helper murni, +9 agregasi, +13 guard action, +1 excel-cell.
- **#346 (2026-09-20, kode): rincian indikator + penilaian Lembaga.** Analisis 192 form survei per petani (`scripts/local/seed/data-monev-bmp/Rokan Hulu/`): template seragam (1 varian struktur & rubrik), 5 kegiatan berbobot, 32 indikator (18 individu + 14 Lembaga; 21 berbobot), penilaian Lembaga = 14 skor identik per Lembaga, skor petani bergantung 6 indikator Lembaga. Temuan data: form tanpa ID Petani (177/192 cocok otomatis), **8 berkas header ≠ nama file** (copy-paste), 7 sel skor 4 (RSB), 80 berkas tanpa Periode, **13 berkas total raport basi** vs sheet indikator (RSB 11, SKPE 2). Keputusan owner: skor 4 diterima + ditandai; identitas = nama berkas + dropdown pratinjau; Lembaga per indikator saja; sel kosong = NULL. **Skema:** `ref_bmp_indicator` (seed CSV dari Panduan), `tbl_bmp_assessment_detail`, `tbl_bmp_group_assessment(+_detail)` (migrasi `20260920120000`, partial unique Lembaga-tahun). **Kode:** parser murni `lib/bmp-survey-form.ts` (header ber-merge, skor dari sheet Lembaga/Individu, pemetaan kriteria+teks → fallback urutan, nama dari nama berkas, `matchFarmerName` fuzzy, `recomputeBmpScore` — 179/192 = total form), actions `bmp-assessment-detail.ts` (master, detail view + hitung ulang, simpan grid individu ± timpa skor, penilaian Lembaga upsert, import multi-berkas transaksi tunggal), **halaman detail** `/bmp-monev/[id]` (raport 5 kegiatan + 30 indikator + arti rubrik + grid edit), **Penilaian Lembaga** `/bmp-monev/lembaga` (chip 14 indikator + modal), tab Import kedua "Form survei per petani" (banyak berkas, status Yakin/Ragu/Ganda/Tak ditemukan + dropdown, peringatan total≠hitung-ulang/skor 4/header≠berkas), tab Petani: klik tahun → rincian ringkas (lazy), dashboard +3 kartu (Profil 5 Kegiatan, Indikator Terlemah, Profil Kelembagaan Lembaga × 14). Bantuan `t-8` + konsep; test +30 (parser/matching/recompute, agregasi, guard action, migrasi).
- **Revisi UX kedua dashboard (owner, 2026-09-20, setelah data rincian 184 petani masuk):** halaman dipecah **4 seksi bernomor** (Gambaran umum → Lembaga Petani → Kegiatan & indikator → Tindak lanjut & tren) supaya sembilan kartu bergaya sama tidak terbaca sebagai tumpukan tabel; **Papan Lembaga** menggabungkan komposisi + ranking rerata (dulu 8 Lembaga yang sama tampil dua kali) dengan urut Rerata/Cakupan/Abjad dan **klik nama = filter dashboard**; heatmap kelembagaan + kolom **Rerata**, urut rerata/abjad, baris rerata per indikator; **Profil 5 Kegiatan → radar (spider) A vs B** dengan dua selektor Semua/Distrik/Lembaga yang **lepas dari filter dashboard** (B mengambil filter sebagai pilihan awal), skala **0–3 berpita 4 kategori** (redup, garis nilai menonjol — biru/oranye tervalidasi dataviz karena hijau dipakai pita), tabel angka A/B/selisih di kanan (kolom "poin hilang" dicoba lalu **dibuang** atas permintaan owner); pertanyaan owner "kenapa Gulma bisa 3,60?" → kriteria **1.3.2 Identifikasi Gulma = petani ATAU pekerja** (hanya salah satu ditanya): aturan alternatif `BMP_EXCLUSIVE_CRITERIA` (skor tertinggi × 0,2, bobot sekali → maks 3,00; bobot master tak diubah) dan **import form survei kini menyimpan skor hitung ulang**, bukan total raport form (guard CSV `bmp-indicator-catalog.test.ts`); **10 Petani Prioritas** (terendah, kegiatan terlemah) + **10 Petani Teladan** (tertinggi, kegiatan terkuat) dimuat on-demand (`getBmpMonevPriorityFarmers(order)`), tautan ke detail penilaian.
- **Review pra-rilis #347 (2026-09-20, pola #339)** atas rentang v0.35.0..HEAD (#344 · #346 · #345 tahap 1): 15 temuan `/code-review high` diperbaiki — terpenting: import form survei kini **menoleh ke penilaian Lembaga yang sudah tersimpan** bila batch tanpa sheet Lembaga (sebelumnya 6 indikator Lembaga dihitung 0), skor diikat ke objek form (nama berkas kembar), rincian ditulis **massal `ON CONFLICT`** (300 form tak melampaui timeout transaksi), soft delete ditegakkan di halaman detail; kolom **ID Petani** di daftar/Excel; `data-qc.ts` bagian E (E1–E8) hijau di dua DB lokal; katalog `docs/product/pages/` Monev BMP (5 dokumen), `crud-flows`, tab Petani; TD-042 (parsing Excel di browser). Test 1.602. **Sisa sebelum rilis:** deploy 3 migrasi + 2 seed ke staging/prod (issue deploy), baris Phase Status + metrik.
- **Data awal Rohul:** di **mis-dev** sudah diimpor 2026-09-19 (188 petani-tahun; skrip lokal `scripts/local/seed/data-monev-bmp/import-rekap.ts`, dedup per petani-tahun, semantik = importer UI) untuk smoke; smoke UI: import SKPE 27 baris (9 ber-lahan, 1 lahan tak dikenal, 17 tanpa lahan) → simpan → impor ulang = 27 diperbarui/0 baru; edit dari tab Detail Petani. Untuk prod: import lewat UI setelah rilis; resolusi tim lapangan dulu: 3 petani ASPEK RSB (`0116/0117/0119`, desa `14.06.04`), 5 ID lahan tak dikenal, tanggal ITM `2026-11-07` (29 baris ITM masuk tanpa tanggal).

</details>

#### MAP — Geospatial Map Explorer

<details>
<summary><strong>MAP-01</strong> · ✅ Done — Map: Peta Lahan</summary>

- **#113 ✅ (scaffolding):** menu `map`+`map-parcel` (seed CSV + DB) ✅.
- **UI:** `/admin/map/parcel` peta full-bleed MapLibre (`react-map-gl`) + panel filter floating collapsible (Province→District→KT + Muat Data) + legend layer toggle (point KT / centroid lahan / polygon lahan) + info popup accordion (Detail Lahan / Pelatihan Petani lazy-load / **Produksi data asli per-lahan + selektor Rata-rata/tahun, grafik sumbu-Y kanan + tooltip** — #134) ✅.
- **Server/lib:** `src/server/actions/map.ts` (`getMapData` + dropdowns + `getFarmerTraining`, 3-layer RBAC) + `src/lib/map-data.ts` (pure, teruji) + `src/types/map.ts` + `src/validations/map.schema.ts` ✅; centroid lahan via `@turf`; 7 unit test ✅.
- **Peta Lainnya:** 2 overlay raster referensi via proxy tile `api/map-overlay/[key]` (atasi CORS upstream): **Kawasan Hutan** (geoportal Kemenhut `geoportal.planologi.kehutanan.go.id`, Peta Interaktif 2026) & **Fungsi Ekosistem Gambut** (Satu Peta BIG, layer FEG 1:50.000) — legend warna kelas + keterangan sumber per overlay saat aktif ✅. *(#215 2026-08-05: domain SIGAP KLHK dihapus dari DNS; Pelepasan/PIPPIB/Penutupan Lahan dihapus tanpa padanan publik — TD-030.)*
- **Tambah Data GIS Lain:** user tambah layer WMS/Shapefile/GeoJSON (parse browser via `shpjs`, `map-custom-gis.tsx`) ✅.
- **Enhancement 2026-07-10:** layer **Titik Api (Hotspot)** NASA FIRMS VIIRS 375 m (proxy `api/map-hotspot` auth-guarded + `lib/firms.ts`, bbox **Riau**, window **24 jam / 5 hari**) + **tool Ruler** ukur jarak & luas geodesik (label segmen/undo/Esc) + **label nama KT & petani** (petani hanya bila **muat di poligon**, wrap otomatis, bounds precomputed) ✅; helper murni `map-geo.ts` + **22 unit test** ✅.
- **Next step:** Implement #113 completed. **#134 (2026-07-11):** produksi popup real per-lahan + selektor tahun + PDF matriks tahun×bulan×Total + rebrand "Profil Lahan" + dedup fetch produksi + fix popup refresh; **#135:** panel kanan daftar lahan (search+zoom); legenda collapsible.
- **Enhancement 2026-08-10 (#240):** revamp **Titik Api** — window "24 jam" jadi **bergulir** (fetch 2 hari UTC + filter klien; `dayRange` FIRMS=1 hanyalah hari UTC berjalan → dulu selalu 0 di pagi WIB), warna & jumlah **per keyakinan** (h/n/l), klik label panel = zoom, **ekspor SHP** (`@mapbox/shp-write`) & **PDF landscape < 15 km dari Lembaga** (lembaga terdekat + jarak, urut terdekat), kalkulasi jarak lazy chunked + **modal ringkasan** (klik baris → zoom titik), checkbox gated data lahan ✅ — proximity alert follow-up #136 praktis terpenuhi versi on-demand (ringkasan < 15 km); alert otomatis/terjadwal tetap terbuka.
- **#284 ✅ (2026-08-24):** rentang titik api Peta Lahan ikut naik jadi **24 jam / 5 / 10 / 30 hari** (`HOTSPOT_DAY_RANGES` bersama Fire Alert; jendela 5 hari ber-`DATE` digabung di proxy); nama berkas ekspor SHP/PDF ber-suffix `10hari`/`30hari`; popup subtitle usia deteksi "n hari lalu"; angka legenda, modal ringkasan & PDF ber-pemisah ribuan. Review #285: semua jendela ber-`DATE` (celah sehari bila "hari ini" FIRMS ≠ server), `Cache-Control: private`, spinner tersangkut saat layer dimatikan di tengah fetch.
- **#313 ✅ (2026-09-01):** **Unduh data spasial lahan** (SHP ZIP / GeoJSON / KML) di **tiga** lokasi — Peta Lahan (panel Filter), Master Data → Lahan (toolbar), dan tab Lahan detail Lembaga Petani (header Sebaran Lahan) — tiga entry point tipis (`getMapParcelExportData` / `getMasterDataParcelExportData` / `getFarmerGroupParcelExportData`, menu key di-hardcode server; varian Lembaga hanya menerima id lembaga) di atas satu kueri ber-guard 3 lapis, atribut lengkap termasuk legalitas (pola #296/#305); DBF ≤10 char transliterasi ASCII + MultiPolygon dipecah (TD-037). Plus UX: opsi "Semua …" filter opsional (juga Peta BMP), highlight lahan ter-popup (kuning + outline tebal), popup bisa digeser (`useMapPopupDrag`, 4 kanvas).
- **Follow-up (tech debt #136):** Recharts grafik popup, data-quality produksi tanpa `parcelId`, debounce/virtualisasi panel, lahan tetangga di PDF (#134-E), warna area lahan 2 kategori (ada/tidak ada produksi); analisis spasial overlap parcel↔kawasan hutan (PostGIS `ST_Intersects`); **hotspot follow-up:** ~~integration test route~~ ✅ #231; proximity **alert otomatis** (notifikasi terjadwal) — versi on-demand sudah via #240.

</details>

<details>
<summary><strong>MAP-02</strong> · ✅ Done — Map: Peta BMP (Layer 1)</summary>

- **#144 ✅ (kode):** sub-menu kedua stream MAP **Peta BMP** (`/admin/map/bmp`) — peta tematik **Ketersediaan Data Produksi** per-lahan, **4 kategori** (Baik >24 bln berturut / Cukup 12–24 / Kurang 1–11 / Tidak ada 0) dari **run bulan berturut-turut terpanjang** `ProductionRecord.period`.
- **Filter:** **Lembaga Petani wajib** (Provinsi/Distrik opsional, hanya menyaring KT; bisa pilih KT langsung); tombol Muat Data disabled sampai KT dipilih.
- **Server action:** `getBmpMapData` di `map.ts` (RBAC 3 layer `hasPermission("map-bmp","VIEW")` + `getAccessContext` scope KT + `isActive`; **1 query lahan + 1 `productionRecord.groupBy` scoped `parcelId IN [...]`**, tanpa N+1). Helper murni `longestConsecutiveMonths`/`productionAvailabilityCategory` (+konstanta ambang `BMP_BAIK_MIN_MONTHS`/`BMP_CUKUP_MIN_MONTHS`) & `buildBmpMapData` di `map-data.ts`; tipe di `map.ts`, Zod `bmpMapFilterSchema`.
- **Canvas:** MapLibre **data-driven fill/line per kategori** (`match` ekspresi) + **popup accordion** (badge Ketersediaan Data + section **Detail Lahan** [run bulan, periode awal/akhir] + section **Produksi Bulanan** = grafik bar Rata-rata/per-tahun, dihitung dari `production` per-lahan yang di-embed—tanpa fetch tambahan, reuse `summarizeProduction`) + legend 4-kategori toggle + count.
- **Revisi desain owner:** rendering **poligon saja, tanpa titik** (centroid lahan & titik KT dibuang) — **NONE = outline saja (base, tanpa fill)**, Baik/Cukup/Kurang = fill berwarna + outline.
- **Cetak & export:** tombol **"Cetak Peta dan Matriks Ketersediaan Data"** → PDF **A4 landscape** via `lib/bmp-map-print.ts` (jsPDF + jspdf-autotable, lazy-import): **hal.1** = judul KT + gambar peta snapshot + legend ketersediaan data + count (`canvasContextAttributes.preserveDrawingBuffer` maplibre v5; fallback graceful bila basemap Hybrid/Google canvas tainted); **hal.2+** = **matriks ketersediaan data per lahan × bulan** (sel = **total produksi kg** bulan itu dengan latar hijau muda; kolom bulan dikelompokkan per tahun, multi-halaman auto). Tombol **"Download Ketersediaan Data (Excel)"** (`lib/xlsx.ts` `exportToExcel`, kolom bulan `MMM-YY` dinamis, lazy-import exceljs). Server `getBmpMapData` kini `groupBy` `_sum: yieldKg` (biaya query sama) → `BmpParcelFeature.production` (period→kg).
- **Panel kanan floating** (`map-bmp-data-panel.tsx`, minimizable + search) = matriks **ketersediaan data per lahan per-bulan** (blok terisi = ada record, kosong = tidak; kolom bulan dikelompokkan per tahun dari rentang data via `enumeratePeriods`) + kolom **Zoom to** (fitBounds ke geometri lahan + buka popup); basemap switcher dipindah ke kanan-bawah agar tak menabrak panel. **File terpisah** (tak menyentuh Peta Lahan). **Label nama petani** di poligon (reuse `parcelLabelFit` map-geo.ts, tampil bila muat).
- **RBAC audit:** scope-leak key-collision di `getBmpMapData` diperbaiki (`farmerGroupAccessFilter` → `AND`, bukan spread; pitfall #127); pola sama di `getMapData` MAP-01 dicatat **BUG-007**. Produksi tanpa `parcelId` diabaikan untuk warna (disclaimer di legend/popup; isu #136).
- **Review pass (8 finder + 10 verifier agent, 2026-07-17):** 10 temuan CONFIRMED diperbaiki — (1) legend PDF produktivitas overflow keluar halaman → legend **wrap multi-baris** dengan tinggi dinamis; (2) "≥" tak ter-encode font core jsPDF (WinAnsi) → label kelas diseragamkan cp1252-safe ("min. 20", en dash) — keduanya diverifikasi empiris ulang (fit 280/287 mm, teks round-trip bersih); (3) popup basi saat ganti Tahun/layer → props popup **di-refresh in-place** saat view berubah; (4) tahun typo (mis. "2924") jadi view default → **sanity window** `BMP_MIN_PRODUCTION_YEAR`–(tahun kini+1) di `bmpProductionYears` + filter entri `parcelProductivity` (AVG tak terdilusi); (5) 4 error `tsc --noEmit` fixture test → anotasi `Pick<BmpParcelFeature,…>`; (6) deteksi mode Rata-rata popup via string label → **diskriminator terstruktur** `productivityIsAvg` + helper tunggal `productivityViewLabel`; (7–8) metadata kelas (warna/short/label ber-ambang dari konstanta) dipusatkan ke **`BMP_PRODUCTIVITY_CLASSES` di `map-data.ts`** — canvas/panel/print semua menurunkannya (tint sel PDF dihitung dari hex yang sama); (9) legend PDF ketersediaan hardcode & sudah divergen dari layar → map atas `BMP_CATEGORIES`; (10) rebuild GeoJSON penuh tiap ganti tahun → produktivitas ke canvas **di-gate mode aktif**, JSON produksi per persil di-memo per dataset, label fit dipisah dari dekorasi view.
- **Test & data:** **+16 unit test** (`map.test.ts` 15→31) **+2 perf test** (`buildBmpMapData` 500 lahan×36 bln 9,27ms; `longestConsecutiveMonths` 600 bln 0,07ms). Read-only, **tanpa tabel/migration baru**. Seed `map-bmp` menu + 4 VIEW **sudah dijalankan** (approval owner, `scripts/local/seed-menu-only.ts`, upsert).
- **Next step:** Selesai. Layer produktivitas terealisasi di **MAP-03 (#174)**; layer lain (pelatihan/sertifikasi) tetap follow-up (#144 Open Q).

</details>

<details>
<summary><strong>MAP-03</strong> · ✅ Done — Map: Peta BMP Layer 2 (Produktivitas)</summary>

- **#174 ✅ kode (2026-07-17):** layer tematik kedua Peta BMP — **Produktivitas (Ton/Ha) per persil**. Panel kiri jadi **2 section layer ber-radio** ("Ketersediaan Data Produksi" / "Produktivitas (Ton/Ha)"; judul langsung tanpa prefix Layer 1/2 — revisi owner), satu aktif pada satu waktu (keduanya mewarnai poligon yang sama); tombol Cetak/Excel pindah ke area bersama di bawah panel (revisi owner atas usulan mode-switch dalam satu section).
- **Definisi (konsisten #166):** Ton/Ha per tahun = Σ `yieldKg`(persil, tahun) ÷ 1000 ÷ `area` persil; **selektor Tahun** (distinct tahun data, default terbaru) + **Rata-rata** (rata-rata Ton/Ha antar tahun melapor). Produksi tanpa `parcelId` tidak dihitung (disclaimer pola #136); `area` null/0 atau tanpa data pada view terpilih → **Tidak Ada Data** (outline saja, pola NONE). Nilai apa adanya — tahun tak lengkap **tidak disetahunkan**, indikator "Bulan Melapor n/12" di popup.
- **Klasifikasi (ambang usulan #174, konstanta `PRODUCTIVITY_*_MIN`):** Tinggi ≥ 20 (hijau) / Sedang 15–<20 (kuning) / Rendah 10–<15 (oranye) / Sangat Rendah < 10 (merah) / Tidak Ada Data (abu).
- **Realtime tanpa perubahan server** (keputusan owner atas opsi snapshot — scope bounded per Lembaga, data sudah termuat): pure helper baru `parcelProductivity`/`productivityClass`/`bmpProductionYears`/`buildBmpProductivityView` (`map-data.ts`) atas `BmpParcelFeature.production` dari `getBmpMapData` — zero query tambahan; ganti tahun/layer instan client-side. Canvas: `match` expression atas properti `productivityClass` + filter visibilitas per kelas mengikuti layer aktif (fill/outline/label).
- **Popup:** strip badge kedua "Produktivitas (tahun|Rata-rata)" (kelas saja, revisi owner — nilai tidak digabung ke badge) + baris Detail Lahan "Produktivitas … Ton/Ha" & "Bulan Melapor n/12" (Rata-rata: "Tahun Melapor n").
- **Cetak & export WYSIWYG (keputusan owner):** PDF & Excel sepenuhnya mengikuti layer aktif — layer Ketersediaan = perilaku lama (legend + matriks per bulan); layer Produktivitas = legend produktivitas + hal.2 **tabel produktivitas per lahan** (Luas, Ton/Ha per tahun menaik + Rata-rata, sel diwarnai kelas; `renderProductivityPages` + opsi `legendTitle`/`productivityMatrix` di `bmp-map-print.ts`, pure helper `buildBmpProductivityMatrix`) dan Excel sheet Produktivitas; label tombol + nama file ikut layer. Cetak dua layer sekaligus ditolak (harus ganti layer → render → capture 2×, rapuh).
- **Test & data:** **+15 unit test** (`map.test.ts` 34→49) **+1 perf test** (`buildBmpProductivityView`+`Matrix` 500 lahan × 36 bulan 18,9ms; suite **480** ✅). Read-only — **tanpa migration/menu/seed baru**, RBAC `map-bmp` existing berlaku.

</details>

#### RPT — Report

<details>
<summary><strong>RPT-01</strong> · ✅ Done — Report: Petani</summary>

- **Evidence:** Menu Level 1 `report` + sub-menu `report-farmer` ✅, `src/server/actions/report.ts` (145 LOC) ✅, halaman `/admin/report/farmer` UI + filter wajib + export Excel & PDF ✅, 3 unit tests ✅.
- **Next step:** Implement #107 completed.

</details>

<details>
<summary><strong>RPT-02</strong> · ✅ Done — Report: Pelatihan</summary>

- **Evidence:** Halaman `/admin/report/training` dengan 6 summary cards, 2 tab (Kegiatan Pelatihan & Cakupan per Petani), ekspor Excel 2-sheet, filter jenis training, dan ekspor PDF.
- **Next step:** Implement #108 completed.

</details>

<details>
<summary><strong>RPT-03</strong> · ✅ Done — Report: Produksi</summary>

- **#132 ✅:** sub-menu `report-production` (seed CSV + role-permissions) + `getProductionReport` di `report.ts` + `lib/report-production.ts` (pure, teruji) + halaman `/admin/report/production` matriks bulanan per petani/lahan (kolom bulan dinamis dari rentang, total per baris & per bulan) + filter Distrik→KT + Periode Awal/Akhir (maks 24 bulan) + Excel export & PDF landscape + 14 unit test.
- **Next step:** Implement #132 completed.

</details>

<details>
<summary><strong>RPT-04</strong> · ✅ Done — Report: Kelompok Tani</summary>

- **#154 ✅ (real-time):** **2 submenu**.
- **Summary** `report-kelompok-tani` — agregat 1 baris per (Lembaga×KT): distinct petani, jumlah lahan, total luas; filter Distrik/Lembaga opsional + search + **column selector** + 6 card.
- **Detail** `report-kelompok-tani-detail` — roster per 1 Lembaga (KT→Petani), **section collapsible** (default tutup). (Level Gapoktan/KUD dihapus #189.)
- Keduanya Excel + PDF. Pure `lib/report-kelompok-tani.ts`(+7) & `report-kelompok-tani-detail.ts`(+7); RBAC 3-layer; Read-only. Level Gapoktan/KUD dihapus #189 (Summary jadi Lembaga×KT; Detail flat KT→Petani).
- **Next step:** Implement #154 completed.

</details>

<details>
<summary><strong>RPT-05</strong> · ✅ Done — Report: Lahan</summary>

- **#177 ✅ (real-time):** submenu `report-land-parcel` — roster datar **1 baris = 1 lahan aktif**: Lembaga Petani | Nama Petani | ID Petani | ID Lahan | Kelompok Tani (+ Tahun Tanam & Luas default; Blok, Komoditas, Species, PSR via **column selector**).
- **#179 ✅ (revisi owner pasca-QC):** **Lembaga wajib** (laporan & cetakan per 1 Lembaga, search dihapus); **PDF landscape ber-halaman peta** — poligon lahan digambar vektor jsPDF (pola farm-passport), **label per ceklis** (No/Nama/ID Petani/ID Lahan/KT) **adaptif** (`fitLabelToBox`: horizontal → vertikal 90° → auto-scale lantai 0.55; fix posisi teks vertikal — jsPDF align pra-rotasi, anchor manual `verticalLabelAnchors` diverifikasi dari content stream); **grid index (atlas) fleksibel Baris × Kolom** (input bebas, baris maks 26 = label A–Z) → halaman ikhtisar ber-grid (A1, A2, …) + 1 halaman per sel berisi (sel kosong dilewati); **preview on-page (SVG)** dari helper layout yang sama dengan PDF; **Excel multi-sheet ber-gambar peta** (sheet Lahan + gambar index; satu sheet per sel + peta selnya, SVG→PNG); geometry di-fetch per-Lembaga terpisah dari payload list (#163).
- KT = atribut per-lahan `subGroupLv2` (#146/#152; Gapoktan dihapus #189), normalisasi trim + distinct KT case-insensitive per Lembaga (pola #154); KT kosong tampil "-". Pure `lib/report-land-parcel.ts` + `report-land-parcel-pdf.ts` + `report-land-parcel-xlsx.ts` (**33 unit + 1 perf** termasuk verifikasi empiris jsPDF & workbook exceljs; #180: anti-tumpang label, skala batang + utara, mini-index sel); RBAC 3-layer. Read-only (migration `species`/`isPsr` tercatat di MD-04).
- **Next step:** Implement #177 + #179 completed.

</details>

#### HELP — Bantuan

<details>
<summary><strong>HELP-01</strong> · ✅ Done — Bantuan: Panduan Penggunaan</summary>

- **#182 ✅ (statis):** menu top-level `help` ("Bantuan", `/admin/help`, order 9) + seed 5 role VIEW (termasuk DONOR #187); **Server Component statis** (tanpa query DB/server action/`"use client"`), guard `requirePermission("help")`.
- **#184 ✅ sub-halaman + Markdown + pencarian**: rute **3 tingkat** — `/admin/help` (indeks 6 kartu bab) → `/admin/help/[chapter]` (ikhtisar topik) → `/admin/help/[chapter]/[topic]` (**satu topik = satu halaman**, siap memuat langkah/tutorial detail) + tombol topik sebelumnya/berikutnya lintas bab. **Konten pindah ke Markdown** `src/content/help/**.md` (di-bundle webpack `asset/source` seperti `.csv`; frontmatter `title`/`icon`/`intro`) — editable lewat GitHub tanpa menyentuh JSX. **Parser subset sendiri tanpa dependency** (`lib/markdown-lite.ts`: heading/paragraf/list/definisi/inline + **gambar, video, sematan YouTube-Vimeo, dan aset S3 privat `s3://key` yang di-presign per-request** #185) dirender ke elemen React (tanpa `dangerouslySetInnerHTML`). **Pencarian client-side** atas indeks ringan (judul+isi) → hasil menautkan langsung ke halaman topik. +12 unit test.
- **#183 ✅ tree view per bab**: navigasi kiri **sticky** ber-`<details>` native (buka/tutup tanpa JS — tetap Server Component), **6 bab → 11 topik** ber-penomoran `bab.topik` (mis. 3.2 Peta) agar mudah dirujuk; konten dikelompokkan per bab (header bab + kartu topik ber-anchor), responsif stack di layar kecil.
- **11 topik**: istilah domain (Petani→KT→Lembaga Petani, lahan, produksi), masuk & akun, hak akses & cakupan data per role, Master Data (soft delete/restore, revisi lahan, sensor NIK), Bulk Upload (Excel & Shapefile, baris gagal, data ganda), Dashboard (+kenapa snapshot), Peta, Report (6 laporan incl. grid peta Laporan Lahan), Data Analyst, Tools, FAQ/kendala.
- Konten diturunkan dari `docs/product/*` — perbarui bersama saat alur modul berubah. Tanpa migration; read-only.
- **Next step:** ✅ isi materi tutorial per topik dikerjakan di **HELP-02**; sisa kandidat = editor konten non-developer (CMS-01).

</details>

<details>
<summary><strong>HELP-02</strong> · ✅ Done — Bantuan: Tutorial per Tugas</summary>

- **✅ (2026-07-21):** Bantuan lama berisi **definisi** ("X adalah…") dan terorganisasi **mengikuti menu** — itu organisasi referensi. Pengguna datang dengan tujuan ("mau input panen bulan ini") lalu harus menebak sendiri ada di menu mana. Redesain mengubah unit organisasinya jadi **tugas**.
- **Tiga lapis** lewat `section` pada `HelpChapter`: **tutorial** (per tugas, pintu masuk utama) · **konsep** (istilah & aturan main yang dirujuk tutorial — isi Bantuan lama) · **referensi** (arti kolom/tombol per halaman, kerangka siap, materi menyusul). Rute `/admin/help/[chapter]/[topic]` **tidak berubah** sehingga seluruh tautan lama tetap hidup.
- **Dua tingkat kedalaman dari SATU sumber**: baris `1.` = versi **Ringkas**, baris `+` di bawahnya = tingkat **Detail**; pembaca memilih lewat toggle. Dua berkas terpisah ditolak karena akan cepat tidak sinkron. Toggle memakai checkbox + CSS **tanpa JavaScript** (konsisten sifat statis #182/#183). Isi Detail **tetap terindeks pencarian** meski sedang disembunyikan.
- **Parser** `markdown-lite.ts` bertambah: blok `steps` (nomor diturunkan dari **posisi**, bukan angka yang ditulis — menyisipkan langkah di tengah tak menuntut penomoran ulang), `callout` tip/penting/hati-hati, dan baris `+` sebagai detail yang menempel pada langkah di atasnya.
- **13 tutorial / 4 bab**: Mengelola Data Harian (petani·lahan·pelatihan·produksi) · Unggah Massal (Excel petani & produksi, shapefile lahan) · Memantau & Menindaklanjuti (Main Dashboard, cakupan pelatihan, peta BMP) · Laporan & Perawatan (menyiapkan laporan, Laporan Lahan ber-peta, snapshot).
- **`docs/product/pages/` dipakai sebagai sumber akurasi, bukan disalin** — katalog itu referensi developer (path file, nama action, seluruh kolom); yang dipanen hanyalah label tombol & kolom yang persis, agar panduan tidak mengarang.
- **Personalisasi peran**: tutorial yang menunya di luar hak akses pembaca **ditandai, bukan disembunyikan** (panduan tetap berguna saat pelatihan lintas peran). Konsekuensinya halaman indeks memanggil `getAccessibleMenuKeys` — klaim "nol query DB" pada keputusan #182 **tidak lagi berlaku**.
- **UI**: indeks dibuka dengan "Apa yang ingin Anda lakukan?" (kartu tugas ber-hasil-akhir & estimasi waktu); tiap tutorial punya tombol ke halaman yang dibahas (frontmatter `href`, **dibuka di tab baru** agar panduan tetap terbuka); daftar isi bisa **dilipat** agar materi memakai lebar penuh — tata letak dua kolom diangkat ke komponen bersama `help-layout.tsx`.
- **Font**: teks tingkat Detail memakai bobot **300 sungguhan** (`acumin-pro-condensed-light`, dikonversi `.otf`→`.woff2` 80 KB→42 KB, didaftarkan di `globals.css`). Tanpa berkas itu `font-light` tak berefek — browser mensintesis huruf tebal, tidak pernah yang lebih tipis.
- **Pelajaran teknis (2× menggigit):** kelas Tailwind `peer-*` menghasilkan selektor **sibling** (`:where(.peer):checked ~ *`), jadi hanya berlaku pada elemen yang bersibling **setelah** checkbox. Gaya peer karena itu diletakkan di pembungkus lalu menyasar ke dalam lewat atribut `data-*`; CSS hasil build diperiksa langsung, bukan diasumsikan.
- **Penjaga materi** (`help-content.test.ts`) berlaku otomatis untuk tutorial yang ditambahkan kemudian: frontmatter wajib lengkap, harus ada blok langkah, harus ada bagian **"Kalau bermasalah"** (keputusan owner: inline, bukan halaman terpisah), dan `href` harus rute `/admin/` absolut. Penjaga ini langsung menangkap 2 tutorial yang belum ber-`href`.
- **Evidence:** `src/content/help/tutorial/*.md` (17) + `referensi/*.md` (4) · `help-layout.tsx` · `help-access.ts` (penanda hak akses, modul murni agar teruji) · `markdown-lite.ts` · `help-content.ts` · `src/content/help/README.md` (format & aturan isi). **Test:** +59 → total **645** ✅; lint 0; build ✅.
- **Review putaran 2 (2026-07-21) — 9 perbaikan:** (a) **5 materi keliru** dikoreksi setelah diadu dengan kode: form Petani ternyata **tidak** memeriksa duplikat ID (dan bulk upload memeriksa **global**, bukan per Lembaga — kebalikan dari yang tertulis); halaman Lahan tak punya kartu ringkasan; tombol Produksi berbunyi "Tambah Data", bukan "Tambah Data Produksi"; Periode adalah pemilih bulan, bukan ketikan `2026-06`; Panen Ke- dibatasi **4**. (b) **A11y**: `peer-focus-visible` terpasang di `<label>` bersarang → tidak ada indikator fokus keyboard sama sekali (pitfall yang sama, terlewat sekali lagi); lipat daftar isi bisa dipicu di bawah `lg` tempat tombolnya tersembunyi → **jebakan satu arah**, kini dikurung `lg:`; nama aksesibel disamakan dengan label terlihat (WCAG 2.5.3). (c) **Pencarian** yang menemukan teks tingkat Detail kini membuka topik dengan `?detail=1` — sebelumnya kata yang dicari tak terlihat, bahkan oleh Ctrl+F. (d) `permission` di frontmatter selama ini divalidasi test tapi **tak pernah dipakai**; kini penanda memeriksa sampai level izin lewat `getEffectiveMenuPermissions`. (e) `generateStaticParams` dihapus — halaman selalu dinamis karena `auth()`, jadi ia menyesatkan pembaca kode.
- **Lanjutan (2026-07-21):** **17 tutorial** — 4 bab awal + bab **Analisa & Administrasi** (BMP Dashboard, Peta Lahan, Analisa Ketersediaan Data, User Management) sehingga **seluruh menu utama tercakup**. **Bantuan kontekstual** aktif: komponen `HelpHint` (ikon `?` → tutorial menu ybs, tab baru) dipasang di 7 halaman Master Data & Bulk Upload; lookup-nya `findTutorialForMenu` di modul murni `help-access.ts`. **TD-025 ditutup** — mode Detail tak lagi bergantung urutan sumber CSS (spesifisitas 0,7,0 vs 0,4,0 lewat penanda `data-depth`).
- **Lapis referensi (2026-07-21):** 4 halaman tersering dipanen dari katalog jadi materi "arti tiap kolom, filter, dan tombol" — Petani, Lahan, Pelatihan, Produksi. Berbasis definisi (bukan langkah), ditulis untuk **dirujuk saat bekerja**, bukan dibaca berurutan. Ditampilkan sebagai seksi tersendiri di indeks Bantuan.
- **Next step:** perluas lapis referensi ke halaman lain (report, dashboard, settings) mengikuti pola yang sama.

</details>

#### BULK — Bulk Upload

<details>
<summary><strong>BULK-01</strong> · ✅ Done — Bulk Upload: Menu & Route</summary>

- **Evidence:** Menu & route setup ✅; redirect `/admin/bulk-upload` → `/farmers` implemented ✅. (Cakupan fase dipersempit ke **#68 — menu & route**; judul lama "Menu & KT" menyesatkan karena Bulk Upload KT belum ada.)
- **Next step:** Maintain; #68 complete. **#69 Bulk Upload KT (CSV) masih 🔲 Todo** — dikerjakan bersama BULK-02 #70 (lihat [sprint.md](./sprint.md)).

</details>

<details>
<summary><strong>BULK-02</strong> · 🔲 Not Started — Bulk Upload: Region</summary>

- **Evidence:** Tidak ada bulk upload region; **#70 dibuat**.
- **Next step:** #70 CSV upload District/Subdistrict/Village dengan validasi hierarchy.

</details>

<details>
<summary><strong>BULK-03</strong> · ✅ Done — Bulk Upload: Farmer</summary>

- **Evidence:** `bulk-upload.ts` server action (177 LOC) ✅, dynamic mapping UI ✅, Exceljs upload & smart validations ✅, preview table ✅, full/error download options ✅.
- **Next step:** Maintain; #76 Excel upload complete dengan auto column mapping, validasi, preview, download error rows.

</details>

<details>
<summary><strong>BULK-04</strong> · ✅ Done — Bulk Upload: Production</summary>

- **Evidence:** `bulk-upload-production.ts` server action (95 LOC) ✅, dynamic mapping UI ✅, period validation ✅, preview table ✅.
- **Next step:** Maintain; bulk production upload complete with period/harvest validation.

</details>

#### DA — Data Analyst

<details>
<summary><strong>DA-01</strong> · ✅ Done — Farmer Summary Analytics</summary>

- **Evidence:** `src/types/data-analyst.ts` ✅, `src/server/actions/data-analyst.ts` (140 LOC) ✅, `src/app/(admin)/admin/data-analyst/farmer-summary` UI list/tabs/Excel export ✅, 4 unit tests ✅.
- **Next step:** Maintain; #103 complete.

</details>

<details>
<summary><strong>DA-02</strong> · ✅ Done — Analisa Ketersediaan Data KT</summary>

- **Evidence:** `src/types/data-completeness.ts` ✅, `src/lib/data-completeness.ts` (pure logic) ✅, `src/server/actions/data-completeness.ts` (scope-checked) ✅, `src/app/(admin)/admin/data-analyst/data-completeness` UI (filter → 5 collapsible sections: Profil KT/Petani/Lahan/Pelatihan/Produksi + health score + multi-sheet Excel) ✅, 31 unit tests ✅.
- **DA-02b (#122):** Domain Pelatihan diperdetail → cakupan per paket (4a Ringkasan per Paket / 4b Matriks / 4c Petani Belum Lengkap, nested collapse), skor domain = rata-rata % cakupan paket, +2 sheet Excel.
- **✅ (2026-09-21, #352) skor mengikuti skema + drill-down:** label menu → **"Ketersediaan Data — Per Lembaga"** (order 3, drill-down dari DA-03; key/route tetap). **Registri deklaratif** `src/lib/data-completeness-registry.ts` (label · grain · rute perbaikan per anomali, bobot tier check persil, katalog 15 modul, konstanta) — tabel berikutnya cukup satu entri. Check inti baru: tipe grup, tahun berdiri (profil); tempat lahir (petani); Kelompok Tani (persil, bobot inti) + blok; **tahun tanam/status lahan/blok = tier "atribut lapangan" bobot 1/3** (keputusan owner P2 — sebelumnya skor Lahan 28/30 Lembaga terkunci 60). **Cakupan modul** (P1: informatif, di luar Index; tiga keadaan terisi/kosong/**tidak berlaku** keluar penyebut) atas satelit lahan #296/#297/#326/#328/#329, Tree #238, STDB, Monev BMP #344/#346, boundary #266, acuan #243, sertifikasi (P3: netral). Produksi: anomali kebaruan ≥ 3 bulan, grain lahan non-PSR, `isPsr` dikecualikan, kartu "Record Estimasi". **Anomali sistemik dilipat** (≥ 95 %, ≥ 10 entitas) jadi satu temuan — ISH-1408-02 (2.192 persil) tak lagi memuat dua tabel 2.192 baris. UI: `?lembaga=`/`?distrik=` (TD-021), analisa otomatis (P5), strip skor ber-bobot + tooltip rumus, warna `scoreBand` satu sumber (`scoreTone` dihapus), blok Cakupan Modul, seksi terkontrol (hanya terendah terbuka + Buka/Tutup semua), daftar kerja bertautan (Detail Petani/Lahan) + baris *Perbaiki lewat*, filter responsif, Excel +sheet Cakupan Modul & kolom Perbaiki lewat. Test: `data-completeness.test.ts` 33→48, perf skala 2028 DA-03 + satelit. Bantuan: `a-1` ditulis ulang, referensi baru `r-5-ketersediaan-data` (rumus skor).
- **✅ (2026-09-21, #352 putaran 2 — arahan owner saat verifikasi UI):** modul masuk **checklist per domain** dengan daftar kerja (bukan blok chip terpisah); **17 check kualitas** informatif (NIK ↔ tanggal lahir/jenis kelamin, umur, petani ganda, Monev tanpa rincian, persil di luar boundary ICS & luas vs poligon lewat PostGIS, luas/tahun tanam tidak wajar, nilai turun/di luar rentang, produksi 0 kg/bulan bolong, sertifikasi, tahun berdiri, koordinat vs kabupaten); UI: cincin Index, kartu domain, **Prioritas perbaikan** (Δ Index per tindakan), **checklist** semua check ber-chip jenis + bar % OK, tabel **Per Kelompok Tani**; Excel +Prioritas/Checklist/Per KT. Temuan prod: ~5.400 tanggal lahir ≠ NIK (hari/bulan tertukar).
- **✅ (2026-09-21, #352 putaran 4 — header Per Lembaga):** setelah 6 varian bersama owner, header = identitas kiri → **angka Index besar + radar berangka** (label sumbu = tautan ke seksi; `RadarChart` bersama DA-03) → Excel; **kartu domain dihapus** (redundan): bobot pindah ke chip judul seksi, rumus skor ke tooltip badge skor seksi.
- **Next step:** Maintain. Enum `NONE` sertifikasi (P3) → **#355**, bobot modul ke Index (P1 tahap 2) → **#356**, anomali nilai produksi → #178, tumpang tindih poligon → #317, perbaikan massal tanggal lahir tertukar + daftar kerja temuan kualitas → **#354**, peta kesiapan data (usulan putaran 4) → **#358**; deploy migrasi #353 E + seed menu P4 → **#357**.

</details>

<details>
<summary><strong>DA-03</strong> · ✅ Done — Dashboard Ketersediaan Data (#193)</summary>

- **✅ (2026-07-28):** **Dashboard Ketersediaan Data** — `/admin/data-analyst/data-availability` (menu `data-analyst-data-availability`, order 3 di grup Data Analyst, icon `Gauge`; VIEW untuk SUPERADMIN/ADMIN/OPERATOR/MANAGEMENT, **tanpa DONOR** — keputusan owner: alat kerja internal yang mengekspos gap kualitas data). Roll-up lintas Lembaga dari scoring **DA-02**: menjawab "Lembaga mana yang datanya paling bolong, anomali apa yang terbanyak" — DA-02 tetap jadi tempat deep-dive per Lembaga (daftar petani per anomali). Semula dirilis sebagai sub menu keempat grup Dashboard (`dashboard-data-availability`), **dipindah ke Data Analyst pada hari yang sama** (keputusan owner) — berdampingan dengan DA-02.
- **Reuse scoring (keputusan arsitektur):** `computeCompleteness` DA-02 dipakai utuh via `buildAvailabilityEntry` — skor per Lembaga di dashboard **identik** dengan halaman DA-02. Live query (pola DASH-06): satu query nested bentuk DA-02 lintas Lembaga **tanpa kolom `geometry`** (kehadiran geometry via query id terpisah `not: Prisma.DbNull`), partisipasi "tamu" disaring di JS. Payload tanpa daftar petani per anomali (PII + ukuran); profil belum lengkap disintesis jadi anomali `profil-tidak-lengkap` agar Σ panel = `totalAnomalies` DA-02. Fallback snapshot terdokumentasi, tidak dibangun.
- **Skor portfolio (keputusan owner #193):** domain petani/lahan/pelatihan/produksi = rata-rata **tertimbang jumlah petani** per Lembaga; profil = rata-rata sederhana; Skor Keseluruhan = `DOMAIN_WEIGHTS` DA-02. **Skor domain Petani & Lahan graded per field** (keputusan lanjutan owner 2026-07-28: rata-rata proporsi field terisi per petani/persil, bukan all-or-nothing — lihat Decision Log). Band 4 tingkat: **100 lengkap penuh** (emerald tua pekat, dibedakan dari "baik" — selaras #194 di matriks Pelatihan), 80–99 baik, 50–79 perlu perhatian, <50 kritis (pekat, bukan pastel) — satu sumber (`scoreBand` + `score-band-styles.ts`) untuk card/bar/matriks.
- **Isi:** filter Kategori | Distrik (URL, TD-021) → **6 KPI card** (Skor Keseluruhan + 5 domain: jumlah entitas + skor) → **matriks Lembaga × 5 domain** (heatmap band, sortable, default skor total menaik, collapsible) → **bar chart skor per Lembaga** (terendah dulu — daftar kerja) + **panel Anomali Terbanyak** (top-10 lintas Lembaga, jumlah + Lembaga terdampak), keduanya ber-deep-link ke DA-02.
- **Evidence:** action `src/server/actions/data-availability.ts`; lib murni `src/lib/data-availability-aggregation.ts`; tipe di `src/types/dashboard.ts`; 8 file UI di `src/app/(admin)/admin/data-analyst/data-availability/`; seed `menu.csv` + `role-permissions.csv`; doc `docs/product/pages/data-analyst/dashboard-ketersediaan-data.md`; Bantuan bab Data Analyst + tutorial `p-6-ketersediaan-data`.
- **Test:** +21 unit (`dashboard-data-availability.test.ts`) + 3 invarian baru di `dashboard-asymmetry.test.ts` (skor 0–100, portfolio terikat min/max, anomali ≤ denominator).
- **✅ (2026-09-21, #352):** label menu → **"Ketersediaan Data — Semua Lembaga"**, **order 2** (pintu masuk; keputusan owner P4, key/route tetap). **Deep link** `?lembaga=` dari baris matriks, bar chart, dan panel anomali (→ Lembaga terdampak terbanyak, tooltip daftar Lembaga + rute perbaikan). Segmented control **Kelengkapan inti | Cakupan modul** (`?tampilan=modul`) → matriks Lembaga × 15 modul (`availability-module-matrix.tsx`, baris portfolio hanya atas Lembaga yang modulnya berlaku). Panel Anomali Terbanyak dibagi **Per entitas** vs **Kolom belum pernah diisi** (sistemik) — `topAnomalies`/`topSystemicAnomalies`; total anomali prod 40k+ → 12.893 temuan. Filter **Lembaga** (`?lembaga=`) + tombol **Excel** (gate EXPORT; 2 sheet). Action memuat kehadiran satelit lewat `loadModuleFlagSets` (13 kueri id-set GROUP BY, sejajar kueri geometry, scope via relasi). `score-band-styles.ts` dipindah ke `src/lib/`. Test: 21→26 unit + perf skala 2028 (40 Lembaga × 300 petani + satelit + agregasi < 1,5 s).
- **✅ (2026-09-21, #352 putaran 3–4 — UI/UX, iterasi visual bersama owner):** **hero** (cincin Skor Keseluruhan + distribusi Lembaga per band yang bisa diklik → `?band=` + 3 angka + aksi lintas Lembaga), **kartu domain berskor** (klik → `?urut=` mengurutkan), matriks dalam tiga tampilan `?tampilan=` — **Radar** (bawaan; kartu pentagon lima domain, klik → **modal** kiri radar besar / kanan tabel bobot·skor·kontribusi + ◀ ▶), **Heatmap** (sel solid skala kontinu `score-heat.ts`, semua baris), **Cakupan modul**; "paling tertinggal per domain" menggantikan bar chart; `?arah=`, `?band=` divalidasi; visual bersama `RadarChart`/`HeatCell`/`HeatLegend`, ambang & label band satu sumber (`BAND_THRESHOLDS`, `BAND_LABEL`). Opsi lain yang diusulkan & tidak dipilih: bar anggaran skor, bar data per sel, peta kesiapan data, treemap massa petani, sebaran titik per domain.
- **✅ (2026-09-21, #352 putaran 3 — analisa UI/UX atas permintaan owner, proposal disetujui):** hero (cincin skor, distribusi band ber-filter, aksi lintas Lembaga), kartu domain berskor & mengurutkan matriks, matriks disusun ulang (Skor Total di samping nama, sel lembut, cari, 10 terendah), bar chart duplikat → "paling tertinggal per domain".
- **Next step:** Maintain; snapshot fallback bila live query melambat (tetap belum dibangun).

</details>

<details>
<summary><strong>DA-06</strong> · ✅ Done — Komparasi Data Acuan (#243)</summary>

- **✅ (2026-08-10/11):** **Komparasi Data Acuan** — `/admin/data-analyst/benchmark-comparison` (menu `data-analyst-benchmark-comparison`, order 4 di grup Data Analyst, icon `GitCompare`; VIEW SUPERADMIN/ADMIN/OPERATOR/MANAGEMENT tanpa DONOR, EDIT entry acuan hanya SUPERADMIN/ADMIN). Menggantikan komparasi manual di Excel (sheet "Comparasi MIS vs MD1stSOW GDriv"): angka **acuan** (MD 1st SOW) dientry ke MIS, angka **MIS** dihitung live, **selisih = acuan − MIS** per 8 metrik (petani, persil, luas, training P1/P2-MK/P2-K3/P3&4, produksi).
- **Model:** `ReferenceBenchmark` (`tbl_reference_benchmark`) — 1 baris per Lembaga (`farmerGroupId` unique), 8 metrik nullable (kosong = tidak dibandingkan, bukan nol) + `notes`; soft delete dengan reaktivasi via upsert. Konvensi angka MIS **identik dashboard** (distinct petani per paket, lembaga kegiatan = lembaga petani).
- **UI:** dua mode — **Ringkas** (matriks Δ + % capaian, band warna gap relatif, tooltip terstruktur pola #213) dan **Detail** (blok Acuan | MIS | Δ); filter URL (distrik, hanya selisih, cari, urut paling bermasalah — TD-021); seksi per distrik **collapsible ber-ringkasan header**; catatan sebagai pill + tooltip; simpan acuan → **update optimistis** (`applySavedBenchmark`, paritas dengan render server diuji unit); ekspor Excel semua lembaga dalam scope.
- **Evidence:** action `benchmark-comparison.ts` (3 lapis keamanan); lib murni `src/lib/benchmark-comparison.ts` (8 unit test); seed menu + role-permissions; import awal dari GDrive via `scripts/local/other/import-reference-benchmark.mjs` (dry-run default); doc `docs/product/pages/data-analyst/komparasi-data-acuan.md`; Bantuan tutorial `p-9-komparasi-data-acuan` (menu ke-31, cakupan 31/31).
- **Catatan penomoran & baseline:** DA-04 hangus (#143 superseded, Decision Log 2026-08-08), DA-05 = #178. **Dipromosikan ke tabel Phase Status pada rilis v0.24.0** (keputusan owner 2026-08-11): baseline 47→48 fase (inti 37 + pendukung 11), skor 74/85 = **87,1%**.
- **Next step:** bulk upload Excel angka acuan (opsional, disebut di #243); deep-link sel selisih ke halaman pengejaran data.

</details>

<details>
<summary><strong>DA-07</strong> · ✅ Done — Peta Data & Skema (#256)</summary>

- **✅ (2026-08-13):** **Peta Data & Skema** — `/admin/data-analyst/data-map` (menu `data-analyst-data-map`, order 5 di grup Data Analyst, icon `Network`; VIEW **SUPERADMIN/ADMIN saja**, tanpa EXPORT/PRINT). Tiga tab: **ERD** (kanvas React Flow, 22 entitas × 28 relasi saat rilis — 40 entitas per 2026-09-21, artefak `build:schema`; kolom per domain, klik entitas menyorot tetangga), **Keterisian** (baris & persen terisi per kolom, sorotan kolom 0%), **Jalur data** (matriks menu × entitas R/W/RW).
- **Sumber — empat, tak satu pun ditulis khusus:** struktur dari `prisma/schema/*.prisma` (`npm run build:schema`), keterisian dari kueri agregat runtime (1 kueri per tabel, ~22), jalur data dari pindai kode (`npm run build:lineage`), rencana modul dari stream MD tabel Phase Status ini sendiri. **Tanpa tabel database baru** — keputusan ditinjau ulang saat implementasi (owner 2026-08-13) dan tetap: struktur & jalur data adalah turunan kode, menyalinnya ke tabel hanya menambah langkah yang bisa terlupa.
- **Lapis keamanan — penyimpangan disengaja:** hanya lapis 1 (`requirePermission`/`hasPermission`) + lapis 3 (soft delete). Access-context **tidak** dipakai karena yang ditampilkan bentuk & keterisian skema secara nasional, bukan baris milik wilayah; konsekuensinya menu hanya boleh diberikan ke peran yang berhak melihat angka nasional. Tertulis di kepala `src/server/actions/data-map.ts` dan skrip seed-nya.
- **Evidence:** `scripts/schema-scan.ts` + `scripts/lineage-scan.ts` (+ artefak turunan di `src/lib/*.generated.ts`, di-commit agar perubahannya terlihat di diff PR); `src/test/data-schema.test.ts` (12 test, termasuk **silang sumber** dengan `Prisma.dmmf`) & `src/test/data-lineage.test.ts` (8 test, penjaga kesegaran diverifikasi dengan sengaja membasikan artefak); dependensi `@xyflow/react` hanya untuk tab ERD (impor dinamis, tanpa SSR); doc `docs/product/pages/data-analyst/peta-data-skema.md`; Bantuan tutorial `p-10-peta-data-skema` (menu ke-32, cakupan 32/32).
- **Catatan baseline:** baseline 48→49 fase (inti 38 + pendukung 11) → skor **76/87 = 87,4%** (dari 74/85 = 87,1%). Angka ini dihitung ulang otomatis oleh test konsistensi #250 (±0,1 pp) terhadap baris _(siklus berjalan)_ di `metrics.md`, jadi kedua berkas wajib bergerak bersama; baris rilis lama tidak dihitung ulang (aturan metrics.md #4).
- **Next step:** riwayat keterisian (tren "makin terisi atau tidak") bila diminta — presedennya tabel snapshot dashboard; anotasi/usulan field dari UI (butuh tabel, sengaja ditunda).

</details>

#### TOOLS — Tools & Utility

<details>
<summary><strong>TOOLS-01</strong> · 🟠 Partial — Tools Import/Export/GIS/S3</summary>

- **Evidence:** `scripts/get-link.js` & `scripts/pdf-manager.js` tracked ✅ (npm `s3:get-link`, `pdf:*` aktif); debug/stale scripts → `scripts/local/` (gitignored) ✅.
- **Next step:** ✅ BUG-002 resolved — stale scripts tidak ada di repo/CI. Utility scripts tetap functional.

</details>

#### CMS · COMM — Content & Community

<details>
<summary><strong>CMS-01</strong> · 🔲 Not Started — CMS & Content Management</summary>

- **Evidence:** Public knowledge page exists but only `Coming soon`; no CMS schema/admin.
- **Next step:** Define CMS scope.

</details>

<details>
<summary><strong>COMM-01</strong> · 🔲 Not Started — Community</summary>

- **Evidence:** Public community page exists but only `Coming soon`.
- **Next step:** Define community scope.

</details>

<details>
<summary><strong>COMM-02</strong> · 🔲 Planned — i18n</summary>

- **Evidence:** No locale switch/persistence; only incidental calendar locale prop.
- **Next step:** Define i18n approach.

</details>

#### OPS — Operations & DevOps

<details>
<summary><strong>OPS-01</strong> · ✅ Done — Testing</summary>

- **Evidence:** Vitest: **53 test files / 839 passing tests** ✅ (verifikasi `npm test`, 2026-08-11); coverage: auth/RBAC/menu/menu-filter/menu-tree/user/region/farmer/land-parcel/training/production/bulk-upload/report/dashboard/data-analyst/data-completeness/map (MAP-01/02/03)/map-geo/firms/middleware/perf + rbac-server-guards (#125) + access-context lintas-scope (#127) + profile/addParticipants validation (#130) + **report-kelompok-tani (Summary/Detail) #154** + dashboard KT count #148 + parcel-bulk-mapping (#150) + farmer-sub-groups (#152) + agregasi farmer-group (#163) + **dashboard-bmp (#166)** + farmer-group-detail (#171) + farmer-detail (#172) + **produktivitas peta BMP (#174)** + **report-lahan/layout peta/grid/PDF/Excel (#177/#179, termasuk verifikasi empiris jsPDF & workbook exceljs)** + perf layout peta 2k lahan + **dashboard-training (DASH-06)** + **dashboard-asymmetry (invarian pembilang ≤ penyebut lintas 3 dashboard, 2026-07-21)** + **help-content (parser 2 tingkat + penjaga kelengkapan materi tutorial, HELP-02)** + **dashboard-data-availability (DA-03, #193)** + **excel-cell (#196)** + **farmer-upload-status (#197)** + **umur tanaman/ranking/totalLuasHa BMP (#191)** + **benchmark-comparison (DA-06, #243 — agregasi MIS, view komparasi, paritas update optimistis)**.
- **Next step:** RPT-03 (#132) ✅, MAP-02 (#144) ✅, RPT-04 (#154) ✅ & DASH-05 (#148) ✅ tercakup; gap terakhir **#231 integration test route `/api/map-hotspot` ✅ Done 2026-08-10** (`map-hotspot-route.test.ts`, 9 test: guard 403, validasi bbox/dayRange {2,5}, jalur sukses CSV→GeoJSON, 3 jalur gagal upstream tanpa bocor map key) → OPS-01 ✅ Done.

</details>

<details>
<summary><strong>OPS-02</strong> · 🟠 Partial — DevOps & Deployment</summary>

- **Evidence:** Dockerfile, deploy workflows, security scan workflows (`gitleaks.yml`, `semgrep.yml`).
- **CI status ✅ diverifikasi 2026-07-21:** **4 workflow aktif** — `gitleaks` (push & PR), `semgrep` (SAST di PR), `deploy-dev.yaml`, `deploy-main.yml`; **merge PR ke `main` = deploy produksi otomatis** (SSH + `pm2 reload`). Lint/build/test tetap gate lokal (keputusan owner); `deploy-main.yml` menjalankan `prisma generate`, **bukan** `migrate deploy` — migrasi DB manual sebelum merge.
- **Next step:** Verify env matrix & rollback (**#232**) — selesai → kandidat ✅ Done.

</details>

### Code Audit Evidence

<details>
<summary><strong>Code Audit Evidence</strong> — bukti codebase per area (models, routes, actions, tests, DevOps)</summary>

| Area           | Bukti di Codebase                                                                                                                                                                  | Kesimpulan                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Prisma models  | **21 model / 21 migrasi / 12 file schema** (verifikasi 2026-08-08): `User`, `MenuItem`, `RolePermission`, `UserProvince`, `UserDistrict`, `UserFarmerGroup`, `UserPermissionOverride`, `Province`, `District`, `Subdistrict`, `Village`, `FarmerGroup`, `Farmer`, `LandParcel`, `Tree` (#238), `TrainingPackage`, `TrainingActivity`, `TrainingParticipant`, `ProductionRecord`, `MainDashboardSnapshot`, `BmpDashboardSnapshot` (#166) | Schema mencakup platform, RBAC, region, farmer group, farmer (MD-03), land parcel + pohon (MD-04), training (MD-05), production (MD-06), dashboard snapshot (DASH-01) & snapshot BMP (DASH-04) ✅ |
| Admin routes   | **51 page.tsx** (verifikasi `find src/app/(admin) -name page.tsx | wc -l`, 2026-08-11 — +Data Analyst Ketersediaan Data #193, +Dashboard Metrik Rilis #227, +Bulk Upload Pohon #238, +Komparasi Data Acuan #243): Dashboard (Main + BMP, snapshot-backed; **Pelatihan, live query**), Settings (Users/Roles/Menu/Regions), Master Data (Farmers + Groups + Parcels + Training + Production, list/detail/form), Bulk Upload (Farmers + Parcels Shapefile + Production + Trees Shapefile point #238), Report (Petani + Pelatihan + Produksi + Kelompok Tani Summary/Detail #154 + **Lahan #177/#179**), Data Analyst (Ringkasan Petani + Analisa Ketersediaan Data), Map (Peta Lahan + Peta BMP), Tools (Dashboard Snapshot), **Bantuan #182/HELP-02**, Profile | ✅ Semua page konten ter-guard `requirePermission` (30) + 8 justified (redirect-only/profile) — verifikasi audit 2026-07-10; `/admin/map/bmp` guard `map-bmp` (#144) |
| Server actions | **29 file** (verifikasi 2026-08-11): `user`, `user-data-access`, `user-menu-access`, `menu`, `region`, `role-permission`, `farmer-group`, `farmer`, `land-parcel`, `tree` (#238), `bulk-upload`, `bulk-upload-parcel`, `bulk-upload-production`, `bulk-upload-tree` (#238), `training`, `production`, `upload`, `profile`, `report`, `dashboard`, `dashboard-bmp` (#166), `dashboard-training` (DASH-06), `snapshot`, `snapshot-bmp` (#166), `map`, `data-analyst`, `data-completeness`, `data-availability` (DA-03, #193), `benchmark-comparison` (DA-06, #243) | Semua modul (incl. dashboard, snapshot, map, report) tersedia ✅ — catatan audit lama: 5 celah guard/scope, lihat `audit-report/audit-2026-07-10.md` §2 (sudah diremediasi #125–#130) |
| Validation schemas | `farmer-group.schema.ts`, `farmer.schema.ts`, `land-parcel.schema.ts`, `map.schema.ts`, `menu.schema.ts`, `production.schema.ts`, `profile.schema.ts`, `region.schema.ts`, `snapshot.schema.ts`, `training-activity.schema.ts`, `training-participant.schema.ts`, `tree.schema.ts` (#238), `user.schema.ts` — **13 files** (verifikasi 2026-08-08) | Validation coverage: user, profile, region, menu, farmer-group, farmer, land-parcel, tree, training, production, map, snapshot ✅ |
| Public routes  | Home, Community placeholder, Knowledge Management placeholder                                                                                                                      | Public shell ada; CMS/community belum implementatif                                    |
| Scripts        | `scripts/get-link.js`, `scripts/pdf-manager.js` (tracked, npm commands aktif ✅); debug/stale scripts dipindah ke `scripts/local/` (gitignored, local-only) | BUG-002 resolved — stale scripts tidak ada di repo/CI. |
| Tests          | `npm test` lulus **53 test files / 839 tests** ✅ (verifikasi 2026-08-11); domain: auth & middleware, RBAC (rbac, rbac-permission, rbac-server-guards, access-context), menu (action/filter/tree), user (action/data-access/menu-access), region, farmer (+detail, +sub-groups), farmer-group (+detail), land-parcel, training (activity/participant), production, bulk-upload (+parcel-mapping), report (petani/pelatihan/produksi/kelompok-tani ×2/lahan ×3), dashboard (main/bmp/training/asymmetry/data-availability), data-analyst, data-completeness, benchmark-comparison (#243), map (map, map-geo, firms, map-hotspot klien + route #231), help (content/media), pdf-exporters, perf | Testing solid untuk semua core features; gap route hotspot tertutup (#231) — rincian per-issue di OPS-01 |
| DevOps         | Dockerfile + `.github/workflows/` (`deploy-dev.yaml`, `deploy-main.yml`, `semgrep.yml`, `gitleaks.yml`)                                                                            | DevOps partial; workflow CI/CD dan security scan (Gitleaks, Semgrep) ditambahkan |

</details>

### Code Compliance Audit vs rule.md (2026-07-10)

**Audit Scope:** Keseluruhan codebase (src/, prisma/, scripts/, config) terhadap `docs/rule.md` — detail lengkap + bukti `file:line` di **`audit-report/audit-2026-07-10.md`** (internal, gitignored). Menggantikan audit 2026-06-08 yang sudah stale.

**Summary:** **14 PASS · 0 PARTIAL · 0 FAIL** — seluruh temuan compliance audit 2026-07-10 ditutup lewat remediasi bertahap #125–#130 (2026-07-12): RBAC guard/scope ✅ #125+#127, lint gate ✅ #126, pola restore soft-delete ✅ #127, konvensi UI (loading.tsx/Table Actions) ✅ #128, cleanup dead code/deps ✅ #129, kualitas berkelanjutan (audit fields, Zod, naming istilah domain, rename `.types.ts`, font) ✅ #130. Klaim lama "14/14 fully compliant" digantikan basis bukti #125–#130.

<details>
<summary><strong>Rincian per kategori rule</strong> — 14 PASS · 0 PARTIAL · 0 FAIL</summary>

| Rule Category | Requirement | Actual | Status | Evidence |
|---|---|---|---|---|
| **Code Standards** | File naming: kebab-case | 100% kebab-case; suffix `.types.ts` dihilangkan → `land-parcel.ts` (#130) | ✅ PASS | audit §5 · #130 |
| **Code Standards** | Variable naming: English | Istilah domain (petani/lahan/pelatihan/produksi/KT/persil/paket) **diresmikan sebagai pengecualian** di `code-standards.md` (keputusan #130) — bukan rename massal | 🟠→✅ **PASS** (#130) | audit §5 · TD-012 |
| **Code Standards** | Imports: from sub-module | 13 file pakai barrel `@/components/shared` vs 8 sub-path; barrel `shared` kini diresmikan sebagai pengecualian di rule.md | ❌→✅ (rule direvisi) | audit §4 U-5 |
| **Code Standards** | Default: Server Component | 78 file `"use client"` (29 = shadcn `ui/`), semua page.tsx RSC | ✅ PASS | audit §9 |
| **Code Standards** | Validation: Zod schemas | 12 schema files di `src/validations/` (+`profile.schema.ts` #130; `addParticipants` kini divalidasi) | ✅ PASS | audit §9 · #130 |
| **Code Standards** | Server Actions: src/server/actions/ | 22 action files (3.894 LOC) | ✅ PASS | audit §3 |
| **RBAC Pattern** | AccessContext discriminated union | Diimplementasi & dipakai luas (`access-context.ts`) | ✅ PASS | audit §3 |
| **RBAC Pattern** | hasPermission backend validation | Guard P0 (`role-permission`/`menu`/`upload`) + scope `getFarmerById`/`bulkCreateFarmers` ditutup #125; scope by-id KT/pelatihan/lahan + guard semua helper "for select" ditutup #127 (2026-07-12) | ❌→✅ **PASS** (#125 + #127) | audit §2 |
| **Soft Delete** | isActive field @default(true) | Semua model (join-table assignment by design tanpa isActive) | ✅ PASS | audit §3 |
| **Data Filtering** | Filter isActive: true in queries | Pola restore soft-delete diseragamkan #127 (2026-07-12): **SUPERADMIN** melihat nonaktif + badge + filter Status (default Aktif) + toggle Aktifkan; **user lain dibatasi ke record aktif** (server & UI). Mutasi tetap butuh isActive | 🟠→✅ **PASS** (#127) | audit §3.2 · TD-007 |
| **UI/UX** | Loading state (loading.tsx) | 4 halaman tabel ditambah `loading.tsx` + `<TableSkeleton>` #128 (training, settings/menu, report ×2) | 🟠→✅ **PASS** (#128) | audit §4 U-4 |
| **UI/UX** | Shadcn UI + Tailwind | Dipakai konsisten; DataTable/TableActions shared 100% patuh | ✅ PASS | audit §4 |
| **UI/UX** | Table Actions positioning | `menu-list-client` dirapikan #128: `<TableActions>` + gating izin + kolom Aksi kiri | 🟠→✅ **PASS** (#128) | audit §4 U-1/U-2 |
| **Issue Workflow** | QA gates (test/build/lint/**docs sync**) | Test **382** ✅ · build ✅ · **lint ✅ exit 0** (0 error; 3 warning `exhaustive-deps` ditahan) · **docs-sync gate** (#126, 2026-07-12; +docs-sync 2026-07-14) | ✅ **PASS** | audit §1 · #126 · `workflow.md` |

</details>
