# Produk — Arsitektur & Navigasi

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [access-context.md](./access-context.md) · [crud-flows.md](./crud-flows.md) · [role-flows.md](./role-flows.md) · [module-status.md](./module-status.md) · [pages/](./pages/README.md)

**Isi halaman ini:** peta navigasi aplikasi admin — lapis route, role, struktur menu sidebar, dan status tiap sub menu dalam satu baris.

**Sumber data:** menu dari `prisma/seeds/data/menu.csv` · halaman dari `src/app/(admin)/admin/**`.

## Cari di mana

| Yang dicari | Dokumen |
|---|---|
| Detail per halaman (objek, kolom, tombol, pesan, guard) | [pages/](./pages/README.md) — satu file per halaman |
| Status delivery per fase (**kanonis**) | [../project/roadmap.md](../project/roadmap.md) · sprint berjalan: [../project/sprint.md](../project/sprint.md) |
| Stack, struktur folder, request flow | [../standards/architecture.md](../standards/architecture.md) |
| Aturan hak akses & scope data | [role-flows.md](./role-flows.md) · [access-context.md](./access-context.md) · [../standards/rbac.md](../standards/rbac.md) |

> ⚠️ **Angka & status di halaman ini adalah cerminan**, bukan sumber kebenaran. Perbarui [../project/roadmap.md](../project/roadmap.md) lebih dulu.

Legenda status: ✅ Done · 🟠 Partial · 🔲 Planned · 🔴 Blocked — definisi lengkap di [roadmap.md § Status Definition](../project/roadmap.md).

---

## 1. Peta Sistem

### Lapis route

| Lapis | Route | Guard |
|---|---|---|
| Publik | `/` (Home ✅), `/community` 🔲, `/knowledge` 🔲 | — |
| Autentikasi | `/login` ✅ · `/api/auth/[...nextauth]` | NextAuth (Credentials) |
| Admin | `/admin/**` | `middleware.ts` (sesi) → `requirePermission(menuKey)` per halaman |
| Proxy tile | `/api/map-overlay/[key]` (ArcGIS pemerintah: geoportal Kemenhut & Satu Peta BIG) · `/api/map-hotspot` (NASA FIRMS) | auth-guarded, same-origin |

Semua akses data lewat **Server Actions** (`src/server/actions/`) dengan 3 lapis pengaman: permission menu → access context → soft delete. Tidak ada REST API selain NextAuth & proxy tile.

### Role & cakupan

Enum `Role` (`prisma/schema/_config.prisma`) — 5 role. Kolom "Scope data" ditentukan `getAccessContext()`, bukan role itu sendiri (lihat [access-context.md](./access-context.md)).

| Role | Scope data | Menu yang diakses |
|---|---|---|
| **SUPERADMIN** | `ALL` (bypass semua guard) | Semua menu, semua aksi |
| **ADMIN** | `BY_DISTRICT` (dari `UserProvince`/`UserDistrict`) | Dashboard, Master Data, Report, Bulk Upload, Data Analyst, Tools, Map, Bantuan — **tanpa Settings** |
| **OPERATOR** | `BY_FARMER_GROUP` (dari `UserFarmerGroup`) | Dashboard, Master Data (CRUD sebagian dalam scope), Report, Bulk Upload (Petani & Produksi), Data Analyst, Map, Bantuan |
| **MANAGEMENT** | `ALL` (read-only) | Dashboard, Master Data (VIEW), Report, Data Analyst, Map, Tools (snapshot view-only), Bantuan |
| **DONOR** (#187) | `ALL` atau ter-scope bila di-assign | Dashboard, Report, Map, Bantuan — **VIEW-only** |

> Tanpa assignment apa pun → mode `ALL`. Urutan evaluasi `getAccessContext()`: SUPERADMIN → tanpa assignment = `ALL` → **hanya** `UserFarmerGroup` = `BY_FARMER_GROUP` → ada `UserProvince`/`UserDistrict` = `BY_DISTRICT`. Sesi kosong / user tak ditemukan → `BY_DISTRICT` dengan ids kosong = **tolak semua**. Rincian per role di [role-flows.md](./role-flows.md).

---

## 2. Struktur Menu Sidebar

9 menu top-level / 28 sub menu (`menu.csv`), urut sesuai kolom `order`:

```text
📊 Dashboard          (3 sub)   📈 Report        (6 sub)
📁 Master Data        (5 sub)   🔧 Tools         (2 sub)
⚙️  Settings           (4 sub)   🗺️  Map           (2 sub)
📤 Bulk Upload        (3 sub)   ❓ Bantuan       (halaman bab/topik, tanpa sub menu)
📉 Data Analyst       (3 sub)
```

Halaman non-menu: `/admin/profile` (Ubah Kata Sandi) · `/login` · route publik. Lihat [pages/halaman-non-menu/](./pages/halaman-non-menu/README.md).

---

## 3. Rincian Sub Menu

Kolom **Ringkasan** sengaja satu baris; detail lengkap ada di dokumen halaman yang ditautkan.

### 📊 Dashboard — `/admin/dashboard`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Main Dashboard](./pages/dashboard/main-dashboard.md) | `dashboard-main` | DASH-01 | Snapshot-backed: 14 summary card (incl. Petani L/P, Total Kelompok Tani #148, 3 card sertifikasi RSPO/ISPO/SAP-MAP #169) + filter Distrik/KT/Tahun + peta MapLibre 60:40 ber-info panel |
| ✅ [BMP Dashboard (Produksi)](./pages/dashboard/bmp-dashboard-produksi.md) | `dashboard-bmp` | DASH-04 (#166 #191) | Snapshot-backed: 4 card KPI + 2 grafik 50/50 (tren + ranking Lembaga) + card Ex-Plasma vs Swadaya (distrik × umur tanaman); default tahun berjalan; terminologi Terdata; filter client-side |
| ✅ [Dashboard Pelatihan](./pages/dashboard/dashboard-pelatihan.md) | `dashboard-training` | DASH-06 | **Live query (bukan snapshot)**: 5 KPI + matriks cakupan Lembaga × Paket + tren stacked-bar + panel efektivitas pre/post + panel kualitas data ber-deep-link |

### 📁 Master Data — `/admin/master-data`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Lembaga Petani](./pages/master-data/lembaga-petani/README.md) | `master-data-groups` | MD-02 | List/CRUD + detail profil 360° ber-Tabs (cards, struktur KT, peta sebaran lahan, pelatihan, produksi) (#171) |
| ✅ [Petani](./pages/master-data/petani/README.md) | `master-data-farmers` | MD-03 | List/CRUD + detail profil 360° ber-Tabs (cards, lahan/peta, PDF Profil Lahan, checklist pelatihan, produksi) (#172) |
| ✅ [Pelatihan](./pages/master-data/pelatihan/README.md) | `master-data-training` | MD-05 | Kegiatan + peserta (pre/post-test) + unggah bukti ke S3 |
| ✅ [Lahan](./pages/master-data/lahan/README.md) | `master-data-parcels` | MD-04 | Peta + poligon + geolocation + revision tracking |
| ✅ [Produksi](./pages/master-data/produksi/README.md) | `master-data-production` | MD-06 | Periode + panen ke-n + validasi duplikat |

Belum dimulai (belum ada menu/route): 🔲 Staff (MD-07) · HCV (MD-08) · BUSDEV (MD-09) · IMPACT (MD-10) · Workplan (MD-11).

### ⚙️ Settings — `/admin/settings`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [User Management](./pages/settings/user-management.md) | `settings-users` | PLATFORM-04 | CRUD user + data access assignment + override menu per-user |
| ✅ [Menu Management](./pages/settings/menu-management.md) | `settings-menu` | PLATFORM-05/07 | Sidebar dinamis, hierarki maks. 3 level; render rekursif via `src/lib/menu-tree.ts` + baris collapsible (`useCollapseState`) (#187B) |
| ✅ [Role & Permission](./pages/settings/role-permission.md) | `settings-roles` | PLATFORM-04 | Matriks 6 izin (CREATE/VIEW/EDIT/DELETE ┊ EXPORT/PRINT, #245) per role × menu — header ikon + toggle kolom, preset baris (Lihat saja/Lihat+Unduh/Akses penuh/Kosongkan), render rekursif 3 level (`menu-tree.ts`), collapsible + `useCollapseState`, sticky header/kolom, selektor role, kaskade induk→anak; SUPERADMIN dikecualikan dari matriks (**4 kolom role editable**, bukan 5) (#187B) |
| ✅ [Regions](./pages/settings/regions.md) | `settings-regions` | MD-01 | Hierarki wilayah 4 level (Provinsi→Distrik→Kecamatan→Desa) |

### 📤 Bulk Upload — `/admin/bulk-upload`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Upload Petani](./pages/bulk-upload/upload-petani.md) | `bulk-upload-farmers` | BULK-03 (#76 #196 #197) | Excel + mapping kolom dinamis + validasi 3 status (Valid/Tidak Lengkap/Error) + 2 tombol simpan + preview + unduh per status |
| ✅ [Upload Produksi](./pages/bulk-upload/upload-produksi.md) | `bulk-upload-production` | BULK-04 | Excel + validasi periode/panen + preview |
| ✅ [Lahan](./pages/bulk-upload/lahan.md) | `bulk-upload-parcels` | MD-04 (#88) | ZIP Shapefile + mapping (incl. Kelompok Tani & Blok #150) + validasi geometri |

Belum dimulai: 🔲 Lembaga Petani (#69) · 🔲 Region (BULK-02, #70) — belum ada menu/route.

### 📉 Data Analyst — `/admin/data-analyst`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Ringkasan Petani](./pages/data-analyst/ringkasan-petani.md) | `data-analyst-farmer-summary` | DA-01 (#103) | Filter distrik/KT + 2 tab (Detail Petani, Petani Tanpa Lahan) + kartu agregat + Excel |
| ✅ [Analisa Ketersediaan Data](./pages/data-analyst/analisa-ketersediaan-data.md) | `data-analyst-data-completeness` | DA-02 (#118, #122) | Index Ketersediaan Data + 5 section anomali (Profil KT, Petani, Lahan, Pelatihan, Produksi) + Excel multi-sheet |
| ✅ [Dashboard Ketersediaan Data](./pages/data-analyst/dashboard-ketersediaan-data.md) | `data-analyst-data-availability` | DA-03 (#193) | Roll-up skor DA-02 lintas Lembaga: 6 KPI + matriks Lembaga×domain + bar chart terendah-dulu + panel anomali; live query, tanpa DONOR |

### 📈 Report — `/admin/report`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Petani](./pages/report/petani.md) | `report-farmer` | RPT-01 (#107) | Cascade filter wajib + Excel & PDF |
| ✅ [Pelatihan](./pages/report/pelatihan.md) | `report-training` | RPT-02 (#108) | Kegiatan, peserta unik & cakupan + Excel 2-sheet + PDF |
| ✅ [Produksi](./pages/report/produksi.md) | `report-production` | RPT-03 (#132) | Matriks bulanan per petani/lahan + Excel & PDF landscape |
| ✅ [Kelompok Tani (Summary)](./pages/report/kelompok-tani-summary.md) | `report-kelompok-tani` | RPT-04 (#154) | Agregat real-time Lembaga × KT + column selector + Excel & PDF |
| ✅ [Kelompok Tani (Detail)](./pages/report/kelompok-tani-detail.md) | `report-kelompok-tani-detail` | RPT-04 (#154) | Roster per Lembaga: KT→Petani collapsible + Excel & PDF |
| ✅ [Lahan](./pages/report/lahan.md) | `report-land-parcel` | RPT-05 (#177/#179/#180) | Roster datar 1 baris = 1 lahan per Lembaga + PDF landscape ber-peta poligon & grid index + Excel multi-sheet ber-gambar |

### 🔧 Tools — `/admin/tools` (🟠 TOOLS-01)

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Dashboard Snapshot](./pages/tools/dashboard-snapshot/README.md) | `dashboard-snapshot` | DASH-01 | Generate/list/detail snapshot + Excel export + soft delete |
| ✅ [Dashboard Snapshot BMP](./pages/tools/dashboard-snapshot-bmp/README.md) | `dashboard-snapshot-bmp` | DASH-04 (#166) | Generate Semua Data + list + detail per-Lembaga + Excel export + soft delete |
| 🟠 CLI lokal (**bukan menu app**) | — | — | S3 get-link & PDF manager (`scripts/`, npm `s3:get-link` `pdf:*`); export CSV di `scripts/local/` (gitignored) |
| 🔲 GIS Utilities | — | — | Planned |

### 🗺️ Map — `/admin/map`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Peta Lahan](./pages/map/peta-lahan.md) | `map-parcel` | MAP-01 (#113/#134/#135) | Peta full-bleed + panel filter & legenda minimizable; overlay raster referensi pemerintah (2 layer: Kawasan Hutan Kemenhut & Gambut Satu Peta BIG + legend/sumber per layer + slider transparansi, via proxy same-origin — #215), Titik Api NASA FIRMS (#240: 24 jam bergulir; #284: rentang 24 jam/5/10/30 hari, warna per keyakinan, ringkasan < 15 km + ekspor SHP/PDF), Tambah Data GIS Lain (WMS/Shapefile/GeoJSON, diparse di browser), ruler geodesik, label adaptif; popup lahan (Detail + Pelatihan + Produksi) + tombol **Profil Lahan** → PDF + aksi popup standar #188 (Lihat Detail / Edit Lahan); panel Daftar Lahan ber-search & zoom |
| ✅ [Peta BMP](./pages/map/peta-bmp.md) | `map-bmp` | MAP-02 (#144) · MAP-03 (#174) | Peta tematik poligon-only, 2 layer ber-radio: **Ketersediaan Data Produksi** (4 kategori dari run bulan berturut-turut) & **Produktivitas Ton/Ha** (per tahun / rata-rata, 5 kelas, dihitung client-side); Lembaga wajib; panel matriks per lahan × bulan; cetak PDF & Excel WYSIWYG ikut layer aktif; aksi popup standar #188 (Lihat Detail / Edit Lahan) |

> **Popup peta terstandar (#188/TD-028):** primitif bersama `src/components/shared/map-popup.tsx` + tombol **Lihat Detail** (gate VIEW `master-data-parcels`) & **Edit Lahan** (gate EDIT) di 3 peta — Peta Lahan, Peta BMP, dan peta Sebaran Lahan (`ParcelsDistributionMap` di detail Lembaga/Petani) — dengan modal edit lahan langsung dari peta (`ParcelEditModalHost`).

### ❓ Bantuan — `/admin/help`

| Halaman | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Indeks · Bab · Topik](./pages/bantuan/README.md) | `help` | HELP-01/02 (#182–#185) | Panduan in-app 3 lapis (tutorial/konsep/referensi), konten Markdown di `src/content/help/**.md`, sidebar tree + pencarian client-side, dua tingkat kedalaman (baris `+` = Detail), aset S3 privat via presigned URL |

---

## 4. Perilaku Sidebar

- **Pencarian menu** di header sidebar — fokus `Ctrl/⌘+K`, hapus `Esc`/✕, memfilter pohon menu live. Hanya menampilkan menu yang di-grant untuk user tersebut.
- **Tombol "Tutup semua"** (collapse-all) untuk seluruh cabang.
- **Menu induk sebagai container** — induk tetap tampil bila salah satu anaknya ter-grant meski induk sendiri tidak di-grant. Lihat [../standards/rbac.md § RBAC Permission Inheritance](../standards/rbac.md).
- **Hierarki maksimal 3 level**, divalidasi di Menu Management (PLATFORM-07).

---

## 5. Ringkasan Teknis (cerminan)

Diverifikasi **2026-07-28** terhadap kode di branch `mvp` (app `v0.16.0`).

| Aspek | Angka | Catatan |
|---|---|---|
| Test | **45 file / 702 test passing** ✅ | `npx vitest run`; rincian coverage di [roadmap.md § OPS-01](../project/roadmap.md) |
| Server Actions | **26 file** | `src/server/actions/` — satu file per domain, seluruh akses data lewat sini |
| Prisma | **11 file schema / 20 model / 19 migrasi** | `prisma/schema/` modular; semua model ber-audit field + `isActive` |
| Menu | **9 top-level / 28 sub menu** | `prisma/seeds/data/menu.csv` |
| Materi Bantuan | **34 file Markdown** | `src/content/help/**` |
| Fase selesai | lihat [roadmap.md § Phase Status](../project/roadmap.md) | cerminan naratif di [module-status.md](./module-status.md) |

Prioritas berikutnya & backlog: [../project/sprint.md](../project/sprint.md) dan [../project/roadmap.md](../project/roadmap.md).
