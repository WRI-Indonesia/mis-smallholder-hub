# Peta BMP

[← Menu Map](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Peta BMP (/admin/map/bmp)
├── Panel kiri: "Peta BMP" (mengambang, minimizable)
│   ├── Filter: Provinsi · Distrik · Lembaga Petani (wajib)
│   ├── Tombol: Muat Data
│   ├── Empty state: Petunjuk awal
│   ├── Layer: Ketersediaan Data Produksi (radio)
│   │   └── Legenda ketersediaan: Baik · Cukup · Kurang · Tidak ada data
│   ├── Layer: Produktivitas (Ton/Ha) (radio)
│   │   ├── Filter: Tahun
│   │   └── Legenda produktivitas: Tinggi · Sedang · Rendah · Sangat Rendah · Tidak ada data
│   └── Tombol: Cetak Peta (PDF) · Download Excel
├── Peta
│   ├── Basemap: LIGHT / DARK / HYBRID
│   ├── Layer: Area lahan (poligon) · Label nama petani
│   ├── Legend
│   ├── Popup fitur: Lahan BMP
│   │   ├── Ketersediaan Data · Produktivitas · Detail Lahan · Produksi Bulanan
│   │   └── Aksi: Lihat Detail · Edit Lahan
│   └── Modal: Edit Lahan (dari popup)
├── Panel kanan: Ketersediaan Data per Lahan
│   ├── Pencarian matriks
│   ├── Tabel matriks (bulan per tahun)
│   └── Legenda matriks
└── Tombol: Zoom ke semua data · Basemap switcher
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Menu key | `map-bmp` (URL `/admin/map/bmp`, icon `Sprout`, order 2) |
| File | `src/app/(admin)/admin/map/bmp/page.tsx` |
| Client | `map-bmp-client.tsx` (orkestrasi + cetak/ekspor), `map-bmp-control-panel.tsx` (panel kiri), `map-bmp-canvas.tsx` (peta + popup), `map-bmp-data-panel.tsx` (panel matriks kanan); primitif popup bersama `src/components/shared/map-popup.tsx` (TD-028: `MapPopupSection`, `MapPopupRows`) + `parcel-popup-actions.tsx` & `parcel-edit-modal-host.tsx` (dari `master-data/parcels/components/`) |
| Tipe | Server Component (opsi provinsi) → Client Component (peta interaktif) |
| Guard | `requirePermission("map-bmp")`; `page.tsx` juga menghitung `hasPermission("master-data-parcels", "VIEW"/"EDIT")` → prop `canViewParcel`/`canEditParcel` (gate tombol aksi popup); action `getBmpMapData` guard `hasPermission("map-bmp", "VIEW")` + `getAccessContext()` |
| Server action / data | `getProvincesForMap()`, `getDistrictsForMap()`, `getFarmerGroupsForMap()`, `getBmpMapData()` (`src/server/actions/map.ts`); helper `src/lib/map-data.ts`, `src/lib/report-production.ts`, `src/lib/bmp-map-print.ts`, `src/lib/xlsx.ts`. `getBmpMapData` mengembalikan **format wire dipadatkan** (#223: tuple posisi + `production` per persil; kategori/streak/first-last/periods & centroid dihitung ulang klien) — rehydrate via `expandBmpMapData`. Pewarnaan kelas produktivitas memakai **feature-state MapLibre** (`setFeatureState` + `promoteId`), bukan properti fitur: ganti tahun/mode hanya repaint tanpa setData ulang geometri; visibilitas kelas via ekspresi opacity (filter tidak bisa membaca feature-state) |
| Loading | `loading.tsx` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Panel "Peta BMP" | Panel mengambang | Card kiri-atas, header sticky ikon `Sprout`, tombol "Minimalkan"; saat minimize jadi tombol "Buka panel filter" |
| `Panduan` | Tautan | `HelpHint` di header panel (sebelah tombol Minimalkan) menuju tutorial Bantuan untuk `map-bmp`; dirender server via prop `helpSlot` (markdown Bantuan tak masuk bundle client), dibuka di tab baru; ikut tersembunyi saat panel di-minimize |
| Filter | Section collapsible | Terbuka default; tertutup otomatis setelah data dimuat |
| Provinsi | Filter (combobox) | Placeholder "Pilih Provinsi (opsional)" |
| Distrik | Filter (combobox) | Placeholder "Pilih Distrik (opsional)" |
| Lembaga Petani | Filter (combobox) | **Wajib** (tanda `*`); placeholder "Pilih Lembaga Petani" |
| Catatan filter | Teks | "Lembaga Petani wajib dipilih. Provinsi & Distrik hanya menyaring daftar Lembaga Petani." |
| Muat Data | Tombol | Tanpa Lembaga Petani → toast "Silakan pilih Lembaga Petani terlebih dahulu"; kosong → "Tidak ada lahan untuk filter ini"; sukses → "Data berhasil dimuat"; tampilan produktivitas default ke tahun terbaru yang berdata |
| Petunjuk awal | Empty state | Sebelum data dimuat: "Pilih Lembaga Petani lalu klik Muat Data untuk menampilkan peta." |
| Ketersediaan Data Produksi | Layer tematik (radio) | Section dengan radio "Aktifkan layer ini"; mewarnai poligon persil berdasarkan kategori |
| Legenda ketersediaan | Legend | Baik (> 2 tahun) `#22c55e`, Cukup (min. 1 tahun) `#eab308`, Kurang (< 1 tahun) `#f97316`, Tidak ada data `#9ca3af` (outline saja); tiap baris checkbox filter + jumlah persil; catatan "Kategori dihitung dari run bulan berturut-turut produksi yang tertaut ke lahan." |
| Produktivitas (Ton/Ha) | Layer tematik (radio) | Section alternatif pewarnaan poligon yang sama |
| Tahun | Filter (select) | "Rata-rata" atau tahun tersedia |
| Legenda produktivitas | Legend | Tinggi (min. 20 Ton/Ha) `#16a34a`, Sedang (15–20 Ton/Ha) `#eab308`, Rendah (10–15 Ton/Ha) `#f97316`, Sangat Rendah (< 10 Ton/Ha) `#dc2626`, Tidak ada data `#9ca3af`; checkbox filter + jumlah; catatan "Produktivitas = produksi tahun terpilih ÷ luas persil (Rata-rata = rata-rata antar tahun terdata). Produksi tanpa tautan lahan tidak dihitung." |
| Cetak Peta dan Matriks Ketersediaan Data / Cetak Peta dan Tabel Produktivitas | Tombol | Label mengikuti layer aktif; snapshot canvas peta + legenda + halaman data → PDF (`generateBmpMapPdf`), file `peta-bmp-{kt}.pdf` / `peta-bmp-produktivitas-{kt}.pdf`; gagal capture → "Gagal mengambil gambar peta. Coba basemap StreetMap/Light/Dark (bukan Satellite/Hybrid)." — digate izin `PRINT` (#245) |
| Download Ketersediaan Data (Excel) / Download Produktivitas (Excel) | Tombol | Label mengikuti layer aktif; ekspor `exportToExcel` — sheet "Ketersediaan Data" (Nama, ID Petani, ID Lahan, Status Ketersediaan Data, Luas Lahan (Ha), kolom per bulan) atau "Produktivitas" (Nama, ID Petani, ID Lahan, Luas Lahan (Ha), kolom per tahun Ton/Ha, Rata-rata) — digate izin `EXPORT` (#245) |
| Area lahan | Layer peta | Hanya poligon (fill + outline) sesuai warna layer aktif; kategori "Tidak ada data" outline saja; tanpa layer titik centroid |
| Label nama petani | Layer peta | Nama petani di dalam poligon bila muat pada zoom saat itu |
| Ketersediaan Data per Lahan | Panel matriks (kanan atas) | Default minimize (tombol "Buka tabel ketersediaan data"); judul + jumlah persil; tombol "Minimalkan" |
| Pencarian matriks | Filter | "Cari nama / ID petani / ID lahan"; empty "Tidak ada lahan." |
| Tabel matriks | Tabel | Kolom tetap: Aksi (tombol "Zoom ke lahan"), Nama, ID Petani, ID Lahan; kolom bulan dikelompokkan per tahun; sel hijau = ada data produksi bulan tsb (tooltip "{periode}: ada data / tidak ada") |
| Legenda matriks | Legend | "Ada data produksi" (blok hijau) vs "Tidak ada" (blok kosong) |
| Zoom ke semua data | Tombol (kanan bawah) | `fitBounds` ke seluruh persil yang dimuat |
| Basemap switcher | Tombol grup (kanan bawah) | LIGHT / DARK / HYBRID |
| Popup Lahan BMP | Popup | Header hijau ikon `Sprout`: nama petani, ID Petani, ID Lahan, Lembaga Petani |
| Popup › Ketersediaan Data | Baris popup | Badge kategori (Baik/Cukup/Kurang/Tidak ada data) |
| Popup › Produktivitas | Baris popup | Badge kelas produktivitas + label tampilan (tahun / rata-rata); hanya bila layer produktivitas dihitung |
| Popup › Detail Lahan | Section popup | Terbuka default: Luas, Tahun Tanam, Komoditas, Status Lahan, Run Bulan Berturut, Periode Awal, Periode Akhir, Produktivitas (Ton/Ha), dan Tahun Terdata (mode rata-rata) atau Bulan Terdata `n/12` |
| Popup › Produksi Bulanan | Section popup | Grafik dari data per periode yang sudah tertanam di fitur (tanpa fetch tambahan) |
| Catatan kaki popup | Teks | "Kategori dari run bulan berturut-turut produksi yang tertaut ke lahan." |
| Aksi popup Lahan BMP | Footer popup | `ParcelPopupActions`: tombol "Lihat Detail" (link `/admin/master-data/parcels/{id}`, gate `hasPermission("master-data-parcels", "VIEW")`) dan "Edit Lahan" (gate EDIT, membuka modal edit); footer tak dirender bila keduanya false |
| Modal Edit Lahan | Modal | `ParcelEditModalHost` — dirender hanya saat ada `parcelId` (remount per id via `key`); data lahan + daftar petani di-load lazy saat mount; lahan tak ditemukan → toast "Lahan tidak ditemukan atau di luar akses Anda", gagal fetch → "Gagal memuat data lahan"; setelah simpan peta refetch GeoJSON (`onParcelUpdated`) |
