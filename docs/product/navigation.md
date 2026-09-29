# Produk — Navigasi & Menu

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [access-context.md](access-context.md) · [crud-flows.md](crud-flows.md) · [role-flows.md](role-flows.md) · [../project/roadmap.md](../project/roadmap.md#phase-status-indeks) · [pages/](pages/README.md)

**Isi halaman ini:** peta navigasi aplikasi admin — lapis route, role, struktur menu sidebar, dan status tiap sub menu dalam satu baris.

**Sumber data:** menu dari `prisma/seeds/data/menu.csv` · halaman dari `src/app/(admin)/admin/**`.

## Cari di mana

| Yang dicari | Dokumen |
|---|---|
| Detail per halaman (objek, kolom, tombol, pesan, guard) | [pages/](pages/README.md) — satu file per halaman |
| Status delivery per fase (**kanonis**) | [../project/roadmap.md](../project/roadmap.md) · sprint berjalan: [../project/sprint.md](../project/sprint.md) |
| Stack, struktur folder, request flow | [../standards/architecture.md](../standards/architecture.md) |
| Aturan hak akses & scope data | [role-flows.md](role-flows.md) · [access-context.md](access-context.md) · [../standards/rbac.md](../standards/rbac.md) |

> ⚠️ **Angka & status di halaman ini adalah cerminan**, bukan sumber kebenaran. Perbarui [../project/roadmap.md](../project/roadmap.md) lebih dulu.

Legenda status: ✅ Done · 🟠 Partial · 🔲 Planned · 🔴 Blocked — definisi lengkap di [roadmap.md § Status Definition](../project/roadmap.md).

---

## Peta Sistem

### Lapis route

| Lapis | Route | Guard |
|---|---|---|
| Publik | `/` (Home ✅), `/community` 🔲, `/knowledge-management` 🔲 | — |
| Autentikasi | `/login` ✅ · `/api/auth/[...nextauth]` | NextAuth (Credentials) |
| Admin | `/admin/**` | `src/middleware.ts` (sesi) → `requirePermission(menuKey)` per halaman |
| Proxy tile | `/api/map-overlay/[key]` (ArcGIS pemerintah: geoportal Kemenhut & Satu Peta BIG) · `/api/map-hotspot` (NASA FIRMS) · `/api/map-basemap` (latar peta cetak Laporan Lahan, #318) | `hasPermission(menuKey, "VIEW")` per endpoint (overlay: `map-parcel`; hotspot: `map-parcel` atau `dashboard-risk-fire`; basemap: `report-land-parcel`), same-origin |

Semua akses data lewat **Server Actions** (`src/server/actions/`) dengan 3 lapis pengaman: permission menu → access context → soft delete. Tidak ada REST API selain NextAuth & proxy tile.

### Role & cakupan

Enum `Role` (`prisma/schema/_config.prisma`) — 5 role. Kolom "Scope data" ditentukan `getAccessContext()`, bukan role itu sendiri (lihat [access-context.md](access-context.md)).

| Role | Scope data | Menu yang diakses |
|---|---|---|
| **SUPERADMIN** | `ALL` (bypass semua guard) | Semua menu, semua aksi |
| **ADMIN** | `BY_DISTRICT` (dari `UserProvince`/`UserDistrict`) | Dashboard, Master Data (tanpa DELETE), Report, Bulk Upload, Data Analyst, Tools (tanpa delete snapshot), Map, Bantuan — **tanpa Settings** |
| **OPERATOR** | `BY_FARMER_GROUP` (dari `UserFarmerGroup`) | Dashboard, Master Data (VIEW/EXPORT/PRINT, tanpa hak tulis), Report, Data Analyst (sebagian), Map, Bantuan — **tanpa Bulk Upload, Tools, Settings** |
| **MANAGEMENT** | `ALL` (read-only) | Dashboard, Master Data (VIEW/EXPORT/PRINT), Report, Data Analyst, Map, Bantuan — **tanpa Bulk Upload, Tools, Settings** |
| **DONOR** (#187) | `ALL` atau ter-scope bila di-assign | Dashboard, Report (Petani/Pelatihan/Produksi/Lahan), Map, Master Data (kecuali Produksi), Bantuan — **VIEW + PRINT**, tanpa EXPORT (revisi #263) |

> Tanpa assignment apa pun → mode `ALL`. Urutan evaluasi `getAccessContext()`: SUPERADMIN → tanpa assignment = `ALL` → **hanya** `UserFarmerGroup` = `BY_FARMER_GROUP` → ada `UserProvince`/`UserDistrict` = `BY_DISTRICT`. Sesi kosong / user tak ditemukan → `BY_DISTRICT` dengan ids kosong = **tolak semua**. Rincian per role di [role-flows.md](role-flows.md).

---

## Struktur Menu Sidebar

<!-- GENERATED:menu-summary — npm run build:docs; jangan sunting tangan -->
**9 menu top-level · 38 sub menu · 1 menu level-3** (`prisma/seeds/data/menu.csv`, urut kolom `order`):

- **Dashboard** (`dashboard`, order 0) — 5 sub menu + Fire Alert (level 3)
- **Report** (`report`, order 1) — 7 sub menu
- **Map** (`map`, order 2) — 2 sub menu
- **Master Data** (`master-data`, order 3) — 6 sub menu
- **Data Analyst** (`data-analyst`, order 4) — 8 sub menu
- **Tools** (`tools`, order 6) — 2 sub menu
- **Bantuan** (`help`, order 9) — tanpa sub menu
- **Bulk Upload** (`bulk-upload`, order 10) — 4 sub menu
- **Settings** (`settings`, order 99) — 4 sub menu
<!-- /GENERATED:menu-summary -->

Halaman non-menu: `/admin/profile` (Ubah Kata Sandi) · `/login` · route publik. Lihat [pages/non-menu/](pages/non-menu/README.md).

---

## Rincian Sub Menu

Kolom **Ringkasan** sengaja satu baris; detail lengkap ada di dokumen halaman yang ditautkan.

### 📊 Dashboard — `/admin/dashboard`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Main Dashboard](pages/dashboard/main.md) | `dashboard-main` | DASH-01 | Snapshot-backed: 14 summary card (incl. Petani L/P, Total Kelompok Tani #148, 3 card sertifikasi RSPO/ISPO/SAP-MAP #169) + filter Distrik/KT/Tahun + peta MapLibre 60:40 ber-info panel |
| ✅ [BMP Dashboard (Produksi)](pages/dashboard/bmp.md) | `dashboard-bmp` | DASH-04 (#166 #191) | Snapshot-backed: 4 card KPI + 2 grafik 50/50 (tren + ranking Lembaga) + card Ex-Plasma vs Swadaya (distrik × umur tanaman); default tahun berjalan; terminologi Terdata; filter client-side |
| ✅ [Dashboard Pelatihan](pages/dashboard/training.md) | `dashboard-training` | DASH-06 | **Live query (bukan snapshot)**: 5 KPI + matriks cakupan Lembaga × Paket + tren stacked-bar + panel efektivitas pre/post + panel kualitas data ber-deep-link |
| ✅ [Monev BMP](pages/dashboard/bmp-monev.md) | `dashboard-bmp-monev` | DASH-08 (#344 #346 #360) | Live query: Papan Lembaga, heatmap indikator, radar A vs B, 10 prioritas/teladan + Excel rekap |
| ✅ Risk Management › [Fire Alert](pages/dashboard/risk/fire.md) | `dashboard-risk` › `dashboard-risk-fire` | DASH-07 | Titik api NASA FIRMS vs boundary ICS Lembaga (buffer 1,5 km), rentang 24 jam–30 hari + laporan bulanan, PDF |

### 📁 Master Data — `/admin/master-data`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Lembaga Petani](pages/master-data/groups/README.md) | `master-data-groups` | MD-02 | List/CRUD + detail profil 360° ber-Tabs (cards, struktur KT, peta sebaran lahan, pelatihan, produksi) (#171) |
| ✅ [Petani](pages/master-data/farmers/README.md) | `master-data-farmers` | MD-03 | List/CRUD + detail profil 360° ber-Tabs (cards, lahan/peta, PDF Profil Lahan, checklist pelatihan, produksi) (#172) |
| ✅ [Pelatihan](pages/master-data/training/README.md) | `master-data-training` | MD-05 | Kegiatan + peserta (pre/post-test) + unggah bukti ke S3 |
| ✅ [Lahan](pages/master-data/parcels/README.md) | `master-data-parcels` | MD-04 | Peta + poligon + geolocation + revision tracking |
| ✅ [Produksi](pages/master-data/production/README.md) | `master-data-production` | MD-06 | Periode + panen ke-n + validasi duplikat |
| ✅ [Monev BMP](pages/master-data/bmp-monev/README.md) | `master-data-bmp-monev` | DASH-08 (#344 #346) | Skor BMP per petani per tahun + rincian 32 indikator, import rekap/form survei, Penilaian Lembaga |

Belum dimulai (belum ada menu/route): 🔲 Staff (MD-07) · BUSDEV (MD-09) · IMPACT (MD-10) · Workplan (MD-11). 🟠 HCV (MD-08) — langkah awal status NKT per lahan (#328) + patok (#329/#331), tanpa menu tersendiri.

### ⚙️ Settings — `/admin/settings`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [User Management](pages/settings/users.md) | `settings-users` | PLATFORM-04 | CRUD user + data access assignment + override menu per-user |
| ✅ [Menu Management](pages/settings/menu.md) | `settings-menu` | PLATFORM-05/07 | Sidebar dinamis, hierarki maks. 3 level; render rekursif via `src/lib/menu-tree.ts` + baris collapsible (`useCollapseState`) (#187B) |
| ✅ [Role & Permission](pages/settings/roles.md) | `settings-roles` | PLATFORM-04 | Matriks 6 izin (CREATE/VIEW/EDIT/DELETE ┊ EXPORT/PRINT, #245) per role × menu — header ikon + toggle kolom, preset baris (Lihat saja/Lihat+Unduh/Akses penuh/Kosongkan), render rekursif 3 level (`menu-tree.ts`), collapsible + `useCollapseState`, sticky header/kolom, selektor role, kaskade induk→anak; SUPERADMIN dikecualikan dari matriks (**4 kolom role editable**, bukan 5) (#187B) |
| ✅ [Regions](pages/settings/regions.md) | `settings-regions` | MD-01 | Hierarki wilayah 4 level (Provinsi→Distrik→Kecamatan→Desa) |

### 📤 Bulk Upload — `/admin/bulk-upload`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Upload Petani](pages/bulk-upload/farmers.md) | `bulk-upload-farmers` | BULK-03 (#76 #196 #197) | Excel + mapping kolom dinamis + validasi 3 status (Valid/Tidak Lengkap/Error) + 2 tombol simpan + preview + unduh per status |
| ✅ [Upload Produksi](pages/bulk-upload/production.md) | `bulk-upload-production` | BULK-04 | Excel + validasi periode/panen + preview |
| ✅ [Lahan](pages/bulk-upload/parcels.md) | `bulk-upload-parcels` | MD-04 (#88) | ZIP Shapefile + mapping (incl. Kelompok Tani & Blok #150) + validasi geometri |
| ✅ [Pohon Sawit](pages/bulk-upload/trees.md) | `bulk-upload-trees` | MD-04 (#238) | ZIP shapefile point per lahan, revisi per-set |

Belum ada menu/route: 🔲 Lembaga Petani/KT & Region (BULK-02) — issue #69/#70 ditutup *not planned* 2026-06-28; status fase menunggu keputusan owner (lihat roadmap).

### 📉 Data Analyst — `/admin/data-analyst`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Ringkasan Petani](pages/data-analyst/farmer-summary.md) | `data-analyst-farmer-summary` | DA-01 (#103) | Filter distrik/KT + 2 tab (Detail Petani, Petani Tanpa Lahan) + kartu agregat + Excel |
| ✅ [Ketersediaan Data — Per Lembaga](pages/data-analyst/data-completeness.md) | `data-analyst-data-completeness` | DA-02 (#118, #122, #352) | Index Ketersediaan Data (registri check, bobot tampil) + cakupan modul informatif + 5 section anomali (Profil KT, Petani, Lahan, Pelatihan, Produksi) berdaftar kerja bertautan & anomali sistemik dilipat + Excel multi-sheet; `?lembaga=` |
| ✅ [Ketersediaan Data — Semua Lembaga](pages/data-analyst/data-availability.md) | `data-analyst-data-availability` | DA-03 (#193, #352) | Roll-up skor DA-02 lintas Lembaga: 6 KPI + matriks Lembaga×domain / Lembaga×modul + bar chart terendah-dulu + panel anomali (per entitas vs sistemik) + Excel; deep link ke DA-02; live query, tanpa DONOR |
| 🟠 [Tumpang Tindih Lahan](pages/data-analyst/parcel-overlap.md) | `data-analyst-parcel-overlap` | #317 Fase 2 (tab Tumpang Tindih) | Self-join `ST_Intersects` atas `LandParcel.geom` (GiST), live; split view tabel + peta preview; filter %/jenis/Distrik/Lembaga/label di URL; Duplikat vs Tercakup; Excel + SHP/GeoJSON irisan; scope minimal satu sisi; tanpa DONOR. Tab Luar Boundary/Selisih Luas + guard upload + layer peta belum |
| ✅ [Komparasi Data Acuan](pages/data-analyst/benchmark-comparison.md) | `data-analyst-benchmark-comparison` | DA-06 (#243) | Angka acuan manual per Lembaga vs data MIS |
| ✅ [Metrik Rilis](pages/data-analyst/metrics.md) | `dashboard-metrics` | — | Roadmap %, KPI & RVS per rilis dari `docs/project/metrics.md` + Detail Roadmap (route `/admin/dashboard/metrics`) |
| ✅ [Peta Data & Skema](pages/data-analyst/data-map.md) | `data-analyst-data-map` | DA-07 | Lineage menu → entitas + skema dari artefak `*.generated.ts` |
| ✅ [Sprint Mingguan](pages/data-analyst/sprint.md) | `data-analyst-sprint` | #378 | Rencana sprint mingguan dari `docs/project/sprint.md` (di-bundle saat build, pola Metrik Rilis): tab Sprint (pemilih minggu, progres poin S/M/L, kotak Butuh keputusan, butir per status) + tab Analisa (velocity, komposisi fokus, keputusan tertunda, carry-over) |

### 📈 Report — `/admin/report`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Petani](pages/report/farmer.md) | `report-farmer` | RPT-01 (#107) | Cascade filter wajib + Excel & PDF |
| ✅ [Pelatihan](pages/report/training.md) | `report-training` | RPT-02 (#108) | Kegiatan, peserta unik & cakupan + Excel 2-sheet + PDF |
| ✅ [Produksi](pages/report/production.md) | `report-production` | RPT-03 (#132) | Matriks bulanan per petani/lahan + Excel & PDF landscape |
| ✅ [Kelompok Tani (Summary)](pages/report/kelompok-tani.md) | `report-kelompok-tani` | RPT-04 (#154, #337) | Agregat real-time Lembaga × KT + column selector (incl. Lahan NKT & Patok) + Excel & PDF |
| ✅ [Kelompok Tani (Detail)](pages/report/kelompok-tani-detail.md) | `report-kelompok-tani-detail` | RPT-04 (#154, #337) | Roster per Lembaga: KT→Petani collapsible + kolom Lahan NKT & Patok + Excel & PDF |
| ✅ [Lahan](pages/report/land-parcel.md) | `report-land-parcel` | RPT-05 (#177/#179/#180, #305, #318, #328, #331, #332) | Roster datar 1 baris = 1 lahan per Lembaga + filter/KPI legalitas, NKT & patok + PDF landscape ber-peta poligon (latar peta opsional) & grid index + Excel multi-sheet ber-gambar + tombol **Laporan NKT** (PDF per Lembaga, mengabaikan filter) |
| ✅ [Patok](pages/report/marker.md) | `report-marker` | MD-08 langkah awal (#331) | Laporan patok batas per Distrik/Lembaga — satu baris per patok fisik (kode `<Lembaga>-PTK-000123`, lahan pemakai, kondisi, bahan) + KPI kondisi + Excel/SHP/GeoJSON/KML/PDF |

### 🔧 Tools — `/admin/tools` (🟠 TOOLS-01)

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Dashboard Snapshot](pages/tools/snapshot/README.md) | `dashboard-snapshot` | DASH-01 | Generate/list/detail snapshot + Excel export + soft delete |
| ✅ [Dashboard Snapshot BMP](pages/tools/snapshot-bmp/README.md) | `dashboard-snapshot-bmp` | DASH-04 (#166) | Generate Semua Data + list + detail per-Lembaga + Excel export + soft delete |
| 🟠 CLI lokal (**bukan menu app**) | — | — | S3 get-link & PDF manager (`scripts/`, npm `s3:get-link` `pdf:*`); export CSV di `scripts/local/` (gitignored) |
| 🔲 GIS Utilities | — | — | Planned |

### 🗺️ Map — `/admin/map`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Peta Lahan](pages/map/parcel.md) | `map-parcel` | MAP-01 (#113/#134/#135) | Peta full-bleed + panel filter & legenda minimizable; overlay raster referensi pemerintah (2 layer: Kawasan Hutan Kemenhut & Gambut Satu Peta BIG + legend/sumber per layer + slider transparansi, via proxy same-origin — #215), Titik Api NASA FIRMS (#240: 24 jam bergulir; #284: rentang 24 jam/5/10/30 hari, warna per keyakinan, ringkasan < 15 km + ekspor SHP/PDF), Tambah Data GIS Lain (WMS/Shapefile/GeoJSON, diparse di browser), ruler geodesik, label adaptif; popup lahan (Detail + Pelatihan + Produksi) + tombol **Profil Lahan** → PDF + aksi popup standar #188 (Lihat Detail / Edit Lahan); panel Daftar Lahan ber-search & zoom |
| ✅ [Peta BMP](pages/map/bmp.md) | `map-bmp` | MAP-02 (#144) · MAP-03 (#174) | Peta tematik poligon-only, 2 layer ber-radio: **Ketersediaan Data Produksi** (4 kategori dari run bulan berturut-turut) & **Produktivitas Ton/Ha** (per tahun / rata-rata, 5 kelas, dihitung client-side); Lembaga wajib; panel matriks per lahan × bulan; cetak PDF & Excel WYSIWYG ikut layer aktif; aksi popup standar #188 (Lihat Detail / Edit Lahan) |

> **Popup peta terstandar (#188/TD-028):** primitif bersama `src/components/shared/map-popup.tsx` + tombol **Lihat Detail** (gate VIEW `master-data-parcels`) & **Edit Lahan** (gate EDIT) di 3 peta — Peta Lahan, Peta BMP, dan peta Sebaran Lahan (`ParcelsDistributionMap` di detail Lembaga/Petani) — dengan modal edit lahan langsung dari peta (`ParcelEditModalHost`).

### ❓ Bantuan — `/admin/help`

| Halaman | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Indeks · Bab · Topik](pages/help/README.md) | `help` | HELP-01/02 (#182–#185) | Panduan in-app 3 lapis (tutorial/konsep/referensi), konten Markdown di `src/content/help/**.md`, sidebar tree + pencarian client-side, dua tingkat kedalaman (baris `+` = Detail), aset S3 privat via presigned URL |

---

## Perilaku Sidebar

- **Pencarian menu** di header sidebar — fokus `Ctrl/⌘+K`, hapus `Esc`/✕, memfilter pohon menu live. Hanya menampilkan menu yang di-grant untuk user tersebut.
- **Tombol "Tutup semua"** (collapse-all) untuk seluruh cabang.
- **Menu induk sebagai container** — induk tetap tampil bila salah satu anaknya ter-grant meski induk sendiri tidak di-grant. Lihat [../standards/rbac.md § RBAC Permission Inheritance](../standards/rbac.md).
- **Hierarki maksimal 3 level**, divalidasi di Menu Management (PLATFORM-07).

---

---

Angka teknis (test, action, model, migrasi, menu, Bantuan): [../standards/architecture.md § Ringkasan Teknis](../standards/architecture.md#ringkasan-teknis). Prioritas & backlog: [../project/sprint.md](../project/sprint.md).
