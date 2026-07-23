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
| Proxy tile | `/api/map-overlay/[key]` (SIGAP KLHK) · `/api/map-hotspot` (NASA FIRMS) | auth-guarded, same-origin |

Semua akses data lewat **Server Actions** (`src/server/actions/`) dengan 3 lapis pengaman: permission menu → access context → soft delete. Tidak ada REST API selain NextAuth & proxy tile.

### Role & cakupan

Enum `Role` (`prisma/schema/_config.prisma`) — 5 role. Kolom "Scope data" ditentukan `getAccessContext()`, bukan role itu sendiri (lihat [access-context.md](./access-context.md)).

| Role | Scope data | Menu yang diakses |
|---|---|---|
| **SUPERADMIN** | `ALL` (bypass semua guard) | Semua menu, semua aksi |
| **ADMIN** | `BY_DISTRICT` (dari `UserProvince`/`UserDistrict`) | Dashboard, Master Data, Report, Bulk Upload, Tools, Map, Settings (terbatas) |
| **OPERATOR** | `BY_FARMER_GROUP` (dari `UserFarmerGroup`) | Dashboard (VIEW), Master Data (CRUD dalam scope), Report (VIEW), Map |
| **MANAGEMENT** | `ALL` (read-only) | Dashboard, Report, Map, Tools (snapshot view-only) |
| **DONOR** (#187) | `ALL` atau ter-scope bila di-assign | Dashboard, Report, Map, Bantuan — **VIEW-only** |

> Tanpa assignment apa pun → mode `ALL`. Prioritas: SUPERADMIN → district (jika ada `UserProvince`/`UserDistrict`) → farmer group.

---

## 2. Struktur Menu Sidebar

9 menu top-level / 27 sub menu (`menu.csv`), urut sesuai kolom `order`:

```text
📊 Dashboard          (3 sub)   📈 Report        (6 sub)
📁 Master Data        (5 sub)   🔧 Tools         (2 sub)
⚙️  Settings           (4 sub)   🗺️  Map           (2 sub)
📤 Bulk Upload        (3 sub)   ❓ Bantuan       (halaman bab/topik, tanpa sub menu)
📉 Data Analyst       (2 sub)
```

Halaman non-menu: `/admin/profile` (Ubah Kata Sandi) · `/login` · route publik. Lihat [pages/halaman-non-menu/](./pages/halaman-non-menu/README.md).

---

## 3. Rincian Sub Menu

Kolom **Ringkasan** sengaja satu baris; detail lengkap ada di dokumen halaman yang ditautkan.

### 📊 Dashboard — `/admin/dashboard`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Main Dashboard](./pages/dashboard/main-dashboard.md) | `dashboard-main` | DASH-01 | Snapshot-backed: 14 summary card (incl. Petani L/P, Total Kelompok Tani #148, 3 card sertifikasi RSPO/ISPO/SAP-MAP #169) + filter Distrik/KT/Tahun + peta MapLibre 60:40 ber-info panel |
| ✅ [BMP Dashboard (Produksi)](./pages/dashboard/bmp-dashboard-produksi.md) | `dashboard-bmp` | DASH-04 (#166) | Snapshot-backed: 4 card produksi + combo chart produksi/% lahan melapor + panel Ketersediaan Data 4 kategori + filter client-side |
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
| ✅ [Menu Management](./pages/settings/menu-management.md) | `settings-menu` | PLATFORM-05/07 | Sidebar dinamis, hierarki maks. 3 level |
| ✅ [Role & Permission](./pages/settings/role-permission.md) | `settings-roles` | PLATFORM-04 | Matriks CREATE/VIEW/EDIT/DELETE per role × menu |
| ✅ [Regions](./pages/settings/regions.md) | `settings-regions` | MD-01 | Hierarki wilayah 4 level (Provinsi→Distrik→Kecamatan→Desa) |

### 📤 Bulk Upload — `/admin/bulk-upload`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Upload Petani](./pages/bulk-upload/upload-petani.md) | `bulk-upload-farmers` | BULK-03 (#76) | Excel + mapping kolom dinamis + validasi + preview + unduh error |
| ✅ [Upload Produksi](./pages/bulk-upload/upload-produksi.md) | `bulk-upload-production` | BULK-04 | Excel + validasi periode/panen + preview |
| ✅ [Lahan](./pages/bulk-upload/lahan.md) | `bulk-upload-parcels` | MD-04 (#88) | ZIP Shapefile + mapping (incl. Kelompok Tani & Blok #150) + validasi geometri |

Belum dimulai: 🔲 Lembaga Petani (#69) · 🔲 Region (BULK-02, #70) — belum ada menu/route.

### 📉 Data Analyst — `/admin/data-analyst`

| Sub menu | Key | Fase | Ringkasan |
|---|---|---|---|
| ✅ [Ringkasan Petani](./pages/data-analyst/ringkasan-petani.md) | `data-analyst-farmer-summary` | DA-01 (#103) | Filter distrik/KT + 2 tab (Detail Petani, Petani Tanpa Lahan) + kartu agregat + Excel |
| ✅ [Analisa Ketersediaan Data](./pages/data-analyst/analisa-ketersediaan-data.md) | `data-analyst-data-completeness` | DA-02 (#118, #122) | Index Ketersediaan Data + 5 section anomali (Profil KT, Petani, Lahan, Pelatihan, Produksi) + Excel multi-sheet |

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
| ✅ [Peta Lahan](./pages/map/peta-lahan.md) | `map-parcel` | MAP-01 (#113/#134/#135) | Peta full-bleed + panel filter & legenda minimizable; overlay raster SIGAP KLHK (5 layer + slider transparansi, via proxy same-origin), Titik Api NASA FIRMS, Tambah Data GIS Lain (WMS/Shapefile/GeoJSON, diparse di browser), ruler geodesik, label adaptif; popup lahan (Detail + Pelatihan + Produksi) + tombol **Profil Lahan** → PDF; panel Daftar Lahan ber-search & zoom |
| ✅ [Peta BMP](./pages/map/peta-bmp.md) | `map-bmp` | MAP-02 (#144) · MAP-03 (#174) | Peta tematik poligon-only, 2 layer ber-radio: **Ketersediaan Data Produksi** (4 kategori dari run bulan berturut-turut) & **Produktivitas Ton/Ha** (per tahun / rata-rata, 5 kelas, dihitung client-side); Lembaga wajib; panel matriks per lahan × bulan; cetak PDF & Excel WYSIWYG ikut layer aktif |

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

Diverifikasi **2026-07-23** terhadap kode di branch `mvp` (app `v0.16.0`).

| Aspek | Angka | Catatan |
|---|---|---|
| Test | **44 file / 673 test passing** ✅ | `npx vitest run`; rincian coverage di [roadmap.md § OPS-01](../project/roadmap.md) |
| Server Actions | **25 file** | `src/server/actions/` — satu file per domain, seluruh akses data lewat sini |
| Prisma | **11 file schema / 20 model / 19 migrasi** | `prisma/schema/` modular; semua model ber-audit field + `isActive` |
| Menu | **9 top-level / 27 sub menu** | `prisma/seeds/data/menu.csv` |
| Materi Bantuan | **33 file Markdown** | `src/content/help/**` |
| Fase selesai | lihat [roadmap.md § Phase Status](../project/roadmap.md) | cerminan naratif di [module-status.md](./module-status.md) |

Prioritas berikutnya & backlog: [../project/sprint.md](../project/sprint.md) dan [../project/roadmap.md](../project/roadmap.md).
