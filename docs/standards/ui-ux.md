# Standar — UI/UX

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [principles.md](./principles.md) · [workflow.md](./workflow.md) · [code-standards.md](./code-standards.md) · [rbac.md](./rbac.md) · [architecture.md](./architecture.md)

## UI/UX

### Prinsip

- Komponen **Shadcn UI** + utility **Tailwind 4**
- Warna pakai variabel `oklch` di `globals.css`
- Font: **Acumin Pro Condensed** (brand WRI, lihat `brand.wri.org/fonts`) — dimuat via `@font-face` self-host di `public/fonts/` (`globals.css`, `font-display: swap`), fallback **Arial → Helvetica → sans-serif** sesuai rekomendasi WRI; `--font-sans` diarahkan ke stack ini dan Geist Sans dilepas (Geist Mono tetap untuk `--font-mono`) — #130. Sebelumnya hanya deklarasi `font-family` tanpa `@font-face` sehingga jatuh ke fallback generik. File `.woff2` berlisensi ditaruh manual (`acumin-pro-condensed-regular/bold.woff2`; panduan: `public/fonts/README.md`).
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
- **Parsing**: Gunakan library `shpjs` untuk membaca geometri dan atribut dari Shapefile (parse buffer ZIP langsung, tanpa ekstraksi manual)
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
  - Komponen map viewer per-konteks: `parcel-map-view.tsx` (detail/form lahan) dan `map-canvas.tsx` (Map Explorer) — belum ada satu `MapViewer` shared
  - Support props: `polygon` (GeoJSON), `center` (lat/long), `zoom`, `height`
  - Lazy load MapLibre untuk optimize bundle size
- **Reference/Overlay Layers (WMS/tile pihak ketiga)**:
  - Definisikan overlay sebagai daftar deklaratif (`MAP_OVERLAYS` di `map-overlays.ts`): `key`, `label`, `color`, `service` (ArcGIS REST MapServer). Render sebagai `<Source type="raster">` MapLibre di bawah layer data, toggle per-layer + slider opacity bersama.
  - **Wajib proxy tile via route same-origin** bila server upstream tidak mengirim header CORS atau menyajikan TLS chain tak lengkap (kasus SIGAP KLHK/Kemenhut). Ini pengecualian sempit atas aturan "no REST API layer" — endpoint gambar biner tidak bisa jadi Server Action. Gunakan whitelist per-`key` (bukan open proxy), `runtime = "nodejs"`, validasi param `bbox`, dan set `Cache-Control`.
- **User-added GIS layers (bring-your-own)**: dukung penambahan layer runtime oleh user (state session, tak dipersist) via 3 mode — WMS URL (raster), ZIP Shapefile & GeoJSON (vektor). Shapefile/GeoJSON **diparse di browser** (`shpjs` dynamic import, `JSON.parse`) → GeoJSON → render `<Source type="geojson">` (fill+line+circle agar semua tipe geometri tertangani). WMS user di-fetch **langsung tanpa proxy** (hindari open-proxy/SSRF) sehingga server WMS harus CORS-enabled. Auto-fit ke bounds layer vektor baru. Pasang `onError` pada `<Map>` agar kegagalan fetch tile tidak jadi error fatal.
- **Layer titik api / hotspot (NASA FIRMS)**: deteksi kebakaran aktif VIIRS 375 m di-fetch server-side via **proxy same-origin** baru `api/map-hotspot` (bukan Server Action — `<Source>` MapLibre butuh GET URL). Proxy **wajib auth-guard** (`hasPermission("map-parcel","VIEW")`) agar bukan proxy anonim, menyembunyikan `FIRMS_MAP_KEY_FREE`, validasi `bbox`+`dayRange`, cache 1 jam. **FIRMS free tier membatasi `dayRange` ke `[1..5]`** (respons error teks `Expects [1..5]`, bukan CSV) → window UI = **24 jam / 5 hari** (bukan 7). Parsing CSV→GeoJSON di helper murni `src/lib/firms.ts` (teruji). Titik diwarnai per kebaruan + popup detail + disclaimer **"deteksi anomali panas, bukan konfirmasi kebakaran"** + atribusi `NASA FIRMS`. Area query dikunci ke bbox provinsi (mis. `RIAU_BBOX`).
- **Tool ukur (ruler)**: ukur jarak & luas **geodesik** (haversine + spherical-excess) **tanpa dependensi tambahan** — klik menaruh titik, label per-segmen, undo/hapus/Esc. Helper murni di `map-geo.ts` (teruji); di sini juga `parcelLabelFit`/`geomBounds` untuk **label nama** (KT pada titik, petani pada poligon **hanya bila teks muat di dalam poligon** pada zoom aktif, wrap otomatis; `geomBounds` dihitung sekali per dataset).
- **Implementasi Reference**: 
  - Map viewer (detail/form lahan): `src/app/(admin)/admin/master-data/parcels/components/parcel-map-view.tsx`
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
  - Database schema doc: `docs/database/dashboard-snapshots.md` section "Dashboard Snapshot Pattern"
  - Server actions: `src/server/actions/snapshot.ts` (untuk pattern reference)
