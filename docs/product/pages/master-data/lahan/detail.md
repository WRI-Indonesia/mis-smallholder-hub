# Page: Detail Lahan

[← Lahan](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Lahan (/admin/master-data/parcels/[id])
├── Header
│   ├── Tombol kembali
│   ├── Judul: Detail Lahan
│   ├── Subjudul: Lahan: {parcelId} · Petani: {nama}
│   ├── Tombol: Edit
│   └── Tombol: Nonaktifkan
├── Kartu Informasi Lahan
├── Kartu Informasi Pemilik
├── Kartu Peta Spasial Lahan
│   ├── Tombol: Zoom ke Lahan
│   ├── Pemilih basemap: hybrid / satellite / light / dark
│   └── Empty state
└── Dialog
    └── ParcelFormModal (Edit Lahan)
```

| Atribut | Nilai |
|---|---|
| File | `parcels/[id]/page.tsx` + `parcel-detail-client.tsx` (+ `components/parcel-map-view.tsx`) |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-parcels")` + `getUserPermissionsForMenu`; `notFound()` bila kosong |
| Server action / data | `getLandParcelById(id)`, `getFarmerOptions`; mutasi `deleteLandParcel` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Detail Lahan` | Heading | Tombol kembali + subjudul `Lahan: {parcelId} · Petani: {nama}` |
| Tombol `Edit` | Tombol | EDIT — buka `ParcelFormModal` |
| Tombol `Nonaktifkan` | Tombol | DELETE — `deleteLandParcel` dengan konfirmasi `Apakah Anda yakin ingin menonaktifkan lahan ini?` |
| Kartu `Informasi Lahan` | Kartu | `ID Lahan`, `Blok`, `Luas`, `Status Kepemilikan`, `Komoditas`, `Species`, `PSR`, `Tahun Tanam`, `Gapoktan/KUD`, `Kelompok Tani`, `Revisi`, `Catatan` |
| Kartu `Informasi Pemilik` | Kartu | `Nama Petani` (link ke detail petani), `ID Petani`, `Lembaga Petani`, `Distrik` |
| Kartu `Peta Spasial Lahan` | Peta | `ParcelMapView` (MapLibre) — tombol `Zoom ke Lahan`, pemilih basemap `hybrid`/`satellite`/`light`/`dark` |
| Empty state peta | Teks | `Tidak ada data spasial (geometri) untuk lahan ini` |

Dialog `ParcelFormModal` (field lengkap) didokumentasikan di [daftar.md](./daftar.md#dialog-parcelformmodal-parcelscomponentsparcel-form-modaltsx).
