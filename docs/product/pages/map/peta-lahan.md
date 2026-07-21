# Peta Lahan

[← Menu Map](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Peta Lahan (/admin/map/parcel)
├── Panel kiri: "Peta Lahan" (mengambang, minimizable)
│   ├── Filter: Provinsi · Distrik (wajib) · Lembaga Petani
│   ├── Tombol: Muat Data
│   ├── Legenda: Point Lembaga Petani · Point Lahan Petani · Area Lahan Petani
│   ├── Peta Lainnya (overlay SIGAP KLHK)
│   │   ├── Layer: Kawasan Hutan · Pelepasan Kawasan Hutan · Fungsi Ekosistem Gambut
│   │   ├── Layer: PIPPIB (Moratorium) · Penutupan Lahan 2022
│   │   └── Slider: Transparansi
│   ├── Titik Api (Hotspot)
│   │   ├── Toggle: Rentang waktu (24 jam / 5 hari)
│   │   └── Legenda hotspot
│   └── Tambah Data GIS Lain
│       ├── Form: WMS URL
│       ├── Form: Shapefile / GeoJSON
│       └── Daftar layer tambahan
├── Peta
│   ├── Basemap: LIGHT / DARK / HYBRID
│   ├── Layer: Point Lembaga Petani · Point Lahan Petani · Area Lahan Petani
│   ├── Layer: Overlay raster · Titik api · Layer GIS tambahan
│   ├── Popup fitur: Lembaga Petani · Titik Api · Lahan
│   │   └── Popup Lahan: Detail Lahan · Pelatihan Petani · Produksi · Profil Lahan
│   └── Legend
├── Panel kanan atas: Ukur jarak & luas · Daftar Lahan
└── Tombol: Zoom ke semua data · Basemap switcher
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Menu key | `map-parcel` (URL `/admin/map/parcel`, icon `MapPinned`, order 1) |
| File | `src/app/(admin)/admin/map/parcel/page.tsx` |
| Client | `map-parcel-client.tsx` (orkestrasi), `map-control-panel.tsx` (panel kiri), `map-canvas.tsx` (peta + popup), `map-custom-gis.tsx`, `map-overlays.ts`, `map-hotspot.ts`, `map-geo.ts` |
| Tipe | Server Component (opsi provinsi) → Client Component (peta interaktif) |
| Guard | `requirePermission("map-parcel")`; action `getMapData` guard `hasPermission("map-parcel", "VIEW")` + `getAccessContext()` |
| Server action / data | `getProvincesForMap()`, `getDistrictsForMap()`, `getFarmerGroupsForMap()`, `getMapData()`, `getFarmerTraining()`, `getParcelProduction()`, `getParcelPassport()` (`src/server/actions/map.ts`); proxy same-origin `/api/map-overlay/[key]` (SIGAP KLHK) dan `/api/map-hotspot` (NASA FIRMS) |
| Loading | `loading.tsx` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Panel "Peta Lahan" | Panel mengambang | Card kiri-atas, header sticky ikon `MapPinned`, tombol "Minimalkan"; saat minimize jadi tombol ikon "Buka panel filter" |
| Filter | Section collapsible | Terbuka default; tertutup otomatis setelah data dimuat |
| Provinsi | Filter (combobox) | Placeholder "Pilih Provinsi", empty "Provinsi tidak ditemukan."; mengubahnya mereset Distrik & Lembaga Petani |
| Distrik | Filter (combobox) | **Wajib** (tanda `*`); placeholder "Pilih Distrik", empty "Distrik tidak ditemukan." |
| Lembaga Petani | Filter (combobox) | Placeholder "Pilih Lembaga Petani", empty "Lembaga Petani tidak ditemukan."; disabled sampai Distrik dipilih |
| Muat Data | Tombol | Disabled tanpa Distrik; tanpa Distrik → toast "Silakan pilih Distrik terlebih dahulu"; hasil kosong → toast "Tidak ada data untuk filter ini", sukses → "Data berhasil dimuat" |
| Legenda | Section collapsible + Legend | Muncul hanya setelah data dimuat; tiap baris = checkbox toggle layer + swatch warna + jumlah fitur |
| Point Lembaga Petani | Layer + Legend | Circle hijau `#22c55e` r=8, stroke putih; label nama lembaga di bawah titik |
| Point Lahan Petani | Layer + Legend | Circle biru `#3b82f6` r=5 pada centroid persil |
| Area Lahan Petani | Layer + Legend | Polygon fill `#22c55e` opacity 0.2, outline `#16a34a`; label nama petani di dalam poligon bila muat (`parcelLabelFit`) |
| Peta Lainnya | Section collapsible (overlay) | Raster overlay ArcGIS SIGAP KLHK via proxy: Kawasan Hutan, Pelepasan Kawasan Hutan, Fungsi Ekosistem Gambut, PIPPIB (Moratorium), Penutupan Lahan 2022 — tiap baris checkbox + deskripsi singkat |
| Transparansi | Slider | Muncul bila ada overlay aktif; rentang 0.1–1 (default 0.7), ditampilkan dalam persen; catatan "Sumber: SIGAP KLHK / Kementerian Kehutanan." |
| Titik Api (Hotspot) | Section collapsible + Layer | Checkbox "Tampilkan titik api" + jumlah titik; sumber NASA FIRMS VIIRS 375 m, area query tetap bbox Riau |
| Rentang waktu hotspot | Toggle | Dua opsi: "24 jam" / "5 hari" |
| Legenda hotspot | Legend | `#ef4444` "< 24 jam terakhir", `#f97316` "1–5 hari terakhir"; catatan "Deteksi anomali panas VIIRS 375 m, bukan konfirmasi kebakaran. Sumber: NASA FIRMS · jeda ±3 jam." |
| Tambah Data GIS Lain | Section collapsible | Tiga mode: "WMS URL", "Shapefile", "GeoJSON"; layer sesi saja (tidak disimpan) |
| Form WMS | Form | Input "Nama layer (opsional)", "URL WMS / template tile", "Nama layer WMS (mis. 0, kawasan_hutan)" + tombol "Tambah Layer"; toast "Layer WMS ditambahkan" |
| Form Shapefile / GeoJSON | Form | Tombol "Pilih file ZIP Shapefile" (`.zip`, parse `shpjs`) / "Pilih file GeoJSON" (`.geojson,.json`); diproses di browser, tidak diunggah ke server |
| Daftar layer tambahan | Daftar | Checkbox visibilitas + swatch warna + nama + badge "WMS"/"VEC" + tombol hapus; layer vektor otomatis di-zoom saat ditambahkan |
| Ukur jarak & luas | Tombol (kanan atas) | Toggle ruler; klik peta menambah titik, kursor jadi crosshair, double-click zoom dimatikan |
| Panel Ukur | Panel | Menampilkan "Jarak" (≥2 titik) dan "Luas" (≥3 titik); tombol "Hapus titik terakhir" & "Hapus ukuran"; petunjuk "Klik pada peta untuk mulai mengukur." / "{n} titik · klik menambah · Esc selesai." |
| Daftar lahan | Tombol + Panel (kanan atas) | Judul "Daftar Lahan (n)"; search "Cari nama / ID petani / ID lahan"; kolom Aksi (tombol "Zoom ke lahan"), Petani (nama + kode), ID Lahan; empty "Tidak ada lahan." |
| Zoom ke semua data | Tombol (kanan bawah) | `fitBounds` ke seluruh data yang dimuat |
| Basemap switcher | Tombol grup (kanan bawah) | LIGHT / DARK / HYBRID |
| Popup Lembaga Petani | Popup | Header hijau + nama lembaga, subtitle "Lembaga Petani"; baris: Kode, Distrik, Koordinat |
| Popup Titik Api | Popup | Header merah "Titik Api", subtitle "< 24 jam" / "1–5 hari"; baris: Waktu Deteksi (WIB), Satelit (Suomi NPP / NOAA-20), Keyakinan (Rendah/Nominal/Tinggi), FRP (MW), Koordinat + catatan sumber FIRMS |
| Popup Lahan | Popup | Header biru: foto placeholder + nama petani, ID Petani, ID Lahan, Lembaga Petani; highlight "Luas Lahan" (`x,xx ha`) |
| Popup › Detail Lahan | Section popup | Terbuka default: Tahun Tanam, Komoditas, Status Lahan |
| Popup › Pelatihan Petani | Section popup | Lazy-load `getFarmerTraining`; daftar paket dengan centang selesai + tanggal; error "Gagal memuat pelatihan." |
| Popup › Produksi | Section popup | Lazy-load `getParcelProduction`; select "Rata-rata" atau per tahun; grafik batang bulanan (kg); "Belum ada data produksi." bila kosong |
| Profil Lahan | Tombol popup | Generate PDF Farm Passport (`src/lib/farm-passport.ts`) via `getParcelPassport`; label proses "Menyiapkan..."; gagal → toast "Gagal membuat PDF profil lahan" |
