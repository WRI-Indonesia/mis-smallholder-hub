# Peta Lahan

[← Menu Map](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Peta Lahan (/admin/map/parcel)
├── Panel kiri: "Peta Lahan" (mengambang, minimizable)
│   ├── Filter: Provinsi · Distrik (wajib) · Lembaga Petani
│   ├── Tombol: Muat Data
│   ├── Legenda: Point Lembaga Petani · Point Lahan Petani · Area Lahan Petani
│   ├── Peta Lainnya (overlay referensi pemerintah)
│   │   ├── Layer: Kawasan Hutan · Fungsi Ekosistem Gambut
│   │   ├── Per layer aktif: legend warna kelas + "Sumber: …"
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
│   │       └── Aksi: Lihat Detail · Edit Lahan
│   ├── Modal: Edit Lahan (dari popup)
│   └── Legend
├── Panel kanan atas: Ukur jarak & luas · Daftar Lahan
└── Tombol: Zoom ke semua data · Basemap switcher
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Menu key | `map-parcel` (URL `/admin/map/parcel`, icon `MapPinned`, order 1) |
| File | `src/app/(admin)/admin/map/parcel/page.tsx` |
| Client | `map-parcel-client.tsx` (orkestrasi), `map-control-panel.tsx` (panel kiri), `map-canvas.tsx` (peta + popup), `map-custom-gis.tsx`, `map-overlays.ts`, `map-hotspot.ts`, `map-geo.ts`; primitif popup bersama `src/components/shared/map-popup.tsx` (TD-028) + `parcel-popup-actions.tsx` & `parcel-edit-modal-host.tsx` (dari `master-data/parcels/components/`) |
| Tipe | Server Component (opsi provinsi) → Client Component (peta interaktif) |
| Guard | `requirePermission("map-parcel")`; `page.tsx` juga menghitung `hasPermission("master-data-parcels", "VIEW"/"EDIT")` → prop `canViewParcel`/`canEditParcel` (gate tombol aksi popup); action `getMapData` guard `hasPermission("map-parcel", "VIEW")` + `getAccessContext()` |
| Server action / data | `getProvincesForMap()`, `getDistrictsForMap()`, `getFarmerGroupsForMap()`, `getMapData()`, `getFarmerTraining()`, `getParcelProduction()`, `getParcelPassport()` (`src/server/actions/map.ts`); proxy same-origin `/api/map-overlay/[key]` (ArcGIS pemerintah: geoportal Kemenhut & Satu Peta BIG) dan `/api/map-hotspot` (NASA FIRMS). `getMapData` mengembalikan **format wire dipadatkan** (#223: tuple posisi per persil, koordinat truncate 6 desimal, atribut petani di lookup `farmers`, centroid tidak dikirim) — klien me-rehydrate via `expandMapData` (`src/lib/map-data.ts`) sebelum dipakai |
| Loading | `loading.tsx` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Panel "Peta Lahan" | Panel mengambang | Card kiri-atas, header sticky ikon `MapPinned`, tombol "Minimalkan"; saat minimize jadi tombol ikon "Buka panel filter" |
| `Panduan` | Tautan | `HelpHint` di header panel (sebelah tombol Minimalkan) menuju tutorial Bantuan untuk `map-parcel`; dirender server via prop `helpSlot` (markdown Bantuan tak masuk bundle client), dibuka di tab baru; ikut tersembunyi saat panel di-minimize |
| Filter | Section collapsible | Terbuka default; tertutup otomatis setelah data dimuat |
| Provinsi | Filter (combobox) | Placeholder "Pilih Provinsi", empty "Provinsi tidak ditemukan."; mengubahnya mereset Distrik & Lembaga Petani |
| Distrik | Filter (combobox) | **Wajib** (tanda `*`); placeholder "Pilih Distrik", empty "Distrik tidak ditemukan." |
| Lembaga Petani | Filter (combobox) | Placeholder "Pilih Lembaga Petani", empty "Lembaga Petani tidak ditemukan."; disabled sampai Distrik dipilih |
| Muat Data | Tombol | Disabled tanpa Distrik; tanpa Distrik → toast "Silakan pilih Distrik terlebih dahulu"; hasil kosong → toast "Tidak ada data untuk filter ini", sukses → "Data berhasil dimuat" |
| Legenda | Section collapsible + Legend | Muncul hanya setelah data dimuat; tiap baris = checkbox toggle layer + swatch warna + jumlah fitur; klik teks label = zoom ke sebaran data layer (`LayerZoomTarget`) |
| Point Lembaga Petani | Layer + Legend | Circle hijau `#22c55e` r=8, stroke putih; label nama lembaga di bawah titik |
| Point Lahan Petani | Layer + Legend | Circle biru `#3b82f6` r=5 pada centroid persil; **default tidak dicentang** (#223) — GeoJSON point dibangun lazy saat pertama dicentang (ribuan titik jarang dipakai) |
| Area Lahan Petani | Layer + Legend | Polygon fill `#22c55e` opacity 0.2, outline `#16a34a`; label nama petani di dalam poligon bila muat (`parcelLabelFit`) |
| Peta Lainnya | Section collapsible (overlay) | Raster overlay ArcGIS pemerintah via proxy: **Kawasan Hutan** (geoportal Kemenhut, Peta Kawasan Hutan 1:250.000 Des 2025) & **Fungsi Ekosistem Gambut** (Satu Peta BIG, FEG 1:50.000) — tiap baris checkbox + deskripsi singkat. Saat aktif, di bawah baris muncul **legend warna kelas** (Kawasan Hutan: Kawasan Konservasi (HK) · Hutan Lindung (HL) · Hutan Produksi Terbatas (HPT) · Hutan Produksi Tetap (HP) · Hutan Produksi Konversi (HPK) · Area Penggunaan Lain (APL) · Tubuh Air; Gambut: Fungsi Lindung · Fungsi Budidaya) + baris "Sumber: …" per overlay |
| Transparansi | Slider | Muncul bila ada overlay aktif; rentang 0.1–1 (default 0.7), ditampilkan dalam persen |
| Titik Api (Hotspot) | Section collapsible + Layer | Checkbox "Tampilkan titik api" + jumlah titik; sumber NASA FIRMS VIIRS 375 m, area query tetap bbox Riau. Checkbox & toggle rentang disabled sebelum data lahan dimuat (perlu titik lembaga untuk kalkulasi jarak PDF; saat layer sudah nyala, checkbox tetap bisa mematikan). Klik teks label = zoom ke sebaran titik api |
| Ekspor titik api | Tombol | "Unduh SHP" (ZIP Shapefile point WGS84 via `@mapbox/shp-write`, kolom DBF-safe ≤10 char) & "Cetak PDF" (jsPDF landscape: ringkasan total + per keyakinan + jumlah < 15 km dari Lembaga Petani; tabel hanya titik < 15 km, kolom Lembaga Terdekat & Jarak (km), urut jarak terdekat; header Provinsi & Distrik terpilih; tanpa data peta dimuat → semua titik, jarak "—"); disabled saat layer mati/loading/0 titik. Kalkulasi jarak lazy di background (`calcHotspotNearest`, chunked 250 titik/tick agar peta responsif) — tombol PDF spinner+disabled selama menghitung, toast "Kalkulasi jarak titik api selesai — Cetak PDF siap" saat siap. Helper `map-hotspot-export.ts`. "Unduh SHP" digate izin `EXPORT`, "Cetak PDF" digate izin `PRINT` (#245) |
| Ringkasan titik api | Modal (`map-hotspot-summary.tsx`) | Auto-terbuka saat kalkulasi jarak selesai; buka ulang via tombol "Lihat Ringkasan" (disabled selama menghitung). Subtitle: rentang + Provinsi & Distrik terpilih di filter lahan + sumber. Isi: total + jumlah per keyakinan + jumlah < 15 km; tabel hanya titik < 15 km urut jarak terdekat (No, Waktu WIB, Satelit, badge Keyakinan berwarna legenda, FRP, Lembaga Terdekat, Jarak km); klik baris = tutup modal + zoom peta ke titik (`pointZoomRequest`, zoom 14); footer tombol Unduh SHP & Cetak PDF (gating sama: izin `EXPORT`/`PRINT`, #245) |
| Rentang waktu hotspot | Toggle | Dua opsi: "24 jam" / "5 hari". "24 jam" = jendela bergulir 24 jam terakhir (fetch 2 hari UTC dari FIRMS lalu difilter klien berdasarkan `acqDatetime` — `dayRange=1` FIRMS hanya mencakup hari UTC berjalan sehingga sering 0 di pagi–siang WIB) |
| Legenda hotspot | Legend | Breakdown per keyakinan deteksi + jumlah titik per kelas: `#b91c1c` Tinggi, `#f97316` Nominal (Medium), `#facc15` Rendah (kode VIIRS h/n/l; tak dikenal → Nominal (Medium); warna sengaja beda hue+lightness agar kontras); catatan "Deteksi anomali panas VIIRS 375 m, bukan konfirmasi kebakaran. Sumber: NASA FIRMS · jeda ±3 jam." |
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
| Popup Titik Api | Popup | Header merah "Titik Api", subtitle "< 24 jam" / "1–5 hari"; baris: Waktu Deteksi (WIB), Satelit (Suomi NPP / NOAA-20), Keyakinan (Rendah/Nominal (Medium)/Tinggi), FRP (MW), Koordinat + catatan sumber FIRMS |
| Popup Lahan | Popup | Header biru: foto placeholder + nama petani, ID Petani, ID Lahan, Lembaga Petani; highlight "Luas Lahan" (`x,xx ha`) |
| Popup › Detail Lahan | Section popup | Terbuka default: Tahun Tanam, Komoditas, Status Lahan |
| Popup › Pelatihan Petani | Section popup | Lazy-load `getFarmerTraining`; daftar paket dengan centang selesai + tanggal; error "Gagal memuat pelatihan." |
| Popup › Produksi | Section popup | Lazy-load `getParcelProduction`; select "Rata-rata" atau per tahun; grafik batang bulanan (kg); "Belum ada data produksi." bila kosong |
| Profil Lahan | Tombol popup | Generate PDF Farm Passport (`src/lib/farm-passport.ts`) via `getParcelPassport`; label proses "Menyiapkan..."; gagal → toast "Gagal membuat PDF profil lahan" — digate izin `PRINT` menu Peta Lahan `map-parcel` (#245) — sama dengan guard `getParcelPassport`; varian dari halaman Lahan/Petani tetap digate menu masing-masing |
| Aksi popup Lahan | Footer popup | `ParcelPopupActions`: tombol "Lihat Detail" (link `/admin/master-data/parcels/{id}`, gate `hasPermission("master-data-parcels", "VIEW")`) dan "Edit Lahan" (gate EDIT, membuka modal edit); footer tak dirender bila keduanya false |
| Modal Edit Lahan | Modal | `ParcelEditModalHost` — dirender hanya saat ada `parcelId` (remount per id via `key`); data lahan + daftar petani di-load lazy saat mount (`getLandParcelById` + `getParcelFarmerOptions`); lahan tak ditemukan → toast "Lahan tidak ditemukan atau di luar akses Anda", gagal fetch → "Gagal memuat data lahan"; setelah simpan peta refetch GeoJSON (`onParcelUpdated` → muat ulang data dengan filter aktif) |
