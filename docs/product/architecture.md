# Produk — Arsitektur & Navigasi

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [access-context.md](./access-context.md) · [crud-flows.md](./crud-flows.md) · [role-flows.md](./role-flows.md) · [module-status.md](./module-status.md)

## Quick Reference

| Category | Status | Details |
|----------|--------|---------|
| **Test Status** | ✅ **27 files / 380 tests passing** | Coverage: auth, RBAC, menu, menu-filter, user, region, farmer, land parcel, training, production, bulk upload, report, dashboard, data-analyst, data-completeness, map (MAP-01/02), map-geo, firms, middleware, perf |
| **Completed Modules** | ✅ **24 phases done** | Platform (1-7), MD (1-6), DASH-01/02/03, RPT-01/02, BULK (1, 3, 4), DA-01/02, MAP-01 |
| **Server Actions** | ✅ 22 file (3.894 LOC) | dashboard, snapshot, report, map, user, user-data-access, user-menu-access, menu, region, role-permission, farmer-group, farmer, land-parcel, bulk-upload, bulk-upload-parcel, bulk-upload-production, training, production, upload, profile, data-analyst, data-completeness |
| **Prisma Models** | ✅ 11 file schema / **19 model** | User, Menu, RBAC (5 model), Geography (4), FarmerGroup, Farmer, LandParcel, Training (3), ProductionRecord, MainDashboardSnapshot — MAP-01 read-only (no new table) |
| **Priority Next** | 🎯 **AUDIT-P1 #127/#128** | AUDIT-P0 guard/scope RBAC (#125) ✅ & lint gate (#126) ✅ selesai 2026-07-12; sisa: scope by-id KT/pelatihan & pola restore (#127), konvensi UI (#128) — RPT-03 (#132) ✅ |

---

<details open>
<summary><strong>Status Legend & Overview</strong></summary>

## Status Legend

| Symbol | Status | Keterangan |
|--------|--------|-----------|
| ✅ | Done | Implementasi selesai dan terverifikasi |
| 🟠 | Partial | Sebagian implementasi ada |
| 🔲 | Planned | Masuk roadmap tetapi belum dimulai |
| 🔴 | Blocked | Terhambat dependency atau keputusan |

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Public Routes                             │
│  ✅ Home  │  🔲 Community  │  🔲 Knowledge  │  ✅ Login      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Authentication   │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    ┌───▼───┐          ┌──────▼──────┐      ┌──────▼──────┐
    │ SUPER │          │   ADMIN     │      │  OPERATOR   │
    │ ADMIN │          │  (District) │      │  (KT-level) │
    └───┬───┘          └──────┬──────┘      └──────┬──────┘
        │                     │                     │
        ├─ Dashboard (All)    ├─ Dashboard (Filt)  ├─ Dashboard (View)
        ├─ Master Data (All)  ├─ Master Data (Filt)├─ Master Data (CRUD)
        ├─ Settings (Full)    ├─ Settings (Limited)│
        ├─ Report (All)       ├─ Report (Filtered) ├─ Report (View)
        ├─ Bulk Upload (All)  ├─ Bulk Upload (Scope)
        └─ Tools (All)        │                     │
                              │              ┌──────▼──────┐
                              │              │ MANAGEMENT  │
                              │              │ (Read-only) │
                              │              └──────┬──────┘
                              │                     │
                              │              ├─ Dashboard (View All)
                              │              └─ Report (View All)
                              │
```

</details>

---

<details>
<summary><strong>Navigation Structure & Menu Hierarchy</strong></summary>

## Admin Sidebar Menu (Compact View)

> **Perilaku sidebar:** header punya **filter pencarian menu** (input, fokus via Ctrl/⌘K, hapus via Esc/✕) yang memfilter pohon menu secara live + tombol **Tutup semua** (collapse-all). Menu induk otomatis tampil sebagai **container** bila salah satu anaknya ter-grant meski induk tak di-grant (lihat `../standards/rbac.md` §RBAC Permission Inheritance). Pencarian hanya menampilkan menu sesuai hak akses user.

```
📊 Dashboard (✅ DASH-01)
   ├── ✅ Main Dashboard — Snapshot-backed: 10 summary cards (5/baris, incl. Petani L/P) + filter Distrik/KT/Tahun + peta MapLibre (cluster, label nama KT pada titik non-cluster, dark/light/hybrid, search KT, Lihat Semua) + info panel per-KT
   └── 🔲 Dashboard BMP (DASH-04) — Best Management Practice metrics

📁 Master Data
   ├── ✅ Lembaga Petani (MD-02) — List/detail/CRUD
   ├── ✅ Petani (MD-03) — List/detail/CRUD + joinedYear
   ├── ✅ Lahan / Parcels (MD-04) — Map + polygon + geolocation + Shapefile bulk upload
   ├── ✅ Pelatihan / Training (MD-05) — Activities + participants + evidence
   ├── ✅ Produksi / Production (MD-06) — Period + yield tracking
   ├── 🔲 Staff (MD-07)
   ├── 🔲 HCV (MD-08)
   ├── 🔲 BUSDEV (MD-09)
   ├── 🔲 IMPACT (MD-10)
   └── 🔲 Workplan (MD-11)

📉 Data Analyst (✅ DA-01, DA-02)
   ├── ✅ Ringkasan Petani (DA-01) — Filter distrik/KT + 2 tab (Detail Petani, Petani Tanpa Lahan) + kartu agregat + Excel export
   └── ✅ Analisa Ketersediaan Data (DA-02) — Pilih distrik → KT → Analisa: Index Ketersediaan Data + 5 section collapsible (Profil KT, Petani, Lahan, Pelatihan, Produksi) deteksi anomali & data belum lengkap (NIK kosong/invalid, petani tanpa lahan, belum pelatihan, tanpa produksi, dll) + Excel multi-sheet

📈 Report (🟠 Partial)
   ├── ✅ Laporan Petani (RPT-01) — Cascade filter (mandatory) + Excel & PDF export
   ├── ✅ Laporan Pelatihan (RPT-02) — Activities, unique participants & coverage
   └── ✅ Laporan Produksi (RPT-03) — Matriks bulanan per petani/lahan + Excel & PDF export (#132)

📤 Bulk Upload
   ├── ✅ Bulk Upload Petani (BULK-03) — Excel mapping + validation + preview
   ├── ✅ Bulk Upload Produksi (BULK-04) — Excel mapping + period/harvest validation + preview
   ├── ✅ Bulk Upload Lahan (MD-04) — ZIP Shapefile upload + column mapping + geometry validation
   ├── 🔲 Bulk Upload Lembaga Petani (#69) — CSV + validation (belum ada menu/route)
   └── 🔲 Bulk Upload Region (BULK-02, #70) — Hierarchy validation (belum ada menu/route)

⚙️ Settings
   ├── ✅ User Management (PLATFORM-04) — CRUD + data access + menu override
   ├── ✅ Role & Permission (PLATFORM-04) — Matrix C/V/E/D
   ├── ✅ Menu Management (PLATFORM-05/07) — Dynamic sidebar (3-level support)
   └── ✅ Region Settings (MD-01) — Tree hierarchy

🔧 Tools (🟠 TOOLS-01)
   ├── ✅ Dashboard Snapshot (DASH-01) — Generate/list/detail snapshot + Excel export + soft delete (satu-satunya sub-menu Tools di app)
   ├── 🟠 CLI lokal (bukan menu app): S3 get-link & PDF manager (`scripts/`, npm `s3:get-link` `pdf:*`); export CSV di `scripts/local/` (gitignored)
   └── 🔲 GIS Utilities — Planned

🗺️ Map (✅ MAP-01 · MAP-02)
   ├── ✅ Peta Lahan — Peta full-bleed MapLibre + panel filter floating collapsible (Provinsi→Distrik→KT + Muat Data, auto-collapse) + legend layer toggle (Point KT / Point centroid lahan / Area polygon lahan + count) + section **Peta Lainnya** (paling bawah panel) = overlay raster referensi SIGAP KLHK/Kemenhut (Kawasan Hutan, Pelepasan Kawasan Hutan, Fungsi Ekosistem Gambut, PIPPIB/Moratorium, Penutupan Lahan 2022) dengan toggle per-layer + slider transparansi, di-render di bawah layer data petani; tile di-proxy same-origin via `/api/map-overlay/[key]` (atasi CORS + TLS chain upstream) + section **Tambah Data GIS Lain** = user tambah layer sendiri via 3 mode (WMS URL / ZIP Shapefile / GeoJSON), Shapefile & GeoJSON diparse di browser (`shpjs`), toggle + hapus + auto-fit ke bounds layer baru; WMS user di-fetch langsung (butuh CORS). Klik feature → info popup: KT (identitas) · Lahan = accordion (Detail Lahan + Pelatihan Petani lazy-load + **Produksi data asli per-lahan** dengan **selektor Rata-rata/tahun**, grafik sumbu-Y kanan + tooltip hover) + tombol **"Profil Lahan"** → Farm Passport PDF (identitas, layout lahan/polygon, pelatihan, **produksi matriks tahun×bulan×Total**; header/file di-rebrand "Profil Lahan"). Produksi popup & PDF berbagi satu fetch (dedup). **Panel kanan Daftar Lahan** (toggle) = daftar lahan hasil Muat Data dengan **text search** (nama/ID petani/ID lahan) + tabel beraksi **zoom ke lahan** (kolom paling kiri). Legenda **collapsible**. Read-only atas FarmerGroup + LandParcel + section **Titik Api (Hotspot)** = layer NASA FIRMS VIIRS 375 m (toggle 24 jam / 5 hari, warna by kebaruan <24 jam merah / 1–5 hari oranye, popup detail + disclaimer "deteksi anomali panas", area **Riau**, tile via proxy same-origin `/api/map-hotspot` auth-guarded) + **tool Ruler** (kanan atas) = ukur jarak & luas **geodesik** (klik menaruh titik, label per-segmen, undo/hapus/Esc) + **label nama** (nama KT pada titik + nama petani pada poligon, **hanya bila teks muat di poligon** pada zoom aktif, wrap otomatis). Kontrol **basemap switcher + "Zoom ke semua data"** di kanan-bawah; panel filter/legend kiri **minimizable** ke ikon.
   └── ✅ Peta BMP (MAP-02, #144) — peta tematik **Ketersediaan Data Produksi** per-lahan: tiap poligon lahan diwarnai **4 kategori** (Baik >24 bln berturut / Cukup 12–24 / Kurang 1–11 / Tidak ada 0) dari **run bulan berturut-turut terpanjang** `ProductionRecord.period`. Filter **Lembaga Petani wajib** (Provinsi/Distrik opsional). **Poligon-only** (NONE = outline saja, lainnya fill) + **label nama petani** + **popup accordion** (Detail Lahan + grafik **Produksi Bulanan** Rata-rata/per-tahun). **Panel kiri & kanan minimizable** ke ikon; kontrol basemap+"Zoom ke semua data" kanan-bawah. **Panel kanan** = matriks ketersediaan per lahan × bulan (blok true/false) + Zoom-to. **Ekspor:** "Cetak Peta dan Matriks Ketersediaan Data" (PDF landscape: hal.1 peta+legend, hal.2+ matriks sel=total kg/latar hijau) & **Download Excel** (+ kolom Status Ketersediaan Data & Luas Lahan Ha). Server `getBmpMapData` (RBAC 3 layer `map-bmp` VIEW + scope KT + `isActive`; groupBy `_sum` scoped, no N+1). Read-only, **tanpa tabel/migration baru**.

👤 Profile
   └── ✅ Change Password
```

</details>
