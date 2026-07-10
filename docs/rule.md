# Smallholder HUB — Development Rules

> Panduan development Smallholder HUB MIS.
> Lihat juga: [general-rule.md](./general-rule.md) untuk prinsip behavioral umum.

---

## Informasi Proyek

| Key | Value |
|-----|-------|
| **Stack** | Next.js 16 · React 19 · Tailwind 4 · Shadcn UI · Prisma 7 · MapLibre |
| **Repository** | `WRI-Indonesia/mis-smallholder-hub` |
| **Branch Aktif** | `mvp` |

---

## Prinsip Development

### 1. Think Before Coding

- Nyatakan asumsi secara eksplisit. Jika ragu, tanya.
- Jika ada beberapa interpretasi, paparkan — jangan pilih diam-diam.
- Jika ada pendekatan lebih sederhana, sampaikan. Push back jika perlu.
- Jika sesuatu tidak jelas, berhenti. Sebutkan apa yang membingungkan.

### 2. Simplicity First

- **Minimal code** — Sesedikit mungkin untuk menyelesaikan kebutuhan. Jangan over-engineer.
- **Flat over nested** — Prefer early return, guard clause.
- **Obvious over clever** — Code harus bisa dibaca tanpa penjelasan tambahan.
- **Single responsibility** — Satu fungsi/komponen = satu tugas.
- **No premature abstraction** — Baru abstraksi jika ada 3+ kasus sama.
- **Delete over comment** — Hapus dead code, jangan comment out.
- **No speculative features** — Tidak ada fitur/error handling untuk skenario yang tidak diminta.

Tes: Jika 200 baris bisa jadi 50, tulis ulang.

### 3. Surgical Changes

- Sentuh **hanya** yang harus diubah sesuai permintaan.
- Jangan "improve" code, comment, atau formatting yang berdekatan.
- Jangan refactor yang belum rusak.
- Match style existing, walau berbeda preferensi.
- Jika temukan dead code lain, sebutkan — jangan hapus tanpa diminta.
- Hapus imports/variables yang menjadi unused **akibat perubahan kamu** saja.

Tes: Setiap baris yang berubah harus bisa di-trace langsung ke permintaan user.

### 4. Goal-Driven Execution

Ubah task menjadi goal yang bisa diverifikasi:

- "Add validation" → Tulis test invalid input, lalu buat passing
- "Fix bug" → Tulis test reproduksi, lalu fix
- "Refactor X" → Pastikan tests pass sebelum dan sesudah

Untuk multi-step task, buat plan singkat:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

---

## Branching & Workflow

### Branching

- Satu branch yang ditentukan project owner
- Tidak boleh buat feature/experiment/PR branch terpisah

### Issue Workflow

1. **Pick Issue** — Ambil GitHub Issue yang sudah di-approve
2. **Implement** — Kerjakan **hanya** scope issue
3. **QA Lokal** — `npm run build` dan `npm test`
4. **Performance Test** — Pastikan tidak ada regresi
5. **Report** — Changed files, hasil verifikasi, QA notes, risk
6. **Approval** — Tunggu approval sebelum push

---

## Safety & Approval

**Wajib minta approval project owner** sebelum:

| Category | Actions |
|----------|---------|
| Destructive | Hapus file, drop table, reset DB, force push |
| Database Mutations | CREATE/UPDATE/DELETE data (Prisma seed, migration, manual query) |

---

## Code Standards

| Rule | Detail |
|------|--------|
| File naming | `kebab-case` |
| Variable naming | Bahasa Inggris |
| Import | Langsung dari sub-module, bukan barrel index |
| Default | Server Component, `"use client"` hanya jika perlu |
| Data layer | CSV = static, Prisma = dynamic |
| Validation | Zod di `src/validations/` |
| Server Actions | Di `src/server/actions/` |
| Database Schema | Lihat [database-schema.md](./database-schema.md) untuk ERD, indexes, constraints, migrations, security |

### Data Access & Soft Delete

- **Soft delete** — Semua tabel punya `isActive Boolean @default(true)`. Tidak pernah hard delete dari app.
- **Data filtering** — Setiap query di server actions wajib filter berdasarkan context user:
  - `isActive: true` (exclude soft-deleted records)
  - Region sesuai assignment user (Province → District → KT)
  - Kelompok Tani sesuai assignment user
  - Role & Permission menentukan level akses (view/edit/delete)
- **Pattern** — Gunakan helper function untuk inject where clause RBAC, jangan copy-paste manual di setiap action.
- **Backend Permission Validation** — Setiap Server Action (terutama mutasi data) wajib divalidasi ulang di level server menggunakan helper `hasPermission(menuCode, permission)` sebelum melakukan query/mutasi database, untuk mencegah eksekusi request langsung yang tidak sah (bypass UI).

### Revision Tracking Pattern

Untuk data yang memerlukan tracking perubahan historical (contoh: Land Parcel update):
- **Field `revision`**: Tambahkan field `revision Int @default(1)` di model
- **Auto-increment on update**: Setiap update record, increment revision number
- **Soft delete old version**: Saat update dengan parcel ID sama, set old record `isActive = false` dan create new record dengan `revision += 1`
- **History tracking**: User bisa melihat historical changes melalui filter `isActive = false` dengan order by revision
- **Duplicate detection**: 
  - Check uniqueness constraint (misalnya: `parcelId` per `farmerId`)
  - Jika duplicate found dengan `isActive = true` → reject
  - Jika duplicate found dengan `isActive = false` → allow update (increment revision)
- **Bulk upload handling**: 
  - Detect duplicate parcel dalam file dan database
  - Auto-increment revision untuk update existing parcel
  - Preserve audit trail dengan `modified_by` dan `modified_at`
- **Implementasi Reference**: Lihat `LandParcel` model dan `bulk-upload-parcel.ts` (issue #88)

### RBAC Data Access Hierarchy

```
SUPERADMIN        → skip semua filter (akses ALL)
No assignment     → unrestricted (akses ALL)
UserFarmerGroup   → hanya KT spesifik (filter by FarmerGroup.id)
UserDistrict      → semua KT di district (filter by districtId)
UserProvince      → semua district di province → semua KT (filter by districtId)
```

Konvensi (urutan prioritas):
1. SUPERADMIN → `ALL`
2. Tidak ada assignment sama sekali → `ALL` (unrestricted)
3. **Hanya** `UserFarmerGroup` ada (tanpa Province/District) → filter `id IN [farmerGroupIds]`
4. `UserProvince` dan/atau `UserDistrict` ada → resolve ke district IDs → filter `districtId IN [...]`

> [!IMPORTANT]
> Jika user memiliki assignment campuran (Province + FarmerGroup), mode **BY_DISTRICT** yang berlaku — bukan BY_FARMER_GROUP. Rule #3 hanya aktif jika Province dan District **sama-sama kosong**.

**Implementation Pattern** — Gunakan discriminated union `AccessContext` di server action:

```ts
type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

// Resolusi where clause:
const accessFilter =
  access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
  access.mode === "BY_DISTRICT"     ? { districtId: { in: access.ids } } :
  {};
```

> [!WARNING]
> **Bug pattern lama** — Jangan filter hanya berdasarkan `districtId` tanpa handle case `BY_FARMER_GROUP`. Jika user hanya assign KT dan code menghasilkan `districtId: { in: [] }`, semua data KT akan hilang dari query.

### User Data Access Assignment UI

Untuk assign data access per user (Province/District/KT):
- **Server Actions** — di `src/server/actions/user-data-access.ts`: `getUserDataAccess`, `getRegionsForSelect`, `assignUserProvince/District/FarmerGroup`, `removeUserProvince/District/FarmerGroup`
- **Modal** — `UserDataAccessModal` (Tabs: Provinsi | Distrik | KT) dengan live-save checkbox per item
- **Table Summary** — Gunakan komponen `AccessSummaryCell` di kolom "Akses Data": badge per assignment, `—` jika kosong
- **Real-time refresh** — Pass `onDataChange` callback ke modal → panggil `startTransition(() => router.refresh())` setiap toggle berhasil

### User Menu Access Override UI

Untuk melakukan override permission menu per user (grant/revoke):
- **Server Actions** — di `src/server/actions/user-menu-access.ts`: `getUserMenuOverrides`, `getMenuItemsForSelect`, `getUserEffectivePermissions`, `setUserMenuOverride`, `removeUserMenuOverride`
- **Modal** — `UserMenuAccessModal` dengan matrix C | V | E | D per menu, visual code status (`role` | `granted` | `revoked`), dan interactive toggle saving.
- **Keamanan** — Pengecekan di server action wajib menolak override terhadap user berkole `SUPERADMIN`.
- **Soft Delete** — Penghapusan override menggunakan update `isActive: false` (bukan physical delete).
- **Optimasi Caching** — Fungsi pembacaan permission di `src/lib/rbac.ts` wajib dibungkus dengan React `cache` untuk mereduksi kueri ganda pada render lifecycle.

### Hierarchical Menu Management (3-Level Support)

Sistem menu mendukung hierarki sampai **3 level maksimal**:
- **Level 1:** Menu Besar (e.g., Master Data, Settings, Dashboard)
- **Level 2:** Sub Menu (e.g., Petani, Kelompok Tani, Pelatihan, User Management)
- **Level 3:** Detail Sub Menu (e.g., Peserta Pelatihan, Bukti Pelatihan, Land Parcel, Training Record)

**RBAC Permission Inheritance:**
- Permission di **level 1** berlaku untuk semua level 2 dan level 3 di bawahnya (cascade)
- Permission di **level 2** berlaku untuk semua level 3 di bawahnya
- **Override eksplisit** di level lebih dalam meng-override inheritance (revoke atau grant)
- Contoh: User punya VIEW di "Pelatihan" (level 2) → otomatis VIEW di "Peserta Pelatihan" (level 3), kecuali ada explicit REVOKE

> [!WARNING]
> **Cascade = risiko over-grant.** Grant pada menu **induk** mewariskan permission ke **semua** anak (termasuk menu sensitif seperti User/Role/Menu Management). Untuk akses **granular**, grant di level **anak**, jangan induk. Sidebar (`filterMenuTreeByAccess` di `menu-utils.ts`) tetap menampilkan induk sebagai **container** selama salah satu anaknya ter-grant — jadi grant per-anak **tidak** memerlukan grant induk. Konsekuensi: jangan mensyaratkan induk ter-grant hanya agar anak tampil. (Audit lintas-role: `scripts/local/audit-cascade.ts`.)

**UI Guidelines:**
- **Max children:** Level 2 maksimal 5 children (level 3) — hindari clutter, pertimbangkan pagination/search jika > 5
- **Dynamic route:** Level 3 gunakan dynamic route jika context-specific: `/admin/master-data/training/[id]/participants`
- **Max depth:** Level 3 tidak boleh punya children (max depth = 3 level)
- **Sidebar visual:**
  - Level 2: `pl-4`, normal text size, collapsible jika punya children
  - Level 3: `pl-8`, `text-xs`, `ChevronRight` icon atau bullet `•`
- **Menu Management table visual:**
  - Level 1: **Bold** text
  - Level 2: `— ` prefix + normal weight
  - Level 3: `—— ` prefix + `text-muted-foreground`

**Technical Implementation:**
- Helper function `buildMenuTree(items, parentKey, currentDepth, maxDepth)` di `src/lib/menu-utils.ts` untuk recursive tree building
- Validation: `validateMenuDepth()` reject jika depth > 3
- RBAC: `getEffectiveMenuPermissions()` dengan fallback ke parent/grandparent
- Server action: Validate depth sebelum create/update menu item

---

## UI/UX

### Prinsip

- Komponen **Shadcn UI** + utility **Tailwind 4**
- Warna pakai variabel `oklch` di `globals.css`
- Font: Acumin Pro Condensed
- Mobile-first responsive

### Layout Admin

- Header halaman (judul & deskripsi) wajib
- Pembungkus data pakai `<Card>`
- Form kompleks → pisah seksi, hindari scroll bertumpuk

### Table Typography

| Element | Styling |
|---------|---------|
| Header | `bg-muted/70 border-b-2` · `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Data utama | `text-sm font-medium` |
| Kode/ID | `text-sm font-mono text-muted-foreground` |
| Data sekunder | `text-sm text-muted-foreground` |
| Angka | `text-sm tabular-nums` |
| Kosong/null | `—` + `text-muted-foreground` |
| Status | `<Badge>` |

### Table Actions

Untuk aksi dalam tabel (tombol Edit, Lihat, Hapus, Nonaktifkan, dll), ikuti aturan berikut untuk konsistensi:
- **Posisi Kolom**: Kolom **Aksi** wajib diletakkan di bagian paling kiri tabel (kolom pertama).
- **Lebar Kolom (Autofit)**: Kolom **Aksi** wajib memiliki lebar seminimal mungkin (autofit) agar tidak memakan ruang kolom lainnya. Gunakan kelas `w-[1%] whitespace-nowrap` pada `TableHead` dan `TableCell` pembungkus kolom Aksi.
- **Format Tombol**: Gunakan tombol berbasis icon tanpa teks dengan properti `<Button variant="ghost" size="icon">`.
- **Desain Icon & Tooltip**:
  - Setiap tombol wajib memiliki properti `title` untuk aksesibilitas dan penjelasan singkat aksi.
  - Aksi **Lihat**: Gunakan icon `<Eye className="h-4 w-4" />` dengan `title="Lihat"`.
  - Aksi **Edit**: Gunakan icon `<Pencil className="h-4 w-4" />` dengan `title="Edit"`.
  - Aksi **Nonaktifkan**: Gunakan icon `<Trash2 className="h-4 w-4" />` dengan `title="Nonaktifkan"`.
- **Visibilitas Berbasis Izin (Role & Permission)**: Semua tombol aksi dan tombol penambahan data (Tambah/Create) harus dilindungi (show/hide) secara dinamis menggunakan daftar izin (`permissions`) yang diperoleh dari backend:
  - Tombol **Tambah / Create** di atas tabel di-render jika: `permissions.includes("CREATE")`.
  - Tombol **Lihat / View** di-render jika: `permissions.includes("VIEW")`.
  - Tombol **Edit** di-render jika: `permissions.includes("EDIT")`.
  - Tombol **Nonaktifkan / Aktifkan kembali (Delete/Restore)** di-render jika: `permissions.includes("DELETE")`.
- **Abstraksi Komponen (`TableActions`)**: Gunakan komponen pembungkus `<TableActions>` dari `@/components/shared` untuk merender seluruh tombol aksi baris tabel secara otomatis berdasarkan daftar izin (`permissions`) dan array konfigurasi `actions` untuk menghindari pengulangan kode inline.
- **Loading Placeholder (`TableSkeleton`)**: Gunakan komponen `<TableSkeleton>` pada file `loading.tsx` dari menu tabel bersangkutan untuk menampilkan placeholder table-row loading saat data sedang dimuat secara asinkron, guna meminimalkan layout shift.

### Table Pagination

Untuk tabel dengan pagination, ikuti aturan layout dan state berikut untuk konsistensi:
- **State Halaman**: Gunakan 0-based index untuk variabel state `page` (halaman pertama = `0`).
- **Reset Halaman**: Selalu reset `page` kembali ke `0` ketika input pencarian (`search`) atau dropdown filter berubah.
- **Batas Indeks Aman**: Hitung indeks halaman aman (`safePage = Math.min(page, totalPages - 1)`) untuk mencegah tampilan halaman kosong jika jumlah data berkurang secara dinamis.
- **Pilihan Ukuran Halaman**: Sediakan pilihan ukuran halaman (`[10, 25, 50, 100]`) menggunakan dropdown `<Select>` Shadcn UI.
- **Layout Kontrol**:
  - Bagian Kiri: Dropdown pemilihan ukuran halaman ("Tampilkan [dropdown] dari [total] data").
  - Bagian Kanan: Indikator halaman ("Halaman [aktif] dari [total_halaman]") beserta tombol navigasi sebelumnya/selanjutnya menggunakan `<Button variant="outline" size="icon" className="h-8 w-8">` dan icon `<ChevronLeft>` / `<ChevronRight>` berukuran `h-4 w-4`.

### Table Export & Column Selection (DataTable)

Untuk tabel yang menggunakan komponen `<DataTable>`, konfigurasi berikut harus didukung:
- **Show/Hide Kolom**: Disediakan tombol dropdown "Kolom" untuk memilih visibilitas kolom.
- **Export Excel**:
  - Disediakan tombol "Excel" untuk mengunduh data tabel saat ini (hasil pencarian/filter aktif).
  - Diaktifkan dengan menyertakan prop `exportFilename` (misalnya `exportFilename="data-users"`).
  - Kustomisasi mapping baris dilakukan melalui prop `getExportRow` untuk meratakan relasi atau data kompleks.
- **Posisi Tombol Tambah**: Tombol "Tambah / Create" di-render secara konsisten di paling kanan toolbar menggunakan prop `toolbarRight` dari `<DataTable>`.

### State & Feedback

- Loading state wajib (skeleton/spinner)
- Toast setelah action berhasil/gagal

### Bulk Upload UI/UX & Validation Pattern

Untuk fitur bulk upload data massal (misalnya Petani, Kelompok Tani, atau Region), ikuti aturan alur dan antarmuka berikut:
- **Alur Step-by-Step**:
  1. Pilih context / parent entity (misalnya Kelompok Tani) di paling atas menggunakan searchable Combobox. Pilihan file input harus tetap *disabled* sampai context dipilih.
  2. Pilih berkas Excel (`.xlsx`) atau CSV. Input file dinonaktifkan jika context di atas belum dipilih.
  3. Pemetaan kolom dinamis (*Dynamic Column Mapping*): sediakan pemetaan drop-down kolom file dengan field target database, lengkap dengan aturan auto-matching.
  4. Hasil validasi dan review: Tampilkan status per baris, jumlah ringkasan valid vs error, serta filter tampilan data.
- **Smart Validations**:
  - Validasi keunikan ID: Cek keunikan baik di tingkat berkas (*file-level*) maupun terhadap database (*DB-level*).
  - Normalisasi data: Konversi format gender (L/P -> M/F), bersihkan format NIK (hanya angka 16 digit), dan parse berbagai format tanggal (Excel serial number atau string tanggal).
- **Download Feedback**:
  - Pengguna wajib diberikan opsi untuk mengunduh laporan hasil validasi baik data penuh (*full data*) maupun baris yang gagal saja (*error-only*), dengan menyertakan kolom "Keterangan" penjelasan error.

### Shapefile Bulk Upload Pattern (Geospatial Data)

Untuk upload data geospatial menggunakan Shapefile (`.shp` dalam format ZIP), ikuti pattern berikut:
- **Format Input**: ZIP file berisi `.shp`, `.shx`, `.dbf`, dan file pendukung lainnya
- **Parsing**: Gunakan library `shapefile` untuk membaca geometri dan atribut dari Shapefile
- **Column Mapping**: 
  - Sediakan dropdown mapping untuk setiap kolom dari DBF attributes ke field database target
  - Auto-match kolom berdasarkan similarity name (fuzzy matching)
  - Wajib mapping: Farmer ID/Name, Parcel ID, dan geometry field
- **Geometry Validation**:
  - Validasi tipe geometry (Polygon/MultiPolygon untuk land parcel)
  - Extract centroid untuk location_lat/location_long
  - Convert geometry ke GeoJSON format untuk field polygon
  - Hitung area otomatis dari polygon geometry
- **Smart Validations**:
  - Validasi farmerId terhadap database (must exist & active)
  - Check uniqueness parcelId per farmer (file-level + DB-level)
  - Validasi geometry: tidak boleh null, harus valid polygon
  - Optional fields: planting year (1900-2100), notes
- **Preview & Save**:
  - Tampilkan preview tabel dengan status validasi per row
  - Show geometry info: area (ha), centroid coordinates, polygon complexity
  - Bulk insert dengan transaction-based (all-or-nothing)
  - Auto-increment revision untuk update parcel yang sudah ada
- **Implementasi Reference**: Lihat `src/server/actions/bulk-upload-parcel.ts` (issue #88)

### Searchable Kelompok Tani Filters

- **Wajib menggunakan Combobox**: Untuk mempermudah pencarian dan penyaringan data di semua halaman list master data (terutama data Petani) atau alur lainnya, semua komponen filter/dropdown **Kelompok Tani** wajib menggunakan komponen **searchable Combobox** (kombinasi Popover & Command Shadcn UI) dengan kemampuan pencarian teks, dan tidak diperbolehkan menggunakan dropdown Select box standar.

### Geospatial Features (MapLibre Integration)

Untuk fitur yang memerlukan visualisasi dan interaksi dengan data geospasial (koordinat, polygon, area):
- **Map Display**: Gunakan MapLibre GL JS untuk menampilkan peta interaktif
- **Fonts/Glyphs**: `text-font` pada symbol layer wajib **font tunggal** yang tersedia di server glyph (`fonts.openmaptiles.org`), mis. `["Open Sans Regular"]`. **Jangan** pakai fontstack gabungan (mis. `["Open Sans Regular", "Noto Sans Regular"]`) — server tidak melayaninya dan malah membalas HTML, sehingga MapLibre gagal parse PBF: `Unable to load glyph range 0, 0-255 / Unimplemented type: 4`.
- **Polygon Viewer**: 
  - Parse GeoJSON polygon dari database
  - Render polygon sebagai layer di map dengan styling (fill color, stroke)
  - Auto-fit bounds ke polygon extent
  - Show centroid marker untuk reference point
- **Coordinate Display**: Format koordinat sebagai `lat, long` dengan presisi 6 desimal
- **Area Display**: Format area dalam hektar (ha) dengan 2 desimal, contoh: "2.50 ha"
- **Geometry Storage**: Simpan polygon sebagai GeoJSON di field `Json` type Prisma
- **Geospatial Calculations**:
  - Centroid extraction dari polygon untuk lat/long fields
  - Area calculation dari polygon geometry (dalam satuan hektar)
  - Geometry validation (harus valid Polygon atau MultiPolygon)
- **Component Pattern**: 
  - Buat reusable `MapViewer` component untuk display polygon
  - Support props: `polygon` (GeoJSON), `center` (lat/long), `zoom`, `height`
  - Lazy load MapLibre untuk optimize bundle size
- **Reference/Overlay Layers (WMS/tile pihak ketiga)**:
  - Definisikan overlay sebagai daftar deklaratif (`MAP_OVERLAYS` di `map-overlays.ts`): `key`, `label`, `color`, `service` (ArcGIS REST MapServer). Render sebagai `<Source type="raster">` MapLibre di bawah layer data, toggle per-layer + slider opacity bersama.
  - **Wajib proxy tile via route same-origin** bila server upstream tidak mengirim header CORS atau menyajikan TLS chain tak lengkap (kasus SIGAP KLHK/Kemenhut). Ini pengecualian sempit atas aturan "no REST API layer" — endpoint gambar biner tidak bisa jadi Server Action. Gunakan whitelist per-`key` (bukan open proxy), `runtime = "nodejs"`, validasi param `bbox`, dan set `Cache-Control`.
- **User-added GIS layers (bring-your-own)**: dukung penambahan layer runtime oleh user (state session, tak dipersist) via 3 mode — WMS URL (raster), ZIP Shapefile & GeoJSON (vektor). Shapefile/GeoJSON **diparse di browser** (`shpjs` dynamic import, `JSON.parse`) → GeoJSON → render `<Source type="geojson">` (fill+line+circle agar semua tipe geometri tertangani). WMS user di-fetch **langsung tanpa proxy** (hindari open-proxy/SSRF) sehingga server WMS harus CORS-enabled. Auto-fit ke bounds layer vektor baru. Pasang `onError` pada `<Map>` agar kegagalan fetch tile tidak jadi error fatal.
- **Layer titik api / hotspot (NASA FIRMS)**: deteksi kebakaran aktif VIIRS 375 m di-fetch server-side via **proxy same-origin** baru `api/map-hotspot` (bukan Server Action — `<Source>` MapLibre butuh GET URL). Proxy **wajib auth-guard** (`hasPermission("map-parcel","VIEW")`) agar bukan proxy anonim, menyembunyikan `FIRMS_MAP_KEY_FREE`, validasi `bbox`+`dayRange`, cache 1 jam. **FIRMS free tier membatasi `dayRange` ke `[1..5]`** (respons error teks `Expects [1..5]`, bukan CSV) → window UI = **24 jam / 5 hari** (bukan 7). Parsing CSV→GeoJSON di helper murni `src/lib/firms.ts` (teruji). Titik diwarnai per kebaruan + popup detail + disclaimer **"deteksi anomali panas, bukan konfirmasi kebakaran"** + atribusi `NASA FIRMS`. Area query dikunci ke bbox provinsi (mis. `RIAU_BBOX`).
- **Tool ukur (ruler)**: ukur jarak & luas **geodesik** (haversine + spherical-excess) **tanpa dependensi tambahan** — klik menaruh titik, label per-segmen, undo/hapus/Esc. Helper murni di `map-geo.ts` (teruji); di sini juga `parcelLabelFit`/`geomBounds` untuk **label nama** (KT pada titik, petani pada poligon **hanya bila teks muat di dalam poligon** pada zoom aktif, wrap otomatis; `geomBounds` dihitung sekali per dataset).
- **Implementasi Reference**: 
  - Map viewer: `src/components/shared/map-viewer.tsx`
  - Land parcel detail: `src/app/(admin)/admin/master-data/parcels/[id]/page.tsx`
  - Map explorer (MAP-01): `src/app/(admin)/admin/map/parcel/` (peta full-bleed + filter floating + layer toggle + section "Peta Lainnya" overlay referensi + section "Tambah Data GIS Lain" + info popup accordion), server actions `src/server/actions/map.ts`, definisi overlay + helper GIS `src/app/(admin)/admin/map/parcel/map-overlays.ts`
  - User-added GIS section: `src/app/(admin)/admin/map/parcel/map-custom-gis.tsx` (form WMS/Shapefile/GeoJSON + daftar layer)
  - Tile proxy overlay: `src/app/api/map-overlay/[key]/route.ts` (forward ke ArcGIS `export`, toleran TLS chain upstream, whitelist per-overlay)
  - Hotspot NASA FIRMS: proxy `src/app/api/map-hotspot/route.ts` (auth-guarded) + helper murni `src/lib/firms.ts` + client `src/app/(admin)/admin/map/parcel/map-hotspot.ts`; unit test `src/test/firms.test.ts`
  - Ruler & label fit: `src/app/(admin)/admin/map/parcel/map-geo.ts` (jarak/luas geodesik + `parcelLabelFit`/`geomBounds`); unit test `src/test/map-geo.test.ts`
  - Farm Passport PDF: `src/lib/farm-passport.ts` (jsPDF A4: identitas, layout lahan/polygon vektor, pelatihan, produksi) — di-generate dari `getParcelPassport`

### Dashboard Snapshot Pattern

Untuk snapshot dashboard yang menyimpan historical state:
- **Separate Table Per Dashboard**: Setiap dashboard punya snapshot table sendiri (e.g., `tbl_snapshot_main_dashboard`, `tbl_snapshot_production_dashboard`)
- **Naming Convention**: `tbl_snapshot_<dashboard_name>` dengan model `<Dashboard>Snapshot`
- **Common Fields**: `id`, `snapshotDate`, filter fields (nullable), `data` (Json), audit trail (`createdBy`, `isActive`, timestamps)
- **Unique Constraint**: Kombinasi `snapshotDate` + filter fields untuk prevent duplicate snapshot
- **Data Structure**: Store aggregated data di field `data Json` dengan struktur spesifik per dashboard
- **RBAC Integration**: Apply RBAC filter saat generate snapshot, store only accessible data
- **Why Not Single Table**: Type safety, query performance, maintainability, independent migrations
- **Implementation Reference**: 
  - Issue #99: DASH-01 Dashboard Snapshot
  - Database schema doc: `docs/database-schema.md` section "Dashboard Snapshot Pattern"
  - Server actions: `src/server/actions/snapshot.ts` (untuk pattern reference)

---

## Arsitektur

```
src/
├── app/
│   ├── (admin)/admin/        # Dashboard, master-data, settings, tools
│   ├── (public)/             # Home, community, knowledge
│   └── globals.css           # Design tokens
├── components/
│   ├── ui/                   # Shadcn primitives
│   ├── shared/               # DataTable, DeleteDialog
│   ├── dashboard/            # Dashboard components
│   └── layout/               # Admin & public layout
├── lib/                      # Prisma, utils, static-data
├── server/actions/           # Server Actions
├── validations/              # Zod schemas
└── types/                    # Custom types
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Shadcn UI |
| Styling | Tailwind 4 + oklch tokens |
| Database | PostgreSQL + PostGIS |
| ORM | Prisma 7 (modular schema) |
| Maps | MapLibre GL JS |
| Charts | Recharts |
| Validation | Zod + React Hook Form |
