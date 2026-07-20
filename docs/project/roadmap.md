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
<summary><strong>Stream Definition</strong> — arti prefix pada format phase <code>STREAM-NN</code></summary>

Format phase: `STREAM-NN`.

| Stream   | Arti                   | Cakupan                                                                                    |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| PLATFORM | Platform Foundation    | Init project, schema DB, auth, RBAC, menu infra                                            |
| MD       | Master Data            | Regions, groups, farmer, parcels, training, staff, agronomy, HCV, BUSDEV, IMPACT, workplan |
| DASH     | Dashboard              | Basic dashboard, server actions, interactive map, BMP                                      |
| MAP      | Geospatial Map Explorer | Peta interaktif sebaran KT & lahan, filter spasial (Province/District/KT), layer toggle    |
| RPT      | Report                 | Report User, Region, Lembaga Petani, Kelompok Tani; summary tabel + export Excel/PDF                      |
| BULK     | Bulk Upload            | Bulk upload CSV untuk Region dan Lembaga Petani; validasi, preview, insert                  |
| TOOLS    | Tools & Utility        | Import, export, GIS, S3/PDF utility                                                        |
| DA       | Data Analyst           | Ringkasan Petani, Analisa Ketersediaan Data (anomali/kelengkapan), analytics dashboards    |
| CMS      | Content Management     | Pages, media, knowledge base                                                               |
| COMM     | Community & Engagement | Community, i18n                                                                            |
| OPS      | Operations & DevOps    | Testing, CI/CD, deployment                                                                 |

</details>

### Phase Status (Indeks)

Rincian evidence & next step tiap phase ada di [Rincian per Phase](#rincian-per-phase) di bawah.

| Phase       | Deskripsi                           | Status         | Horizon |
| ----------- | ----------------------------------- | -------------- | ------- |
| PLATFORM-01 | Initialization & UI Statis          | ✅ Done        | Done    |
| PLATFORM-02 | Database Schema & Migrations        | ✅ Done        | Done    |
| PLATFORM-03 | Schema Hardening                    | ✅ Done        | Done    |
| PLATFORM-04 | Autentikasi & RBAC                  | ✅ Done        | Done    |
| PLATFORM-05 | Dynamic Menu Management             | ✅ Done        | Done    |
| PLATFORM-06 | Table Refactor & Export Excel       | ✅ Done        | Done    |
| PLATFORM-07 | Hierarchical Menu (3-Level)         | ✅ Done        | Done    |
| MD-01       | Regions                             | ✅ Done        | Done    |
| MD-02       | Farmer Groups                       | ✅ Done        | Done    |
| MD-03       | Farmer                              | ✅ Done        | Done    |
| MD-04       | Parcels                             | ✅ Done        | Done    |
| MD-05       | Training                            | ✅ Done        | Done    |
| MD-06       | Agronomy / Production               | ✅ Done        | Done    |
| MD-07       | Staff                               | 🔲 Planned     | Later   |
| MD-08       | HCV                                 | 🔲 Planned     | Later   |
| MD-09       | BUSDEV                              | 🔲 Planned     | Later   |
| MD-10       | IMPACT                              | 🔲 Planned     | Later   |
| MD-11       | Workplan                            | 🔲 Planned     | Later   |
| DASH-01     | Dashboard: Basic Data               | ✅ Done        | Done    |
| DASH-02     | Dashboard: Server Actions           | ✅ Done        | Done    |
| DASH-03     | Interactive Map                     | ✅ Done        | Done    |
| DASH-04     | Dashboard BMP (Produksi)            | ✅ Done        | Done    |
| DASH-05     | Dashboard: Card Total Kelompok Tani | ✅ Done        | Done    |
| MAP-01      | Map: Peta Lahan                     | ✅ Done        | Done    |
| MAP-02      | Map: Peta BMP (Layer 1)             | ✅ Done        | Done    |
| MAP-03      | Map: Peta BMP Layer 2 (Produktivitas) | ✅ Done      | Done    |
| RPT-01      | Report: Petani                      | ✅ Done        | Done    |
| RPT-02      | Report: Pelatihan                   | ✅ Done        | Done    |
| RPT-03      | Report: Produksi                    | ✅ Done        | Done    |
| RPT-04      | Report: Kelompok Tani               | ✅ Done        | Done    |
| RPT-05      | Report: Lahan                       | ✅ Done        | Done    |
| BULK-01     | Bulk Upload: Menu & KT              | ✅ Done        | Done    |
| BULK-02     | Bulk Upload: Region                 | 🔲 Not Started | Next    |
| BULK-03     | Bulk Upload: Farmer                 | ✅ Done        | Done    |
| BULK-04     | Bulk Upload: Production             | ✅ Done        | Done    |
| DA-01       | Farmer Summary Analytics            | ✅ Done        | Done    |
| DA-02       | Analisa Ketersediaan Data KT        | ✅ Done        | Done    |
| TOOLS-01    | Tools Import/Export/GIS/S3          | 🟠 Partial     | Next    |
| CMS-01      | CMS & Content Management            | 🔲 Not Started | Later   |
| COMM-01     | Community                           | 🔲 Not Started | Later   |
| COMM-02     | i18n                                | 🔲 Planned     | Later   |
| OPS-01      | Testing                             | 🟠 Partial     | Later   |
| OPS-02      | DevOps & Deployment                 | 🟠 Partial     | Later   |

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
- **Next step:** Maintain and test regression.

</details>

<details>
<summary><strong>PLATFORM-05</strong> · ✅ Done — Dynamic Menu Management</summary>

- **Evidence:** `MenuItem` schema, seed, menu server actions, sidebar, menu management page.
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
- **#152 ✅ (2026-07-15):** detail Petani tampilkan Gapoktan/KUD + KT turunan dari lahan aktif (`lib/farmer-sub-groups.ts`).
- **#172 ✅ kode (2026-07-16):** detail Petani = **profil 360° ber-Tabs** — header (avatar placeholder TD-017, badge Lembaga ber-link #171, breadcrumb = ID Petani) + 5 cards (Lahan+Luas, Produksi, Pelatihan n/paket, Kelengkapan Profil 5-cek, Produktivitas terakhir #166) + tabs Ringkasan/Lahan (tabel + peta shared + PDF Profil Lahan #134)/Pelatihan (checklist + riwayat pre→post)/Produksi (per tahun ber-persentase kelengkapan bulanan + bulanan collapsible + 4 kategori); action `getFarmerDetail` + pure lib (+4 unit); **sensor NIK & tanggal lahir di layar** (`lib/mask.ts`, +3 unit).
- **Next step:** verifikasi visual owner → retro/close #172; field foto petani = TD-017.

</details>

<details>
<summary><strong>MD-04</strong> · ✅ Done — Parcels</summary>

- **Evidence:** `LandParcel` model ✅, `src/server/actions/land-parcel.ts` (165 LOC) ✅, `src/server/actions/bulk-upload-parcel.ts` (222 LOC) ✅, validation schema ✅, UI list/detail/form ✅, ZIP Shapefile bulk upload dengan column mapping ✅, 14 unit tests ✅.
- **Next step:** Maintain; expand to Production dependency.

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
<summary><strong>MD-08</strong> · 🔲 Planned — HCV</summary>

- **Evidence:** No HCV model/route/action/UI.
- **Next step:** Define scope.

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
- **Monev BMP (Teladan/Praktisi/Pemula/Belum) out-of-scope** — data belum ada; follow-up issue terpisah saat sumber data monev jelas.
- **Test:** +27 unit (`dashboard-bmp.test.ts`) +2 perf (`buildBmpSnapshotData` 6k lahan × 36 bln; slice+chart) +5 unit filter Kelengkapan Data — total **441** ✅; lint 0; build ✅.
- **Status penutupan:** verifikasi visual owner ✅ → retro + **close #166** (2026-07-15). **Sisa operasional:** regenerate snapshot BMP — snapshot pra-`byYear`/`monthlyFull` menampilkan 0 pada filter Tahun & mode Full 1 Tahun.

</details>

<details>
<summary><strong>DASH-05</strong> · ✅ Done — Dashboard: Card Total Kelompok Tani</summary>

- **#148 ✅ (kode):** kartu "Total Kelompok Tani" = distinct `subGroupLv2` **per Lembaga** (`KTDetails.kelompokTaniCount`, ternormalisasi, null diabaikan, year-independent) → `stats.totalKelompokTaniLahan`.
- `sumKelompokTaniStats`/`scopeSnapshotData` recompute saat slice; `normalizeSnapshotData` default 0 (snapshot lama); select `subGroupLv2` di `dashboard-query.ts`; kolom di tabel snapshot list + detail.
- **Snapshot-backed** — 0 sampai data `subGroupLv2` (#150) + regen. Filter generate **dinonaktifkan** (`FILTERS_ENABLED=false`) = Semua Data; kolom Distrik/Tahun list default hidden. +2 unit test.
- **Next step:** Implement #148 completed.

</details>

#### MAP — Geospatial Map Explorer

<details>
<summary><strong>MAP-01</strong> · ✅ Done — Map: Peta Lahan</summary>

- **#113 ✅ (scaffolding):** menu `map`+`map-parcel` (seed CSV + DB) ✅.
- **UI:** `/admin/map/parcel` peta full-bleed MapLibre (`react-map-gl`) + panel filter floating collapsible (Province→District→KT + Muat Data) + legend layer toggle (point KT / centroid lahan / polygon lahan) + info popup accordion (Detail Lahan / Pelatihan Petani lazy-load / **Produksi data asli per-lahan + selektor Rata-rata/tahun, grafik sumbu-Y kanan + tooltip** — #134) ✅.
- **Server/lib:** `src/server/actions/map.ts` (`getMapData` + dropdowns + `getFarmerTraining`, 3-layer RBAC) + `src/lib/map-data.ts` (pure, teruji) + `src/types/map.ts` + `src/validations/map.schema.ts` ✅; centroid lahan via `@turf`; 7 unit test ✅.
- **Peta Lainnya:** overlay raster referensi SIGAP KLHK/Kemenhut (Kawasan Hutan / Pelepasan / Gambut / PIPPIB / Penutupan Lahan) via proxy tile `api/map-overlay/[key]` (atasi CORS + TLS upstream) ✅.
- **Tambah Data GIS Lain:** user tambah layer WMS/Shapefile/GeoJSON (parse browser via `shpjs`, `map-custom-gis.tsx`) ✅.
- **Enhancement 2026-07-10:** layer **Titik Api (Hotspot)** NASA FIRMS VIIRS 375 m (proxy `api/map-hotspot` auth-guarded + `lib/firms.ts`, bbox **Riau**, window **24 jam / 5 hari**) + **tool Ruler** ukur jarak & luas geodesik (label segmen/undo/Esc) + **label nama KT & petani** (petani hanya bila **muat di poligon**, wrap otomatis, bounds precomputed) ✅; helper murni `map-geo.ts` + **22 unit test** ✅.
- **Next step:** Implement #113 completed. **#134 (2026-07-11):** produksi popup real per-lahan + selektor tahun + PDF matriks tahun×bulan×Total + rebrand "Profil Lahan" + dedup fetch produksi + fix popup refresh; **#135:** panel kanan daftar lahan (search+zoom); legenda collapsible.
- **Follow-up (tech debt #136):** Recharts grafik popup, data-quality produksi tanpa `parcelId`, debounce/virtualisasi panel, lahan tetangga di PDF (#134-E), warna area lahan 2 kategori (ada/tidak ada produksi); analisis spasial overlap parcel↔kawasan hutan (PostGIS `ST_Intersects`); **hotspot follow-up:** proximity alert KT/parcel↔hotspot, integration test route.

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
- **Summary** `report-kelompok-tani` — agregat 1 baris per (Lembaga×Gapoktan/KUD×KT): distinct petani, jumlah lahan, total luas; filter Distrik/Lembaga opsional + search + **column selector** + 6 card.
- **Detail** `report-kelompok-tani-detail` — roster per 1 Lembaga (Gapoktan/KUD→KT→Petani), **section collapsible** (default tutup) + **auto-hide** Gapoktan bila Lembaga tak punya.
- Keduanya Excel + PDF. Pure `lib/report-kelompok-tani.ts`(+7) & `report-kelompok-tani-detail.ts`(+7); RBAC 3-layer; label "Gapoktan"→"Gapoktan/KUD". Read-only, tanpa migration.
- **Next step:** Implement #154 completed.

</details>

<details>
<summary><strong>RPT-05</strong> · ✅ Done — Report: Lahan</summary>

- **#177 ✅ (real-time):** submenu `report-land-parcel` — roster datar **1 baris = 1 lahan aktif**: Lembaga Petani | Nama Petani | ID Petani | ID Lahan | Kelompok Tani (+ Tahun Tanam & Luas default; Gapoktan/KUD, Blok, Komoditas, Species, PSR via **column selector**).
- **#179 ✅ (revisi owner pasca-QC):** **Lembaga wajib** (laporan & cetakan per 1 Lembaga, search dihapus); **PDF landscape ber-halaman peta** — poligon lahan digambar vektor jsPDF (pola farm-passport), **label per ceklis** (No/Nama/ID Petani/ID Lahan/KT) **adaptif** (`fitLabelToBox`: horizontal → vertikal 90° → auto-scale lantai 0.55; fix posisi teks vertikal — jsPDF align pra-rotasi, anchor manual `verticalLabelAnchors` diverifikasi dari content stream); **grid index (atlas) fleksibel Baris × Kolom** (input bebas, baris maks 26 = label A–Z) → halaman ikhtisar ber-grid (A1, A2, …) + 1 halaman per sel berisi (sel kosong dilewati); **preview on-page (SVG)** dari helper layout yang sama dengan PDF; **Excel multi-sheet ber-gambar peta** (sheet Lahan + gambar index; satu sheet per sel + peta selnya, SVG→PNG); geometry di-fetch per-Lembaga terpisah dari payload list (#163).
- KT/Gapoktan = atribut per-lahan `subGroupLv*` (#146/#152), normalisasi trim + distinct KT case-insensitive per Lembaga (pola #154); KT kosong tampil "-". Pure `lib/report-land-parcel.ts` + `report-land-parcel-pdf.ts` + `report-land-parcel-xlsx.ts` (**33 unit + 1 perf** termasuk verifikasi empiris jsPDF & workbook exceljs; #180: anti-tumpang label, skala batang + utara, mini-index sel); RBAC 3-layer. Read-only (migration `species`/`isPsr` tercatat di MD-04).
- **Next step:** Implement #177 + #179 completed.

</details>

#### BULK — Bulk Upload

<details>
<summary><strong>BULK-01</strong> · ✅ Done — Bulk Upload: Menu & KT</summary>

- **Evidence:** Menu & route setup ✅; redirect `/admin/bulk-upload` → `/farmers` implemented ✅.
- **Next step:** Maintain; #68 complete.

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
- **Next step:** Maintain; #118 complete. **DA-02b (#122):** Domain Pelatihan diperdetail → cakupan per paket (4a Ringkasan per Paket / 4b Matriks / 4c Petani Belum Lengkap, nested collapse), skor domain = rata-rata % cakupan paket, +2 sheet Excel.

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
<summary><strong>OPS-01</strong> · 🟠 Partial — Testing</summary>

- **Evidence:** Vitest: **39 test files / 519 passing tests** ✅; coverage: auth/RBAC/menu/menu-filter/user/region/farmer/land-parcel/training/production/bulk-upload/report/dashboard/data-analyst/data-completeness/map (MAP-01/02/03)/map-geo/firms/middleware/perf + rbac-server-guards (#125) + access-context lintas-scope (#127) + profile/addParticipants validation (#130) + **report-kelompok-tani (Summary/Detail) #154** + dashboard KT count #148 + parcel-bulk-mapping (#150) + farmer-sub-groups (#152) + agregasi farmer-group (#163) + **dashboard-bmp (#166)** + farmer-group-detail (#171) + farmer-detail (#172) + **produktivitas peta BMP (#174)** + **report-lahan/layout peta/grid/PDF/Excel (#177/#179, termasuk verifikasi empiris jsPDF & workbook exceljs)** + perf layout peta 2k lahan.
- **Next step:** RPT-03 (#132) ✅, MAP-02 (#144) ✅, RPT-04 (#154) ✅ & DASH-05 (#148) ✅ tercakup; gap tersisa: integration test route hotspot.

</details>

<details>
<summary><strong>OPS-02</strong> · 🟠 Partial — DevOps & Deployment</summary>

- **Evidence:** Dockerfile, deploy workflows, security scan workflows (`gitleaks.yml`, `semgrep.yml`).
- **Next step:** Verify deployment, env matrix, rollback, and CI status.

</details>

### Code Audit Evidence

<details>
<summary><strong>Code Audit Evidence</strong> — bukti codebase per area (models, routes, actions, tests, DevOps)</summary>

| Area           | Bukti di Codebase                                                                                                                                                                  | Kesimpulan                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Prisma models  | **19 model / 13 migrasi** (+2 additif 2026-07-14: `LandParcel.subGroupLv1/Lv2` #146 + `blok`; +1 additif 2026-07-15: identitas `FarmerGroup` #160): `User`, `MenuItem`, `RolePermission`, `UserProvince`, `UserDistrict`, `UserFarmerGroup`, `UserPermissionOverride`, `Province`, `District`, `Subdistrict`, `Village`, `FarmerGroup`, `Farmer`, `LandParcel`, `TrainingPackage`, `TrainingActivity`, `TrainingParticipant`, `ProductionRecord`, `MainDashboardSnapshot` | Schema mencakup platform, RBAC, region, farmer group, farmer (MD-03), land parcel (MD-04), training (MD-05), production (MD-06), dan dashboard snapshot (DASH-01) ✅ |
| Admin routes   | **39 page.tsx**: Dashboard (Main, snapshot-backed), Settings (Users/Roles/Menu/Regions), Master Data (Farmers + Groups + Parcels + Training + Production, list/detail/form), Bulk Upload (Farmers + Parcels Shapefile + Production), Report (Petani + Pelatihan + Produksi + Kelompok Tani Summary/Detail #154 + **Lahan #177/#179**), Data Analyst (Ringkasan Petani + Analisa Ketersediaan Data), Map (Peta Lahan + Peta BMP), Tools (Dashboard Snapshot), Profile | ✅ Semua page konten ter-guard `requirePermission` (29) + 8 justified (redirect-only/profile) — verifikasi audit 2026-07-10; `/admin/map/bmp` guard `map-bmp` (#144) |
| Server actions | **22 file — total 3.894 LOC** (audit `wc -l` 2026-07-10): `user`, `user-data-access`, `user-menu-access`, `menu`, `region`, `role-permission`, `farmer-group`, `farmer` (143), `land-parcel` (216), `bulk-upload` (76), `bulk-upload-parcel` (223), `bulk-upload-production` (160), `training` (363), `production` (375), `upload`, `profile`, `report` (392), `dashboard` (70), `snapshot` (204), `map`, `data-analyst` (187), `data-completeness` | Semua modul (incl. dashboard, snapshot, map, report) tersedia ✅ — catatan audit: 5 celah guard/scope, lihat `audit-report/audit-2026-07-10.md` §2 |
| Validation schemas | `farmer-group.schema.ts`, `farmer.schema.ts`, `land-parcel.schema.ts`, `map.schema.ts`, `menu.schema.ts`, `production.schema.ts`, `region.schema.ts`, `snapshot.schema.ts`, `training-activity.schema.ts`, `training-participant.schema.ts`, `user.schema.ts` — **11 files** | Validation coverage: user, region, menu, farmer-group, farmer, land-parcel, training, production, map, snapshot ✅ |
| Public routes  | Home, Community placeholder, Knowledge Management placeholder                                                                                                                      | Public shell ada; CMS/community belum implementatif                                    |
| Scripts        | `scripts/get-link.js`, `scripts/pdf-manager.js` (tracked, npm commands aktif ✅); debug/stale scripts dipindah ke `scripts/local/` (gitignored, local-only) | BUG-002 resolved — stale scripts tidak ada di repo/CI. |
| Tests          | `npm test` lulus **24 test files / 311 tests** ✅ (audit 2026-07-10); test files: auth, bulk-upload, dashboard, data-analyst, data-completeness, farmer, firms, land-parcel, map, map-geo, menu-action, menu-filter, middleware, perf, production, rbac, rbac-permission, region, report, training-activity, training-participant, user-action, user-data-access, user-menu-access | Testing solid untuk semua core features (termasuk RPT-03/#132: 14 unit test); gap tersisa: integration test route hotspot |
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
