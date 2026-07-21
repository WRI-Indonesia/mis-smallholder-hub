# Page: Lahan (daftar)

[← Lahan](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Lahan (/admin/master-data/parcels)
├── Header
│   ├── Judul: Lahan
│   └── Deskripsi: Data lahan petani (land parcels) yang terdaftar
├── Toolbar
│   ├── Filter: Lembaga Petani (combobox)
│   ├── Filter: Status (SUPERADMIN)
│   ├── Filter: Pencarian
│   ├── Tombol: Tambah Lahan
│   ├── Tombol: Excel
│   └── Tombol: Kolom
├── Tabel
│   ├── Kolom: ID Lahan, Blok, Nama Petani, ID Petani, Lembaga Petani,
│   │          Gapoktan/KUD, Kelompok Tani, Luas (ha), Status Kepemilikan,
│   │          Komoditas, Species, PSR, Tahun Tanam, Revisi, Status
│   └── Aksi baris: Lihat, Edit, Nonaktifkan
└── Dialog
    └── ParcelFormModal (Tambah / Edit Lahan)
```

| Atribut | Nilai |
|---|---|
| File | `parcels/page.tsx` + `parcels/components/parcel-list-client.tsx` |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-parcels")` |
| Server action / data | `getLandParcels()` (`@/server/actions/land-parcel`), `getFarmerOptions`, `getFarmerGroupOptions`, `getUserPermissionsForMenu`, `isSuperAdmin` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Lahan` / `Data lahan petani (land parcels) yang terdaftar` | Heading | h1 + deskripsi |
| Filter Lembaga Petani | Combobox | `Semua Lembaga Petani` |
| Filter Status | Select | SUPERADMIN saja |
| Pencarian | Filter | `Cari ID Lahan atau nama petani...` (parcelId, nama & ID petani) |
| Tombol `Tambah Lahan` | Tombol | CREATE — buka `ParcelFormModal` |
| Tabel daftar | Tabel | Kolom: `ID Lahan`, `Blok` (hidden default), `Nama Petani`, `ID Petani`, `Lembaga Petani`, `Gapoktan/KUD` (hidden), `Kelompok Tani` (hidden), `Luas (ha)`, `Status Kepemilikan`, `Komoditas`, `Species`, `PSR` (badge PSR/Non-PSR), `Tahun Tanam`, `Revisi`, `Status` (SUPERADMIN) |
| Aksi baris | Tombol | Lihat → `/admin/master-data/parcels/{id}`; Edit → modal; Nonaktifkan → `toggleLandParcelActive` |
| Ekspor | Tombol | `data-lahan` (termasuk kolom distrik) |
| Tidak ada kartu KPI | — | Halaman ini langsung ke tabel |

## Dialog: `ParcelFormModal` (`parcels/components/parcel-form-modal.tsx`)

Judul `Tambah Lahan` / `Edit Lahan`; aksi `createLandParcel` / `updateLandParcel`; validasi `landParcelSchema` / `updateLandParcelSchema` (`src/validations/land-parcel.schema.ts`). Geometry tidak dikirim dari form — polygon existing dipertahankan server.

| Field | Input |
|---|---|
| `Petani` | combobox (`Pilih Petani`, wajib — toast `Petani wajib dipilih`) |
| `ID Lahan` (wajib) | text |
| `Luas (Hektar)` | number step 0.01, min 0 |
| `Blok` | text |
| `Status Kepemilikan` | select `Milik Sendiri (Owned)` / `Sewa (Leased)` / `Bagi Hasil (Shared)` |
| `Komoditas` | text (`Contoh: Kelapa Sawit`) |
| `Species` | text (`Contoh: Elaeis guineensis`) |
| `PSR (Peremajaan Sawit Rakyat)` | checkbox `Lahan sedang PSR (replanting)` |
| `Tahun Tanam` | number 1900–2100 |
| `Revisi` | read-only (`otomatis bertambah saat disimpan`) |
| `Gapoktan/KUD` (`subGroupLv1`), `Kelompok Tani` (`subGroupLv2`) | text |
| `Catatan` | textarea |
