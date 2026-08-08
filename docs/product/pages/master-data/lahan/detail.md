# Page: Detail Lahan

[← Lahan](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Lahan (/admin/master-data/parcels/[id])
├── Header
│   ├── Tombol kembali + ikon lahan
│   ├── Judul: {parcelId} (mono) — breadcrumb menampilkan parcelId, bukan CUID
│   ├── Subjudul: Milik {nama petani} (link) · {Lembaga} · {Distrik}
│   ├── Badge: Aktif/Nonaktif · PSR (Replanting)/Non-PSR · Komoditas · Kelompok Tani
│   ├── Tombol: Profil Lahan (PDF) — disabled tanpa geometri
│   ├── Tombol: Edit
│   └── Tombol: Nonaktifkan
├── Kartu ringkasan (4)
│   ├── Luas (Ha, sub: Blok)
│   ├── Umur Tanaman (sub: Tahun tanam)
│   ├── Produksi (Ton total, sub: jumlah record + rentang tahun; catatan PSR)
│   └── Kelengkapan Data (n/8 atribut, sub: daftar yang belum diisi)
├── Section: Informasi Lahan (collapsible) — peta 60% kiri, keterangan 40% kanan
│   ├── Peta ParcelMapView (h-560px)
│   │   ├── Poligon hijau = lahan ini; poligon biru = lahan lain milik petani
│   │   ├── Tombol Zoom ke Lahan + zoom awal: fitBounds SEMUA lahan
│   │   └── Pemilih basemap: hybrid / satellite / light / dark
│   ├── Legenda warna + link koordinat titik pusat → Google Maps
│   ├── Kolom kanan: ID Lahan, Blok, Kelompok Tani, Status Kepemilikan,
│   │   Tahun Tanam (+umur), Komoditas, Species, Catatan ("Belum diisi" bila kosong)
│   ├── Meta: Revisi ke-N · Dibuat · Diubah
│   └── Sub-bagian Pemilik: Nama (link), ID Petani, Lembaga (link), Distrik,
│       badge Lahan Lain Milik Petani (link antar-detail lahan)
├── Section: Pohon Sawit (collapsible, #238)
│   ├── Aksi kanan judul: tanggal unggah + nama file sumber
│   ├── Kartu ×4: Jumlah Pohon (sub: revisi set) · Kerapatan Tanam (pohon/ha,
│   │   sub: rujukan ± 136/ha atau "Luas lahan belum diisi") · Sumber Titik
│   │   (komposisi auto/moved/added/verified) · Vigor Rata-rata (+ versi model)
│   ├── Peta ParcelMapView (h-480px) — titik kuning pohon di atas poligon hijau
│   ├── Keterangan legenda + arti nilai source
│   └── Empty state: "Belum ada data titik pohon untuk lahan ini…"
├── Section: Produksi (collapsible)
│   ├── Konteks: Luas · Tahun Tanam · Species
│   ├── Grafik batang bulanan kontinu (ParcelProductionChart)
│   │   ├── Tombol periode: 6 Bulan / 1 Tahun / 2 Tahun / Semua (viewport clip)
│   │   ├── Scroll horizontal (slide), auto ke bulan terbaru; tooltip per batang
│   │   └── Deret sampai bulan berjalan walau kosong
│   └── Tabel pivot: Tahun | Jan…Des | Total (kg) | Ton/Ha
│       ├── Baris tahun kontinu s.d. tahun berjalan walau kosong
│       └── Sel bulan klik → modal input/edit (gate permission menu Produksi)
└── Dialog
    ├── ParcelFormModal (Edit Lahan)
    └── ParcelProductionMonthModal — 4 slot panen (kg + tanggal) terbuka
        berurutan, total otomatis; simpan = diff create/update/nonaktifkan
        per slot via action menu Data Produksi
```

| Atribut | Nilai |
|---|---|
| File | `parcels/[id]/page.tsx` + `parcel-detail-client.tsx` (+ `components/parcel-map-view.tsx`, `parcel-production-chart.tsx`, `parcel-production-month-modal.tsx`) |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-parcels")` + `getUserPermissionsForMenu` (menu Lahan **dan** menu Produksi); `notFound()` bila kosong |
| Server action / data | `getLandParcelById(id)`, `getLandParcelProduction(id)`, `getParcelTrees(id)` (`src/server/actions/tree.ts`), `getFarmerSiblingParcels`, `getFarmerOptions`; PDF `getLandParcelPassport`; produksi per bulan `getParcelPeriodRecords` + `create/update/deleteProductionRecord`; mutasi `deleteLandParcel` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Header `{parcelId}` | Heading | Judul = ID lahan (mono); subjudul pemilik ber-link; badge status/PSR/komoditas/KT; `BreadcrumbOverride` menampilkan parcelId |
| Tombol `Profil Lahan (PDF)` | Tombol | VIEW — Farm Passport via `getLandParcelPassport` (guard menu Lahan); disabled bila lahan tanpa geometri |
| Tombol `Edit` | Tombol | EDIT — buka `ParcelFormModal` |
| Tombol `Nonaktifkan` | Tombol | DELETE — `deleteLandParcel` dengan konfirmasi `Apakah Anda yakin ingin menonaktifkan lahan ini?` |
| Kartu ringkasan | Kartu ×4 | `Luas`, `Umur Tanaman`, `Produksi`, `Kelengkapan Data` (8 atribut: Blok, Luas, Status Kepemilikan, Komoditas, Species, Tahun Tanam, Kelompok Tani, Geometri) |
| Section `Informasi Lahan` | Collapsible | Peta 60% + keterangan 40%; field kosong ditulis *"Belum diisi"*; sub-bagian Pemilik + badge lahan lain milik petani (navigasi antar-lahan) |
| Peta `ParcelMapView` | Peta | MapLibre; poligon hijau = lahan ini, biru = lahan lain milik petani (`siblingGeometries`); zoom awal & `Zoom ke Lahan` = `fitBounds` semua lahan; link koordinat titik pusat → Google Maps |
| Empty state peta | Teks | `Tidak ada data spasial (geometri) untuk lahan ini` |
| Section `Pohon Sawit` | Collapsible | Kartu Jumlah Pohon/Kerapatan Tanam/Sumber Titik/Vigor Rata-rata + peta titik kuning (`ParcelMapView` prop `treePoints`) di atas poligon; data `getParcelTrees` (set pohon aktif, revisi per-set #238); empty state bila belum ada data |
| Section `Produksi` | Collapsible | Konteks Luas/Tahun Tanam/Species; grafik bulanan kontinu (clip 6 bln/1 thn/2 thn/Semua + slide, sampai bulan berjalan); tabel pivot Tahun × Jan–Des + Total + Ton/Ha, baris s.d. tahun berjalan |
| Sel bulan tabel produksi | Tombol sel | Klik (butuh CREATE/EDIT menu Produksi) → `ParcelProductionMonthModal`; sel bulan masa depan tidak bisa diklik |
| `ParcelProductionMonthModal` | Dialog | 4 slot panen (kg + tanggal, dibatasi bulan tsb) terbuka berurutan; total otomatis; slot dikosongkan = nonaktifkan record (konfirmasi); keunikan per (petani, lahan, periode, panen-ke) |

Dialog `ParcelFormModal` (field lengkap) didokumentasikan di [daftar.md](./daftar.md#dialog-parcelformmodal-parcelscomponentsparcel-form-modaltsx).
