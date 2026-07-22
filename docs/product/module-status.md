# Produk — Status Modul (cerminan)

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [architecture.md](./architecture.md) · [access-context.md](./access-context.md) · [crud-flows.md](./crud-flows.md) · [role-flows.md](./role-flows.md)

> ⚠️ **Cerminan, bukan sumber kebenaran.** Status delivery kanonis ada di [../project/roadmap.md](../project/roadmap.md) (Phase Status) & [../project/sprint.md](../project/sprint.md). Perbarui di sana lebih dulu.

<details>
<summary><strong>Implementation Status (Current)</strong></summary>

## Completed Modules (✅ 34 Phases)

> Jumlah fase & test di bawah adalah cerminan; **source of truth** ada di tabel **Phase Status** pada [`progress.md`](../project/roadmap.md). Perbarui angka di sana lebih dulu.
 
| Phase | Module | Key Features |
|-------|--------|--------------|
| PLATFORM-01 | Init & UI | Next.js, Shadcn, Tailwind setup |
| PLATFORM-02 | Schema & Migrations | Modular Prisma schema (kini 19 model / 16 migrasi) |
| PLATFORM-03 | Schema Hardening | Audit fields, soft-delete pattern |
| PLATFORM-04 | Auth & RBAC | NextAuth, RBAC helpers, data access, overrides |
| PLATFORM-05 | Menu Management | Dynamic sidebar, CRUD, recursive parent-child |
| PLATFORM-06 | DataTable & Export | Column visibility, Excel export (exceljs) |
| PLATFORM-07 | 3-Level Menu | Sidebar, RBAC inheritance, validation depth max 3 |
| MD-01 | Regions | 4-level hierarchy, tree UI, CRUD |
| MD-02 | Farmer Groups | List, CRUD, RBAC filtering, agregat petani/persil/luas; identitas & sertifikasi: Tipe Grup, Tahun Berdiri/Bergabung, RSPO (#160), ISPO + Assurance SAP/MAP (#169); **detail = profil 360° ber-Tabs** (5 cards incl. skor DA-02, struktur #154, peta sebaran lahan, pelatihan pre→post, produksi Ton/Ha + 4 kategori) (#171) |
| MD-03 | Farmers | Full CRUD, RBAC, joinedYear; **detail = profil 360° ber-Tabs** (5 cards incl. Kelengkapan Profil & Produktivitas, lahan + peta shared + PDF Profil Lahan #134, checklist paket, produksi per tahun/bulanan) (#172) |
| MD-04 | Land Parcels | Geolocation, polygon geometry, area tracking, revision history, ZIP Shapefile bulk upload (#88) + mapping KT/Blok (#150) |
| MD-05 | Training | 3 model, activities, participants (pre/post-test), evidence upload S3 |
| MD-06 | Production | ProductionRecord, period + harvest number, duplicate validation (#89) |
| DASH-01 | Main Dashboard | Snapshot-backed, 14 summary cards (+Total Kelompok Tani #148, +3 card sertifikasi RSPO/ISPO/SAP-MAP #169), filter client-side (#99); peta:info panel 60:40, badge sertifikasi + konten 2 kolom di info panel |
| DASH-02 | Dashboard Server Actions | `dashboard.ts` + `snapshot.ts` + aggregation lib (teruji) |
| DASH-03 | Interactive Map | MapLibre cluster KT + info panel (dashboard-map) |
| DASH-04 | BMP Dashboard (Produksi) | Snapshot-backed `/admin/dashboard/bmp`: 4 card produksi + combo chart produksi/% lahan melapor + panel Ketersediaan Data 4 kategori (reuse MAP-02) + filter global Kategori/Distrik/Lembaga/Tahun/Kelengkapan Data; tools generate `/admin/tools/snapshot-bmp` (#166) |
| DASH-06 | Dashboard Pelatihan | **Live query (bukan snapshot)** `/admin/dashboard/training`: 5 KPI card (cakupan petani terlatih, kegiatan, kehadiran vs unik, partisipasi perempuan, kenaikan skor) + matriks cakupan Lembaga × Paket (heatmap sortable, collapsible) + tren stacked-bar per paket + panel efektivitas pre/post + panel kualitas data ber-deep-link; **drill-down sel → daftar petani belum dilatih (salin/Excel)**; target 100% per paket; filter Kategori/Distrik/Lembaga/Tahun client-side |
| MAP-01 | Map: Peta Lahan | Peta full-bleed + overlay SIGAP + custom GIS + hotspot FIRMS + ruler + label (#113); produksi popup real + PDF "Profil Lahan" matriks (#134); panel daftar lahan search+zoom (#135); legenda collapsible |
| MAP-02 | Map: Peta BMP (Layer 1) | Peta tematik **Ketersediaan Data Produksi** per-lahan, 4 kategori dari run bulan berturut-turut produksi (#144); KT wajib (Prov/Distrik opsional); `getBmpMapData` (groupBy scoped, no N+1) + data-driven color MapLibre. **Poligon saja tanpa titik** (NONE outline-only, lainnya fill). **Cetak** → PDF A4 landscape (hal.1 peta+legend, hal.2+ matriks per lahan × bulan = total kg/latar hijau) + **Download Excel** matriks. **Panel kanan floating minimizable**: matriks ketersediaan per lahan × bulan (true/false) + Zoom to. Seed `map-bmp` menu+VIEW ✅ |
| MAP-03 | Map: Peta BMP Layer 2 (Produktivitas) | Layer tematik kedua di halaman yang sama (#174): **Produktivitas (Ton/Ha) per persil** = Σ produksi tahun ÷ luas persil; panel kiri **2 section layer ber-radio** ("Ketersediaan Data Produksi" / "Produktivitas (Ton/Ha)", satu aktif); selektor **Tahun (default terbaru) + Rata-rata**; 5 kelas warna (≥20 / 15–20 / 10–15 / <10 / tanpa data outline-only, ambang `PRODUCTIVITY_*_MIN`). Hitung **realtime client-side** (pure helper `map-data.ts` atas payload `getBmpMapData` existing — zero query/migration baru). **Cetak & Excel WYSIWYG ikut layer aktif**: layer Produktivitas → PDF legend produktivitas + tabel Ton/Ha per lahan × tahun (sel berwarna kelas) + Excel Produktivitas |
| RPT-01 | Report Petani | Filter cascade wajib + Excel & PDF (#107) |
| RPT-02 | Report Pelatihan | 2 tab + Excel 2-sheet + PDF (#108) |
| RPT-03 | Report Produksi | Matriks bulanan per petani/lahan + Excel + PDF landscape (#132) |
| RPT-04 | Report Kelompok Tani | **2 submenu.** **(Summary)** agregat real-time Lembaga×KT turunan dari lahan (distinct petani/lahan/**luas**); filter Distrik/Lembaga opsional + search + **column selector** + 6 card + Excel & PDF. **(Detail)** roster per 1 Lembaga: hierarki KT→daftar Petani (jml lahan/luas), **section collapsible** (default tutup) + 5 card + Excel & PDF flat (#154) |
| RPT-05 | Report Lahan | Roster datar real-time 1 baris = 1 lahan aktif per **Lembaga (wajib)**: Lembaga | Nama Petani | ID Petani | ID Lahan | KT + Tahun Tanam + Luas (kolom ekstra Blok/Komoditas/Species/PSR via column selector); **PDF landscape ber-peta poligon vektor** dengan label per ceklis (No/Nama/ID Petani/ID Lahan/KT) **adaptif** (vertikal 90°/auto-scale sesuai bbox poligon) + **grid index fleksibel Baris × Kolom** (ikhtisar A1… + halaman per sel) + **preview SVG on-page** (helper layout sama dengan PDF) + **Excel multi-sheet ber-gambar peta** (sheet Lahan + index; sheet per sel + peta sel); polish #180: anti-tumpang label, skala batang + panah utara, mini-index posisi sel |
| DASH-05 | Card Total Kelompok Tani | Kartu Main Dashboard = distinct `subGroupLv2` per Lembaga (snapshot-backed); filter generate dinonaktifkan (Semua Data); 0 sampai data #150 (#148) |
| BULK-01 | Bulk Upload Menu | Route setup, redirect ke /farmers (#68) |
| BULK-03 | Bulk Upload Farmer | Excel mapping, validation, preview, download errors (#76) |
| BULK-04 | Bulk Upload Production | Excel mapping + period/harvest validation |
| HELP-01 | Bantuan | Panduan in-app: **indeks → bab → topik** (satu topik = satu halaman, `/admin/help/[chapter]/[topic]`), sidebar tree + **pencarian** client-side, tombol topik sebelumnya/berikutnya. **Konten Markdown** di `src/content/help/**.md` (editable tanpa menyentuh kode; frontmatter title/icon/intro), parser subset tanpa dependency + dukungan **gambar, video, sematan YouTube/Vimeo, dan aset S3 privat (`s3://key` → presigned per-request, #185)**; menu top-level, 5 role VIEW. 6 bab / 11 topik: istilah domain, akun, hak akses, Master Data, Bulk Upload, Dashboard, Peta, Data Analyst, Report, Tools, FAQ (#182 #183 #184) |
| HELP-02 | Bantuan: Tutorial per Tugas | Tiga lapis (tutorial/konsep/referensi); 17 tutorial + 4 referensi dengan **dua tingkat kedalaman dari satu sumber** (baris `+`); toggle Ringkas/Detail & lipat daftar isi tanpa JS; personalisasi per izin; bantuan kontekstual `HelpHint` di 7 halaman |
| DA-01 | Ringkasan Petani | 2 tab + kartu agregat + Excel (#103) |
| DA-02 | Analisa Ketersediaan Data | Health score + 5 domain anomali + cakupan per paket (#118, #122) |
 
**Total Tests**: **43 files / 663 tests passing** ✅ (angka kanonis di [`progress.md`](../project/roadmap.md))

## In Progress (🟠 3 Phases)

| Phase | Module | Status | Missing |
|-------|--------|--------|---------|
| TOOLS-01 | Tools | Partial | GIS utilities, app-integrated S3 manager (CLI sudah ada) |
| OPS-01 | Testing | Partial | RPT-03 (#132), RPT-04 (#154, +14 unit) & DASH-05 (#148, +2 unit) ✅ tercakup; gap tersisa: integration test route hotspot |
| OPS-02 | DevOps | Partial | Verifikasi deployment/rollback; status Dockerfile vs CI |

## Planned - Now (🔲 Priority)
 
| Phase | Module | Next Steps | Blocker |
|-------|--------|------------|---------|
| — | **Remediasi Audit (#125–#130)** | ✅ Seluruhnya selesai 2026-07-12 (guard/scope RBAC, lint 0, scope by-id + restore, konvensi UI, cleanup, kualitas berkelanjutan) — `audit-report/audit-2026-07-10.md` | — |

## Planned - Next

- BULK-02 (Region Bulk Upload #70), #69 (Bulk Upload KT)
- Analisa Data Produksi — ketersediaan data per periode Distrik → KT (#143, belum ada phase di roadmap)

## Planned - Later (🔲)

- MD-07/08/09/10/11 (Staff, HCV, BUSDEV, IMPACT, Workplan), CMS-01, COMM-01/02

## Blocked (🔴)

- Tidak ada

</details>

---

<details>
<summary><strong>Testing & Quality Status</strong></summary>

## Test Coverage Summary

**Test Status**: ✅ **43 files / 663 tests passing** (angka kanonis di [`progress.md`](../project/roadmap.md))

### Covered Modules

| Module | Test File | Tests | Status |
|--------|-----------|-------|--------|
| Region | region.test.ts | 42 | ✅ |
| Data Completeness (DA-02) | data-completeness.test.ts | 31 | ✅ |
| User | user-action.test.ts, user-data-access.test.ts, user-menu-access.test.ts | 39 | ✅ |
| Training | training-activity.test.ts, training-participant.test.ts | 23 | ✅ |
| Land Parcel | land-parcel.test.ts | 16 | ✅ |
| Production | production.test.ts | 15 | ✅ |
| Farmer | farmer.test.ts | 14 | ✅ |
| Bulk Upload | bulk-upload.test.ts | 14 | ✅ |
| Map Geo (ruler/label) | map-geo.test.ts | 13 | ✅ |
| Dashboard | dashboard.test.ts | 14 | ✅ |
| Report Kelompok Tani (#154) | report-kelompok-tani.test.ts, report-kelompok-tani-detail.test.ts | 14 | ✅ |
| Bantuan / Markdown-lite (#184 #185) | help-content.test.ts, help-media.test.ts | 16 | ✅ |
| Report Lahan (#177 #179 #180) | report-land-parcel.test.ts, report-land-parcel-pdf.test.ts, report-land-parcel-xlsx.test.ts (+1 perf) | 34 | ✅ |
| Exporter PDF build-vs-save (TD-019 #180) | pdf-exporters.test.ts | 5 | ✅ |
| Parcel Bulk Mapping (#150) | parcel-bulk-mapping.test.ts | 7 | ✅ |
| Farmer Group (#163/#169/#171) | farmer-group.test.ts, farmer-group-detail.test.ts | 17 | ✅ |
| Farmer Detail + mask (#172) | farmer-detail.test.ts | 7 | ✅ |
| Farmer Sub-Groups (#152) | farmer-sub-groups.test.ts | 6 | ✅ |
| Dashboard BMP (#166) | dashboard-bmp.test.ts | 22 | ✅ |
| Dashboard Pelatihan (DASH-06) | dashboard-training.test.ts | 33 | ✅ |
| Invarian cakupan 3 dashboard + hulu | dashboard-asymmetry.test.ts | 18 | ✅ |
| Bantuan: parser, materi, hak akses & lookup (HELP-02) | help-content.test.ts | 87 | ✅ |
| RBAC | rbac.test.ts, rbac-permission.test.ts | 12 | ✅ |
| Map (MAP-01/02) | map.test.ts | 34 | ✅ |
| Menu | menu-action.test.ts, menu-filter.test.ts | 20 | ✅ |
| Hotspot FIRMS | firms.test.ts | 9 | ✅ |
| Performance | perf.test.ts | 13 | ✅ |
| Report | report.test.ts | 5 | ✅ |
| Middleware | middleware.test.ts | 5 | ✅ |
| Auth | auth.test.ts | 5 | ✅ |
| Data Analyst (DA-01) | data-analyst.test.ts | 4 | ✅ |

### Need Coverage

- 🔲 Server-action level tests untuk snapshot RBAC (kini hanya fungsi murni)
- 🔲 Integration test route `api/map-hotspot` (follow-up MAP-01)

## Code Compliance (rule.md)

**Status per audit 2026-07-10, ditutup lewat #125–#130 (2026-07-12):** ✅ **14 PASS · 0 PARTIAL · 0 FAIL** (dari 14 kategori) — kanonis di [`roadmap.md`](../project/roadmap.md) §Code Compliance Audit; detail + bukti `file:line` di `audit-report/audit-2026-07-10.md`

- ✅ PASS (semua): kebab-case naming (+suffix `.types.ts` beres #130), variable English (istilah domain diresmikan #130), Server Component default, Zod di `src/validations/`, actions di `src/server/actions/`, pola `AccessContext`, backend `hasPermission` guard/scope (#125+#127), soft delete `isActive` + pola restore (#127), filter `isActive` reads, loading.tsx & Table Actions (#128), Shadcn+Tailwind, **QA gate lint exit 0 (#126)**, no-barrel-imports (barrel `@/components/shared` diresmikan sebagai pengecualian)

</details>

---

## Priority Actions (Next 2 Weeks)
 
| Priority | Action | Owner | Deadline | Impact |
|----------|--------|-------|----------|--------|
| **P0** | **Remediasi audit — guard/scope RBAC** (`role-permission.ts`, `menu.ts`, `upload.ts`, `getFarmerById`, `bulkCreateFarmers`, menuKey Roles) | Engineering | ASAP | Menutup celah pemanggilan server action langsung (UI-bypass) |
| ✅ P1 | **Lint hijau kembali (#126)** — ✅ Done 2026-07-12 | Engineering | — | `npm run lint` **exit 0**; gate ditegakkan lokal via Pre-Commit Gate (`workflow.md`) |
| ✅ P2 | **Cleanup dead code & deps (#129)** — ✅ Done 2026-07-12 | Engineering | — | 9 deps 0-usage + 7 file mati terhapus, helper "for select" dikonsolidasi. Win = install/supply-chain (−59 paket transitif), **bukan** bundle client (deps mati tak pernah di-import) |

---

## Key Decisions Needed

| Decision | Owner | Deadline | Context |
|----------|-------|----------|---------|
| ✅ Pola restore soft-delete (#127) | — (RESOLVED 2026-07-12) | ✅ | Terpilih: tampilkan nonaktif + badge + filter Status (default Aktif) + toggle Aktifkan, **khusus SUPERADMIN**; diseragamkan ke semua list master data (lihat TD-007) |
| ✅ Nasib `recharts` & `Dockerfile` (#129) | — (RESOLVED 2026-07-12) | ✅ | `recharts` **dihapus** (dipasang lagi saat chart produksi); `Dockerfile` **dipertahankan** (deploy via SSH `npm run build`, bukan Docker — hardening via `.dockerignore`) |
