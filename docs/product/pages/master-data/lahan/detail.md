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
├── Kartu ringkasan (5)
│   ├── Luas (Ha, sub: Blok)
│   ├── Pohon Sawit (jumlah titik, sub: kerapatan pohon/ha — #238)
│   ├── Umur Tanaman (sub: Tahun tanam)
│   ├── Produksi (Ton total, sub: jumlah record + rentang tahun; catatan PSR)
│   └── Kelengkapan Data (n/8 atribut, sub: daftar yang belum diisi)
├── Section: Informasi Lahan (collapsible) — peta 60% kiri, keterangan 40% kanan
│   ├── Peta ParcelMapView (h-560px)
│   │   ├── Poligon hijau = lahan ini; poligon biru = lahan lain milik petani
│   │   ├── Titik kuning = pohon sawit bila tersedia (prop treePoints, #238)
│   │   ├── Tombol Zoom ke Lahan + zoom awal: fitBounds SEMUA lahan
│   │   └── Pemilih basemap: hybrid / satellite / light / dark
│   ├── Legenda warna (+ titik kuning bila ada pohon) + link koordinat titik pusat → Google Maps
│   ├── Kolom kanan: ID Lahan, Blok, Kelompok Tani, Status Kepemilikan,
│   │   Tahun Tanam (+umur), Komoditas, Species, Catatan ("Belum diisi" bila kosong)
│   ├── Meta: Revisi ke-N · Dibuat · Diubah
│   └── Sub-bagian Pemilik: Nama (link), ID Petani, Lembaga (link), Distrik,
│       tabel Lahan Lain Milik Petani (Kode ber-link antar-detail · Luas ·
│       Tahun Tanam · Jumlah Pohon)
├── Section: Legalitas & Dokumen (collapsible, #296) — ringkasan hitung di kanan judul
│   ├── Surat Kepemilikan: Jenis (normalisasi; "Lainnya (jenis belum diisi)" bila
│   │   OTHER tanpa typeRaw) · Nomor · Nama di Surat · Luas Tertera · Selisih vs
│   │   Poligon (≥0,5 Ha ditandai amber) · Tahun · Keterangan (custody/notes)
│   ├── STDB: Nomor · Tahun · Nama Pemegang · Luas Tertera · Lahan Lain dalam
│   │   STDB ini (kode ber-link ke detail lahan aktif)
│   ├── Kode Pemetaan Vendor (source + code, tanpa rawGeometry)
│   └── Program (jenis + badge status + rentang tanggal)
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
| File | `parcels/[id]/page.tsx` + `parcel-detail-client.tsx` (+ `components/parcel-map-view.tsx`, `parcel-production-chart.tsx`, `parcel-production-month-modal.tsx`, `parcel-legal-section.tsx` + `parcel-satellite-form-modal.tsx` #296) |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-parcels")` + `getUserPermissionsForMenu` (menu Lahan **dan** menu Produksi); `notFound()` bila kosong |
| Server action / data | `getLandParcelById(id)`, `getLandParcelProduction(id)`, `getParcelTrees(id)` (`src/server/actions/tree.ts`), `getLandParcelSatellites(id)` (#296 — scope pada baris lahan, satelit dibaca via `parcelUid`); CRUD satelit `src/server/actions/land-parcel-satellite.ts` (`create/update{LandParcelDocument,LandStdb,LandParcelExternalId,LandParcelProgram}`, `unlinkLandStdb`, `deactivateLandParcelSatellite` — izin menu Lahan CREATE/EDIT/DELETE, scope via `parcel.farmer`), `getFarmerSiblingParcels`, `getFarmerOptions`; PDF `getLandParcelPassport`; produksi per bulan `getParcelPeriodRecords` + `create/update/deleteProductionRecord`; mutasi `deleteLandParcel` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| Header `{parcelId}` | Heading | Judul = ID lahan (mono); subjudul pemilik ber-link; badge status/PSR/komoditas/KT; `BreadcrumbOverride` menampilkan parcelId |
| Tombol `Profil Lahan (PDF)` | Tombol | PRINT (sebelumnya VIEW, #245) — Farm Passport via `getLandParcelPassport` (guard menu Lahan); disabled bila lahan tanpa geometri |
| Tombol `Edit` | Tombol | EDIT — buka `ParcelFormModal` |
| Tombol `Nonaktifkan` | Tombol | DELETE — `deleteLandParcel` dengan konfirmasi `Apakah Anda yakin ingin menonaktifkan lahan ini?` |
| Kartu ringkasan | Kartu ×5 | `Luas`, `Pohon Sawit` (jumlah titik + kerapatan pohon/ha, #238), `Umur Tanaman`, `Produksi`, `Kelengkapan Data` (8 atribut: Blok, Luas, Status Kepemilikan, Komoditas, Species, Tahun Tanam, Kelompok Tani, Geometri) |
| Section `Informasi Lahan` | Collapsible | Peta 60% + keterangan 40%; field kosong ditulis *"Belum diisi"*; sub-bagian Pemilik + tabel lahan lain milik petani (Kode ber-link · Luas · Tahun Tanam · Jumlah Pohon — `getFarmerSiblingParcels` kini menyertakan agregat pohon) |
| Peta `ParcelMapView` | Peta | MapLibre; poligon hijau = lahan ini, biru = lahan lain milik petani (`siblingGeometries`), titik kuning = pohon sawit bila tersedia (`treePoints`, #238 — data `getParcelTrees`); zoom awal & `Zoom ke Lahan` = `fitBounds` semua lahan; link koordinat titik pusat → Google Maps |
| Empty state peta | Teks | `Tidak ada data spasial (geometri) untuk lahan ini` |
| Section `Legalitas & Dokumen` | Collapsible (#296) | Data masuk lewat Bulk Upload → Lahan → tab Detail Lahan **atau CRUD manual** (3c): tombol **Tambah** per blok (CREATE), ikon pensil (EDIT) → `ParcelSatelliteFormModal` (satu modal, 4 jenis, form uncontrolled + error Zod per field), ikon tempat sampah (DELETE) → `DeleteDialog` soft-delete; STDB memakai ikon **lepas tautan** (STDB tetap ada untuk lahan lain). Empty state total 0 → kalimat arahan + empat tombol Tambah. Empat blok: Surat Kepemilikan (tabel; selisih luas tertera vs poligon dihitung di klien, ≥0,5 Ha amber), STDB (tabel + lahan lain dalam STDB yang sama, ber-link), Kode Pemetaan Vendor, Program (badge status). Kosong total → satu kalimat arahan ke tab import |
| Section `Produksi` | Collapsible | Konteks Luas/Tahun Tanam/Species; grafik bulanan kontinu (clip 6 bln/1 thn/2 thn/Semua + slide, sampai bulan berjalan); tabel pivot Tahun × Jan–Des + Total + Ton/Ha, baris s.d. tahun berjalan |
| Sel bulan tabel produksi | Tombol sel | Klik (butuh CREATE/EDIT menu Produksi) → `ParcelProductionMonthModal`; sel bulan masa depan tidak bisa diklik |
| `ParcelProductionMonthModal` | Dialog | 4 slot panen (kg + tanggal, dibatasi bulan tsb) terbuka berurutan; total otomatis; slot dikosongkan = nonaktifkan record (konfirmasi); keunikan per (petani, lahan, periode, panen-ke) |

Dialog `ParcelFormModal` (field lengkap) didokumentasikan di [daftar.md](./daftar.md#dialog-parcelformmodal-parcelscomponentsparcel-form-modaltsx).
